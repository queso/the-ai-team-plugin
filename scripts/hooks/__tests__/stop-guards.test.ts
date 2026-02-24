/**
 * Tests for agent guards in Stop enforcement hooks.
 *
 * Each Stop hook should use resolveAgent() to identify the agent and only
 * enforce for its target agent(s). Non-target agents must be allowed through
 * (fail-open). Unknown agents (Explore, Plan, null) must also pass through.
 *
 * Hooks under test:
 *   - enforce-completion-log.js   → murdock, ba, lynch, amy, tawnia
 *   - enforce-browser-verification.js → amy
 *   - enforce-sosa-coverage.js    → sosa
 *   - enforce-final-review.js     → hannibal
 *   - enforce-orchestrator-stop.js → hannibal
 */

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'child_process';
import { join } from 'path';
import { readFileSync } from 'fs';

const HOOKS_DIR = join(__dirname, '..');

function hookPath(name: string) {
  return join(HOOKS_DIR, name);
}

/**
 * Run a hook script with given stdin JSON and env vars.
 * Returns { stdout, stderr, exitCode }.
 */
function runHook(
  scriptPath: string,
  stdin: object = {},
  env: Record<string, string> = {}
) {
  const fullEnv = {
    ...process.env,
    ATEAM_API_URL: 'http://localhost:3000',
    ATEAM_PROJECT_ID: 'test-project',
    ...env,
  };
  try {
    const stdout = execFileSync('node', [scriptPath], {
      env: fullEnv,
      encoding: 'utf8',
      timeout: 5000,
      input: JSON.stringify(stdin),
    });
    return { stdout: stdout.trim(), stderr: '', exitCode: 0 };
  } catch (err: any) {
    return {
      stdout: (err.stdout || '').trim(),
      stderr: (err.stderr || '').trim(),
      exitCode: err.status ?? 1,
    };
  }
}

/**
 * Parse JSON stdout from a Stop hook response, or return {} if empty/invalid.
 */
function parseStopOutput(stdout: string): Record<string, unknown> {
  if (!stdout) return {};
  try {
    return JSON.parse(stdout);
  } catch {
    return {};
  }
}

// =============================================================================
// enforce-completion-log.js
// =============================================================================
describe('enforce-completion-log — agent guards', () => {
  const HOOK = hookPath('enforce-completion-log.js');

  it('uses resolveAgent() in source (not raw agent_type string comparison)', () => {
    const source = readFileSync(HOOK, 'utf8');
    expect(source).toMatch(/resolveAgent/);
  });

  it('exits 0 for non-target agent (hannibal) even when work_log is empty', () => {
    const result = runHook(HOOK, {
      agent_type: 'hannibal',
      last_assistant_message: 'Mission complete WI-001',
    }, {
      __TEST_MOCK_RESPONSE__: JSON.stringify({
        id: 'WI-001',
        work_log: [],
        assigned_agent: 'hannibal',
      }),
    });
    expect(result.exitCode).toBe(0);
    const output = parseStopOutput(result.stdout);
    expect(output.decision).not.toBe('block');
  });

  it('exits 0 for non-target agent (face) even when work_log is empty', () => {
    const result = runHook(HOOK, {
      agent_type: 'face',
      last_assistant_message: 'Decomposed WI-001',
    }, {
      __TEST_MOCK_RESPONSE__: JSON.stringify({
        id: 'WI-001',
        work_log: [],
        assigned_agent: 'face',
      }),
    });
    expect(result.exitCode).toBe(0);
    const output = parseStopOutput(result.stdout);
    expect(output.decision).not.toBe('block');
  });

  it('exits 0 for unknown/system agent (Explore)', () => {
    const result = runHook(HOOK, {
      agent_type: 'Explore',
      last_assistant_message: 'Explored codebase WI-001',
    }, {
      __TEST_MOCK_RESPONSE__: JSON.stringify({
        id: 'WI-001',
        work_log: [],
      }),
    });
    expect(result.exitCode).toBe(0);
    const output = parseStopOutput(result.stdout);
    expect(output.decision).not.toBe('block');
  });

  it('blocks target agent (murdock) when work_log is empty', () => {
    const result = runHook(HOOK, {
      agent_type: 'murdock',
      last_assistant_message: 'Tests written for WI-001',
    }, {
      __TEST_MOCK_RESPONSE__: JSON.stringify({
        id: 'WI-001',
        work_log: [],
        assigned_agent: 'Murdock',
      }),
    });
    expect(result.exitCode).toBe(0);
    const output = parseStopOutput(result.stdout);
    expect(output.decision).toBe('block');
  });

  it('blocks target agent (amy) when work_log is empty', () => {
    const result = runHook(HOOK, {
      agent_type: 'amy',
      last_assistant_message: 'Probing complete for WI-001',
    }, {
      __TEST_MOCK_RESPONSE__: JSON.stringify({
        id: 'WI-001',
        work_log: [],
        assigned_agent: 'Amy',
      }),
    });
    expect(result.exitCode).toBe(0);
    const output = parseStopOutput(result.stdout);
    expect(output.decision).toBe('block');
  });

  it('exits 0 (fail-open) on API error for any agent', () => {
    const result = runHook(HOOK, {
      agent_type: 'murdock',
      last_assistant_message: 'Tests written for WI-001',
    }, {
      ATEAM_API_URL: 'http://localhost:99999',
    });
    expect(result.exitCode).toBe(0);
  });
});

// =============================================================================
// enforce-browser-verification.js
// =============================================================================
describe('enforce-browser-verification — agent guards', () => {
  const HOOK = hookPath('enforce-browser-verification.js');

  it('uses resolveAgent() in source', () => {
    const source = readFileSync(HOOK, 'utf8');
    expect(source).toMatch(/resolveAgent/);
  });

  it('exits 0 for non-amy agent (murdock) without browser marker', () => {
    const result = runHook(HOOK, {
      agent_type: 'murdock',
      last_assistant_message: 'Tests done WI-001',
    }, {
      __TEST_MOCK_RESPONSE__: JSON.stringify({
        id: 'WI-001',
        work_log: [],
      }),
    });
    expect(result.exitCode).toBe(0);
    const output = parseStopOutput(result.stdout);
    expect(output.decision).not.toBe('block');
  });

  it('exits 0 for non-amy agent (lynch) without browser marker', () => {
    const result = runHook(HOOK, {
      agent_type: 'lynch',
      last_assistant_message: 'Review done WI-001',
    }, {
      __TEST_MOCK_RESPONSE__: JSON.stringify({
        id: 'WI-001',
        work_log: [],
      }),
    });
    expect(result.exitCode).toBe(0);
    const output = parseStopOutput(result.stdout);
    expect(output.decision).not.toBe('block');
  });

  it('exits 0 for unknown/system agent (Explore) without browser marker', () => {
    const result = runHook(HOOK, {
      agent_type: 'Explore',
      last_assistant_message: 'Explored codebase',
    });
    expect(result.exitCode).toBe(0);
    const output = parseStopOutput(result.stdout);
    expect(output.decision).not.toBe('block');
  });

  it('blocks amy when no browser marker and no NO_UI justification', () => {
    const result = runHook(HOOK, {
      agent_type: 'amy',
      last_assistant_message: 'Probing complete for WI-001',
    }, {
      __TEST_MOCK_RESPONSE__: JSON.stringify({
        id: 'WI-001',
        work_log: [{ agent: 'amy', summary: 'VERIFIED - All tests pass' }],
      }),
    });
    expect(result.exitCode).toBe(0);
    const output = parseStopOutput(result.stdout);
    expect(output.decision).toBe('block');
  });

  it('exits 0 (fail-open) on API error for amy', () => {
    const result = runHook(HOOK, {
      agent_type: 'amy',
      last_assistant_message: 'Probing complete for WI-001',
    }, {
      ATEAM_API_URL: 'http://localhost:99999',
    });
    expect(result.exitCode).toBe(0);
  });
});

// =============================================================================
// enforce-sosa-coverage.js
// =============================================================================
describe('enforce-sosa-coverage — agent guards', () => {
  const HOOK = hookPath('enforce-sosa-coverage.js');

  it('uses resolveAgent() in source', () => {
    const source = readFileSync(HOOK, 'utf8');
    expect(source).toMatch(/resolveAgent/);
  });

  it('exits 0 for non-sosa agent (face) when items exist in briefings', () => {
    const result = runHook(HOOK, {
      agent_type: 'face',
      last_assistant_message: 'Decomposed items',
    }, {
      __TEST_MOCK_ITEMS__: JSON.stringify([
        { id: 'WI-001', title: 'Feature A' },
        { id: 'WI-002', title: 'Feature B' },
      ]),
      __TEST_MOCK_ACTIVITY__: JSON.stringify([]),
    });
    expect(result.exitCode).toBe(0);
    const output = parseStopOutput(result.stdout);
    expect(output.decision).not.toBe('block');
  });

  it('exits 0 for non-sosa agent (murdock) when items exist', () => {
    const result = runHook(HOOK, {
      agent_type: 'murdock',
      last_assistant_message: 'Done',
    }, {
      __TEST_MOCK_ITEMS__: JSON.stringify([{ id: 'WI-001' }]),
      __TEST_MOCK_ACTIVITY__: JSON.stringify([]),
    });
    expect(result.exitCode).toBe(0);
    const output = parseStopOutput(result.stdout);
    expect(output.decision).not.toBe('block');
  });

  it('exits 0 for unknown/system agent (Plan)', () => {
    const result = runHook(HOOK, {
      agent_type: 'Plan',
      last_assistant_message: 'Planning done',
    }, {
      __TEST_MOCK_ITEMS__: JSON.stringify([{ id: 'WI-001' }]),
      __TEST_MOCK_ACTIVITY__: JSON.stringify([]),
    });
    expect(result.exitCode).toBe(0);
    const output = parseStopOutput(result.stdout);
    expect(output.decision).not.toBe('block');
  });

  it('blocks sosa when items exist and no render calls found', () => {
    const result = runHook(HOOK, {
      agent_type: 'sosa',
      last_assistant_message: 'Done reviewing',
    }, {
      __TEST_MOCK_ITEMS__: JSON.stringify([
        { id: 'WI-001', title: 'Feature A' },
      ]),
      __TEST_MOCK_ACTIVITY__: JSON.stringify([]),
    });
    expect(result.exitCode).toBe(0);
    const output = parseStopOutput(result.stdout);
    expect(output.decision).toBe('block');
  });

  it('exits 0 (fail-open) on API error for sosa', () => {
    const result = runHook(HOOK, {
      agent_type: 'sosa',
      last_assistant_message: 'Done',
    }, {
      ATEAM_API_URL: 'http://localhost:99999',
    });
    expect(result.exitCode).toBe(0);
  });
});

// =============================================================================
// enforce-final-review.js
// =============================================================================
describe('enforce-final-review — agent guards', () => {
  const HOOK = hookPath('enforce-final-review.js');

  it('uses resolveAgent() in source', () => {
    const source = readFileSync(HOOK, 'utf8');
    expect(source).toMatch(/resolveAgent/);
  });

  it('exits 0 for non-hannibal agent (tawnia) even with incomplete mission', () => {
    const result = runHook(HOOK, {
      agent_type: 'tawnia',
      last_assistant_message: 'Documentation done',
    }, {
      __TEST_MOCK_BOARD__: JSON.stringify({
        columns: { testing: [{ id: 'WI-001' }] },
      }),
      __TEST_MOCK_MISSION__: JSON.stringify({
        status: 'active',
        final_review_verdict: null,
        postcheck: null,
      }),
    });
    expect(result.exitCode).toBe(0);
  });

  it('exits 0 for non-hannibal agent (lynch) even with incomplete mission', () => {
    const result = runHook(HOOK, {
      agent_type: 'lynch',
      last_assistant_message: 'Review done',
    }, {
      __TEST_MOCK_BOARD__: JSON.stringify({
        columns: { testing: [{ id: 'WI-001' }] },
      }),
      __TEST_MOCK_MISSION__: JSON.stringify({
        status: 'active',
        final_review_verdict: null,
        postcheck: null,
      }),
    });
    expect(result.exitCode).toBe(0);
  });

  it('exits 0 for unknown/system agent (Explore)', () => {
    const result = runHook(HOOK, {
      agent_type: 'Explore',
    }, {
      __TEST_MOCK_BOARD__: JSON.stringify({
        columns: { testing: [{ id: 'WI-001' }] },
      }),
      __TEST_MOCK_MISSION__: JSON.stringify({ status: 'active' }),
    });
    expect(result.exitCode).toBe(0);
  });

  it('enforces (exits 2) for hannibal with items still active', () => {
    const result = runHook(HOOK, {
      // no agent_type = main session (hannibal)
    }, {
      __TEST_MOCK_BOARD__: JSON.stringify({
        columns: { testing: [{ id: 'WI-001' }] },
      }),
      __TEST_MOCK_MISSION__: JSON.stringify({
        status: 'active',
        final_review_verdict: null,
        postcheck: null,
      }),
    });
    expect(result.exitCode).toBe(2);
  });

  it('exits 0 (fail-open) on API error for hannibal', () => {
    const result = runHook(HOOK, {}, {
      ATEAM_API_URL: 'http://localhost:99999',
    });
    expect(result.exitCode).toBe(0);
  });
});

// =============================================================================
// enforce-orchestrator-stop.js
// =============================================================================
describe('enforce-orchestrator-stop — agent guards', () => {
  const HOOK = hookPath('enforce-orchestrator-stop.js');

  it('uses resolveAgent() in source', () => {
    const source = readFileSync(HOOK, 'utf8');
    expect(source).toMatch(/resolveAgent/);
  });

  it('exits 0 for subagent (murdock) even with active items', () => {
    const result = runHook(HOOK, {
      agent_type: 'murdock',
      last_assistant_message: 'Tests done WI-001',
    });
    // Subagents with agent_type set are passed through immediately
    expect(result.exitCode).toBe(0);
    const output = parseStopOutput(result.stdout);
    expect(output.decision).not.toBe('block');
  });

  it('exits 0 for subagent (ba) even with active items', () => {
    const result = runHook(HOOK, {
      agent_type: 'ba',
      last_assistant_message: 'Implementation done WI-001',
    });
    expect(result.exitCode).toBe(0);
    const output = parseStopOutput(result.stdout);
    expect(output.decision).not.toBe('block');
  });

  it('exits 0 for unknown/system agent (Explore)', () => {
    const result = runHook(HOOK, {
      agent_type: 'Explore',
    });
    expect(result.exitCode).toBe(0);
    const output = parseStopOutput(result.stdout);
    expect(output.decision).not.toBe('block');
  });

  it('blocks main session (hannibal/no agent_type) when items still active', () => {
    const result = runHook(HOOK, {
      // no agent_type = main session
      session_id: 'main-session-123',
    }, {
      __TEST_MOCK_BOARD__: JSON.stringify({
        columns: {
          testing: [{ id: 'WI-001' }],
          done: [],
        },
      }),
    });
    expect(result.exitCode).toBe(0);
    const output = parseStopOutput(result.stdout);
    expect(output.decision).toBe('block');
  });

  it('exits 0 (fail-open) on API error for main session', () => {
    const result = runHook(HOOK, {}, {
      ATEAM_API_URL: 'http://localhost:99999',
    });
    expect(result.exitCode).toBe(0);
    const output = parseStopOutput(result.stdout);
    expect(output.decision).not.toBe('block');
  });
});
