-- CreateEnum
CREATE TYPE "BracketStage" AS ENUM ('ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'FINAL', 'CHAMPION');

-- CreateTable
CREATE TABLE "BracketPick" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stage" "BracketStage" NOT NULL,
    "team" TEXT NOT NULL,
    "points" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BracketPick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BracketPick_userId_stage_team_key" ON "BracketPick"("userId", "stage", "team");

-- AddForeignKey
ALTER TABLE "BracketPick" ADD CONSTRAINT "BracketPick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
