-- CreateTable
CREATE TABLE "sync_ops" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "opId" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_ops_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sync_ops_userId_opId_key" ON "sync_ops"("userId", "opId");

-- AddForeignKey
ALTER TABLE "sync_ops" ADD CONSTRAINT "sync_ops_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
