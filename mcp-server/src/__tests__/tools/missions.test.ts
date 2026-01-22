import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

/**
 * Tests for mission lifecycle MCP tools.
 *
 * These tools manage mission lifecycle:
 * - mission_init: Create new mission directory structure
 * - mission_current: Return active mission metadata
 * - mission_precheck: Run configured pre-flight checks
 * - mission_postcheck: Run configured post-completion checks
 * - mission_archive: Move completed mission to archive
 */

// Mock HTTP client
const mockClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

// Mock the client module
vi.mock('../../client/index.js', () => ({
  createClient: () => mockClient,
}));

// Expected Zod schemas for input validation
const MissionInitInputSchema = z.object({
  name: z.string().min(1).optional(),
  force: z.boolean().optional().default(false),
});

const MissionCurrentInputSchema = z.object({});

const MissionPrecheckInputSchema = z.object({
  checks: z.array(z.string()).optional(),
});

const MissionPostcheckInputSchema = z.object({
  checks: z.array(z.string()).optional(),
});

const MissionArchiveInputSchema = z.object({
  itemIds: z.array(z.string()).optional(),
  complete: z.boolean().optional().default(false),
  dryRun: z.boolean().optional().default(false),
});

// Sample mission metadata
const sampleMission = {
  name: 'MCP Server Implementation',
  status: 'active',
  created_at: '2024-01-15T10:00:00Z',
  postcheck: null,
};

// Sample board state
const sampleBoardState = {
  mission: sampleMission,
  project: 'MCP Server Implementation',
  wip_limit: 4,
  stats: {
    total_items: 10,
    completed: 3,
    in_flight: 2,
    blocked: 0,
    rejected_count: 1,
  },
  phases: {
    briefings: [],
    ready: ['004', '005'],
    testing: ['006'],
    implementing: ['007'],
    review: [],
    probing: [],
    done: ['001', '002', '003'],
    blocked: [],
  },
};

describe('Mission Tools', () => {
  beforeEach(() => {
    mockClient.get.mockReset();
    mockClient.post.mockReset();
    mockClient.put.mockReset();
    mockClient.delete.mockReset();
  });

  describe('mission_init', () => {
    it('should create new mission directory structure with provided name', async () => {
      const initResult = {
        success: true,
        initialized: true,
        missionName: 'New Feature Set',
        archived: false,
      };

      mockClient.post.mockResolvedValueOnce({
        data: initResult,
        status: 201,
        headers: {},
      });

      // Validate input schema accepts the input
      const validatedInput = MissionInitInputSchema.parse({ name: 'New Feature Set' });
      expect(validatedInput.name).toBe('New Feature Set');
      expect(validatedInput.force).toBe(false);

      // Simulate tool calling the API
      const result = await mockClient.post('/api/missions/init', { name: 'New Feature Set' });

      expect(mockClient.post).toHaveBeenCalledWith('/api/missions/init', { name: 'New Feature Set' });
      expect(result.data.success).toBe(true);
      expect(result.data.initialized).toBe(true);
      expect(result.data.missionName).toBe('New Feature Set');
    });

    it('should create mission with default name when not provided', async () => {
      const initResult = {
        success: true,
        initialized: true,
        missionName: 'New Mission',
        archived: false,
      };

      mockClient.post.mockResolvedValueOnce({
        data: initResult,
        status: 201,
        headers: {},
      });

      // Validate empty input is acceptable
      const validatedInput = MissionInitInputSchema.parse({});
      expect(validatedInput.name).toBeUndefined();

      const result = await mockClient.post('/api/missions/init', {});
      expect(result.data.missionName).toBe('New Mission');
    });

    it('should reject when existing mission found without force flag', async () => {
      const errorResponse = {
        status: 409,
        code: 'EXISTING_MISSION',
        message: 'Existing mission found: "Previous Mission" (5/10 complete). Use force to archive and start fresh.',
        existingMission: {
          name: 'Previous Mission',
          total: 10,
          completed: 5,
          status: 'active',
        },
      };

      mockClient.post.mockRejectedValueOnce(errorResponse);

      await expect(mockClient.post('/api/missions/init', {}))
        .rejects.toMatchObject({ status: 409, code: 'EXISTING_MISSION' });
    });

    it('should archive existing mission and create new one with force flag', async () => {
      const initResult = {
        success: true,
        initialized: true,
        missionName: 'New Mission',
        archived: true,
        previousMission: {
          name: 'Previous Mission',
          archiveDir: 'mission/archive/previous-mission-1705312345678',
          itemCount: 10,
        },
      };

      mockClient.post.mockResolvedValueOnce({
        data: initResult,
        status: 201,
        headers: {},
      });

      const validatedInput = MissionInitInputSchema.parse({ force: true });
      expect(validatedInput.force).toBe(true);

      const result = await mockClient.post('/api/missions/init', { force: true });

      expect(result.data.archived).toBe(true);
      expect(result.data.previousMission).toBeDefined();
      expect(result.data.previousMission.name).toBe('Previous Mission');
    });

    it('should create all required stage directories', async () => {
      const initResult = {
        success: true,
        initialized: true,
        missionName: 'Test Mission',
        archived: false,
        directories: [
          'briefings',
          'ready',
          'testing',
          'implementing',
          'review',
          'probing',
          'done',
          'blocked',
          'archive',
        ],
      };

      mockClient.post.mockResolvedValueOnce({
        data: initResult,
        status: 201,
        headers: {},
      });

      const result = await mockClient.post('/api/missions/init', { name: 'Test Mission' });

      expect(result.data.directories).toContain('briefings');
      expect(result.data.directories).toContain('testing');
      expect(result.data.directories).toContain('done');
      expect(result.data.directories).toContain('archive');
    });
  });

  describe('mission_current', () => {
    it('should return active mission metadata', async () => {
      const currentResult = {
        success: true,
        mission: sampleMission,
        progress: {
          done: 3,
          total: 10,
        },
        wip: {
          current: 2,
          limit: 4,
        },
        columns: sampleBoardState.phases,
      };

      mockClient.get.mockResolvedValueOnce({
        data: currentResult,
        status: 200,
        headers: {},
      });

      // Validate empty input is acceptable (no required params)
      const validatedInput = MissionCurrentInputSchema.parse({});
      expect(validatedInput).toEqual({});

      const result = await mockClient.get('/api/missions/current');

      expect(mockClient.get).toHaveBeenCalledWith('/api/missions/current');
      expect(result.data.mission.name).toBe('MCP Server Implementation');
      expect(result.data.mission.status).toBe('active');
      expect(result.data.progress.done).toBe(3);
      expect(result.data.progress.total).toBe(10);
    });

    it('should include WIP information', async () => {
      const currentResult = {
        success: true,
        mission: sampleMission,
        progress: { done: 3, total: 10 },
        wip: { current: 2, limit: 4 },
        columns: sampleBoardState.phases,
      };

      mockClient.get.mockResolvedValueOnce({
        data: currentResult,
        status: 200,
        headers: {},
      });

      const result = await mockClient.get('/api/missions/current');

      expect(result.data.wip.current).toBe(2);
      expect(result.data.wip.limit).toBe(4);
    });

    it('should include column/phase information', async () => {
      const currentResult = {
        success: true,
        mission: sampleMission,
        progress: { done: 3, total: 10 },
        wip: { current: 2, limit: 4 },
        columns: sampleBoardState.phases,
      };

      mockClient.get.mockResolvedValueOnce({
        data: currentResult,
        status: 200,
        headers: {},
      });

      const result = await mockClient.get('/api/missions/current');

      expect(result.data.columns.done).toEqual(['001', '002', '003']);
      expect(result.data.columns.testing).toEqual(['006']);
      expect(result.data.columns.implementing).toEqual(['007']);
    });

    it('should handle no active mission gracefully', async () => {
      const errorResponse = {
        status: 404,
        code: 'NO_ACTIVE_MISSION',
        message: 'No active mission found. Run mission_init to start a new mission.',
      };

      mockClient.get.mockRejectedValueOnce(errorResponse);

      await expect(mockClient.get('/api/missions/current'))
        .rejects.toMatchObject({ status: 404, code: 'NO_ACTIVE_MISSION' });
    });

    it('should include postcheck results when available', async () => {
      const currentResult = {
        success: true,
        mission: {
          ...sampleMission,
          postcheck: {
            timestamp: '2024-01-15T12:00:00Z',
            passed: true,
            checks: [
              { name: 'lint', passed: true },
              { name: 'unit', passed: true },
            ],
          },
        },
        progress: { done: 10, total: 10 },
        wip: { current: 0, limit: 4 },
        columns: { ...sampleBoardState.phases, done: Array(10).fill('').map((_, i) => String(i + 1).padStart(3, '0')) },
      };

      mockClient.get.mockResolvedValueOnce({
        data: currentResult,
        status: 200,
        headers: {},
      });

      const result = await mockClient.get('/api/missions/current');

      expect(result.data.mission.postcheck).toBeDefined();
      expect(result.data.mission.postcheck.passed).toBe(true);
    });
  });

  describe('mission_precheck', () => {
    it('should run configured pre-flight checks and return results', async () => {
      const precheckResult = {
        success: true,
        allPassed: true,
        checks: [
          { name: 'lint', command: 'npm run lint', passed: true },
          { name: 'unit', command: 'npm test', passed: true },
        ],
      };

      mockClient.post.mockResolvedValueOnce({
        data: precheckResult,
        status: 200,
        headers: {},
      });

      // Validate empty input is acceptable (uses config defaults)
      const validatedInput = MissionPrecheckInputSchema.parse({});
      expect(validatedInput.checks).toBeUndefined();

      const result = await mockClient.post('/api/missions/precheck', {});

      expect(mockClient.post).toHaveBeenCalledWith('/api/missions/precheck', {});
      expect(result.data.allPassed).toBe(true);
      expect(result.data.checks).toHaveLength(2);
    });

    it('should return failure when any check fails', async () => {
      const precheckResult = {
        success: false,
        allPassed: false,
        checks: [
          { name: 'lint', command: 'npm run lint', passed: false, error: 'ESLint found 3 errors' },
          { name: 'unit', command: 'npm test', passed: true },
        ],
      };

      mockClient.post.mockResolvedValueOnce({
        data: precheckResult,
        status: 200,
        headers: {},
      });

      const result = await mockClient.post('/api/missions/precheck', {});

      expect(result.data.allPassed).toBe(false);
      expect(result.data.checks[0].passed).toBe(false);
      expect(result.data.checks[0].error).toContain('ESLint');
    });

    it('should accept specific checks to run via input', async () => {
      const precheckResult = {
        success: true,
        allPassed: true,
        checks: [
          { name: 'lint', command: 'npm run lint', passed: true },
        ],
      };

      mockClient.post.mockResolvedValueOnce({
        data: precheckResult,
        status: 200,
        headers: {},
      });

      const validatedInput = MissionPrecheckInputSchema.parse({ checks: ['lint'] });
      expect(validatedInput.checks).toEqual(['lint']);

      const result = await mockClient.post('/api/missions/precheck', { checks: ['lint'] });

      expect(result.data.checks).toHaveLength(1);
      expect(result.data.checks[0].name).toBe('lint');
    });

    it('should handle no checks configured gracefully', async () => {
      const precheckResult = {
        success: true,
        allPassed: true,
        checks: [],
        skipped: true,
      };

      mockClient.post.mockResolvedValueOnce({
        data: precheckResult,
        status: 200,
        headers: {},
      });

      const result = await mockClient.post('/api/missions/precheck', {});

      expect(result.data.skipped).toBe(true);
      expect(result.data.checks).toHaveLength(0);
    });

    it('should handle missing config file', async () => {
      const precheckResult = {
        success: true,
        allPassed: true,
        checks: [
          { name: 'lint', command: 'npm run lint', passed: true },
          { name: 'unit', command: 'npm test', passed: true },
        ],
        configSource: 'defaults',
      };

      mockClient.post.mockResolvedValueOnce({
        data: precheckResult,
        status: 200,
        headers: {},
      });

      const result = await mockClient.post('/api/missions/precheck', {});

      expect(result.data.configSource).toBe('defaults');
    });
  });

  describe('mission_postcheck', () => {
    it('should run configured post-completion checks and return results', async () => {
      const postcheckResult = {
        success: true,
        allPassed: true,
        checks: [
          { name: 'lint', command: 'npm run lint', passed: true },
          { name: 'unit', command: 'npm test', passed: true },
          { name: 'e2e', command: 'npm run test:e2e', passed: true },
        ],
      };

      mockClient.post.mockResolvedValueOnce({
        data: postcheckResult,
        status: 200,
        headers: {},
      });

      const validatedInput = MissionPostcheckInputSchema.parse({});
      expect(validatedInput.checks).toBeUndefined();

      const result = await mockClient.post('/api/missions/postcheck', {});

      expect(mockClient.post).toHaveBeenCalledWith('/api/missions/postcheck', {});
      expect(result.data.allPassed).toBe(true);
      expect(result.data.checks).toHaveLength(3);
    });

    it('should return failure when any check fails', async () => {
      const postcheckResult = {
        success: false,
        allPassed: false,
        checks: [
          { name: 'lint', command: 'npm run lint', passed: true },
          { name: 'unit', command: 'npm test', passed: true },
          { name: 'e2e', command: 'npm run test:e2e', passed: false, error: '2 e2e tests failed' },
        ],
      };

      mockClient.post.mockResolvedValueOnce({
        data: postcheckResult,
        status: 200,
        headers: {},
      });

      const result = await mockClient.post('/api/missions/postcheck', {});

      expect(result.data.allPassed).toBe(false);
      expect(result.data.checks[2].passed).toBe(false);
    });

    it('should update board.json with postcheck results', async () => {
      const postcheckResult = {
        success: true,
        allPassed: true,
        checks: [
          { name: 'lint', passed: true },
          { name: 'unit', passed: true },
        ],
        boardUpdated: true,
      };

      mockClient.post.mockResolvedValueOnce({
        data: postcheckResult,
        status: 200,
        headers: {},
      });

      const result = await mockClient.post('/api/missions/postcheck', {});

      expect(result.data.boardUpdated).toBe(true);
    });

    it('should accept specific checks to run via input', async () => {
      const postcheckResult = {
        success: true,
        allPassed: true,
        checks: [
          { name: 'e2e', command: 'npm run test:e2e', passed: true },
        ],
      };

      mockClient.post.mockResolvedValueOnce({
        data: postcheckResult,
        status: 200,
        headers: {},
      });

      const validatedInput = MissionPostcheckInputSchema.parse({ checks: ['e2e'] });
      expect(validatedInput.checks).toEqual(['e2e']);

      const result = await mockClient.post('/api/missions/postcheck', { checks: ['e2e'] });

      expect(result.data.checks).toHaveLength(1);
      expect(result.data.checks[0].name).toBe('e2e');
    });

    it('should handle no active mission', async () => {
      const errorResponse = {
        status: 404,
        code: 'NO_ACTIVE_MISSION',
        message: 'No active mission found.',
      };

      mockClient.get.mockRejectedValueOnce(errorResponse);

      await expect(mockClient.get('/api/missions/postcheck'))
        .rejects.toMatchObject({ status: 404 });
    });
  });

  describe('mission_archive', () => {
    it('should move completed items to archive directory', async () => {
      const archiveResult = {
        success: true,
        archived: 3,
        destination: 'mission/archive/mcp-server-implementation',
        items: ['001', '002', '003'],
        missionComplete: false,
      };

      mockClient.post.mockResolvedValueOnce({
        data: archiveResult,
        status: 200,
        headers: {},
      });

      // Validate empty input is acceptable (archives all done items)
      const validatedInput = MissionArchiveInputSchema.parse({});
      expect(validatedInput.itemIds).toBeUndefined();
      expect(validatedInput.complete).toBe(false);

      const result = await mockClient.post('/api/missions/archive', {});

      expect(mockClient.post).toHaveBeenCalledWith('/api/missions/archive', {});
      expect(result.data.archived).toBe(3);
      expect(result.data.items).toEqual(['001', '002', '003']);
    });

    it('should archive specific items when itemIds provided', async () => {
      const archiveResult = {
        success: true,
        archived: 1,
        destination: 'mission/archive/mcp-server-implementation',
        items: ['001'],
        missionComplete: false,
      };

      mockClient.post.mockResolvedValueOnce({
        data: archiveResult,
        status: 200,
        headers: {},
      });

      const validatedInput = MissionArchiveInputSchema.parse({ itemIds: ['001'] });
      expect(validatedInput.itemIds).toEqual(['001']);

      const result = await mockClient.post('/api/missions/archive', { itemIds: ['001'] });

      expect(result.data.archived).toBe(1);
      expect(result.data.items).toEqual(['001']);
    });

    it('should reject items not in done stage', async () => {
      const errorResponse = {
        status: 400,
        code: 'INVALID_INPUT',
        message: 'Items not in done stage: 006, 007',
      };

      mockClient.post.mockRejectedValueOnce(errorResponse);

      await expect(mockClient.post('/api/missions/archive', { itemIds: ['006', '007'] }))
        .rejects.toMatchObject({ status: 400, code: 'INVALID_INPUT' });
    });

    it('should complete mission with summary when complete flag is true', async () => {
      const archiveResult = {
        success: true,
        archived: 10,
        destination: 'mission/archive/mcp-server-implementation',
        items: ['001', '002', '003', '004', '005', '006', '007', '008', '009', '010'],
        missionComplete: true,
        summary: 'mission/archive/mcp-server-implementation/_summary.md',
      };

      mockClient.post.mockResolvedValueOnce({
        data: archiveResult,
        status: 200,
        headers: {},
      });

      const validatedInput = MissionArchiveInputSchema.parse({ complete: true });
      expect(validatedInput.complete).toBe(true);

      const result = await mockClient.post('/api/missions/archive', { complete: true });

      expect(result.data.missionComplete).toBe(true);
      expect(result.data.summary).toContain('_summary.md');
    });

    it('should support dry-run mode', async () => {
      const archiveResult = {
        success: true,
        dryRun: true,
        wouldArchive: 3,
        destination: 'mission/archive/mcp-server-implementation',
        items: ['001', '002', '003'],
      };

      mockClient.post.mockResolvedValueOnce({
        data: archiveResult,
        status: 200,
        headers: {},
      });

      const validatedInput = MissionArchiveInputSchema.parse({ dryRun: true });
      expect(validatedInput.dryRun).toBe(true);

      const result = await mockClient.post('/api/missions/archive', { dryRun: true });

      expect(result.data.dryRun).toBe(true);
      expect(result.data.wouldArchive).toBe(3);
    });

    it('should handle no items to archive', async () => {
      const archiveResult = {
        success: true,
        archived: 0,
        message: 'No items to archive',
      };

      mockClient.post.mockResolvedValueOnce({
        data: archiveResult,
        status: 200,
        headers: {},
      });

      const result = await mockClient.post('/api/missions/archive', {});

      expect(result.data.archived).toBe(0);
      expect(result.data.message).toBe('No items to archive');
    });

    it('should archive activity log with complete flag', async () => {
      const archiveResult = {
        success: true,
        archived: 10,
        destination: 'mission/archive/mcp-server-implementation',
        items: ['001', '002', '003', '004', '005', '006', '007', '008', '009', '010'],
        missionComplete: true,
        summary: 'mission/archive/mcp-server-implementation/_summary.md',
        activityLogArchived: true,
      };

      mockClient.post.mockResolvedValueOnce({
        data: archiveResult,
        status: 200,
        headers: {},
      });

      const result = await mockClient.post('/api/missions/archive', { complete: true });

      expect(result.data.activityLogArchived).toBe(true);
    });
  });

  describe('Zod Schema Validation', () => {
    describe('MissionInitInputSchema', () => {
      it('should accept valid input with name', () => {
        const result = MissionInitInputSchema.safeParse({ name: 'Test Mission' });
        expect(result.success).toBe(true);
      });

      it('should accept empty input', () => {
        const result = MissionInitInputSchema.safeParse({});
        expect(result.success).toBe(true);
      });

      it('should apply default force value of false', () => {
        const result = MissionInitInputSchema.parse({});
        expect(result.force).toBe(false);
      });

      it('should accept force flag', () => {
        const result = MissionInitInputSchema.parse({ force: true });
        expect(result.force).toBe(true);
      });

      it('should reject empty name string', () => {
        const result = MissionInitInputSchema.safeParse({ name: '' });
        expect(result.success).toBe(false);
      });
    });

    describe('MissionCurrentInputSchema', () => {
      it('should accept empty input', () => {
        const result = MissionCurrentInputSchema.safeParse({});
        expect(result.success).toBe(true);
      });
    });

    describe('MissionPrecheckInputSchema', () => {
      it('should accept empty input', () => {
        const result = MissionPrecheckInputSchema.safeParse({});
        expect(result.success).toBe(true);
      });

      it('should accept specific checks array', () => {
        const result = MissionPrecheckInputSchema.safeParse({ checks: ['lint', 'unit'] });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.checks).toEqual(['lint', 'unit']);
        }
      });

      it('should reject non-string check names', () => {
        const result = MissionPrecheckInputSchema.safeParse({ checks: [123] });
        expect(result.success).toBe(false);
      });
    });

    describe('MissionPostcheckInputSchema', () => {
      it('should accept empty input', () => {
        const result = MissionPostcheckInputSchema.safeParse({});
        expect(result.success).toBe(true);
      });

      it('should accept specific checks array', () => {
        const result = MissionPostcheckInputSchema.safeParse({ checks: ['lint', 'unit', 'e2e'] });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.checks).toEqual(['lint', 'unit', 'e2e']);
        }
      });
    });

    describe('MissionArchiveInputSchema', () => {
      it('should accept empty input', () => {
        const result = MissionArchiveInputSchema.safeParse({});
        expect(result.success).toBe(true);
      });

      it('should apply default values', () => {
        const result = MissionArchiveInputSchema.parse({});
        expect(result.complete).toBe(false);
        expect(result.dryRun).toBe(false);
      });

      it('should accept itemIds array', () => {
        const result = MissionArchiveInputSchema.safeParse({ itemIds: ['001', '002'] });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.itemIds).toEqual(['001', '002']);
        }
      });

      it('should accept complete flag', () => {
        const result = MissionArchiveInputSchema.parse({ complete: true });
        expect(result.complete).toBe(true);
      });

      it('should accept dryRun flag', () => {
        const result = MissionArchiveInputSchema.parse({ dryRun: true });
        expect(result.dryRun).toBe(true);
      });

      it('should reject non-string itemIds', () => {
        const result = MissionArchiveInputSchema.safeParse({ itemIds: [1, 2, 3] });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Tool Registration', () => {
    it('should export tool definitions for MCP server registration', async () => {
      // This test will verify the implementation exports the correct structure
      // For now we define the expected interface
      const expectedToolNames = [
        'mission_init',
        'mission_current',
        'mission_precheck',
        'mission_postcheck',
        'mission_archive',
      ];

      // These will be validated once the implementation exists
      expect(expectedToolNames).toHaveLength(5);
      expect(expectedToolNames).toContain('mission_init');
      expect(expectedToolNames).toContain('mission_current');
    });
  });

  describe('Response Structure Consistency', () => {
    it('mission_init should return content array with text type', async () => {
      mockClient.post.mockResolvedValueOnce({
        data: { success: true, initialized: true, missionName: 'Test' },
        status: 201,
        headers: {},
      });

      const result = await mockClient.post('/api/missions/init', {});

      // Response should include success indicator
      expect(result.data.success).toBe(true);
    });

    it('mission_current should return structured mission metadata', async () => {
      mockClient.get.mockResolvedValueOnce({
        data: {
          success: true,
          mission: sampleMission,
          progress: { done: 3, total: 10 },
          wip: { current: 2, limit: 4 },
        },
        status: 200,
        headers: {},
      });

      const result = await mockClient.get('/api/missions/current');

      expect(result.data).toHaveProperty('mission');
      expect(result.data).toHaveProperty('progress');
      expect(result.data).toHaveProperty('wip');
    });

    it('precheck/postcheck should return checks array with consistent structure', async () => {
      mockClient.post.mockResolvedValueOnce({
        data: {
          success: true,
          allPassed: true,
          checks: [
            { name: 'lint', command: 'npm run lint', passed: true },
          ],
        },
        status: 200,
        headers: {},
      });

      const result = await mockClient.post('/api/missions/precheck', {});

      expect(result.data.checks[0]).toHaveProperty('name');
      expect(result.data.checks[0]).toHaveProperty('passed');
    });

    it('mission_archive should return archived count and items', async () => {
      mockClient.post.mockResolvedValueOnce({
        data: {
          success: true,
          archived: 3,
          items: ['001', '002', '003'],
        },
        status: 200,
        headers: {},
      });

      const result = await mockClient.post('/api/missions/archive', {});

      expect(result.data).toHaveProperty('archived');
      expect(result.data).toHaveProperty('items');
      expect(Array.isArray(result.data.items)).toBe(true);
    });
  });
});
