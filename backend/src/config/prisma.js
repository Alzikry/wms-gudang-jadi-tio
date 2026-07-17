const { PrismaClient } = require('@prisma/client');

// Singleton biar tidak buka banyak koneksi ke database saat hot-reload (nodemon)
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
