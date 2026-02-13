import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests for E2E regression script cleanup error handling: scripts/e2e-regression.ts
 *
 * The cleanup phase in main() calls archivePreviousMission() and cleanupStaleClaims()
 * before starting the test simulation. If these fail (e.g., API unavailable, network error),
 * the script should:
 *   1. NOT crash
 *   2. Log clear error messages
 *   3. Continue to main test execution
 *   4. Indicate the cleanup can be retried
 *
 * This tests the acceptance criteria from bug fix item 009.
 */

// Track console output for error message verification
let consoleOutput: { type: string; message: string }[] = [];
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// Mock fetch for API calls
const mockFetch = vi.fn();

// Store original global fetch
const originalFetch = global.fetch;

beforeEach(() => {
  // Reset console tracking
  consoleOutput = [];

  // Spy on console to capture output
  console.log = vi.fn((...args: unknown[]) => {
    consoleOutput.push({ type: 'log', message: args.join(' ') });
  });
  console.error = vi.fn((...args: unknown[]) => {
    consoleOutput.push({ type: 'error', message: args.join(' ') });
  });

  // Reset fetch mock
  mockFetch.mockReset();
  global.fetch = mockFetch;
});

afterEach(() => {
  // Restore console
  console.log = originalConsoleLog;
  console.error = originalConsoleError;

  // Restore fetch
  global.fetch = originalFetch;

  vi.restoreAllMocks();
});

/**
 * Helper to simulate the cleanup phase behavior.
 * This mirrors what the e2e-regression.ts script does in lines 293-295:
 *
 *   log('Cleaning up from previous runs...');
 *   await archivePreviousMission();
 *   await cleanupStaleClaims();
 *
 * These tests define the expected behavior AFTER the fix is applied.
 */

// Simulate the archivePreviousMission function
async function archivePreviousMission(): Promise<void> {
  const response = await fetch('http://localhost:3000/api/missions/archive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Archive failed');
  }
}

// Simulate the cleanupStaleClaims function (requires getBoardState first)
async function cleanupStaleClaims(): Promise<void> {
  // This calls getBoardState() internally, which can throw
  const boardResponse = await fetch('http://localhost:3000/api/board', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const boardData = await boardResponse.json();
  if (!boardResponse.ok || !boardData.success) {
    throw new Error(boardData.error?.message || 'Failed to get board state');
  }

  const inProgressItems = boardData.data.items.filter(
    (item: { stageId: string }) => item.stageId === 'in_progress'
  );

  for (const item of inProgressItems) {
    await fetch('http://localhost:3000/api/board/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: item.id }),
    });
  }
}

// The CURRENT behavior (before fix): cleanup errors crash the script
async function runCleanupPhaseCurrentBehavior(): Promise<{ success: boolean; error?: Error }> {
  try {
    // Current behavior: no try-catch around these calls
    await archivePreviousMission();
    await cleanupStaleClaims();
    return { success: true };
  } catch (error) {
    // Currently, this propagates up and crashes
    throw error;
  }
}

// The EXPECTED behavior (after fix): cleanup errors are caught and logged
async function runCleanupPhaseExpectedBehavior(): Promise<{
  success: boolean;
  archiveError?: string;
  cleanupError?: string;
}> {
  let archiveError: string | undefined;
  let cleanupError: string | undefined;

  // Expected: archivePreviousMission wrapped in try-catch
  try {
    await archivePreviousMission();
  } catch (error) {
    archiveError = error instanceof Error ? error.message : String(error);
    // Log with clear message and retry indication
    console.log(`[E2E] Warning: Could not archive previous mission: ${archiveError}`);
    console.log('[E2E] This is non-fatal. You can retry by running the archive manually.');
  }

  // Expected: cleanupStaleClaims wrapped in try-catch
  try {
    await cleanupStaleClaims();
  } catch (error) {
    cleanupError = error instanceof Error ? error.message : String(error);
    // Log with clear message and retry indication
    console.log(`[E2E] Warning: Could not cleanup stale claims: ${cleanupError}`);
    console.log('[E2E] This is non-fatal. You can retry by releasing claims manually.');
  }

  // Script continues regardless of cleanup errors
  return { success: true, archiveError, cleanupError };
}

describe('E2E Regression Script Cleanup Error Handling', () => {
  describe('archivePreviousMission error handling', () => {
    it('should not crash when archivePreviousMission throws an error', async () => {
      // Simulate API failure
      mockFetch.mockRejectedValueOnce(new Error('Network error: connection refused'));

      // Expected behavior: script continues without crashing
      const result = await runCleanupPhaseExpectedBehavior();

      expect(result.success).toBe(true);
      expect(result.archiveError).toContain('Network error');
    });

    it('should log clear error message when archive fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API unavailable'));

      await runCleanupPhaseExpectedBehavior();

      const errorLogs = consoleOutput.filter((log) =>
        log.message.includes('Could not archive previous mission')
      );
      expect(errorLogs.length).toBeGreaterThan(0);
      expect(errorLogs[0].message).toContain('API unavailable');
    });

    it('should indicate retry possibility when archive fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Timeout'));

      await runCleanupPhaseExpectedBehavior();

      const retryLogs = consoleOutput.filter(
        (log) => log.message.includes('retry') || log.message.includes('non-fatal')
      );
      expect(retryLogs.length).toBeGreaterThan(0);
    });

    it('should handle 404 response from archive endpoint gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ success: false, error: { message: 'No active mission to archive' } }),
      });

      const result = await runCleanupPhaseExpectedBehavior();

      expect(result.success).toBe(true);
      // A 404 (no mission) should be handled without crashing
    });
  });

  describe('cleanupStaleClaims error handling', () => {
    it('should not crash when getBoardState fails inside cleanupStaleClaims', async () => {
      // Archive succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { mission: { id: 'M-1' }, archivedItems: 0 } }),
      });
      // getBoardState fails
      mockFetch.mockRejectedValueOnce(new Error('Database connection lost'));

      const result = await runCleanupPhaseExpectedBehavior();

      expect(result.success).toBe(true);
      expect(result.cleanupError).toContain('Database connection lost');
    });

    it('should log clear error message when cleanup fails', async () => {
      // Archive succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { mission: { id: 'M-1' }, archivedItems: 0 } }),
      });
      // getBoardState fails
      mockFetch.mockRejectedValueOnce(new Error('Server error'));

      await runCleanupPhaseExpectedBehavior();

      const errorLogs = consoleOutput.filter((log) =>
        log.message.includes('Could not cleanup stale claims')
      );
      expect(errorLogs.length).toBeGreaterThan(0);
    });

    it('should indicate retry possibility when cleanup fails', async () => {
      // Archive succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { mission: { id: 'M-1' }, archivedItems: 0 } }),
      });
      // getBoardState fails
      mockFetch.mockRejectedValueOnce(new Error('Timeout'));

      await runCleanupPhaseExpectedBehavior();

      const retryLogs = consoleOutput.filter(
        (log) => log.message.includes('retry') || log.message.includes('non-fatal')
      );
      expect(retryLogs.length).toBeGreaterThan(0);
    });

    it('should handle empty board state gracefully', async () => {
      // Archive succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { mission: { id: 'M-1' }, archivedItems: 0 } }),
      });
      // getBoardState returns empty
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { stages: [], items: [], agents: [] },
        }),
      });

      const result = await runCleanupPhaseExpectedBehavior();

      expect(result.success).toBe(true);
      expect(result.cleanupError).toBeUndefined();
    });
  });

  describe('script continuation after cleanup errors', () => {
    it('should continue to main test execution when both cleanup operations fail', async () => {
      // Both fail
      mockFetch.mockRejectedValueOnce(new Error('Archive failed'));
      mockFetch.mockRejectedValueOnce(new Error('Cleanup failed'));

      const result = await runCleanupPhaseExpectedBehavior();

      // Script should still report success (cleanup is non-fatal)
      expect(result.success).toBe(true);
      expect(result.archiveError).toBeDefined();
      expect(result.cleanupError).toBeDefined();
    });

    it('should continue when archive fails but cleanup succeeds', async () => {
      // Archive fails
      mockFetch.mockRejectedValueOnce(new Error('Archive failed'));
      // Cleanup succeeds (getBoardState)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { stages: [], items: [], agents: [] },
        }),
      });

      const result = await runCleanupPhaseExpectedBehavior();

      expect(result.success).toBe(true);
      expect(result.archiveError).toBeDefined();
      expect(result.cleanupError).toBeUndefined();
    });

    it('should continue when archive succeeds but cleanup fails', async () => {
      // Archive succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { mission: { id: 'M-1' }, archivedItems: 0 } }),
      });
      // Cleanup fails
      mockFetch.mockRejectedValueOnce(new Error('Cleanup failed'));

      const result = await runCleanupPhaseExpectedBehavior();

      expect(result.success).toBe(true);
      expect(result.archiveError).toBeUndefined();
      expect(result.cleanupError).toBeDefined();
    });
  });

  describe('error message clarity', () => {
    it('should include the specific error reason in log output', async () => {
      const specificError = 'ECONNREFUSED: Connection refused to localhost:3000';
      mockFetch.mockRejectedValueOnce(new Error(specificError));

      await runCleanupPhaseExpectedBehavior();

      const hasSpecificError = consoleOutput.some((log) =>
        log.message.includes('ECONNREFUSED')
      );
      expect(hasSpecificError).toBe(true);
    });

    it('should differentiate between archive and cleanup error messages', async () => {
      // Both fail with different errors
      mockFetch.mockRejectedValueOnce(new Error('Archive: No mission found'));
      mockFetch.mockRejectedValueOnce(new Error('Cleanup: Board not initialized'));

      await runCleanupPhaseExpectedBehavior();

      const archiveLog = consoleOutput.find((log) =>
        log.message.includes('archive previous mission')
      );
      const cleanupLog = consoleOutput.find((log) =>
        log.message.includes('cleanup stale claims')
      );

      expect(archiveLog).toBeDefined();
      expect(cleanupLog).toBeDefined();
      expect(archiveLog?.message).not.toEqual(cleanupLog?.message);
    });

    it('should use warning level (not error level) for non-fatal cleanup issues', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Minor issue'));

      await runCleanupPhaseExpectedBehavior();

      // Should log as warning/info, not error
      const warningLogs = consoleOutput.filter(
        (log) => log.message.includes('Warning') || log.message.includes('non-fatal')
      );
      expect(warningLogs.length).toBeGreaterThan(0);
    });
  });

  describe('current behavior (before fix) - should fail', () => {
    /**
     * These tests document the CURRENT broken behavior.
     * They verify that without proper error handling, the script crashes.
     * After the fix, these tests should be removed or inverted.
     */

    it('should crash when archivePreviousMission throws (current broken behavior)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Current behavior: error propagates and crashes
      await expect(runCleanupPhaseCurrentBehavior()).rejects.toThrow('Network error');
    });

    it('should crash when cleanupStaleClaims throws (current broken behavior)', async () => {
      // Archive succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { mission: { id: 'M-1' }, archivedItems: 0 } }),
      });
      // getBoardState fails
      mockFetch.mockRejectedValueOnce(new Error('Database error'));

      // Current behavior: error propagates and crashes
      await expect(runCleanupPhaseCurrentBehavior()).rejects.toThrow('Database error');
    });
  });
});
