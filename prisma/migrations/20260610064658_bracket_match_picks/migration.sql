/*
  Warnings:

  - You are about to drop the `BracketPick` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "BracketPick" DROP CONSTRAINT "BracketPick_userId_fkey";

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "awayLabel" TEXT,
ADD COLUMN     "homeLabel" TEXT;

-- DropTable
DROP TABLE "BracketPick";

-- DropEnum
DROP TYPE "BracketStage";

-- CreateTable
CREATE TABLE "BracketMatchPick" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "predictedWinner" TEXT NOT NULL,
    "points" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BracketMatchPick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BracketMatchPick_userId_matchId_key" ON "BracketMatchPick"("userId", "matchId");

-- AddForeignKey
ALTER TABLE "BracketMatchPick" ADD CONSTRAINT "BracketMatchPick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketMatchPick" ADD CONSTRAINT "BracketMatchPick_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
