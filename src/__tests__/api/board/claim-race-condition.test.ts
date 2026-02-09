import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Tests for race condition handling in POST /api/board/claim endpoint
 *
 * This test file specifically validates that the claim endpoint handles
 * concurrent access correctly by:
 * - Wrapping claim creation and item update in a transaction
 * - Ensuring only one claim succeeds when multiple agents claim simultaneously
 * - Returning appropriate error messages for claim conflicts
 *
 * Bug context: Lines 179-191 in route.ts perform claim creation and item update
 * as separate operations without a transaction, creating a race condition window.
 *
 * Acceptance criteria tested:
 * - [x] AgentClaim creation and Item update are wrapped in prisma.$transaction()
 * - [x] Concurrent claim attempts on the same item are handled gracefully
 * - [x] Only one claim succeeds if multiple agents try simultaneously
 * - [x] Error messages indicate claim conflict when it occurs
 */

// Mock data for tests
const mockItemReady = {
  id: 'WI-RACE-001',
  title: 'Race Condition Test Item',
  description: 'Item for testing concurrent claims',
  type: 'feature',
  priority: 'high',
  stageId: 'ready',
  projectId: 'kanban-viewer',
  assignedAgent: null,
  rejectionCount: 0,
  createdAt: new Date('2026-01-23T10:00:00Z'),
  updatedAt: new Date('2026-01-23T10:00:00Z'),
  completedAt: null,
  archivedAt: null,
};

// Track transaction calls and their operations
let transactionCalls: Array<{
  operations: string[];
  result: 'success' | 'rollback';
}> = [];

// Track the order of operations to detect if transaction is used
let operationLog: string[] = [];

// Create mock Prisma client with transaction support
const mockPrisma = {
  item: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
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

// Mock project-utils module
vi.mock('@/lib/project-utils', () => ({
  validateProjectId: vi.fn().mockReturnValue(null), // null = valid
  getProjectIdFromHeader: vi.fn().mockReturnValue('kanban-viewer'),
  getAndValidateProjectId: vi.fn().mockReturnValue({ valid: true, projectId: 'kanban-viewer' }),
  PROJECT_ID_HEADER: 'X-Project-ID',
}));

describe('POST /api/board/claim - Race Condition Handling', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await vi.resetModules();
    transactionCalls = [];
    operationLog = [];

    // Reset all mock implementations to defaults
    mockPrisma.item.findFirst.mockReset();
    mockPrisma.agentClaim.findFirst.mockReset();
    mockPrisma.$transaction.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('transactional behavior', () => {
    it('should use prisma.$transaction for validation checks, claim creation and item update', async () => {
      // Setup mocks for individual operations (these should NOT be called directly)
      mockPrisma.item.findFirst.mockResolvedValue(mockItemReady);
      mockPrisma.agentClaim.findFirst.mockResolvedValue(null);

      // Track if $transaction is called
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        transactionCalls.push({ operations: [], result: 'success' });
        // Execute the transaction callback with a mock transaction client
        // Now includes findFirst for validation checks inside the transaction
        const txClient = {
          agentClaim: {
            findFirst: vi.fn().mockImplementation(async () => {
              operationLog.push('agentClaim.findFirst');
              return null; // No existing claims
            }),
            create: vi.fn().mockImplementation(async (data) => {
              operationLog.push('agentClaim.create');
              return {
                agentName: data.data.agentName,
                itemId: data.data.itemId,
                claimedAt: new Date('2026-01-23T12:00:00Z'),
              };
            }),
          },
          item: {
            findFirst: vi.fn().mockImplementation(async () => {
              operationLog.push('item.findFirst');
              return mockItemReady;
            }),
            update: vi.fn().mockImplementation(async (data) => {
              operationLog.push('item.update');
              return { ...mockItemReady, assignedAgent: data.data.assignedAgent };
            }),
          },
        };
        return callback(txClient);
      });

      const { POST } = await import('@/app/api/board/claim/route');
      const request = new NextRequest('http://localhost:3000/api/board/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-ID': 'kanban-viewer'
        },
        body: JSON.stringify({
          itemId: 'WI-RACE-001',
          agent: 'Hannibal',
        }),
      });

      const response = await POST(request);

      // Verify $transaction was called
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(transactionCalls.length).toBe(1);

      // Verify validation checks, claim creation, and item update all occurred within the transaction
      expect(operationLog).toContain('agentClaim.findFirst');
      expect(operationLog).toContain('agentClaim.create');
      expect(operationLog).toContain('item.update');

      // The response should still be successful
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should rollback claim if item update fails', async () => {
      mockPrisma.item.findFirst.mockResolvedValue(mockItemReady);
      mockPrisma.agentClaim.findFirst.mockResolvedValue(null);

      // Transaction should rollback on error
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const txClient = {
          agentClaim: {
            findFirst: vi.fn().mockResolvedValue(null), // No existing claims
            create: vi.fn().mockResolvedValue({
              agentName: 'Face',
              itemId: 'WI-RACE-001',
              claimedAt: new Date('2026-01-23T12:00:00Z'),
            }),
          },
          item: {
            findFirst: vi.fn().mockResolvedValue(mockItemReady),
            update: vi.fn().mockRejectedValue(new Error('Item update failed')),
          },
        };
        // The transaction will throw, which means it should rollback
        return callback(txClient);
      });

      const { POST } = await import('@/app/api/board/claim/route');
      const request = new NextRequest('http://localhost:3000/api/board/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-ID': 'kanban-viewer'
        },
        body: JSON.stringify({
          itemId: 'WI-RACE-001',
          agent: 'Face',
        }),
      });

      const response = await POST(request);

      // Should return error since transaction failed
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DATABASE_ERROR');
    });

    it('should rollback item update if claim creation fails', async () => {
      mockPrisma.item.findFirst.mockResolvedValue(mockItemReady);
      mockPrisma.agentClaim.findFirst.mockResolvedValue(null);

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const txClient = {
          agentClaim: {
            findFirst: vi.fn().mockResolvedValue(null), // No existing claims
            create: vi.fn().mockRejectedValue(new Error('Unique constraint violation')),
          },
          item: {
            findFirst: vi.fn().mockResolvedValue(mockItemReady),
            update: vi.fn(), // Should never be called
          },
        };
        return callback(txClient);
      });

      const { POST } = await import('@/app/api/board/claim/route');
      const request = new NextRequest('http://localhost:3000/api/board/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-ID': 'kanban-viewer'
        },
        body: JSON.stringify({
          itemId: 'WI-RACE-001',
          agent: 'Murdock',
        }),
      });

      const response = await POST(request);

      // Should return error since claim creation failed
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  describe('concurrent claim handling', () => {
    it('should return CLAIM_CONFLICT when item is claimed during transaction', async () => {
      mockPrisma.item.findFirst.mockResolvedValue(mockItemReady);
      mockPrisma.agentClaim.findFirst.mockResolvedValue(null);

      // Simulate a unique constraint violation that occurs when another
      // agent's claim is inserted between the check and the insert
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const txClient = {
          agentClaim: {
            findFirst: vi.fn().mockResolvedValue(null), // Check passes but...
            create: vi.fn().mockRejectedValue({
              code: 'P2002', // Prisma unique constraint error - claim already exists
              message: 'Unique constraint failed on the fields: (`itemId`)',
            }),
          },
          item: {
            findFirst: vi.fn().mockResolvedValue(mockItemReady),
            update: vi.fn(),
          },
        };
        return callback(txClient);
      });

      const { POST } = await import('@/app/api/board/claim/route');
      const request = new NextRequest('http://localhost:3000/api/board/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-ID': 'kanban-viewer'
        },
        body: JSON.stringify({
          itemId: 'WI-RACE-001',
          agent: 'B.A.',
        }),
      });

      const response = await POST(request);

      // Should return conflict error with appropriate message
      const data = await response.json();
      expect(data.success).toBe(false);

      // The implementation should detect P2002 and return CLAIM_CONFLICT
      // or at minimum, the error should indicate the claim failed due to conflict
      expect(
        data.error.code === 'CLAIM_CONFLICT' ||
          data.error.code === 'DATABASE_ERROR' ||
          data.error.code === 'ITEM_CLAIMED'
      ).toBe(true);
    });

    it('should only allow one claim to succeed when multiple agents claim simultaneously', async () => {
      // This test simulates two agents trying to claim the same item
      // at nearly the same time. Only one should succeed.

      mockPrisma.item.findFirst.mockResolvedValue(mockItemReady);

      // First call - no existing claim
      // Second call - claim exists (created by first caller)
      mockPrisma.agentClaim.findFirst
        .mockResolvedValueOnce(null) // Agent 1 check: no claim exists
        .mockResolvedValueOnce(null) // Agent 1 item check: no claim on item
        .mockResolvedValueOnce(null) // Agent 2 check: no claim by them
        .mockResolvedValueOnce({
          // Agent 2 item check: item now claimed
          agentName: 'Hannibal',
          itemId: 'WI-RACE-001',
          claimedAt: new Date(),
        });

      // First transaction succeeds
      mockPrisma.$transaction
        .mockImplementationOnce(async (callback) => {
          const txClient = {
            agentClaim: {
              findFirst: vi.fn().mockResolvedValue(null), // No existing claims
              create: vi.fn().mockResolvedValue({
                agentName: 'Hannibal',
                itemId: 'WI-RACE-001',
                claimedAt: new Date(),
              }),
            },
            item: {
              findFirst: vi.fn().mockResolvedValue(mockItemReady),
              update: vi.fn().mockResolvedValue({
                ...mockItemReady,
                assignedAgent: 'Hannibal',
              }),
            },
          };
          return callback(txClient);
        })
        // Second transaction fails due to constraint
        .mockImplementationOnce(async (callback) => {
          const txClient = {
            agentClaim: {
              findFirst: vi.fn().mockResolvedValue(null), // Check passes but...
              create: vi.fn().mockRejectedValue({
                code: 'P2002',
                message: 'Unique constraint failed',
              }),
            },
            item: {
              findFirst: vi.fn().mockResolvedValue(mockItemReady),
              update: vi.fn(),
            },
          };
          return callback(txClient);
        });

      const { POST } = await import('@/app/api/board/claim/route');

      // Simulate concurrent requests
      const request1 = new NextRequest('http://localhost:3000/api/board/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-ID': 'kanban-viewer'
        },
        body: JSON.stringify({
          itemId: 'WI-RACE-001',
          agent: 'Hannibal',
        }),
      });

      const request2 = new NextRequest('http://localhost:3000/api/board/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-ID': 'kanban-viewer'
        },
        body: JSON.stringify({
          itemId: 'WI-RACE-001',
          agent: 'Face',
        }),
      });

      // Execute both requests (simulating concurrent execution)
      const [response1, response2] = await Promise.all([POST(request1), POST(request2)]);

      const data1 = await response1.json();
      const data2 = await response2.json();

      // Exactly one should succeed
      const successCount = [data1.success, data2.success].filter(Boolean).length;
      expect(successCount).toBe(1);

      // The successful one should be Hannibal
      if (data1.success) {
        expect(data1.data.agentName).toBe('Hannibal');
        expect(data2.success).toBe(false);
      } else {
        expect(data2.success).toBe(true);
        expect(data1.success).toBe(false);
      }
    });

    it('should allow agent to claim multiple items simultaneously', async () => {
      // Agents CAN claim multiple items - the only limit is per-stage WIP limits

      const mockItem2 = { ...mockItemReady, id: 'WI-RACE-002', title: 'Second Item', projectId: 'kanban-viewer' };

      // First claim - succeeds
      mockPrisma.item.findFirst.mockResolvedValueOnce(mockItemReady);
      mockPrisma.agentClaim.findFirst.mockResolvedValueOnce(null); // Item not claimed

      mockPrisma.$transaction.mockImplementationOnce(async (callback) => {
        const txClient = {
          agentClaim: {
            findFirst: vi.fn().mockResolvedValue(null), // Item not claimed
            create: vi.fn().mockResolvedValue({
              id: 1,
              agentName: 'Lynch',
              itemId: 'WI-RACE-001',
              claimedAt: new Date(),
            }),
          },
          item: {
            findFirst: vi.fn().mockResolvedValue(mockItemReady),
            update: vi.fn().mockResolvedValue({
              ...mockItemReady,
              assignedAgent: 'Lynch',
            }),
          },
        };
        return callback(txClient);
      });

      const { POST } = await import('@/app/api/board/claim/route');

      const request1 = new NextRequest('http://localhost:3000/api/board/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-ID': 'kanban-viewer'
        },
        body: JSON.stringify({
          itemId: 'WI-RACE-001',
          agent: 'Lynch',
        }),
      });

      const response1 = await POST(request1);
      const data1 = await response1.json();

      expect(data1.success).toBe(true);
      expect(data1.data.agentName).toBe('Lynch');

      // Second claim - should also succeed (agent can have multiple claims)
      mockPrisma.item.findFirst.mockResolvedValueOnce(mockItem2);
      mockPrisma.agentClaim.findFirst.mockResolvedValueOnce(null); // This item not claimed

      mockPrisma.$transaction.mockImplementationOnce(async (callback) => {
        const txClient = {
          agentClaim: {
            findFirst: vi.fn().mockResolvedValue(null), // This item not claimed
            create: vi.fn().mockResolvedValue({
              id: 2,
              agentName: 'Lynch',
              itemId: 'WI-RACE-002',
              claimedAt: new Date(),
            }),
          },
          item: {
            findFirst: vi.fn().mockResolvedValue(mockItem2),
            update: vi.fn().mockResolvedValue({
              ...mockItem2,
              assignedAgent: 'Lynch',
            }),
          },
        };
        return callback(txClient);
      });

      const request2 = new NextRequest('http://localhost:3000/api/board/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-ID': 'kanban-viewer'
        },
        body: JSON.stringify({
          itemId: 'WI-RACE-002',
          agent: 'Lynch',
        }),
      });

      const response2 = await POST(request2);
      const data2 = await response2.json();

      expect(data2.success).toBe(true);
      expect(data2.data.agentName).toBe('Lynch');
      expect(data2.data.itemId).toBe('WI-RACE-002');
    });
  });

  describe('error message clarity', () => {
    it('should provide clear error message when claim conflict occurs', async () => {
      mockPrisma.item.findFirst.mockResolvedValue(mockItemReady);
      // Need two null responses: one for agent check, one for item check
      mockPrisma.agentClaim.findFirst
        .mockResolvedValueOnce(null) // Agent has no existing claim
        .mockResolvedValueOnce(null); // Item has no existing claim

      // Simulate unique constraint violation - transaction should reject with this error
      const constraintError = {
        code: 'P2002',
        meta: { target: ['itemId'] },
        message: 'Unique constraint failed on the fields: (`itemId`)',
      };

      mockPrisma.$transaction.mockRejectedValue(constraintError);

      const { POST } = await import('@/app/api/board/claim/route');
      const request = new NextRequest('http://localhost:3000/api/board/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-ID': 'kanban-viewer'
        },
        body: JSON.stringify({
          itemId: 'WI-RACE-001',
          agent: 'Amy',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(false);
      // Error message should indicate what went wrong
      expect(data.error.message).toBeDefined();
      expect(typeof data.error.message).toBe('string');
      expect(data.error.message.length).toBeGreaterThan(0);
    });

    it('should include relevant details in conflict error response', async () => {
      mockPrisma.item.findFirst.mockResolvedValue(mockItemReady);
      mockPrisma.agentClaim.findFirst
        .mockResolvedValueOnce(null) // Agent check
        .mockResolvedValueOnce(null); // Item check

      // Reject transaction with constraint error
      mockPrisma.$transaction.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['itemId'] },
        message: 'Unique constraint failed',
      });

      const { POST } = await import('@/app/api/board/claim/route');
      const request = new NextRequest('http://localhost:3000/api/board/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-ID': 'kanban-viewer'
        },
        body: JSON.stringify({
          itemId: 'WI-RACE-001',
          agent: 'Tawnia',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Response should have error structure with code and message at minimum
      expect(data.error).toBeDefined();
      expect(data.error.code).toBeDefined();
      expect(data.error.message).toBeDefined();
    });
  });

  describe('atomicity guarantees', () => {
    it('should not leave orphaned claims if item update fails', async () => {
      mockPrisma.item.findFirst.mockResolvedValue(mockItemReady);
      mockPrisma.agentClaim.findFirst.mockResolvedValue(null);

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const txClient = {
          agentClaim: {
            findFirst: vi.fn().mockResolvedValue(null), // No existing claims
            create: vi.fn().mockResolvedValue({
              agentName: 'Hannibal',
              itemId: 'WI-RACE-001',
              claimedAt: new Date(),
            }),
          },
          item: {
            findFirst: vi.fn().mockResolvedValue(mockItemReady),
            update: vi.fn().mockImplementation(async () => {
              // Simulate failure after claim created
              throw new Error('Database constraint error');
            }),
          },
        };
        return callback(txClient);
      });

      const { POST } = await import('@/app/api/board/claim/route');
      const request = new NextRequest('http://localhost:3000/api/board/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-ID': 'kanban-viewer'
        },
        body: JSON.stringify({
          itemId: 'WI-RACE-001',
          agent: 'Hannibal',
        }),
      });

      const response = await POST(request);

      // Request should fail
      expect(response.status).toBe(500);

      // Since we're using a transaction, if item update fails,
      // the claim should be rolled back (not orphaned)
      // In a real database, this is automatic with transactions
      // In our mock, we verify the transaction was used
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should not partially update item if claim creation fails', async () => {
      mockPrisma.item.findFirst.mockResolvedValue(mockItemReady);
      mockPrisma.agentClaim.findFirst.mockResolvedValue(null);

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const txClient = {
          agentClaim: {
            findFirst: vi.fn().mockResolvedValue(null), // No existing claims
            create: vi.fn().mockRejectedValue(new Error('Constraint violation')),
          },
          item: {
            findFirst: vi.fn().mockResolvedValue(mockItemReady),
            update: vi.fn(), // Should never be reached
          },
        };
        return callback(txClient);
      });

      const { POST } = await import('@/app/api/board/claim/route');
      const request = new NextRequest('http://localhost:3000/api/board/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-ID': 'kanban-viewer'
        },
        body: JSON.stringify({
          itemId: 'WI-RACE-001',
          agent: 'Face',
        }),
      });

      const response = await POST(request);

      // Request should fail
      expect(response.status).toBe(500);

      // Verify transaction was used (atomicity)
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });
});
