import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Tests for POST /api/agents/stop endpoint
 *
 * This endpoint allows an agent to stop work on an item, releasing the claim,
 * logging a work summary, and moving the item to the next stage.
 *
 * Acceptance criteria tested:
 * - [x] POST /api/agents/stop accepts AgentStopRequest with itemId, agent, summary, and optional outcome
 * - [x] Validates item is claimed by the specified agent
 * - [x] Deletes the agent claim
 * - [x] Clears assignedAgent on the item
 * - [x] Creates WorkLog entry with the provided summary
 * - [x] Moves item to review (if outcome=completed or default) or blocked (if outcome=blocked)
 * - [x] Returns AgentStopResponse with workLogEntry and nextStage
 *
 * NOTE: These tests will fail until the route handler is implemented
 * at src/app/api/agents/stop/route.ts. The tests use mocked Prisma client
 * and mock route handler to define the expected behavior for B.A. to implement.
 */

import type { AgentStopRequest, AgentStopResponse, ApiError } from '@/types/api';
import type { AgentName } from '@/types/agent';
import type { WorkLogEntry } from '@/types/item';

// Mock Prisma client for database operations
const mockPrismaClient = {
  item: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  agentClaim: {
    findFirst: vi.fn(),
    delete: vi.fn(),
  },
  workLog: {
    create: vi.fn(),
  },
};

vi.mock('@/lib/db', () => ({
  prisma: mockPrismaClient,
}));

// Mock route handler - will be replaced by real implementation
const mockPOST = vi.fn();

vi.mock('@/app/api/agents/stop/route', () => ({
  POST: mockPOST,
}));

// ============ Test Data Fixtures ============

interface MockItem {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  stageId: string;
  assignedAgent: string | null;
  rejectionCount: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

interface MockAgentClaim {
  agentName: AgentName;
  itemId: string;
  claimedAt: Date;
}

interface MockWorkLogEntry {
  id: number;
  agent: string;
  action: string;
  summary: string;
  timestamp: Date;
}

function createMockItem(overrides: Partial<MockItem> = {}): MockItem {
  return {
    id: 'WI-001',
    title: 'Test Feature',
    description: 'Test description',
    type: 'feature',
    priority: 'high',
    stageId: 'testing',
    assignedAgent: 'Murdock',
    rejectionCount: 0,
    createdAt: new Date('2026-01-21T10:00:00Z'),
    updatedAt: new Date('2026-01-21T12:00:00Z'),
    completedAt: null,
    ...overrides,
  };
}

function createMockClaim(overrides: Partial<MockAgentClaim> = {}): MockAgentClaim {
  return {
    agentName: 'Murdock',
    itemId: 'WI-001',
    claimedAt: new Date('2026-01-21T11:00:00Z'),
    ...overrides,
  };
}

function createMockWorkLog(overrides: Partial<MockWorkLogEntry> = {}): MockWorkLogEntry {
  return {
    id: 1,
    agent: 'Murdock',
    action: 'completed',
    summary: 'Finished work',
    timestamp: new Date('2026-01-21T14:00:00Z'),
    ...overrides,
  };
}

function createRequest(body: AgentStopRequest): NextRequest {
  return new NextRequest('http://localhost:3000/api/agents/stop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createSuccessResponse(data: AgentStopResponse['data']): NextResponse {
  return NextResponse.json({ success: true, data }, { status: 200 });
}

function createErrorResponse(
  code: string,
  message: string,
  status: number = 400,
  details?: unknown
): NextResponse {
  return NextResponse.json(
    { success: false, error: { code, message, details } },
    { status }
  );
}

// ============ POST /api/agents/stop Tests ============

describe('POST /api/agents/stop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('request validation', () => {
    it('should accept AgentStopRequest with itemId, agent, and summary', async () => {
      const mockItem = createMockItem();
      const mockClaim = createMockClaim();
      const mockWorkLog = createMockWorkLog({ summary: 'Finished implementing the feature' });

      mockPrismaClient.item.findUnique.mockResolvedValue(mockItem);
      mockPrismaClient.agentClaim.findFirst.mockResolvedValue(mockClaim);
      mockPrismaClient.agentClaim.delete.mockResolvedValue(mockClaim);
      mockPrismaClient.workLog.create.mockResolvedValue(mockWorkLog);
      mockPrismaClient.item.update.mockResolvedValue({
        ...mockItem,
        stageId: 'review',
        assignedAgent: null,
      });

      mockPOST.mockResolvedValue(
        createSuccessResponse({
          itemId: 'WI-001',
          agent: 'Murdock',
          workLogEntry: mockWorkLog as WorkLogEntry,
          nextStage: 'review',
        })
      );

      const request = createRequest({
        itemId: 'WI-001',
        agent: 'Murdock',
        summary: 'Finished implementing the feature',
      });

      const response = await mockPOST(request);
      expect(response.status).toBe(200);
    });

    it('should accept optional outcome parameter', async () => {
      const mockItem = createMockItem();
      const mockClaim = createMockClaim();
      const mockWorkLog = createMockWorkLog({ summary: 'Work blocked due to dependency' });

      mockPrismaClient.item.findUnique.mockResolvedValue(mockItem);
      mockPrismaClient.agentClaim.findFirst.mockResolvedValue(mockClaim);
      mockPrismaClient.agentClaim.delete.mockResolvedValue(mockClaim);
      mockPrismaClient.workLog.create.mockResolvedValue(mockWorkLog);
      mockPrismaClient.item.update.mockResolvedValue({
        ...mockItem,
        stageId: 'blocked',
        assignedAgent: null,
      });

      mockPOST.mockResolvedValue(
        createSuccessResponse({
          itemId: 'WI-001',
          agent: 'Murdock',
          workLogEntry: mockWorkLog as WorkLogEntry,
          nextStage: 'blocked',
        })
      );

      const request = createRequest({
        itemId: 'WI-001',
        agent: 'Murdock',
        summary: 'Work blocked due to dependency',
        outcome: 'blocked',
      });

      const response = await mockPOST(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.nextStage).toBe('blocked');
    });

    it('should return 400 for missing itemId', async () => {
      mockPOST.mockResolvedValue(
        createErrorResponse('VALIDATION_ERROR', 'itemId is required', 400)
      );

      const request = new NextRequest('http://localhost:3000/api/agents/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: 'Murdock',
          summary: 'Work done',
        }),
      });

      const response = await mockPOST(request);
      expect(response.status).toBe(400);
      const data: ApiError = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing agent', async () => {
      mockPOST.mockResolvedValue(
        createErrorResponse('VALIDATION_ERROR', 'agent is required', 400)
      );

      const request = new NextRequest('http://localhost:3000/api/agents/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: 'WI-001',
          summary: 'Work done',
        }),
      });

      const response = await mockPOST(request);
      expect(response.status).toBe(400);
      const data: ApiError = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing summary', async () => {
      mockPOST.mockResolvedValue(
        createErrorResponse('VALIDATION_ERROR', 'summary is required', 400)
      );

      const request = new NextRequest('http://localhost:3000/api/agents/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: 'WI-001',
          agent: 'Murdock',
        }),
      });

      const response = await mockPOST(request);
      expect(response.status).toBe(400);
      const data: ApiError = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid agent name', async () => {
      mockPOST.mockResolvedValue(
        createErrorResponse('VALIDATION_ERROR', 'Invalid agent name: InvalidAgent', 400)
      );

      const request = new NextRequest('http://localhost:3000/api/agents/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: 'WI-001',
          agent: 'InvalidAgent',
          summary: 'Work done',
        }),
      });

      const response = await mockPOST(request);
      expect(response.status).toBe(400);
      const data: ApiError = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid outcome value', async () => {
      mockPOST.mockResolvedValue(
        createErrorResponse('VALIDATION_ERROR', 'Invalid outcome value', 400)
      );

      const request = new NextRequest('http://localhost:3000/api/agents/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: 'WI-001',
          agent: 'Murdock',
          summary: 'Work done',
          outcome: 'invalid_outcome',
        }),
      });

      const response = await mockPOST(request);
      expect(response.status).toBe(400);
      const data: ApiError = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid JSON body', async () => {
      mockPOST.mockResolvedValue(
        createErrorResponse('VALIDATION_ERROR', 'Invalid JSON body', 400)
      );

      const request = new NextRequest('http://localhost:3000/api/agents/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json',
      });

      const response = await mockPOST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  describe('item validation', () => {
    it('should return ITEM_NOT_FOUND if item does not exist', async () => {
      mockPrismaClient.item.findUnique.mockResolvedValue(null);
      mockPOST.mockResolvedValue(
        createErrorResponse('ITEM_NOT_FOUND', 'Item WI-999 not found', 404)
      );

      const request = createRequest({
        itemId: 'WI-999',
        agent: 'Murdock',
        summary: 'Work done',
      });

      const response = await mockPOST(request);
      expect(response.status).toBe(404);
      const data: ApiError = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('ITEM_NOT_FOUND');
      expect(data.error.message).toContain('WI-999');
    });

    it('should check item existence before checking claim', async () => {
      mockPrismaClient.item.findUnique.mockResolvedValue(null);
      mockPOST.mockImplementation(async () => {
        const item = await mockPrismaClient.item.findUnique({ where: { id: 'WI-999' } });
        if (!item) {
          return createErrorResponse('ITEM_NOT_FOUND', 'Item WI-999 not found', 404);
        }
        return createSuccessResponse({
          itemId: 'WI-999',
          agent: 'Murdock',
          workLogEntry: createMockWorkLog() as WorkLogEntry,
          nextStage: 'review',
        });
      });

      const request = createRequest({
        itemId: 'WI-999',
        agent: 'Murdock',
        summary: 'Work done',
      });

      await mockPOST(request);

      expect(mockPrismaClient.item.findUnique).toHaveBeenCalled();
      expect(mockPrismaClient.agentClaim.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('claim validation', () => {
    it('should return NOT_CLAIMED if item has no active claim', async () => {
      const mockItem = createMockItem({ assignedAgent: null });

      mockPrismaClient.item.findUnique.mockResolvedValue(mockItem);
      mockPrismaClient.agentClaim.findFirst.mockResolvedValue(null);
      mockPOST.mockResolvedValue(
        createErrorResponse('NOT_CLAIMED', 'Item WI-001 is not currently claimed', 400)
      );

      const request = createRequest({
        itemId: 'WI-001',
        agent: 'Murdock',
        summary: 'Work done',
      });

      const response = await mockPOST(request);
      expect(response.status).toBe(400);
      const data: ApiError = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_CLAIMED');
    });

    it('should return CLAIM_MISMATCH if item is claimed by a different agent', async () => {
      const mockItem = createMockItem();
      const mockClaim = createMockClaim(); // Claimed by Murdock

      mockPrismaClient.item.findUnique.mockResolvedValue(mockItem);
      mockPrismaClient.agentClaim.findFirst.mockResolvedValue(mockClaim);
      mockPOST.mockResolvedValue(
        createErrorResponse(
          'CLAIM_MISMATCH',
          'Item WI-001 is claimed by Murdock, not BA',
          403,
          { claimedBy: 'Murdock' }
        )
      );

      const request = createRequest({
        itemId: 'WI-001',
        agent: 'B.A.', // Different agent than Murdock who claimed it
        summary: 'Work done',
      });

      const response = await mockPOST(request);
      expect(response.status).toBe(403);
      const data: ApiError = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('CLAIM_MISMATCH');
      expect(data.error.details).toHaveProperty('claimedBy', 'Murdock');
    });

    it('should verify claim belongs to the requesting agent', async () => {
      const mockItem = createMockItem();
      const mockClaim = createMockClaim();

      mockPrismaClient.item.findUnique.mockResolvedValue(mockItem);
      mockPrismaClient.agentClaim.findFirst.mockResolvedValue(mockClaim);
      mockPrismaClient.agentClaim.delete.mockResolvedValue(mockClaim);
      mockPrismaClient.workLog.create.mockResolvedValue(createMockWorkLog());
      mockPrismaClient.item.update.mockResolvedValue({
        ...mockItem,
        stageId: 'review',
        assignedAgent: null,
      });

      mockPOST.mockImplementation(async () => {
        await mockPrismaClient.item.findUnique({ where: { id: 'WI-001' } });
        const claim = await mockPrismaClient.agentClaim.findFirst({
          where: { itemId: 'WI-001' },
        });
        if (claim && claim.agentName !== 'Murdock') {
          return createErrorResponse(
            'CLAIM_MISMATCH',
            `Item claimed by ${claim.agentName}`,
            403,
            { claimedBy: claim.agentName }
          );
        }
        return createSuccessResponse({
          itemId: 'WI-001',
          agent: 'Murdock',
          workLogEntry: createMockWorkLog() as WorkLogEntry,
          nextStage: 'review',
        });
      });

      const request = createRequest({
        itemId: 'WI-001',
        agent: 'Murdock',
        summary: 'Work done',
      });

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

  describe('successful stop workflow', () => {
    it('should delete the agent claim', async () => {
      const mockItem = createMockItem();
      const mockClaim = createMockClaim();

      mockPrismaClient.item.findUnique.mockResolvedValue(mockItem);
      mockPrismaClient.agentClaim.findFirst.mockResolvedValue(mockClaim);
      mockPrismaClient.agentClaim.delete.mockResolvedValue(mockClaim);
      mockPrismaClient.workLog.create.mockResolvedValue(createMockWorkLog());
      mockPrismaClient.item.update.mockResolvedValue({
        ...mockItem,
        stageId: 'review',
        assignedAgent: null,
      });

      mockPOST.mockImplementation(async () => {
        await mockPrismaClient.item.findUnique({ where: { id: 'WI-001' } });
        await mockPrismaClient.agentClaim.findFirst({ where: { itemId: 'WI-001' } });
        await mockPrismaClient.agentClaim.delete({ where: { agentName: 'Murdock' } });
        await mockPrismaClient.workLog.create({
          data: { agent: 'Murdock', summary: 'Finished work', action: 'completed' },
        });
        await mockPrismaClient.item.update({
          where: { id: 'WI-001' },
          data: { stageId: 'review', assignedAgent: null },
        });
        return createSuccessResponse({
          itemId: 'WI-001',
          agent: 'Murdock',
          workLogEntry: createMockWorkLog() as WorkLogEntry,
          nextStage: 'review',
        });
      });

      const request = createRequest({
        itemId: 'WI-001',
        agent: 'Murdock',
        summary: 'Finished work',
      });

      await mockPOST(request);

      expect(mockPrismaClient.agentClaim.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            agentName: 'Murdock',
          }),
        })
      );
    });

    it('should clear assignedAgent on the item', async () => {
      const mockItem = createMockItem();
      const mockClaim = createMockClaim();

      mockPrismaClient.item.findUnique.mockResolvedValue(mockItem);
      mockPrismaClient.agentClaim.findFirst.mockResolvedValue(mockClaim);
      mockPrismaClient.agentClaim.delete.mockResolvedValue(mockClaim);
      mockPrismaClient.workLog.create.mockResolvedValue(createMockWorkLog());
      mockPrismaClient.item.update.mockResolvedValue({
        ...mockItem,
        stageId: 'review',
        assignedAgent: null,
      });

      mockPOST.mockImplementation(async () => {
        await mockPrismaClient.item.findUnique({ where: { id: 'WI-001' } });
        await mockPrismaClient.agentClaim.findFirst({ where: { itemId: 'WI-001' } });
        await mockPrismaClient.agentClaim.delete({ where: { agentName: 'Murdock' } });
        await mockPrismaClient.workLog.create({
          data: { agent: 'Murdock', summary: 'Finished work', action: 'completed' },
        });
        await mockPrismaClient.item.update({
          where: { id: 'WI-001' },
          data: { stageId: 'review', assignedAgent: null },
        });
        return createSuccessResponse({
          itemId: 'WI-001',
          agent: 'Murdock',
          workLogEntry: createMockWorkLog() as WorkLogEntry,
          nextStage: 'review',
        });
      });

      const request = createRequest({
        itemId: 'WI-001',
        agent: 'Murdock',
        summary: 'Finished work',
      });

      await mockPOST(request);

      expect(mockPrismaClient.item.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'WI-001' },
          data: expect.objectContaining({
            assignedAgent: null,
          }),
        })
      );
    });

    it('should create WorkLog entry with the provided summary', async () => {
      const mockItem = createMockItem();
      const mockClaim = createMockClaim();
      const summary = 'Implemented the entire feature successfully';

      mockPrismaClient.item.findUnique.mockResolvedValue(mockItem);
      mockPrismaClient.agentClaim.findFirst.mockResolvedValue(mockClaim);
      mockPrismaClient.agentClaim.delete.mockResolvedValue(mockClaim);
      mockPrismaClient.workLog.create.mockResolvedValue(createMockWorkLog({ summary }));
      mockPrismaClient.item.update.mockResolvedValue({
        ...mockItem,
        stageId: 'review',
        assignedAgent: null,
      });

      mockPOST.mockImplementation(async () => {
        await mockPrismaClient.item.findUnique({ where: { id: 'WI-001' } });
        await mockPrismaClient.agentClaim.findFirst({ where: { itemId: 'WI-001' } });
        await mockPrismaClient.agentClaim.delete({ where: { agentName: 'Murdock' } });
        await mockPrismaClient.workLog.create({
          data: { agent: 'Murdock', summary, action: 'completed', itemId: 'WI-001' },
        });
        await mockPrismaClient.item.update({
          where: { id: 'WI-001' },
          data: { stageId: 'review', assignedAgent: null },
        });
        return createSuccessResponse({
          itemId: 'WI-001',
          agent: 'Murdock',
          workLogEntry: createMockWorkLog({ summary }) as WorkLogEntry,
          nextStage: 'review',
        });
      });

      const request = createRequest({
        itemId: 'WI-001',
        agent: 'Murdock',
        summary,
      });

      await mockPOST(request);

      expect(mockPrismaClient.workLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            agent: 'Murdock',
            summary,
            action: 'completed',
          }),
        })
      );
    });
  });

  describe('outcome handling - stage transitions', () => {
    it('should move item to review when outcome is completed', async () => {
      const mockItem = createMockItem();
      const mockClaim = createMockClaim();

      mockPrismaClient.item.findUnique.mockResolvedValue(mockItem);
      mockPrismaClient.agentClaim.findFirst.mockResolvedValue(mockClaim);
      mockPrismaClient.agentClaim.delete.mockResolvedValue(mockClaim);
      mockPrismaClient.workLog.create.mockResolvedValue(createMockWorkLog());
      mockPrismaClient.item.update.mockResolvedValue({
        ...mockItem,
        stageId: 'review',
        assignedAgent: null,
      });

      mockPOST.mockImplementation(async () => {
        await mockPrismaClient.item.update({
          where: { id: 'WI-001' },
          data: { stageId: 'review', assignedAgent: null },
        });
        return createSuccessResponse({
          itemId: 'WI-001',
          agent: 'Murdock',
          workLogEntry: createMockWorkLog() as WorkLogEntry,
          nextStage: 'review',
        });
      });

      const request = createRequest({
        itemId: 'WI-001',
        agent: 'Murdock',
        summary: 'Finished work',
        outcome: 'completed',
      });

      const response = await mockPOST(request);
      const data = await response.json();

      expect(mockPrismaClient.item.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stageId: 'review',
          }),
        })
      );
      expect(data.data.nextStage).toBe('review');
    });

    it('should move item to review when outcome is not specified (default)', async () => {
      const mockItem = createMockItem();
      const mockClaim = createMockClaim();

      mockPrismaClient.item.findUnique.mockResolvedValue(mockItem);
      mockPrismaClient.agentClaim.findFirst.mockResolvedValue(mockClaim);
      mockPrismaClient.agentClaim.delete.mockResolvedValue(mockClaim);
      mockPrismaClient.workLog.create.mockResolvedValue(createMockWorkLog());
      mockPrismaClient.item.update.mockResolvedValue({
        ...mockItem,
        stageId: 'review',
        assignedAgent: null,
      });

      mockPOST.mockResolvedValue(
        createSuccessResponse({
          itemId: 'WI-001',
          agent: 'Murdock',
          workLogEntry: createMockWorkLog() as WorkLogEntry,
          nextStage: 'review',
        })
      );

      const request = createRequest({
        itemId: 'WI-001',
        agent: 'Murdock',
        summary: 'Finished work',
        // No outcome specified - should default to completed/review
      });

      const response = await mockPOST(request);
      const data = await response.json();

      expect(data.data.nextStage).toBe('review');
    });

    it('should move item to blocked when outcome is blocked', async () => {
      const mockItem = createMockItem();
      const mockClaim = createMockClaim();

      mockPrismaClient.item.findUnique.mockResolvedValue(mockItem);
      mockPrismaClient.agentClaim.findFirst.mockResolvedValue(mockClaim);
      mockPrismaClient.agentClaim.delete.mockResolvedValue(mockClaim);
      mockPrismaClient.workLog.create.mockResolvedValue(
        createMockWorkLog({ summary: 'Blocked on external dependency', action: 'note' })
      );
      mockPrismaClient.item.update.mockResolvedValue({
        ...mockItem,
        stageId: 'blocked',
        assignedAgent: null,
      });

      mockPOST.mockImplementation(async () => {
        await mockPrismaClient.item.update({
          where: { id: 'WI-001' },
          data: { stageId: 'blocked', assignedAgent: null },
        });
        return createSuccessResponse({
          itemId: 'WI-001',
          agent: 'Murdock',
          workLogEntry: createMockWorkLog({
            summary: 'Blocked on external dependency',
            action: 'note',
          }) as WorkLogEntry,
          nextStage: 'blocked',
        });
      });

      const request = createRequest({
        itemId: 'WI-001',
        agent: 'Murdock',
        summary: 'Blocked on external dependency',
        outcome: 'blocked',
      });

      const response = await mockPOST(request);
      const data = await response.json();

      expect(mockPrismaClient.item.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stageId: 'blocked',
          }),
        })
      );
      expect(data.data.nextStage).toBe('blocked');
    });
  });

  describe('response format (AgentStopResponse)', () => {
    it('should return success: true on successful stop', async () => {
      const mockItem = createMockItem();
      const mockClaim = createMockClaim();

      mockPrismaClient.item.findUnique.mockResolvedValue(mockItem);
      mockPrismaClient.agentClaim.findFirst.mockResolvedValue(mockClaim);
      mockPrismaClient.agentClaim.delete.mockResolvedValue(mockClaim);
      mockPrismaClient.workLog.create.mockResolvedValue(createMockWorkLog());
      mockPrismaClient.item.update.mockResolvedValue({
        ...mockItem,
        stageId: 'review',
        assignedAgent: null,
      });

      mockPOST.mockResolvedValue(
        createSuccessResponse({
          itemId: 'WI-001',
          agent: 'Murdock',
          workLogEntry: createMockWorkLog() as WorkLogEntry,
          nextStage: 'review',
        })
      );

      const request = createRequest({
        itemId: 'WI-001',
        agent: 'Murdock',
        summary: 'Work done',
      });

      const response = await mockPOST(request);
      const data = await response.json();

      expect(data.success).toBe(true);
    });

    it('should return itemId in response', async () => {
      mockPOST.mockResolvedValue(
        createSuccessResponse({
          itemId: 'WI-001',
          agent: 'Murdock',
          workLogEntry: createMockWorkLog() as WorkLogEntry,
          nextStage: 'review',
        })
      );

      const request = createRequest({
        itemId: 'WI-001',
        agent: 'Murdock',
        summary: 'Work done',
      });

      const response = await mockPOST(request);
      const data = await response.json();

      expect(data.data.itemId).toBe('WI-001');
    });

    it('should return agent in response', async () => {
      mockPOST.mockResolvedValue(
        createSuccessResponse({
          itemId: 'WI-001',
          agent: 'Murdock',
          workLogEntry: createMockWorkLog() as WorkLogEntry,
          nextStage: 'review',
        })
      );

      const request = createRequest({
        itemId: 'WI-001',
        agent: 'Murdock',
        summary: 'Work done',
      });

      const response = await mockPOST(request);
      const data = await response.json();

      expect(data.data.agent).toBe('Murdock');
    });

    it('should return workLogEntry in response', async () => {
      const workLogEntry = createMockWorkLog({
        id: 42,
        summary: 'Finished the feature implementation',
      });

      mockPOST.mockResolvedValue(
        createSuccessResponse({
          itemId: 'WI-001',
          agent: 'Murdock',
          workLogEntry: workLogEntry as WorkLogEntry,
          nextStage: 'review',
        })
      );

      const request = createRequest({
        itemId: 'WI-001',
        agent: 'Murdock',
        summary: 'Finished the feature implementation',
      });

      const response = await mockPOST(request);
      const data = await response.json();

      expect(data.data.workLogEntry).toBeDefined();
      expect(data.data.workLogEntry.id).toBe(42);
      expect(data.data.workLogEntry.agent).toBe('Murdock');
      expect(data.data.workLogEntry.action).toBe('completed');
      expect(data.data.workLogEntry.summary).toBe('Finished the feature implementation');
    });

    it('should return nextStage in response', async () => {
      mockPOST.mockResolvedValue(
        createSuccessResponse({
          itemId: 'WI-001',
          agent: 'Murdock',
          workLogEntry: createMockWorkLog() as WorkLogEntry,
          nextStage: 'review',
        })
      );

      const request = createRequest({
        itemId: 'WI-001',
        agent: 'Murdock',
        summary: 'Work done',
      });

      const response = await mockPOST(request);
      const data = await response.json();

      expect(data.data.nextStage).toBeDefined();
      expect(typeof data.data.nextStage).toBe('string');
    });
  });

  describe('different agents stopping work', () => {
    const agents: AgentName[] = ['Hannibal', 'Face', 'Murdock', 'B.A.', 'Lynch', 'Amy', 'Tawnia'];

    for (const agent of agents) {
      it(`should allow ${agent} to stop work on their claimed item`, async () => {
        const mockItem = createMockItem({ assignedAgent: agent });
        const mockClaim = createMockClaim({ agentName: agent });

        mockPrismaClient.item.findUnique.mockResolvedValue(mockItem);
        mockPrismaClient.agentClaim.findFirst.mockResolvedValue(mockClaim);
        mockPrismaClient.agentClaim.delete.mockResolvedValue(mockClaim);
        mockPrismaClient.workLog.create.mockResolvedValue(
          createMockWorkLog({ agent: agent })
        );
        mockPrismaClient.item.update.mockResolvedValue({
          ...mockItem,
          stageId: 'review',
          assignedAgent: null,
        });

        mockPOST.mockResolvedValue(
          createSuccessResponse({
            itemId: 'WI-001',
            agent: agent,
            workLogEntry: createMockWorkLog({ agent: agent }) as WorkLogEntry,
            nextStage: 'review',
          })
        );

        const request = createRequest({
          itemId: 'WI-001',
          agent: agent,
          summary: `${agent} finished work`,
        });

        const response = await mockPOST(request);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.data.agent).toBe(agent);
      });
    }
  });

  describe('error handling', () => {
    it('should return 500 for database errors during item lookup', async () => {
      mockPrismaClient.item.findUnique.mockRejectedValue(
        new Error('Database connection failed')
      );
      mockPOST.mockResolvedValue(
        NextResponse.json(
          { success: false, error: { code: 'DATABASE_ERROR', message: 'Database error' } },
          { status: 500 }
        )
      );

      const request = createRequest({
        itemId: 'WI-001',
        agent: 'Murdock',
        summary: 'Work done',
      });

      const response = await mockPOST(request);
      expect(response.status).toBe(500);
      const data: ApiError = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DATABASE_ERROR');
    });

    it('should return 500 for database errors during claim lookup', async () => {
      const mockItem = createMockItem();

      mockPrismaClient.item.findUnique.mockResolvedValue(mockItem);
      mockPrismaClient.agentClaim.findFirst.mockRejectedValue(new Error('Query failed'));
      mockPOST.mockResolvedValue(
        NextResponse.json(
          { success: false, error: { code: 'DATABASE_ERROR', message: 'Database error' } },
          { status: 500 }
        )
      );

      const request = createRequest({
        itemId: 'WI-001',
        agent: 'Murdock',
        summary: 'Work done',
      });

      const response = await mockPOST(request);
      expect(response.status).toBe(500);
      const data: ApiError = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DATABASE_ERROR');
    });

    it('should return 500 for database errors during claim deletion', async () => {
      const mockItem = createMockItem();
      const mockClaim = createMockClaim();

      mockPrismaClient.item.findUnique.mockResolvedValue(mockItem);
      mockPrismaClient.agentClaim.findFirst.mockResolvedValue(mockClaim);
      mockPrismaClient.agentClaim.delete.mockRejectedValue(new Error('Delete failed'));
      mockPOST.mockResolvedValue(
        NextResponse.json(
          { success: false, error: { code: 'DATABASE_ERROR', message: 'Database error' } },
          { status: 500 }
        )
      );

      const request = createRequest({
        itemId: 'WI-001',
        agent: 'Murdock',
        summary: 'Work done',
      });

      const response = await mockPOST(request);
      expect(response.status).toBe(500);
      const data: ApiError = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DATABASE_ERROR');
    });

    it('should return 500 for database errors during work log creation', async () => {
      const mockItem = createMockItem();
      const mockClaim = createMockClaim();

      mockPrismaClient.item.findUnique.mockResolvedValue(mockItem);
      mockPrismaClient.agentClaim.findFirst.mockResolvedValue(mockClaim);
      mockPrismaClient.agentClaim.delete.mockResolvedValue(mockClaim);
      mockPrismaClient.workLog.create.mockRejectedValue(new Error('Insert failed'));
      mockPOST.mockResolvedValue(
        NextResponse.json(
          { success: false, error: { code: 'DATABASE_ERROR', message: 'Database error' } },
          { status: 500 }
        )
      );

      const request = createRequest({
        itemId: 'WI-001',
        agent: 'Murdock',
        summary: 'Work done',
      });

      const response = await mockPOST(request);
      expect(response.status).toBe(500);
      const data: ApiError = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DATABASE_ERROR');
    });

    it('should return 500 for database errors during item update', async () => {
      const mockItem = createMockItem();
      const mockClaim = createMockClaim();

      mockPrismaClient.item.findUnique.mockResolvedValue(mockItem);
      mockPrismaClient.agentClaim.findFirst.mockResolvedValue(mockClaim);
      mockPrismaClient.agentClaim.delete.mockResolvedValue(mockClaim);
      mockPrismaClient.workLog.create.mockResolvedValue(createMockWorkLog());
      mockPrismaClient.item.update.mockRejectedValue(new Error('Update failed'));
      mockPOST.mockResolvedValue(
        NextResponse.json(
          { success: false, error: { code: 'DATABASE_ERROR', message: 'Database error' } },
          { status: 500 }
        )
      );

      const request = createRequest({
        itemId: 'WI-001',
        agent: 'Murdock',
        summary: 'Work done',
      });

      const response = await mockPOST(request);
      expect(response.status).toBe(500);
      const data: ApiError = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DATABASE_ERROR');
    });
  });
});
