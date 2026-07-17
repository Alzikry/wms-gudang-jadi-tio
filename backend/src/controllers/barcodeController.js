const prisma = require('../config/prisma');

// Cari produk berdasarkan barcode, sekalian breakdown stoknya per gudang
async function lookup(req, res, next) {
  try {
    const code = req.params.code;

    const product = await prisma.product.findFirst({
      where: { barcode: code, companyId: req.user.companyId, isActive: true },
      include: {
        category: { select: { name: true } },
        stocks: { include: { warehouse: { select: { name: true } }, bin: true } },
      },
    });

    if (!product) {
      return res.status(404).json({ message: 'Barcode ini belum terdaftar ke produk manapun' });
    }

    const totalStock = product.stocks.reduce((sum, s) => sum + Number(s.quantity), 0);

    res.json({
      id: product.id,
      sku: product.sku,
      name: product.name,
      unit: product.unit,
      minStock: product.minStock,
      barcode: product.barcode,
      category: product.category ? product.category.name : null,
      totalStock,
      stocks: product.stocks.map((s) => ({
        warehouseId: s.warehouseId,
        warehouseName: s.warehouse ? s.warehouse.name : null,
        binCode: s.bin ? s.bin.code : null,
        quantity: Number(s.quantity),
      })),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { lookup };