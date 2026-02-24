/*
  Warnings:

  - The primary key for the `AgentClaim` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `projectId` to the `ActivityLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id` to the `AgentClaim` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectId` to the `Item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectId` to the `Mission` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "HookEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projectId" TEXT NOT NULL,
    "missionId" TEXT,
    "eventType" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "toolName" TEXT,
    "status" TEXT NOT NULL,
    "durationMs" INTEGER,
    "summary" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "correlationId" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HookEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HookEvent_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ActivityLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "missionId" TEXT,
    "projectId" TEXT NOT NULL,
    "agent" TEXT,
    "message" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'info',
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ActivityLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ActivityLog" ("agent", "id", "level", "message", "missionId", "timestamp") SELECT "agent", "id", "level", "message", "missionId", "timestamp" FROM "ActivityLog";
DROP TABLE "ActivityLog";
ALTER TABLE "new_ActivityLog" RENAME TO "ActivityLog";
CREATE INDEX "ActivityLog_projectId_idx" ON "ActivityLog"("projectId");
CREATE TABLE "new_AgentClaim" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "agentName" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "claimedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentClaim_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AgentClaim" ("agentName", "claimedAt", "itemId") SELECT "agentName", "claimedAt", "itemId" FROM "AgentClaim";
DROP TABLE "AgentClaim";
ALTER TABLE "new_AgentClaim" RENAME TO "AgentClaim";
CREATE UNIQUE INDEX "AgentClaim_itemId_key" ON "AgentClaim"("itemId");
CREATE INDEX "AgentClaim_agentName_idx" ON "AgentClaim"("agentName");
CREATE TABLE "new_Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "assignedAgent" TEXT,
    "rejectionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "archivedAt" DATETIME,
    "outputTest" TEXT,
    "outputImpl" TEXT,
    "outputTypes" TEXT,
    CONSTRAINT "Item_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Item_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Item" ("archivedAt", "assignedAgent", "completedAt", "createdAt", "description", "id", "priority", "rejectionCount", "stageId", "title", "type", "updatedAt") SELECT "archivedAt", "assignedAgent", "completedAt", "createdAt", "description", "id", "priority", "rejectionCount", "stageId", "title", "type", "updatedAt" FROM "Item";
DROP TABLE "Item";
ALTER TABLE "new_Item" RENAME TO "Item";
CREATE INDEX "Item_stageId_idx" ON "Item"("stageId");
CREATE INDEX "Item_archivedAt_idx" ON "Item"("archivedAt");
CREATE INDEX "Item_assignedAgent_idx" ON "Item"("assignedAgent");
CREATE INDEX "Item_projectId_idx" ON "Item"("projectId");
CREATE TABLE "new_Mission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "prdPath" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "archivedAt" DATETIME,
    CONSTRAINT "Mission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Mission" ("archivedAt", "completedAt", "id", "name", "prdPath", "startedAt", "state") SELECT "archivedAt", "completedAt", "id", "name", "prdPath", "startedAt", "state" FROM "Mission";
DROP TABLE "Mission";
ALTER TABLE "new_Mission" RENAME TO "Mission";
CREATE INDEX "Mission_archivedAt_idx" ON "Mission"("archivedAt");
CREATE INDEX "Mission_projectId_idx" ON "Mission"("projectId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "HookEvent_projectId_idx" ON "HookEvent"("projectId");

-- CreateIndex
CREATE INDEX "HookEvent_missionId_idx" ON "HookEvent"("missionId");

-- CreateIndex
CREATE INDEX "HookEvent_timestamp_idx" ON "HookEvent"("timestamp");

-- CreateIndex
CREATE INDEX "HookEvent_agentName_idx" ON "HookEvent"("agentName");

-- CreateIndex
CREATE UNIQUE INDEX "HookEvent_correlationId_eventType_key" ON "HookEvent"("correlationId", "eventType");
