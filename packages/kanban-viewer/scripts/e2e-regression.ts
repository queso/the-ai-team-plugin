#!/usr/bin/env tsx

/**
 * End-to-end regression test for the Kanban Viewer API layer.
 *
 * This script tests the new API-based workflow (PRD 013) by simulating
 * agent activity through REST API endpoints instead of filesystem operations.
 *
 * Tests:
 * - Mission creation
 * - Item creation with dependencies
 * - Agent workflows (start/stop)
 * - Item movements through pipeline stages
 * - Activity logging
 * - Real-time UI updates via SSE
 * - Mission completion flow
 */

import * as readline from 'readline';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const DELAY = parseInt(process.env.DELAY || '2000', 10);

// Parse --project CLI argument, default to "kanban-viewer"
function parseProjectId(): string {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--project' && args[i + 1]) {
      return args[i + 1];
    }
    if (args[i].startsWith('--project=')) {
      return args[i].split('=')[1];
    }
  }
  return 'kanban-viewer';
}

const PROJECT_ID = parseProjectId();

// ANSI colors for output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

function log(message: string) {
  console.log(`${colors.green}[E2E]${colors.reset} ${message}`);
}

function warn(message: string) {
  console.log(`${colors.yellow}[E2E]${colors.reset} ${message}`);
}

function info(message: string) {
  console.log(`${colors.blue}[E2E]${colors.reset} ${message}`);
}

function error(message: string) {
  console.log(`${colors.red}[E2E]${colors.reset} ${message}`);
}

function agentLog(agent: string, message: string) {
  info(`[${agent}] ${message}`);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if the API server is reachable before running the test.
 * This prevents users from waiting through setup only to discover the server is down.
 */
async function checkApiHealth(apiBase: string): Promise<boolean> {
  try {
    const response = await fetch(`${apiBase}/api/board`, {
      headers: {
        'X-Project-ID': PROJECT_ID,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Make an API request with error handling.
 * Automatically includes projectId as X-Project-ID header in all requests.
 */
async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${API_BASE}${path}`;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Project-ID': PROJECT_ID,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || `API request failed: ${response.status}`);
    }

    return data;
  } catch (err) {
    error(`API request failed: ${method} ${path}`);
    throw err;
  }
}

/**
 * Create a new project if it doesn't exist.
 * Returns true if created, false if already exists.
 */
async function ensureProjectExists(): Promise<boolean> {
  log(`Ensuring project exists: ${PROJECT_ID}`);
  try {
    const response = await fetch(`${API_BASE}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: PROJECT_ID,
        name: `E2E Test Project - ${PROJECT_ID}`,
      }),
    });

    if (response.status === 201) {
      info(`Project created: ${PROJECT_ID}`);
      return true;
    } else if (response.status === 409) {
      info(`Project already exists: ${PROJECT_ID}`);
      return false;
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Failed to create project: ${response.status}`);
    }
  } catch (err) {
    error(`Failed to ensure project exists: ${PROJECT_ID}`);
    throw err;
  }
}

/**
 * Create a new mission.
 */
async function createMission(name: string, prdPath: string): Promise<string> {
  log(`Creating mission: ${name}`);
  const response = await apiRequest<{ success: true; data: { id: string } }>(
    'POST',
    '/api/missions',
    { name, prdPath }
  );
  info(`Mission created: ${response.data.id}`);
  return response.data.id;
}

/**
 * Create a work item.
 */
async function createItem(item: {
  title: string;
  description: string;
  type: 'feature' | 'bug' | 'enhancement' | 'task';
  priority: 'critical' | 'high' | 'medium' | 'low';
  dependencies?: string[];
}): Promise<string> {
  const response = await apiRequest<{ success: true; data: { id: string } }>(
    'POST',
    '/api/items',
    item
  );
  info(`Created item ${response.data.id}: ${item.title}`);
  return response.data.id;
}

/**
 * Move an item to a different stage.
 */
async function moveItem(
  itemId: string,
  toStage: string,
  force = false
): Promise<void> {
  await apiRequest('POST', '/api/board/move', {
    itemId,
    toStage,
    force,
  });
  info(`Moved ${itemId} → ${toStage}`);
}

/**
 * Agent starts work on an item (claims + moves to in_progress + logs).
 * Use this when item is in ready stage.
 */
async function agentStart(itemId: string, agent: string): Promise<void> {
  await apiRequest('POST', '/api/agents/start', {
    itemId,
    agent,
  });
  agentLog(agent, `Started work on ${itemId}`);
}

/**
 * Agent continues work on an item that was in review.
 * This is for multi-agent handoff workflows (test → implement → review).
 * For implementers (BA/Face): moves to implementing stage, then claims.
 * For reviewers (Lynch): claims the item in review stage (review is now claimable).
 */
async function agentContinue(
  itemId: string,
  agent: string,
  toStage?: 'implementing'
): Promise<void> {
  // Move to the target stage if specified (for implementers)
  if (toStage) {
    await apiRequest('POST', '/api/board/move', {
      itemId,
      toStage,
    });
  }
  // Claim the item (works for both implementers and reviewers now)
  await apiRequest('POST', '/api/board/claim', {
    itemId,
    agent,
  });
  agentLog(agent, `Continuing work on ${itemId}`);
}

/**
 * Agent stops work on an item (releases + moves to review/blocked + logs).
 * Only for agents who claim items (Murdock, BA, Face, Amy).
 */
async function agentStop(
  itemId: string,
  agent: string,
  summary: string,
  outcome: 'completed' | 'blocked' = 'completed'
): Promise<void> {
  await apiRequest('POST', '/api/agents/stop', {
    itemId,
    agent,
    summary,
    outcome,
  });
  agentLog(agent, `Stopped work on ${itemId}: ${summary}`);
}

/**
 * Reviewer finishes review (releases claim and logs activity).
 * Used by Lynch who now claims items in the review stage.
 */
async function reviewComplete(
  itemId: string,
  agent: string,
  summary: string
): Promise<void> {
  // Release the claim before completing review
  await apiRequest('POST', '/api/board/release', { itemId });
  await logActivity(summary, agent);
  agentLog(agent, `Review completed on ${itemId}: ${summary}`);
}

/**
 * Post a hook event (simulates observer hooks firing during agent work).
 */
async function postHookEvent(event: {
  eventType: string;
  agentName: string;
  toolName?: string;
  status: string;
  summary: string;
  correlationId?: string;
  timestamp: string;
  payload?: string;
}): Promise<void> {
  await apiRequest('POST', '/api/hooks/events', event);
  info(`[HookEvent] ${event.agentName} ${event.eventType} (${event.status})`);
}

/**
 * Log an activity message.
 */
async function logActivity(
  message: string,
  agent?: string,
  level: 'info' | 'warn' | 'error' = 'info'
): Promise<void> {
  await apiRequest('POST', '/api/activity', {
    message,
    agent,
    level,
  });
  if (agent) {
    agentLog(agent, message);
  } else {
    info(message);
  }
}

/**
 * Get the current board state.
 */
async function getBoardState(): Promise<{
  stages: { id: string; name: string }[];
  items: { id: string; title: string; stageId: string }[];
  agents: { name: string; currentItemId: string | null }[];
}> {
  const response = await apiRequest<{
    success: true;
    data: {
      stages: { id: string; name: string }[];
      items: { id: string; title: string; stageId: string }[];
      agents: { name: string; currentItemId: string | null }[];
    };
  }>('GET', '/api/board');
  return response.data;
}

/**
 * Archive any existing mission to clean up from previous runs.
 * This archives the mission and all its associated items.
 */
async function archivePreviousMission(): Promise<void> {
  try {
    const response = await apiRequest<{
      success: true;
      data: { mission: { id: string }; archivedItems: number };
    }>('POST', '/api/missions/archive');
    warn(`Archived previous mission ${response.data.mission.id} with ${response.data.archivedItems} items`);
  } catch {
    // No active mission to archive - that's fine
  }
}

/**
 * Release any stale claims from previous failed runs.
 * Finds items in in_progress stage (which should have claims) and releases them.
 */
async function cleanupStaleClaims(): Promise<void> {
  const board = await getBoardState();
  const inProgressItems = board.items.filter(item => item.stageId === 'in_progress');

  for (const item of inProgressItems) {
    try {
      await apiRequest('POST', '/api/board/release', { itemId: item.id });
      warn(`Released stale claim on ${item.id}`);
    } catch {
      // Item had no claim - that's fine
    }
  }
}

/**
 * Wait for user to press Enter.
 */
async function waitForEnter(message: string): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${colors.cyan}${message}${colors.reset}\n`, () => {
      rl.close();
      resolve();
    });
  });
}

/**
 * Main E2E regression test flow.
 */
async function main() {
  console.log('========================================');
  console.log('  E2E REGRESSION TEST (API-BASED)');
  console.log('========================================');
  console.log('');
  log(`Project ID: ${PROJECT_ID}`);

  // ---------------------------------------------------------------------------
  // HEALTH CHECK: Verify API is reachable before any operations
  // ---------------------------------------------------------------------------

  const isHealthy = await checkApiHealth(API_BASE);
  if (!isHealthy) {
    console.log(`${colors.red}[E2E]${colors.reset} API server is not reachable at ${API_BASE}`);
    console.log('Run "npm run dev" to start the development server.');
    process.exit(1);
  }
  console.log(`${colors.green}[E2E]${colors.reset} API server is reachable. Starting E2E regression test...`);

  try {
    // ---------------------------------------------------------------------------
    // CLEANUP: Archive previous mission and release stale claims
    // ---------------------------------------------------------------------------

    log('Cleaning up from previous runs...');

    // Archive previous mission (best effort)
    try {
      await archivePreviousMission();
    } catch (cleanupError) {
      console.log(`${colors.yellow}[E2E]${colors.reset} Warning: Could not archive previous mission: ${cleanupError instanceof Error ? cleanupError.message : cleanupError}`);
      console.log(`${colors.yellow}[E2E]${colors.reset} This is non-fatal. You can retry by running the archive manually.`);
    }

    // Cleanup stale claims (best effort)
    try {
      await cleanupStaleClaims();
    } catch (cleanupError) {
      console.log(`${colors.yellow}[E2E]${colors.reset} Warning: Could not cleanup stale claims: ${cleanupError instanceof Error ? cleanupError.message : cleanupError}`);
      console.log(`${colors.yellow}[E2E]${colors.reset} This is non-fatal. You can retry by releasing claims manually.`);
    }

    // ---------------------------------------------------------------------------
    // SETUP: Ensure project exists, then create mission
    // ---------------------------------------------------------------------------

    log('Initializing test mission...');
    await ensureProjectExists();
    await createMission(
      'E2E Regression Test - PRD 013',
      'prd/013-mcp-interface.md'
    );

    // ---------------------------------------------------------------------------
    // CREATE WORK ITEMS
    // ---------------------------------------------------------------------------

    log('Creating work items...');

    // Item 001 - No dependencies (Wave 0)
    const item001 = await createItem({
      title: 'Add TypeScript types for feature X',
      description: `## Objective
Define TypeScript interfaces and types for feature X

## Acceptance Criteria
- Type definitions are complete
- Types are exported correctly`,
      type: 'task',
      priority: 'high',
      dependencies: [],
    });

    // Item 002 - Depends on 001 (Wave 1)
    const item002 = await createItem({
      title: 'Implement feature X service',
      description: `## Objective
Implement the core service logic for feature X

## Acceptance Criteria
- Service methods are implemented
- All tests pass`,
      type: 'feature',
      priority: 'high',
      dependencies: [item001],
    });

    // Item 003 - Depends on 001 (Wave 1)
    const item003 = await createItem({
      title: 'Add feature X UI component',
      description: `## Objective
Create React component for feature X UI

## Acceptance Criteria
- Component renders correctly
- Props are typed
- Tests pass`,
      type: 'feature',
      priority: 'high',
      dependencies: [item001],
    });

    // Item 004 - Depends on 002, 003 (Wave 2)
    const item004 = await createItem({
      title: 'Integration tests for feature X',
      description: `## Objective
Write integration tests covering the full feature X flow

## Acceptance Criteria
- Integration tests pass
- Coverage is adequate`,
      type: 'task',
      priority: 'medium',
      dependencies: [item002, item003],
    });

    log('Work items created!');

    // ---------------------------------------------------------------------------
    // SIMULATION START
    // ---------------------------------------------------------------------------

    console.log('');
    console.log('========================================');
    console.log('  E2E REGRESSION TEST READY');
    console.log('========================================');
    console.log('');
    log('Open http://localhost:3000 in your browser to watch the simulation.');
    console.log('');

    await waitForEnter(`Press Enter to start the simulation...`);

    log('Starting simulation!');
    console.log('');

    // ---------------------------------------------------------------------------
    // WAVE 0: Item 001 through full pipeline
    // ---------------------------------------------------------------------------

    log('=== WAVE 0: Processing item 001 (no dependencies) ===');

    // 001: backlog → ready (force=true to bypass WIP limits in test environment)
    await sleep(DELAY);
    await moveItem(item001, 'ready', true);
    await logActivity('Item 001 is ready for work', 'Hannibal');

    // 001: ready → in_progress (Murdock writes tests)
    await sleep(DELAY);
    await agentStart(item001, 'Murdock');
    await logActivity('Writing tests for TypeScript types', 'Murdock');

    // Simulate hook event: Murdock pre_tool_use (Write)
    const murdockCorrelation001 = `corr-murdock-${Date.now()}`;
    await postHookEvent({
      eventType: 'pre_tool_use',
      agentName: 'murdock',
      toolName: 'Write',
      status: 'success',
      summary: 'Writing test file src/__tests__/types.test.ts',
      correlationId: murdockCorrelation001,
      timestamp: new Date().toISOString(),
    });

    await sleep(DELAY);
    await logActivity('Tests complete - 12 test cases', 'Murdock');

    // Simulate hook event: Murdock post_tool_use (matching correlationId)
    await postHookEvent({
      eventType: 'post_tool_use',
      agentName: 'murdock',
      toolName: 'Write',
      status: 'success',
      summary: 'Test file written successfully',
      correlationId: murdockCorrelation001,
      timestamp: new Date().toISOString(),
    });

    // 001: Murdock finishes testing, BA implements
    await sleep(DELAY);
    await agentStop(item001, 'Murdock', 'Test suite complete with 12 test cases');

    // BA continues work on item (review → implementing + claim)
    await sleep(DELAY);
    await agentContinue(item001, 'B.A.', 'implementing');
    await logActivity('Implementing TypeScript types', 'B.A.');

    // Simulate hook event: B.A. pre_tool_use (Edit)
    const baCorrelation001 = `corr-ba-${Date.now()}`;
    await postHookEvent({
      eventType: 'pre_tool_use',
      agentName: 'ba',
      toolName: 'Edit',
      status: 'success',
      summary: 'Editing src/types/feature.ts',
      correlationId: baCorrelation001,
      timestamp: new Date().toISOString(),
    });

    await sleep(DELAY);
    await logActivity('Implementation complete - all tests passing', 'B.A.');

    // Simulate hook event: B.A. post_tool_use (matching correlationId)
    await postHookEvent({
      eventType: 'post_tool_use',
      agentName: 'ba',
      toolName: 'Edit',
      status: 'success',
      summary: 'Type definitions implemented',
      correlationId: baCorrelation001,
      timestamp: new Date().toISOString(),
    });

    // 001: BA finishes, moves to review
    await sleep(DELAY);
    await agentStop(item001, 'B.A.', 'Type definitions implemented, all tests passing');

    // 001: Lynch reviews (continues from review stage)
    await sleep(DELAY);
    await agentContinue(item001, 'Lynch');
    await logActivity('Reviewing types implementation', 'Lynch');

    await sleep(DELAY);
    await logActivity('APPROVED - Clean type definitions', 'Lynch');

    // Simulate hook event: Lynch stop
    await postHookEvent({
      eventType: 'stop',
      agentName: 'lynch',
      status: 'success',
      summary: 'Review complete - approved item 001',
      timestamp: new Date().toISOString(),
    });

    // 001: Lynch approves, moves to done
    await sleep(DELAY);
    await reviewComplete(item001, 'Lynch', 'Code review passed - clean type definitions');
    await moveItem(item001, 'done', true);
    await logActivity('Item 001 complete!', 'Hannibal');

    // ---------------------------------------------------------------------------
    // WAVE 1: Items 002 and 003 in parallel
    // ---------------------------------------------------------------------------

    log('=== WAVE 1: Processing items 002, 003 (depend on 001) ===');

    // Move both to ready (dependencies satisfied, force=true for test environment)
    await sleep(DELAY);
    await moveItem(item002, 'ready', true);
    await moveItem(item003, 'ready', true);
    await logActivity('Items 002 and 003 ready - dependencies satisfied', 'Hannibal');

    // Start both in parallel (Murdock tests 002)
    await sleep(DELAY);
    await agentStart(item002, 'Murdock');
    await logActivity('Writing tests for feature X service', 'Murdock');

    await sleep(1000);
    await agentStart(item003, 'Amy');
    await logActivity('Writing tests for feature X component', 'Amy');

    await sleep(DELAY);
    await logActivity('Service tests complete - 8 test cases', 'Murdock');
    await logActivity('Component tests complete - 15 test cases', 'Amy');

    // Finish testing phase
    await sleep(DELAY);
    await agentStop(item002, 'Murdock', 'Service test suite complete with 8 test cases');

    await sleep(500);
    await agentStop(item003, 'Amy', 'Component test suite complete with 15 test cases');

    // BA and Face continue implementation (from review → implementing)
    await sleep(DELAY);
    await agentContinue(item002, 'B.A.', 'implementing');
    await logActivity('Implementing feature X service', 'B.A.');

    await sleep(1000);
    await agentContinue(item003, 'Face', 'implementing');
    await logActivity('Implementing feature X component', 'Face');

    await sleep(DELAY);
    await logActivity('Service implementation complete', 'B.A.');
    await logActivity('Component implementation complete', 'Face');

    // Finish implementation phase
    await sleep(DELAY);
    await agentStop(item002, 'B.A.', 'Service implementation complete, all tests passing');

    await sleep(500);
    await agentStop(item003, 'Face', 'Component implementation complete, all tests passing');

    // Lynch reviews both sequentially (agent can only claim one at a time)
    await sleep(DELAY);
    await agentContinue(item002, 'Lynch');
    await logActivity('Reviewing service implementation', 'Lynch');

    await sleep(DELAY);
    await logActivity('APPROVED - Solid service implementation', 'Lynch');
    await reviewComplete(item002, 'Lynch', 'Code review passed - solid service implementation');
    await moveItem(item002, 'done', true);

    // Now Lynch reviews item003
    await sleep(DELAY);
    await agentContinue(item003, 'Lynch');
    await logActivity('Reviewing component implementation', 'Lynch');

    await sleep(DELAY);
    await logActivity('APPROVED - Solid component implementation', 'Lynch');
    await reviewComplete(item003, 'Lynch', 'Code review passed - solid component implementation');
    await moveItem(item003, 'done', true);
    await logActivity('Wave 1 complete - items 002 and 003 done!', 'Hannibal');

    // ---------------------------------------------------------------------------
    // WAVE 2: Item 004 (integration tests)
    // ---------------------------------------------------------------------------

    log('=== WAVE 2: Processing item 004 (integration tests) ===');

    await sleep(DELAY);
    await moveItem(item004, 'ready', true);
    await logActivity('Item 004 ready - all dependencies completed', 'Hannibal');

    await sleep(DELAY);
    await agentStart(item004, 'Murdock');
    await logActivity('Writing integration tests for feature X', 'Murdock');

    await sleep(DELAY);
    await logActivity('Integration tests complete - 6 test cases', 'Murdock');

    // For test items, implementation is a quick verification
    await sleep(DELAY);
    await agentStop(item004, 'Murdock', 'Integration test suite complete with 6 test cases');

    // BA continues verification (review → implementing)
    await sleep(DELAY);
    await agentContinue(item004, 'B.A.', 'implementing');
    await logActivity('Verifying integration test setup', 'B.A.');

    await sleep(1000);
    await agentStop(item004, 'B.A.', 'Integration tests verified and running');

    // Lynch reviews
    await sleep(DELAY);
    await agentContinue(item004, 'Lynch');
    await logActivity('Reviewing integration tests', 'Lynch');

    await sleep(DELAY);
    await logActivity('APPROVED - Good coverage', 'Lynch');

    await sleep(DELAY);
    await reviewComplete(item004, 'Lynch', 'Code review passed - good test coverage');

    await sleep(DELAY);
    await moveItem(item004, 'done', true);
    await logActivity('All items complete! Mission accomplished.', 'Hannibal');

    // ---------------------------------------------------------------------------
    // MISSION COMPLETION
    // ---------------------------------------------------------------------------

    log('=== MISSION COMPLETION ===');

    await sleep(DELAY);
    await logActivity('Running post-mission checks...', 'Hannibal');

    await sleep(DELAY);
    await logActivity('Lint: PASSED', 'Hannibal');

    await sleep(1000);
    await logActivity('TypeCheck: PASSED', 'Hannibal');

    await sleep(1000);
    await logActivity('Unit Tests: PASSED (41/41)', 'Hannibal');

    await sleep(1000);
    await logActivity('Build: PASSED', 'Hannibal');

    await sleep(DELAY);
    await logActivity('I love it when a plan comes together.', 'Hannibal');

    // ---------------------------------------------------------------------------
    // HOOK EVENT VERIFICATION
    // ---------------------------------------------------------------------------

    log('=== HOOK EVENT VERIFICATION ===');

    // 1. Verify hook events were stored (5 posted during Wave 0)
    await sleep(DELAY);
    const hookEventsResponse = await fetch(`${API_BASE}/api/hooks/events?limit=50`, {
      headers: {
        'X-Project-ID': PROJECT_ID,
      },
    });
    if (hookEventsResponse.ok) {
      log('GET hook events: OK');
    } else {
      warn(`GET hook events returned ${hookEventsResponse.status} - endpoint may not support GET (expected for POST-only)`);
    }

    // 2. POST a batch of events and verify batch response
    const batchEvents = [
      {
        eventType: 'subagent_start' as const,
        agentName: 'murdock',
        status: 'success',
        summary: 'Murdock subagent started for integration tests',
        timestamp: new Date().toISOString(),
      },
      {
        eventType: 'subagent_stop' as const,
        agentName: 'murdock',
        status: 'success',
        summary: 'Murdock subagent completed integration tests',
        timestamp: new Date().toISOString(),
      },
      {
        eventType: 'stop' as const,
        agentName: 'ba',
        status: 'success',
        summary: 'B.A. finished implementing integration support',
        timestamp: new Date().toISOString(),
      },
    ];
    const batchResponse = await apiRequest<{
      success: true;
      data: { created: number; skipped: number };
    }>('POST', '/api/hooks/events', batchEvents);
    log(`Batch POST: created=${batchResponse.data.created}, skipped=${batchResponse.data.skipped}`);

    // 3. POST a duplicate event (same correlationId+eventType) and verify dedup
    const dedupCorrelationId = `corr-dedup-test-${Date.now()}`;
    await apiRequest('POST', '/api/hooks/events', {
      eventType: 'pre_tool_use',
      agentName: 'amy',
      toolName: 'Read',
      status: 'success',
      summary: 'Amy reading source file',
      correlationId: dedupCorrelationId,
      timestamp: new Date().toISOString(),
    });
    // Post same correlationId + eventType again
    const dedupResponse = await apiRequest<{
      success: true;
      data: { created: number; skipped: number };
    }>('POST', '/api/hooks/events', {
      eventType: 'pre_tool_use',
      agentName: 'amy',
      toolName: 'Read',
      status: 'success',
      summary: 'Amy reading source file (duplicate)',
      correlationId: dedupCorrelationId,
      timestamp: new Date().toISOString(),
    });
    if (dedupResponse.data.skipped === 1) {
      log('Deduplication: PASSED (duplicate correctly skipped)');
    } else {
      warn(`Deduplication: unexpected result - created=${dedupResponse.data.created}, skipped=${dedupResponse.data.skipped}`);
    }

    // 4. POST prune request for old events
    const oldTimestamp = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year ago
    const pruneResponse = await apiRequest<{
      success: true;
      data: { pruned: number };
    }>('POST', '/api/hooks/events/prune', {
      olderThan: oldTimestamp,
    });
    log(`Prune: ${pruneResponse.data.pruned} old events removed`);

    log('Hook event verification complete!');

    // ---------------------------------------------------------------------------
    // SUMMARY
    // ---------------------------------------------------------------------------

    console.log('');
    log('========================================');
    log('  SIMULATION COMPLETE');
    log('========================================');
    log('');
    log('Pipeline stages tested:');
    log('  - backlog → ready → in_progress → review → done');
    log('');
    log('API endpoints tested:');
    log('  - POST /api/missions (create mission)');
    log('  - POST /api/items (create items)');
    log('  - POST /api/board/move (move items)');
    log('  - POST /api/board/claim (claim items)');
    log('  - POST /api/agents/start (agent starts work)');
    log('  - POST /api/agents/stop (agent stops work)');
    log('  - POST /api/activity (log activity)');
    log('  - GET /api/board (get board state)');
    log('  - POST /api/hooks/events (single + batch)');
    log('  - POST /api/hooks/events/prune (prune old events)');
    log('');
    log('Agents tested:');
    log('  - Hannibal (planning/coordination)');
    log('  - Murdock (testing)');
    log('  - BA (implementation)');
    log('  - Face (implementation)');
    log('  - Amy (testing)');
    log('  - Lynch (code review)');
    log('');
    log('Hook events tested:');
    log('  - pre_tool_use / post_tool_use pairs with correlationId');
    log('  - stop events');
    log('  - Batch creation');
    log('  - Deduplication');
    log('  - Pruning');
    log('');
    log('Final state:');
    log('  - Items completed: 4');
    log('  - Mission: Complete');
    log('  - All checks: PASSED');
    log('');

    // Final verification (include completed items)
    const finalResponse = await apiRequest<{
      success: true;
      data: { items: { id: string; stageId: string }[] };
    }>('GET', '/api/board?includeCompleted=true');
    const doneItems = finalResponse.data.items.filter((item) => item.stageId === 'done');
    log(`Verified: ${doneItems.length} items in done stage`);

    process.exit(0);
  } catch (err) {
    error(`Simulation failed: ${err instanceof Error ? err.message : String(err)}`);
    console.error(err);
    process.exit(1);
  }
}

// Run the simulation
main();
