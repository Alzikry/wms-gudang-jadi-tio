const { z } = require('zod');
const prisma = require('../config/prisma');

const movementSchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  quantity: z.number().positive(),
  referenceId: z.string().optional().nullable(),
  binId: z.string().uuid().optional().nullable(), // lokasi rak (opsional)
});

const transferSchema = z.object({
  productId: z.string().uuid(),
  fromWarehouseId: z.string().uuid(),
  toWarehouseId: z.string().uuid(),
  quantity: z.number().positive(),
  toBinId: z.string().uuid().optional().nullable(), // lokasi rak di gudang tujuan
});

async function listStock(req, res, next) {
  try {
    const stocks = await prisma.stock.findMany({
      where: { warehouse: { companyId: req.user.companyId } },
      include: { product: true, warehouse: true, bin: true },
    });
    res.json(stocks);
  } catch (err) {
    next(err);
  }
}

// Barang masuk (Penerimaan) — bisa sekalian pilih rak tujuan
async function stockIn(req, res, next) {
  try {
    const data = movementSchema.parse(req.body);
    const result = await processMovement(req, data, 'IN');
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

// Barang keluar (Pengeluaran) — validasi stok cukup
async function stockOut(req, res, next) {
  try {
    const data = movementSchema.parse(req.body);
    const result = await processMovement(req, data, 'OUT');
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

// Inti logic — pakai Prisma transaction biar aman dari race condition
async function processMovement(req, data, type) {
  const io = req.app.get('io');

  return prisma.$transaction(async (tx) => {
    const existingStock = await tx.stock.findUnique({
      where: { productId_warehouseId: { productId: data.productId, warehouseId: data.warehouseId } },
    });

    const currentQty = existingStock ? Number(existingStock.quantity) : 0;

    if (type === 'OUT' && currentQty < data.quantity) {
      const err = new Error(`Stok tidak cukup. Sisa stok: ${currentQty}`);
      err.status = 400;
      throw err;
    }

    const newQty = type === 'IN' ? currentQty + data.quantity : currentQty - data.quantity;

    // Kalau binId dikirim (biasanya cuma pas barang masuk), update lokasi rak
    // jadi rak yang baru dipilih ini. Kalau tidak dikirim, biarkan binId yang lama.
    const stockUpdateData = { quantity: newQty };
    const stockCreateData = { productId: data.productId, warehouseId: data.warehouseId, quantity: newQty };
    if (data.binId !== undefined && data.binId !== null) {
      stockUpdateData.binId = data.binId;
      stockCreateData.binId = data.binId;
    }

    const stock = await tx.stock.upsert({
      where: { productId_warehouseId: { productId: data.productId, warehouseId: data.warehouseId } },
      update: stockUpdateData,
      create: stockCreateData,
    });

    const movement = await tx.stockMovement.create({
      data: {
        productId: data.productId,
        warehouseId: data.warehouseId,
        type,
        quantity: data.quantity,
        referenceId: data.referenceId,
        createdById: req.user.id,
      },
    });

    const product = await tx.product.findUnique({ where: { id: data.productId } });

    if (io) {
      io.to(`company_${req.user.companyId}`).emit('stock:updated', {
        productId: data.productId,
        warehouseId: data.warehouseId,
        quantity: newQty,
        type,
      });

      if (product && newQty <= product.minStock) {
        io.to(`company_${req.user.companyId}`).emit('stock:low_alert', {
          productId: product.id,
          productName: product.name,
          currentQty: newQty,
          minStock: product.minStock,
        });
      }
    }

    return { stock, movement };
  });
}

// Transfer antar gudang — bikin 1 movement OUT di gudang asal + 1 movement IN
// di gudang tujuan, dengan referenceId yang sama biar kelihatan sebagai 1 kejadian
// terkait kalau ditelusuri
async function transfer(req, res, next) {
  try {
    const data = transferSchema.parse(req.body);

    if (data.fromWarehouseId === data.toWarehouseId) {
      return res.status(400).json({ message: 'Gudang asal dan tujuan tidak boleh sama' });
    }

    const io = req.app.get('io');
    const transferId = `TRF-${Date.now()}`;

    const result = await prisma.$transaction(async (tx) => {
      // Kurangi stok di gudang asal
      const fromStock = await tx.stock.findUnique({
        where: { productId_warehouseId: { productId: data.productId, warehouseId: data.fromWarehouseId } },
      });
      const fromQty = fromStock ? Number(fromStock.quantity) : 0;

      if (fromQty < data.quantity) {
        const err = new Error(`Stok tidak cukup di gudang asal. Sisa stok: ${fromQty}`);
        err.status = 400;
        throw err;
      }

      const newFromQty = fromQty - data.quantity;
      await tx.stock.update({
        where: { productId_warehouseId: { productId: data.productId, warehouseId: data.fromWarehouseId } },
        data: { quantity: newFromQty },
      });

      await tx.stockMovement.create({
        data: {
          productId: data.productId,
          warehouseId: data.fromWarehouseId,
          type: 'OUT',
          quantity: data.quantity,
          referenceId: transferId,
          createdById: req.user.id,
        },
      });

      // Tambah stok di gudang tujuan
      const toStock = await tx.stock.findUnique({
        where: { productId_warehouseId: { productId: data.productId, warehouseId: data.toWarehouseId } },
      });
      const toQty = toStock ? Number(toStock.quantity) : 0;
      const newToQty = toQty + data.quantity;

      const toStockData = { quantity: newToQty };
      const toStockCreate = { productId: data.productId, warehouseId: data.toWarehouseId, quantity: newToQty };
      if (data.toBinId) {
        toStockData.binId = data.toBinId;
        toStockCreate.binId = data.toBinId;
      }

      await tx.stock.upsert({
        where: { productId_warehouseId: { productId: data.productId, warehouseId: data.toWarehouseId } },
        update: toStockData,
        create: toStockCreate,
      });

      await tx.stockMovement.create({
        data: {
          productId: data.productId,
          warehouseId: data.toWarehouseId,
          type: 'IN',
          quantity: data.quantity,
          referenceId: transferId,
          createdById: req.user.id,
        },
      });

      if (io) {
        io.to(`company_${req.user.companyId}`).emit('stock:updated', {
          productId: data.productId,
          warehouseId: data.fromWarehouseId,
          quantity: newFromQty,
          type: 'OUT',
        });
        io.to(`company_${req.user.companyId}`).emit('stock:updated', {
          productId: data.productId,
          warehouseId: data.toWarehouseId,
          quantity: newToQty,
          type: 'IN',
        });
      }

      return { fromQuantity: newFromQty, toQuantity: newToQty, transferId };
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { listStock, stockIn, stockOut, transfer };