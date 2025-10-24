/*
  Warnings:

  - You are about to drop the column `creatorId` on the `Challenge` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Participant` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Submission` table. All the data in the column will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `answerHash` to the `Submission` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Challenge" DROP CONSTRAINT "Challenge_creatorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Participant" DROP CONSTRAINT "Participant_userId_fkey";

-- AlterTable
ALTER TABLE "Challenge" DROP COLUMN "creatorId",
ADD COLUMN     "chainChallengeId" INTEGER,
ADD COLUMN     "correctAnswerHash" TEXT,
ADD COLUMN     "creator" TEXT NOT NULL DEFAULT 'unknown@gauntlet.com',
ADD COLUMN     "sponsorDaoAddress" TEXT,
ADD COLUMN     "validatorDaoAddress" TEXT;

-- AlterTable
ALTER TABLE "Participant" DROP COLUMN "createdAt",
ADD COLUMN     "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "stakeTxHash" TEXT;

-- AlterTable
ALTER TABLE "Submission" DROP COLUMN "createdAt",
ADD COLUMN     "answerHash" TEXT NOT NULL,
ADD COLUMN     "proofURI" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "answerText" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- DropTable
DROP TABLE "public"."User";

-- CreateTable
CREATE TABLE "ChallengeEvent" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "blockNumber" INTEGER,
    "eventData" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengeEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ChallengeEvent" ADD CONSTRAINT "ChallengeEvent_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
