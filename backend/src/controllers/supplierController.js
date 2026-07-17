const { z } = require('zod');
const prisma = require('../config/prisma');

const supplierSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

async function list(req, res, next) {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { companyId: req.user.companyId },
      orderBy: { name: 'asc' },
    });
    res.json(suppliers);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = supplierSchema.parse(req.body);
    const supplier = await prisma.supplier.create({
      data: { ...data, companyId: req.user.companyId },
    });
    res.status(201).json(supplier);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const data = supplierSchema.partial().parse(req.body);
    const result = await prisma.supplier.updateMany({
      where: { id: req.params.id, companyId: req.user.companyId },
      data,
    });
    if (result.count === 0) return res.status(404).json({ message: 'Supplier tidak ditemukan' });
    res.json({ message: 'Supplier berhasil diupdate' });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    // Cek dulu apakah supplier ini masih punya PO — kalau ada, jangan boleh dihapus
    // supaya riwayat pembelian tidak rusak (data integrity)
    const poCount = await prisma.purchaseOrder.count({ where: { supplierId: req.params.id } });
    if (poCount > 0) {
      return res.status(400).json({ message: 'Supplier tidak bisa dihapus karena masih punya riwayat Purchase Order' });
    }

    const result = await prisma.supplier.deleteMany({
      where: { id: req.params.id, companyId: req.user.companyId },
    });
    if (result.count === 0) return res.status(404).json({ message: 'Supplier tidak ditemukan' });
    res.json({ message: 'Supplier berhasil dihapus' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };