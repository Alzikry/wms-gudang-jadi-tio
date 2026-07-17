const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../config/prisma');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../utils/jwt');

const registerSchema = z.object({
  companyName: z.string().min(2),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Registrasi awal: bikin Company + User pertama sebagai ADMIN
// (Ini yang jalan pas orang baru daftar/trial pertama kali)
async function register(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(409).json({ message: 'Email sudah terdaftar' });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: { name: data.companyName, plan: 'FREE', maxUsers: 1, maxWarehouses: 1 },
      });

      const user = await tx.user.create({
        data: {
          companyId: company.id,
          name: data.name,
          email: data.email,
          passwordHash,
          role: 'ADMIN',
        },
      });

      // Warehouse default biar user langsung bisa pakai sistem
      await tx.warehouse.create({
        data: { companyId: company.id, name: 'Gudang Utama' },
      });

      return { company, user };
    });

    const payload = { id: result.user.id, companyId: result.company.id, role: result.user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.status(201).json({
      user: { id: result.user.id, name: result.user.name, email: result.user.email, role: result.user.role },
      company: { id: result.company.id, name: result.company.name, plan: result.company.plan },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Email atau password salah' });
    }

    const match = await bcrypt.compare(data.password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ message: 'Email atau password salah' });
    }

    const payload = { id: user.id, companyId: user.companyId, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
}

// Refresh token flow — user tidak perlu login ulang tiap 15 menit
async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ message: 'Refresh token wajib diisi' });

    const payload = verifyRefreshToken(refreshToken);
    const accessToken = generateAccessToken({
      id: payload.id,
      companyId: payload.companyId,
      role: payload.role,
    });

    res.json({ accessToken });
  } catch (err) {
    return res.status(401).json({ message: 'Refresh token tidak valid atau kadaluarsa' });
  }
}

module.exports = { register, login, refresh };
