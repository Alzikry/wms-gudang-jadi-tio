const { z } = require('zod');
const prisma = require('../config/prisma');

const customerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

async function list(req, res, next) {
  try {
    const customers = await prisma.customer.findMany({
      where: { companyId: req.user.companyId },
      orderBy: { name: 'asc' },
    });
    res.json(customers);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = customerSchema.parse(req.body);
    const customer = await prisma.customer.create({
      data: { ...data, companyId: req.user.companyId },
    });
    res.status(201).json(customer);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const data = customerSchema.partial().parse(req.body);
    const result = await prisma.customer.updateMany({
      where: { id: req.params.id, companyId: req.user.companyId },
      data,
    });
    if (result.count === 0) return res.status(404).json({ message: 'Customer tidak ditemukan' });
    res.json({ message: 'Customer berhasil diupdate' });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const soCount = await prisma.salesOrder.count({ where: { customerId: req.params.id } });
    if (soCount > 0) {
      return res.status(400).json({ message: 'Customer tidak bisa dihapus karena masih punya riwayat Sales Order' });
    }

    const result = await prisma.customer.deleteMany({
      where: { id: req.params.id, companyId: req.user.companyId },
    });
    if (result.count === 0) return res.status(404).json({ message: 'Customer tidak ditemukan' });
    res.json({ message: 'Customer berhasil dihapus' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };