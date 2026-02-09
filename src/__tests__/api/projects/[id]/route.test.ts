import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Tests for GET /api/projects/[id] endpoint (WI-042)
 *
 * This endpoint retrieves a single project by its ID.
 *
 * Acceptance criteria tested:
 * - [x] GET /api/projects/:id returns project by ID
 * - [x] Returns 404 if project doesn't exist
 * - [x] Returns error response on database failure
 * - [x] Returns project with id, name, createdAt, updatedAt fields
 *
 * NOTE: These tests will fail until the route handler is implemented
 * at src/app/api/projects/[id]/route.ts.
 */

// Mock data
const mockProject = {
  id: 'kanban-viewer',
  name: 'Kanban Viewer',
  createdAt: new Date('2026-01-20T10:00:00Z'),
  updatedAt: new Date('2026-01-20T10:00:00Z'),
};

// Create mock Prisma client
const mockPrisma = {
  project: {
    findUnique: vi.fn(),
  },
};

// Mock the db module
vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}));

interface RouteContext {
  params: Promise<{ id: string }>;
}

function createRequest(url: string): NextRequest {
  return new NextRequest(`http://localhost:3000${url}`);
}

describe('GET /api/projects/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful requests', () => {
    it('should return project by ID', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);

      const { GET } = await import('@/app/api/projects/[id]/route');
      const request = createRequest('/api/projects/kanban-viewer');
      const context: RouteContext = { params: Promise.resolve({ id: 'kanban-viewer' }) };
      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('kanban-viewer');
      expect(data.data.name).toBe('Kanban Viewer');
    });

    it('should include id, name, createdAt, and updatedAt in response', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);

      const { GET } = await import('@/app/api/projects/[id]/route');
      const request = createRequest('/api/projects/kanban-viewer');
      const context: RouteContext = { params: Promise.resolve({ id: 'kanban-viewer' }) };
      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toHaveProperty('id', 'kanban-viewer');
      expect(data.data).toHaveProperty('name', 'Kanban Viewer');
      expect(data.data).toHaveProperty('createdAt');
      expect(data.data).toHaveProperty('updatedAt');
    });

    it('should query database with correct project id', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);

      const { GET } = await import('@/app/api/projects/[id]/route');
      const request = createRequest('/api/projects/my-project');
      const context: RouteContext = { params: Promise.resolve({ id: 'my-project' }) };
      await GET(request, context);

      expect(mockPrisma.project.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'my-project' },
        })
      );
    });
  });

  describe('not found handling', () => {
    it('should return 404 if project does not exist', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      const { GET } = await import('@/app/api/projects/[id]/route');
      const request = createRequest('/api/projects/non-existent');
      const context: RouteContext = { params: Promise.resolve({ id: 'non-existent' }) };
      const response = await GET(request, context);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('PROJECT_NOT_FOUND');
    });

    it('should include project id in not found error message', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      const { GET } = await import('@/app/api/projects/[id]/route');
      const request = createRequest('/api/projects/missing-project');
      const context: RouteContext = { params: Promise.resolve({ id: 'missing-project' }) };
      const response = await GET(request, context);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error.message).toContain('missing-project');
    });
  });

  describe('error handling', () => {
    it('should return 500 with DATABASE_ERROR on database failure', async () => {
      mockPrisma.project.findUnique.mockRejectedValue(new Error('Database connection failed'));

      const { GET } = await import('@/app/api/projects/[id]/route');
      const request = createRequest('/api/projects/kanban-viewer');
      const context: RouteContext = { params: Promise.resolve({ id: 'kanban-viewer' }) };
      const response = await GET(request, context);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('DATABASE_ERROR');
    });
  });

  describe('response format', () => {
    it('should return success: true with data on successful request', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);

      const { GET } = await import('@/app/api/projects/[id]/route');
      const request = createRequest('/api/projects/kanban-viewer');
      const context: RouteContext = { params: Promise.resolve({ id: 'kanban-viewer' }) };
      const response = await GET(request, context);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.error).toBeUndefined();
    });

    it('should return success: false with error on failure', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      const { GET } = await import('@/app/api/projects/[id]/route');
      const request = createRequest('/api/projects/non-existent');
      const context: RouteContext = { params: Promise.resolve({ id: 'non-existent' }) };
      const response = await GET(request, context);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.data).toBeUndefined();
    });
  });
});
