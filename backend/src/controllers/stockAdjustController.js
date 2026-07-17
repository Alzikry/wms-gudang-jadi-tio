const { z } = require('zod');
const prisma = require('../config/prisma');

const adjustSchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  newQuantity: z.number().min(0), // angka stok yang benar (bukan selisih)
  reason: z.string().min(1), // wajib isi alasan, buat audit trail
});

// Set ulang stok ke angka yang ditentukan admin, bukan tambah/kurang seperti stockIn/stockOut.
// Selisihnya otomatis dihitung dan dicatat sebagai StockMovement type ADJUSTMENT,
// dengan alasan tersimpan di referenceId biar ada jejak audit yang jelas.
async function adjust(req, res, next) {
  try {
    const data = adjustSchema.parse(req.body);
    const io = req.app.get('io');

    const result = await prisma.$transaction(async (tx) => {
      const existingStock = await tx.stock.findUnique({
        where: { productId_warehouseId: { productId: data.productId, warehouseId: data.warehouseId } },
      });
      const oldQty = existingStock ? Number(existingStock.quantity) : 0;
      const diff = data.newQuantity - oldQty;

      if (diff === 0) {
        const err = new Error('Jumlah baru sama dengan stok saat ini, tidak ada yang perlu dikoreksi');
        err.status = 400;
        throw err;
      }

      await tx.stock.upsert({
        where: { productId_warehouseId: { productId: data.productId, warehouseId: data.warehouseId } },
        update: { quantity: data.newQuantity },
        create: { productId: data.productId, warehouseId: data.warehouseId, quantity: data.newQuantity },
      });

      const movement = await tx.stockMovement.create({
        data: {
          productId: data.productId,
          warehouseId: data.warehouseId,
          type: 'ADJUSTMENT',
          quantity: Math.abs(diff),
          referenceId: `KOREKSI: ${data.reason} (${oldQty} → ${data.newQuantity}) oleh ${req.user.id}`,
          createdById: req.user.id,
        },
      });

      const product = await tx.product.findUnique({ where: { id: data.productId } });

      if (io) {
        io.to(`company_${req.user.companyId}`).emit('stock:updated', {
          productId: data.productId,
          warehouseId: data.warehouseId,
          quantity: data.newQuantity,
          type: 'ADJUSTMENT',
        });

        if (product && data.newQuantity <= product.minStock) {
          io.to(`company_${req.user.companyId}`).emit('stock:low_alert', {
            productId: product.id,
            productName: product.name,
            currentQty: data.newQuantity,
            minStock: product.minStock,
          });
        }
      }

      return { oldQuantity: oldQty, newQuantity: data.newQuantity, difference: diff, movement };
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { adjust };