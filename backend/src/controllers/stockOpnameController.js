const { z } = require('zod');
const prisma = require('../config/prisma');

const createSchema = z.object({
  warehouseId: z.string().uuid(),
  note: z.string().optional().nullable(),
});

const saveItemsSchema = z.object({
  items: z.array(
    z.object({
      itemId: z.string().uuid(),
      physicalQty: z.number().min(0),
    })
  ).min(1),
});

async function list(req, res, next) {
  try {
    const opnames = await prisma.stockOpname.findMany({
      where: { warehouse: { companyId: req.user.companyId } },
      include: {
        warehouse: { select: { name: true } },
        createdBy: { select: { name: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(opnames);
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const opname = await prisma.stockOpname.findFirst({
      where: { id: req.params.id, warehouse: { companyId: req.user.companyId } },
      include: {
        warehouse: true,
        createdBy: { select: { name: true } },
        items: {
          include: { product: { select: { name: true, sku: true, unit: true } } },
          orderBy: { id: 'asc' },
        },
      },
    });
    if (!opname) return res.status(404).json({ message: 'Stock Opname tidak ditemukan' });
    res.json(opname);
  } catch (err) {
    next(err);
  }
}

// Buat sesi opname baru — otomatis ambil snapshot stok sistem saat ini buat semua produk di gudang itu
async function create(req, res, next) {
  try {
    const data = createSchema.parse(req.body);

    const warehouse = await prisma.warehouse.findFirst({
      where: { id: data.warehouseId, companyId: req.user.companyId },
    });
    if (!warehouse) return res.status(404).json({ message: 'Gudang tidak ditemukan' });

    const stocks = await prisma.stock.findMany({
      where: { warehouseId: data.warehouseId },
      include: { product: { select: { isActive: true } } },
    });

    const activeStocks = stocks.filter((s) => s.product.isActive);
    if (activeStocks.length === 0) {
      return res.status(400).json({ message: 'Belum ada stok produk di gudang ini untuk dihitung' });
    }

    const opname = await prisma.stockOpname.create({
      data: {
        warehouseId: data.warehouseId,
        note: data.note || null,
        createdById: req.user.id,
        items: {
          create: activeStocks.map((s) => ({
            productId: s.productId,
            systemQty: s.quantity,
          })),
        },
      },
      include: {
        items: { include: { product: { select: { name: true, sku: true, unit: true } } } },
      },
    });

    res.status(201).json(opname);
  } catch (err) {
    next(err);
  }
}

// Simpan hasil hitung fisik — bisa dicicil, belum final selama status masih DRAFT
async function saveItems(req, res, next) {
  try {
    const data = saveItemsSchema.parse(req.body);

    const opname = await prisma.stockOpname.findFirst({
      where: { id: req.params.id, warehouse: { companyId: req.user.companyId } },
    });
    if (!opname) return res.status(404).json({ message: 'Stock Opname tidak ditemukan' });
    if (opname.status === 'COMPLETED') {
      return res.status(400).json({ message: 'Stock Opname ini sudah selesai, tidak bisa diubah lagi' });
    }

    await prisma.$transaction(
      data.items.map((item) =>
        prisma.stockOpnameItem.updateMany({
          where: { id: item.itemId, stockOpnameId: opname.id },
          data: { physicalQty: item.physicalQty },
        })
      )
    );

    const updated = await prisma.stockOpname.findUnique({
      where: { id: opname.id },
      include: { items: { include: { product: { select: { name: true, sku: true, unit: true } } } } },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// Finalisasi — hitung selisih sistem vs fisik, update stok biar sama dengan hasil hitung fisik,
// dan catat setiap selisih sebagai StockMovement tipe ADJUSTMENT (bisa plus/minus)
async function complete(req, res, next) {
  try {
    const io = req.app.get('io');

    const opname = await prisma.stockOpname.findFirst({
      where: { id: req.params.id, warehouse: { companyId: req.user.companyId } },
      include: { items: true },
    });
    if (!opname) return res.status(404).json({ message: 'Stock Opname tidak ditemukan' });
    if (opname.status === 'COMPLETED') {
      return res.status(400).json({ message: 'Stock Opname ini sudah selesai sebelumnya' });
    }

    const notCounted = opname.items.filter((i) => i.physicalQty === null);
    if (notCounted.length > 0) {
      return res.status(400).json({ message: 'Masih ada produk yang belum diisi jumlah fisiknya' });
    }

    const result = await prisma.$transaction(async (tx) => {
      for (const item of opname.items) {
        const difference = Number(item.physicalQty) - Number(item.systemQty);

        await tx.stockOpnameItem.update({
          where: { id: item.id },
          data: { difference },
        });

        if (difference !== 0) {
          await tx.stock.update({
            where: { productId_warehouseId: { productId: item.productId, warehouseId: opname.warehouseId } },
            data: { quantity: item.physicalQty },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              warehouseId: opname.warehouseId,
              type: 'ADJUSTMENT',
              quantity: difference,
              referenceId: opname.id,
              createdById: req.user.id,
            },
          });

          if (io) {
            io.to(`company_${req.user.companyId}`).emit('stock:updated', {
              productId: item.productId,
              warehouseId: opname.warehouseId,
              quantity: Number(item.physicalQty),
              type: 'ADJUSTMENT',
            });
          }
        }
      }

      return tx.stockOpname.update({
        where: { id: opname.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
        include: { items: { include: { product: { select: { name: true, sku: true, unit: true } } } } },
      });
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, saveItems, complete };