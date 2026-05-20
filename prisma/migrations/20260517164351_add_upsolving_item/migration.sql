-- CreateTable
CREATE TABLE "UpsolvingItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "contestTitle" TEXT NOT NULL,
    "contestDate" TIMESTAMP(3) NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UpsolvingItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UpsolvingItem_userId_questionId_key" ON "UpsolvingItem"("userId", "questionId");

-- AddForeignKey
ALTER TABLE "UpsolvingItem" ADD CONSTRAINT "UpsolvingItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpsolvingItem" ADD CONSTRAINT "UpsolvingItem_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
