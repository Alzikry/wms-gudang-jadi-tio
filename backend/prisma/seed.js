// Seed data buat testing cepat: 1 company, 1 admin, 1 gudang, 2 produk
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const company = await prisma.company.create({
    data: { name: 'UMKM Contoh Jaya', plan: 'FREE', maxUsers: 5, maxWarehouses: 1 },
  });

  const admin = await prisma.user.create({
    data: {
      companyId: company.id,
      name: 'Admin Utama',
      email: '[email protected]',
      passwordHash,
      role: 'ADMIN',
    },
  });

  const warehouse = await prisma.warehouse.create({
    data: { companyId: company.id, name: 'Gudang Utama', address: 'Jakarta' },
  });

  const category = await prisma.category.create({
    data: { companyId: company.id, name: 'Sembako' },
  });

  await prisma.product.createMany({
    data: [
      { companyId: company.id, categoryId: category.id, sku: 'SKU-001', name: 'Beras 5kg', unit: 'karung', minStock: 10 },
      { companyId: company.id, categoryId: category.id, sku: 'SKU-002', name: 'Minyak Goreng 1L', unit: 'botol', minStock: 20 },
    ],
  });

  console.log('✅ Seed selesai. Login dengan:');
  console.log(`   Email: ${admin.email}`);
  console.log('   Password: password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
