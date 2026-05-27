-- DropForeignKey
ALTER TABLE "ContestQuestion" DROP CONSTRAINT "ContestQuestion_contestSessionId_fkey";

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "ContestQuestion_contestSessionId_idx" ON "ContestQuestion"("contestSessionId");

-- CreateIndex
CREATE INDEX "ContestSession_userId_idx" ON "ContestSession"("userId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "UpsolvingItem_userId_idx" ON "UpsolvingItem"("userId");

-- AddForeignKey
ALTER TABLE "ContestQuestion" ADD CONSTRAINT "ContestQuestion_contestSessionId_fkey" FOREIGN KEY ("contestSessionId") REFERENCES "ContestSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
