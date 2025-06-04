-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- 创建系统用户
INSERT INTO "User" (id, name, email, "createdAt", "updatedAt")
VALUES ('system', 'System', 'system@example.com', NOW(), NOW());

-- AlterTable
ALTER TABLE "Attraction" ADD COLUMN     "address" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "category" TEXT NOT NULL DEFAULT '其他',
ADD COLUMN     "city" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "contact" TEXT,
ADD COLUMN     "country" TEXT NOT NULL DEFAULT '中国',
ADD COLUMN     "createdById" TEXT NOT NULL DEFAULT 'system',
ADD COLUMN     "openingHours" TEXT,
ADD COLUMN     "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "province" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "website" TEXT;

-- AddForeignKey
ALTER TABLE "Attraction" ADD CONSTRAINT "Attraction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
