/**
 * Tests for enforce-orchestrator-boundary.js — allowlist expansion.
 *
 * The hook is being changed from a blocklist approach (blocking src/, test
 * files, named directories) to an allowlist approach: Hannibal can ONLY
 * write to ateam.config.json, .claude/*, /tmp/*, /var/*. Everything else
 * is blocked.
 *
 * Worker agents (ba, murdock, etc.) are NOT subject to this hook — it only
 * fires for the main session (Hannibal). Agent detection uses resolveAgent().
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'child_process';
import { join } from 'path';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';

// Mission-active marker — tests that expect enforcement need this file to exist
const MISSION_MARKER = join(tmpdir(), '.ateam-mission-active-test-project');
function setMissionMarker() {
  writeFileSync(MISSION_MARKER, new Date().toISOString());
}
function clearMissionMarker() {
  try { unlinkSync(MISSION_MARKER); } catch { /* ignore */ }
}

const HOOK = join(__dirname, '..', 'enforce-orchestrator-boundary.js');

/**
 * Run the hook as a child process with given stdin JSON and env.
 * The hook uses lookupAgent(sessionId) from observer.js to determine if
 * a worker is active. With no session map, a session with no agent_type
 * is treated as the main session (Hannibal).
 */
function runHook(stdin: object = {}, env: Record<string, string> = {}) {
  const fullEnv = {
    ...process.env,
    ATEAM_API_URL: 'http://localhost:3000',
    ATEAM_PROJECT_ID: 'test-project',
    ...env,
  };
  try {
    const stdout = execFileSync('node', [HOOK], {
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

// =============================================================================
// Static code checks
// =============================================================================
describe('enforce-orchestrator-boundary — static checks', () => {
  it('uses resolveAgent() for agent detection', () => {
    const source = readFileSync(HOOK, 'utf8');
    expect(source).toMatch(/resolveAgent/);
    expect(source).toMatch(/resolve-agent/);
  });

  it('references allowlist (ateam.config.json) not just blocklist patterns', () => {
    const source = readFileSync(HOOK, 'utf8');
    expect(source).toMatch(/ateam\.config\.json/);
  });
});

// =============================================================================
// Hannibal — BLOCKED writes (outside allowlist)
// =============================================================================
describe('enforce-orchestrator-boundary — Hannibal blocked writes', () => {
  // In the main session, no agent_type is set (Hannibal is the main context)
  // Mission marker must exist for enforcement to kick in
  beforeAll(() => setMissionMarker());
  afterAll(() => clearMissionMarker());

  it('blocks Hannibal writing .env.example', () => {
    const result = runHook({
      tool_name: 'Write',
      tool_input: { file_path: '.env.example' },
      // no agent_type = main session
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toMatch(/BLOCKED/i);
  });

  it('blocks Hannibal writing Dockerfile', () => {
    const result = runHook({
      tool_name: 'Write',
      tool_input: { file_path: 'Dockerfile' },
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toMatch(/BLOCKED/i);
  });

  it('blocks Hannibal writing package.json', () => {
    const result = runHook({
      tool_name: 'Write',
      tool_input: { file_path: 'package.json' },
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toMatch(/BLOCKED/i);
  });

  it('blocks Hannibal writing src/index.ts', () => {
    const result = runHook({
      tool_name: 'Write',
      tool_input: { file_path: 'src/index.ts' },
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toMatch(/BLOCKED/i);
  });

  it('blocks Hannibal editing src/ files', () => {
    const result = runHook({
      tool_name: 'Edit',
      tool_input: { file_path: 'src/services/auth.ts' },
    });
    expect(result.exitCode).toBe(2);
  });

  it('blocks Hannibal writing test files', () => {
    const result = runHook({
      tool_name: 'Write',
      tool_input: { file_path: 'src/__tests__/auth.test.ts' },
    });
    expect(result.exitCode).toBe(2);
  });

  it('blocks Hannibal writing arbitrary project files (e.g. scripts/run.sh)', () => {
    const result = runHook({
      tool_name: 'Write',
      tool_input: { file_path: 'scripts/run.sh' },
    });
    expect(result.exitCode).toBe(2);
  });
});

// =============================================================================
// Hannibal — ALLOWED writes (within allowlist)
// =============================================================================
describe('enforce-orchestrator-boundary — Hannibal allowed writes', () => {
  it('allows Hannibal writing ateam.config.json', () => {
    const result = runHook({
      tool_name: 'Write',
      tool_input: { file_path: 'ateam.config.json' },
    });
    expect(result.exitCode).toBe(0);
  });

  it('allows Hannibal writing .claude/settings.local.json', () => {
    const result = runHook({
      tool_name: 'Write',
      tool_input: { file_path: '.claude/settings.local.json' },
    });
    expect(result.exitCode).toBe(0);
  });

  it('allows Hannibal writing any .claude/ file', () => {
    const result = runHook({
      tool_name: 'Write',
      tool_input: { file_path: '.claude/commands/custom.md' },
    });
    expect(result.exitCode).toBe(0);
  });

  it('allows Hannibal writing to /tmp/', () => {
    const result = runHook({
      tool_name: 'Write',
      tool_input: { file_path: '/tmp/notes.md' },
    });
    expect(result.exitCode).toBe(0);
  });

  it('allows Hannibal writing to /var/', () => {
    const result = runHook({
      tool_name: 'Write',
      tool_input: { file_path: '/var/tmp/scratch.txt' },
    });
    expect(result.exitCode).toBe(0);
  });
});

// =============================================================================
// Worker agents — NOT affected by this hook
// =============================================================================
describe('enforce-orchestrator-boundary — worker agents not affected', () => {
  it('allows ba to write src/ files (exit 0)', () => {
    const result = runHook({
      agent_type: 'ba',
      tool_name: 'Write',
      tool_input: { file_path: 'src/services/auth.ts' },
    });
    expect(result.exitCode).toBe(0);
  });

  it('allows murdock to write test files (exit 0)', () => {
    const result = runHook({
      agent_type: 'murdock',
      tool_name: 'Write',
      tool_input: { file_path: 'src/__tests__/auth.test.ts' },
    });
    expect(result.exitCode).toBe(0);
  });

  it('allows tawnia to write docs/ files (exit 0)', () => {
    const result = runHook({
      agent_type: 'tawnia',
      tool_name: 'Write',
      tool_input: { file_path: 'docs/CHANGELOG.md' },
    });
    expect(result.exitCode).toBe(0);
  });

  it('allows amy to write /tmp/ files (exit 0)', () => {
    const result = runHook({
      agent_type: 'amy',
      tool_name: 'Write',
      tool_input: { file_path: '/tmp/debug.txt' },
    });
    expect(result.exitCode).toBe(0);
  });

  it('allows ai-team: prefixed worker (ai-team:ba) (exit 0)', () => {
    const result = runHook({
      agent_type: 'ai-team:ba',
      tool_name: 'Write',
      tool_input: { file_path: 'src/index.ts' },
    });
    expect(result.exitCode).toBe(0);
  });
});

// =============================================================================
// Legacy mode: resolveAgent() returns null → still enforce for Hannibal
// =============================================================================
describe('enforce-orchestrator-boundary — legacy mode (null agent)', () => {
  beforeAll(() => setMissionMarker());
  afterAll(() => clearMissionMarker());

  it('blocks when no agent_type and no session map entry (null → treat as Hannibal)', () => {
    // No agent_type means main session. resolveAgent returns null but hook
    // should still enforce the allowlist for the main context.
    const result = runHook({
      tool_name: 'Write',
      tool_input: { file_path: 'src/index.ts' },
      // No agent_type, no session_id that maps to a worker
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toMatch(/BLOCKED/i);
  });

  it('allows ateam.config.json even with null agent (main session setup)', () => {
    const result = runHook({
      tool_name: 'Write',
      tool_input: { file_path: 'ateam.config.json' },
    });
    expect(result.exitCode).toBe(0);
  });
});

// =============================================================================
// Playwright block still works
// =============================================================================
describe('enforce-orchestrator-boundary — Playwright block', () => {
  beforeAll(() => setMissionMarker());
  afterAll(() => clearMissionMarker());

  it('blocks Playwright browser_navigate for main session', () => {
    const result = runHook({
      tool_name: 'mcp__plugin_playwright_playwright__browser_navigate',
      tool_input: { url: 'http://localhost:3000' },
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toMatch(/BLOCKED/i);
  });

  it('blocks Playwright browser_snapshot for main session', () => {
    const result = runHook({
      tool_name: 'mcp__plugin_playwright_playwright__browser_snapshot',
      tool_input: {},
    });
    expect(result.exitCode).toBe(2);
  });

  it('does NOT block Playwright for worker agents (amy can use browser)', () => {
    const result = runHook({
      agent_type: 'amy',
      tool_name: 'mcp__plugin_playwright_playwright__browser_navigate',
      tool_input: { url: 'http://localhost:3000' },
    });
    expect(result.exitCode).toBe(0);
  });
});

// =============================================================================
// Mission-active guard: no marker = no enforcement
// =============================================================================
describe('enforce-orchestrator-boundary — mission-active guard', () => {
  // Ensure no marker exists for these tests
  beforeAll(() => clearMissionMarker());
  afterAll(() => clearMissionMarker());

  it('allows writes when no mission is active (no marker file)', () => {
    const result = runHook({
      tool_name: 'Write',
      tool_input: { file_path: 'src/index.ts' },
      // no agent_type = main session, but no mission marker
    });
    expect(result.exitCode).toBe(0);
  });

  it('allows Playwright when no mission is active', () => {
    const result = runHook({
      tool_name: 'mcp__plugin_playwright_playwright__browser_navigate',
      tool_input: { url: 'http://localhost:3000' },
    });
    expect(result.exitCode).toBe(0);
  });
});

// =============================================================================
// Absolute .claude/ path support
// =============================================================================
describe('enforce-orchestrator-boundary — absolute .claude/ paths', () => {
  beforeAll(() => setMissionMarker());
  afterAll(() => clearMissionMarker());

  it('allows absolute path containing /.claude/', () => {
    const result = runHook({
      tool_name: 'Write',
      tool_input: { file_path: '/Users/josh/Code/my-project/.claude/settings.local.json' },
    });
    expect(result.exitCode).toBe(0);
  });

  it('allows absolute path to nested .claude/ file', () => {
    const result = runHook({
      tool_name: 'Write',
      tool_input: { file_path: '/home/user/project/.claude/commands/deploy.md' },
    });
    expect(result.exitCode).toBe(0);
  });
});

// =============================================================================
// Edge cases
// =============================================================================
describe('enforce-orchestrator-boundary — edge cases', () => {
  it('exits 0 for non-Write/Edit tools in main session', () => {
    const result = runHook({
      tool_name: 'Bash',
      tool_input: { command: 'npm run status' },
    });
    expect(result.exitCode).toBe(0);
  });

  it('exits 0 for Read tool in main session', () => {
    const result = runHook({
      tool_name: 'Read',
      tool_input: { file_path: 'src/index.ts' },
    });
    expect(result.exitCode).toBe(0);
  });

  it('exits 0 for Write with no file_path (nothing to block)', () => {
    const result = runHook({
      tool_name: 'Write',
      tool_input: {},
    });
    expect(result.exitCode).toBe(0);
  });

  it('exits 0 on stdin parse error (fail-open)', () => {
    const fullEnv = { ...process.env, ATEAM_PROJECT_ID: 'test-project' };
    try {
      execFileSync('node', [HOOK], {
        env: fullEnv,
        encoding: 'utf8',
        timeout: 5000,
        input: 'not valid json',
      });
    } catch (err: any) {
      expect(err.status).not.toBe(2);
    }
  });
});
