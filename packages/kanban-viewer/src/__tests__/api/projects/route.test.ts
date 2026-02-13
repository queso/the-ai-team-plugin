import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Tests for GET and POST /api/projects endpoints (WI-041)
 *
 * These endpoints manage projects which are the top-level container
 * for missions and work items.
 *
 * Acceptance criteria tested:
 * - [x] GET /api/projects returns array of all projects
 * - [x] POST /api/projects creates a new project
 * - [x] POST validates id format (alphanumeric, hyphens, underscores only)
 * - [x] POST validates id minimum length of 1
 * - [x] POST normalizes id to lowercase
 * - [x] Returns proper error response on validation failure
 * - [x] Returns proper error response on database failure
 * - [x] POST rejects duplicate project IDs (case-insensitive)
 */

// Mock data
const mockProjects = [
  {
    id: 'kanban-viewer',
    name: 'Kanban Viewer',
    createdAt: new Date('2026-01-20T10:00:00Z'),
    updatedAt: new Date('2026-01-20T10:00:00Z'),
  },
  {
    id: 'my-app',
    name: 'My Application',
    createdAt: new Date('2026-01-21T10:00:00Z'),
    updatedAt: new Date('2026-01-21T10:00:00Z'),
  },
];

// Create mock Prisma client
const mockPrisma = {
  project: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
  },
};

// Mock the db module
vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}));

describe('GET /api/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful requests', () => {
    it('should return array of all projects', async () => {
      mockPrisma.project.findMany.mockResolvedValue(mockProjects);

      const { GET } = await import('@/app/api/projects/route');
      const request = new NextRequest('http://localhost:3000/api/projects');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data).toHaveLength(2);
    });

    it('should return empty array when no projects exist', async () => {
      mockPrisma.project.findMany.mockResolvedValue([]);

      const { GET } = await import('@/app/api/projects/route');
      const request = new NextRequest('http://localhost:3000/api/projects');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });

    it('should return projects ordered by createdAt descending', async () => {
      mockPrisma.project.findMany.mockResolvedValue(mockProjects);

      const { GET } = await import('@/app/api/projects/route');
      const request = new NextRequest('http://localhost:3000/api/projects');
      await GET(request);

      expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: expect.objectContaining({ createdAt: 'desc' }),
        })
      );
    });

    it('should include project id, name, createdAt, and updatedAt in response', async () => {
      mockPrisma.project.findMany.mockResolvedValue([mockProjects[0]]);

      const { GET } = await import('@/app/api/projects/route');
      const request = new NextRequest('http://localhost:3000/api/projects');
      const response = await GET(request);
      const data = await response.json();

      expect(data.data[0]).toHaveProperty('id', 'kanban-viewer');
      expect(data.data[0]).toHaveProperty('name', 'Kanban Viewer');
      expect(data.data[0]).toHaveProperty('createdAt');
      expect(data.data[0]).toHaveProperty('updatedAt');
    });
  });

  describe('error handling', () => {
    it('should return 500 with ApiError on database failure', async () => {
      mockPrisma.project.findMany.mockRejectedValue(new Error('Database connection failed'));

      const { GET } = await import('@/app/api/projects/route');
      const request = new NextRequest('http://localhost:3000/api/projects');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('DATABASE_ERROR');
    });
  });
});

describe('POST /api/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful creation', () => {
    it('should create a new project with valid id and name', async () => {
      const newProject = {
        id: 'new-project',
        name: 'New Project',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.project.findUnique.mockResolvedValue(null);
      mockPrisma.project.create.mockResolvedValue(newProject);

      const { POST } = await import('@/app/api/projects/route');
      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'new-project', name: 'New Project' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('new-project');
      expect(data.data.name).toBe('New Project');
    });

    it('should normalize project id to lowercase', async () => {
      const newProject = {
        id: 'my-project',
        name: 'My Project',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.project.findUnique.mockResolvedValue(null);
      mockPrisma.project.create.mockResolvedValue(newProject);

      const { POST } = await import('@/app/api/projects/route');
      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'MY-PROJECT', name: 'My Project' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data.id).toBe('my-project');

      // Verify create was called with lowercase id
      expect(mockPrisma.project.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: 'my-project',
          }),
        })
      );
    });

    it('should accept id with alphanumeric characters', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);
      mockPrisma.project.create.mockResolvedValue({
        id: 'project123',
        name: 'Test',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { POST } = await import('@/app/api/projects/route');
      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'project123', name: 'Test' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it('should accept id with hyphens', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);
      mockPrisma.project.create.mockResolvedValue({
        id: 'my-test-project',
        name: 'Test',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { POST } = await import('@/app/api/projects/route');
      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'my-test-project', name: 'Test' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it('should accept id with underscores', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);
      mockPrisma.project.create.mockResolvedValue({
        id: 'my_test_project',
        name: 'Test',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { POST } = await import('@/app/api/projects/route');
      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'my_test_project', name: 'Test' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
    });
  });

  describe('id validation', () => {
    it('should reject id with minimum length less than 1 (empty string)', async () => {
      const { POST } = await import('@/app/api/projects/route');
      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: '', name: 'Test Project' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('id');
    });

    it('should reject id with spaces', async () => {
      const { POST } = await import('@/app/api/projects/route');
      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'my project', name: 'Test' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject id with special characters', async () => {
      const { POST } = await import('@/app/api/projects/route');
      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'my@project!', name: 'Test' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject missing id', async () => {
      const { POST } = await import('@/app/api/projects/route');
      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Project' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject missing name', async () => {
      const { POST } = await import('@/app/api/projects/route');
      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'test-project' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('duplicate detection (case-insensitive)', () => {
    it('should reject duplicate project id', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(mockProjects[0]);

      const { POST } = await import('@/app/api/projects/route');
      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'kanban-viewer', name: 'Duplicate' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('CONFLICT');
      expect(data.error.message).toContain('already exists');
    });

    it('should reject duplicate project id with different case', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(mockProjects[0]);

      const { POST } = await import('@/app/api/projects/route');
      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'KANBAN-VIEWER', name: 'Duplicate' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('CONFLICT');

      // Verify lookup used lowercase id
      expect(mockPrisma.project.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'kanban-viewer' },
        })
      );
    });
  });

  describe('error handling', () => {
    it('should return 400 for invalid JSON body', async () => {
      const { POST } = await import('@/app/api/projects/route');
      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json',
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should return 500 on database failure during create', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);
      mockPrisma.project.create.mockRejectedValue(new Error('Database error'));

      const { POST } = await import('@/app/api/projects/route');
      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'test', name: 'Test' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DATABASE_ERROR');
    });
  });

  describe('response format', () => {
    it('should return success: true with data on successful creation', async () => {
      const newProject = {
        id: 'test',
        name: 'Test',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.project.findUnique.mockResolvedValue(null);
      mockPrisma.project.create.mockResolvedValue(newProject);

      const { POST } = await import('@/app/api/projects/route');
      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'test', name: 'Test' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.id).toBe('test');
      expect(data.data.name).toBe('Test');
    });

    it('should return HTTP 201 status on successful creation', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);
      mockPrisma.project.create.mockResolvedValue({
        id: 'test',
        name: 'Test',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { POST } = await import('@/app/api/projects/route');
      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'test', name: 'Test' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
    });
  });
});
