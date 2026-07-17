const prisma = require('../config/prisma');

// Riwayat transaksi stok — permanen, diambil dari tabel stock_movements
async function listMovements(req, res, next) {
  try {
    const { type, productId, limit } = req.query;

    const where = {
      warehouse: { companyId: req.user.companyId },
    };
    if (type) where.type = type; // IN atau OUT
    if (productId) where.productId = productId;

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { name: true, sku: true, unit: true } },
        warehouse: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit ? Number(limit) : 100,
    });

    res.json(movements);
  } catch (err) {
    next(err);
  }
}

module.exports = { listMovements };