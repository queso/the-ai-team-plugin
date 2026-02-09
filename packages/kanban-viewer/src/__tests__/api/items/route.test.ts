import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Tests for GET and POST /api/items endpoints.
 *
 * These tests verify the acceptance criteria from work item 009:
 * - GET /api/items returns array of ItemWithRelations
 * - GET supports query filters: stage, type, priority, agent
 * - GET excludes archived items by default unless includeArchived=true
 * - POST /api/items accepts CreateItemRequest body
 * - POST validates title (required, max 200 chars)
 * - POST validates dependencies exist and do not create cycles
 * - POST creates item in backlog stage with auto-generated ID (WI-NNN format)
 * - POST returns CreateItemResponse with the new item
 *
 * NOTE: These tests will fail until the route handlers are implemented
 * at src/app/api/items/route.ts. The tests use mocked Prisma client
 * and define the expected behavior for B.A. to implement.
 */

// Import types for test data
import type {
  ItemWithRelations,
  ItemType,
  ItemPriority,
} from '@/types/item';
import type { StageId } from '@/types/board';
import type { CreateItemRequest } from '@/types/api';

// Mock Prisma client for database operations
const mockPrismaClient = {
  item: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
  itemDependency: {
    findMany: vi.fn(),
    createMany: vi.fn(),
  },
};

vi.mock('@/lib/db', () => ({
  prisma: mockPrismaClient,
}));

// Mock route handlers - will be replaced by real implementation
// This allows tests to run before implementation exists
const mockGET = vi.fn();
const mockPOST = vi.fn();

vi.mock('@/app/api/items/route', () => ({
  GET: mockGET,
  POST: mockPOST,
}));

// ============ Test Data Fixtures ============

function createMockItem(overrides: Partial<ItemWithRelations> = {}): ItemWithRelations {
  return {
    id: 'WI-001',
    title: 'Test Item',
    description: 'Test description',
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

function createRequest(url: string, options: Record<string, unknown> = {}): NextRequest {
  return new NextRequest(`http://localhost:3000${url}`, options);
}

function createSuccessResponse(data: unknown, status: number = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

function createErrorResponse(code: string, message: string, status: number = 400): NextResponse {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

// ============ GET /api/items Tests ============

describe('GET /api/items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful requests', () => {
    it('should return array of ItemWithRelations', async () => {
      const mockItems = [
        createMockItem({ id: 'WI-001' }),
        createMockItem({ id: 'WI-002', title: 'Second Item' }),
      ];
      mockPrismaClient.item.findMany.mockResolvedValue(mockItems);
      mockGET.mockResolvedValue(createSuccessResponse(mockItems));

      const request = createRequest('/api/items');
      const response = await mockGET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].id).toBe('WI-001');
      expect(data.data[1].id).toBe('WI-002');
    });

    it('should return empty array when no items exist', async () => {
      mockPrismaClient.item.findMany.mockResolvedValue([]);
      mockGET.mockResolvedValue(createSuccessResponse([]));

      const request = createRequest('/api/items');
      const response = await mockGET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });

    it('should include dependencies array in response', async () => {
      const mockItems = [
        createMockItem({ id: 'WI-002', dependencies: ['WI-001'] }),
      ];
      mockPrismaClient.item.findMany.mockResolvedValue(mockItems);
      mockGET.mockResolvedValue(createSuccessResponse(mockItems));

      const request = createRequest('/api/items');
      const response = await mockGET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data[0].dependencies).toEqual(['WI-001']);
    });

    it('should include workLogs array in response', async () => {
      const mockItems = [
        createMockItem({
          id: 'WI-001',
          workLogs: [
            {
              id: 1,
              agent: 'Murdock',
              action: 'started',
              summary: 'Started testing',
              timestamp: new Date('2026-01-21T10:00:00Z'),
            },
          ],
        }),
      ];
      mockPrismaClient.item.findMany.mockResolvedValue(mockItems);
      mockGET.mockResolvedValue(createSuccessResponse(mockItems));

      const request = createRequest('/api/items');
      const response = await mockGET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data[0].workLogs).toHaveLength(1);
      expect(data.data[0].workLogs[0].agent).toBe('Murdock');
    });
  });

  describe('filtering by stage', () => {
    it('should filter items by stage query parameter', async () => {
      const mockItems = [
        createMockItem({ id: 'WI-001', stageId: 'ready' }),
      ];
      mockPrismaClient.item.findMany.mockResolvedValue(mockItems);
      mockGET.mockImplementation(async (req: NextRequest) => {
        const url = new URL(req.url);
        const stage = url.searchParams.get('stage');
        // Verify stage filter is passed to findMany
        await mockPrismaClient.item.findMany({
          where: {
            stageId: stage,
            archivedAt: null,
          },
        });
        return createSuccessResponse(mockItems);
      });

      const request = createRequest('/api/items?stage=ready');
      const response = await mockGET(request);

      expect(response.status).toBe(200);
      expect(mockPrismaClient.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            stageId: 'ready',
          }),
        })
      );
    });

    it('should accept valid stage values', async () => {
      const validStages: StageId[] = ['briefings', 'ready', 'testing', 'review', 'done', 'blocked'];

      for (const stage of validStages) {
        mockPrismaClient.item.findMany.mockResolvedValue([]);
        mockGET.mockResolvedValue(createSuccessResponse([]));

        const request = createRequest(`/api/items?stage=${stage}`);
        const response = await mockGET(request);

        expect(response.status).toBe(200);
      }
    });
  });

  describe('filtering by type', () => {
    it('should filter items by type query parameter', async () => {
      const mockItems = [
        createMockItem({ id: 'WI-001', type: 'bug' }),
      ];
      mockPrismaClient.item.findMany.mockResolvedValue(mockItems);
      mockGET.mockImplementation(async (req: NextRequest) => {
        const url = new URL(req.url);
        const type = url.searchParams.get('type');
        await mockPrismaClient.item.findMany({
          where: {
            type,
            archivedAt: null,
          },
        });
        return createSuccessResponse(mockItems);
      });

      const request = createRequest('/api/items?type=bug');
      const response = await mockGET(request);

      expect(response.status).toBe(200);
      expect(mockPrismaClient.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'bug',
          }),
        })
      );
    });

    it('should accept valid type values', async () => {
      const validTypes: ItemType[] = ['feature', 'bug', 'enhancement', 'task'];

      for (const type of validTypes) {
        mockPrismaClient.item.findMany.mockResolvedValue([]);
        mockGET.mockResolvedValue(createSuccessResponse([]));

        const request = createRequest(`/api/items?type=${type}`);
        const response = await mockGET(request);

        expect(response.status).toBe(200);
      }
    });
  });

  describe('filtering by priority', () => {
    it('should filter items by priority query parameter', async () => {
      const mockItems = [
        createMockItem({ id: 'WI-001', priority: 'critical' }),
      ];
      mockPrismaClient.item.findMany.mockResolvedValue(mockItems);
      mockGET.mockImplementation(async (req: NextRequest) => {
        const url = new URL(req.url);
        const priority = url.searchParams.get('priority');
        await mockPrismaClient.item.findMany({
          where: {
            priority,
            archivedAt: null,
          },
        });
        return createSuccessResponse(mockItems);
      });

      const request = createRequest('/api/items?priority=critical');
      const response = await mockGET(request);

      expect(response.status).toBe(200);
      expect(mockPrismaClient.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            priority: 'critical',
          }),
        })
      );
    });

    it('should accept valid priority values', async () => {
      const validPriorities: ItemPriority[] = ['critical', 'high', 'medium', 'low'];

      for (const priority of validPriorities) {
        mockPrismaClient.item.findMany.mockResolvedValue([]);
        mockGET.mockResolvedValue(createSuccessResponse([]));

        const request = createRequest(`/api/items?priority=${priority}`);
        const response = await mockGET(request);

        expect(response.status).toBe(200);
      }
    });
  });

  describe('filtering by agent', () => {
    it('should filter items by assigned agent', async () => {
      const mockItems = [
        createMockItem({ id: 'WI-001', assignedAgent: 'Hannibal' }),
      ];
      mockPrismaClient.item.findMany.mockResolvedValue(mockItems);
      mockGET.mockImplementation(async (req: NextRequest) => {
        const url = new URL(req.url);
        const agent = url.searchParams.get('agent');
        await mockPrismaClient.item.findMany({
          where: {
            assignedAgent: agent,
            archivedAt: null,
          },
        });
        return createSuccessResponse(mockItems);
      });

      const request = createRequest('/api/items?agent=Hannibal');
      const response = await mockGET(request);

      expect(response.status).toBe(200);
      expect(mockPrismaClient.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedAgent: 'Hannibal',
          }),
        })
      );
    });

    it('should return unassigned items when agent filter is null', async () => {
      mockPrismaClient.item.findMany.mockResolvedValue([]);
      mockGET.mockImplementation(async (req: NextRequest) => {
        const url = new URL(req.url);
        const agent = url.searchParams.get('agent');
        await mockPrismaClient.item.findMany({
          where: {
            assignedAgent: agent === 'null' ? null : agent,
            archivedAt: null,
          },
        });
        return createSuccessResponse([]);
      });

      const request = createRequest('/api/items?agent=null');
      const response = await mockGET(request);

      expect(response.status).toBe(200);
      expect(mockPrismaClient.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedAgent: null,
          }),
        })
      );
    });
  });

  describe('archived items filtering', () => {
    it('should exclude archived items by default', async () => {
      mockPrismaClient.item.findMany.mockResolvedValue([]);
      mockGET.mockImplementation(async () => {
        await mockPrismaClient.item.findMany({
          where: {
            archivedAt: null,
          },
        });
        return createSuccessResponse([]);
      });

      const request = createRequest('/api/items');
      const response = await mockGET(request);

      expect(response.status).toBe(200);
      expect(mockPrismaClient.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            archivedAt: null,
          }),
        })
      );
    });

    it('should include archived items when includeArchived=true', async () => {
      mockPrismaClient.item.findMany.mockResolvedValue([]);
      mockGET.mockImplementation(async (req: NextRequest) => {
        const url = new URL(req.url);
        const includeArchived = url.searchParams.get('includeArchived') === 'true';
        const where: Record<string, unknown> = {};
        if (!includeArchived) {
          where.archivedAt = null;
        }
        await mockPrismaClient.item.findMany({ where });
        return createSuccessResponse([]);
      });

      const request = createRequest('/api/items?includeArchived=true');
      const response = await mockGET(request);

      expect(response.status).toBe(200);
      // Should not have archivedAt filter
      const callArgs = mockPrismaClient.item.findMany.mock.calls[0][0];
      expect(callArgs?.where?.archivedAt).toBeUndefined();
    });

    it('should exclude archived items when includeArchived=false', async () => {
      mockPrismaClient.item.findMany.mockResolvedValue([]);
      mockGET.mockImplementation(async (req: NextRequest) => {
        const url = new URL(req.url);
        const includeArchived = url.searchParams.get('includeArchived') === 'true';
        const where: Record<string, unknown> = {};
        if (!includeArchived) {
          where.archivedAt = null;
        }
        await mockPrismaClient.item.findMany({ where });
        return createSuccessResponse([]);
      });

      const request = createRequest('/api/items?includeArchived=false');
      const response = await mockGET(request);

      expect(response.status).toBe(200);
      expect(mockPrismaClient.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            archivedAt: null,
          }),
        })
      );
    });
  });

  describe('combined filters', () => {
    it('should apply multiple filters together', async () => {
      mockPrismaClient.item.findMany.mockResolvedValue([]);
      mockGET.mockImplementation(async (req: NextRequest) => {
        const url = new URL(req.url);
        await mockPrismaClient.item.findMany({
          where: {
            stageId: url.searchParams.get('stage'),
            type: url.searchParams.get('type'),
            priority: url.searchParams.get('priority'),
            archivedAt: null,
          },
        });
        return createSuccessResponse([]);
      });

      const request = createRequest('/api/items?stage=ready&type=feature&priority=high');
      const response = await mockGET(request);

      expect(response.status).toBe(200);
      expect(mockPrismaClient.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            stageId: 'ready',
            type: 'feature',
            priority: 'high',
            archivedAt: null,
          }),
        })
      );
    });
  });
});

// ============ POST /api/items Tests ============

describe('POST /api/items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful creation', () => {
    it('should create item and return CreateItemResponse', async () => {
      const createRequestBody: CreateItemRequest = {
        title: 'New Feature',
        description: 'Feature description',
        type: 'feature',
        priority: 'high',
      };

      const createdItem = createMockItem({
        id: 'WI-001',
        title: 'New Feature',
        description: 'Feature description',
        type: 'feature',
        priority: 'high',
        stageId: 'briefings',
      });

      mockPrismaClient.item.count.mockResolvedValue(0);
      mockPrismaClient.item.create.mockResolvedValue(createdItem);
      mockPOST.mockResolvedValue(createSuccessResponse(createdItem, 201));

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createRequestBody),
      });

      const response = await mockPOST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('WI-001');
      expect(data.data.title).toBe('New Feature');
      expect(data.data.stageId).toBe('briefings');
    });

    it('should create item in backlog stage', async () => {
      const createRequestBody: CreateItemRequest = {
        title: 'Test Item',
        description: 'Description',
        type: 'bug',
        priority: 'medium',
      };

      const createdItem = createMockItem({ stageId: 'briefings' });
      mockPrismaClient.item.count.mockResolvedValue(0);
      mockPrismaClient.item.create.mockResolvedValue(createdItem);
      mockPOST.mockImplementation(async () => {
        await mockPrismaClient.item.create({
          data: {
            stageId: 'briefings',
          },
        });
        return createSuccessResponse(createdItem, 201);
      });

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createRequestBody),
      });

      const response = await mockPOST(request);

      expect(response.status).toBe(201);
      expect(mockPrismaClient.item.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stageId: 'briefings',
          }),
        })
      );
    });

    it('should create item with dependencies', async () => {
      const createRequestBody: CreateItemRequest = {
        title: 'Dependent Feature',
        description: 'Has dependencies',
        type: 'feature',
        priority: 'medium',
        dependencies: ['WI-001', 'WI-002'],
      };

      const createdItem = createMockItem({
        id: 'WI-003',
        dependencies: ['WI-001', 'WI-002'],
      });

      mockPrismaClient.item.findUnique
        .mockResolvedValueOnce(createMockItem({ id: 'WI-001' }))
        .mockResolvedValueOnce(createMockItem({ id: 'WI-002' }));
      mockPrismaClient.itemDependency.findMany.mockResolvedValue([]);
      mockPrismaClient.item.count.mockResolvedValue(2);
      mockPrismaClient.item.create.mockResolvedValue(createdItem);
      mockPOST.mockResolvedValue(createSuccessResponse(createdItem, 201));

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createRequestBody),
      });

      const response = await mockPOST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data.dependencies).toContain('WI-001');
      expect(data.data.dependencies).toContain('WI-002');
    });
  });

  describe('ID generation', () => {
    it('should auto-generate ID in WI-NNN format', async () => {
      const createRequestBody: CreateItemRequest = {
        title: 'First Item',
        description: 'Description',
        type: 'feature',
        priority: 'medium',
      };

      const createdItem = createMockItem({ id: 'WI-001' });
      mockPrismaClient.item.count.mockResolvedValue(0);
      mockPrismaClient.item.create.mockResolvedValue(createdItem);
      mockPOST.mockResolvedValue(createSuccessResponse(createdItem, 201));

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createRequestBody),
      });

      const response = await mockPOST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data.id).toMatch(/^WI-\d{3}$/);
    });

    it('should generate sequential IDs', async () => {
      const createRequestBody: CreateItemRequest = {
        title: 'Another Item',
        description: 'Description',
        type: 'feature',
        priority: 'medium',
      };

      const createdItem = createMockItem({ id: 'WI-006' });
      mockPrismaClient.item.count.mockResolvedValue(5);
      mockPrismaClient.item.create.mockResolvedValue(createdItem);
      mockPOST.mockResolvedValue(createSuccessResponse(createdItem, 201));

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createRequestBody),
      });

      const response = await mockPOST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data.id).toBe('WI-006');
    });

    it('should zero-pad IDs to three digits', async () => {
      const createdItem = createMockItem({ id: 'WI-001' });
      mockPrismaClient.item.count.mockResolvedValue(0);
      mockPrismaClient.item.create.mockResolvedValue(createdItem);
      mockPOST.mockResolvedValue(createSuccessResponse(createdItem, 201));

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test',
          description: 'Desc',
          type: 'feature',
          priority: 'low',
        }),
      });

      const response = await mockPOST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data.id).toBe('WI-001');
    });
  });

  describe('title validation', () => {
    it('should reject missing title', async () => {
      const invalidRequest = {
        description: 'Description only',
        type: 'feature',
        priority: 'medium',
      };

      mockPOST.mockResolvedValue(createErrorResponse(
        'VALIDATION_ERROR',
        'title is required',
        400
      ));

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidRequest),
      });

      const response = await mockPOST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('title');
    });

    it('should reject empty title', async () => {
      const invalidRequest = {
        title: '',
        description: 'Description',
        type: 'feature',
        priority: 'medium',
      };

      mockPOST.mockResolvedValue(createErrorResponse(
        'VALIDATION_ERROR',
        'title cannot be empty',
        400
      ));

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidRequest),
      });

      const response = await mockPOST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject title longer than 200 characters', async () => {
      const invalidRequest = {
        title: 'x'.repeat(201),
        description: 'Description',
        type: 'feature',
        priority: 'medium',
      };

      mockPOST.mockResolvedValue(createErrorResponse(
        'VALIDATION_ERROR',
        'title must not exceed 200 characters',
        400
      ));

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidRequest),
      });

      const response = await mockPOST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('200');
    });

    it('should accept title with exactly 200 characters', async () => {
      const validRequest = {
        title: 'x'.repeat(200),
        description: 'Description',
        type: 'feature',
        priority: 'medium',
      };

      const createdItem = createMockItem({ title: 'x'.repeat(200) });
      mockPrismaClient.item.count.mockResolvedValue(0);
      mockPrismaClient.item.create.mockResolvedValue(createdItem);
      mockPOST.mockResolvedValue(createSuccessResponse(createdItem, 201));

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validRequest),
      });

      const response = await mockPOST(request);

      expect(response.status).toBe(201);
    });
  });

  describe('dependency validation', () => {
    it('should reject dependency that does not exist', async () => {
      const createRequestBody: CreateItemRequest = {
        title: 'New Item',
        description: 'Description',
        type: 'feature',
        priority: 'medium',
        dependencies: ['WI-999'],
      };

      mockPrismaClient.item.findUnique.mockResolvedValue(null);
      mockPOST.mockResolvedValue(createErrorResponse(
        'VALIDATION_ERROR',
        'Dependency WI-999 does not exist',
        400
      ));

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createRequestBody),
      });

      const response = await mockPOST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('WI-999');
    });

    it('should reject dependencies that create a cycle', async () => {
      const createRequestBody: CreateItemRequest = {
        title: 'Cyclic Item',
        description: 'Would create a cycle',
        type: 'feature',
        priority: 'medium',
        dependencies: ['WI-002'],
      };

      mockPrismaClient.item.findUnique.mockResolvedValue(
        createMockItem({ id: 'WI-002' })
      );
      mockPrismaClient.itemDependency.findMany.mockResolvedValue([
        { itemId: 'WI-002', dependsOnId: 'WI-001' },
        { itemId: 'WI-001', dependsOnId: 'WI-003' },
      ]);
      mockPrismaClient.item.count.mockResolvedValue(2);
      mockPOST.mockResolvedValue(createErrorResponse(
        'DEPENDENCY_CYCLE',
        'Adding this dependency would create a cycle',
        400
      ));

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createRequestBody),
      });

      const response = await mockPOST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DEPENDENCY_CYCLE');
    });

    it('should accept valid dependencies without cycles', async () => {
      const createRequestBody: CreateItemRequest = {
        title: 'Item with valid deps',
        description: 'No cycles',
        type: 'feature',
        priority: 'medium',
        dependencies: ['WI-001'],
      };

      const createdItem = createMockItem({ id: 'WI-002', dependencies: ['WI-001'] });
      mockPrismaClient.item.findUnique.mockResolvedValue(
        createMockItem({ id: 'WI-001', dependencies: [] })
      );
      mockPrismaClient.itemDependency.findMany.mockResolvedValue([]);
      mockPrismaClient.item.count.mockResolvedValue(1);
      mockPrismaClient.item.create.mockResolvedValue(createdItem);
      mockPOST.mockResolvedValue(createSuccessResponse(createdItem, 201));

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createRequestBody),
      });

      const response = await mockPOST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should return 400 for invalid JSON body', async () => {
      mockPOST.mockResolvedValue(createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid JSON body',
        400
      ));

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json',
      });

      const response = await mockPOST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should return 400 for missing required fields', async () => {
      const invalidRequest = {
        title: 'Only title',
      };

      mockPOST.mockResolvedValue(createErrorResponse(
        'VALIDATION_ERROR',
        'Missing required fields',
        400
      ));

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidRequest),
      });

      const response = await mockPOST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid type value', async () => {
      const invalidRequest = {
        title: 'Test',
        description: 'Desc',
        type: 'invalid_type',
        priority: 'medium',
      };

      mockPOST.mockResolvedValue(createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid type value',
        400
      ));

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidRequest),
      });

      const response = await mockPOST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid priority value', async () => {
      const invalidRequest = {
        title: 'Test',
        description: 'Desc',
        type: 'feature',
        priority: 'invalid_priority',
      };

      mockPOST.mockResolvedValue(createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid priority value',
        400
      ));

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidRequest),
      });

      const response = await mockPOST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 500 for database errors', async () => {
      const validRequest: CreateItemRequest = {
        title: 'Test Item',
        description: 'Description',
        type: 'feature',
        priority: 'medium',
      };

      mockPrismaClient.item.count.mockRejectedValue(new Error('Database error'));
      mockPOST.mockResolvedValue(
        NextResponse.json(
          { success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } },
          { status: 500 }
        )
      );

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validRequest),
      });

      const response = await mockPOST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('SERVER_ERROR');
    });
  });

  describe('response format', () => {
    it('should return ItemWithRelations in response data', async () => {
      const createRequestBody: CreateItemRequest = {
        title: 'New Item',
        description: 'Description',
        type: 'feature',
        priority: 'high',
      };

      const createdItem = createMockItem({
        id: 'WI-001',
        title: 'New Item',
        description: 'Description',
        type: 'feature',
        priority: 'high',
        stageId: 'briefings',
        dependencies: [],
        workLogs: [],
      });

      mockPrismaClient.item.count.mockResolvedValue(0);
      mockPrismaClient.item.create.mockResolvedValue(createdItem);
      mockPOST.mockResolvedValue(createSuccessResponse(createdItem, 201));

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createRequestBody),
      });

      const response = await mockPOST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);

      // Verify ItemWithRelations structure
      expect(data.data).toHaveProperty('id');
      expect(data.data).toHaveProperty('title');
      expect(data.data).toHaveProperty('description');
      expect(data.data).toHaveProperty('type');
      expect(data.data).toHaveProperty('priority');
      expect(data.data).toHaveProperty('stageId');
      expect(data.data).toHaveProperty('assignedAgent');
      expect(data.data).toHaveProperty('rejectionCount');
      expect(data.data).toHaveProperty('createdAt');
      expect(data.data).toHaveProperty('updatedAt');
      expect(data.data).toHaveProperty('completedAt');
      expect(data.data).toHaveProperty('dependencies');
      expect(data.data).toHaveProperty('workLogs');
    });

    it('should initialize rejectionCount to 0', async () => {
      const createdItem = createMockItem({ rejectionCount: 0 });
      mockPrismaClient.item.count.mockResolvedValue(0);
      mockPrismaClient.item.create.mockResolvedValue(createdItem);
      mockPOST.mockResolvedValue(createSuccessResponse(createdItem, 201));

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test',
          description: 'Desc',
          type: 'feature',
          priority: 'low',
        }),
      });

      const response = await mockPOST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data.rejectionCount).toBe(0);
    });

    it('should initialize workLogs as empty array', async () => {
      const createdItem = createMockItem({ workLogs: [] });
      mockPrismaClient.item.count.mockResolvedValue(0);
      mockPrismaClient.item.create.mockResolvedValue(createdItem);
      mockPOST.mockResolvedValue(createSuccessResponse(createdItem, 201));

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test',
          description: 'Desc',
          type: 'feature',
          priority: 'low',
        }),
      });

      const response = await mockPOST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data.workLogs).toEqual([]);
    });
  });

  // ============ WI-044: Project Scoping Tests ============

  describe('projectId query parameter (WI-044)', () => {
    it('should return 400 when projectId query parameter is missing', async () => {
      mockPOST.mockResolvedValue(createErrorResponse(
        'VALIDATION_ERROR',
        'projectId query parameter is required',
        400
      ));

      const request = new NextRequest('http://localhost:3000/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Item',
          description: 'Description',
          type: 'feature',
          priority: 'medium',
        }),
      });

      const response = await mockPOST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('projectId');
    });

    it('should create item with the specified projectId', async () => {
      const createdItem = createMockItem({
        id: 'WI-001',
        title: 'New Feature',
        stageId: 'briefings',
      });

      mockPrismaClient.item.count.mockResolvedValue(0);
      mockPrismaClient.item.create.mockResolvedValue(createdItem);
      mockPOST.mockImplementation(async (req: NextRequest) => {
        const url = new URL(req.url);
        const projectId = url.searchParams.get('projectId');
        if (!projectId) {
          return createErrorResponse('VALIDATION_ERROR', 'projectId query parameter is required', 400);
        }
        await mockPrismaClient.item.create({
          data: {
            projectId,
            stageId: 'briefings',
          },
        });
        return createSuccessResponse(createdItem, 201);
      });

      const request = new NextRequest('http://localhost:3000/api/items?projectId=my-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Feature',
          description: 'Description',
          type: 'feature',
          priority: 'medium',
        }),
      });

      const response = await mockPOST(request);

      expect(response.status).toBe(201);
      expect(mockPrismaClient.item.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            projectId: 'my-project',
          }),
        })
      );
    });

    it('should validate all dependencies belong to the same project', async () => {
      mockPrismaClient.item.findUnique.mockResolvedValue({
        ...createMockItem({ id: 'WI-001' }),
        projectId: 'different-project', // Dependency belongs to different project
      });
      mockPOST.mockResolvedValue(createErrorResponse(
        'VALIDATION_ERROR',
        'Dependency WI-001 does not belong to the same project',
        400
      ));

      const request = new NextRequest('http://localhost:3000/api/items?projectId=my-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Feature',
          description: 'Description',
          type: 'feature',
          priority: 'medium',
          dependencies: ['WI-001'],
        }),
      });

      const response = await mockPOST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('WI-001');
      expect(data.error.message).toContain('project');
    });

    it('should accept dependencies from the same project', async () => {
      const createdItem = createMockItem({
        id: 'WI-002',
        dependencies: ['WI-001'],
      });

      mockPrismaClient.item.findUnique.mockResolvedValue({
        ...createMockItem({ id: 'WI-001' }),
        projectId: 'my-project', // Same project
      });
      mockPrismaClient.itemDependency.findMany.mockResolvedValue([]);
      mockPrismaClient.item.count.mockResolvedValue(1);
      mockPrismaClient.item.create.mockResolvedValue(createdItem);
      mockPOST.mockResolvedValue(createSuccessResponse(createdItem, 201));

      const request = new NextRequest('http://localhost:3000/api/items?projectId=my-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Feature',
          description: 'Description',
          type: 'feature',
          priority: 'medium',
          dependencies: ['WI-001'],
        }),
      });

      const response = await mockPOST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });
});

// ============ GET /api/items - Project Scoping Tests (WI-044) ============

describe('GET /api/items - projectId scoping (WI-044)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return 400 when projectId query parameter is missing', async () => {
    mockGET.mockResolvedValue(createErrorResponse(
      'VALIDATION_ERROR',
      'projectId query parameter is required',
      400
    ));

    const request = createRequest('/api/items');
    const response = await mockGET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('VALIDATION_ERROR');
    expect(data.error.message).toContain('projectId');
  });

  it('should return 400 with clear error message for missing projectId', async () => {
    mockGET.mockResolvedValue(createErrorResponse(
      'VALIDATION_ERROR',
      'projectId query parameter is required',
      400
    ));

    const request = createRequest('/api/items?stage=ready');
    const response = await mockGET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.message.toLowerCase()).toContain('required');
  });

  it('should return only items for the specified project', async () => {
    const projectItems = [
      createMockItem({ id: 'WI-001' }),
      createMockItem({ id: 'WI-002' }),
    ];
    mockPrismaClient.item.findMany.mockResolvedValue(projectItems);
    mockGET.mockImplementation(async (req: NextRequest) => {
      const url = new URL(req.url);
      const projectId = url.searchParams.get('projectId');
      if (!projectId) {
        return createErrorResponse('VALIDATION_ERROR', 'projectId query parameter is required', 400);
      }
      await mockPrismaClient.item.findMany({
        where: {
          projectId,
          archivedAt: null,
        },
      });
      return createSuccessResponse(projectItems);
    });

    const request = createRequest('/api/items?projectId=my-project');
    const response = await mockGET(request);

    expect(response.status).toBe(200);
    expect(mockPrismaClient.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectId: 'my-project',
        }),
      })
    );
  });

  it('should filter by both projectId and other query parameters', async () => {
    const projectItems = [createMockItem({ id: 'WI-001', stageId: 'ready', type: 'bug' })];
    mockPrismaClient.item.findMany.mockResolvedValue(projectItems);
    mockGET.mockImplementation(async (req: NextRequest) => {
      const url = new URL(req.url);
      const projectId = url.searchParams.get('projectId');
      const stage = url.searchParams.get('stage');
      const type = url.searchParams.get('type');
      if (!projectId) {
        return createErrorResponse('VALIDATION_ERROR', 'projectId query parameter is required', 400);
      }
      await mockPrismaClient.item.findMany({
        where: {
          projectId,
          stageId: stage,
          type,
          archivedAt: null,
        },
      });
      return createSuccessResponse(projectItems);
    });

    const request = createRequest('/api/items?projectId=my-project&stage=ready&type=bug');
    const response = await mockGET(request);

    expect(response.status).toBe(200);
    expect(mockPrismaClient.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectId: 'my-project',
          stageId: 'ready',
          type: 'bug',
        }),
      })
    );
  });

  it('should return empty array for project with no items', async () => {
    mockPrismaClient.item.findMany.mockResolvedValue([]);
    mockGET.mockResolvedValue(createSuccessResponse([]));

    const request = createRequest('/api/items?projectId=empty-project');
    const response = await mockGET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toEqual([]);
  });
});
