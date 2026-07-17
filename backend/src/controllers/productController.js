const { z } = require('zod');
const prisma = require('../config/prisma');

const productSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  categoryId: z.string().uuid().optional().nullable(),
  unit: z.string().default('pcs'),
  minStock: z.number().int().min(0).default(0),
  barcode: z.string().optional().nullable(),
  photoUrl: z.string().url().optional().nullable(),
  // FIX: field ini sebelumnya tidak terdaftar di schema, jadi selalu ke-strip
  // oleh Zod sebelum sempat disimpan ke database (root cause bug Supplier Utama).
  preferredSupplierId: z.string().uuid().optional().nullable(),
});

async function list(req, res, next) {
  try {
    const products = await prisma.product.findMany({
      where: { companyId: req.user.companyId, isActive: true },
      include: { category: true, stocks: { include: { bin: true } }, preferredSupplier: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(products);
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
      include: { category: true, stocks: { include: { warehouse: true, bin: true } }, preferredSupplier: true },
    });
    if (!product) return res.status(404).json({ message: 'Produk tidak ditemukan' });
    res.json(product);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = productSchema.parse(req.body);
    const product = await prisma.product.create({
      data: { ...data, companyId: req.user.companyId },
    });
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const data = productSchema.partial().parse(req.body);
    const product = await prisma.product.updateMany({
      where: { id: req.params.id, companyId: req.user.companyId },
      data,
    });
    if (product.count === 0) return res.status(404).json({ message: 'Produk tidak ditemukan' });
    res.json({ message: 'Produk berhasil diupdate' });
  } catch (err) {
    next(err);
  }
}

// Soft delete — data historis (stock movement) tetap utuh
async function remove(req, res, next) {
  try {
    const product = await prisma.product.updateMany({
      where: { id: req.params.id, companyId: req.user.companyId },
      data: { isActive: false },
    });
    if (product.count === 0) return res.status(404).json({ message: 'Produk tidak ditemukan' });
    res.json({ message: 'Produk berhasil dihapus' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, remove };