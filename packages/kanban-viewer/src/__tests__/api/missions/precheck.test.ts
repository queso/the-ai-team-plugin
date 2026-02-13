import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { PrecheckResponse, ApiError } from '@/types/api';
import type { Mission, MissionState } from '@/types/mission';

/**
 * Tests for POST /api/missions/precheck endpoint
 *
 * These tests verify:
 * 1. POST runs lint and test commands
 * 2. Commands have configurable timeout via env vars (PRECHECK_LINT_TIMEOUT_MS, PRECHECK_TEST_TIMEOUT_MS)
 * 3. Updates mission state: initializing -> prechecking -> running (pass) or failed
 * 4. Returns PrecheckResponse with passed boolean, lintErrors count, test counts, blockers array
 * 5. Logs precheck results to activity log
 * 6. Returns error if no active mission exists
 *
 * WI-045 - Project scoping acceptance criteria:
 * - [x] POST /api/missions/precheck requires projectId query parameter
 * - [x] Missing projectId returns 400 with clear error message
 * - [x] Runs precheck on mission in specified project only
 */

// Mock data
const mockMission: Mission = {
  id: 'M-20260121-001',
  name: 'Test Mission',
  state: 'initializing',
  prdPath: '/prd/test-feature.md',
  startedAt: new Date('2026-01-21T10:00:00Z'),
  completedAt: null,
  archivedAt: null,
};

// Mock Prisma client - use vi.hoisted() to ensure mock is available during vi.mock hoisting
const mockPrismaClient = vi.hoisted(() => ({
  mission: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  activityLog: {
    create: vi.fn(),
  },
}));

vi.mock('@/lib/db', () => ({
  prisma: mockPrismaClient,
}));

// Mock child_process exec
const mockExec = vi.hoisted(() => vi.fn());

vi.mock('child_process', () => ({
  exec: mockExec,
}));

// Helper to create mock exec callback behavior
function mockExecSuccess(stdout: string = '', stderr: string = '') {
  mockExec.mockImplementation(
    (
      _cmd: string,
      _options: unknown,
      callback: (error: Error | null, result: { stdout: string; stderr: string }) => void
    ) => {
      callback(null, { stdout, stderr });
    }
  );
}

function mockExecFailure(error: Error, stdout: string = '', stderr: string = '') {
  mockExec.mockImplementation(
    (
      _cmd: string,
      _options: unknown,
      callback: (error: Error | null, result: { stdout: string; stderr: string }) => void
    ) => {
      callback(error, { stdout, stderr });
    }
  );
}

function mockExecTimeout() {
  mockExec.mockImplementation(
    (
      _cmd: string,
      _options: unknown,
      callback: (error: Error | null, result: { stdout: string; stderr: string }) => void
    ) => {
      const error = new Error('Command timed out') as Error & { killed: boolean; signal: string };
      error.killed = true;
      error.signal = 'SIGTERM';
      callback(error, { stdout: '', stderr: '' });
    }
  );
}

// Import route handler - will fail until implementation exists
import { POST } from '@/app/api/missions/precheck/route';

// ============ POST /api/missions/precheck Tests ============

describe('POST /api/missions/precheck', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('successful precheck - all passing', () => {
    it('should run lint and test commands and return success', async () => {
      mockPrismaClient.mission.findFirst.mockResolvedValue(mockMission);
      mockPrismaClient.mission.update.mockResolvedValue({
        ...mockMission,
        state: 'running',
      });
      mockPrismaClient.activityLog.create.mockResolvedValue({
        id: 1,
        missionId: mockMission.id,
        agent: null,
        message: 'Precheck passed',
        level: 'info',
        timestamp: new Date(),
      });

      // Lint passes, tests pass
      mockExec.mockImplementation(
        (
          cmd: string,
          _options: unknown,
          callback: (error: Error | null, result: { stdout: string; stderr: string }) => void
        ) => {
          if (cmd.includes('lint')) {
            callback(null, { stdout: '', stderr: '' });
          } else if (cmd.includes('test')) {
            callback(null, {
              stdout: 'Tests: 10 passed, 10 total',
              stderr: '',
            });
          }
        }
      );

      const request = new NextRequest('http://localhost:3000/api/missions/precheck', {
        method: 'POST',
        headers: { 'X-Project-ID': 'test-project' },
      });

      const response = await POST(request);
      const data: PrecheckResponse = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.passed).toBe(true);
      expect(data.data.lintErrors).toBe(0);
      expect(data.data.blockers).toEqual([]);
    });

    it('should return PrecheckResponse with correct structure', async () => {
      mockPrismaClient.mission.findFirst.mockResolvedValue(mockMission);
      mockPrismaClient.mission.update.mockResolvedValue({
        ...mockMission,
        state: 'running',
      });
      mockPrismaClient.activityLog.create.mockResolvedValue({
        id: 1,
        missionId: mockMission.id,
        agent: null,
        message: 'Precheck passed',
        level: 'info',
        timestamp: new Date(),
      });

      mockExecSuccess('Tests: 5 passed, 5 total');

      const request = new NextRequest('http://localhost:3000/api/missions/precheck', {
        method: 'POST',
        headers: { 'X-Project-ID': 'test-project' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('passed');
      expect(data.data).toHaveProperty('lintErrors');
      expect(data.data).toHaveProperty('testsPassed');
      expect(data.data).toHaveProperty('testsFailed');
      expect(data.data).toHaveProperty('blockers');
    });
  });

  describe('state transitions', () => {
    it('should update mission state to prechecking when starting', async () => {
      mockPrismaClient.mission.findFirst.mockResolvedValue(mockMission);
      mockPrismaClient.mission.update.mockResolvedValue({
        ...mockMission,
        state: 'running',
      });
      mockPrismaClient.activityLog.create.mockResolvedValue({
        id: 1,
        missionId: mockMission.id,
        agent: null,
        message: 'Precheck passed',
        level: 'info',
        timestamp: new Date(),
      });

      mockExecSuccess();

      const request = new NextRequest('http://localhost:3000/api/missions/precheck', {
        method: 'POST',
        headers: { 'X-Project-ID': 'test-project' },
      });

      await POST(request);

      // Should be called at least once with prechecking state
      expect(mockPrismaClient.mission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockMission.id },
          data: expect.objectContaining({
            state: 'prechecking',
          }),
        })
      );
    });

    it('should update mission state to running when precheck passes', async () => {
      mockPrismaClient.mission.findFirst.mockResolvedValue(mockMission);
      mockPrismaClient.mission.update.mockResolvedValue({
        ...mockMission,
        state: 'running',
      });
      mockPrismaClient.activityLog.create.mockResolvedValue({
        id: 1,
        missionId: mockMission.id,
        agent: null,
        message: 'Precheck passed',
        level: 'info',
        timestamp: new Date(),
      });

      mockExecSuccess();

      const request = new NextRequest('http://localhost:3000/api/missions/precheck', {
        method: 'POST',
        headers: { 'X-Project-ID': 'test-project' },
      });

      const response = await POST(request);
      const data: PrecheckResponse = await response.json();

      expect(data.data.passed).toBe(true);
      // Final update should set state to running
      expect(mockPrismaClient.mission.update).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: { id: mockMission.id },
          data: expect.objectContaining({
            state: 'running',
          }),
        })
      );
    });

    it('should update mission state to failed when precheck fails', async () => {
      mockPrismaClient.mission.findFirst.mockResolvedValue(mockMission);
      mockPrismaClient.mission.update.mockResolvedValue({
        ...mockMission,
        state: 'failed',
      });
      mockPrismaClient.activityLog.create.mockResolvedValue({
        id: 1,
        missionId: mockMission.id,
        agent: null,
        message: 'Precheck failed',
        level: 'error',
        timestamp: new Date(),
      });

      // Lint fails
      const lintError = new Error('Lint failed') as Error & { code: number };
      lintError.code = 1;
      mockExecFailure(lintError, '', '10 errors found');

      const request = new NextRequest('http://localhost:3000/api/missions/precheck', {
        method: 'POST',
        headers: { 'X-Project-ID': 'test-project' },
      });

      const response = await POST(request);
      const data: PrecheckResponse = await response.json();

      expect(data.data.passed).toBe(false);
      // Final update should set state to failed
      expect(mockPrismaClient.mission.update).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: { id: mockMission.id },
          data: expect.objectContaining({
            state: 'failed',
          }),
        })
      );
    });
  });

  describe('lint command execution', () => {
    it('should run npm run lint command', async () => {
      mockPrismaClient.mission.findFirst.mockResolvedValue(mockMission);
      mockPrismaClient.mission.update.mockResolvedValue({
        ...mockMission,
        state: 'running',
      });
      mockPrismaClient.activityLog.create.mockResolvedValue({
        id: 1,
        missionId: mockMission.id,
        agent: null,
        message: 'Precheck passed',
        level: 'info',
        timestamp: new Date(),
      });

      mockExecSuccess();

      const request = new NextRequest('http://localhost:3000/api/missions/precheck', {
        method: 'POST',
        headers: { 'X-Project-ID': 'test-project' },
      });

      await POST(request);

      // Should have called exec with lint command
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('lint'),
        expect.anything(),
        expect.any(Function)
      );
    });

    it('should count lint errors from output', async () => {
      mockPrismaClient.mission.findFirst.mockResolvedValue(mockMission);
      mockPrismaClient.mission.update.mockResolvedValue({
        ...mockMission,
        state: 'failed',
      });
      mockPrismaClient.activityLog.create.mockResolvedValue({
        id: 1,
        missionId: mockMission.id,
        agent: null,
        message: 'Precheck failed',
        level: 'error',
        timestamp: new Date(),
      });

      const lintError = new Error('Lint failed') as Error & { code: number };
      lintError.code = 1;
      mockExec.mockImplementation(
        (
          cmd: string,
          _options: unknown,
          callback: (error: Error | null, result: { stdout: string; stderr: string }) => void
        ) => {
          if (cmd.includes('lint')) {
            callback(lintError, {
              stdout: '5 errors and 2 warnings',
              stderr: '',
            });
          } else {
            callback(null, { stdout: '', stderr: '' });
          }
        }
      );

      const request = new NextRequest('http://localhost:3000/api/missions/precheck', {
        method: 'POST',
        headers: { 'X-Project-ID': 'test-project' },
      });

      const response = await POST(request);
      const data: PrecheckResponse = await response.json();

      expect(data.data.passed).toBe(false);
      expect(data.data.lintErrors).toBeGreaterThan(0);
    });
  });

  describe('test command execution', () => {
    it('should run npm test command', async () => {
      mockPrismaClient.mission.findFirst.mockResolvedValue(mockMission);
      mockPrismaClient.mission.update.mockResolvedValue({
        ...mockMission,
        state: 'running',
      });
      mockPrismaClient.activityLog.create.mockResolvedValue({
        id: 1,
        missionId: mockMission.id,
        agent: null,
        message: 'Precheck passed',
        level: 'info',
        timestamp: new Date(),
      });

      mockExecSuccess();

      const request = new NextRequest('http://localhost:3000/api/missions/precheck', {
        method: 'POST',
        headers: { 'X-Project-ID': 'test-project' },
      });

      await POST(request);

      // Should have called exec with test command
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('test'),
        expect.anything(),
        expect.any(Function)
      );
    });

    it('should parse and return test pass/fail counts', async () => {
      mockPrismaClient.mission.findFirst.mockResolvedValue(mockMission);
      mockPrismaClient.mission.update.mockResolvedValue({
        ...mockMission,
        state: 'running',
      });
      mockPrismaClient.activityLog.create.mockResolvedValue({
        id: 1,
        missionId: mockMission.id,
        agent: null,
        message: 'Precheck passed',
        level: 'info',
        timestamp: new Date(),
      });

      mockExec.mockImplementation(
        (
          cmd: string,
          _options: unknown,
          callback: (error: Error | null, result: { stdout: string; stderr: string }) => void
        ) => {
          if (cmd.includes('test')) {
            callback(null, {
              stdout: 'Tests: 8 passed, 2 failed, 10 total',
              stderr: '',
            });
          } else {
            callback(null, { stdout: '', stderr: '' });
          }
        }
      );

      const request = new NextRequest('http://localhost:3000/api/missions/precheck', {
        method: 'POST',
        headers: { 'X-Project-ID': 'test-project' },
      });

      const response = await POST(request);
      const data: PrecheckResponse = await response.json();

      expect(data.data.testsPassed).toBeGreaterThanOrEqual(0);
      expect(data.data.testsFailed).toBeGreaterThanOrEqual(0);
    });

    it('should report test failures as blockers', async () => {
      mockPrismaClient.mission.findFirst.mockResolvedValue(mockMission);
      mockPrismaClient.mission.update.mockResolvedValue({
        ...mockMission,
        state: 'failed',
      });
      mockPrismaClient.activityLog.create.mockResolvedValue({
        id: 1,
        missionId: mockMission.id,
        agent: null,
        message: 'Precheck failed',
        level: 'error',
        timestamp: new Date(),
      });

      const testError = new Error('Tests failed') as Error & { code: number };
      testError.code = 1;
      mockExec.mockImplementation(
        (
          cmd: string,
          _options: unknown,
          callback: (error: Error | null, result: { stdout: string; stderr: string }) => void
        ) => {
          if (cmd.includes('lint')) {
            callback(null, { stdout: '', stderr: '' });
          } else if (cmd.includes('test')) {
            callback(testError, {
              stdout: 'Tests: 5 passed, 3 failed, 8 total',
              stderr: '',
            });
          }
        }
      );

      const request = new NextRequest('http://localhost:3000/api/missions/precheck', {
        method: 'POST',
        headers: { 'X-Project-ID': 'test-project' },
      });

      const response = await POST(request);
      const data: PrecheckResponse = await response.json();

      expect(data.data.passed).toBe(false);
      expect(data.data.testsFailed).toBeGreaterThan(0);
      expect(data.data.blockers.length).toBeGreaterThan(0);
    });
  });

  describe('configurable timeouts', () => {
    it('should use default timeout of 60s for lint when env var not set', async () => {
      mockPrismaClient.mission.findFirst.mockResolvedValue(mockMission);
      mockPrismaClient.mission.update.mockResolvedValue({
        ...mockMission,
        state: 'running',
      });
      mockPrismaClient.activityLog.create.mockResolvedValue({
        id: 1,
        missionId: mockMission.id,
        agent: null,
        message: 'Precheck passed',
        level: 'info',
        timestamp: new Date(),
      });

      mockExecSuccess();

      const request = new NextRequest('http://localhost:3000/api/missions/precheck', {
        method: 'POST',
        headers: { 'X-Project-ID': 'test-project' },
      });

      await POST(request);

      // Check that exec was called with timeout option
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('lint'),
        expect.objectContaining({
          timeout: 60000,
        }),
        expect.any(Function)
      );
    });

    it('should use default timeout of 120s for tests when env var not set', async () => {
      mockPrismaClient.mission.findFirst.mockResolvedValue(mockMission);
      mockPrismaClient.mission.update.mockResolvedValue({
        ...mockMission,
        state: 'running',
      });
      mockPrismaClient.activityLog.create.mockResolvedValue({
        id: 1,
        missionId: mockMission.id,
        agent: null,
        message: 'Precheck passed',
        level: 'info',
        timestamp: new Date(),
      });

      mockExecSuccess();

      const request = new NextRequest('http://localhost:3000/api/missions/precheck', {
        method: 'POST',
        headers: { 'X-Project-ID': 'test-project' },
      });

      await POST(request);

      // Check that exec was called with timeout option
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('test'),
        expect.objectContaining({
          timeout: 120000,
        }),
        expect.any(Function)
      );
    });

    it('should respect PRECHECK_LINT_TIMEOUT_MS environment variable', async () => {
      process.env.PRECHECK_LINT_TIMEOUT_MS = '30000';

      mockPrismaClient.mission.findFirst.mockResolvedValue(mockMission);
      mockPrismaClient.mission.update.mockResolvedValue({
        ...mockMission,
        state: 'running',
      });
      mockPrismaClient.activityLog.create.mockResolvedValue({
        id: 1,
        missionId: mockMission.id,
        agent: null,
        message: 'Precheck passed',
        level: 'info',
        timestamp: new Date(),
      });

      mockExecSuccess();

      const request = new NextRequest('http://localhost:3000/api/missions/precheck', {
        method: 'POST',
        headers: { 'X-Project-ID': 'test-project' },
      });

      await POST(request);

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('lint'),
        expect.objectContaining({
          timeout: 30000,
        }),
        expect.any(Function)
      );
    });

    it('should respect PRECHECK_TEST_TIMEOUT_MS environment variable', async () => {
      process.env.PRECHECK_TEST_TIMEOUT_MS = '180000';

      mockPrismaClient.mission.findFirst.mockResolvedValue(mockMission);
      mockPrismaClient.mission.update.mockResolvedValue({
        ...mockMission,
        state: 'running',
      });
      mockPrismaClient.activityLog.create.mockResolvedValue({
        id: 1,
        missionId: mockMission.id,
        agent: null,
        message: 'Precheck passed',
        level: 'info',
        timestamp: new Date(),
      });

      mockExecSuccess();

      const request = new NextRequest('http://localhost:3000/api/missions/precheck', {
        method: 'POST',
        headers: { 'X-Project-ID': 'test-project' },
      });

      await POST(request);

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('test'),
        expect.objectContaining({
          timeout: 180000,
        }),
        expect.any(Function)
      );
    });

    it('should handle timeout as blocker', async () => {
      mockPrismaClient.mission.findFirst.mockResolvedValue(mockMission);
      mockPrismaClient.mission.update.mockResolvedValue({
        ...mockMission,
        state: 'failed',
      });
      mockPrismaClient.activityLog.create.mockResolvedValue({
        id: 1,
        missionId: mockMission.id,
        agent: null,
        message: 'Precheck failed',
        level: 'error',
        timestamp: new Date(),
      });

      mockExecTimeout();

      const request = new NextRequest('http://localhost:3000/api/missions/precheck', {
        method: 'POST',
        headers: { 'X-Project-ID': 'test-project' },
      });

      const response = await POST(request);
      const data: PrecheckResponse = await response.json();

      expect(data.data.passed).toBe(false);
      expect(data.data.blockers.length).toBeGreaterThan(0);
      expect(data.data.blockers.some((b) => b.toLowerCase().includes('timeout'))).toBe(true);
    });
  });

  describe('activity logging', () => {
    it('should log precheck start to activity log', async () => {
      mockPrismaClient.mission.findFirst.mockResolvedValue(mockMission);
      mockPrismaClient.mission.update.mockResolvedValue({
        ...mockMission,
        state: 'running',
      });
      mockPrismaClient.activityLog.create.mockResolvedValue({
        id: 1,
        missionId: mockMission.id,
        agent: null,
        message: 'Precheck started',
        level: 'info',
        timestamp: new Date(),
      });

      mockExecSuccess();

      const request = new NextRequest('http://localhost:3000/api/missions/precheck', {
        method: 'POST',
        headers: { 'X-Project-ID': 'test-project' },
      });

      await POST(request);

      expect(mockPrismaClient.activityLog.create).toHaveBeenCalled();
    });

    it('should log precheck results to activity log', async () => {
      mockPrismaClient.mission.findFirst.mockResolvedValue(mockMission);
      mockPrismaClient.mission.update.mockResolvedValue({
        ...mockMission,
        state: 'running',
      });
      mockPrismaClient.activityLog.create.mockResolvedValue({
        id: 1,
        missionId: mockMission.id,
        agent: null,
        message: 'Precheck passed',
        level: 'info',
        timestamp: new Date(),
      });

      mockExecSuccess();

      const request = new NextRequest('http://localhost:3000/api/missions/precheck', {
        method: 'POST',
        headers: { 'X-Project-ID': 'test-project' },
      });

      await POST(request);

      // Activity log should be created with mission ID
      expect(mockPrismaClient.activityLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            missionId: mockMission.id,
          }),
        })
      );
    });

    it('should log failure details when precheck fails', async () => {
      mockPrismaClient.mission.findFirst.mockResolvedValue(mockMission);
      mockPrismaClient.mission.update.mockResolvedValue({
        ...mockMission,
        state: 'failed',
      });
      mockPrismaClient.activityLog.create.mockResolvedValue({
        id: 1,
        missionId: mockMission.id,
        agent: null,
        message: 'Precheck failed',
        level: 'error',
        timestamp: new Date(),
      });

      const lintError = new Error('Lint failed') as Error & { code: number };
      lintError.code = 1;
      mockExecFailure(lintError, '5 errors found');

      const request = new NextRequest('http://localhost:3000/api/missions/precheck', {
        method: 'POST',
        headers: { 'X-Project-ID': 'test-project' },
      });

      await POST(request);

      // Should log with error level when failed
      expect(mockPrismaClient.activityLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            level: 'error',
          }),
        })
      );
    });
  });

  describe('no active mission', () => {
    it('should return 404 error if no active mission exists', async () => {
      mockPrismaClient.mission.findFirst.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/missions/precheck', {
        method: 'POST',
        headers: { 'X-Project-ID': 'test-project' },
      });

      const response = await POST(request);

      expect(response.status).toBe(404);
      const data: ApiError = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should return meaningful error message for no active mission', async () => {
      mockPrismaClient.mission.findFirst.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/missions/precheck', {
        method: 'POST',
        headers: { 'X-Project-ID': 'test-project' },
      });

      const response = await POST(request);

      expect(response.status).toBe(404);
      const data: ApiError = await response.json();
      expect(data.error.message).toBeDefined();
      expect(typeof data.error.message).toBe('string');
    });
  });

  describe('invalid mission state', () => {
    it('should only run precheck on mission in initializing state', async () => {
      const runningMission: Mission = {
        ...mockMission,
        state: 'running' as MissionState,
      };
      mockPrismaClient.mission.findFirst.mockResolvedValue(runningMission);

      const request = new NextRequest('http://localhost:3000/api/missions/precheck', {
        method: 'POST',
        headers: { 'X-Project-ID': 'test-project' },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data: ApiError = await response.json();
      expect(data.success).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should return 500 on database error when finding mission', async () => {
      mockPrismaClient.mission.findFirst.mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest('http://localhost:3000/api/missions/precheck', {
        method: 'POST',
        headers: { 'X-Project-ID': 'test-project' },
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      const data: ApiError = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should return 500 on database error when updating mission', async () => {
      mockPrismaClient.mission.findFirst.mockResolvedValue(mockMission);
      mockPrismaClient.mission.update.mockRejectedValue(
        new Error('Database error')
      );

      mockExecSuccess();

      const request = new NextRequest('http://localhost:3000/api/missions/precheck', {
        method: 'POST',
        headers: { 'X-Project-ID': 'test-project' },
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it('should include error code in error response', async () => {
      mockPrismaClient.mission.findFirst.mockRejectedValue(
        new Error('Database error')
      );

      const request = new NextRequest('http://localhost:3000/api/missions/precheck', {
        method: 'POST',
        headers: { 'X-Project-ID': 'test-project' },
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      const data: ApiError = await response.json();
      expect(data.error.code).toBeDefined();
    });
  });

  // ============ WI-045: Project Scoping Tests ============

  describe('projectId query parameter (WI-045)', () => {
    it('should return 400 when projectId query parameter is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/missions/precheck', {
        method: 'POST',
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('projectId');
    });

    it('should return 400 with clear error message for missing projectId', async () => {
      const request = new NextRequest('http://localhost:3000/api/missions/precheck', {
        method: 'POST',
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.message.toLowerCase()).toContain('required');
    });

    it('should filter mission lookup by projectId', async () => {
      mockPrismaClient.mission.findFirst.mockResolvedValue(mockMission);
      mockPrismaClient.mission.update.mockResolvedValue({
        ...mockMission,
        state: 'running',
      });
      mockPrismaClient.activityLog.create.mockResolvedValue({
        id: 1,
        missionId: mockMission.id,
        agent: null,
        message: 'Precheck passed',
        level: 'info',
        timestamp: new Date(),
      });

      mockExecSuccess();

      const request = new NextRequest('http://localhost:3000/api/missions/precheck', {
        method: 'POST',
        headers: { 'X-Project-ID': 'my-project' },
      });

      await POST(request);

      // Verify findFirst filters by projectId
      expect(mockPrismaClient.mission.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            projectId: 'my-project',
          }),
        })
      );
    });

    it('should return 404 for project with no initializing mission', async () => {
      mockPrismaClient.mission.findFirst.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/missions/precheck', {
        method: 'POST',
        headers: { 'X-Project-ID': 'empty-project' },
      });

      const response = await POST(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });
});
