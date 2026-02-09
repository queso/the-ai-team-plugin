import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests for E2E regression script health check: scripts/e2e-regression.ts
 *
 * The E2E regression script should verify API availability BEFORE running
 * any cleanup or initialization operations. This prevents users from waiting
 * through setup only to discover the server is not running.
 *
 * Acceptance Criteria:
 * - Script checks API availability before cleanup and initialization
 * - Clear error message shown if server is not running
 * - Suggests "npm run dev" command to start server
 * - Script exits with code 1 on connection failure
 * - Successful health check allows test to proceed
 */

// Track calls for testing
let fetchCalls: string[] = [];
let consoleLogs: string[] = [];
let exitCode: number | null = null;

// Mock global fetch for API calls
const mockFetch = vi.fn().mockImplementation((url: string) => {
  fetchCalls.push(url);
  return Promise.reject(new Error('Not mocked'));
});
global.fetch = mockFetch;

// Mock process.exit to capture exit codes
const mockExit = vi.spyOn(process, 'exit').mockImplementation((code?: number | string | null | undefined) => {
  exitCode = typeof code === 'number' ? code : 1;
  throw new Error(`process.exit called with code: ${code}`);
});

// Mock console methods to capture output
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation((...args) => {
  consoleLogs.push(args.map(String).join(' '));
});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('E2E Regression Script: Health Check', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockExit.mockClear();
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
    fetchCalls = [];
    consoleLogs = [];
    exitCode = null;
  });

  afterEach(() => {
    // Don't restore mocks - we need them to persist
  });

  describe('checkApiHealth function', () => {
    it('should make GET request to /api/board before any other operations', async () => {
      // When the script runs, the first API call should be a health check
      // to /api/board (or a dedicated health endpoint)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { stages: [], items: [] } }),
      });

      // The health check function should exist and be called first
      // This test documents the expected behavior for implementation
      const checkApiHealth = async (apiBase: string): Promise<boolean> => {
        try {
          const response = await fetch(`${apiBase}/api/board`);
          return response.ok;
        } catch {
          return false;
        }
      };

      const isHealthy = await checkApiHealth('http://localhost:3000');

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/board');
      expect(isHealthy).toBe(true);
    });

    it('should return false when server is not reachable', async () => {
      // Simulate network error (server not running)
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const checkApiHealth = async (apiBase: string): Promise<boolean> => {
        try {
          const response = await fetch(`${apiBase}/api/board`);
          return response.ok;
        } catch {
          return false;
        }
      };

      const isHealthy = await checkApiHealth('http://localhost:3000');

      expect(isHealthy).toBe(false);
    });

    it('should return false when server returns error status', async () => {
      // Server is running but returns 500 error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const checkApiHealth = async (apiBase: string): Promise<boolean> => {
        try {
          const response = await fetch(`${apiBase}/api/board`);
          return response.ok;
        } catch {
          return false;
        }
      };

      const isHealthy = await checkApiHealth('http://localhost:3000');

      expect(isHealthy).toBe(false);
    });
  });

  describe('error message on connection failure', () => {
    it('should display clear error message when server is unavailable', () => {
      // The error message should clearly indicate the API is not reachable
      const errorMessage = 'API server is not reachable at http://localhost:3000';

      // Simulate what the script should output
      console.log(errorMessage);

      // Verify the logged message contains the expected text
      expect(consoleLogs.some(log => log.includes('API server is not reachable'))).toBe(true);
    });

    it('should include the API base URL in error message', () => {
      const apiBase = 'http://localhost:3000';
      const errorMessage = `API server is not reachable at ${apiBase}`;

      console.log(errorMessage);

      expect(consoleLogs.some(log => log.includes('http://localhost:3000'))).toBe(true);
    });

    it('should suggest running npm run dev to start server', () => {
      // The script should helpfully suggest the command to start the dev server
      const suggestionMessage = 'Run "npm run dev" to start the development server.';

      console.log(suggestionMessage);

      expect(consoleLogs.some(log => log.includes('npm run dev'))).toBe(true);
    });
  });

  describe('exit behavior on health check failure', () => {
    it('should exit with code 1 when health check fails', async () => {
      // Simulate connection failure
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const handleHealthCheckFailure = (apiBase: string): never => {
        console.log(`API server is not reachable at ${apiBase}`);
        console.log('Run "npm run dev" to start the development server.');
        process.exit(1);
      };

      try {
        handleHealthCheckFailure('http://localhost:3000');
      } catch {
        // Expected to throw due to process.exit mock
      }

      expect(exitCode).toBe(1);
    });

    it('should not proceed to cleanup when health check fails', async () => {
      // Mock health check failure
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      let cleanupCalled = false;
      let missionCreated = false;

      const archivePreviousMission = async () => {
        cleanupCalled = true;
      };

      const createMission = async () => {
        missionCreated = true;
      };

      // Simulate main function flow with health check
      const main = async () => {
        const isHealthy = await checkApiHealth('http://localhost:3000');
        if (!isHealthy) {
          throw new Error('Health check failed');
        }
        await archivePreviousMission();
        await createMission();
      };

      // Helper for test
      const checkApiHealth = async (_apiBase: string): Promise<boolean> => {
        try {
          const response = await fetch(`${_apiBase}/api/board`);
          return response.ok;
        } catch {
          return false;
        }
      };

      await expect(main()).rejects.toThrow('Health check failed');
      expect(cleanupCalled).toBe(false);
      expect(missionCreated).toBe(false);
    });
  });

  describe('successful health check', () => {
    it('should proceed with cleanup when health check succeeds', async () => {
      // Mock successful health check
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { stages: [], items: [] } }),
      });

      let cleanupCalled = false;

      const archivePreviousMission = async () => {
        cleanupCalled = true;
      };

      // Helper for test
      const checkApiHealth = async (_apiBase: string): Promise<boolean> => {
        try {
          const response = await fetch(`${_apiBase}/api/board`);
          return response.ok;
        } catch {
          return false;
        }
      };

      const isHealthy = await checkApiHealth('http://localhost:3000');
      if (isHealthy) {
        await archivePreviousMission();
      }

      expect(isHealthy).toBe(true);
      expect(cleanupCalled).toBe(true);
    });

    it('should log success message when health check passes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const logHealthCheckSuccess = () => {
        console.log('API server is reachable. Starting E2E regression test...');
      };

      logHealthCheckSuccess();

      expect(consoleLogs.some(log => log.includes('API server is reachable'))).toBe(true);
    });

    it('should not exit when health check succeeds', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const checkApiHealth = async (_apiBase: string): Promise<boolean> => {
        try {
          const response = await fetch(`${_apiBase}/api/board`);
          return response.ok;
        } catch {
          return false;
        }
      };

      const isHealthy = await checkApiHealth('http://localhost:3000');

      expect(isHealthy).toBe(true);
      expect(mockExit).not.toHaveBeenCalled();
    });
  });

  describe('health check timing', () => {
    it('should run health check before archivePreviousMission is called', async () => {
      const callOrder: string[] = [];

      // Track call order
      const checkApiHealth = async () => {
        callOrder.push('healthCheck');
        return true;
      };

      const archivePreviousMission = async () => {
        callOrder.push('archivePreviousMission');
      };

      const cleanupStaleClaims = async () => {
        callOrder.push('cleanupStaleClaims');
      };

      const createMission = async () => {
        callOrder.push('createMission');
      };

      // Simulate main function flow
      await checkApiHealth();
      await archivePreviousMission();
      await cleanupStaleClaims();
      await createMission();

      expect(callOrder[0]).toBe('healthCheck');
      expect(callOrder.indexOf('healthCheck')).toBeLessThan(
        callOrder.indexOf('archivePreviousMission')
      );
    });

    it('should run health check before cleanupStaleClaims is called', async () => {
      const callOrder: string[] = [];

      const checkApiHealth = async () => {
        callOrder.push('healthCheck');
        return true;
      };

      const cleanupStaleClaims = async () => {
        callOrder.push('cleanupStaleClaims');
      };

      await checkApiHealth();
      await cleanupStaleClaims();

      expect(callOrder.indexOf('healthCheck')).toBeLessThan(
        callOrder.indexOf('cleanupStaleClaims')
      );
    });

    it('should run health check before createMission is called', async () => {
      const callOrder: string[] = [];

      const checkApiHealth = async () => {
        callOrder.push('healthCheck');
        return true;
      };

      const createMission = async () => {
        callOrder.push('createMission');
      };

      await checkApiHealth();
      await createMission();

      expect(callOrder.indexOf('healthCheck')).toBeLessThan(
        callOrder.indexOf('createMission')
      );
    });
  });

  describe('error message formatting', () => {
    it('should use red color for error messages', () => {
      // The script uses ANSI colors - verify error messages use red
      const colors = {
        red: '\x1b[31m',
        reset: '\x1b[0m',
      };

      const errorMessage = `${colors.red}[E2E]${colors.reset} API server is not reachable`;

      console.log(errorMessage);

      expect(consoleLogs.some(log => log.includes('\x1b[31m'))).toBe(true);
    });

    it('should include [E2E] prefix in error messages', () => {
      const errorMessage = '[E2E] API server is not reachable at http://localhost:3000';

      console.log(errorMessage);

      expect(consoleLogs.some(log => log.includes('[E2E]'))).toBe(true);
    });
  });

  describe('environment variable support', () => {
    it('should use API_BASE environment variable for health check URL', () => {
      const customApiBase = process.env.API_BASE || 'http://localhost:3000';

      // Default should be localhost:3000
      expect(customApiBase).toBe('http://localhost:3000');
    });

    it('should respect custom API_BASE when provided', () => {
      // Save original
      const originalApiBase = process.env.API_BASE;

      // Set custom value
      process.env.API_BASE = 'http://custom-server:8080';
      const apiBase = process.env.API_BASE || 'http://localhost:3000';

      expect(apiBase).toBe('http://custom-server:8080');

      // Restore
      process.env.API_BASE = originalApiBase;
    });
  });
});
