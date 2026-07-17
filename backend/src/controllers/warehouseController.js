const { z } = require('zod');
const prisma = require('../config/prisma');

const warehouseSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional().nullable(),
});

async function list(req, res, next) {
  try {
    const warehouses = await prisma.warehouse.findMany({
      where: { companyId: req.user.companyId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(warehouses);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = warehouseSchema.parse(req.body);
    const warehouse = await prisma.warehouse.create({
      data: { ...data, companyId: req.user.companyId },
    });
    res.status(201).json(warehouse);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const data = warehouseSchema.partial().parse(req.body);
    const result = await prisma.warehouse.updateMany({
      where: { id: req.params.id, companyId: req.user.companyId },
      data,
    });
    if (result.count === 0) return res.status(404).json({ message: 'Gudang tidak ditemukan' });
    res.json({ message: 'Gudang berhasil diupdate' });
  } catch (err) {
    next(err);
  }
}

// Soft delete — supaya histori stok/movement yang nempel ke gudang ini tetap utuh
async function remove(req, res, next) {
  try {
    const stockCount = await prisma.stock.count({
      where: { warehouseId: req.params.id, quantity: { gt: 0 } },
    });
    if (stockCount > 0) {
      return res.status(400).json({ message: 'Gudang tidak bisa dihapus karena masih ada stok di dalamnya' });
    }

    const result = await prisma.warehouse.updateMany({
      where: { id: req.params.id, companyId: req.user.companyId },
      data: { isActive: false },
    });
    if (result.count === 0) return res.status(404).json({ message: 'Gudang tidak ditemukan' });
    res.json({ message: 'Gudang berhasil dihapus' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };