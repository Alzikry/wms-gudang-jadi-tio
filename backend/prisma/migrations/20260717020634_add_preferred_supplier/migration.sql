-- AlterTable
ALTER TABLE "products" ADD COLUMN     "preferredSupplierId" TEXT;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_preferredSupplierId_fkey" FOREIGN KEY ("preferredSupplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
