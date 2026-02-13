import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Tests for PATCH /api/stages/[id] endpoint (WI-020)
 *
 * This endpoint updates the WIP limit for a stage.
 *
 * Acceptance criteria tested:
 * - [x] Endpoint accepts PATCH requests with wipLimit in body
 * - [x] Positive integers are accepted and saved
 * - [x] Null value sets wipLimit to unlimited
 * - [x] Zero value sets wipLimit to unlimited (null)
 * - [x] Negative numbers return 400 error
 * - [x] Non-integer numbers return 400 error
 * - [x] Non-existent stage IDs return 404 error
 * - [x] Database errors return 500 error
 * - [x] Returns updated stage object on success
 *
 * NOTE: These tests will fail until the route handler is implemented
 * at src/app/api/stages/[id]/route.ts.
 */

// Mock data for stages
const mockStage = {
  id: 'ready',
  name: 'Ready',
  order: 1,
  wipLimit: 3,
};

const mockStageUnlimited = {
  id: 'done',
  name: 'Done',
  order: 6,
  wipLimit: null,
};

// Create mock Prisma client
const mockPrisma = {
  stage: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

// Mock the db module
vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}));

interface RouteContext {
  params: Promise<{ id: string }>;
}

function createPatchRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost:3000${url}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/stages/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful updates', () => {
    it('should update wipLimit with a positive integer', async () => {
      mockPrisma.stage.findUnique.mockResolvedValue(mockStage);
      mockPrisma.stage.update.mockResolvedValue({
        ...mockStage,
        wipLimit: 5,
      });

      const { PATCH } = await import('@/app/api/stages/[id]/route');
      const request = createPatchRequest('/api/stages/ready', { wipLimit: 5 });
      const context: RouteContext = { params: Promise.resolve({ id: 'ready' }) };
      const response = await PATCH(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.wipLimit).toBe(5);
    });

    it('should return updated stage with all fields', async () => {
      const updatedStage = { ...mockStage, wipLimit: 10 };
      mockPrisma.stage.findUnique.mockResolvedValue(mockStage);
      mockPrisma.stage.update.mockResolvedValue(updatedStage);

      const { PATCH } = await import('@/app/api/stages/[id]/route');
      const request = createPatchRequest('/api/stages/ready', { wipLimit: 10 });
      const context: RouteContext = { params: Promise.resolve({ id: 'ready' }) };
      const response = await PATCH(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toHaveProperty('id', 'ready');
      expect(data.data).toHaveProperty('name', 'Ready');
      expect(data.data).toHaveProperty('order', 1);
      expect(data.data).toHaveProperty('wipLimit', 10);
    });

    it('should set wipLimit to null when null is provided (unlimited)', async () => {
      mockPrisma.stage.findUnique.mockResolvedValue(mockStage);
      mockPrisma.stage.update.mockResolvedValue({
        ...mockStage,
        wipLimit: null,
      });

      const { PATCH } = await import('@/app/api/stages/[id]/route');
      const request = createPatchRequest('/api/stages/ready', { wipLimit: null });
      const context: RouteContext = { params: Promise.resolve({ id: 'ready' }) };
      const response = await PATCH(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.wipLimit).toBeNull();
    });

    it('should set wipLimit to null when zero is provided (unlimited)', async () => {
      mockPrisma.stage.findUnique.mockResolvedValue(mockStage);
      mockPrisma.stage.update.mockResolvedValue({
        ...mockStage,
        wipLimit: null,
      });

      const { PATCH } = await import('@/app/api/stages/[id]/route');
      const request = createPatchRequest('/api/stages/ready', { wipLimit: 0 });
      const context: RouteContext = { params: Promise.resolve({ id: 'ready' }) };
      const response = await PATCH(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.wipLimit).toBeNull();
    });

    it('should accept wipLimit of 1 (minimum positive integer)', async () => {
      mockPrisma.stage.findUnique.mockResolvedValue(mockStage);
      mockPrisma.stage.update.mockResolvedValue({
        ...mockStage,
        wipLimit: 1,
      });

      const { PATCH } = await import('@/app/api/stages/[id]/route');
      const request = createPatchRequest('/api/stages/ready', { wipLimit: 1 });
      const context: RouteContext = { params: Promise.resolve({ id: 'ready' }) };
      const response = await PATCH(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.wipLimit).toBe(1);
    });

    it('should accept large positive integers', async () => {
      mockPrisma.stage.findUnique.mockResolvedValue(mockStage);
      mockPrisma.stage.update.mockResolvedValue({
        ...mockStage,
        wipLimit: 100,
      });

      const { PATCH } = await import('@/app/api/stages/[id]/route');
      const request = createPatchRequest('/api/stages/ready', { wipLimit: 100 });
      const context: RouteContext = { params: Promise.resolve({ id: 'ready' }) };
      const response = await PATCH(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.wipLimit).toBe(100);
    });

    it('should call prisma update with correct parameters', async () => {
      mockPrisma.stage.findUnique.mockResolvedValue(mockStage);
      mockPrisma.stage.update.mockResolvedValue({
        ...mockStage,
        wipLimit: 7,
      });

      const { PATCH } = await import('@/app/api/stages/[id]/route');
      const request = createPatchRequest('/api/stages/ready', { wipLimit: 7 });
      const context: RouteContext = { params: Promise.resolve({ id: 'ready' }) };
      await PATCH(request, context);

      expect(mockPrisma.stage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ready' },
          data: { wipLimit: 7 },
        })
      );
    });
  });

  describe('validation errors', () => {
    it('should return 400 for negative wipLimit', async () => {
      mockPrisma.stage.findUnique.mockResolvedValue(mockStage);

      const { PATCH } = await import('@/app/api/stages/[id]/route');
      const request = createPatchRequest('/api/stages/ready', { wipLimit: -1 });
      const context: RouteContext = { params: Promise.resolve({ id: 'ready' }) };
      const response = await PATCH(request, context);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for non-integer wipLimit (float)', async () => {
      mockPrisma.stage.findUnique.mockResolvedValue(mockStage);

      const { PATCH } = await import('@/app/api/stages/[id]/route');
      const request = createPatchRequest('/api/stages/ready', { wipLimit: 3.5 });
      const context: RouteContext = { params: Promise.resolve({ id: 'ready' }) };
      const response = await PATCH(request, context);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for string wipLimit', async () => {
      mockPrisma.stage.findUnique.mockResolvedValue(mockStage);

      const { PATCH } = await import('@/app/api/stages/[id]/route');
      const request = createPatchRequest('/api/stages/ready', { wipLimit: 'five' });
      const context: RouteContext = { params: Promise.resolve({ id: 'ready' }) };
      const response = await PATCH(request, context);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for boolean wipLimit', async () => {
      mockPrisma.stage.findUnique.mockResolvedValue(mockStage);

      const { PATCH } = await import('@/app/api/stages/[id]/route');
      const request = createPatchRequest('/api/stages/ready', { wipLimit: true });
      const context: RouteContext = { params: Promise.resolve({ id: 'ready' }) };
      const response = await PATCH(request, context);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for object wipLimit', async () => {
      mockPrisma.stage.findUnique.mockResolvedValue(mockStage);

      const { PATCH } = await import('@/app/api/stages/[id]/route');
      const request = createPatchRequest('/api/stages/ready', { wipLimit: { value: 5 } });
      const context: RouteContext = { params: Promise.resolve({ id: 'ready' }) };
      const response = await PATCH(request, context);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing wipLimit in body', async () => {
      mockPrisma.stage.findUnique.mockResolvedValue(mockStage);

      const { PATCH } = await import('@/app/api/stages/[id]/route');
      const request = createPatchRequest('/api/stages/ready', {});
      const context: RouteContext = { params: Promise.resolve({ id: 'ready' }) };
      const response = await PATCH(request, context);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid JSON body', async () => {
      const { PATCH } = await import('@/app/api/stages/[id]/route');
      const request = new NextRequest('http://localhost:3000/api/stages/ready', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json',
      });
      const context: RouteContext = { params: Promise.resolve({ id: 'ready' }) };
      const response = await PATCH(request, context);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should include helpful error message for negative wipLimit', async () => {
      mockPrisma.stage.findUnique.mockResolvedValue(mockStage);

      const { PATCH } = await import('@/app/api/stages/[id]/route');
      const request = createPatchRequest('/api/stages/ready', { wipLimit: -5 });
      const context: RouteContext = { params: Promise.resolve({ id: 'ready' }) };
      const response = await PATCH(request, context);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.message).toMatch(/negative|positive|must be/i);
    });
  });

  describe('not found handling', () => {
    it('should return 404 for non-existent stage ID', async () => {
      mockPrisma.stage.findUnique.mockResolvedValue(null);

      const { PATCH } = await import('@/app/api/stages/[id]/route');
      const request = createPatchRequest('/api/stages/nonexistent', { wipLimit: 5 });
      const context: RouteContext = { params: Promise.resolve({ id: 'nonexistent' }) };
      const response = await PATCH(request, context);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('STAGE_NOT_FOUND');
    });

    it('should include stage ID in not found error message', async () => {
      mockPrisma.stage.findUnique.mockResolvedValue(null);

      const { PATCH } = await import('@/app/api/stages/[id]/route');
      const request = createPatchRequest('/api/stages/invalid-stage', { wipLimit: 5 });
      const context: RouteContext = { params: Promise.resolve({ id: 'invalid-stage' }) };
      const response = await PATCH(request, context);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error.message).toContain('invalid-stage');
    });

    it('should check for stage existence before updating', async () => {
      mockPrisma.stage.findUnique.mockResolvedValue(null);

      const { PATCH } = await import('@/app/api/stages/[id]/route');
      const request = createPatchRequest('/api/stages/nonexistent', { wipLimit: 5 });
      const context: RouteContext = { params: Promise.resolve({ id: 'nonexistent' }) };
      await PATCH(request, context);

      expect(mockPrisma.stage.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'nonexistent' },
        })
      );
      expect(mockPrisma.stage.update).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should return 500 with DATABASE_ERROR on database failure during lookup', async () => {
      mockPrisma.stage.findUnique.mockRejectedValue(new Error('Database connection failed'));

      const { PATCH } = await import('@/app/api/stages/[id]/route');
      const request = createPatchRequest('/api/stages/ready', { wipLimit: 5 });
      const context: RouteContext = { params: Promise.resolve({ id: 'ready' }) };
      const response = await PATCH(request, context);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DATABASE_ERROR');
    });

    it('should return 500 with DATABASE_ERROR on database failure during update', async () => {
      mockPrisma.stage.findUnique.mockResolvedValue(mockStage);
      mockPrisma.stage.update.mockRejectedValue(new Error('Update failed'));

      const { PATCH } = await import('@/app/api/stages/[id]/route');
      const request = createPatchRequest('/api/stages/ready', { wipLimit: 5 });
      const context: RouteContext = { params: Promise.resolve({ id: 'ready' }) };
      const response = await PATCH(request, context);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DATABASE_ERROR');
    });
  });

  describe('response format', () => {
    it('should return success: true with data on successful request', async () => {
      mockPrisma.stage.findUnique.mockResolvedValue(mockStage);
      mockPrisma.stage.update.mockResolvedValue({ ...mockStage, wipLimit: 5 });

      const { PATCH } = await import('@/app/api/stages/[id]/route');
      const request = createPatchRequest('/api/stages/ready', { wipLimit: 5 });
      const context: RouteContext = { params: Promise.resolve({ id: 'ready' }) };
      const response = await PATCH(request, context);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.error).toBeUndefined();
    });

    it('should return success: false with error on failure', async () => {
      mockPrisma.stage.findUnique.mockResolvedValue(null);

      const { PATCH } = await import('@/app/api/stages/[id]/route');
      const request = createPatchRequest('/api/stages/nonexistent', { wipLimit: 5 });
      const context: RouteContext = { params: Promise.resolve({ id: 'nonexistent' }) };
      const response = await PATCH(request, context);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.data).toBeUndefined();
    });

    it('should return correct content-type header', async () => {
      mockPrisma.stage.findUnique.mockResolvedValue(mockStage);
      mockPrisma.stage.update.mockResolvedValue({ ...mockStage, wipLimit: 5 });

      const { PATCH } = await import('@/app/api/stages/[id]/route');
      const request = createPatchRequest('/api/stages/ready', { wipLimit: 5 });
      const context: RouteContext = { params: Promise.resolve({ id: 'ready' }) };
      const response = await PATCH(request, context);

      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });

  describe('idempotency', () => {
    it('should allow setting the same wipLimit value that already exists', async () => {
      mockPrisma.stage.findUnique.mockResolvedValue(mockStage);
      mockPrisma.stage.update.mockResolvedValue(mockStage);

      const { PATCH } = await import('@/app/api/stages/[id]/route');
      const request = createPatchRequest('/api/stages/ready', { wipLimit: 3 }); // Same as mockStage.wipLimit
      const context: RouteContext = { params: Promise.resolve({ id: 'ready' }) };
      const response = await PATCH(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.wipLimit).toBe(3);
    });

    it('should handle updating from unlimited to limited', async () => {
      mockPrisma.stage.findUnique.mockResolvedValue(mockStageUnlimited);
      mockPrisma.stage.update.mockResolvedValue({
        ...mockStageUnlimited,
        wipLimit: 5,
      });

      const { PATCH } = await import('@/app/api/stages/[id]/route');
      const request = createPatchRequest('/api/stages/done', { wipLimit: 5 });
      const context: RouteContext = { params: Promise.resolve({ id: 'done' }) };
      const response = await PATCH(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.wipLimit).toBe(5);
    });

    it('should handle updating from limited to unlimited', async () => {
      mockPrisma.stage.findUnique.mockResolvedValue(mockStage);
      mockPrisma.stage.update.mockResolvedValue({
        ...mockStage,
        wipLimit: null,
      });

      const { PATCH } = await import('@/app/api/stages/[id]/route');
      const request = createPatchRequest('/api/stages/ready', { wipLimit: null });
      const context: RouteContext = { params: Promise.resolve({ id: 'ready' }) };
      const response = await PATCH(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.wipLimit).toBeNull();
    });
  });
});
