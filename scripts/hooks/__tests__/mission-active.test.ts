import { describe, it, expect, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';

/**
 * Helper: run a small Node script that imports mission-active.js and calls a function.
 * We shell out to test in isolation with controlled env vars.
 */
function runScript(code: string, env: Record<string, string> = {}) {
  const fullEnv = {
    ...process.env,
    ATEAM_PROJECT_ID: 'test-mission-active',
    ...env,
  };

  try {
    const stdout = execFileSync(
      'node',
      ['--input-type=module', '-e', code],
      {
        env: fullEnv,
        encoding: 'utf8',
        timeout: 10000,
        cwd: join(__dirname, '..'),
      }
    );
    return { stdout: stdout.trim(), exitCode: 0 };
  } catch (err: any) {
    return {
      stdout: (err.stdout || '').trim(),
      exitCode: err.status,
    };
  }
}

const MARKER_PATH = join(tmpdir(), '.ateam-mission-active-test-mission-active');

describe('mission-active', () => {
  afterEach(() => {
    // Clean up marker file after each test
    try {
      unlinkSync(MARKER_PATH);
    } catch {
      /* ignore */
    }
  });

  it('isMissionActive() returns false when no marker file exists', () => {
    // Ensure marker doesn't exist
    try {
      unlinkSync(MARKER_PATH);
    } catch {
      /* ignore */
    }

    const result = runScript(`
      import { isMissionActive } from './lib/mission-active.js';
      console.log(JSON.stringify({ active: isMissionActive() }));
    `);

    expect(result.exitCode).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.active).toBe(false);
  });

  it('setMissionActive() creates marker, then isMissionActive() returns true', () => {
    const result = runScript(`
      import { setMissionActive, isMissionActive } from './lib/mission-active.js';
      setMissionActive();
      console.log(JSON.stringify({ active: isMissionActive() }));
    `);

    expect(result.exitCode).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.active).toBe(true);
    expect(existsSync(MARKER_PATH)).toBe(true);
  });

  it('clearMissionActive() removes marker, then isMissionActive() returns false', () => {
    // Set first, then clear
    const result = runScript(`
      import { setMissionActive, clearMissionActive, isMissionActive } from './lib/mission-active.js';
      setMissionActive();
      clearMissionActive();
      console.log(JSON.stringify({ active: isMissionActive() }));
    `);

    expect(result.exitCode).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.active).toBe(false);
    expect(existsSync(MARKER_PATH)).toBe(false);
  });

  it('uses ATEAM_PROJECT_ID from env var for marker path', () => {
    const customMarker = join(tmpdir(), '.ateam-mission-active-custom-proj');
    try {
      unlinkSync(customMarker);
    } catch {
      /* ignore */
    }

    const result = runScript(
      `
      import { setMissionActive, isMissionActive } from './lib/mission-active.js';
      setMissionActive();
      console.log(JSON.stringify({ active: isMissionActive() }));
    `,
      { ATEAM_PROJECT_ID: 'custom-proj' }
    );

    expect(result.exitCode).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.active).toBe(true);
    expect(existsSync(customMarker)).toBe(true);

    // Clean up
    try {
      unlinkSync(customMarker);
    } catch {
      /* ignore */
    }
  });

  it('clearMissionActive() is graceful when marker already cleared', () => {
    // Ensure no marker exists, then clear — should not throw
    try {
      unlinkSync(MARKER_PATH);
    } catch {
      /* ignore */
    }

    const result = runScript(`
      import { clearMissionActive } from './lib/mission-active.js';
      clearMissionActive();
      clearMissionActive(); // double-clear
      console.log('ok');
    `);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('ok');
  });
});
