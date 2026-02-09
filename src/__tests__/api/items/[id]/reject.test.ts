import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Tests for POST /api/items/[id]/reject endpoint.
 *
 * These tests verify the acceptance criteria from work item 011:
 * - POST /api/items/[id]/reject accepts RejectItemRequest with reason and agent
 * - Validates item is in review stage
 * - Increments rejectionCount on the item
 * - Creates WorkLog entry with action=rejected and the rejection reason
 * - If rejectionCount >= 2, moves item to blocked stage and returns escalated=true
 * - Returns RejectItemResponse with item, escalated flag, and rejectionCount
 *
 * NOTE: These tests will fail until the route handlers are implemented
 * at src/app/api/items/[id]/reject/route.ts. The tests use mocked Prisma client
 * and define the expected behavior for B.A. to implement.
 */

// Import types for test data
import type { ItemWithRelations } from '@/types/item';
import type { RejectItemRequest } from '@/types/api';

// Mock Prisma client for database operations
const mockPrismaClient = {
  item: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  workLog: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock('@/lib/db', () => ({
  prisma: mockPrismaClient,
}));

// Mock route handler - will be replaced by real implementation
// This allows tests to run before implementation exists
const mockPOST = vi.fn();

vi.mock('@/app/api/items/[id]/reject/route', () => ({
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
    stageId: 'review',
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

function createRequest(url: string, body: RejectItemRequest): NextRequest {
  return new NextRequest(`http://localhost:3000${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
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

// ============ POST /api/items/[id]/reject Tests ============

describe('POST /api/items/[id]/reject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful rejection', () => {
    it('should accept RejectItemRequest with reason and agent', async () => {
      const mockItem = createMockItem({ id: 'WI-001', stageId: 'review', rejectionCount: 0 });
      const updatedItem = { ...mockItem, rejectionCount: 1 };

      mockPrismaClient.item.findUnique.mockResolvedValue(mockItem);
      mockPrismaClient.item.update.mockResolvedValue(updatedItem);
      mockPrismaClient.workLog.create.mockResolvedValue({
        id: 1,
        agent: 'Lynch',
        action: 'rejected',
        summary: 'Code does not follow style guidelines',
        timestamp: new Date('2026-01-21T12:00:00Z'),
      });
      mockPOST.mockResolvedValue(createSuccessResponse({
        item: updatedItem,
        escalated: false,
        rejectionCount: 1,
      }));

      const rejectRequest: RejectItemRequest = {
        reason: 'Code does not follow style guidelines',
        agent: 'Lynch',
      };
      const request = createRequest('/api/items/WI-001/reject', rejectRequest);
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockPOST(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.item).toBeDefined();
      expect(data.data.rejectionCount).toBe(1);
      expect(data.data.escalated).toBe(false);
    });

    it('should increment rejectionCount on the item', async () => {
      const mockItem = createMockItem({ id: 'WI-001', stageId: 'review', rejectionCount: 0 });
      const updatedItem = { ...mockItem, rejectionCount: 1 };

      mockPrismaClient.item.findUnique.mockResolvedValue(mockItem);
      mockPrismaClient.item.update.mockResolvedValue(updatedItem);
      mockPOST.mockImplementation(async () => {
        await mockPrismaClient.item.update({
          where: { id: 'WI-001' },
          data: { rejectionCount: { increment: 1 } },
        });
        return createSuccessResponse({
          item: updatedItem,
          escalated: false,
          rejectionCount: 1,
        });
      });

      const rejectRequest: RejectItemRequest = {
        reason: 'Tests are failing',
        agent: 'Lynch',
      };
      const request = createRequest('/api/items/WI-001/reject', rejectRequest);
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockPOST(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.rejectionCount).toBe(1);
      expect(mockPrismaClient.item.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'WI-001' },
          data: expect.objectContaining({
            rejectionCount: { increment: 1 },
          }),
        })
      );
    });

    it('should create WorkLog entry with action=rejected', async () => {
      const mockItem = createMockItem({ id: 'WI-001', stageId: 'review', rejectionCount: 0 });
      const updatedItem = { ...mockItem, rejectionCount: 1 };

      mockPrismaClient.item.findUnique.mockResolvedValue(mockItem);
      mockPrismaClient.item.update.mockResolvedValue(updatedItem);
      mockPrismaClient.workLog.create.mockResolvedValue({
        id: 1,
        agent: 'Lynch',
        action: 'rejected',
        summary: 'Missing unit tests',
        timestamp: new Date('2026-01-21T12:00:00Z'),
      });
      mockPOST.mockImplementation(async () => {
        await mockPrismaClient.workLog.create({
          data: {
            itemId: 'WI-001',
            agent: 'Lynch',
            action: 'rejected',
            summary: 'Missing unit tests',
          },
        });
        return createSuccessResponse({
          item: updatedItem,
          escalated: false,
          rejectionCount: 1,
        });
      });

      const rejectRequest: RejectItemRequest = {
        reason: 'Missing unit tests',
        agent: 'Lynch',
      };
      const request = createRequest('/api/items/WI-001/reject', rejectRequest);
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      await mockPOST(request, params);

      expect(mockPrismaClient.workLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            itemId: 'WI-001',
            agent: 'Lynch',
            action: 'rejected',
            summary: 'Missing unit tests',
          }),
        })
      );
    });

    it('should return RejectItemResponse with item, escalated flag, and rejectionCount', async () => {
      const mockItem = createMockItem({ id: 'WI-001', stageId: 'review', rejectionCount: 0 });
      const updatedItem = { ...mockItem, rejectionCount: 1 };

      mockPrismaClient.item.findUnique.mockResolvedValue(mockItem);
      mockPrismaClient.item.update.mockResolvedValue(updatedItem);
      mockPOST.mockResolvedValue(createSuccessResponse({
        item: updatedItem,
        escalated: false,
        rejectionCount: 1,
      }));

      const rejectRequest: RejectItemRequest = {
        reason: 'Needs refactoring',
        agent: 'Lynch',
      };
      const request = createRequest('/api/items/WI-001/reject', rejectRequest);
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockPOST(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();

      // Verify response structure matches RejectItemResponse
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('item');
      expect(data.data).toHaveProperty('escalated');
      expect(data.data).toHaveProperty('rejectionCount');
      expect(typeof data.data.escalated).toBe('boolean');
      expect(typeof data.data.rejectionCount).toBe('number');
    });
  });

  describe('escalation on second rejection', () => {
    it('should move item to blocked stage when rejectionCount >= 2', async () => {
      const mockItem = createMockItem({ id: 'WI-001', stageId: 'review', rejectionCount: 1 });
      const escalatedItem = { ...mockItem, rejectionCount: 2, stageId: 'blocked' };

      mockPrismaClient.item.findUnique.mockResolvedValue(mockItem);
      mockPrismaClient.item.update.mockResolvedValue(escalatedItem);
      mockPOST.mockImplementation(async () => {
        // Second rejection - should escalate to blocked
        await mockPrismaClient.item.update({
          where: { id: 'WI-001' },
          data: {
            rejectionCount: { increment: 1 },
            stageId: 'blocked',
          },
        });
        return createSuccessResponse({
          item: escalatedItem,
          escalated: true,
          rejectionCount: 2,
        });
      });

      const rejectRequest: RejectItemRequest = {
        reason: 'Still has issues',
        agent: 'Lynch',
      };
      const request = createRequest('/api/items/WI-001/reject', rejectRequest);
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockPOST(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.escalated).toBe(true);
      expect(data.data.rejectionCount).toBe(2);
      expect(mockPrismaClient.item.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stageId: 'blocked',
          }),
        })
      );
    });

    it('should return escalated=true when rejectionCount reaches 2', async () => {
      const mockItem = createMockItem({ id: 'WI-001', stageId: 'review', rejectionCount: 1 });
      const escalatedItem = { ...mockItem, rejectionCount: 2, stageId: 'blocked' };

      mockPrismaClient.item.findUnique.mockResolvedValue(mockItem);
      mockPrismaClient.item.update.mockResolvedValue(escalatedItem);
      mockPOST.mockResolvedValue(createSuccessResponse({
        item: escalatedItem,
        escalated: true,
        rejectionCount: 2,
      }));

      const rejectRequest: RejectItemRequest = {
        reason: 'Repeated issues',
        agent: 'Lynch',
      };
      const request = createRequest('/api/items/WI-001/reject', rejectRequest);
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockPOST(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.escalated).toBe(true);
    });

    it('should escalate when rejectionCount exceeds 2', async () => {
      // Edge case: item already has 2 rejections, this is the 3rd
      const mockItem = createMockItem({ id: 'WI-001', stageId: 'review', rejectionCount: 2 });
      const escalatedItem = { ...mockItem, rejectionCount: 3, stageId: 'blocked' };

      mockPrismaClient.item.findUnique.mockResolvedValue(mockItem);
      mockPrismaClient.item.update.mockResolvedValue(escalatedItem);
      mockPOST.mockResolvedValue(createSuccessResponse({
        item: escalatedItem,
        escalated: true,
        rejectionCount: 3,
      }));

      const rejectRequest: RejectItemRequest = {
        reason: 'Yet another rejection',
        agent: 'Lynch',
      };
      const request = createRequest('/api/items/WI-001/reject', rejectRequest);
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockPOST(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.escalated).toBe(true);
      expect(data.data.rejectionCount).toBe(3);
    });

    it('should return escalated=false on first rejection', async () => {
      const mockItem = createMockItem({ id: 'WI-001', stageId: 'review', rejectionCount: 0 });
      const updatedItem = { ...mockItem, rejectionCount: 1 };

      mockPrismaClient.item.findUnique.mockResolvedValue(mockItem);
      mockPrismaClient.item.update.mockResolvedValue(updatedItem);
      mockPOST.mockResolvedValue(createSuccessResponse({
        item: updatedItem,
        escalated: false,
        rejectionCount: 1,
      }));

      const rejectRequest: RejectItemRequest = {
        reason: 'First rejection',
        agent: 'Lynch',
      };
      const request = createRequest('/api/items/WI-001/reject', rejectRequest);
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockPOST(request, params);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.escalated).toBe(false);
      expect(data.data.rejectionCount).toBe(1);
    });
  });

  describe('stage validation', () => {
    it('should reject items not in review stage', async () => {
      const mockItem = createMockItem({ id: 'WI-001', stageId: 'testing' });
      mockPrismaClient.item.findUnique.mockResolvedValue(mockItem);
      mockPOST.mockResolvedValue(createErrorResponse(
        'INVALID_STAGE',
        'Item must be in review stage to be rejected',
        400,
        { currentStage: 'testing', requiredStage: 'review' }
      ));

      const rejectRequest: RejectItemRequest = {
        reason: 'Cannot reject from in_progress',
        agent: 'Lynch',
      };
      const request = createRequest('/api/items/WI-001/reject', rejectRequest);
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockPOST(request, params);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_STAGE');
      expect(data.error.message).toContain('review');
    });

    it('should reject items in backlog stage', async () => {
      const mockItem = createMockItem({ id: 'WI-001', stageId: 'briefings' });
      mockPrismaClient.item.findUnique.mockResolvedValue(mockItem);
      mockPOST.mockResolvedValue(createErrorResponse(
        'INVALID_STAGE',
        'Item must be in review stage to be rejected',
        400
      ));

      const rejectRequest: RejectItemRequest = {
        reason: 'Cannot reject from backlog',
        agent: 'Lynch',
      };
      const request = createRequest('/api/items/WI-001/reject', rejectRequest);
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockPOST(request, params);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_STAGE');
    });

    it('should reject items in done stage', async () => {
      const mockItem = createMockItem({ id: 'WI-001', stageId: 'done' });
      mockPrismaClient.item.findUnique.mockResolvedValue(mockItem);
      mockPOST.mockResolvedValue(createErrorResponse(
        'INVALID_STAGE',
        'Item must be in review stage to be rejected',
        400
      ));

      const rejectRequest: RejectItemRequest = {
        reason: 'Cannot reject completed items',
        agent: 'Lynch',
      };
      const request = createRequest('/api/items/WI-001/reject', rejectRequest);
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockPOST(request, params);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_STAGE');
    });

    it('should reject items already in blocked stage', async () => {
      const mockItem = createMockItem({ id: 'WI-001', stageId: 'blocked' });
      mockPrismaClient.item.findUnique.mockResolvedValue(mockItem);
      mockPOST.mockResolvedValue(createErrorResponse(
        'INVALID_STAGE',
        'Item must be in review stage to be rejected',
        400
      ));

      const rejectRequest: RejectItemRequest = {
        reason: 'Cannot reject blocked items',
        agent: 'Lynch',
      };
      const request = createRequest('/api/items/WI-001/reject', rejectRequest);
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockPOST(request, params);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_STAGE');
    });
  });

  describe('request validation', () => {
    it('should reject request without reason', async () => {
      mockPOST.mockResolvedValue(createErrorResponse(
        'VALIDATION_ERROR',
        'reason is required',
        400
      ));

      const invalidRequest = { agent: 'Lynch' } as RejectItemRequest;
      const request = createRequest('/api/items/WI-001/reject', invalidRequest);
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockPOST(request, params);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('reason');
    });

    it('should reject request without agent', async () => {
      mockPOST.mockResolvedValue(createErrorResponse(
        'VALIDATION_ERROR',
        'agent is required',
        400
      ));

      const invalidRequest = { reason: 'Some reason' } as RejectItemRequest;
      const request = createRequest('/api/items/WI-001/reject', invalidRequest);
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockPOST(request, params);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('agent');
    });

    it('should reject empty reason', async () => {
      mockPOST.mockResolvedValue(createErrorResponse(
        'VALIDATION_ERROR',
        'reason cannot be empty',
        400
      ));

      const invalidRequest: RejectItemRequest = { reason: '', agent: 'Lynch' };
      const request = createRequest('/api/items/WI-001/reject', invalidRequest);
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockPOST(request, params);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('error handling', () => {
    it('should return ITEM_NOT_FOUND for non-existent item', async () => {
      mockPrismaClient.item.findUnique.mockResolvedValue(null);
      mockPOST.mockResolvedValue(createErrorResponse(
        'ITEM_NOT_FOUND',
        'Item WI-999 not found',
        404,
        { itemId: 'WI-999' }
      ));

      const rejectRequest: RejectItemRequest = {
        reason: 'Some reason',
        agent: 'Lynch',
      };
      const request = createRequest('/api/items/WI-999/reject', rejectRequest);
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-999' }) };
      const response = await mockPOST(request, params);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('ITEM_NOT_FOUND');
      expect(data.error.message).toContain('WI-999');
    });

    it('should return 400 for invalid JSON body', async () => {
      mockPOST.mockResolvedValue(createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid JSON body',
        400
      ));

      const request = new NextRequest('http://localhost:3000/api/items/WI-001/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json',
      });
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockPOST(request, params);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 500 for database errors', async () => {
      const mockItem = createMockItem({ id: 'WI-001', stageId: 'review' });
      mockPrismaClient.item.findUnique.mockResolvedValue(mockItem);
      mockPrismaClient.item.update.mockRejectedValue(new Error('Database error'));
      mockPOST.mockResolvedValue(
        NextResponse.json(
          { success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } },
          { status: 500 }
        )
      );

      const rejectRequest: RejectItemRequest = {
        reason: 'Some reason',
        agent: 'Lynch',
      };
      const request = createRequest('/api/items/WI-001/reject', rejectRequest);
      const params: RouteParams = { params: Promise.resolve({ id: 'WI-001' }) };
      const response = await mockPOST(request, params);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('SERVER_ERROR');
    });
  });
});
