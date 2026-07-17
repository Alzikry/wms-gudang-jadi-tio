const { z } = require('zod');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

const VALID_ROLES = ['ADMIN', 'STAFF_ADMIN', 'STAFF_GUDANG', 'SUPERVISOR', 'MANAGER'];

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(VALID_ROLES),
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(VALID_ROLES).optional(),
  isActive: z.boolean().optional(),
});

// Daftar semua user dalam satu company (tidak termasuk password hash)
async function list(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      where: { companyId: req.user.companyId },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
}

// Admin bikin akun staff baru DI DALAM company yang sama (beda dari /auth/register
// yang selalu bikin company baru). Ini yang dipakai buat nambah staff gudang, supervisor, dst.
async function create(req, res, next) {
  try {
    const data = createUserSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(409).json({ message: 'Email sudah terdaftar' });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        companyId: req.user.companyId,
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });

    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const data = updateUserSchema.parse(req.body);

    const target = await prisma.user.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
    });
    if (!target) return res.status(404).json({ message: 'User tidak ditemukan' });

    // Guard: jangan sampai company kehilangan ADMIN terakhir (baik karena role diturunkan
    // atau di-nonaktifkan) — supaya tidak ada yang terkunci tidak bisa kelola user lagi.
    const isDemotingLastAdmin =
      target.role === 'ADMIN' &&
      ((data.role && data.role !== 'ADMIN') || data.isActive === false);

    if (isDemotingLastAdmin) {
      const activeAdminCount = await prisma.user.count({
        where: { companyId: req.user.companyId, role: 'ADMIN', isActive: true },
      });
      if (activeAdminCount <= 1) {
        return res.status(400).json({ message: 'Tidak bisa menurunkan/menonaktifkan ADMIN terakhir di company ini' });
      }
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });

    res.json(user);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, VALID_ROLES };