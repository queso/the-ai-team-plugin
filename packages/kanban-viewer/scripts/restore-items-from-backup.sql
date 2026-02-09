-- Restore items from backup after stage harmonization
-- Run with: sqlite3 prisma/data/ateam.db < scripts/restore-items-from-backup.sql

-- Clear current items (they'll be stale after stage changes)
DELETE FROM ItemDependency;
DELETE FROM WorkLog;
DELETE FROM AgentClaim;
DELETE FROM Item;

-- Restore items with stage mapping (old 6 stages -> new 8 stages)
INSERT INTO Item (
  id, title, description, type, priority, stageId,
  assignedAgent, rejectionCount, createdAt, updatedAt, completedAt, archivedAt
)
SELECT
  id, title, description, type, priority,
  CASE stageId
    WHEN 'backlog' THEN 'briefings'
    WHEN 'in_progress' THEN 'implementing'  -- default for unmapped in_progress
    ELSE stageId  -- ready, review, done, blocked stay same
  END as stageId,
  assignedAgent, rejectionCount, createdAt, updatedAt, completedAt, archivedAt
FROM Item_backup;

-- Restore dependencies
INSERT INTO ItemDependency (id, itemId, dependsOnId)
SELECT id, itemId, dependsOnId FROM ItemDependency_backup;

-- Verify restore
SELECT 'Restored items by stage:';
SELECT stageId, COUNT(*) as count FROM Item GROUP BY stageId ORDER BY stageId;
SELECT '';
SELECT 'Restored dependencies: ' || COUNT(*) as count FROM ItemDependency;
