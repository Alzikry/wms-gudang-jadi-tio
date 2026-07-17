const { z } = require('zod');
const prisma = require('../config/prisma');

const createSOSchema = z.object({
  customerId: z.string().uuid(),
  expectedShipDate: z.string().optional().nullable(),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().positive(),
    })
  ).min(1),
});

const shipSchema = z.object({
  warehouseId: z.string().uuid(),
  items: z.array(
    z.object({
      itemId: z.string().uuid(),
      quantityShipped: z.number().positive(),
    })
  ).min(1),
});

async function list(req, res, next) {
  try {
    const salesOrders = await prisma.salesOrder.findMany({
      where: { customer: { companyId: req.user.companyId } },
      include: {
        customer: { select: { name: true } },
        items: { include: { product: { select: { name: true, sku: true, unit: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(salesOrders);
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const so = await prisma.salesOrder.findFirst({
      where: { id: req.params.id, customer: { companyId: req.user.companyId } },
      include: {
        customer: true,
        items: { include: { product: { select: { name: true, sku: true, unit: true } } } },
      },
    });
    if (!so) return res.status(404).json({ message: 'Sales Order tidak ditemukan' });
    res.json(so);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = createSOSchema.parse(req.body);

    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, companyId: req.user.companyId },
    });
    if (!customer) return res.status(404).json({ message: 'Customer tidak ditemukan' });

    const so = await prisma.salesOrder.create({
      data: {
        customerId: data.customerId,
        status: 'CONFIRMED',
        totalItems: data.items.length,
        expectedShipDate: data.expectedShipDate ? new Date(data.expectedShipDate) : null,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },
      include: { items: true },
    });

    res.status(201).json(so);
  } catch (err) {
    next(err);
  }
}

// Kirim barang dari SO — validasi stok cukup dulu sebelum kurangi stok
// (beda dari PO yang cuma nambah, di sini harus dicek jangan sampai minus)
async function ship(req, res, next) {
  try {
    const data = shipSchema.parse(req.body);
    const io = req.app.get('io');

    const so = await prisma.salesOrder.findFirst({
      where: { id: req.params.id, customer: { companyId: req.user.companyId } },
      include: { items: true },
    });
    if (!so) return res.status(404).json({ message: 'Sales Order tidak ditemukan' });
    if (so.status === 'SHIPPED' || so.status === 'CANCELLED') {
      return res.status(400).json({ message: `SO ini sudah berstatus ${so.status}, tidak bisa dikirim lagi` });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Validasi semua item dulu sebelum eksekusi apapun, biar tidak setengah-setengah
      for (const shipItem of data.items) {
        const soItem = so.items.find((i) => i.id === shipItem.itemId);
        if (!soItem) continue;

        const remaining = Number(soItem.quantity) - Number(soItem.quantityShipped);
        const qtyToShip = Math.min(shipItem.quantityShipped, remaining);
        if (qtyToShip <= 0) continue;

        const existingStock = await tx.stock.findUnique({
          where: { productId_warehouseId: { productId: soItem.productId, warehouseId: data.warehouseId } },
        });
        const currentQty = existingStock ? Number(existingStock.quantity) : 0;

        if (currentQty < qtyToShip) {
          const err = new Error(`Stok tidak cukup untuk salah satu produk. Sisa stok: ${currentQty}`);
          err.status = 400;
          throw err;
        }

        const newQty = currentQty - qtyToShip;

        await tx.stock.update({
          where: { productId_warehouseId: { productId: soItem.productId, warehouseId: data.warehouseId } },
          data: { quantity: newQty },
        });

        await tx.stockMovement.create({
          data: {
            productId: soItem.productId,
            warehouseId: data.warehouseId,
            type: 'OUT',
            quantity: qtyToShip,
            referenceId: so.id,
            createdById: req.user.id,
          },
        });

        await tx.salesOrderItem.update({
          where: { id: soItem.id },
          data: { quantityShipped: Number(soItem.quantityShipped) + qtyToShip },
        });

        if (io) {
          io.to(`company_${req.user.companyId}`).emit('stock:updated', {
            productId: soItem.productId,
            warehouseId: data.warehouseId,
            quantity: newQty,
            type: 'OUT',
          });

          const product = await tx.product.findUnique({ where: { id: soItem.productId } });
          if (product && newQty <= product.minStock) {
            io.to(`company_${req.user.companyId}`).emit('stock:low_alert', {
              productId: product.id,
              productName: product.name,
              currentQty: newQty,
              minStock: product.minStock,
            });
          }
        }
      }

      const updatedItems = await tx.salesOrderItem.findMany({ where: { salesOrderId: so.id } });
      const allShipped = updatedItems.every((i) => Number(i.quantityShipped) >= Number(i.quantity));
      const someShipped = updatedItems.some((i) => Number(i.quantityShipped) > 0);

      const newStatus = allShipped ? 'SHIPPED' : someShipped ? 'PARTIAL' : so.status;

      const updatedSO = await tx.salesOrder.update({
        where: { id: so.id },
        data: { status: newStatus },
        include: { items: { include: { product: { select: { name: true, sku: true, unit: true } } } }, customer: true },
      });

      return updatedSO;
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, ship };