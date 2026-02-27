import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';

/**
 * Tests for utility MCP tools.
 *
 * These tools provide helper functionality:
 * - deps_check: Validate dependency graph and detect cycles
 * - activity_log: Append structured JSON to activity feed
 * - log: Simple shorthand for activity logging
 */

// Mock HTTP client
const mockClient = {
  get: vi.fn(),
  post: vi.fn(),
};

vi.mock('../../client/index.js', () => ({
  createClient: () => mockClient,
}));

// Known valid agent names for validation
const VALID_AGENTS = ['murdock', 'ba', 'lynch', 'amy', 'hannibal', 'face', 'sosa', 'tawnia'];

describe('Utility Tools', () => {
  beforeEach(() => {
    vi.resetModules();
    mockClient.get.mockReset();
    mockClient.post.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('deps_check', () => {
    describe('happy path', () => {
      it('should validate dependency graph and return analysis', async () => {
        const mockResponse = {
          data: {
            valid: true,
            totalItems: 5,
            cycles: [],
            depths: { '001': 0, '002': 1, '003': 1, '004': 2, '005': 0 },
            maxDepth: 2,
            parallelWaves: 3,
            readyItems: ['001', '005'],
          },
          status: 200,
          headers: {},
        };
        mockClient.get.mockResolvedValueOnce(mockResponse);

        const { depsCheck } = await import('../../tools/utils.js');

        const result = await depsCheck({});

        expect(mockClient.get).toHaveBeenCalledWith('/api/deps/check');
        expect(result.content[0].text).toContain('valid');
        expect(result.content[0].text).toContain('true');
      });

      it('should detect cycles in dependency graph', async () => {
        const mockResponse = {
          data: {
            valid: false,
            totalItems: 3,
            cycles: [['001', '002', '003', '001']],
            depths: {},
            maxDepth: 0,
            parallelWaves: 0,
            readyItems: [],
          },
          status: 200,
          headers: {},
        };
        mockClient.get.mockResolvedValueOnce(mockResponse);

        const { depsCheck } = await import('../../tools/utils.js');

        const result = await depsCheck({});

        expect(result.content[0].text).toContain('valid');
        expect(result.content[0].text).toContain('false');
        expect(result.content[0].text).toContain('cycles');
      });

      it('should return ready items with no unmet dependencies', async () => {
        const mockResponse = {
          data: {
            valid: true,
            totalItems: 4,
            cycles: [],
            depths: { '001': 0, '002': 0, '003': 1, '004': 1 },
            maxDepth: 1,
            parallelWaves: 2,
            readyItems: ['001', '002'],
          },
          status: 200,
          headers: {},
        };
        mockClient.get.mockResolvedValueOnce(mockResponse);

        const { depsCheck } = await import('../../tools/utils.js');

        const result = await depsCheck({});

        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.readyItems).toContain('001');
        expect(parsed.readyItems).toContain('002');
        expect(parsed.readyItems).toHaveLength(2);
      });

      it('should support verbose mode with additional graph details', async () => {
        const mockResponse = {
          data: {
            valid: true,
            totalItems: 2,
            cycles: [],
            depths: { '001': 0, '002': 1 },
            maxDepth: 1,
            parallelWaves: 2,
            readyItems: ['001'],
            waves: { '0': ['001'], '1': ['002'] },
            graph: { '001': [], '002': ['001'] },
          },
          status: 200,
          headers: {},
        };
        mockClient.get.mockResolvedValueOnce(mockResponse);

        const { depsCheck } = await import('../../tools/utils.js');

        const result = await depsCheck({ verbose: true });

        expect(mockClient.get).toHaveBeenCalledWith('/api/deps/check?verbose=true');
        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.waves).toBeDefined();
        expect(parsed.graph).toBeDefined();
      });

      it('should handle empty mission with no items', async () => {
        const mockResponse = {
          data: {
            valid: true,
            totalItems: 0,
            cycles: [],
            depths: {},
            maxDepth: 0,
            parallelWaves: 0,
            readyItems: [],
            message: 'No work items found',
          },
          status: 200,
          headers: {},
        };
        mockClient.get.mockResolvedValueOnce(mockResponse);

        const { depsCheck } = await import('../../tools/utils.js');

        const result = await depsCheck({});

        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.valid).toBe(true);
        expect(parsed.totalItems).toBe(0);
      });
    });

    describe('validation errors', () => {
      it('should report missing dependency references', async () => {
        const mockResponse = {
          data: {
            valid: false,
            totalItems: 2,
            cycles: [],
            validationErrors: [
              {
                item: '002',
                error: 'MISSING_DEPENDENCY',
                dependency: '999',
                message: 'Item 002 depends on non-existent item 999',
              },
            ],
            depths: { '001': 0, '002': 0 },
            maxDepth: 0,
            parallelWaves: 1,
            readyItems: ['001'],
          },
          status: 200,
          headers: {},
        };
        mockClient.get.mockResolvedValueOnce(mockResponse);

        const { depsCheck } = await import('../../tools/utils.js');

        const result = await depsCheck({});

        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.valid).toBe(false);
        expect(parsed.validationErrors).toBeDefined();
        expect(parsed.validationErrors[0].error).toBe('MISSING_DEPENDENCY');
      });
    });

    describe('Zod schema validation', () => {
      it('should accept empty input for default behavior', async () => {
        const { DepsCheckSchema } = await import('../../tools/utils.js');

        const parseResult = DepsCheckSchema.safeParse({});
        expect(parseResult.success).toBe(true);
      });

      it('should accept verbose flag as boolean', async () => {
        const { DepsCheckSchema } = await import('../../tools/utils.js');

        const parseResult = DepsCheckSchema.safeParse({ verbose: true });
        expect(parseResult.success).toBe(true);
        if (parseResult.success) {
          expect(parseResult.data.verbose).toBe(true);
        }
      });

      it('should reject invalid verbose flag type', async () => {
        const { DepsCheckSchema } = await import('../../tools/utils.js');

        const parseResult = DepsCheckSchema.safeParse({ verbose: 'yes' });
        expect(parseResult.success).toBe(false);
      });
    });

    describe('error handling', () => {
      it('should handle no mission directory error', async () => {
        const error = {
          status: 404,
          message: 'No mission directory found. Run /ai-team:plan first.',
          code: 'NO_MISSION',
        };
        mockClient.get.mockRejectedValueOnce(error);

        const { depsCheck } = await import('../../tools/utils.js');

        const result = await depsCheck({});

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('No mission');
      });
    });
  });

  describe('activity_log', () => {
    describe('happy path', () => {
      it('should append structured JSON to activity feed', async () => {
        const mockResponse = {
          data: {
            success: true,
            logged: {
              timestamp: '2024-01-15T10:30:00Z',
              agent: 'Murdock',
              message: 'Writing tests for auth',
            },
          },
          status: 200,
          headers: {},
        };
        mockClient.post.mockResolvedValueOnce(mockResponse);

        const { activityLog } = await import('../../tools/utils.js');

        const result = await activityLog({
          agent: 'murdock',
          message: 'Writing tests for auth',
        });

        expect(mockClient.post).toHaveBeenCalledWith('/api/activity', {
          agent: 'murdock',
          message: 'Writing tests for auth',
        });
        expect(result.content[0].text).toContain('success');
        expect(result.content[0].text).toContain('Murdock');
      });

      it('should normalize agent names to proper casing', async () => {
        const mockResponse = {
          data: {
            success: true,
            logged: {
              timestamp: '2024-01-15T10:30:00Z',
              agent: 'B.A.',
              message: 'Implementation complete',
            },
          },
          status: 200,
          headers: {},
        };
        mockClient.post.mockResolvedValueOnce(mockResponse);

        const { activityLog } = await import('../../tools/utils.js');

        const result = await activityLog({
          agent: 'ba',
          message: 'Implementation complete',
        });

        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.logged.agent).toBe('B.A.');
      });

      it('should include timestamp in response', async () => {
        const mockResponse = {
          data: {
            success: true,
            logged: {
              timestamp: '2024-01-15T12:00:00Z',
              agent: 'Lynch',
              message: 'Code review started',
            },
          },
          status: 200,
          headers: {},
        };
        mockClient.post.mockResolvedValueOnce(mockResponse);

        const { activityLog } = await import('../../tools/utils.js');

        const result = await activityLog({
          agent: 'lynch',
          message: 'Code review started',
        });

        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.logged.timestamp).toBeDefined();
        expect(parsed.logged.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      });
    });

    describe('agent validation', () => {
      it.each(VALID_AGENTS)('should accept valid agent name: %s', async (agentName) => {
        const { ActivityLogSchema } = await import('../../tools/utils.js');

        const validInput = {
          agent: agentName,
          message: 'Test message',
        };

        const parseResult = ActivityLogSchema.safeParse(validInput);
        expect(parseResult.success).toBe(true);
      });

      it('should reject unknown agent names', async () => {
        const { ActivityLogSchema } = await import('../../tools/utils.js');

        const invalidInput = {
          agent: 'unknown_agent',
          message: 'Test message',
        };

        const parseResult = ActivityLogSchema.safeParse(invalidInput);
        expect(parseResult.success).toBe(false);
      });
    });

    describe('Zod schema validation', () => {
      it('should reject missing agent', async () => {
        const { ActivityLogSchema } = await import('../../tools/utils.js');

        const invalidInput = {
          message: 'Test message',
        };

        const parseResult = ActivityLogSchema.safeParse(invalidInput);
        expect(parseResult.success).toBe(false);
        if (!parseResult.success) {
          expect(parseResult.error.issues[0].path).toContain('agent');
        }
      });

      it('should reject missing message', async () => {
        const { ActivityLogSchema } = await import('../../tools/utils.js');

        const invalidInput = {
          agent: 'murdock',
        };

        const parseResult = ActivityLogSchema.safeParse(invalidInput);
        expect(parseResult.success).toBe(false);
        if (!parseResult.success) {
          expect(parseResult.error.issues[0].path).toContain('message');
        }
      });

      it('should reject empty message', async () => {
        const { ActivityLogSchema } = await import('../../tools/utils.js');

        const invalidInput = {
          agent: 'murdock',
          message: '',
        };

        const parseResult = ActivityLogSchema.safeParse(invalidInput);
        expect(parseResult.success).toBe(false);
      });

      it('should accept long messages', async () => {
        const { ActivityLogSchema } = await import('../../tools/utils.js');

        const validInput = {
          agent: 'murdock',
          message: 'A'.repeat(1000),
        };

        const parseResult = ActivityLogSchema.safeParse(validInput);
        expect(parseResult.success).toBe(true);
      });
    });

    describe('error handling', () => {
      it('should handle no mission directory error', async () => {
        const error = {
          status: 404,
          message: 'No mission directory found',
          code: 'NO_MISSION',
        };
        mockClient.post.mockRejectedValueOnce(error);

        const { activityLog } = await import('../../tools/utils.js');

        const result = await activityLog({
          agent: 'murdock',
          message: 'Test message',
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('No mission');
      });

      it('should handle network errors gracefully', async () => {
        const networkError = new Error('ECONNREFUSED');
        (networkError as any).code = 'ECONNREFUSED';
        mockClient.post.mockRejectedValueOnce(networkError);

        const { activityLog } = await import('../../tools/utils.js');

        const result = await activityLog({
          agent: 'murdock',
          message: 'Test message',
        });

        expect(result.isError).toBe(true);
      });
    });
  });

  describe('log (simple shorthand)', () => {
    describe('happy path', () => {
      it('should provide simple shorthand for activity logging', async () => {
        const mockResponse = {
          data: {
            success: true,
            logged: {
              timestamp: '2024-01-15T10:30:00Z',
              agent: 'B.A.',
              message: 'All tests passing',
            },
          },
          status: 200,
          headers: {},
        };
        mockClient.post.mockResolvedValueOnce(mockResponse);

        const { log } = await import('../../tools/utils.js');

        const result = await log({
          agent: 'ba',
          message: 'All tests passing',
        });

        expect(mockClient.post).toHaveBeenCalledWith('/api/activity', {
          agent: 'ba',
          message: 'All tests passing',
        });
        expect(result.content[0].text).toContain('success');
      });

      it('should normalize agent names', async () => {
        const mockResponse = {
          data: {
            success: true,
            logged: {
              timestamp: '2024-01-15T10:30:00Z',
              agent: 'Murdock',
              message: 'Created 5 test cases',
            },
          },
          status: 200,
          headers: {},
        };
        mockClient.post.mockResolvedValueOnce(mockResponse);

        const { log } = await import('../../tools/utils.js');

        const result = await log({
          agent: 'murdock',
          message: 'Created 5 test cases',
        });

        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.logged.agent).toBe('Murdock');
      });

    });

    describe('agent validation', () => {
      it.each(VALID_AGENTS)('should accept valid agent name: %s', async (agentName) => {
        const { LogSchema } = await import('../../tools/utils.js');

        const validInput = {
          agent: agentName,
          message: 'Test message',
        };

        const parseResult = LogSchema.safeParse(validInput);
        expect(parseResult.success).toBe(true);
      });

      it('should reject unknown agent names', async () => {
        const { LogSchema } = await import('../../tools/utils.js');

        const invalidInput = {
          agent: 'unknown_agent',
          message: 'Test message',
        };

        const parseResult = LogSchema.safeParse(invalidInput);
        expect(parseResult.success).toBe(false);
      });
    });

    describe('Zod schema validation', () => {
      it('should reject missing agent', async () => {
        const { LogSchema } = await import('../../tools/utils.js');

        const invalidInput = {
          message: 'Test message',
        };

        const parseResult = LogSchema.safeParse(invalidInput);
        expect(parseResult.success).toBe(false);
      });

      it('should reject missing message', async () => {
        const { LogSchema } = await import('../../tools/utils.js');

        const invalidInput = {
          agent: 'murdock',
        };

        const parseResult = LogSchema.safeParse(invalidInput);
        expect(parseResult.success).toBe(false);
      });

      it('should reject empty message', async () => {
        const { LogSchema } = await import('../../tools/utils.js');

        const invalidInput = {
          agent: 'murdock',
          message: '',
        };

        const parseResult = LogSchema.safeParse(invalidInput);
        expect(parseResult.success).toBe(false);
      });
    });

    describe('error handling', () => {
      it('should handle no mission directory error', async () => {
        const error = {
          status: 404,
          message: 'No mission directory found',
          code: 'NO_MISSION',
        };
        mockClient.post.mockRejectedValueOnce(error);

        const { log } = await import('../../tools/utils.js');

        const result = await log({
          agent: 'murdock',
          message: 'Test message',
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('No mission');
      });
    });
  });

});
