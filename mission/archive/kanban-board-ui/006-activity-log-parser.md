---
id: "006"
title: "Activity log parser"
type: "feature"
status: "pending"
dependencies: ["001"]
parallel_group: "data-layer"
rejection_count: 0
outputs:
  types: "src/lib/activity-log.ts"
  test: "src/__tests__/activity-log.test.ts"
  impl: "src/lib/activity-log.ts"
---

## Objective

Create utility functions to parse activity.log entries for the Live Feed panel display.

## Acceptance Criteria

- [ ] parseLogEntry function extracts timestamp, agent, and message from log line
- [ ] Detects special prefixes: APPROVED, REJECTED, ALERT
- [ ] Returns structured LogEntry object with highlight type
- [ ] parseLogFile function parses entire log file into array of entries
- [ ] Handles malformed log lines gracefully (skip or return raw)
- [ ] Supports reading last N entries for initial load

## Context

Log format from PRD:
```
2026-01-15T10:42:15Z [B.A.] Implementing JWT token refresh logic
2026-01-15T10:41:40Z [Lynch] APPROVED 006-database-schema
2026-01-15T10:41:00Z [Hannibal] ALERT: Item 024 requires human input
```

Format: `{ISO timestamp} [{Agent}] {Action message}`

Special prefixes for highlighting:
- APPROVED - Green highlight
- REJECTED - Red highlight
- ALERT: - Yellow/warning highlight

LogEntry structure:
```typescript
interface LogEntry {
  timestamp: string;
  agent: string;
  message: string;
  highlightType?: 'approved' | 'rejected' | 'alert';
}
```
