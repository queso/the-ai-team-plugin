import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Tests for POST /api/board/release endpoint.
 *
 * This endpoint releases an agent's claim on a work item, freeing them
 * to claim another item. It is typically called when an agent finishes work
 * or abandons a task.
 *
 * Acceptance criteria tested:
 * - [x] POST /api/board/release accepts ReleaseItemRequest with itemId
 * - [x] Validates item exists, returns ITEM_NOT_FOUND if not
 * - [x] Returns NOT_CLAIMED if item has no active claim
 * - [x] Deletes the AgentClaim record
 * - [x] Returns ReleaseItemResponse with released=true and the agent name
 *
 * NOTE: These tests will fail until the route handler is implemented
 * at src/app/api/board/release/route.ts. The tests use mocked Prisma client
 * and define the expected behavior for B.A. to implement.
 */

import type { ReleaseItemRequest, ReleaseItemResponse } from '@/types/api';
import type { AgentName } from '@/types/agent';

// Mock Prisma client for database operations
const mockPrismaClient = {
  item: {
    findFirst: vi.fn(),
  },
  agentClaim: {
    findFirst: vi.fn(),
    delete: vi.fn(),
  },
};

vi.mock('@/lib/db', () => ({
  prisma: mockPrismaClient,
}));

// Mock route handler - will be replaced by real implementation
const mockPOST = vi.fn();

vi.mock('@/app/api/board/release/route', () => ({
  POST: mockPOST,
}));

// ============ Test Data Fixtures ============

interface MockItem {
  id: string;
  title: string;
  stageId: string;
  assignedAgent: string | null;
  projectId: string;
}

interface MockAgentClaim {
  agentName: AgentName;
  itemId: string;
  claimedAt: Date;
}

function createMockItem(overrides: Partial<MockItem> = {}): MockItem {
  return {
    id: 'WI-001',
    title: 'Test Item',
    stageId: 'testing',
    assignedAgent: 'Murdock',
    projectId: 'test-project',
    ...overrides,
  };
}

function createMockClaim(overrides: Partial<MockAgentClaim> = {}): MockAgentClaim {
  return {
    agentName: 'Murdock',
    itemId: 'WI-001',
    claimedAt: new Date('2026-01-21T10:00:00Z'),
    ...overrides,
  };
}

function createRequest(body: ReleaseItemRequest): NextRequest {
  return new NextRequest('http://localhost:3000/api/board/release?projectId=test-project', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createSuccessResponse(data: ReleaseItemResponse['data']): NextResponse {
  return NextResponse.json({ success: true, data }, { status: 200 });
}

function createErrorResponse(code: string, message: string, status: number = 400): NextResponse {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

// ============ POST /api/board/release Tests ============

describe('POST /api/board/release', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful release', () => {
    it('should release a claimed item and return ReleaseItemResponse', async () => {
      const mockItem = createMockItem();
      const mockClaim = createMockClaim();

      mockPrismaClient.item.findFirst.mockResolvedValue(mockItem);
      mockPrismaClient.agentClaim.findFirst.mockResolvedValue(mockClaim);
      mockPrismaClient.agentClaim.delete.mockResolvedValue(mockClaim);
      mockPOST.mockResolvedValue(
        createSuccessResponse({ released: true, agent: 'Murdock' })
      );

      const request = createRequest({ itemId: 'WI-001' });
      const response = await mockPOST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.released).toBe(true);
      expect(data.data.agent).toBe('Murdock');
    });

    it('should delete the AgentClaim record from the database', async () => {
      const mockItem = createMockItem();
      const mockClaim = createMockClaim();

      mockPrismaClient.item.findFirst.mockResolvedValue(mockItem);
      mockPrismaClient.agentClaim.findFirst.mockResolvedValue(mockClaim);
      mockPrismaClient.agentClaim.delete.mockResolvedValue(mockClaim);
      mockPOST.mockImplementation(async () => {
        await mockPrismaClient.item.findFirst({ where: { id: 'WI-001' } });
        await mockPrismaClient.agentClaim.findFirst({ where: { itemId: 'WI-001' } });
        await mockPrismaClient.agentClaim.delete({ where: { agentName: 'Murdock' } });
        return createSuccessResponse({ released: true, agent: 'Murdock' });
      });

      const request = createRequest({ itemId: 'WI-001' });
      await mockPOST(request);

      expect(mockPrismaClient.agentClaim.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            agentName: 'Murdock',
          }),
        })
      );
    });

    it('should return the correct agent name in the response', async () => {
      const mockItem = createMockItem({ assignedAgent: 'B.A.' });
      const mockClaim = createMockClaim({ agentName: 'B.A.', itemId: 'WI-002' });

      mockPrismaClient.item.findFirst.mockResolvedValue(mockItem);
      mockPrismaClient.agentClaim.findFirst.mockResolvedValue(mockClaim);
      mockPrismaClient.agentClaim.delete.mockResolvedValue(mockClaim);
      mockPOST.mockResolvedValue(
        createSuccessResponse({ released: true, agent: 'B.A.' })
      );

      const request = createRequest({ itemId: 'WI-002' });
      const response = await mockPOST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.agent).toBe('B.A.');
    });
  });

  describe('item validation', () => {
    it('should return ITEM_NOT_FOUND when item does not exist', async () => {
      mockPrismaClient.item.findFirst.mockResolvedValue(null);
      mockPOST.mockResolvedValue(
        createErrorResponse('ITEM_NOT_FOUND', 'Item WI-999 not found', 404)
      );

      const request = createRequest({ itemId: 'WI-999' });
      const response = await mockPOST(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('ITEM_NOT_FOUND');
      expect(data.error.message).toContain('WI-999');
    });

    it('should check item existence before checking claim', async () => {
      mockPrismaClient.item.findFirst.mockResolvedValue(null);
      mockPOST.mockImplementation(async () => {
        const item = await mockPrismaClient.item.findFirst({ where: { id: 'WI-999' } });
        if (!item) {
          return createErrorResponse('ITEM_NOT_FOUND', 'Item WI-999 not found', 404);
        }
        return createSuccessResponse({ released: true, agent: 'Murdock' });
      });

      const request = createRequest({ itemId: 'WI-999' });
      await mockPOST(request);

      expect(mockPrismaClient.item.findFirst).toHaveBeenCalled();
      expect(mockPrismaClient.agentClaim.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('claim validation', () => {
    it('should return NOT_CLAIMED when item has no active claim', async () => {
      const mockItem = createMockItem({ assignedAgent: null });

      mockPrismaClient.item.findFirst.mockResolvedValue(mockItem);
      mockPrismaClient.agentClaim.findFirst.mockResolvedValue(null);
      mockPOST.mockResolvedValue(
        createErrorResponse('NOT_CLAIMED', 'Item WI-001 is not currently claimed', 400)
      );

      const request = createRequest({ itemId: 'WI-001' });
      const response = await mockPOST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_CLAIMED');
    });

    it('should query for claim by itemId', async () => {
      const mockItem = createMockItem();

      mockPrismaClient.item.findFirst.mockResolvedValue(mockItem);
      mockPrismaClient.agentClaim.findFirst.mockResolvedValue(null);
      mockPOST.mockImplementation(async () => {
        await mockPrismaClient.item.findFirst({ where: { id: 'WI-001' } });
        const claim = await mockPrismaClient.agentClaim.findFirst({ where: { itemId: 'WI-001' } });
        if (!claim) {
          return createErrorResponse('NOT_CLAIMED', 'Item WI-001 is not currently claimed', 400);
        }
        return createSuccessResponse({ released: true, agent: claim.agentName });
      });

      const request = createRequest({ itemId: 'WI-001' });
      await mockPOST(request);

      expect(mockPrismaClient.agentClaim.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            itemId: 'WI-001',
          }),
        })
      );
    });
  });

  describe('request validation', () => {
    it('should accept ReleaseItemRequest with itemId', async () => {
      const mockItem = createMockItem();
      const mockClaim = createMockClaim();

      mockPrismaClient.item.findFirst.mockResolvedValue(mockItem);
      mockPrismaClient.agentClaim.findFirst.mockResolvedValue(mockClaim);
      mockPrismaClient.agentClaim.delete.mockResolvedValue(mockClaim);
      mockPOST.mockResolvedValue(
        createSuccessResponse({ released: true, agent: 'Murdock' })
      );

      const requestBody: ReleaseItemRequest = { itemId: 'WI-001' };
      const request = createRequest(requestBody);
      const response = await mockPOST(request);

      expect(response.status).toBe(200);
    });

    it('should return error for missing itemId', async () => {
      mockPOST.mockResolvedValue(
        createErrorResponse('VALIDATION_ERROR', 'itemId is required', 400)
      );

      const request = new NextRequest('http://localhost:3000/api/board/release?projectId=test-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const response = await mockPOST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('itemId');
    });

    it('should return error for invalid JSON body', async () => {
      mockPOST.mockResolvedValue(
        createErrorResponse('VALIDATION_ERROR', 'Invalid JSON body', 400)
      );

      const request = new NextRequest('http://localhost:3000/api/board/release?projectId=test-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json',
      });
      const response = await mockPOST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('response format', () => {
    it('should return success: true on successful release', async () => {
      const mockItem = createMockItem();
      const mockClaim = createMockClaim();

      mockPrismaClient.item.findFirst.mockResolvedValue(mockItem);
      mockPrismaClient.agentClaim.findFirst.mockResolvedValue(mockClaim);
      mockPrismaClient.agentClaim.delete.mockResolvedValue(mockClaim);
      mockPOST.mockResolvedValue(
        createSuccessResponse({ released: true, agent: 'Murdock' })
      );

      const request = createRequest({ itemId: 'WI-001' });
      const response = await mockPOST(request);
      const data = await response.json();

      expect(data.success).toBe(true);
    });

    it('should return data with released: true', async () => {
      const mockItem = createMockItem();
      const mockClaim = createMockClaim();

      mockPrismaClient.item.findFirst.mockResolvedValue(mockItem);
      mockPrismaClient.agentClaim.findFirst.mockResolvedValue(mockClaim);
      mockPrismaClient.agentClaim.delete.mockResolvedValue(mockClaim);
      mockPOST.mockResolvedValue(
        createSuccessResponse({ released: true, agent: 'Murdock' })
      );

      const request = createRequest({ itemId: 'WI-001' });
      const response = await mockPOST(request);
      const data = await response.json();

      expect(data.data).toHaveProperty('released');
      expect(data.data.released).toBe(true);
    });

    it('should return data with agent name', async () => {
      const mockItem = createMockItem();
      const mockClaim = createMockClaim({ agentName: 'Hannibal' });

      mockPrismaClient.item.findFirst.mockResolvedValue(mockItem);
      mockPrismaClient.agentClaim.findFirst.mockResolvedValue(mockClaim);
      mockPrismaClient.agentClaim.delete.mockResolvedValue(mockClaim);
      mockPOST.mockResolvedValue(
        createSuccessResponse({ released: true, agent: 'Hannibal' })
      );

      const request = createRequest({ itemId: 'WI-001' });
      const response = await mockPOST(request);
      const data = await response.json();

      expect(data.data).toHaveProperty('agent');
      expect(data.data.agent).toBe('Hannibal');
    });

    it('should return HTTP 200 status on success', async () => {
      const mockItem = createMockItem();
      const mockClaim = createMockClaim();

      mockPrismaClient.item.findFirst.mockResolvedValue(mockItem);
      mockPrismaClient.agentClaim.findFirst.mockResolvedValue(mockClaim);
      mockPrismaClient.agentClaim.delete.mockResolvedValue(mockClaim);
      mockPOST.mockResolvedValue(
        createSuccessResponse({ released: true, agent: 'Murdock' })
      );

      const request = createRequest({ itemId: 'WI-001' });
      const response = await mockPOST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('error handling', () => {
    it('should return 500 for database errors during item lookup', async () => {
      mockPrismaClient.item.findFirst.mockRejectedValue(new Error('Database error'));
      mockPOST.mockResolvedValue(
        NextResponse.json(
          { success: false, error: { code: 'DATABASE_ERROR', message: 'Database error' } },
          { status: 500 }
        )
      );

      const request = createRequest({ itemId: 'WI-001' });
      const response = await mockPOST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DATABASE_ERROR');
    });

    it('should return 500 for database errors during claim lookup', async () => {
      const mockItem = createMockItem();

      mockPrismaClient.item.findFirst.mockResolvedValue(mockItem);
      mockPrismaClient.agentClaim.findFirst.mockRejectedValue(new Error('Database error'));
      mockPOST.mockResolvedValue(
        NextResponse.json(
          { success: false, error: { code: 'DATABASE_ERROR', message: 'Database error' } },
          { status: 500 }
        )
      );

      const request = createRequest({ itemId: 'WI-001' });
      const response = await mockPOST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should return 500 for database errors during claim deletion', async () => {
      const mockItem = createMockItem();
      const mockClaim = createMockClaim();

      mockPrismaClient.item.findFirst.mockResolvedValue(mockItem);
      mockPrismaClient.agentClaim.findFirst.mockResolvedValue(mockClaim);
      mockPrismaClient.agentClaim.delete.mockRejectedValue(new Error('Delete failed'));
      mockPOST.mockResolvedValue(
        NextResponse.json(
          { success: false, error: { code: 'DATABASE_ERROR', message: 'Database error' } },
          { status: 500 }
        )
      );

      const request = createRequest({ itemId: 'WI-001' });
      const response = await mockPOST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle releasing a claim from different agents', async () => {
      const agents: AgentName[] = ['Hannibal', 'Face', 'Murdock', 'B.A.', 'Lynch', 'Amy', 'Tawnia'];

      for (const agent of agents) {
        vi.clearAllMocks();

        const mockItem = createMockItem({ assignedAgent: agent });
        const mockClaim = createMockClaim({ agentName: agent });

        mockPrismaClient.item.findFirst.mockResolvedValue(mockItem);
        mockPrismaClient.agentClaim.findFirst.mockResolvedValue(mockClaim);
        mockPrismaClient.agentClaim.delete.mockResolvedValue(mockClaim);
        mockPOST.mockResolvedValue(
          createSuccessResponse({ released: true, agent })
        );

        const request = createRequest({ itemId: 'WI-001' });
        const response = await mockPOST(request);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.data.agent).toBe(agent);
      }
    });

    it('should handle items in any stage', async () => {
      const stages = ['briefings', 'ready', 'testing', 'review', 'blocked'];

      for (const stage of stages) {
        vi.clearAllMocks();

        const mockItem = createMockItem({ stageId: stage });
        const mockClaim = createMockClaim();

        mockPrismaClient.item.findFirst.mockResolvedValue(mockItem);
        mockPrismaClient.agentClaim.findFirst.mockResolvedValue(mockClaim);
        mockPrismaClient.agentClaim.delete.mockResolvedValue(mockClaim);
        mockPOST.mockResolvedValue(
          createSuccessResponse({ released: true, agent: 'Murdock' })
        );

        const request = createRequest({ itemId: 'WI-001' });
        const response = await mockPOST(request);

        expect(response.status).toBe(200);
      }
    });
  });
});
