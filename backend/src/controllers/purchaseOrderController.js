const { z } = require('zod');
const prisma = require('../config/prisma');

const createPOSchema = z.object({
  supplierId: z.string().uuid(),
  expectedDate: z.string().optional().nullable(),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().positive(),
    })
  ).min(1),
});

const receiveSchema = z.object({
  warehouseId: z.string().uuid(),
  items: z.array(
    z.object({
      itemId: z.string().uuid(),
      quantityReceived: z.number().positive(),
    })
  ).min(1),
});

async function list(req, res, next) {
  try {
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: { supplier: { companyId: req.user.companyId } },
      include: {
        supplier: { select: { name: true } },
        items: { include: { product: { select: { name: true, sku: true, unit: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(purchaseOrders);
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id: req.params.id, supplier: { companyId: req.user.companyId } },
      include: {
        supplier: true,
        items: { include: { product: { select: { name: true, sku: true, unit: true } } } },
      },
    });
    if (!po) return res.status(404).json({ message: 'Purchase Order tidak ditemukan' });
    res.json(po);
  } catch (err) {
    next(err);
  }
}

// Bikin PO baru — statusnya langsung ORDERED (dianggap sudah dipesan ke supplier)
async function create(req, res, next) {
  try {
    const data = createPOSchema.parse(req.body);

    // Pastikan supplier itu milik company yang sama (keamanan multi-tenant)
    const supplier = await prisma.supplier.findFirst({
      where: { id: data.supplierId, companyId: req.user.companyId },
    });
    if (!supplier) return res.status(404).json({ message: 'Supplier tidak ditemukan' });

    const po = await prisma.purchaseOrder.create({
      data: {
        supplierId: data.supplierId,
        status: 'ORDERED',
        totalItems: data.items.length,
        expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },
      include: { items: true },
    });

    res.status(201).json(po);
  } catch (err) {
    next(err);
  }
}

// Terima barang dari PO — update quantityReceived per item + catat stock movement IN
// + otomatis update status PO jadi PARTIAL atau RECEIVED
async function receive(req, res, next) {
  try {
    const data = receiveSchema.parse(req.body);
    const io = req.app.get('io');

    const po = await prisma.purchaseOrder.findFirst({
      where: { id: req.params.id, supplier: { companyId: req.user.companyId } },
      include: { items: true },
    });
    if (!po) return res.status(404).json({ message: 'Purchase Order tidak ditemukan' });
    if (po.status === 'RECEIVED' || po.status === 'CANCELLED') {
      return res.status(400).json({ message: `PO ini sudah berstatus ${po.status}, tidak bisa diterima lagi` });
    }

    const result = await prisma.$transaction(async (tx) => {
      for (const receivedItem of data.items) {
        const poItem = po.items.find((i) => i.id === receivedItem.itemId);
        if (!poItem) continue;

        const remaining = Number(poItem.quantity) - Number(poItem.quantityReceived);
        const qtyToReceive = Math.min(receivedItem.quantityReceived, remaining);
        if (qtyToReceive <= 0) continue;

        // Update stok gudang (sama seperti barang masuk biasa)
        const existingStock = await tx.stock.findUnique({
          where: { productId_warehouseId: { productId: poItem.productId, warehouseId: data.warehouseId } },
        });
        const currentQty = existingStock ? Number(existingStock.quantity) : 0;
        const newQty = currentQty + qtyToReceive;

        await tx.stock.upsert({
          where: { productId_warehouseId: { productId: poItem.productId, warehouseId: data.warehouseId } },
          update: { quantity: newQty },
          create: { productId: poItem.productId, warehouseId: data.warehouseId, quantity: newQty },
        });

        await tx.stockMovement.create({
          data: {
            productId: poItem.productId,
            warehouseId: data.warehouseId,
            type: 'IN',
            quantity: qtyToReceive,
            referenceId: po.id,
            createdById: req.user.id,
          },
        });

        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: { quantityReceived: Number(poItem.quantityReceived) + qtyToReceive },
        });

        if (io) {
          io.to(`company_${req.user.companyId}`).emit('stock:updated', {
            productId: poItem.productId,
            warehouseId: data.warehouseId,
            quantity: newQty,
            type: 'IN',
          });
        }
      }

      // Cek ulang semua item PO buat tentuin status baru
      const updatedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: po.id } });
      const allReceived = updatedItems.every((i) => Number(i.quantityReceived) >= Number(i.quantity));
      const someReceived = updatedItems.some((i) => Number(i.quantityReceived) > 0);

      const newStatus = allReceived ? 'RECEIVED' : someReceived ? 'PARTIAL' : po.status;

      const updatedPO = await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: newStatus },
        include: { items: { include: { product: { select: { name: true, sku: true, unit: true } } } }, supplier: true },
      });

      return updatedPO;
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// BARU — Konfirmasi draft PO (biasanya hasil dari Auto Reorder) jadi PO resmi yang
// dianggap sudah dipesan ke supplier. Cuma bisa dipakai kalau status-nya masih DRAFT.
async function confirmDraft(req, res, next) {
  try {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id: req.params.id, supplier: { companyId: req.user.companyId } },
    });
    if (!po) return res.status(404).json({ message: 'Purchase Order tidak ditemukan' });
    if (po.status !== 'DRAFT') {
      return res.status(400).json({ message: `PO ini sudah berstatus ${po.status}, bukan draft lagi` });
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { status: 'ORDERED' },
      include: {
        supplier: { select: { name: true } },
        items: { include: { product: { select: { name: true, sku: true, unit: true } } } },
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, receive, confirmDraft };