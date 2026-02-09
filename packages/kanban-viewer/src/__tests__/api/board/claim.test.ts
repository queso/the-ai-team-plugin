import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Tests for POST /api/board/claim endpoint
 *
 * This endpoint allows an agent to claim a work item, enforcing:
 * - Item must exist
 * - Item must be in a claimable stage (ready or in_progress)
 * - Item must not already be claimed by another agent (ITEM_CLAIMED)
 *
 * Note: Agents CAN claim multiple items simultaneously. The only limit
 * is the WIP limit per stage column.
 *
 * Acceptance criteria tested:
 * - [x] POST /api/board/claim accepts ClaimItemRequest with itemId and agent
 * - [x] Validates item exists and is in ready or in_progress stage
 * - [x] Returns ITEM_CLAIMED if item already claimed by another agent
 * - [x] Creates AgentClaim record with claimedAt timestamp
 * - [x] Returns ClaimItemResponse with the new claim
 */

// Mock data
const mockItemReady = {
  id: 'WI-001',
  title: 'Feature A',
  description: 'Description A',
  type: 'feature',
  priority: 'high',
  stageId: 'ready',
  assignedAgent: null,
  rejectionCount: 0,
  createdAt: new Date('2026-01-21T10:00:00Z'),
  updatedAt: new Date('2026-01-21T10:00:00Z'),
  completedAt: null,
  archivedAt: null,
  projectId: 'test-project',
};

const mockItemInProgress = {
  id: 'WI-002',
  title: 'Feature B',
  description: 'Description B',
  type: 'feature',
  priority: 'medium',
  stageId: 'testing',
  assignedAgent: null,
  rejectionCount: 0,
  createdAt: new Date('2026-01-21T09:00:00Z'),
  updatedAt: new Date('2026-01-21T11:00:00Z'),
  completedAt: null,
  archivedAt: null,
  projectId: 'test-project',
};

const mockItemDone = {
  id: 'WI-003',
  title: 'Completed Feature',
  description: 'Done',
  type: 'feature',
  priority: 'low',
  stageId: 'done',
  assignedAgent: null,
  rejectionCount: 0,
  createdAt: new Date('2026-01-20T10:00:00Z'),
  updatedAt: new Date('2026-01-20T18:00:00Z'),
  completedAt: new Date('2026-01-20T18:00:00Z'),
  archivedAt: null,
  projectId: 'test-project',
};

const mockItemBacklog = {
  id: 'WI-004',
  title: 'Backlog Item',
  description: 'In backlog',
  type: 'feature',
  priority: 'low',
  stageId: 'briefings',
  assignedAgent: null,
  rejectionCount: 0,
  createdAt: new Date('2026-01-21T08:00:00Z'),
  updatedAt: new Date('2026-01-21T08:00:00Z'),
  completedAt: null,
  archivedAt: null,
  projectId: 'test-project',
};

const mockItemReview = {
  id: 'WI-005',
  title: 'Review Item',
  description: 'In review',
  type: 'feature',
  priority: 'high',
  stageId: 'review',
  assignedAgent: null,
  rejectionCount: 0,
  createdAt: new Date('2026-01-21T10:00:00Z'),
  updatedAt: new Date('2026-01-21T14:00:00Z'),
  completedAt: null,
  archivedAt: null,
  projectId: 'test-project',
};

const mockExistingClaim = {
  agentName: 'Murdock',
  itemId: 'WI-099',
  claimedAt: new Date('2026-01-21T11:00:00Z'),
};

// Create mock Prisma client
const mockPrisma = {
  item: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  agentClaim: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  $transaction: vi.fn(),
};

// Mock the db module
vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}));

describe('POST /api/board/claim', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    // Setup default $transaction mock that executes the callback with a mock tx
    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => Promise<unknown>) => {
      return callback(mockPrisma);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful claims', () => {
    it('should accept ClaimItemRequest with itemId and agent', async () => {
      // Setup: Item exists in ready stage, no existing claims
      mockPrisma.item.findFirst.mockResolvedValue(mockItemReady);
      mockPrisma.agentClaim.findFirst.mockResolvedValue(null);
      mockPrisma.agentClaim.create.mockResolvedValue({
        agentName: 'Hannibal',
        itemId: 'WI-001',
        claimedAt: new Date('2026-01-21T12:00:00Z'),
      });
      mockPrisma.item.update.mockResolvedValue({
        ...mockItemReady,
        assignedAgent: 'Hannibal',
      });

      const { POST } = await import('@/app/api/board/claim/route');
      const request = new NextRequest('http://localhost:3000/api/board/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-ID': 'test-project'
        },
        body: JSON.stringify({
          itemId: 'WI-001',
          agent: 'Hannibal',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('agentName');
      expect(data.data).toHaveProperty('itemId');
      expect(data.data).toHaveProperty('claimedAt');
    });

    it('should create AgentClaim record with claimedAt timestamp', async () => {
      mockPrisma.item.findFirst.mockResolvedValue(mockItemReady);
      mockPrisma.agentClaim.findFirst.mockResolvedValue(null);
      const claimTimestamp = new Date('2026-01-21T12:00:00Z');
      mockPrisma.agentClaim.create.mockResolvedValue({
        agentName: 'B.A.',
        itemId: 'WI-001',
        claimedAt: claimTimestamp,
      });
      mockPrisma.item.update.mockResolvedValue({
        ...mockItemReady,
        assignedAgent: 'B.A.',
      });

      const { POST } = await import('@/app/api/board/claim/route');
      const request = new NextRequest('http://localhost:3000/api/board/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-ID': 'test-project'
        },
        body: JSON.stringify({
          itemId: 'WI-001',
          agent: 'B.A.',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Verify the response contains the claim data
      expect(data.success).toBe(true);
      expect(data.data.agentName).toBe('B.A.');
      expect(data.data.itemId).toBe('WI-001');
      expect(data.data.claimedAt).toBeDefined();
    });

    it('should return ClaimItemResponse with the new claim', async () => {
      mockPrisma.item.findFirst.mockResolvedValue(mockItemReady);
      mockPrisma.agentClaim.findFirst.mockResolvedValue(null);
      mockPrisma.agentClaim.create.mockResolvedValue({
        agentName: 'Lynch',
        itemId: 'WI-001',
        claimedAt: new Date('2026-01-21T12:00:00Z'),
      });
      mockPrisma.item.update.mockResolvedValue({
        ...mockItemReady,
        assignedAgent: 'Lynch',
      });

      const { POST } = await import('@/app/api/board/claim/route');
      const request = new NextRequest('http://localhost:3000/api/board/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-ID': 'test-project'
        },
        body: JSON.stringify({
          itemId: 'WI-001',
          agent: 'Lynch',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.agentName).toBe('Lynch');
      expect(data.data.itemId).toBe('WI-001');
      expect(data.data.claimedAt).toBeDefined();
    });

    it('should allow claiming items in ready stage', async () => {
      mockPrisma.item.findFirst.mockResolvedValue(mockItemReady);
      mockPrisma.agentClaim.findFirst.mockResolvedValue(null);
      mockPrisma.agentClaim.create.mockResolvedValue({
        agentName: 'Face',
        itemId: 'WI-001',
        claimedAt: new Date('2026-01-21T12:00:00Z'),
      });
      mockPrisma.item.update.mockResolvedValue({
        ...mockItemReady,
        assignedAgent: 'Face',
      });

      const { POST } = await import('@/app/api/board/claim/route');
      const request = new NextRequest('http://localhost:3000/api/board/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-ID': 'test-project'
        },
        body: JSON.stringify({
          itemId: 'WI-001',
          agent: 'Face',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should allow claiming items in in_progress stage', async () => {
      mockPrisma.item.findFirst.mockResolvedValue(mockItemInProgress);
      mockPrisma.agentClaim.findFirst.mockResolvedValue(null);
      mockPrisma.agentClaim.create.mockResolvedValue({
        agentName: 'Amy',
        itemId: 'WI-002',
        claimedAt: new Date('2026-01-21T12:00:00Z'),
      });
      mockPrisma.item.update.mockResolvedValue({
        ...mockItemInProgress,
        assignedAgent: 'Amy',
      });

      const { POST } = await import('@/app/api/board/claim/route');
      const request = new NextRequest('http://localhost:3000/api/board/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-ID': 'test-project'
        },
        body: JSON.stringify({
          itemId: 'WI-002',
          agent: 'Amy',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should allow claiming items in review stage (for Lynch)', async () => {
      mockPrisma.item.findFirst.mockResolvedValue(mockItemReview);
      mockPrisma.agentClaim.findFirst.mockResolvedValue(null);
      mockPrisma.agentClaim.create.mockResolvedValue({
        agentName: 'Lynch',
        itemId: 'WI-005',
        claimedAt: new Date('2026-01-21T15:00:00Z'),
      });
      mockPrisma.item.update.mockResolvedValue({
        ...mockItemReview,
        assignedAgent: 'Lynch',
      });

      const { POST } = await import('@/app/api/board/claim/route');
      const request = new NextRequest('http://localhost:3000/api/board/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-ID': 'test-project'
        },
        body: JSON.stringify({
          itemId: 'WI-005',
          agent: 'Lynch',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.agentName).toBe('Lynch');
      expect(data.data.itemId).toBe('WI-005');
    });
  });

  describe('item validation', () => {
    it('should return ITEM_NOT_FOUND if item does not exist', async () => {
      mockPrisma.item.findFirst.mockResolvedValue(null);

      const { POST } = await import('@/app/api/board/claim/route');
      const request = new NextRequest('http://localhost:3000/api/board/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-ID': 'test-project'
        },
        body: JSON.stringify({
          itemId: 'WI-999',
          agent: 'Hannibal',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('ITEM_NOT_FOUND');
    });

    it('should return INVALID_STAGE if item is in done stage', async () => {
      mockPrisma.item.findFirst.mockResolvedValue(mockItemDone);

      const { POST } = await import('@/app/api/board/claim/route');
      const request = new NextRequest('http://localhost:3000/api/board/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-ID': 'test-project'
        },
        body: JSON.stringify({
          itemId: 'WI-003',
          agent: 'Hannibal',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_STAGE');
    });

    it('should return INVALID_STAGE if item is in backlog stage', async () => {
      mockPrisma.item.findFirst.mockResolvedValue(mockItemBacklog);

      const { POST } = await import('@/app/api/board/claim/route');
      const request = new NextRequest('http://localhost:3000/api/board/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-ID': 'test-project'
        },
        body: JSON.stringify({
          itemId: 'WI-004',
          agent: 'Hannibal',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_STAGE');
    });
  });

  describe('item claimed constraint', () => {
    it('should return ITEM_CLAIMED if item already claimed by another agent', async () => {
      mockPrisma.item.findFirst.mockResolvedValue(mockItemReady);
      // Item is already claimed by another agent
      mockPrisma.agentClaim.findFirst.mockResolvedValue({
        agentName: 'BA',
        itemId: 'WI-001',
        claimedAt: new Date('2026-01-21T11:00:00Z'),
      });

      const { POST } = await import('@/app/api/board/claim/route');
      const request = new NextRequest('http://localhost:3000/api/board/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-ID': 'test-project'
        },
        body: JSON.stringify({
          itemId: 'WI-001',
          agent: 'Hannibal',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(409);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('ITEM_CLAIMED');
    });

    it('should include claiming agent in ITEM_CLAIMED error details', async () => {
      mockPrisma.item.findFirst.mockResolvedValue(mockItemReady);
      // Item is already claimed by Face
      mockPrisma.agentClaim.findFirst.mockResolvedValue({
        agentName: 'Face',
        itemId: 'WI-001',
        claimedAt: new Date('2026-01-21T11:00:00Z'),
      });

      const { POST } = await import('@/app/api/board/claim/route');
      const request = new NextRequest('http://localhost:3000/api/board/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-ID': 'test-project'
        },
        body: JSON.stringify({
          itemId: 'WI-001',
          agent: 'Murdock',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.error.details).toBeDefined();
      expect(data.error.details.claimedBy).toBe('Face');
    });
  });

  describe('request validation', () => {
    it('should return 400 for missing itemId', async () => {
      const { POST } = await import('@/app/api/board/claim/route');
      const request = new NextRequest('http://localhost:3000/api/board/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-ID': 'test-project'
        },
        body: JSON.stringify({
          agent: 'Hannibal',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing agent', async () => {
      const { POST } = await import('@/app/api/board/claim/route');
      const request = new NextRequest('http://localhost:3000/api/board/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-ID': 'test-project'
        },
        body: JSON.stringify({
          itemId: 'WI-001',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid agent name', async () => {
      const { POST } = await import('@/app/api/board/claim/route');
      const request = new NextRequest('http://localhost:3000/api/board/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-ID': 'test-project'
        },
        body: JSON.stringify({
          itemId: 'WI-001',
          agent: 'InvalidAgent',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid JSON body', async () => {
      const { POST } = await import('@/app/api/board/claim/route');
      const request = new NextRequest('http://localhost:3000/api/board/claim?projectId=test-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should return 500 on database error during item lookup', async () => {
      mockPrisma.item.findFirst.mockRejectedValue(new Error('Database connection failed'));

      const { POST } = await import('@/app/api/board/claim/route');
      const request = new NextRequest('http://localhost:3000/api/board/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-ID': 'test-project'
        },
        body: JSON.stringify({
          itemId: 'WI-001',
          agent: 'Hannibal',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DATABASE_ERROR');
    });

    it('should return 500 on database error during claim creation', async () => {
      mockPrisma.item.findFirst.mockResolvedValue(mockItemReady);
      mockPrisma.agentClaim.findFirst.mockResolvedValue(null);
      mockPrisma.agentClaim.create.mockRejectedValue(new Error('Constraint violation'));

      const { POST } = await import('@/app/api/board/claim/route');
      const request = new NextRequest('http://localhost:3000/api/board/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-ID': 'test-project'
        },
        body: JSON.stringify({
          itemId: 'WI-001',
          agent: 'Hannibal',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DATABASE_ERROR');
    });
  });
});
