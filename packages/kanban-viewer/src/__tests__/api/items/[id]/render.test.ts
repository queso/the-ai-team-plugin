import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Tests for GET /api/items/[id]/render endpoint.
 *
 * These tests verify the acceptance criteria from work item 012:
 * - GET /api/items/[id]/render returns RenderItemResponse with markdown string
 * - Query param includeWorkLog (default true) controls work log inclusion
 * - Markdown includes item title, description, type, priority, stage, dependencies
 * - If includeWorkLog=true, includes formatted work log history
 * - Returns ITEM_NOT_FOUND for invalid IDs
 *
 * NOTE: These tests will fail until the route handler is implemented
 * at src/app/api/items/[id]/render/route.ts. The tests use mocked Prisma client
 * and define the expected behavior for B.A. to implement.
 */

// Import types for test data
import type {
  ItemWithRelations,
  WorkLogEntry,
} from '@/types/item';

// Mock Prisma client for database operations
const mockPrismaClient = {
  item: {
    findFirst: vi.fn(),
  },
};

vi.mock('@/lib/db', () => ({
  prisma: mockPrismaClient,
}));

// Mock route handler - will be replaced by real implementation
// This allows tests to run before implementation exists
const mockGET = vi.fn();

vi.mock('@/app/api/items/[id]/render/route', () => ({
  GET: mockGET,
}));

// ============ Test Data Fixtures ============

function createMockWorkLog(overrides: Partial<WorkLogEntry> = {}): WorkLogEntry {
  return {
    id: 1,
    agent: 'Murdock',
    action: 'started',
    summary: 'Started testing',
    timestamp: new Date('2026-01-21T10:00:00Z'),
    ...overrides,
  };
}

function createMockItem(overrides: Partial<ItemWithRelations> = {}): ItemWithRelations {
  return {
    id: 'WI-001',
    title: 'Test Item',
    description: 'Test description for the work item.',
    type: 'feature',
    priority: 'medium',
    stageId: 'briefings',
    assignedAgent: null,
    rejectionCount: 0,
    createdAt: new Date('2026-01-21T10:00:00Z'),
    updatedAt: new Date('2026-01-21T10:00:00Z'),
    completedAt: null,
    outputs: {},
    dependencies: [],
    workLogs: [],
    ...overrides,
  };
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

function createRequest(url: string, options: Record<string, unknown> = {}): NextRequest {
  return new NextRequest(`http://localhost:3000${url}`, options);
}

function createSuccessResponse(data: { markdown: string }, status: number = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

function createErrorResponse(code: string, message: string, status: number = 400, details?: unknown): NextResponse {
  const errorPayload: { code: string; message: string; details?: unknown } = { code, message };
  if (details !== undefined) {
    errorPayload.details = details;
  }
  return NextResponse.json({ success: false, error: errorPayload }, { status });
}

// ============ GET /api/items/[id]/render Tests ============

describe('GET /api/items/[id]/render', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful requests', () => {
    it('should return RenderItemResponse with markdown string', async () => {
      const mockItem = createMockItem({ id: 'WI-001', title: 'Feature Title' });
      mockPrismaClient.item.findFirst.mockResolvedValue(mockItem);

      const expectedMarkdown = `# WI-001: Feature Title

**Type:** feature
**Priority:** medium
**Stage:** backlog
**Dependencies:** None

## Description

Test description for the work item.

## Work Log

_No work log entries._
`;

      mockGET.mockResolvedValue(createSuccessResponse({ markdown: expectedMarkdown }));

      const request = createRequest('/api/items/WI-001/render');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockGET(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('markdown');
      expect(typeof data.data.markdown).toBe('string');
    });

    it('should include item title in markdown', async () => {
      const mockItem = createMockItem({ id: 'WI-002', title: 'Important Feature' });
      mockPrismaClient.item.findFirst.mockResolvedValue(mockItem);

      const markdown = `# WI-002: Important Feature

**Type:** feature
**Priority:** medium
**Stage:** backlog
**Dependencies:** None

## Description

Test description for the work item.

## Work Log

_No work log entries._
`;

      mockGET.mockResolvedValue(createSuccessResponse({ markdown }));

      const request = createRequest('/api/items/WI-002/render');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-002' }) };
      const response = await mockGET(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.markdown).toContain('Important Feature');
      expect(data.data.markdown).toContain('WI-002');
    });

    it('should include item description in markdown', async () => {
      const mockItem = createMockItem({
        id: 'WI-001',
        description: 'This is a detailed description of the feature.',
      });
      mockPrismaClient.item.findFirst.mockResolvedValue(mockItem);

      const markdown = `# WI-001: Test Item

**Type:** feature
**Priority:** medium
**Stage:** backlog
**Dependencies:** None

## Description

This is a detailed description of the feature.

## Work Log

_No work log entries._
`;

      mockGET.mockResolvedValue(createSuccessResponse({ markdown }));

      const request = createRequest('/api/items/WI-001/render');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockGET(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.markdown).toContain('This is a detailed description of the feature.');
    });

    it('should include item type in markdown', async () => {
      const mockItem = createMockItem({ id: 'WI-001', type: 'bug' });
      mockPrismaClient.item.findFirst.mockResolvedValue(mockItem);

      const markdown = `# WI-001: Test Item

**Type:** bug
**Priority:** medium
**Stage:** backlog
**Dependencies:** None

## Description

Test description for the work item.

## Work Log

_No work log entries._
`;

      mockGET.mockResolvedValue(createSuccessResponse({ markdown }));

      const request = createRequest('/api/items/WI-001/render');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockGET(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.markdown).toContain('**Type:** bug');
    });

    it('should include item priority in markdown', async () => {
      const mockItem = createMockItem({ id: 'WI-001', priority: 'critical' });
      mockPrismaClient.item.findFirst.mockResolvedValue(mockItem);

      const markdown = `# WI-001: Test Item

**Type:** feature
**Priority:** critical
**Stage:** backlog
**Dependencies:** None

## Description

Test description for the work item.

## Work Log

_No work log entries._
`;

      mockGET.mockResolvedValue(createSuccessResponse({ markdown }));

      const request = createRequest('/api/items/WI-001/render');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockGET(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.markdown).toContain('**Priority:** critical');
    });

    it('should include item stage in markdown', async () => {
      const mockItem = createMockItem({ id: 'WI-001', stageId: 'testing' });
      mockPrismaClient.item.findFirst.mockResolvedValue(mockItem);

      const markdown = `# WI-001: Test Item

**Type:** feature
**Priority:** medium
**Stage:** in_progress
**Dependencies:** None

## Description

Test description for the work item.

## Work Log

_No work log entries._
`;

      mockGET.mockResolvedValue(createSuccessResponse({ markdown }));

      const request = createRequest('/api/items/WI-001/render');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockGET(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.markdown).toContain('**Stage:** in_progress');
    });

    it('should include dependencies in markdown', async () => {
      const mockItem = createMockItem({
        id: 'WI-003',
        dependencies: ['WI-001', 'WI-002'],
      });
      mockPrismaClient.item.findFirst.mockResolvedValue(mockItem);

      const markdown = `# WI-003: Test Item

**Type:** feature
**Priority:** medium
**Stage:** backlog
**Dependencies:** WI-001, WI-002

## Description

Test description for the work item.

## Work Log

_No work log entries._
`;

      mockGET.mockResolvedValue(createSuccessResponse({ markdown }));

      const request = createRequest('/api/items/WI-003/render');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-003' }) };
      const response = await mockGET(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.markdown).toContain('WI-001');
      expect(data.data.markdown).toContain('WI-002');
    });

    it('should show None for items with no dependencies', async () => {
      const mockItem = createMockItem({
        id: 'WI-001',
        dependencies: [],
      });
      mockPrismaClient.item.findFirst.mockResolvedValue(mockItem);

      const markdown = `# WI-001: Test Item

**Type:** feature
**Priority:** medium
**Stage:** backlog
**Dependencies:** None

## Description

Test description for the work item.

## Work Log

_No work log entries._
`;

      mockGET.mockResolvedValue(createSuccessResponse({ markdown }));

      const request = createRequest('/api/items/WI-001/render');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockGET(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.markdown).toContain('**Dependencies:** None');
    });
  });

  describe('work log inclusion', () => {
    it('should include work log by default (includeWorkLog not specified)', async () => {
      const workLogs: WorkLogEntry[] = [
        createMockWorkLog({
          id: 1,
          agent: 'Murdock',
          action: 'started',
          summary: 'Started testing',
          timestamp: new Date('2026-01-21T10:00:00Z'),
        }),
        createMockWorkLog({
          id: 2,
          agent: 'Murdock',
          action: 'completed',
          summary: 'Tests passed',
          timestamp: new Date('2026-01-21T11:00:00Z'),
        }),
      ];

      const mockItem = createMockItem({
        id: 'WI-001',
        workLogs,
      });
      mockPrismaClient.item.findFirst.mockResolvedValue(mockItem);

      const markdown = `# WI-001: Test Item

**Type:** feature
**Priority:** medium
**Stage:** backlog
**Dependencies:** None

## Description

Test description for the work item.

## Work Log

- **2026-01-21 10:00** [Murdock] started: Started testing
- **2026-01-21 11:00** [Murdock] completed: Tests passed
`;

      mockGET.mockResolvedValue(createSuccessResponse({ markdown }));

      const request = createRequest('/api/items/WI-001/render');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockGET(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.markdown).toContain('Work Log');
      expect(data.data.markdown).toContain('Murdock');
      expect(data.data.markdown).toContain('Started testing');
      expect(data.data.markdown).toContain('Tests passed');
    });

    it('should include work log when includeWorkLog=true', async () => {
      const workLogs: WorkLogEntry[] = [
        createMockWorkLog({
          id: 1,
          agent: 'B.A.',
          action: 'started',
          summary: 'Implementation started',
          timestamp: new Date('2026-01-21T14:00:00Z'),
        }),
      ];

      const mockItem = createMockItem({
        id: 'WI-002',
        workLogs,
      });
      mockPrismaClient.item.findFirst.mockResolvedValue(mockItem);

      const markdown = `# WI-002: Test Item

**Type:** feature
**Priority:** medium
**Stage:** backlog
**Dependencies:** None

## Description

Test description for the work item.

## Work Log

- **2026-01-21 14:00** [B.A.] started: Implementation started
`;

      mockGET.mockResolvedValue(createSuccessResponse({ markdown }));

      const request = createRequest('/api/items/WI-002/render?includeWorkLog=true');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-002' }) };
      const response = await mockGET(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.markdown).toContain('Work Log');
      expect(data.data.markdown).toContain('B.A.');
      expect(data.data.markdown).toContain('Implementation started');
    });

    it('should exclude work log when includeWorkLog=false', async () => {
      const workLogs: WorkLogEntry[] = [
        createMockWorkLog({
          id: 1,
          agent: 'Murdock',
          action: 'started',
          summary: 'Should not appear',
          timestamp: new Date('2026-01-21T10:00:00Z'),
        }),
      ];

      const mockItem = createMockItem({
        id: 'WI-001',
        workLogs,
      });
      mockPrismaClient.item.findFirst.mockResolvedValue(mockItem);

      // When includeWorkLog=false, work log section should be omitted
      const markdown = `# WI-001: Test Item

**Type:** feature
**Priority:** medium
**Stage:** backlog
**Dependencies:** None

## Description

Test description for the work item.
`;

      mockGET.mockResolvedValue(createSuccessResponse({ markdown }));

      const request = createRequest('/api/items/WI-001/render?includeWorkLog=false');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockGET(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.markdown).not.toContain('## Work Log');
      expect(data.data.markdown).not.toContain('Should not appear');
    });

    it('should show message when work log is empty and includeWorkLog=true', async () => {
      const mockItem = createMockItem({
        id: 'WI-001',
        workLogs: [],
      });
      mockPrismaClient.item.findFirst.mockResolvedValue(mockItem);

      const markdown = `# WI-001: Test Item

**Type:** feature
**Priority:** medium
**Stage:** backlog
**Dependencies:** None

## Description

Test description for the work item.

## Work Log

_No work log entries._
`;

      mockGET.mockResolvedValue(createSuccessResponse({ markdown }));

      const request = createRequest('/api/items/WI-001/render?includeWorkLog=true');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockGET(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.markdown).toContain('Work Log');
      expect(data.data.markdown).toContain('No work log entries');
    });
  });

  describe('work log formatting', () => {
    it('should format work log entries with timestamp, agent, action, and summary', async () => {
      const workLogs: WorkLogEntry[] = [
        createMockWorkLog({
          id: 1,
          agent: 'Murdock',
          action: 'started',
          summary: 'Beginning test suite',
          timestamp: new Date('2026-01-21T10:30:00Z'),
        }),
      ];

      const mockItem = createMockItem({
        id: 'WI-001',
        workLogs,
      });
      mockPrismaClient.item.findFirst.mockResolvedValue(mockItem);

      const markdown = `# WI-001: Test Item

**Type:** feature
**Priority:** medium
**Stage:** backlog
**Dependencies:** None

## Description

Test description for the work item.

## Work Log

- **2026-01-21 10:30** [Murdock] started: Beginning test suite
`;

      mockGET.mockResolvedValue(createSuccessResponse({ markdown }));

      const request = createRequest('/api/items/WI-001/render');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockGET(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();
      // Verify work log entry contains all expected parts
      expect(data.data.markdown).toContain('Murdock');
      expect(data.data.markdown).toContain('started');
      expect(data.data.markdown).toContain('Beginning test suite');
    });

    it('should order work log entries chronologically', async () => {
      const workLogs: WorkLogEntry[] = [
        createMockWorkLog({
          id: 1,
          agent: 'Murdock',
          action: 'started',
          summary: 'First entry',
          timestamp: new Date('2026-01-21T10:00:00Z'),
        }),
        createMockWorkLog({
          id: 2,
          agent: 'B.A.',
          action: 'completed',
          summary: 'Second entry',
          timestamp: new Date('2026-01-21T12:00:00Z'),
        }),
        createMockWorkLog({
          id: 3,
          agent: 'Hannibal',
          action: 'note',
          summary: 'Third entry',
          timestamp: new Date('2026-01-21T14:00:00Z'),
        }),
      ];

      const mockItem = createMockItem({
        id: 'WI-001',
        workLogs,
      });
      mockPrismaClient.item.findFirst.mockResolvedValue(mockItem);

      const markdown = `# WI-001: Test Item

**Type:** feature
**Priority:** medium
**Stage:** backlog
**Dependencies:** None

## Description

Test description for the work item.

## Work Log

- **2026-01-21 10:00** [Murdock] started: First entry
- **2026-01-21 12:00** [B.A.] completed: Second entry
- **2026-01-21 14:00** [Hannibal] note: Third entry
`;

      mockGET.mockResolvedValue(createSuccessResponse({ markdown }));

      const request = createRequest('/api/items/WI-001/render');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockGET(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();

      // Verify entries appear in chronological order
      const firstIndex = data.data.markdown.indexOf('First entry');
      const secondIndex = data.data.markdown.indexOf('Second entry');
      const thirdIndex = data.data.markdown.indexOf('Third entry');

      expect(firstIndex).toBeLessThan(secondIndex);
      expect(secondIndex).toBeLessThan(thirdIndex);
    });
  });

  describe('error handling', () => {
    it('should return ITEM_NOT_FOUND for non-existent item', async () => {
      mockPrismaClient.item.findFirst.mockResolvedValue(null);
      mockGET.mockResolvedValue(createErrorResponse(
        'ITEM_NOT_FOUND',
        'Item WI-999 not found',
        404,
        { itemId: 'WI-999' }
      ));

      const request = createRequest('/api/items/WI-999/render');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-999' }) };
      const response = await mockGET(request, params);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('ITEM_NOT_FOUND');
      expect(data.error.message).toContain('WI-999');
    });

    it('should return ITEM_NOT_FOUND for archived item', async () => {
      // Archived items are excluded by findFirst query
      mockPrismaClient.item.findFirst.mockResolvedValue(null);
      mockGET.mockResolvedValue(createErrorResponse(
        'ITEM_NOT_FOUND',
        'Item WI-001 not found',
        404,
        { itemId: 'WI-001' }
      ));

      const request = createRequest('/api/items/WI-001/render');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockGET(request, params);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('ITEM_NOT_FOUND');
    });

    it('should return 500 for database errors', async () => {
      mockPrismaClient.item.findFirst.mockRejectedValue(new Error('Database connection failed'));
      mockGET.mockResolvedValue(
        NextResponse.json(
          { success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } },
          { status: 500 }
        )
      );

      const request = createRequest('/api/items/WI-001/render');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockGET(request, params);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('SERVER_ERROR');
    });
  });

  describe('response format', () => {
    it('should return response matching RenderItemResponse type', async () => {
      const mockItem = createMockItem({ id: 'WI-001' });
      mockPrismaClient.item.findFirst.mockResolvedValue(mockItem);

      const markdown = '# WI-001: Test Item\n\n...';
      mockGET.mockResolvedValue(createSuccessResponse({ markdown }));

      const request = createRequest('/api/items/WI-001/render');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockGET(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();

      // Verify RenderItemResponse structure
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('markdown');
      expect(typeof data.data.markdown).toBe('string');
    });

    it('should return valid markdown that is human-readable', async () => {
      const mockItem = createMockItem({
        id: 'WI-005',
        title: 'User Authentication Feature',
        description: 'Implement OAuth2 authentication flow for the application.',
        type: 'feature',
        priority: 'high',
        stageId: 'review',
        dependencies: ['WI-001', 'WI-002'],
        workLogs: [
          createMockWorkLog({
            id: 1,
            agent: 'Murdock',
            action: 'started',
            summary: 'Writing test cases',
            timestamp: new Date('2026-01-21T09:00:00Z'),
          }),
          createMockWorkLog({
            id: 2,
            agent: 'B.A.',
            action: 'completed',
            summary: 'Implementation complete',
            timestamp: new Date('2026-01-21T15:00:00Z'),
          }),
        ],
      });
      mockPrismaClient.item.findFirst.mockResolvedValue(mockItem);

      const markdown = `# WI-005: User Authentication Feature

**Type:** feature
**Priority:** high
**Stage:** review
**Dependencies:** WI-001, WI-002

## Description

Implement OAuth2 authentication flow for the application.

## Work Log

- **2026-01-21 09:00** [Murdock] started: Writing test cases
- **2026-01-21 15:00** [B.A.] completed: Implementation complete
`;

      mockGET.mockResolvedValue(createSuccessResponse({ markdown }));

      const request = createRequest('/api/items/WI-005/render');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-005' }) };
      const response = await mockGET(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();

      // Verify the markdown is well-formed
      expect(data.data.markdown).toContain('# WI-005');
      expect(data.data.markdown).toContain('User Authentication Feature');
      expect(data.data.markdown).toContain('OAuth2');
      expect(data.data.markdown).toContain('feature');
      expect(data.data.markdown).toContain('high');
      expect(data.data.markdown).toContain('review');
      expect(data.data.markdown).toContain('WI-001');
      expect(data.data.markdown).toContain('WI-002');
      expect(data.data.markdown).toContain('Writing test cases');
      expect(data.data.markdown).toContain('Implementation complete');
    });
  });
});
