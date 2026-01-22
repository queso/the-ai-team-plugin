import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

// Mock the HTTP client
const mockClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../../client/index.js', () => ({
  createClient: vi.fn(() => mockClient),
}));

// Types for board state and responses
interface BoardItem {
  id: string;
  title: string;
  status: string;
  type: string;
  dependencies?: string[];
  parallel_group?: string;
  assigned_agent?: string;
}

interface BoardState {
  mission: string;
  phases: string[];
  items: BoardItem[];
  wip_limit: number;
}

interface MoveResult {
  success: boolean;
  itemId: string;
  from: string;
  to: string;
}

interface ClaimResult {
  success: boolean;
  itemId: string;
  agent: string;
}

interface ReleaseResult {
  success: boolean;
  itemId: string;
}

// Simulated tool implementations for testing
// These simulate what the actual tools will do

// Zod schemas for input validation
const BoardReadInputSchema = z.object({});

const BoardMoveInputSchema = z.object({
  itemId: z.string().min(1, 'itemId is required'),
  to: z.string().min(1, 'target stage is required'),
});

const BoardClaimInputSchema = z.object({
  itemId: z.string().min(1, 'itemId is required'),
  agent: z.string().min(1, 'agent name is required'),
});

const BoardReleaseInputSchema = z.object({
  itemId: z.string().min(1, 'itemId is required'),
});

// Tool response structure
interface ToolResponse<T = unknown> {
  content: Array<{ type: 'text'; text: string }>;
  data?: T;
}

interface ToolErrorResponse {
  isError: true;
  code: string;
  message: string;
}

// Simulated tool handlers - these test the expected behavior
async function boardRead(): Promise<ToolResponse<BoardState>> {
  const result = await mockClient.get<BoardState>('/api/board');
  return {
    content: [{ type: 'text', text: JSON.stringify(result.data) }],
    data: result.data,
  };
}

async function boardMove(input: { itemId: string; to: string }): Promise<ToolResponse<MoveResult> | ToolErrorResponse> {
  const parsed = BoardMoveInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      isError: true,
      code: 'VALIDATION_ERROR',
      message: parsed.error.errors[0].message,
    };
  }

  const result = await mockClient.post<MoveResult>('/api/board/move', {
    itemId: input.itemId,
    to: input.to,
  });
  return {
    content: [{ type: 'text', text: JSON.stringify(result.data) }],
    data: result.data,
  };
}

async function boardClaim(input: { itemId: string; agent: string }): Promise<ToolResponse<ClaimResult> | ToolErrorResponse> {
  const parsed = BoardClaimInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      isError: true,
      code: 'VALIDATION_ERROR',
      message: parsed.error.errors[0].message,
    };
  }

  const result = await mockClient.post<ClaimResult>('/api/board/claim', {
    itemId: input.itemId,
    agent: input.agent,
  });
  return {
    content: [{ type: 'text', text: JSON.stringify(result.data) }],
    data: result.data,
  };
}

async function boardRelease(input: { itemId: string }): Promise<ToolResponse<ReleaseResult> | ToolErrorResponse> {
  const parsed = BoardReleaseInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      isError: true,
      code: 'VALIDATION_ERROR',
      message: parsed.error.errors[0].message,
    };
  }

  const result = await mockClient.post<ReleaseResult>('/api/board/release', {
    itemId: input.itemId,
  });
  return {
    content: [{ type: 'text', text: JSON.stringify(result.data) }],
    data: result.data,
  };
}

describe('Board Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('board_read', () => {
    it('should return full board state as structured JSON', async () => {
      const mockBoardState: BoardState = {
        mission: 'test-mission',
        phases: ['ready', 'testing', 'implementing', 'review', 'done'],
        items: [
          { id: '001', title: 'Feature A', status: 'testing', type: 'feature' },
          { id: '002', title: 'Feature B', status: 'ready', type: 'feature' },
        ],
        wip_limit: 3,
      };

      mockClient.get.mockResolvedValueOnce({ data: mockBoardState, status: 200 });

      const result = await boardRead();

      expect(mockClient.get).toHaveBeenCalledWith('/api/board');
      expect(result.content[0].type).toBe('text');
      expect(result.data).toEqual(mockBoardState);
      expect(result.data?.mission).toBe('test-mission');
      expect(result.data?.items).toHaveLength(2);
    });

    it('should include items with their assigned agents', async () => {
      const mockBoardState: BoardState = {
        mission: 'test-mission',
        phases: ['testing'],
        items: [
          { id: '001', title: 'Feature A', status: 'testing', type: 'feature', assigned_agent: 'Murdock' },
        ],
        wip_limit: 3,
      };

      mockClient.get.mockResolvedValueOnce({ data: mockBoardState, status: 200 });

      const result = await boardRead();

      expect(result.data?.items[0].assigned_agent).toBe('Murdock');
    });

    it('should handle empty board state', async () => {
      const emptyBoardState: BoardState = {
        mission: 'empty-mission',
        phases: ['ready', 'done'],
        items: [],
        wip_limit: 3,
      };

      mockClient.get.mockResolvedValueOnce({ data: emptyBoardState, status: 200 });

      const result = await boardRead();

      expect(result.data?.items).toHaveLength(0);
    });
  });

  describe('board_move', () => {
    it('should move item to target stage successfully', async () => {
      const moveResult: MoveResult = {
        success: true,
        itemId: '001',
        from: 'testing',
        to: 'implementing',
      };

      mockClient.post.mockResolvedValueOnce({ data: moveResult, status: 200 });

      const result = await boardMove({ itemId: '001', to: 'implementing' });

      expect(mockClient.post).toHaveBeenCalledWith('/api/board/move', {
        itemId: '001',
        to: 'implementing',
      });
      expect('data' in result && result.data?.success).toBe(true);
    });

    it('should reject invalid stage transitions', async () => {
      const errorResponse = {
        status: 400,
        message: 'Invalid transition: cannot move from testing to done',
      };

      mockClient.post.mockRejectedValueOnce(errorResponse);

      await expect(boardMove({ itemId: '001', to: 'done' })).rejects.toEqual(errorResponse);
    });

    it('should enforce WIP limits', async () => {
      const errorResponse = {
        status: 400,
        message: 'WIP limit exceeded for stage: implementing (limit: 3)',
      };

      mockClient.post.mockRejectedValueOnce(errorResponse);

      await expect(boardMove({ itemId: '004', to: 'implementing' })).rejects.toEqual(errorResponse);
    });

    it('should reject move with missing itemId', async () => {
      const result = await boardMove({ itemId: '', to: 'implementing' });

      expect('isError' in result && result.isError).toBe(true);
      expect('code' in result && result.code).toBe('VALIDATION_ERROR');
    });

    it('should reject move with missing target stage', async () => {
      const result = await boardMove({ itemId: '001', to: '' });

      expect('isError' in result && result.isError).toBe(true);
      expect('code' in result && result.code).toBe('VALIDATION_ERROR');
    });

    it('should handle non-existent item', async () => {
      const errorResponse = {
        status: 404,
        message: 'Item not found: 999',
      };

      mockClient.post.mockRejectedValueOnce(errorResponse);

      await expect(boardMove({ itemId: '999', to: 'implementing' })).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('board_claim', () => {
    it('should assign agent to item successfully', async () => {
      const claimResult: ClaimResult = {
        success: true,
        itemId: '001',
        agent: 'Murdock',
      };

      mockClient.post.mockResolvedValueOnce({ data: claimResult, status: 200 });

      const result = await boardClaim({ itemId: '001', agent: 'Murdock' });

      expect(mockClient.post).toHaveBeenCalledWith('/api/board/claim', {
        itemId: '001',
        agent: 'Murdock',
      });
      expect('data' in result && result.data?.success).toBe(true);
      expect('data' in result && result.data?.agent).toBe('Murdock');
    });

    it('should detect and reject when item is already claimed', async () => {
      const errorResponse = {
        status: 409,
        message: 'Item 001 is already claimed by B.A.',
      };

      mockClient.post.mockRejectedValueOnce(errorResponse);

      await expect(boardClaim({ itemId: '001', agent: 'Murdock' })).rejects.toMatchObject({
        status: 409,
        message: expect.stringContaining('already claimed'),
      });
    });

    it('should reject claim with missing itemId', async () => {
      const result = await boardClaim({ itemId: '', agent: 'Murdock' });

      expect('isError' in result && result.isError).toBe(true);
      expect('code' in result && result.code).toBe('VALIDATION_ERROR');
    });

    it('should reject claim with missing agent name', async () => {
      const result = await boardClaim({ itemId: '001', agent: '' });

      expect('isError' in result && result.isError).toBe(true);
      expect('code' in result && result.code).toBe('VALIDATION_ERROR');
    });

    it('should handle non-existent item', async () => {
      const errorResponse = {
        status: 404,
        message: 'Item not found: 999',
      };

      mockClient.post.mockRejectedValueOnce(errorResponse);

      await expect(boardClaim({ itemId: '999', agent: 'Murdock' })).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('board_release', () => {
    it('should remove agent assignment from item successfully', async () => {
      const releaseResult: ReleaseResult = {
        success: true,
        itemId: '001',
      };

      mockClient.post.mockResolvedValueOnce({ data: releaseResult, status: 200 });

      const result = await boardRelease({ itemId: '001' });

      expect(mockClient.post).toHaveBeenCalledWith('/api/board/release', {
        itemId: '001',
      });
      expect('data' in result && result.data?.success).toBe(true);
    });

    it('should reject release with missing itemId', async () => {
      const result = await boardRelease({ itemId: '' });

      expect('isError' in result && result.isError).toBe(true);
      expect('code' in result && result.code).toBe('VALIDATION_ERROR');
    });

    it('should handle release of unclaimed item gracefully', async () => {
      // Releasing an unclaimed item should be idempotent
      const releaseResult: ReleaseResult = {
        success: true,
        itemId: '001',
      };

      mockClient.post.mockResolvedValueOnce({ data: releaseResult, status: 200 });

      const result = await boardRelease({ itemId: '001' });

      expect('data' in result && result.data?.success).toBe(true);
    });

    it('should handle non-existent item', async () => {
      const errorResponse = {
        status: 404,
        message: 'Item not found: 999',
      };

      mockClient.post.mockRejectedValueOnce(errorResponse);

      await expect(boardRelease({ itemId: '999' })).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('Zod Schema Validation', () => {
    describe('BoardMoveInputSchema', () => {
      it('should accept valid move input', () => {
        const result = BoardMoveInputSchema.safeParse({ itemId: '001', to: 'implementing' });
        expect(result.success).toBe(true);
      });

      it('should reject missing itemId', () => {
        const result = BoardMoveInputSchema.safeParse({ to: 'implementing' });
        expect(result.success).toBe(false);
      });

      it('should reject missing target stage', () => {
        const result = BoardMoveInputSchema.safeParse({ itemId: '001' });
        expect(result.success).toBe(false);
      });

      it('should reject empty itemId', () => {
        const result = BoardMoveInputSchema.safeParse({ itemId: '', to: 'implementing' });
        expect(result.success).toBe(false);
      });
    });

    describe('BoardClaimInputSchema', () => {
      it('should accept valid claim input', () => {
        const result = BoardClaimInputSchema.safeParse({ itemId: '001', agent: 'Murdock' });
        expect(result.success).toBe(true);
      });

      it('should reject missing agent', () => {
        const result = BoardClaimInputSchema.safeParse({ itemId: '001' });
        expect(result.success).toBe(false);
      });

      it('should reject empty agent name', () => {
        const result = BoardClaimInputSchema.safeParse({ itemId: '001', agent: '' });
        expect(result.success).toBe(false);
      });
    });

    describe('BoardReleaseInputSchema', () => {
      it('should accept valid release input', () => {
        const result = BoardReleaseInputSchema.safeParse({ itemId: '001' });
        expect(result.success).toBe(true);
      });

      it('should reject missing itemId', () => {
        const result = BoardReleaseInputSchema.safeParse({});
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Response Structure Consistency', () => {
    it('board_read should return content array with text type', async () => {
      mockClient.get.mockResolvedValueOnce({
        data: { mission: 'test', phases: [], items: [], wip_limit: 3 },
        status: 200,
      });

      const result = await boardRead();

      expect(result.content).toBeInstanceOf(Array);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
    });

    it('board_move should return content array with text type on success', async () => {
      mockClient.post.mockResolvedValueOnce({
        data: { success: true, itemId: '001', from: 'testing', to: 'implementing' },
        status: 200,
      });

      const result = await boardMove({ itemId: '001', to: 'implementing' });

      expect('content' in result && result.content).toBeInstanceOf(Array);
      expect('content' in result && result.content[0]).toHaveProperty('type', 'text');
    });

    it('validation errors should have consistent structure', async () => {
      const result = await boardMove({ itemId: '', to: '' });

      expect('isError' in result).toBe(true);
      expect('code' in result).toBe(true);
      expect('message' in result).toBe(true);
    });
  });
});
