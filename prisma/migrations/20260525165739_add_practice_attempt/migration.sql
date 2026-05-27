-- CreateEnum
CREATE TYPE "PracticeStatus" AS ENUM ('PASSED', 'ATTEMPTED');

-- CreateTable
CREATE TABLE "PracticeAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "output" TEXT NOT NULL,
    "status" "PracticeStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PracticeAttempt_userId_createdAt_idx" ON "PracticeAttempt"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "PracticeAttempt" ADD CONSTRAINT "PracticeAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
