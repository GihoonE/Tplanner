ALTER TABLE "Session"
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX "Session_studentId_start_end_idx" ON "Session"("studentId", "start", "end");

CREATE TABLE "SessionBatchCreateRequest" (
  "key" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "response" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SessionBatchCreateRequest_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "SessionBatchCreateRequest_userId_createdAt_idx"
ON "SessionBatchCreateRequest"("userId", "createdAt");
