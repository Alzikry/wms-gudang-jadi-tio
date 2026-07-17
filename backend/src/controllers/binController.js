const { z } = require('zod');
const prisma = require('../config/prisma');

const binSchema = z.object({
  warehouseId: z.string().uuid(),
  code: z.string().min(1),
  name: z.string().optional().nullable(),
});

async function list(req, res, next) {
  try {
    const where = { warehouse: { companyId: req.user.companyId } };
    if (req.query.warehouseId) where.warehouseId = req.query.warehouseId;

    const bins = await prisma.bin.findMany({
      where,
      include: { warehouse: { select: { name: true } } },
      orderBy: [{ warehouseId: 'asc' }, { code: 'asc' }],
    });
    res.json(bins);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = binSchema.parse(req.body);

    const warehouse = await prisma.warehouse.findFirst({
      where: { id: data.warehouseId, companyId: req.user.companyId },
    });
    if (!warehouse) return res.status(404).json({ message: 'Gudang tidak ditemukan' });

    const bin = await prisma.bin.create({ data });
    res.status(201).json(bin);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ message: 'Kode rak ini sudah dipakai di gudang tersebut' });
    }
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const data = binSchema.partial().parse(req.body);

    const existing = await prisma.bin.findFirst({
      where: { id: req.params.id, warehouse: { companyId: req.user.companyId } },
    });
    if (!existing) return res.status(404).json({ message: 'Lokasi rak tidak ditemukan' });

    const bin = await prisma.bin.update({ where: { id: req.params.id }, data });
    res.json(bin);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ message: 'Kode rak ini sudah dipakai di gudang tersebut' });
    }
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const existing = await prisma.bin.findFirst({
      where: { id: req.params.id, warehouse: { companyId: req.user.companyId } },
    });
    if (!existing) return res.status(404).json({ message: 'Lokasi rak tidak ditemukan' });

    const stockCount = await prisma.stock.count({ where: { binId: req.params.id } });
    if (stockCount > 0) {
      return res.status(400).json({ message: 'Rak ini masih dipakai oleh produk, pindahkan dulu sebelum dihapus' });
    }

    await prisma.bin.delete({ where: { id: req.params.id } });
    res.json({ message: 'Lokasi rak berhasil dihapus' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };