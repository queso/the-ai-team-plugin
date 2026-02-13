# PRD 014: Bug Fixes and Refinements for SQLite API Implementation

## Executive Summary

This PRD documents issues found in the PRD 013 implementation and the required fixes.

### Primary Fix: Stage Name Harmonization

**Problem:** The API/database uses simplified stage names (`backlog`, `in_progress`) while the UI expects the original filesystem stage names (`briefings`, `testing`, `implementing`, `probing`). This mismatch led to the creation of `api-transform.ts` - a bandaid transformation layer.

**Solution:** Update the API and database to use the original stage names. The canonical stages are:

| Stage | Description | Agent |
|-------|-------------|-------|
| `briefings` | Work items not yet started | - |
| `ready` | Items ready for work | - |
| `probing` | Items being investigated | Amy |
| `testing` | Items being tested | Murdock |
| `implementing` | Items being built | B.A. |
| `review` | Items under review | Lynch |
| `done` | Completed items | - |
| `blocked` | Items needing human input | - |

**Changes Required:**
1. Update `src/types/board.ts` - Change `StageId` type to use original names
2. Update `prisma/schema.prisma` - Update Stage seed data
3. Update `src/lib/validation.ts` - Fix transition matrix with correct stage names
4. Update all API routes - Replace `backlog` → `briefings`, `in_progress` → `implementing`
5. Update `src/app/page.tsx` - Use API types directly (no transformation)
6. Delete `src/lib/api-transform.ts` - Remove the bandaid

**MCP Server:** Must conform to these stage names when calling the API.

---

## SSE and E2E Review

### Overview
This section documents the review of the SSE (Server-Sent Events) endpoint and E2E regression test script for PRD 013 implementation. The review focuses on correctness, resource management, error handling, robustness, and test coverage.

---

## Critical Issues (Priority 1)

### 1. SSE Activity Log Tracking Uses ID-Based Comparison But Creates Race Condition
**File:** `/Users/josh/Code/kanban-viewer/src/app/api/board/events/route.ts` (lines 248-249, 375-386)

**Issue:** The endpoint tracks activity log entries by ID (`lastActivityLogId`), but this creates a race condition when multiple activity log entries are created between poll cycles:

- Line 249: `let lastActivityLogId = 0;` initializes tracker
- Lines 375-386: Filters new logs by `log.id > lastActivityLogId`

**Problem:** If two entries are created with IDs 10 and 11, but only ID 10 is retrieved in poll cycle 1, the system will still emit ID 10. However, if the client is slow to process, and both entries exist in cycle 2, the code correctly emits only ID 11. The real issue is on line 385: `lastActivityLogId = log.id;` updates inside the loop, so if an error occurs while processing a log entry, the tracking position can become inconsistent.

**Fix Needed:** Move the `lastActivityLogId` update outside the loop (after all entries are successfully processed) or wrap in try-catch to ensure atomicity.

```typescript
// Current (line 383-386):
for (const log of newLogs) {
  pendingEvents.push(createActivityEntryAddedEvent(log));
  lastActivityLogId = log.id;  // ← Updates per-entry, not atomic
}

// Suggested fix:
for (const log of newLogs) {
  pendingEvents.push(createActivityEntryAddedEvent(log));
}
if (newLogs.length > 0) {
  lastActivityLogId = newLogs[newLogs.length - 1].id;
}
```

---

### 2. Stage Name Mapping in SSE Endpoint is Incomplete and Creates Type Mismatch
**File:** `/Users/josh/Code/kanban-viewer/src/app/api/board/events/route.ts` (lines 92-107)

**Issue:** The `dbItemToWorkItem()` function maps database stage names to frontend stage names, but:

1. Database schema uses `backlog`, `ready`, `in_progress`, `review`, `done`, `blocked` (from Prisma schema)
2. Frontend expects `briefings`, `ready`, `testing`, `implementing`, `review`, `probing`, `done`, `blocked` (from types/index.ts, line 98)
3. The mapping includes duplicates and incomplete mappings:

```typescript
// Lines 94-105 - Current mapping:
const stageMapping: Record<string, Stage> = {
  backlog: 'briefings',           // ✓ Database → Frontend
  ready: 'ready',                 // ✓ Correct
  in_progress: 'implementing',    // ✓ Database → Frontend
  testing: 'testing',             // ❌ Database has no 'testing' stage
  review: 'review',               // ✓ Correct
  done: 'done',                   // ✓ Correct
  blocked: 'blocked',             // ✓ Correct
  briefings: 'briefings',         // ❌ Shouldn't receive 'briefings' from DB
  implementing: 'implementing',   // ❌ Shouldn't receive 'implementing' from DB
  probing: 'probing',             // ❌ Shouldn't receive 'probing' from DB
};
```

**Problem:** The database schema does NOT have `testing`, `probing`, or `implementing` stages - it has `in_progress`. The frontend also appears to support a `probing` stage that doesn't exist in the database. This causes:
- Incorrect event data sent to clients
- Frontend may not recognize certain stage transitions
- Stage mappings are hardcoded and fragile

**Impact:** Real-time UI updates may show items in wrong stages or not update at all when stages don't match expected frontend values.

**Fix Needed:**
1. Reconcile database schema with frontend stage definitions - either update the database to support separate test/probe/implement stages, or update frontend to use database stage names directly
2. Remove the bidirectional mappings (lines 102-104) that shouldn't happen
3. Add validation/error logging when unmapped stages are encountered

```typescript
// Suggested approach - use only legitimate mappings:
const stageMapping: Record<string, Stage> = {
  backlog: 'briefings',
  ready: 'ready',
  in_progress: 'implementing',  // ← Single mapping, no reverse
  review: 'review',
  done: 'done',
  blocked: 'blocked',
} as const;

// Validate:
if (!(item.stageId in stageMapping)) {
  console.error(`Unknown stage in database: ${item.stageId}`);
}
```

---

### 3. E2E Regression Script Does Not Handle Async Errors in Cleanup Phase
**File:** `/Users/josh/Code/kanban-viewer/scripts/e2e-regression.ts` (lines 293-295)

**Issue:** The cleanup phase calls `archivePreviousMission()` and `cleanupStaleClaims()` without awaiting error handling:

```typescript
// Lines 293-295:
log('Cleaning up from previous runs...');
await archivePreviousMission();
await cleanupStaleClaims();
```

**Problem:** If `archivePreviousMission()` throws an error OTHER than "no active mission", or if `cleanupStaleClaims()` fails, the script immediately halts. However, looking at lines 233-241 (`archivePreviousMission()`), errors are caught and logged. But `cleanupStaleClaims()` (lines 248-260) doesn't catch errors - it rethrows them:

```typescript
// Lines 253-258 - cleanupStaleClaims has no error handling:
for (const item of inProgressItems) {
  try {
    await apiRequest('POST', '/api/board/release', { itemId: item.id });
  } catch {
    // Item had no claim - that's fine  ← Only ignores specific error
  }
}
```

Actually, that's fine for individual items, but if `getBoardState()` on line 249 fails, it will propagate up and crash the script.

**Real Issue:** There's inconsistent error handling - `archivePreviousMission()` wraps entire operation in try-catch but `cleanupStaleClaims()` only wraps individual item releases. If the API is unavailable, script fails immediately.

**Fix Needed:** Wrap both cleanup operations in try-catch:

```typescript
try {
  log('Cleaning up from previous runs...');
  await archivePreviousMission();
  await cleanupStaleClaims();
} catch (err) {
  warn(`Cleanup encountered error: ${err instanceof Error ? err.message : String(err)}. Continuing...`);
}
```

---

### 4. E2E Script Has No Connection Verification Before Test Starts
**File:** `/Users/josh/Code/kanban-viewer/scripts/e2e-regression.ts` (lines 282-305)

**Issue:** The script immediately creates a mission without verifying the API is reachable. If the server isn't running or API is unavailable, the script will fail deep in execution.

**Impact:** Poor user experience - users must wait through setup before realizing the server isn't available.

**Fix Needed:** Add a health check before initialization:

```typescript
async function main() {
  console.log('========================================');
  console.log('  E2E REGRESSION TEST (API-BASED)');
  console.log('========================================');
  console.log('');

  // Add health check
  try {
    await apiRequest('GET', '/api/board');
  } catch (err) {
    error(`Failed to connect to API at ${API_BASE}`);
    error(`Is the server running? Start with: npm run dev`);
    process.exit(1);
  }

  try {
    log('Cleaning up from previous runs...');
    // ... rest of execution
  }
}
```

---

## Recommended Improvements (Priority 2)

### 5. SSE Endpoint Doesn't Limit Memory Usage During Long Connections
**File:** `/Users/josh/Code/kanban-viewer/src/app/api/board/events/route.ts` (lines 248-249)

**Issue:** The endpoint maintains `trackedItems` Map indefinitely:

```typescript
// Lines 248-249:
const trackedItems = new Map<string, TrackedItemState>();
```

For long-running connections (e.g., dashboard left open for days), this Map will grow without bound if items are frequently created and deleted. While items are deleted from the map on line 342 when removed from database, archival doesn't remove them - the `archivedAt` field exists on the schema but isn't checked.

**Risk:** Memory leak if client stays connected and many items are archived without being deleted.

**Suggestion:** Periodically clean up archived items:

```typescript
// Around line 335, after checking for deletions:
if (!isFirstPoll) {
  for (const [itemId, state] of trackedItems) {
    // Assuming archived items have null stageId or are removed from DB
    if (!currentItemIds.has(itemId)) {
      trackedItems.delete(itemId);
    }
  }
}
```

Alternatively, set a maximum Map size or periodically reset for very long connections.

---

### 6. Missing Error Recovery for Broken Database Connections
**File:** `/Users/josh/Code/kanban-viewer/src/app/api/board/events/route.ts` (lines 276-398)

**Issue:** Database errors are logged but stream continues indefinitely trying to poll. If the database connection dies permanently, the stream becomes a "zombie" that:
- Continues polling in circles
- Never emits events
- Wastes server resources

```typescript
// Lines 394-397:
} catch (error) {
  // Log error but continue polling
  console.error('SSE poll error:', error);
}
```

**Suggestion:** Implement circuit breaker or exponential backoff:

```typescript
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 5;

const poll = async () => {
  if (isCancelled) return;

  try {
    // ... poll logic ...
    consecutiveErrors = 0; // Reset on success
  } catch (error) {
    consecutiveErrors++;
    console.error(`SSE poll error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, error);

    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      console.error('SSE endpoint: Too many consecutive errors, closing connection');
      controller.close();
      isCancelled = true;
      if (pollInterval) clearInterval(pollInterval);
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    }
  }
};
```

---

### 7. E2E Script Has Long Hardcoded Delays Without Clear Purpose
**File:** `/Users/josh/Code/kanban-viewer/scripts/e2e-regression.ts` (lines 22-23)

**Issue:** Default delays are hardcoded as 2 seconds between actions:

```typescript
const DELAY = parseInt(process.env.DELAY || '2000', 10);
```

While configurable via environment, the rationale is unclear. Some delays in the script are:
- Line 455: `await sleep(1000);` between parallel agents (1 second)
- Line 467: `await sleep(500);` between stopping agents (500ms)
- Line 475: `await sleep(1000);` between agent starts (1 second)
- Most other transitions: 2 seconds via `DELAY`

**Problem:** Inconsistent delays make script harder to tune and may hide race conditions that only appear at certain timing windows.

**Suggestion:**
1. Document why each delay exists
2. Make them individually configurable
3. Consider using event-based waiting instead of time-based

```typescript
// Instead of fixed delays, wait for state changes:
async function waitForItemInStage(itemId: string, stage: string): Promise<void> {
  const maxWaitMs = 5000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const board = await getBoardState();
    const item = board.items.find(i => i.id === itemId);
    if (item?.stageId === stage) return;
    await sleep(100);
  }
  throw new Error(`Timeout waiting for ${itemId} to reach ${stage}`);
}
```

---

### 8. SSE Event Types Don't Match All Supported Events
**File:** `/Users/josh/Code/kanban-viewer/src/app/api/board/events/route.ts` (comments) vs types

**Issue:** The file header (lines 5-12) claims to emit these events:
- `item-added`
- `item-moved`
- `item-updated`
- `item-deleted`
- `board-updated`
- `activity-entry-added`

But the types in `/Users/josh/Code/kanban-viewer/src/types/index.ts` (lines 222-237) define many more:
- `mission-completed` - ✓ implemented (lines 213-224)
- `final-review-started` - ✗ NOT implemented
- `final-review-complete` - ✗ NOT implemented
- `post-checks-started` - ✗ NOT implemented
- `post-check-update` - ✗ NOT implemented
- `post-checks-complete` - ✗ NOT implemented
- `documentation-started` - ✗ NOT implemented
- `documentation-complete` - ✗ NOT implemented

**Problem:** Frontend may listen for events that the endpoint never emits. This breaks client code waiting for these events.

**Suggestion:** Either:
1. Implement the missing events in the SSE endpoint
2. Document that these events are not supported in the current implementation
3. Remove them from the types if they're not needed

---

## Missing Test Coverage (Priority 2)

### 9. No Tests for Stage Mapping Correctness
**File:** `/Users/josh/Code/kanban-viewer/src/__tests__/api/board/events.test.ts`

**Issue:** The test file doesn't verify stage name conversions are correct. The test mocks return database stage names directly, but real execution goes through `dbItemToWorkItem()` which performs stage mapping.

**Missing Test:**
```typescript
describe('stage mapping', () => {
  it('should map all database stages to valid frontend stages', () => {
    const dbStages = ['backlog', 'ready', 'in_progress', 'review', 'done', 'blocked'];
    const frontendStages = ['briefings', 'ready', 'implementing', 'review', 'done', 'blocked'];

    dbStages.forEach((dbStage, i) => {
      const mockItem = { ...mockItems[0], stageId: dbStage };
      const workItem = dbItemToWorkItem(mockItem as DbItem);
      expect(workItem.stage).toBe(frontendStages[i]);
    });
  });

  it('should not emit events with unknown stages', async () => {
    // Create item with unknown stage
    const weirdItem = { ...mockItems[0], stageId: 'unknown_stage' };
    mockPrisma.item.findMany.mockResolvedValue([weirdItem]);
    // Should emit warning and not crash
  });
});
```

---

### 10. No Tests for E2E Script Failure Paths
**File:** `/Users/josh/Code/kanban-viewer/scripts/e2e-regression.ts`

**Issue:** Script has no unit tests. All testing is manual/runtime. If API endpoints change, script failures won't be caught until runtime.

**Missing Tests:**
- API connection failure handling
- Partial cleanup failure recovery
- Invalid response format handling
- Network timeout recovery
- Mission archival failure
- Item creation with circular dependencies

**Suggestion:** Create `/Users/josh/Code/kanban-viewer/src/__tests__/e2e-regression.test.ts` with mocked API requests.

---

### 11. No Tests for Long-Running SSE Connection Cleanup
**File:** `/Users/josh/Code/kanban-viewer/src/__tests__/api/board/events.test.ts`

**Issue:** While there are cleanup tests (lines 539-577), they only verify that polling stops. Missing tests:
- Heartbeat continues after poll errors
- Multiple rapid client connections/disconnections don't leak resources
- Archived items don't accumulate in memory indefinitely

**Suggestion:**
```typescript
describe('long-running connection cleanup', () => {
  it('should not grow memory unbounded with many item additions/archival', async () => {
    // Create and delete 1000 items over multiple poll cycles
    // Verify trackedItems Map doesn't grow
  });

  it('should clean up heartbeat interval on cancel', async () => {
    // Verify clearInterval is called for heartbeat
  });
});
```

---

## Suggestions (Priority 3)

### 12. Activity Log Filtering Should Use Timestamp, Not ID
**File:** `/Users/josh/Code/kanban-viewer/src/app/api/board/events/route.ts` (lines 375-386)

**Current Approach:** Tracks by ID (`lastActivityLogId = 0`)

**Issue:** IDs are generated by the database and may have gaps if entries are deleted. Timestamps are more reliable for detecting "new" entries.

**Suggestion:** Change to timestamp-based tracking:

```typescript
let lastActivityLogTimestamp: Date | null = null;

// ... in poll function:
const newLogs = activityLogs.filter((log) =>
  !lastActivityLogTimestamp || log.timestamp > lastActivityLogTimestamp
);

if (newLogs.length > 0) {
  lastActivityLogTimestamp = newLogs[newLogs.length - 1].timestamp;
  for (const log of newLogs) {
    pendingEvents.push(createActivityEntryAddedEvent(log));
  }
}
```

---

### 13. SSE Endpoint Should Set Stricter CORS Headers
**File:** `/Users/josh/Code/kanban-viewer/src/app/api/board/events/route.ts` (lines 432-438)

**Current:** No CORS headers set. Next.js defaults allow all.

**Suggestion:** Add explicit CORS headers for security:

```typescript
return new Response(stream, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || 'localhost:3000',
    'Access-Control-Allow-Credentials': 'true',
  },
});
```

---

### 14. E2E Script Should Support Dry-Run Mode
**File:** `/Users/josh/Code/kanban-viewer/scripts/e2e-regression.ts`

**Suggestion:** Add `--dry-run` flag that plans operations without executing:

```typescript
const DRY_RUN = process.argv.includes('--dry-run');

async function apiRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (DRY_RUN) {
    log(`[DRY RUN] ${method} ${path}${body ? ` ${JSON.stringify(body)}` : ''}`);
    return { success: true, data: {} } as T;
  }
  // ... actual request
}
```

---

## Summary

### Issue Distribution
- **Critical Issues:** 4 (Stage mapping, Activity log race condition, Async error handling, No connection verification)
- **Important Issues:** 4 (Memory management, Error recovery, Inconsistent delays, Event type mismatch)
- **Missing Tests:** 3 (Stage mapping, E2E failures, Long-running cleanup)
- **Nice-to-haves:** 3 (Timestamp tracking, CORS headers, Dry-run mode)

### High-Impact Fixes Required
1. Fix stage name mapping to prevent incorrect event data (Issue #2)
2. Reconcile database schema stage names with frontend expectations
3. Add proper error handling and circuit breaker for SSE (Issues #3, #6)
4. Add API health check to E2E script (Issue #4)
5. Atomicize activity log position tracking (Issue #1)

### Recommended Next Steps
1. Fix all Priority 1 issues before next deployment
2. Add comprehensive tests for stage mapping and E2E error paths
3. Implement memory management for long-lived SSE connections
4. Document stage architecture decision (database vs frontend stage names)

---

## Types Review

### Summary
The PRD 013 type definitions are well-structured and properly organized into domain modules. However, there are several critical issues with type inconsistencies, semantic conflicts with existing code, and missing type constraints that require attention.

---

## Critical Issues (Priority 1)

### 1. AgentName Mismatch: 'BA' vs 'B.A.' Inconsistency

**File:** `/Users/josh/Code/kanban-viewer/src/types/agent.ts` (line 15)
**Conflicting:** `/Users/josh/Code/kanban-viewer/src/types/index.ts` (line 82)

The new API layer uses `'BA'` as the AgentName:
```typescript
// src/types/agent.ts:15
export type AgentName =
  | 'Hannibal'
  | 'Face'
  | 'Murdock'
  | 'BA'           // ← API version
  | 'Lynch'
  | 'Amy'
  | 'Tawnia';
```

But the existing codebase uses `'B.A.'` with a dot:
```typescript
// src/types/index.ts:82
export type AgentName = 'Hannibal' | 'Face' | 'Murdock' | 'B.A.' | 'Amy' | 'Lynch' | 'Tawnia';
```

**Impact:** This will cause runtime errors and type mismatches when API clients pass `'BA'` to components expecting `'B.A.'`. The api-transform.ts cannot handle this conversion.

**Recommendation:**
- Update src/types/agent.ts to use `'B.A.'` (with dot) to match existing code and the A-Team branding
- OR update all existing UI code to expect `'BA'` (breaking change)
- Preferably choose the first option for consistency with existing mission/activity log files

---

### 2. Stage Name Mismatch: Database vs UI Naming

**File:** `/Users/josh/Code/kanban-viewer/src/types/board.ts` (line 15-21)
**Conflict:** `/Users/josh/Code/kanban-viewer/src/types/index.ts` (line 98)

The API layer defines stages as:
```typescript
// src/types/board.ts
export type StageId =
  | 'backlog'
  | 'ready'
  | 'in_progress'   // ← API database names
  | 'review'
  | 'done'
  | 'blocked';
```

Existing UI code expects:
```typescript
// src/types/index.ts:98
export type Stage = 'briefings' | 'ready' | 'testing' | 'implementing' | 'review' | 'probing' | 'done' | 'blocked';
```

**Missing Stages in API:** The API layer doesn't define stages for `'testing'`, `'probing'`, or `'implementing'` which are used in existing UI filters and components.

**Impact:**
- `/Users/josh/Code/kanban-viewer/src/lib/api-transform.ts` (lines 24-31) handles the mapping, but it's incomplete
- If UI receives API data with `'in_progress'`, it transforms to `'implementing'`
- But there's no mapping for what should map to `'testing'` or `'probing'`
- The stage defaults in buildWipLimitsFromStages (lines 123-129) hardcode 'testing' and 'probing' with defaults, creating UI-specific stage names from API data

**Recommendation:**
- Clarify the canonical stage list: Are there 6 stages (API) or 8 stages (UI)?
- If API is canonical, update TypeFilter in src/types/index.ts (line 85) to remove 'test' and 'interface'
- Update stage transformation logic to be complete and documented
- Add missing stage definitions to Prisma schema if they should exist in the database

---

### 3. ActivityLogEntry Missing Alignment with Existing LogEntry

**File:** `/Users/josh/Code/kanban-viewer/src/types/api.ts` (lines 285-292)
**Related:** `/Users/josh/Code/kanban-viewer/src/lib/activity-log.ts` (line 11-16)

The API ActivityLogEntry has a `level` property (info/warn/error):
```typescript
// src/types/api.ts
export interface ActivityLogEntry {
  id: number;
  missionId: string | null;
  agent: string | null;
  message: string;
  level: 'info' | 'warn' | 'error';
  timestamp: Date;
}
```

But existing LogEntry from activity-log.ts has `highlightType`:
```typescript
// src/lib/activity-log.ts
export interface LogEntry {
  timestamp: string;
  agent: string;
  message: string;
  highlightType?: 'approved' | 'rejected' | 'alert' | 'committed';
}
```

**Issues:**
- These are semantically different (one uses severity levels, one uses highlight categories)
- ActivityLogEntry.timestamp is Date, but LogEntry.timestamp is string
- LogEntry has no `id` or `missionId`, making it incompatible with database model
- src/types/index.ts re-exports LogEntry (line 240) but also exports ActivityLogEntry via api.ts, creating confusion

**Recommendation:**
- Keep ActivityLogEntry as the database model representation
- Update LogEntry in activity-log.ts to support both existing highlighting and new level field
- Document which is used where: LogEntry for markdown file parsing, ActivityLogEntry for API/database responses
- Or consolidate to a single type with optional fields

---

### 4. Item Type Mismatch: API vs UI Frontmatter Types

**File:** `/Users/josh/Code/kanban-viewer/src/types/item.ts` (line 13)
**Conflict:** `/Users/josh/Code/kanban-viewer/src/types/index.ts` (line 101, 104)

API defines:
```typescript
// src/types/item.ts
export type ItemType = 'feature' | 'bug' | 'chore' | 'spike';
```

UI/existing code expects:
```typescript
// src/types/index.ts:101
export type WorkItemType = 'implementation' | 'interface' | 'integration' | 'test';
export type WorkItemFrontmatterType = 'feature' | 'bug' | 'enhancement' | 'task';
```

The transformation in api-transform.ts (lines 36-41) maps:
```typescript
const API_TYPE_TO_FRONTMATTER_TYPE: Record<string, WorkItemFrontmatterType> = {
  feature: 'feature',
  bug: 'bug',
  chore: 'task',
  spike: 'enhancement',  // ← spike becomes enhancement
};
```

**Issue:** The mappings lose fidelity - 'spike' is not semantically equivalent to 'enhancement'. Also, there's a third type system (WorkItemType) that doesn't map to either, creating confusion about which types are actually used.

**Recommendation:**
- Decide on canonical item types and use consistently
- Document the transformation between API and UI types
- Update TypeFilter in index.ts (line 85) to align with canonical types

---

## Recommended Improvements (Priority 2)

### 5. Weak Type Safety in AgentClaim

**File:** `/Users/josh/Code/kanban-viewer/src/types/agent.ts` (lines 24-28)

The `agentName` field accepts `AgentName` type, but in practice gets cast from strings:
```typescript
// src/app/api/board/route.ts:90
agentName: claim.agentName as AgentName,
```

This casting bypasses type safety. The database might contain invalid agent names.

**Recommendation:**
- Add runtime validation that agent names match AgentName union
- Or constrain the database to only store valid values via unique foreign key constraints

---

### 6. ItemWithRelations Has Semantic Gap

**File:** `/Users/josh/Code/kanban-viewer/src/types/item.ts` (lines 56-59)

ItemWithRelations uses string arrays for dependencies:
```typescript
dependencies: string[];  // Item IDs as strings
workLogs: WorkLogEntry[];
```

This loses the semantic meaning - we don't know if dependencies are item IDs, stage IDs, or mission IDs. Other parts of the codebase might have different expectations.

**Recommendation:**
- Add a type alias for clarity: `type ItemId = string & { readonly __brand: 'ItemId' };`
- Or document that dependencies are always item IDs in format 'WI-NNN'
- Check that all code treating dependencies as strings understands the format

---

### 7. Missing Validation Constraints on API Types

**Files:** All in `/Users/josh/Code/kanban-viewer/src/types/`

The types don't capture business rules from PRD 013:
- Item IDs must be format 'WI-{NNN}'
- Mission IDs must be format 'M-{YYYYMMDD}-{NNN}'
- Title must be non-empty and ≤ 200 chars
- stageId transitions follow a specific matrix (not all transitions valid)
- rejectionCount >= 2 has special meaning

**Recommendation:**
- Consider branded types for IDs: `type ItemId = string & { readonly __itemId: true };`
- Document constraints in JSDoc comments
- Create a validation schema (Zod/io-ts) separate from types for runtime safety

---

### 8. WorkLogEntry Missing actionType Constraint

**File:** `/Users/josh/Code/kanban-viewer/src/types/item.ts` (lines 45-51)

WorkLogEntry accepts string agent names without verification against AgentName:
```typescript
agent: string;  // ← Not constrained to AgentName
action: WorkLogAction;
```

This allows storing invalid agent names in work logs.

**Recommendation:**
- Change `agent: AgentName` to constrain to valid agents
- Update all WorkLogEntry creations to use typed agents

---

### 9. Inconsistent Date Handling Across Types

**File:** Multiple locations

Some types use `Date`, others use `string` for timestamps:
- Item.createdAt: Date (src/types/item.ts:37)
- LogEntry.timestamp: string (src/lib/activity-log.ts:12)
- ActivityLogEntry.timestamp: Date (src/types/api.ts:291)

**Impact:** Serialization inconsistencies when sending JSON responses, manual conversions scattered through routes.

**Recommendation:**
- Standardize: API responses should use Date objects (Next.js handles serialization)
- Document that ISO string timestamps in activity logs are parsed to Date objects when loading

---

## Suggestions (Priority 3)

### 10. Missing Type Documentation

**All type files:** src/types/*.ts

Type definitions lack comprehensive JSDoc comments explaining:
- When each type is used (API request? Response? Database?)
- Constraints on values
- Relationships to other types

**Recommendation:**
Add comprehensive JSDoc to exported types:
```typescript
/**
 * Work item in any stage of the pipeline.
 *
 * @property id - Unique identifier in format 'WI-{NNN}', zero-padded
 * @property stageId - Current stage (backlog, ready, in_progress, review, done, blocked)
 * @property assignedAgent - Agent currently working on this item, or null if unassigned
 *
 * @see {@link ItemWithRelations} for items with full dependency and work log data
 * @see PRD 013 section 3.2 for data model specification
 */
export interface Item {
  // ...
}
```

---

### 11. ActivityLogEntry Type Duplication in index.ts

**File:** `/Users/josh/Code/kanban-viewer/src/types/index.ts` (lines 74, 240)

Both ActivityLogEntry and LogEntry are exported, creating ambiguity:
```typescript
ActivityLogEntry,  // line 74 - from api.ts
// ...
export type { LogEntry } from '../lib/activity-log';  // line 240
```

**Recommendation:**
- Consolidate to single entry type with clear purpose
- Or rename one to clarify: `ActivityDatabaseEntry` vs `ActivityLogFileEntry`
- Document when each should be used

---

### 12. StageId Union Type Is Large

**File:** `/Users/josh/Code/kanban-viewer/src/types/board.ts` (lines 15-21)

Repeated everywhere in code. Consider a type alias export for convenience.

**Recommendation:**
```typescript
// Optional: export common combinations
export type ActiveStageId = Exclude<StageId, 'done' | 'blocked'>;
export type ClaimableStageId = Extract<StageId, 'ready' | 'in_progress'>;
```

---

### 13. Missing Discriminated Union for API Responses

**File:** `/Users/josh/Code/kanban-viewer/src/types/api.ts` (lines 309-321)

Generic ApiResponse union is loose - handlers can't narrow types well:
```typescript
export type ApiResponse<T> = T | ApiError;
```

This forces type narrowing on each response handling.

**Recommendation:**
Use discriminated unions for better type narrowing:
```typescript
export type ApiResponse<T extends { data: unknown }> =
  | ({ success: true } & T)
  | ({ success: false; error: ApiErrorDetail });
```

Then handlers can narrow with discriminator: `if (response.success) { ... }`

---

## Existing Code Opportunities

### 14. Consolidate Mission Types

**Files:**
- src/types/mission.ts (API layer)
- src/types/index.ts lines 187-220 (UI layer Mission and related interfaces)

Both define Mission interface with different purposes. The UI version is more detailed with phase tracking.

**Recommendation:**
- Check if new Prisma mission/postcheck/documentation tables should extend TypeScript types
- Update api-transform.ts to handle transformation more completely
- Consider if PostChekcsStatus, DocumentationStatus, FinalReviewStatus belong in API types too

---

## Summary

The type system has three main issues preventing it from working cohesively:

1. **String literal mismatches** ('BA' vs 'B.A.', stage name differences) that will cause runtime errors
2. **Semantic overlap** (LogEntry vs ActivityLogEntry, multiple item type systems) that creates confusion
3. **Weak runtime safety** (string casts instead of constraints, optional fields that should be required)

**Recommended immediate actions:**
1. Fix AgentName to use 'B.A.' (lines 15 in agent.ts)
2. Consolidate stage naming - confirm if 6 or 8 stages are canonical
3. Merge LogEntry and ActivityLogEntry into single representation
4. Document item type mapping strategy between API and UI
5. Add runtime validation in API routes to catch type violations early

**Testing implications:**
- Add integration tests that verify API responses can be transformed to UI format without errors
- Add tests for type casting to ensure Prisma data matches API types
- Add validation tests to ensure database constraints enforce type safety

# Database Layer Review - PRD 013 Implementation

**Date:** 2026-01-22
**Reviewer:** Claude Code
**Scope:** Database connection handling, transaction safety, query efficiency, error handling, and type safety

---

## Executive Summary

The database layer implementation for PRD 013 (Kanban Viewer API + Storage Layer) demonstrates solid foundational work with proper singleton pattern usage, transaction safety in critical operations, and comprehensive error handling. However, there are several important issues that need attention:

**Critical Issues:** 2
**Important Issues:** 5
**Recommendations:** 4

Most issues are in the API route handlers rather than the core database infrastructure. The core components (`db.ts`, `validation.ts`, `errors.ts`, and `schema.prisma`) are well-structured.

---

## Database Layer Review

### 1. Connection Management

#### 1.1 Singleton Pattern Implementation - GOOD

**File:** `/Users/josh/Code/kanban-viewer/src/lib/db.ts`

The Prisma client singleton is properly implemented:
- Uses `globalThis` for development hot-reload safety (lines 12-14)
- Prevents connection exhaustion during Next.js dev mode
- Development mode logging configured appropriately (line 34)
- Conditional storage on `globalThis` only in development (lines 38-40)

**No issues found.** This implementation follows Prisma best practices.

#### 1.2 Database Path Resolution - GOOD

**File:** `/Users/josh/Code/kanban-viewer/src/lib/db.ts` (lines 20-24)

Uses absolute path resolution with `path.resolve()` to handle database file location consistently across platforms and dev/prod environments. The fallback to `./prisma/data/ateam.db` is appropriate.

**No issues found.**

#### 1.3 LibSQL Adapter Configuration - CONCERN

**File:** `/Users/josh/Code/kanban-viewer/src/lib/db.ts` (lines 9, 24)

Using `@prisma/adapter-libsql` for SQLite means the database uses LibSQL under the hood. This is fine, but be aware:
- Ensure the LibSQL library is installed and compatible with your target SQLite version
- LibSQL has specific locking behavior that differs from standard SQLite
- Test concurrent write scenarios thoroughly (this is mentioned in PRD as load test requirement)

**Status:** Watch point, not a blocker. See testing section below.

---

### 2. Transaction Safety

#### 2.1 Transaction Usage Pattern - GOOD with CRITICAL CAVEAT

**Files:**
- `/Users/josh/Code/kanban-viewer/src/app/api/agents/start/route.ts` (lines 234-268) - Good pattern
- `/Users/josh/Code/kanban-viewer/src/app/api/items/[id]/reject/route.ts` (lines 141-154) - Good pattern
- `/Users/josh/Code/kanban-viewer/src/app/api/missions/archive/route.ts` (lines 43-55) - Good pattern

These routes correctly use `prisma.$transaction()` to ensure atomicity for multi-step operations.

**Best practices observed:**
- Agent start uses async transaction wrapper (good for complex operations)
- Reject uses array syntax for simple operations (efficient)
- Archive uses array syntax for two-step operation

#### 2.2 CRITICAL ISSUE: Race Condition in Item Claim Flow

**File:** `/Users/josh/Code/kanban-viewer/src/app/api/board/claim/route.ts` (lines 179-190)

This operation is NOT transactional and has a race condition:

```typescript
// Lines 179-190 - NOT IN A TRANSACTION
const newClaim = await prisma.agentClaim.create({
  data: {
    agentName: body.agent,
    itemId: body.itemId,
  },
});

// Separate query - race condition window!
await prisma.item.update({
  where: { id: body.itemId },
  data: { assignedAgent: body.agent },
});
```

**Problem:** Between the two operations, another request could:
1. Create a conflicting claim for the same item
2. Claim another item for the same agent
3. The item could be moved to a non-claimable stage

**Impact:** Two agents could simultaneously claim the same item, violating the constraint that items are uniquely claimed.

**Fix:** Wrap both operations in a transaction:

```typescript
await prisma.$transaction(async (tx) => {
  const newClaim = await tx.agentClaim.create({
    data: { agentName: body.agent, itemId: body.itemId }
  });
  await tx.item.update({
    where: { id: body.itemId },
    data: { assignedAgent: body.agent }
  });
  return newClaim;
});
```

#### 2.3 CRITICAL ISSUE: Missing Transaction in Item Rejection

**File:** `/Users/josh/Code/kanban-viewer/src/app/api/items/[id]/reject/route.ts` (lines 103-114)

The item lookup excludes archived items, but there's no transaction wrapping the read-check-write sequence:

```typescript
// Line 104-114: READ
const existingItem = await prisma.item.findFirst({
  where: { id: itemId, archivedAt: null }
});

// Lines 141-154: WRITE (in transaction with worklog)
const [updatedItem] = await prisma.$transaction([
  prisma.item.update({ ... }),
  prisma.workLog.create({ ... })
]);
```

**Problem:** Between read and write, the item could:
- Be archived (violating the check)
- Be moved out of review stage (violating business rule)
- Have its rejection count changed

**Less severe than the claim issue** because the write is transactional, but the validation is stale.

**Fix:** Move the item lookup inside the transaction:

```typescript
const [updatedItem] = await prisma.$transaction([
  prisma.item.findFirst({ where: { id: itemId, archivedAt: null } }),
  // ... rest of transaction
]);
```

Or validate within the transaction and return validation errors.

---

### 3. Query Efficiency

#### 3.1 N+1 Query Pattern - ISSUE FOUND

**File:** `/Users/josh/Code/kanban-viewer/src/app/api/items/route.ts` (lines 206-223)

During POST item creation, dependencies are validated with individual queries:

```typescript
// Lines 206-212: INDIVIDUAL QUERIES FOR EACH DEPENDENCY
if (dependencies.length > 0) {
  for (const depId of dependencies) {
    const dep = await prisma.item.findUnique({ where: { id: depId } });
    if (!dep) {
      // error
    }
  }
```

**Problem:** If creating an item with 5 dependencies, this causes 5 separate database queries.

**Impact:** Minor for most cases (typically <5 deps), but inefficient at scale.

**Fix:** Use a single query with `findMany` and filter results:

```typescript
const deps = await prisma.item.findMany({
  where: { id: { in: dependencies } },
  select: { id: true }
});
const foundDepIds = new Set(deps.map(d => d.id));
const missing = dependencies.filter(id => !foundDepIds.has(id));
if (missing.length > 0) {
  // error with missing IDs
}
```

#### 3.2 Missing Indexes - ISSUE FOUND

**File:** `/Users/josh/Code/kanban-viewer/prisma/schema.prisma`

Several queries use filters on fields without indexes:

**Query patterns without indexes:**
1. `item.findMany({ where: { archivedAt: null } })` - Line 126 in `/src/app/api/items/route.ts`
2. `item.findMany({ where: { stageId } })` - Line 102 in `/src/app/api/items/route.ts`
3. `item.count({ where: { stageId } })` - Line 148-150 in `/src/app/api/board/move/route.ts`
4. `mission.findFirst({ where: { archivedAt: null } })` - Line 240 in `/src/app/api/items/route.ts`
5. `agentClaim.findFirst({ where: { agentName } })` - Line 139 in `/src/app/api/board/claim/route.ts`

**Recommendation:** Add indexes to schema:

```prisma
model Item {
  // ... existing fields

  @@index([stageId])
  @@index([archivedAt])
  @@index([assignedAgent])
}

model Mission {
  // ... existing fields

  @@index([archivedAt])
}

model AgentClaim {
  // ... existing fields (agentName is already @id)
}
```

**Impact:** Small dataset queries won't notice, but scales poorly as data grows.

#### 3.3 Include/Select Strategy - GOOD

**File:** `/Users/josh/Code/kanban-viewer/src/app/api/items/route.ts` (lines 130-139)

Proper use of `include` to fetch relations in one query:

```typescript
const items = await prisma.item.findMany({
  where,
  include: {
    dependsOn: true,
    workLogs: { orderBy: { timestamp: 'asc' } }
  }
});
```

This prevents N+1 queries for relations. **Well done.**

---

### 4. Error Handling

#### 4.1 Error Types and Factories - EXCELLENT

**File:** `/Users/josh/Code/kanban-viewer/src/lib/errors.ts`

Comprehensive error handling with:
- Typed error codes (lines 12-21)
- `ApiError` class with serialization (lines 41-75)
- Factory functions for each error type (lines 82-167)
- Proper `Error.captureStackTrace` for stack traces (line 52-54)

**No issues found.** This is well-designed.

#### 4.2 Database Error Handling - CONCERN

**File:** `/Users/josh/Code/kanban-viewer/src/app/api/board/move/route.ts` (lines 110-126, 173-185)

Generic catch blocks for database errors:

```typescript
try {
  item = await prisma.item.findUnique({ where: { id: itemId } });
} catch (dbError) {
  console.error('Database error during item lookup:', dbError);
  return NextResponse.json({
    success: false,
    error: {
      code: 'DATABASE_ERROR',
      message: 'Database error during item lookup'
    }
  }, { status: 500 });
}
```

**Issues:**
1. Uses generic `DATABASE_ERROR` instead of specific error types
2. Doesn't distinguish between connection errors, constraint violations, etc.
3. Error message is vague ("database error during lookup")
4. Logs full error but doesn't provide sufficient context to caller

**Better approach:** Create specific error types for database failures and use Prisma error detection:

```typescript
import { Prisma } from '@prisma/client';

try {
  item = await prisma.item.findUnique({ where: { id: itemId } });
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') { // Record not found
      return NextResponse.json(createItemNotFoundError(itemId).toResponse(), { status: 404 });
    }
  }
  throw error; // Re-throw for outer catch
}
```

#### 4.3 Unhandled Promise Rejections - GOOD

**Files:** `/Users/josh/Code/kanban-viewer/prisma/seed.ts` (lines 56-64)

Seed script properly catches errors and disconnects:

```typescript
main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (error) => {
    console.error('Seed failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
```

**No issues found.**

---

### 5. Type Safety

#### 5.1 Database-to-Application Type Bridge - GOOD

**File:** `/Users/josh/Code/kanban-viewer/src/app/api/items/route.ts` (lines 27-71)

Transform functions properly cast database types to application types:

```typescript
function transformItemToResponse(item: { ... }): ItemWithRelations {
  return {
    type: item.type as ItemType,  // Proper casting
    priority: item.priority as ItemPriority,
    // ...
  };
}
```

Using type assertion here is appropriate since data comes from Prisma (which enforces schema constraints). **Well done.**

#### 5.2 Stage ID Type Safety - GOOD

**File:** `/Users/josh/Code/kanban-viewer/src/app/api/board/move/route.ts` (lines 25-39)

Type guard function validates stage strings:

```typescript
function isValidStageId(stage: string): stage is StageId {
  return VALID_STAGES.includes(stage as StageId);
}
```

Prevents invalid stages from being used. **Proper defensive programming.**

#### 5.3 Missing Type Validation on POST Bodies - MINOR ISSUE

**File:** `/Users/josh/Code/kanban-viewer/src/app/api/items/route.ts` (lines 160-168)

Request body type is asserted without validation library:

```typescript
let body: CreateItemRequest;
try {
  body = await request.json();
} catch { ... }
```

**Problem:** Runtime data doesn't match TypeScript type. The `dependencies` field could be non-array, or wrong type.

**Low risk** because field-by-field validation follows, but using a library like `zod` or `valibot` would be safer:

```typescript
import { z } from 'zod';

const createItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string(),
  type: z.enum(['feature', 'bug', 'chore', 'spike']),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  dependencies: z.array(z.string()).optional()
});

const body = createItemSchema.parse(await request.json());
```

---

### 6. Schema Design

#### 6.1 Constraints and Uniqueness - GOOD

**File:** `/Users/josh/Code/kanban-viewer/prisma/schema.prisma`

Proper unique constraints:
- Line 54: `@@unique([itemId, dependsOnId])` - Prevents duplicate dependencies
- Line 69: `itemId @unique` - One claim per item
- Lines 88-95: `@@unique([missionId, itemId])` - Prevents duplicate mission assignments

**No issues found.** Constraints are well-designed.

#### 6.2 Cascade Delete Behavior - GOOD

**File:** `/Users/josh/Code/kanban-viewer/prisma/schema.prisma`

Cascade deletes configured appropriately:
- Line 51: ItemDependency cascades when item deleted (prevents orphaned records)
- Line 60: WorkLog cascades when item deleted (safe audit trail cleanup)
- Line 70: AgentClaim cascades when item deleted (necessary)
- Line 92: MissionItem cascades (necessary for cleanup)

**No issues found.**

#### 6.3 Soft Delete Field - GOOD

**File:** `/Users/josh/Code/kanban-viewer/prisma/schema.prisma` (line 34)

`archivedAt DateTime?` field supports soft delete requirement from PRD.

Properly queried in code:
- Line 126 in `/src/app/api/items/route.ts`: `where.archivedAt = null`

**No issues found.**

---

### 7. Validation Logic

#### 7.1 Stage Transition Matrix - EXCELLENT

**File:** `/Users/josh/Code/kanban-viewer/src/lib/validation.ts` (lines 22-29)

Transition matrix correctly implements PRD section 5.1:

```typescript
const TRANSITION_MATRIX: Record<StageId, Set<StageId>> = {
  backlog: new Set(['ready', 'blocked']),
  ready: new Set(['in_progress', 'blocked', 'backlog']),
  in_progress: new Set(['review', 'blocked']),
  review: new Set(['done', 'in_progress', 'blocked']),
  done: new Set(),
  blocked: new Set(['ready']),
};
```

Prevents invalid stage transitions. Self-transitions rejected (line 40). **Excellent implementation.**

#### 7.2 WIP Limit Checking - GOOD

**File:** `/Users/josh/Code/kanban-viewer/src/lib/validation.ts` (lines 66-87)

Correctly handles unlimited (null) and limited scenarios. Returns both `allowed` and `available` capacity.

**Minor suggestion:** Document the behavior when `currentCount > limit` (returns available=0, which is correct but worth noting).

#### 7.3 Dependency Cycle Detection - GOOD

**File:** `/Users/josh/Code/kanban-viewer/src/lib/validation.ts` (lines 109-177)

Depth-first search correctly detects cycles. Handles:
- Direct self-reference (line 120-122)
- Indirect cycles (lines 141-167)
- Non-existent dependencies (handled gracefully)

**Algorithm is correct.** O(n + e) complexity where n=nodes, e=edges. Acceptable for typical dependency graphs.

---

## Summary of Issues

### Critical Issues (Must Fix)

1. **Race condition in `/api/board/claim`** - Two agents could claim the same item concurrently
   - **Location:** `/Users/josh/Code/kanban-viewer/src/app/api/board/claim/route.ts` (lines 179-190)
   - **Fix:** Wrap claim creation and item update in `prisma.$transaction()`

2. **Stale validation in `/api/items/[id]/reject`** - Item state could change between validation and update
   - **Location:** `/Users/josh/Code/kanban-viewer/src/app/api/items/[id]/reject/route.ts` (lines 103-154)
   - **Fix:** Move item lookup inside transaction for validation

### Important Issues (Should Fix)

3. **N+1 queries during dependency validation** - Multiple individual queries instead of batch
   - **Location:** `/Users/josh/Code/kanban-viewer/src/app/api/items/route.ts` (lines 206-212)
   - **Fix:** Use `findMany` with `id: { in: dependencies }`

4. **Missing database indexes** - Common filter fields lack indexes for performance
   - **Schemas:** `stageId`, `archivedAt`, `assignedAgent`, `agentName`
   - **Add to schema:** `@@index([field])` declarations

5. **Generic database error handling** - All errors categorized as DATABASE_ERROR
   - **Location:** Multiple route files
   - **Fix:** Detect Prisma error codes and return specific errors

6. **Unvalidated request bodies** - Type assertions without runtime validation
   - **Location:** All POST endpoints
   - **Consider:** Using zod/valibot for request validation

### Recommendations (Nice to Have)

7. **Use transaction for read-before-write patterns** - Several endpoints validate then update without transaction
   - Applies to: Item creation dependency validation, WIP limit checks

8. **Dedicated database service layer** - Extract database access logic from API routes
   - Current: Each route has full database logic
   - Better: `/src/services/items-service.ts`, `/src/services/board-service.ts` etc.

9. **Connection pooling configuration** - Verify LibSQL connection pool settings
   - Currently: Using defaults, ensure suitable for concurrent requests

10. **Detailed error logging** - Add structured logging with trace IDs for debugging
    - Currently: Generic console.error, should include context

---

## Testing Recommendations

### Database Connection Tests

- [ ] Verify no connection leaks under load (5 concurrent agents, 100+ requests)
- [ ] Test connection recovery after database unavailability
- [ ] Verify singleton pattern prevents multiple client instances

### Transaction Safety Tests

- [ ] Concurrent claim attempts on same item (should fail gracefully)
- [ ] Concurrent rejections on same item (should serialize correctly)
- [ ] Concurrent dependencies additions (should detect cycles reliably)

### Performance Tests

- [ ] Query performance with 1000+ items (should complete in <100ms with indexes)
- [ ] Dependency graph cycle detection with 50-node graph
- [ ] Batch operations (bulk item creation with dependencies)

### Edge Cases

- [ ] Reject item transitioning from review stage during request
- [ ] Claim item being moved between stages concurrently
- [ ] Dependency validation with circular graphs
- [ ] Archive mission while items are being modified

---

## Conclusion

The database layer implementation provides a solid foundation with proper singleton management, transaction support, and comprehensive error typing. The critical issues around race conditions in concurrent operations must be addressed before production use. Once these are fixed and indexes are added, the system should be production-ready for the PRD requirements.

**Recommendation:** Fix critical issues (items 1-2) before PR merge. Address important issues (3-6) in follow-up PRs with lower priority. Consider recommendations (7-10) for future improvements as the system scales.
# Frontend Integration Review

## Executive Summary

The PRD 013 implementation introduces a critical architectural shift from file-based storage to a database-backed API layer. The frontend successfully integrates with this new API but has several issues ranging from necessary bandaids to performance concerns. This review identifies issues, documents why they exist, and recommends both immediate and long-term solutions.

---

## Critical Issues (Priority 1)

### 1. Data Transformation Bandaid - `api-transform.ts` is a symptom, not a solution

**Location:** `/Users/josh/Code/kanban-viewer/src/lib/api-transform.ts`

**Issue:** This 176-line transformation utility exists because of a fundamental architectural mismatch:
- **API layer** (PRD 013): Uses simplified, database-normalized stages (`backlog`, `ready`, `in_progress`, `review`, `done`, `blocked`)
- **UI layer** (legacy): Uses descriptive, domain-specific stages (`briefings`, `ready`, `probing`, `testing`, `implementing`, `review`, `done`, `blocked`)

**Why It Exists:**
The API was designed for simplicity and ACID compliance. The UI evolved with domain semantics from "The A-Team" agent metaphor (Amy=probing, B.A.=implementing, Murdock=testing). Rather than migrate the entire UI to match the database schema (a risky refactor), we created a transformation layer as a temporary bridge.

**Problems With Current Approach:**
1. **Cognitive burden:** Developers must remember two parallel stage taxonomies
2. **Fragility:** Stage mappings are duplicated (see lines 24-31 in `api-transform.ts` vs. legacy code)
3. **Type safety gaps:** Casts from `ItemWithRelations['type']` to `WorkItemFrontmatterType` don't validate (lines 48, 53)
4. **Missing transformations:** Work logs and rejection history are placeholder empty arrays (lines 57, 123)
5. **Stats calculation:** Duplicated in both `api-transform.ts` (lines 140-151) and `page.tsx` (lines 432-438)

**Long-Term Fix (Not in scope for 014):**
Create a "Stage Harmonization" PRD that either:
1. **Option A (Recommended):** Rename database stages to match UI semantics (`briefings`, `probing`, `testing`, `implementing`). Update database schema and all API routes. This is a one-time cost that eliminates the transformation layer.
2. **Option B:** Refactor UI to accept the simplified database stages. Requires UI updates but simpler database-side.

**Immediate Action for 014:**
Document this in `/Users/josh/Code/kanban-viewer/ARCHITECTURE.md` as "Known Technical Debt - Stage Taxonomy" with migration steps.

---

### 2. Error Handling Gap in Data Fetching

**Location:** `/Users/josh/Code/kanban-viewer/src/app/page.tsx` lines 352-396

**Issue:** Fetch errors during initial load don't gracefully degrade:

```typescript
// Lines 357-360
const [boardRes, logRes] = await Promise.all([
  fetch("/api/board?includeCompleted=true"),
  fetch("/api/activity"),
]);

if (boardRes.ok) {
  // ... success path
}

if (logRes.ok) {
  // ... success path
}

// No handling of non-ok responses!
```

**Problems:**
1. If `/api/board` returns 500, `boardRes.ok === false` but we don't set error state
2. If `/api/activity` returns 404, `logRes.ok === false` but we silently continue
3. Calling `boardRes.json()` and `logRes.json()` can throw, caught by outer try/catch, but we don't distinguish between network errors and parse errors
4. User sees generic "Failed to load board data" (line 390) with no details about which endpoint failed

**Impact:**
- Users don't know if the issue is the board API, activity API, or their network
- No way to retry specific failed endpoints
- Silent failures make debugging production issues harder

**Recommended Fix (Priority 1):**

```typescript
async function fetchBoardData() {
  try {
    const boardRes = await fetch("/api/board?includeCompleted=true");
    if (!boardRes.ok) {
      throw new Error(`Board API error: ${boardRes.status} ${boardRes.statusText}`);
    }
    const boardData = await boardRes.json();
    // ... rest

    const logRes = await fetch("/api/activity");
    if (!logRes.ok) {
      // Activity log failures shouldn't block the board display
      console.warn(`Activity log failed: ${logRes.status}, continuing without logs`);
      setLogEntries([]);
    } else {
      const logData = await logRes.json();
      // ... rest
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    setError(`Failed to load board data: ${message}`);
    setLoading(false);
  }
}
```

---

### 3. Type Coercion Without Validation in api-transform.ts

**Location:** `/Users/josh/Code/kanban-viewer/src/lib/api-transform.ts` lines 46-69

**Issue:** Unsafe type casting when transforming API items:

```typescript
// Line 48: No validation that item.type is in the mapping
const uiType = API_TYPE_TO_FRONTMATTER_TYPE[item.type] ?? 'feature';

// Lines 52-68: Casting dates without validation
const createdAt = item.createdAt instanceof Date
  ? item.createdAt.toISOString()
  : String(item.createdAt);
```

**Problems:**
1. If API returns `item.type = 'unknown'`, silently defaults to 'feature' instead of flagging data corruption
2. Date conversions silently coerce invalid dates to strings (could be "Invalid Date")
3. `assignedAgent` cast (line 55) doesn't verify the agent name is valid

**Impact:**
- Silent data corruption in UI if API returns unexpected types
- No observability into data inconsistencies
- Difficult to debug when stats don't match actual data

**Recommended Fix:**
```typescript
// Add validation helper
function validateItemType(type: string): WorkItemFrontmatterType {
  if (API_TYPE_TO_FRONTMATTER_TYPE[type]) {
    return API_TYPE_TO_FRONTMATTER_TYPE[type];
  }
  console.error(`Unexpected item type from API: ${type}`);
  throw new Error(`Invalid item type: ${type}`);
}

// Same for agent names, dates, etc.
```

---

## Recommended Improvements (Priority 2)

### 1. Component Coupling: HeaderBar Depends on Multiple Data Sources

**Location:** `/Users/josh/Code/kanban-viewer/src/app/page.tsx` lines 463-469

**Issue:** HeaderBar receives props from three different sources, making it tightly coupled to the page's data flow:

```typescript
<HeaderBar
  mission={boardMetadata.mission}
  stats={dynamicStats}  // Recalculated from workItems
  wipCurrent={wipCurrent}  // Recalculated from itemsByStage
  wipLimit={wipLimit}  // Recalculated from boardMetadata.wip_limits
  projectName={boardMetadata.projectName}
/>
```

**Problem:**
- HeaderBar accepts calculated stats that duplicate logic in page.tsx (lines 417-428)
- If HeaderBar is used elsewhere, stats must be recalculated
- No single source of truth for "WIP stats"

**Recommended Fix:**
Create a `useBoardStats` hook that encapsulates this logic:

```typescript
// src/hooks/use-board-stats.ts
export function useBoardStats(workItems: WorkItem[], wip_limits: Record<string, number>) {
  return useMemo(() => {
    const itemsByStage = calculateItemsByStage(workItems);
    return {
      wipCurrent: itemsByStage.testing.length + ...,
      wipLimit: ...,
      stats: { total_items: workItems.length, ... }
    };
  }, [workItems, wip_limits]);
}

// In page.tsx
const boardStats = useBoardStats(workItems, boardMetadata.wip_limits);
<HeaderBar {...boardStats} mission={boardMetadata.mission} />
```

---

### 2. Unnecessary Re-renders: Animation State Timing

**Location:** `/Users/josh/Code/kanban-viewer/src/app/page.tsx` lines 104-162

**Issue:** Animation state is checked on every render, but the fallback timeout (line 130) may trigger unnecessarily:

```typescript
// Lines 126-127: Set pending move
pendingMoves.current.set(itemId, { toStage: toStage as Stage, direction, item });

// Lines 130-162: Fallback timeout ALWAYS runs, even if onAnimationEnd fires
setTimeout(() => {
  const pending = pendingMoves.current.get(itemId);
  if (pending) { // Only executes if onAnimationEnd didn't fire
    // ... move logic ...
  }
}, ANIMATION_DURATION);
```

**Problem:**
1. Both the animation end callback (lines 297-332) and the timeout (lines 130-162) have identical move logic - code duplication
2. No cleanup of the timeout if animation ends early - creates stale timers
3. If an item is moved before animation completes, pendingMoves.current accumulates stale entries

**Impact:**
- Memory leak: timers accumulate for quickly-moved items
- Difficult to debug animation glitches
- Two code paths doing the same thing = maintenance burden

**Recommended Fix:**
Extract move logic to a function and track timeouts for cleanup:

```typescript
const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

const completeItemMove = useCallback((itemId: string) => {
  const pending = pendingMoves.current.get(itemId);
  if (pending) {
    // ... move logic
    pendingMoves.current.delete(itemId);
  }
  // Clear timeout if still pending
  const timeout = timeoutRefs.current.get(itemId);
  if (timeout) {
    clearTimeout(timeout);
    timeoutRefs.current.delete(itemId);
  }
}, []);

// Use in both places
const onItemMoved = useCallback((itemId: string, fromStage: string, toStage: string, item?: WorkItem) => {
  // ... start animation
  const timeout = setTimeout(() => completeItemMove(itemId), ANIMATION_DURATION);
  timeoutRefs.current.set(itemId, timeout);
}, [completeItemMove]);

const handleAnimationEnd = useCallback((itemId: string) => {
  completeItemMove(itemId);
}, [completeItemMove]);
```

---

### 3. Missing Test Coverage for Data Transformation

**Location:** `/Users/josh/Code/kanban-viewer/src/lib/api-transform.ts`

**Issue:** No tests for the critical transformation functions.

**Current Test Files:** Extensive test coverage exists for components and utilities, but `api-transform.ts` has no corresponding test file.

**Impact:**
- Regressions in stage/type mapping silently corrupt UI
- No validation that transformations handle edge cases (null missions, missing agents, etc.)
- Future refactors may accidentally break transformations

**Recommended Addition:**
Create `/Users/josh/Code/kanban-viewer/src/__tests__/lib/api-transform.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { transformApiItemToWorkItem, transformBoardStateToMetadata } from '@/lib/api-transform';

describe('api-transform', () => {
  describe('transformApiItemToWorkItem', () => {
    it('maps API stage IDs to UI stages', () => {
      const apiItem = { stageId: 'in_progress', ... };
      const uiItem = transformApiItemToWorkItem(apiItem);
      expect(uiItem.stage).toBe('implementing');
    });

    it('handles unknown item types gracefully', () => {
      // Should not throw, should default or error clearly
    });

    it('transforms dates correctly', () => {
      // Test Date objects and string dates
    });
  });

  describe('transformBoardStateToMetadata', () => {
    it('builds WIP limits with defaults', () => { ... });
    it('calculates stats correctly', () => { ... });
    it('handles null mission', () => { ... });
  });
});
```

---

## Suggestions (Priority 3)

### 1. Performance: Cache Stage Mapping

**Location:** `/Users/josh/Code/kanban-viewer/src/lib/api-transform.ts` lines 24-31

**Suggestion:** The `STAGE_ID_TO_UI_STAGE` mapping is created on every import but never changes. Consider memoizing the transformation if applied frequently:

```typescript
// Current: O(n) lookup on each item
const uiStage = STAGE_ID_TO_UI_STAGE[item.stageId] ?? 'briefings';

// Suggested: If transforming thousands of items, consider reverse index
const STAGE_ID_TO_UI_STAGE_REVERSE = Object.fromEntries(
  Object.entries(STAGE_ID_TO_UI_STAGE).map(([k, v]) => [v, k])
);
```

Impact: Negligible for current data volumes, but good practice.

---

### 2. Documentation: Add Transformation Diagram

**Suggestion:** The stage and type transformations are non-obvious. Add a diagram to help developers understand the mapping:

```markdown
API Layer (Database)          →  UI Layer (React)
────────────────────────────────────────────────
backlog                       →  briefings
ready                         →  ready
in_progress                   →  implementing
review                        →  review
done                          →  done
blocked                       →  blocked

Item Types:
API: feature, bug, chore, spike  →  UI: feature, bug, task, enhancement
```

Location: Add to `CLAUDE.md` under a new "Data Transformation" section.

---

### 3. Observability: Log Stats Mismatches

**Location:** `/Users/josh/Code/kanban-viewer/src/app/page.tsx` lines 432-438

**Suggestion:** When dynamic stats are calculated, compare them to `boardMetadata.stats` to detect inconsistencies:

```typescript
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    const matches = JSON.stringify(dynamicStats) === JSON.stringify(boardMetadata.stats);
    if (!matches) {
      console.warn('Stats mismatch detected', {
        dynamic: dynamicStats,
        metadata: boardMetadata.stats,
      });
    }
  }
}, [dynamicStats, boardMetadata.stats]);
```

This helps catch data inconsistencies early in development.

---

## Existing Code Strengths

The implementation does several things well:

1. **SSE Integration:** The `useBoardEvents` hook correctly streams real-time updates and handles animation state (lines 335-350)
2. **Error Boundaries:** Comprehensive error states with loading and error messages (lines 444-458)
3. **Dynamic Stats:** Derives stats from actual work items rather than relying on potentially stale metadata (lines 432-438)
4. **Filter Integration:** Cleanly separates filter logic from data fetching (lines 399-411)

---

## Data Flow Diagram

```
API Layer                          Frontend                            UI
─────────────────────────────────────────────────────────────────────────

GET /api/board                     page.tsx                            HeaderBar
  ├─ stages (API: backlog...)       ├─ fetch response                   ├─ mission
  ├─ items (API types)              ├─ transformBoardStateToMetadata    ├─ stats
  ├─ claims                         ├─ transformApiItemsToWorkItems    └─ WIP indicators
  └─ mission (API state)            ├─ setWorkItems()
                                    └─ setBoardMetadata()
                                             ↓
                                        SSE /api/board/events
                                       (item-moved, etc.)
                                             ↓
                                    onItemMoved callback
                                    ├─ start exit animation
                                    ├─ update setWorkItems
                                    └─ start enter animation
                                             ↓
                                        BoardColumn
                                      (itemsByStage[stage])
                                             ↓
                                        WorkItemCard
                                        (with animation CSS)
```

**Issue:** The arrows from `transformBoardStateToMetadata` → `HeaderBar` involve stats recalculation in `page.tsx`, creating indirect coupling.

---

## Summary

| Issue | Severity | Fix Scope |
|-------|----------|-----------|
| api-transform.ts bandaid | P1 | Long-term (separate PRD) |
| Error handling in fetch | P1 | Immediate (014) |
| Type coercion without validation | P1 | Immediate (014) |
| HeaderBar component coupling | P2 | 014 or follow-up |
| Animation state code duplication | P2 | 014 or follow-up |
| Missing transform tests | P2 | 014 |
| Stage mapping performance | P3 | Follow-up optimization |
| Transformation diagram docs | P3 | Documentation |
| Stats mismatch observability | P3 | 014 enhancement |

---

## Recommendations for PRD 014

### Must Do
1. Fix error handling in data fetching (page.tsx lines 352-396)
2. Add validation to type transformations (api-transform.ts)
3. Add tests for api-transform.ts functions

### Should Do
4. Consolidate animation move logic (page.tsx lines 104-162, 296-332)
5. Create useBoardStats hook (page.tsx lines 417-429)

### Could Do
6. Add transformation diagram to CLAUDE.md
7. Add stats mismatch observability helper

### Plan for Future PRD
- Create "Stage Harmonization" PRD to eliminate the transformation bandaid
- This would involve either renaming database stages or refactoring UI stages
- Estimated impact: 2-3 days of work, significant maintainability improvement

