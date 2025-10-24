-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "rewardReleased" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rewardTxHash" TEXT;
