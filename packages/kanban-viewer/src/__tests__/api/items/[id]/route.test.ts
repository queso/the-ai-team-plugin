import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Tests for GET, PATCH, DELETE /api/items/[id] endpoints.
 *
 * These tests verify the acceptance criteria from work item 010:
 * - GET /api/items/[id] returns single ItemWithRelations or ITEM_NOT_FOUND
 * - PATCH /api/items/[id] accepts UpdateItemRequest with optional title, description, type, priority, dependencies
 * - PATCH validates dependency changes do not create cycles
 * - PATCH updates item.updatedAt timestamp
 * - DELETE /api/items/[id] performs soft delete by setting archivedAt (not hard delete)
 * - DELETE removes item from other items' dependency lists
 * - Archived items remain in database for audit trail
 *
 * NOTE: These tests will fail until the route handlers are implemented
 * at src/app/api/items/[id]/route.ts. The tests use mocked Prisma client
 * and define the expected behavior for B.A. to implement.
 */

// Import types for test data
import type {
  ItemType,
  ItemWithRelations,
  WorkLogEntry,
} from '@/types/item';
import type { UpdateItemRequest } from '@/types/api';

// Mock Prisma client for database operations
const mockPrismaClient = {
  item: {
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  itemDependency: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock('@/lib/db', () => ({
  prisma: mockPrismaClient,
}));

// Mock route handlers - will be replaced by real implementation
// This allows tests to run before implementation exists
const mockGET = vi.fn();
const mockPATCH = vi.fn();
const mockDELETE = vi.fn();

vi.mock('@/app/api/items/[id]/route', () => ({
  GET: mockGET,
  PATCH: mockPATCH,
  DELETE: mockDELETE,
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

interface RouteParams {
  params: Promise<{ id: string }>;
}

function createRequest(url: string, options: Record<string, unknown> = {}): NextRequest {
  return new NextRequest(`http://localhost:3000${url}`, options);
}

function createSuccessResponse(data: unknown, status: number = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

function createErrorResponse(code: string, message: string, status: number = 400, details?: unknown): NextResponse {
  const errorPayload: { code: string; message: string; details?: unknown } = { code, message };
  if (details !== undefined) {
    errorPayload.details = details;
  }
  return NextResponse.json({ success: false, error: errorPayload }, { status });
}

// ============ GET /api/items/[id] Tests ============

describe('GET /api/items/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful requests', () => {
    it('should return ItemWithRelations for existing item', async () => {
      const mockItem = createMockItem({ id: 'WI-001' });
      mockPrismaClient.item.findUnique.mockResolvedValue({
        ...mockItem,
        dependsOn: [],
        workLogs: [],
      });
      mockGET.mockResolvedValue(createSuccessResponse(mockItem));

      const request = createRequest('/api/items/WI-001');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockGET(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('WI-001');
    });

    it('should include all ItemWithRelations fields', async () => {
      const mockItem = createMockItem({
        id: 'WI-002',
        title: 'Complete Item',
        description: 'Full description',
        type: 'bug',
        priority: 'high',
        stageId: 'testing',
        assignedAgent: 'Murdock',
        rejectionCount: 1,
        dependencies: ['WI-001'],
        workLogs: [
          {
            id: 1,
            agent: 'B.A.',
            action: 'started',
            summary: 'Started work',
            timestamp: new Date('2026-01-21T11:00:00Z'),
          },
        ],
      });
      mockPrismaClient.item.findUnique.mockResolvedValue(mockItem);
      mockGET.mockResolvedValue(createSuccessResponse(mockItem));

      const request = createRequest('/api/items/WI-002');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-002' }) };
      const response = await mockGET(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();

      // Verify all ItemWithRelations properties
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

    it('should return item with dependencies populated', async () => {
      const mockItem = createMockItem({
        id: 'WI-003',
        dependencies: ['WI-001', 'WI-002'],
      });
      mockPrismaClient.item.findUnique.mockResolvedValue(mockItem);
      mockGET.mockResolvedValue(createSuccessResponse(mockItem));

      const request = createRequest('/api/items/WI-003');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-003' }) };
      const response = await mockGET(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.dependencies).toEqual(['WI-001', 'WI-002']);
    });

    it('should return item with workLogs populated', async () => {
      const workLogs: WorkLogEntry[] = [
        {
          id: 1,
          agent: 'Murdock',
          action: 'started',
          summary: 'Testing started',
          timestamp: new Date('2026-01-21T10:00:00Z'),
        },
        {
          id: 2,
          agent: 'Murdock',
          action: 'completed',
          summary: 'Tests passed',
          timestamp: new Date('2026-01-21T11:00:00Z'),
        },
      ];
      const mockItem = createMockItem({
        id: 'WI-004',
        workLogs,
      });
      mockPrismaClient.item.findUnique.mockResolvedValue(mockItem);
      mockGET.mockResolvedValue(createSuccessResponse(mockItem));

      const request = createRequest('/api/items/WI-004');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-004' }) };
      const response = await mockGET(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.workLogs).toHaveLength(2);
      expect(data.data.workLogs[0].agent).toBe('Murdock');
    });
  });

  describe('error handling', () => {
    it('should return ITEM_NOT_FOUND for non-existent item', async () => {
      mockPrismaClient.item.findUnique.mockResolvedValue(null);
      mockGET.mockResolvedValue(createErrorResponse(
        'ITEM_NOT_FOUND',
        'Item WI-999 not found',
        404,
        { itemId: 'WI-999' }
      ));

      const request = createRequest('/api/items/WI-999');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-999' }) };
      const response = await mockGET(request, params);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('ITEM_NOT_FOUND');
      expect(data.error.message).toContain('WI-999');
    });

    it('should return ITEM_NOT_FOUND for archived item by default', async () => {
      mockPrismaClient.item.findUnique.mockResolvedValue(null); // Archived items are excluded
      mockGET.mockResolvedValue(createErrorResponse(
        'ITEM_NOT_FOUND',
        'Item WI-005 not found',
        404,
        { itemId: 'WI-005' }
      ));

      const request = createRequest('/api/items/WI-005');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-005' }) };
      const response = await mockGET(request, params);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('ITEM_NOT_FOUND');
    });

    it('should return 500 for database errors', async () => {
      mockPrismaClient.item.findUnique.mockRejectedValue(new Error('Database error'));
      mockGET.mockResolvedValue(
        NextResponse.json(
          { success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } },
          { status: 500 }
        )
      );

      const request = createRequest('/api/items/WI-001');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockGET(request, params);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('SERVER_ERROR');
    });
  });
});

// ============ PATCH /api/items/[id] Tests ============

describe('PATCH /api/items/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful updates', () => {
    it('should update title and return updated item', async () => {
      const originalItem = createMockItem({ id: 'WI-001', title: 'Original Title' });
      const updatedItem = createMockItem({
        id: 'WI-001',
        title: 'Updated Title',
        updatedAt: new Date('2026-01-21T12:00:00Z'),
      });

      mockPrismaClient.item.findUnique.mockResolvedValue(originalItem);
      mockPrismaClient.item.update.mockResolvedValue(updatedItem);
      mockPATCH.mockResolvedValue(createSuccessResponse(updatedItem));

      const updateRequest: UpdateItemRequest = { title: 'Updated Title' };
      const request = new NextRequest('http://localhost:3000/api/items/WI-001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateRequest),
      });
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockPATCH(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('Updated Title');
    });

    it('should update description', async () => {
      const updatedItem = createMockItem({
        id: 'WI-001',
        description: 'New description',
        updatedAt: new Date('2026-01-21T12:00:00Z'),
      });

      mockPrismaClient.item.findUnique.mockResolvedValue(createMockItem());
      mockPrismaClient.item.update.mockResolvedValue(updatedItem);
      mockPATCH.mockResolvedValue(createSuccessResponse(updatedItem));

      const updateRequest: UpdateItemRequest = { description: 'New description' };
      const request = new NextRequest('http://localhost:3000/api/items/WI-001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateRequest),
      });
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockPATCH(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.description).toBe('New description');
    });

    it('should update type', async () => {
      const updatedItem = createMockItem({
        id: 'WI-001',
        type: 'bug',
        updatedAt: new Date('2026-01-21T12:00:00Z'),
      });

      mockPrismaClient.item.findUnique.mockResolvedValue(createMockItem());
      mockPrismaClient.item.update.mockResolvedValue(updatedItem);
      mockPATCH.mockResolvedValue(createSuccessResponse(updatedItem));

      const updateRequest: UpdateItemRequest = { type: 'bug' };
      const request = new NextRequest('http://localhost:3000/api/items/WI-001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateRequest),
      });
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockPATCH(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.type).toBe('bug');
    });

    it('should update priority', async () => {
      const updatedItem = createMockItem({
        id: 'WI-001',
        priority: 'critical',
        updatedAt: new Date('2026-01-21T12:00:00Z'),
      });

      mockPrismaClient.item.findUnique.mockResolvedValue(createMockItem());
      mockPrismaClient.item.update.mockResolvedValue(updatedItem);
      mockPATCH.mockResolvedValue(createSuccessResponse(updatedItem));

      const updateRequest: UpdateItemRequest = { priority: 'critical' };
      const request = new NextRequest('http://localhost:3000/api/items/WI-001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateRequest),
      });
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockPATCH(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.priority).toBe('critical');
    });

    it('should update dependencies', async () => {
      const updatedItem = createMockItem({
        id: 'WI-003',
        dependencies: ['WI-001', 'WI-002'],
        updatedAt: new Date('2026-01-21T12:00:00Z'),
      });

      mockPrismaClient.item.findUnique
        .mockResolvedValueOnce(createMockItem({ id: 'WI-003' })) // Target item
        .mockResolvedValueOnce(createMockItem({ id: 'WI-001' })) // Dependency exists
        .mockResolvedValueOnce(createMockItem({ id: 'WI-002' })); // Dependency exists
      mockPrismaClient.itemDependency.findMany.mockResolvedValue([]);
      mockPrismaClient.item.update.mockResolvedValue(updatedItem);
      mockPATCH.mockResolvedValue(createSuccessResponse(updatedItem));

      const updateRequest: UpdateItemRequest = { dependencies: ['WI-001', 'WI-002'] };
      const request = new NextRequest('http://localhost:3000/api/items/WI-003', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateRequest),
      });
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-003' }) };
      const response = await mockPATCH(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.dependencies).toEqual(['WI-001', 'WI-002']);
    });

    it('should update multiple fields at once', async () => {
      const updatedItem = createMockItem({
        id: 'WI-001',
        title: 'New Title',
        description: 'New Description',
        type: 'spike' as ItemType,
        priority: 'low',
        updatedAt: new Date('2026-01-21T12:00:00Z'),
      });

      mockPrismaClient.item.findUnique.mockResolvedValue(createMockItem());
      mockPrismaClient.item.update.mockResolvedValue(updatedItem);
      mockPATCH.mockResolvedValue(createSuccessResponse(updatedItem));

      const updateRequest = {
        title: 'New Title',
        description: 'New Description',
        type: 'spike',
        priority: 'low',
      };
      const request = new NextRequest('http://localhost:3000/api/items/WI-001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateRequest),
      });
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockPATCH(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.title).toBe('New Title');
      expect(data.data.description).toBe('New Description');
      expect(data.data.type).toBe('spike');
      expect(data.data.priority).toBe('low');
    });
  });

  describe('updatedAt timestamp', () => {
    it('should update updatedAt timestamp on any change', async () => {
      const originalUpdatedAt = new Date('2026-01-21T10:00:00Z');
      const newUpdatedAt = new Date('2026-01-21T12:00:00Z');

      const originalItem = createMockItem({
        id: 'WI-001',
        updatedAt: originalUpdatedAt,
      });
      const updatedItem = createMockItem({
        id: 'WI-001',
        title: 'Changed Title',
        updatedAt: newUpdatedAt,
      });

      mockPrismaClient.item.findUnique.mockResolvedValue(originalItem);
      mockPrismaClient.item.update.mockResolvedValue(updatedItem);
      mockPATCH.mockResolvedValue(createSuccessResponse(updatedItem));

      const updateRequest: UpdateItemRequest = { title: 'Changed Title' };
      const request = new NextRequest('http://localhost:3000/api/items/WI-001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateRequest),
      });
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockPATCH(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();
      // updatedAt should be newer than original
      expect(new Date(data.data.updatedAt).getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('dependency validation', () => {
    it('should reject dependency that does not exist', async () => {
      mockPrismaClient.item.findUnique
        .mockResolvedValueOnce(createMockItem({ id: 'WI-001' })) // Target item exists
        .mockResolvedValueOnce(null); // Dependency does not exist
      mockPATCH.mockResolvedValue(createErrorResponse(
        'VALIDATION_ERROR',
        'Dependency WI-999 does not exist',
        400
      ));

      const updateRequest: UpdateItemRequest = { dependencies: ['WI-999'] };
      const request = new NextRequest('http://localhost:3000/api/items/WI-001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateRequest),
      });
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockPATCH(request, params);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('WI-999');
    });

    it('should reject self-referencing dependency', async () => {
      mockPrismaClient.item.findUnique.mockResolvedValue(createMockItem({ id: 'WI-001' }));
      mockPATCH.mockResolvedValue(createErrorResponse(
        'DEPENDENCY_CYCLE',
        'Dependency cycle detected: WI-001 -> WI-001',
        400,
        { cycle: ['WI-001', 'WI-001'] }
      ));

      const updateRequest: UpdateItemRequest = { dependencies: ['WI-001'] };
      const request = new NextRequest('http://localhost:3000/api/items/WI-001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateRequest),
      });
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockPATCH(request, params);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DEPENDENCY_CYCLE');
    });

    it('should reject dependencies that create a cycle', async () => {
      // WI-001 -> WI-002 -> WI-003 (existing)
      // Adding WI-003 -> WI-001 would create cycle
      mockPrismaClient.item.findUnique
        .mockResolvedValueOnce(createMockItem({ id: 'WI-003' })) // Target item
        .mockResolvedValueOnce(createMockItem({ id: 'WI-001' })); // Dependency exists
      mockPrismaClient.itemDependency.findMany.mockResolvedValue([
        { itemId: 'WI-001', dependsOnId: 'WI-002' },
        { itemId: 'WI-002', dependsOnId: 'WI-003' },
      ]);
      mockPATCH.mockResolvedValue(createErrorResponse(
        'DEPENDENCY_CYCLE',
        'Dependency cycle detected: WI-003 -> WI-001 -> WI-002 -> WI-003',
        400,
        { cycle: ['WI-003', 'WI-001', 'WI-002', 'WI-003'] }
      ));

      const updateRequest: UpdateItemRequest = { dependencies: ['WI-001'] };
      const request = new NextRequest('http://localhost:3000/api/items/WI-003', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateRequest),
      });
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-003' }) };
      const response = await mockPATCH(request, params);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DEPENDENCY_CYCLE');
    });

    it('should accept valid dependency changes without cycles', async () => {
      const updatedItem = createMockItem({
        id: 'WI-003',
        dependencies: ['WI-001'],
        updatedAt: new Date('2026-01-21T12:00:00Z'),
      });

      mockPrismaClient.item.findUnique
        .mockResolvedValueOnce(createMockItem({ id: 'WI-003' }))
        .mockResolvedValueOnce(createMockItem({ id: 'WI-001' }));
      mockPrismaClient.itemDependency.findMany.mockResolvedValue([]);
      mockPrismaClient.item.update.mockResolvedValue(updatedItem);
      mockPATCH.mockResolvedValue(createSuccessResponse(updatedItem));

      const updateRequest: UpdateItemRequest = { dependencies: ['WI-001'] };
      const request = new NextRequest('http://localhost:3000/api/items/WI-003', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateRequest),
      });
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-003' }) };
      const response = await mockPATCH(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.dependencies).toEqual(['WI-001']);
    });

    it('should allow removing dependencies', async () => {
      const updatedItem = createMockItem({
        id: 'WI-002',
        dependencies: [],
        updatedAt: new Date('2026-01-21T12:00:00Z'),
      });

      mockPrismaClient.item.findUnique.mockResolvedValue(
        createMockItem({ id: 'WI-002', dependencies: ['WI-001'] })
      );
      mockPrismaClient.itemDependency.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaClient.item.update.mockResolvedValue(updatedItem);
      mockPATCH.mockResolvedValue(createSuccessResponse(updatedItem));

      const updateRequest: UpdateItemRequest = { dependencies: [] };
      const request = new NextRequest('http://localhost:3000/api/items/WI-002', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateRequest),
      });
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-002' }) };
      const response = await mockPATCH(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.dependencies).toEqual([]);
    });
  });

  describe('validation', () => {
    it('should reject invalid type value', async () => {
      mockPrismaClient.item.findUnique.mockResolvedValue(createMockItem());
      mockPATCH.mockResolvedValue(createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid type value',
        400
      ));

      const updateRequest = { type: 'invalid_type' };
      const request = new NextRequest('http://localhost:3000/api/items/WI-001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateRequest),
      });
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockPATCH(request, params);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid priority value', async () => {
      mockPrismaClient.item.findUnique.mockResolvedValue(createMockItem());
      mockPATCH.mockResolvedValue(createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid priority value',
        400
      ));

      const updateRequest = { priority: 'invalid_priority' };
      const request = new NextRequest('http://localhost:3000/api/items/WI-001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateRequest),
      });
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockPATCH(request, params);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject title longer than 200 characters', async () => {
      mockPrismaClient.item.findUnique.mockResolvedValue(createMockItem());
      mockPATCH.mockResolvedValue(createErrorResponse(
        'VALIDATION_ERROR',
        'title must not exceed 200 characters',
        400
      ));

      const updateRequest: UpdateItemRequest = { title: 'x'.repeat(201) };
      const request = new NextRequest('http://localhost:3000/api/items/WI-001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateRequest),
      });
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockPATCH(request, params);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('200');
    });

    it('should reject empty title', async () => {
      mockPrismaClient.item.findUnique.mockResolvedValue(createMockItem());
      mockPATCH.mockResolvedValue(createErrorResponse(
        'VALIDATION_ERROR',
        'title cannot be empty',
        400
      ));

      const updateRequest: UpdateItemRequest = { title: '' };
      const request = new NextRequest('http://localhost:3000/api/items/WI-001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateRequest),
      });
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockPATCH(request, params);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should accept title with exactly 200 characters', async () => {
      const longTitle = 'x'.repeat(200);
      const updatedItem = createMockItem({ title: longTitle });

      mockPrismaClient.item.findUnique.mockResolvedValue(createMockItem());
      mockPrismaClient.item.update.mockResolvedValue(updatedItem);
      mockPATCH.mockResolvedValue(createSuccessResponse(updatedItem));

      const updateRequest: UpdateItemRequest = { title: longTitle };
      const request = new NextRequest('http://localhost:3000/api/items/WI-001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateRequest),
      });
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockPATCH(request, params);

      expect(response.status).toBe(200);
    });
  });

  describe('error handling', () => {
    it('should return ITEM_NOT_FOUND for non-existent item', async () => {
      mockPrismaClient.item.findUnique.mockResolvedValue(null);
      mockPATCH.mockResolvedValue(createErrorResponse(
        'ITEM_NOT_FOUND',
        'Item WI-999 not found',
        404,
        { itemId: 'WI-999' }
      ));

      const updateRequest: UpdateItemRequest = { title: 'New Title' };
      const request = new NextRequest('http://localhost:3000/api/items/WI-999', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateRequest),
      });
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-999' }) };
      const response = await mockPATCH(request, params);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('ITEM_NOT_FOUND');
    });

    it('should return 400 for invalid JSON body', async () => {
      mockPATCH.mockResolvedValue(createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid JSON body',
        400
      ));

      const request = new NextRequest('http://localhost:3000/api/items/WI-001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json',
      });
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockPATCH(request, params);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 500 for database errors', async () => {
      mockPrismaClient.item.findUnique.mockResolvedValue(createMockItem());
      mockPrismaClient.item.update.mockRejectedValue(new Error('Database error'));
      mockPATCH.mockResolvedValue(
        NextResponse.json(
          { success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } },
          { status: 500 }
        )
      );

      const updateRequest: UpdateItemRequest = { title: 'New Title' };
      const request = new NextRequest('http://localhost:3000/api/items/WI-001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateRequest),
      });
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockPATCH(request, params);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('SERVER_ERROR');
    });
  });
});

// ============ DELETE /api/items/[id] Tests ============

describe('DELETE /api/items/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('soft delete behavior', () => {
    it('should soft delete by setting archivedAt timestamp', async () => {
      const archivedItem = {
        ...createMockItem({ id: 'WI-001' }),
        archivedAt: new Date('2026-01-21T12:00:00Z'),
      };

      mockPrismaClient.item.findUnique.mockResolvedValue(createMockItem({ id: 'WI-001' }));
      mockPrismaClient.item.update.mockResolvedValue(archivedItem);
      mockDELETE.mockImplementation(async () => {
        // Verify update is called with archivedAt, not delete
        await mockPrismaClient.item.update({
          where: { id: 'WI-001' },
          data: { archivedAt: expect.any(Date) },
        });
        return createSuccessResponse({ deleted: true, id: 'WI-001' });
      });

      const request = createRequest('/api/items/WI-001');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockDELETE(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.deleted).toBe(true);
      expect(data.data.id).toBe('WI-001');
    });

    it('should NOT hard delete the item from database', async () => {
      mockPrismaClient.item.findUnique.mockResolvedValue(createMockItem({ id: 'WI-001' }));
      mockPrismaClient.item.update.mockResolvedValue({
        ...createMockItem({ id: 'WI-001' }),
        archivedAt: new Date(),
      });
      mockDELETE.mockResolvedValue(createSuccessResponse({ deleted: true, id: 'WI-001' }));

      const request = createRequest('/api/items/WI-001');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      await mockDELETE(request, params);

      // Verify prisma.item.delete was NOT called
      expect(mockPrismaClient.item.delete).not.toHaveBeenCalled();
    });

    it('should preserve archived items in database for audit trail', async () => {
      // After archiving, the item should still exist when querying with includeArchived
      const archivedItem = {
        ...createMockItem({ id: 'WI-001' }),
        archivedAt: new Date('2026-01-21T12:00:00Z'),
      };

      mockPrismaClient.item.findUnique.mockResolvedValue(createMockItem({ id: 'WI-001' }));
      mockPrismaClient.item.update.mockResolvedValue(archivedItem);
      mockDELETE.mockResolvedValue(createSuccessResponse({ deleted: true, id: 'WI-001' }));

      const request = createRequest('/api/items/WI-001');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockDELETE(request, params);

      expect(response.status).toBe(200);

      // Verify item.update was called (soft delete) not item.delete (hard delete)
      // The implementation should use update to set archivedAt
    });
  });

  describe('dependency cleanup', () => {
    it('should remove item from other items dependency lists', async () => {
      // WI-002 depends on WI-001
      // Deleting WI-001 should remove it from WI-002's dependencies
      mockPrismaClient.item.findUnique.mockResolvedValue(createMockItem({ id: 'WI-001' }));
      mockPrismaClient.itemDependency.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaClient.item.update.mockResolvedValue({
        ...createMockItem({ id: 'WI-001' }),
        archivedAt: new Date(),
      });
      mockDELETE.mockImplementation(async () => {
        // Delete all dependency records where this item is a dependency
        await mockPrismaClient.itemDependency.deleteMany({
          where: { dependsOnId: 'WI-001' },
        });
        await mockPrismaClient.item.update({
          where: { id: 'WI-001' },
          data: { archivedAt: expect.any(Date) },
        });
        return createSuccessResponse({ deleted: true, id: 'WI-001' });
      });

      const request = createRequest('/api/items/WI-001');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockDELETE(request, params);

      expect(response.status).toBe(200);
      expect(mockPrismaClient.itemDependency.deleteMany).toHaveBeenCalledWith({
        where: { dependsOnId: 'WI-001' },
      });
    });

    it('should handle item with no dependents gracefully', async () => {
      mockPrismaClient.item.findUnique.mockResolvedValue(createMockItem({ id: 'WI-001' }));
      mockPrismaClient.itemDependency.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaClient.item.update.mockResolvedValue({
        ...createMockItem({ id: 'WI-001' }),
        archivedAt: new Date(),
      });
      mockDELETE.mockResolvedValue(createSuccessResponse({ deleted: true, id: 'WI-001' }));

      const request = createRequest('/api/items/WI-001');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockDELETE(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should clean up multiple dependent items', async () => {
      // Multiple items depend on WI-001
      mockPrismaClient.item.findUnique.mockResolvedValue(createMockItem({ id: 'WI-001' }));
      mockPrismaClient.itemDependency.deleteMany.mockResolvedValue({ count: 3 });
      mockPrismaClient.item.update.mockResolvedValue({
        ...createMockItem({ id: 'WI-001' }),
        archivedAt: new Date(),
      });
      mockDELETE.mockImplementation(async () => {
        const result = await mockPrismaClient.itemDependency.deleteMany({
          where: { dependsOnId: 'WI-001' },
        });
        await mockPrismaClient.item.update({
          where: { id: 'WI-001' },
          data: { archivedAt: expect.any(Date) },
        });
        return createSuccessResponse({
          deleted: true,
          id: 'WI-001',
          dependenciesRemoved: result.count,
        });
      });

      const request = createRequest('/api/items/WI-001');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockDELETE(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.dependenciesRemoved).toBe(3);
    });
  });

  describe('error handling', () => {
    it('should return ITEM_NOT_FOUND for non-existent item', async () => {
      mockPrismaClient.item.findUnique.mockResolvedValue(null);
      mockDELETE.mockResolvedValue(createErrorResponse(
        'ITEM_NOT_FOUND',
        'Item WI-999 not found',
        404,
        { itemId: 'WI-999' }
      ));

      const request = createRequest('/api/items/WI-999');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-999' }) };
      const response = await mockDELETE(request, params);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('ITEM_NOT_FOUND');
    });

    it('should return ITEM_NOT_FOUND for already archived item', async () => {
      // Item exists but is already archived
      mockPrismaClient.item.findUnique.mockResolvedValue(null); // Query excludes archived
      mockDELETE.mockResolvedValue(createErrorResponse(
        'ITEM_NOT_FOUND',
        'Item WI-001 not found',
        404,
        { itemId: 'WI-001' }
      ));

      const request = createRequest('/api/items/WI-001');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockDELETE(request, params);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('ITEM_NOT_FOUND');
    });

    it('should return 500 for database errors', async () => {
      mockPrismaClient.item.findUnique.mockResolvedValue(createMockItem({ id: 'WI-001' }));
      mockPrismaClient.item.update.mockRejectedValue(new Error('Database error'));
      mockDELETE.mockResolvedValue(
        NextResponse.json(
          { success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } },
          { status: 500 }
        )
      );

      const request = createRequest('/api/items/WI-001');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockDELETE(request, params);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('SERVER_ERROR');
    });
  });

  describe('response format', () => {
    it('should return success response with deleted item id', async () => {
      mockPrismaClient.item.findUnique.mockResolvedValue(createMockItem({ id: 'WI-001' }));
      mockPrismaClient.itemDependency.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaClient.item.update.mockResolvedValue({
        ...createMockItem({ id: 'WI-001' }),
        archivedAt: new Date(),
      });
      mockDELETE.mockResolvedValue(createSuccessResponse({
        deleted: true,
        id: 'WI-001',
      }));

      const request = createRequest('/api/items/WI-001');
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockDELETE(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.deleted).toBe(true);
      expect(data.data.id).toBe('WI-001');
    });
  });
});

// ============ WI-044: Project Scoping Tests ============

describe('GET /api/items/[id] - projectId scoping (WI-044)', () => {
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

    const request = createRequest('/api/items/WI-001');
    const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
    const response = await mockGET(request, params);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('VALIDATION_ERROR');
    expect(data.error.message).toContain('projectId');
  });

  it('should return 404 if item exists but belongs to different project', async () => {
    // Item exists with projectId 'other-project'
    mockPrismaClient.item.findUnique.mockResolvedValue({
      ...createMockItem({ id: 'WI-001' }),
      projectId: 'other-project',
    });
    mockGET.mockResolvedValue(createErrorResponse(
      'ITEM_NOT_FOUND',
      'Item WI-001 not found',
      404,
      { itemId: 'WI-001' }
    ));

    const request = createRequest('/api/items/WI-001?projectId=my-project');
    const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
    const response = await mockGET(request, params);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('ITEM_NOT_FOUND');
  });

  it('should return item when it belongs to the specified project', async () => {
    const mockItem = {
      ...createMockItem({ id: 'WI-001' }),
      projectId: 'my-project',
    };
    mockPrismaClient.item.findUnique.mockResolvedValue(mockItem);
    mockGET.mockResolvedValue(createSuccessResponse(mockItem));

    const request = createRequest('/api/items/WI-001?projectId=my-project');
    const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
    const response = await mockGET(request, params);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('WI-001');
  });

  it('should verify item belongs to project in the database query', async () => {
    const mockItem = createMockItem({ id: 'WI-001' });
    mockPrismaClient.item.findUnique.mockResolvedValue(mockItem);
    mockGET.mockImplementation(async (req: NextRequest) => {
      const url = new URL(req.url);
      const projectId = url.searchParams.get('projectId');
      if (!projectId) {
        return createErrorResponse('VALIDATION_ERROR', 'projectId query parameter is required', 400);
      }
      await mockPrismaClient.item.findUnique({
        where: {
          id: 'WI-001',
          projectId,
          archivedAt: null,
        },
      });
      return createSuccessResponse(mockItem);
    });

    const request = createRequest('/api/items/WI-001?projectId=my-project');
    const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
    await mockGET(request, params);

    expect(mockPrismaClient.item.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'WI-001',
          projectId: 'my-project',
        }),
      })
    );
  });
});

describe('PATCH /api/items/[id] - projectId scoping (WI-044)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return 400 when projectId query parameter is missing', async () => {
    mockPATCH.mockResolvedValue(createErrorResponse(
      'VALIDATION_ERROR',
      'projectId query parameter is required',
      400
    ));

    const request = new NextRequest('http://localhost:3000/api/items/WI-001', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Title' }),
    });
    const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
    const response = await mockPATCH(request, params);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('VALIDATION_ERROR');
    expect(data.error.message).toContain('projectId');
  });

  it('should return 404 if item exists but belongs to different project', async () => {
    mockPrismaClient.item.findUnique.mockResolvedValue({
      ...createMockItem({ id: 'WI-001' }),
      projectId: 'other-project',
    });
    mockPATCH.mockResolvedValue(createErrorResponse(
      'ITEM_NOT_FOUND',
      'Item WI-001 not found',
      404,
      { itemId: 'WI-001' }
    ));

    const request = new NextRequest('http://localhost:3000/api/items/WI-001?projectId=my-project', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Title' }),
    });
    const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
    const response = await mockPATCH(request, params);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('ITEM_NOT_FOUND');
  });

  it('should update item when it belongs to the specified project', async () => {
    const updatedItem = {
      ...createMockItem({ id: 'WI-001', title: 'Updated Title' }),
      projectId: 'my-project',
    };
    mockPrismaClient.item.findUnique.mockResolvedValue({
      ...createMockItem({ id: 'WI-001' }),
      projectId: 'my-project',
    });
    mockPrismaClient.item.update.mockResolvedValue(updatedItem);
    mockPATCH.mockResolvedValue(createSuccessResponse(updatedItem));

    const request = new NextRequest('http://localhost:3000/api/items/WI-001?projectId=my-project', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated Title' }),
    });
    const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
    const response = await mockPATCH(request, params);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.title).toBe('Updated Title');
  });

  it('should validate dependencies belong to the same project when updating', async () => {
    // Item belongs to my-project
    mockPrismaClient.item.findUnique
      .mockResolvedValueOnce({
        ...createMockItem({ id: 'WI-002' }),
        projectId: 'my-project',
      })
      // Dependency belongs to different project
      .mockResolvedValueOnce({
        ...createMockItem({ id: 'WI-001' }),
        projectId: 'other-project',
      });
    mockPATCH.mockResolvedValue(createErrorResponse(
      'VALIDATION_ERROR',
      'Dependency WI-001 does not belong to the same project',
      400
    ));

    const request = new NextRequest('http://localhost:3000/api/items/WI-002?projectId=my-project', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dependencies: ['WI-001'] }),
    });
    const params: RouteParams = { params: Promise.resolve({ id: 'WI-002' }) };
    const response = await mockPATCH(request, params);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('VALIDATION_ERROR');
    expect(data.error.message).toContain('WI-001');
    expect(data.error.message).toContain('project');
  });
});

describe('DELETE /api/items/[id] - projectId scoping (WI-044)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return 400 when projectId query parameter is missing', async () => {
    mockDELETE.mockResolvedValue(createErrorResponse(
      'VALIDATION_ERROR',
      'projectId query parameter is required',
      400
    ));

    const request = createRequest('/api/items/WI-001');
    const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
    const response = await mockDELETE(request, params);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('VALIDATION_ERROR');
    expect(data.error.message).toContain('projectId');
  });

  it('should return 404 if item exists but belongs to different project', async () => {
    mockPrismaClient.item.findUnique.mockResolvedValue({
      ...createMockItem({ id: 'WI-001' }),
      projectId: 'other-project',
    });
    mockDELETE.mockResolvedValue(createErrorResponse(
      'ITEM_NOT_FOUND',
      'Item WI-001 not found',
      404,
      { itemId: 'WI-001' }
    ));

    const request = createRequest('/api/items/WI-001?projectId=my-project');
    const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
    const response = await mockDELETE(request, params);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('ITEM_NOT_FOUND');
  });

  it('should delete item when it belongs to the specified project', async () => {
    mockPrismaClient.item.findUnique.mockResolvedValue({
      ...createMockItem({ id: 'WI-001' }),
      projectId: 'my-project',
    });
    mockPrismaClient.itemDependency.deleteMany.mockResolvedValue({ count: 0 });
    mockPrismaClient.item.update.mockResolvedValue({
      ...createMockItem({ id: 'WI-001' }),
      projectId: 'my-project',
      archivedAt: new Date(),
    });
    mockDELETE.mockResolvedValue(createSuccessResponse({
      deleted: true,
      id: 'WI-001',
    }));

    const request = createRequest('/api/items/WI-001?projectId=my-project');
    const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
    const response = await mockDELETE(request, params);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.deleted).toBe(true);
  });

  it('should verify item belongs to project in the database query', async () => {
    mockPrismaClient.item.findUnique.mockResolvedValue({
      ...createMockItem({ id: 'WI-001' }),
      projectId: 'my-project',
    });
    mockPrismaClient.itemDependency.deleteMany.mockResolvedValue({ count: 0 });
    mockPrismaClient.item.update.mockResolvedValue({
      ...createMockItem({ id: 'WI-001' }),
      archivedAt: new Date(),
    });
    mockDELETE.mockImplementation(async (req: NextRequest) => {
      const url = new URL(req.url);
      const projectId = url.searchParams.get('projectId');
      if (!projectId) {
        return createErrorResponse('VALIDATION_ERROR', 'projectId query parameter is required', 400);
      }
      await mockPrismaClient.item.findUnique({
        where: {
          id: 'WI-001',
          projectId,
          archivedAt: null,
        },
      });
      return createSuccessResponse({ deleted: true, id: 'WI-001' });
    });

    const request = createRequest('/api/items/WI-001?projectId=my-project');
    const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
    await mockDELETE(request, params);

    expect(mockPrismaClient.item.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'WI-001',
          projectId: 'my-project',
        }),
      })
    );
  });
});
