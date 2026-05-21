-- CreateTable
CREATE TABLE "WeakTopicAnalysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "topTags" TEXT[],
    "summary" TEXT NOT NULL,
    "scoresJson" JSONB NOT NULL,

    CONSTRAINT "WeakTopicAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeakTopicAnalysis_userId_createdAt_idx" ON "WeakTopicAnalysis"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "WeakTopicAnalysis" ADD CONSTRAINT "WeakTopicAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
