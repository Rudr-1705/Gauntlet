/*
  Warnings:

  - You are about to drop the column `proofId` on the `Participant` table. All the data in the column will be lost.
  - You are about to drop the column `proofData` on the `Submission` table. All the data in the column will be lost.
  - You are about to drop the column `proofId` on the `Submission` table. All the data in the column will be lost.
  - You are about to drop the `Proof` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Proof" DROP CONSTRAINT "Proof_submissionId_fkey";

-- DropIndex
DROP INDEX "public"."Submission_proofId_key";

-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN     "fundibility" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "judgingCriteria" TEXT;

-- AlterTable
ALTER TABLE "Participant" DROP COLUMN "proofId";

-- AlterTable
ALTER TABLE "Submission" DROP COLUMN "proofData",
DROP COLUMN "proofId",
ADD COLUMN     "validatorTxHash" TEXT;

-- DropTable
DROP TABLE "public"."Proof";
