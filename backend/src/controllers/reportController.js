const ExcelJS = require('exceljs');
const prisma = require('../config/prisma');

// Ringkasan angka-angka penting buat halaman Laporan
async function summary(req, res, next) {
  try {
    const companyId = req.user.companyId;

    const [totalProducts, totalWarehouses, allProducts] = await Promise.all([
      prisma.product.count({ where: { companyId, isActive: true } }),
      prisma.warehouse.count({ where: { companyId, isActive: true } }),
      prisma.product.findMany({
        where: { companyId, isActive: true },
        include: { stocks: true },
      }),
    ]);

    // Hitung produk yang stok totalnya <= minStock
    const lowStockProducts = allProducts
      .map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        unit: p.unit,
        minStock: p.minStock,
        currentStock: p.stocks.reduce((sum, s) => sum + Number(s.quantity), 0),
      }))
      .filter((p) => p.currentStock <= p.minStock);

    const totalStockValue = allProducts.reduce((sum, p) => {
      return sum + p.stocks.reduce((s, stock) => s + Number(stock.quantity), 0);
    }, 0);

    res.json({
      totalProducts,
      totalWarehouses,
      totalStockUnits: totalStockValue,
      lowStockCount: lowStockProducts.length,
      lowStockProducts,
    });
  } catch (err) {
    next(err);
  }
}

// Export riwayat stock movement ke file Excel (.xlsx)
async function exportMovements(req, res, next) {
  try {
    const { type, from, to } = req.query;
    const where = { warehouse: { companyId: req.user.companyId } };
    if (type) where.type = type;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { sku: true, name: true, unit: true } },
        warehouse: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'WMS Pro';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Riwayat Stok');

    sheet.columns = [
      { header: 'Tanggal', key: 'date', width: 20 },
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Nama Produk', key: 'productName', width: 30 },
      { header: 'Gudang', key: 'warehouse', width: 20 },
      { header: 'Jenis', key: 'type', width: 12 },
      { header: 'Jumlah', key: 'quantity', width: 12 },
      { header: 'Satuan', key: 'unit', width: 10 },
      { header: 'Dicatat Oleh', key: 'createdBy', width: 20 },
      { header: 'Referensi', key: 'referenceId', width: 20 },
    ];

    // Bikin header row tebal biar rapi
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' },
    };

    movements.forEach((m) => {
      sheet.addRow({
        date: new Date(m.createdAt).toLocaleString('id-ID'),
        sku: m.product?.sku,
        productName: m.product?.name,
        warehouse: m.warehouse?.name,
        type: m.type === 'IN' ? 'Masuk' : m.type === 'OUT' ? 'Keluar' : m.type,
        quantity: Number(m.quantity),
        unit: m.product?.unit,
        createdBy: m.createdBy?.name || '-',
        referenceId: m.referenceId || '-',
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="riwayat-stok-${Date.now()}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
}

// Export daftar produk + stok saat ini ke Excel
async function exportProducts(req, res, next) {
  try {
    const products = await prisma.product.findMany({
      where: { companyId: req.user.companyId, isActive: true },
      include: { category: true, stocks: { include: { warehouse: true, bin: true } } },
      orderBy: { name: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Data Produk');

    sheet.columns = [
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Nama Produk', key: 'name', width: 30 },
      { header: 'Kategori', key: 'category', width: 20 },
      { header: 'Satuan', key: 'unit', width: 10 },
      { header: 'Stok Minimum', key: 'minStock', width: 14 },
      { header: 'Stok Saat Ini', key: 'currentStock', width: 14 },
      { header: 'Lokasi Rak', key: 'bin', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };

    products.forEach((p) => {
      const currentStock = p.stocks.reduce((sum, s) => sum + Number(s.quantity), 0);
      const bin = p.stocks.find((s) => s.bin)?.bin;
      sheet.addRow({
        sku: p.sku,
        name: p.name,
        category: p.category?.name || '-',
        unit: p.unit,
        minStock: p.minStock,
        currentStock,
        bin: bin ? `${bin.code}${bin.name ? ` - ${bin.name}` : ''}` : '-',
        status: currentStock <= p.minStock ? 'Stok Menipis' : 'Aman',
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="data-produk-${Date.now()}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
}

module.exports = { summary, exportMovements, exportProducts };