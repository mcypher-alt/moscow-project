ALTER TYPE "IncidentStatus" ADD VALUE 'RESOLVED';
CREATE TABLE "RepairDraft" (
  "id" TEXT NOT NULL,
  "systemObjectId" INTEGER NOT NULL,
  "userId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "recommendationVersion" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RepairDraft_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RepairDraft_object_fkey" FOREIGN KEY ("systemObjectId") REFERENCES "SystemObject"("id") ON DELETE RESTRICT,
  CONSTRAINT "RepairDraft_user_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT
);
CREATE INDEX "RepairDraft_systemObjectId_createdAt_idx" ON "RepairDraft"("systemObjectId", "createdAt");
