const prisma = require('../config/prisma');

// Cari semua produk aktif yang stok totalnya <= minStock, sekalian saran jumlah reorder.
// Rumus saran: isi ulang sampai 2x minStock (supaya ada buffer), minimal sebesar minStock.
async function suggestions(req, res, next) {
  try {
    const products = await prisma.product.findMany({
      where: { companyId: req.user.companyId, isActive: true },
      include: {
        stocks: true,
        preferredSupplier: { select: { id: true, name: true } },
      },
    });

    const lowStock = products
      .map((p) => {
        const currentStock = p.stocks.reduce((sum, s) => sum + Number(s.quantity), 0);
        return {
          id: p.id,
          sku: p.sku,
          name: p.name,
          unit: p.unit,
          minStock: p.minStock,
          currentStock,
          suggestedQty: Math.max(p.minStock * 2 - currentStock, p.minStock),
          preferredSupplierId: p.preferredSupplierId,
          preferredSupplierName: p.preferredSupplier ? p.preferredSupplier.name : null,
        };
      })
      .filter((p) => p.currentStock <= p.minStock);

    res.json(lowStock);
  } catch (err) {
    next(err);
  }
}

// Bikin draft PO otomatis per supplier. Sekarang menerima `items` berisi productId + quantity
// yang SUDAH ditentukan dari frontend (bisa saran otomatis, bisa juga sudah diedit manual oleh user).
// Backend tidak lagi menghitung ulang suggestedQty di sini — apa yang dikirim frontend itu yang dipakai,
// supaya user punya kendali penuh atas jumlah yang mau di-order sebelum draft PO dibuat.
// Produk yang belum punya preferredSupplier tetap dilewati (masuk "skipped"), sebagai validasi keamanan
// di sisi server (tidak hanya mengandalkan validasi checkbox di frontend).
async function generate(req, res, next) {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Pilih minimal 1 produk' });
    }

    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, companyId: req.user.companyId, isActive: true },
    });
    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    const grouped = {};
    const skipped = [];

    for (const item of items) {
      const product = productMap[item.productId];
      if (!product) {
        skipped.push({ id: item.productId, name: '(tidak ditemukan)', reason: 'Produk tidak valid' });
        continue;
      }
      if (!product.preferredSupplierId) {
        skipped.push({ id: product.id, name: product.name, reason: 'Belum ada Supplier Utama yang di-set' });
        continue;
      }

      const quantity = Number(item.quantity);
      if (!quantity || quantity <= 0) {
        skipped.push({ id: product.id, name: product.name, reason: 'Jumlah order tidak valid' });
        continue;
      }

      if (!grouped[product.preferredSupplierId]) grouped[product.preferredSupplierId] = [];
      grouped[product.preferredSupplierId].push({ productId: product.id, quantity });
    }

    const createdPOs = [];
    for (const supplierId of Object.keys(grouped)) {
      const poItems = grouped[supplierId];
      const po = await prisma.purchaseOrder.create({
        data: {
          supplierId,
          status: 'DRAFT',
          totalItems: poItems.length,
          items: { create: poItems },
        },
        include: {
          supplier: { select: { name: true } },
          items: { include: { product: { select: { name: true, sku: true, unit: true } } } },
        },
      });
      createdPOs.push(po);
    }

    res.status(201).json({ createdPOs, skipped });
  } catch (err) {
    next(err);
  }
}

module.exports = { suggestions, generate };