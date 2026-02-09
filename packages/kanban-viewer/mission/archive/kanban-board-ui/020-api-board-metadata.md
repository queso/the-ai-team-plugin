---
id: "020"
title: "API route for board metadata"
type: "feature"
status: "pending"
dependencies: ["001", "010"]
parallel_group: "api-layer"
rejection_count: 0
outputs:
  types: "src/app/api/board/route.ts"
  test: "src/__tests__/api-board.test.ts"
  impl: "src/app/api/board/route.ts"
---

## Objective

Create Next.js API route to fetch board.json metadata including mission info, WIP limits, phases, agents, and stats.

## Acceptance Criteria

- [ ] GET /api/board returns BoardMetadata JSON response
- [ ] Returns 200 status on success
- [ ] Returns 500 status with error message on failure
- [ ] Includes proper Content-Type: application/json header
- [ ] Handles missing board.json with sensible defaults
- [ ] Uses board-service to read data

## Context

This is the primary endpoint for loading board state. The UI calls this on initial load.

Response format matches BoardMetadata type:
```typescript
{
  mission: {
    name: string;
    started_at: string;
    status: 'active' | 'paused' | 'blocked';
  };
  wip_limits: Record<string, number>;
  phases: Record<string, string[]>;
  assignments: Record<string, Assignment>;
  agents: Record<string, AgentStatus>;
  stats: BoardStats;
  last_updated: string;
}
```

Next.js App Router format:
```typescript
// src/app/api/board/route.ts
export async function GET() {
  return Response.json(data);
}
```
