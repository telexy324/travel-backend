/*
  Warnings:

  - You are about to drop the column `location` on the `Attraction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Attraction" DROP COLUMN "location";

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "attractionId" TEXT NOT NULL,
    "geo" geometry(Point, 4326) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Location_attractionId_key" ON "Location"("attractionId");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_attractionId_fkey" FOREIGN KEY ("attractionId") REFERENCES "Attraction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
