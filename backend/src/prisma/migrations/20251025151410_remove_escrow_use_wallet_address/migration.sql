/*
  Warnings:

  - You are about to drop the column `escrowAddress` on the `Participant` table. All the data in the column will be lost.
  - You are about to drop the column `rewardReleased` on the `Participant` table. All the data in the column will be lost.
  - You are about to drop the column `verified` on the `Participant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Participant" DROP COLUMN "escrowAddress",
DROP COLUMN "rewardReleased",
DROP COLUMN "verified",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "walletAddress" TEXT;
