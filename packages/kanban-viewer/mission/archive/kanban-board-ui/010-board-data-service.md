---
id: "010"
title: "Board data service for filesystem access"
type: "feature"
status: "pending"
dependencies: ["001", "002", "003"]
parallel_group: "data-layer"
rejection_count: 0
outputs:
  types: "src/services/board-service.ts"
  test: "src/__tests__/board-service.test.ts"
  impl: "src/services/board-service.ts"
---

## Objective

Create a server-side service to read board data from the filesystem including board.json, work items from stage folders, and activity.log.

## Acceptance Criteria

- [ ] getBoardMetadata function reads and parses board.json
- [ ] getAllWorkItems function reads all .md files from all stage folders
- [ ] getWorkItemsByStage function reads items from a specific stage folder
- [ ] getWorkItemById function finds and reads a specific work item
- [ ] getActivityLog function reads and parses activity.log
- [ ] Handles missing files gracefully (return defaults or null)
- [ ] Handles malformed files gracefully (skip bad items, continue)
- [ ] Uses Node.js fs/promises for async file operations

## Context

The board service is the data access layer for all API routes. It reads from:

```
mission/
  board.json           # Board metadata
  activity.log         # Live feed entries
  briefings/*.md       # Work items in briefings stage
  ready/*.md           # Work items in ready stage
  testing/*.md         # etc.
  implementing/*.md
  review/*.md
  done/*.md
  blocked/*.md
```

The service should:
1. Parse board.json using JSON.parse
2. Parse .md files using the parseWorkItem function from 002
3. Detect stage from file path using getStageFromPath from 003
4. Handle errors without crashing (log and continue)
