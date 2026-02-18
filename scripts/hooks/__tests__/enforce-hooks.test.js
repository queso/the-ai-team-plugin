import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import { join } from 'path';
import { readFileSync, existsSync, unlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';

const COMPLETION_HOOK = join(__dirname, '..', 'enforce-completion-log.js');
const FINAL_REVIEW_HOOK = join(__dirname, '..', 'enforce-final-review.js');
const AMY_TEST_WRITES_HOOK = join(__dirname, '..', 'block-amy-test-writes.js');
const TRACK_BROWSER_HOOK = join(__dirname, '..', 'track-browser-usage.js');
const BROWSER_VERIFICATION_HOOK = join(__dirname, '..', 'enforce-browser-verification.js');

/**
 * Helper: run a hook script as a child process with given env vars.
 * Returns { stdout, stderr, exitCode }.
 *
 * The hooks should be refactored to:
 *   1. Query the A(i)-Team API (via fetch) instead of reading board.json
 *   2. Support __TEST_MOCK_RESPONSE__ env var for testability (JSON string
 *      that the hook uses instead of a real fetch when present)
 *   3. Reference MCP tools in error messages, not legacy scripts
 */
function runHook(hookPath, env = {}) {
  const fullEnv = {
    ...process.env,
    ATEAM_API_URL: 'http://localhost:3000',
    ATEAM_PROJECT_ID: 'test-project',
    ...env,
  };

  try {
    const stdout = execFileSync('node', [hookPath], {
      env: fullEnv,
      encoding: 'utf8',
      timeout: 10000,
    });
    return { stdout: stdout.trim(), stderr: '', exitCode: 0 };
  } catch (err) {
    return {
      stdout: (err.stdout || '').trim(),
      stderr: (err.stderr || '').trim(),
      exitCode: err.status,
    };
  }
}

/**
 * Verify the hook source code does NOT contain filesystem-based board.json reads.
 * This is a static check that proves the hooks have been migrated from filesystem to API.
 */
function assertNoFilesystemBoardReads(hookPath) {
  const source = readFileSync(hookPath, 'utf8');
  expect(source).not.toMatch(/readFileSync.*board\.json/);
  expect(source).not.toMatch(/existsSync.*board/);
  expect(source).not.toMatch(/mission\/board\.json/);
}

// =============================================================================
// enforce-completion-log.js
// =============================================================================
describe('enforce-completion-log', () => {
  describe('no filesystem board.json reads', () => {
    it('should not import or use readFileSync/existsSync for board.json', () => {
      // Static check: the source code must not read board.json from disk
      assertNoFilesystemBoardReads(COMPLETION_HOOK);
    });

    it('should not reference mission/board.json path anywhere in source', () => {
      const source = readFileSync(COMPLETION_HOOK, 'utf8');
      expect(source).not.toMatch(/mission\/board\.json/);
      expect(source).not.toMatch(/missionDir/);
    });
  });

  describe('API querying', () => {
    it('should use fetch to query the API for item work_log', () => {
      // The hook source should contain fetch() calls to the API
      const source = readFileSync(COMPLETION_HOOK, 'utf8');
      expect(source).toMatch(/fetch\s*\(/);
      // Should reference ATEAM_API_URL env var
      expect(source).toMatch(/ATEAM_API_URL/);
      // Should reference ATEAM_PROJECT_ID env var
      expect(source).toMatch(/ATEAM_PROJECT_ID/);
    });
  });

  describe('blocking when agent_stop not called', () => {
    it('should block with decision:block when API reports empty work_log', () => {
      // __TEST_MOCK_RESPONSE__ env var lets us provide a fake API response
      // for the item endpoint. The hook checks work_log for agent entries.
      const result = runHook(COMPLETION_HOOK, {
        ITEM_ID: 'WI-007',
        AGENT_NAME: 'murdock',
        AGENT_OUTPUT: 'I am done with my work on item WI-007',
        __TEST_MOCK_RESPONSE__: JSON.stringify({
          id: 'WI-007',
          work_log: [],
          assigned_agent: 'Murdock',
        }),
      });

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.decision).toBe('block');
      expect(output.additionalContext).toBeDefined();
    });

    it('should include agent_stop MCP tool reference in block message', () => {
      const result = runHook(COMPLETION_HOOK, {
        ITEM_ID: 'WI-007',
        AGENT_NAME: 'murdock',
        AGENT_OUTPUT: 'Done with work on WI-007',
        __TEST_MOCK_RESPONSE__: JSON.stringify({
          id: 'WI-007',
          work_log: [],
          assigned_agent: 'Murdock',
        }),
      });

      const output = JSON.parse(result.stdout);
      expect(output.decision).toBe('block');
      // Must reference MCP agent_stop tool
      expect(output.additionalContext).toMatch(/agent_stop/);
    });

    it('should NOT reference legacy item-agent-stop.js in block message', () => {
      const result = runHook(COMPLETION_HOOK, {
        ITEM_ID: 'WI-007',
        AGENT_NAME: 'murdock',
        AGENT_OUTPUT: 'Done with work on WI-007',
        __TEST_MOCK_RESPONSE__: JSON.stringify({
          id: 'WI-007',
          work_log: [],
          assigned_agent: 'Murdock',
        }),
      });

      const output = JSON.parse(result.stdout);
      expect(output.decision).toBe('block');
      // Must NOT reference legacy script
      expect(output.additionalContext).not.toMatch(/item-agent-stop\.js/);
      expect(output.additionalContext).not.toMatch(/scripts\/item-agent-stop/);
    });
  });

  describe('allowing when agent_stop was called', () => {
    it('should allow stop (empty JSON) when work_log has matching agent entry', () => {
      const result = runHook(COMPLETION_HOOK, {
        ITEM_ID: 'WI-007',
        AGENT_NAME: 'murdock',
        AGENT_OUTPUT: 'Called agent_stop, work complete.',
        __TEST_MOCK_RESPONSE__: JSON.stringify({
          id: 'WI-007',
          work_log: [
            { agent: 'murdock', status: 'success', summary: 'Created 5 test cases' },
          ],
          assigned_agent: null,
        }),
      });

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      // Should be empty or at least not block
      expect(output.decision).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should allow stop when no ITEM_ID can be determined', () => {
      const result = runHook(COMPLETION_HOOK, {
        AGENT_OUTPUT: 'Generic output with no item reference',
        ITEM_ID: '',
        AGENT_NAME: '',
      });

      expect(result.exitCode).toBe(0);
      if (result.stdout) {
        const output = JSON.parse(result.stdout);
        expect(output.decision).not.toBe('block');
      }
    });

    it('should handle API connection errors gracefully (allow stop)', () => {
      // When API is unreachable and no mock, should not crash
      const result = runHook(COMPLETION_HOOK, {
        ITEM_ID: 'WI-007',
        AGENT_NAME: 'murdock',
        ATEAM_API_URL: 'http://localhost:99999',
      });

      // Should not crash - exit 0 and allow
      expect(result.exitCode).toBe(0);
    });

    it('should handle missing ATEAM_API_URL gracefully', () => {
      const result = runHook(COMPLETION_HOOK, {
        ITEM_ID: 'WI-007',
        AGENT_NAME: 'murdock',
        ATEAM_API_URL: '',
        ATEAM_PROJECT_ID: '',
      });

      expect(result.exitCode).toBe(0);
    });
  });

});

// =============================================================================
// enforce-final-review.js
// =============================================================================
describe('enforce-final-review', () => {
  describe('no filesystem board.json reads', () => {
    it('should not import or use readFileSync/existsSync for board.json', () => {
      assertNoFilesystemBoardReads(FINAL_REVIEW_HOOK);
    });

    it('should not reference mission/board.json path anywhere in source', () => {
      const source = readFileSync(FINAL_REVIEW_HOOK, 'utf8');
      expect(source).not.toMatch(/mission\/board\.json/);
      expect(source).not.toMatch(/missionDir/);
    });
  });

  describe('API querying', () => {
    it('should use fetch to query the API for board and mission state', () => {
      const source = readFileSync(FINAL_REVIEW_HOOK, 'utf8');
      expect(source).toMatch(/fetch\s*\(/);
      expect(source).toMatch(/ATEAM_API_URL/);
      expect(source).toMatch(/ATEAM_PROJECT_ID/);
    });
  });

  describe('blocking - items not all done', () => {
    it('should exit 2 when items are still in active stages', () => {
      const result = runHook(FINAL_REVIEW_HOOK, {
        __TEST_MOCK_BOARD__: JSON.stringify({
          columns: {
            testing: [{ id: 'WI-001' }],
            implementing: [{ id: 'WI-002' }],
            done: [{ id: 'WI-003' }],
          },
        }),
        __TEST_MOCK_MISSION__: JSON.stringify({
          status: 'active',
        }),
      });

      expect(result.exitCode).toBe(2);
      expect(result.stderr).toMatch(/incomplete|still in progress|not.*done/i);
    });
  });

  describe('blocking - final review not complete', () => {
    it('should exit 2 when all items done but no final_review_verdict', () => {
      const result = runHook(FINAL_REVIEW_HOOK, {
        __TEST_MOCK_BOARD__: JSON.stringify({
          columns: {
            done: [{ id: 'WI-001' }, { id: 'WI-002' }],
          },
        }),
        __TEST_MOCK_MISSION__: JSON.stringify({
          status: 'active',
          final_review_verdict: null,
          postcheck: null,
        }),
      });

      expect(result.exitCode).toBe(2);
      expect(result.stderr).toMatch(/final.*review/i);
    });
  });

  describe('blocking - postchecks not passed', () => {
    it('should exit 2 when final review done but postchecks not passed', () => {
      const result = runHook(FINAL_REVIEW_HOOK, {
        __TEST_MOCK_BOARD__: JSON.stringify({
          columns: {
            done: [{ id: 'WI-001' }, { id: 'WI-002' }],
          },
        }),
        __TEST_MOCK_MISSION__: JSON.stringify({
          status: 'active',
          final_review_verdict: 'approved',
          postcheck: { passed: false },
        }),
      });

      expect(result.exitCode).toBe(2);
      expect(result.stderr).toMatch(/post.*check/i);
    });

    it('should reference mission_postcheck MCP tool in postcheck error', () => {
      const result = runHook(FINAL_REVIEW_HOOK, {
        __TEST_MOCK_BOARD__: JSON.stringify({
          columns: {
            done: [{ id: 'WI-001' }],
          },
        }),
        __TEST_MOCK_MISSION__: JSON.stringify({
          status: 'active',
          final_review_verdict: 'approved',
          postcheck: null,
        }),
      });

      expect(result.exitCode).toBe(2);
      // Must reference the MCP tool name
      expect(result.stderr).toMatch(/mission_postcheck/);
    });

    it('should NOT reference legacy mission-postcheck.js script', () => {
      const result = runHook(FINAL_REVIEW_HOOK, {
        __TEST_MOCK_BOARD__: JSON.stringify({
          columns: {
            done: [{ id: 'WI-001' }],
          },
        }),
        __TEST_MOCK_MISSION__: JSON.stringify({
          status: 'active',
          final_review_verdict: 'approved',
          postcheck: null,
        }),
      });

      expect(result.exitCode).toBe(2);
      expect(result.stderr).not.toMatch(/mission-postcheck\.js/);
      expect(result.stderr).not.toMatch(/scripts\/mission-postcheck/);
    });
  });

  describe('allowing stop', () => {
    it('should exit 0 when all items done, final review passed, postchecks passed', () => {
      const result = runHook(FINAL_REVIEW_HOOK, {
        __TEST_MOCK_BOARD__: JSON.stringify({
          columns: {
            done: [{ id: 'WI-001' }, { id: 'WI-002' }],
          },
        }),
        __TEST_MOCK_MISSION__: JSON.stringify({
          status: 'active',
          final_review_verdict: 'approved',
          postcheck: { passed: true },
        }),
      });

      expect(result.exitCode).toBe(0);
    });

    it('should exit 0 when no active mission exists', () => {
      const result = runHook(FINAL_REVIEW_HOOK, {
        __TEST_MOCK_NO_MISSION__: 'true',
      });

      expect(result.exitCode).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle API connection errors gracefully (exit 0)', () => {
      const result = runHook(FINAL_REVIEW_HOOK, {
        ATEAM_API_URL: 'http://localhost:99999',
      });

      expect(result.exitCode).toBe(0);
    });

    it('should handle missing ATEAM_PROJECT_ID gracefully (exit 0)', () => {
      const result = runHook(FINAL_REVIEW_HOOK, {
        ATEAM_PROJECT_ID: '',
      });

      expect(result.exitCode).toBe(0);
    });
  });
});

// =============================================================================
// block-amy-test-writes.js
// =============================================================================
describe('block-amy-test-writes', () => {
  it('should block writes to .test.ts files', () => {
    const result = runHook(AMY_TEST_WRITES_HOOK, {
      TOOL_INPUT: JSON.stringify({ file_path: 'src/__tests__/feature-raptor.test.ts' }),
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toMatch(/BLOCKED/);
  });

  it('should block writes to .spec.tsx files', () => {
    const result = runHook(AMY_TEST_WRITES_HOOK, {
      TOOL_INPUT: JSON.stringify({ file_path: 'src/components/Button.spec.tsx' }),
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toMatch(/BLOCKED/);
  });

  it('should block writes to raptor files', () => {
    const result = runHook(AMY_TEST_WRITES_HOOK, {
      TOOL_INPUT: JSON.stringify({ file_path: 'src/raptor-investigation.js' }),
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toMatch(/BLOCKED.*raptor/i);
  });

  it('should allow non-test writes like /tmp/debug.js', () => {
    const result = runHook(AMY_TEST_WRITES_HOOK, {
      TOOL_INPUT: JSON.stringify({ file_path: '/tmp/debug.js' }),
    });
    expect(result.exitCode).toBe(0);
  });

  it('should allow writes with no file path', () => {
    const result = runHook(AMY_TEST_WRITES_HOOK, {
      TOOL_INPUT: JSON.stringify({}),
    });
    expect(result.exitCode).toBe(0);
  });
});

// =============================================================================
// track-browser-usage.js
// =============================================================================
describe('track-browser-usage', () => {
  const markerPath = join(tmpdir(), '.ateam-browser-verified-test-project');

  afterEach(() => {
    // Clean up marker file after each test
    try { unlinkSync(markerPath); } catch { /* ignore */ }
  });

  it('should create marker file when Playwright MCP tool is called', () => {
    const result = runHook(TRACK_BROWSER_HOOK, {
      TOOL_NAME: 'mcp__plugin_playwright_playwright__browser_navigate',
      TOOL_INPUT: JSON.stringify({ url: 'http://localhost:3000' }),
    });

    expect(result.exitCode).toBe(0);
    expect(existsSync(markerPath)).toBe(true);
  });

  it('should create marker file when agent-browser skill is called', () => {
    const result = runHook(TRACK_BROWSER_HOOK, {
      TOOL_NAME: 'Skill',
      TOOL_INPUT: JSON.stringify({ skill: 'agent-browser' }),
    });

    expect(result.exitCode).toBe(0);
    expect(existsSync(markerPath)).toBe(true);
  });

  it('should NOT create marker file for non-browser tools', () => {
    const result = runHook(TRACK_BROWSER_HOOK, {
      TOOL_NAME: 'Read',
      TOOL_INPUT: JSON.stringify({ file_path: 'src/index.ts' }),
    });

    expect(result.exitCode).toBe(0);
    expect(existsSync(markerPath)).toBe(false);
  });

  it('should NOT create marker file for non-agent-browser skills', () => {
    const result = runHook(TRACK_BROWSER_HOOK, {
      TOOL_NAME: 'Skill',
      TOOL_INPUT: JSON.stringify({ skill: 'commit' }),
    });

    expect(result.exitCode).toBe(0);
    expect(existsSync(markerPath)).toBe(false);
  });

  it('should exit 0 (non-blocking) regardless of tool', () => {
    const result = runHook(TRACK_BROWSER_HOOK, {
      TOOL_NAME: 'mcp__plugin_playwright_playwright__browser_snapshot',
    });

    expect(result.exitCode).toBe(0);
  });

  it('should handle missing project ID gracefully', () => {
    const defaultMarker = join(tmpdir(), '.ateam-browser-verified-default');
    try { unlinkSync(defaultMarker); } catch { /* ignore */ }

    const result = runHook(TRACK_BROWSER_HOOK, {
      TOOL_NAME: 'mcp__plugin_playwright_playwright__browser_click',
      ATEAM_PROJECT_ID: '',
    });

    expect(result.exitCode).toBe(0);
    expect(existsSync(defaultMarker)).toBe(true);
    try { unlinkSync(defaultMarker); } catch { /* ignore */ }
  });
});

// =============================================================================
// enforce-browser-verification.js
// =============================================================================
describe('enforce-browser-verification', () => {
  const markerPath = join(tmpdir(), '.ateam-browser-verified-test-project');

  afterEach(() => {
    // Clean up marker file after each test
    try { unlinkSync(markerPath); } catch { /* ignore */ }
  });

  describe('allowing when browser testing done', () => {
    it('should allow stop when marker file exists (browser testing done)', () => {
      // Create the marker file to simulate browser usage
      writeFileSync(markerPath, new Date().toISOString());

      const result = runHook(BROWSER_VERIFICATION_HOOK, {
        AGENT_NAME: 'amy',
        ITEM_ID: 'WI-001',
        AGENT_OUTPUT: 'VERIFIED - All probes pass',
        __TEST_MOCK_RESPONSE__: JSON.stringify({
          id: 'WI-001',
          work_log: [{ agent: 'amy', summary: 'VERIFIED' }],
        }),
      });

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.decision).toBeUndefined();
    });

    it('should clean up marker file after allowing stop', () => {
      writeFileSync(markerPath, new Date().toISOString());

      runHook(BROWSER_VERIFICATION_HOOK, {
        AGENT_NAME: 'amy',
        ITEM_ID: 'WI-001',
        __TEST_MOCK_RESPONSE__: JSON.stringify({
          id: 'WI-001',
          work_log: [{ agent: 'amy', summary: 'VERIFIED' }],
        }),
      });

      expect(existsSync(markerPath)).toBe(false);
    });
  });

  describe('blocking when no browser testing', () => {
    it('should block when no marker file and no NO_UI in summary', () => {
      const result = runHook(BROWSER_VERIFICATION_HOOK, {
        AGENT_NAME: 'amy',
        ITEM_ID: 'WI-001',
        AGENT_OUTPUT: 'VERIFIED - Code looks good from static analysis',
        __TEST_MOCK_RESPONSE__: JSON.stringify({
          id: 'WI-001',
          work_log: [{ agent: 'amy', summary: 'VERIFIED - All tests pass' }],
        }),
      });

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.decision).toBe('block');
      expect(output.additionalContext).toBeDefined();
    });

    it('should reference Playwright tools in block message', () => {
      const result = runHook(BROWSER_VERIFICATION_HOOK, {
        AGENT_NAME: 'amy',
        ITEM_ID: 'WI-001',
        AGENT_OUTPUT: 'VERIFIED',
        __TEST_MOCK_RESPONSE__: JSON.stringify({
          id: 'WI-001',
          work_log: [{ agent: 'amy', summary: 'VERIFIED' }],
        }),
      });

      const output = JSON.parse(result.stdout);
      expect(output.decision).toBe('block');
      expect(output.additionalContext).toMatch(/mcp__plugin_playwright/);
      expect(output.additionalContext).toMatch(/agent-browser/);
    });

    it('should mention NO_UI_COMPONENT escape hatch in block message', () => {
      const result = runHook(BROWSER_VERIFICATION_HOOK, {
        AGENT_NAME: 'amy',
        ITEM_ID: 'WI-001',
        AGENT_OUTPUT: 'VERIFIED',
        __TEST_MOCK_RESPONSE__: JSON.stringify({
          id: 'WI-001',
          work_log: [{ agent: 'amy', summary: 'VERIFIED' }],
        }),
      });

      const output = JSON.parse(result.stdout);
      expect(output.additionalContext).toMatch(/NO_UI_COMPONENT/);
    });
  });

  describe('NO_UI escape hatch', () => {
    it('should allow when summary contains NO_UI_COMPONENT', () => {
      const result = runHook(BROWSER_VERIFICATION_HOOK, {
        AGENT_NAME: 'amy',
        ITEM_ID: 'WI-001',
        AGENT_OUTPUT: 'VERIFIED - NO_UI_COMPONENT - This is a backend service',
        __TEST_MOCK_RESPONSE__: JSON.stringify({
          id: 'WI-001',
          work_log: [{ agent: 'amy', summary: 'VERIFIED - NO_UI_COMPONENT' }],
        }),
      });

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.decision).toBeUndefined();
    });

    it('should allow when summary contains API-only', () => {
      const result = runHook(BROWSER_VERIFICATION_HOOK, {
        AGENT_NAME: 'amy',
        ITEM_ID: 'WI-001',
        AGENT_OUTPUT: 'VERIFIED - API-only feature, no browser needed',
        __TEST_MOCK_RESPONSE__: JSON.stringify({
          id: 'WI-001',
          work_log: [{ agent: 'amy', summary: 'VERIFIED - API-only service' }],
        }),
      });

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.decision).toBeUndefined();
    });

    it('should allow when summary contains backend-only', () => {
      const result = runHook(BROWSER_VERIFICATION_HOOK, {
        AGENT_NAME: 'amy',
        ITEM_ID: 'WI-001',
        AGENT_OUTPUT: 'VERIFIED - backend-only change',
        __TEST_MOCK_RESPONSE__: JSON.stringify({
          id: 'WI-001',
          work_log: [{ agent: 'amy', summary: 'VERIFIED - backend-only' }],
        }),
      });

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.decision).toBeUndefined();
    });
  });

  describe('non-Amy agents', () => {
    it('should allow when agent is not amy (skip enforcement)', () => {
      const result = runHook(BROWSER_VERIFICATION_HOOK, {
        AGENT_NAME: 'murdock',
        ITEM_ID: 'WI-001',
        __TEST_MOCK_RESPONSE__: JSON.stringify({
          id: 'WI-001',
          work_log: [],
        }),
      });

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.decision).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should allow when API is unreachable (fail-open)', () => {
      const result = runHook(BROWSER_VERIFICATION_HOOK, {
        AGENT_NAME: 'amy',
        ITEM_ID: 'WI-001',
        ATEAM_API_URL: 'http://localhost:99999',
        AGENT_OUTPUT: 'VERIFIED',
      });

      expect(result.exitCode).toBe(0);
    });

    it('should allow when no mock and no API config', () => {
      const result = runHook(BROWSER_VERIFICATION_HOOK, {
        AGENT_NAME: 'amy',
        ITEM_ID: 'WI-001',
        ATEAM_API_URL: '',
        ATEAM_PROJECT_ID: '',
        AGENT_OUTPUT: 'VERIFIED',
      });

      // With no API and no mock, summary check gets empty string
      // and no NO_UI pattern matches - but the hook should still
      // handle this gracefully
      expect(result.exitCode).toBe(0);
    });
  });
});
