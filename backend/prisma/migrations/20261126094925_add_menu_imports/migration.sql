-- CreateEnum
CREATE TYPE "MenuImportStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'REVIEW_REQUIRED', 'APPROVED', 'FAILED');

-- CreateTable
CREATE TABLE "MenuImport" (
    "id" UUID NOT NULL,
    "restaurantId" UUID NOT NULL,
    "uploadedById" UUID NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "status" "MenuImportStatus" NOT NULL DEFAULT 'UPLOADED',
    "extractedData" JSONB,
    "errorMessage" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MenuImport_restaurantId_status_idx" ON "MenuImport"("restaurantId", "status");

-- CreateIndex
CREATE INDEX "MenuImport_uploadedById_idx" ON "MenuImport"("uploadedById");

-- CreateIndex
CREATE INDEX "MenuImport_createdAt_idx" ON "MenuImport"("createdAt");

-- AddForeignKey
ALTER TABLE "MenuImport" ADD CONSTRAINT "MenuImport_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
