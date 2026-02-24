-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_HookEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projectId" TEXT NOT NULL,
    "missionId" TEXT,
    "eventType" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "toolName" TEXT,
    "status" TEXT NOT NULL,
    "durationMs" INTEGER,
    "summary" TEXT NOT NULL,
    "payload" TEXT NOT NULL DEFAULT '{}',
    "correlationId" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HookEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HookEvent_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_HookEvent" ("agentName", "correlationId", "durationMs", "eventType", "id", "missionId", "payload", "projectId", "status", "summary", "timestamp", "toolName") SELECT "agentName", "correlationId", "durationMs", "eventType", "id", "missionId", "payload", "projectId", "status", "summary", "timestamp", "toolName" FROM "HookEvent";
DROP TABLE "HookEvent";
ALTER TABLE "new_HookEvent" RENAME TO "HookEvent";
CREATE INDEX "HookEvent_projectId_idx" ON "HookEvent"("projectId");
CREATE INDEX "HookEvent_missionId_idx" ON "HookEvent"("missionId");
CREATE INDEX "HookEvent_timestamp_idx" ON "HookEvent"("timestamp");
CREATE INDEX "HookEvent_agentName_idx" ON "HookEvent"("agentName");
CREATE UNIQUE INDEX "HookEvent_correlationId_eventType_key" ON "HookEvent"("correlationId", "eventType");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
