-- AlterTable
ALTER TABLE "stocks" ADD COLUMN     "binId" TEXT;

-- CreateTable
CREATE TABLE "bins" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bins_warehouseId_code_key" ON "bins"("warehouseId", "code");

-- AddForeignKey
ALTER TABLE "bins" ADD CONSTRAINT "bins_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_binId_fkey" FOREIGN KEY ("binId") REFERENCES "bins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
