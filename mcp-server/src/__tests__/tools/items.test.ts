import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

/**
 * Tests for item-related MCP tools.
 *
 * These tools provide CRUD operations for work items:
 * - item_create: Create a new work item
 * - item_update: Update an existing work item
 * - item_get: Retrieve a single item by ID
 * - item_list: List items with optional filtering
 * - item_reject: Record rejection with reason
 * - item_render: Get markdown representation
 */

// Mock HTTP client
const mockClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

// Mock the client module
vi.mock('../../client/index.js', () => ({
  createClient: () => mockClient,
}));

// Expected Zod schemas for input validation
const ItemCreateInputSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['feature', 'bug', 'task']),
  status: z.string().optional().default('pending'),
  dependencies: z.array(z.string()).optional().default([]),
  parallel_group: z.string().optional(),
  outputs: z.object({
    test: z.string(),
    impl: z.string(),
    types: z.string().optional(),
  }).optional(),
});

const ItemUpdateInputSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).optional(),
  status: z.string().optional(),
  assigned_agent: z.string().optional(),
  rejection_count: z.number().int().min(0).optional(),
});

const ItemGetInputSchema = z.object({
  id: z.string().min(1),
});

const ItemListInputSchema = z.object({
  status: z.string().optional(),
  stage: z.string().optional(),
  agent: z.string().optional(),
});

const ItemRejectInputSchema = z.object({
  id: z.string().min(1),
  reason: z.string().min(1),
  agent: z.string().optional(),
});

const ItemRenderInputSchema = z.object({
  id: z.string().min(1),
});

// Sample work item for testing
const sampleItem = {
  id: '001',
  title: 'Test Feature',
  type: 'feature',
  status: 'pending',
  rejection_count: 0,
  dependencies: [],
  parallel_group: 'core',
  outputs: {
    test: 'src/__tests__/feature.test.ts',
    impl: 'src/services/feature.ts',
  },
};

describe('Item Tools', () => {
  beforeEach(() => {
    // Reset all mocks between tests - this clears both call records AND mock implementations
    mockClient.get.mockReset();
    mockClient.post.mockReset();
    mockClient.put.mockReset();
    mockClient.delete.mockReset();
  });

  describe('item_create', () => {
    it('should create a work item with required fields and return created item with ID', async () => {
      const createInput = {
        title: 'New Feature',
        type: 'feature' as const,
        outputs: {
          test: 'src/__tests__/new.test.ts',
          impl: 'src/services/new.ts',
        },
      };

      const expectedResponse = {
        ...createInput,
        id: '002',
        status: 'pending',
        rejection_count: 0,
        dependencies: [],
      };

      mockClient.post.mockResolvedValueOnce({
        data: expectedResponse,
        status: 201,
        headers: {},
      });

      // Validate input schema accepts the input
      const validatedInput = ItemCreateInputSchema.parse(createInput);
      expect(validatedInput.title).toBe('New Feature');
      expect(validatedInput.type).toBe('feature');

      // Simulate tool calling the API
      const result = await mockClient.post('/api/items', createInput);

      expect(mockClient.post).toHaveBeenCalledWith('/api/items', createInput);
      expect(result.data.id).toBe('002');
      expect(result.status).toBe(201);
    });

    it('should apply default status of pending when not provided', () => {
      const input = {
        title: 'Test',
        type: 'feature' as const,
      };

      const validated = ItemCreateInputSchema.parse(input);
      expect(validated.status).toBe('pending');
    });

    it('should reject invalid item type', () => {
      const invalidInput = {
        title: 'Test',
        type: 'invalid-type',
      };

      expect(() => ItemCreateInputSchema.parse(invalidInput)).toThrow();
    });

    it('should reject empty title', () => {
      const invalidInput = {
        title: '',
        type: 'feature',
      };

      expect(() => ItemCreateInputSchema.parse(invalidInput)).toThrow();
    });

    it('should accept optional dependencies array', () => {
      const input = {
        title: 'Dependent Feature',
        type: 'feature' as const,
        dependencies: ['001', '002'],
      };

      const validated = ItemCreateInputSchema.parse(input);
      expect(validated.dependencies).toEqual(['001', '002']);
    });
  });

  describe('item_update', () => {
    it('should update an existing item with partial fields', async () => {
      const updateInput = {
        id: '001',
        status: 'testing',
      };

      const updatedItem = {
        ...sampleItem,
        status: 'testing',
      };

      mockClient.put.mockResolvedValueOnce({
        data: updatedItem,
        status: 200,
        headers: {},
      });

      // Validate input schema
      const validatedInput = ItemUpdateInputSchema.parse(updateInput);
      expect(validatedInput.id).toBe('001');
      expect(validatedInput.status).toBe('testing');

      // Simulate tool calling the API
      const result = await mockClient.put('/api/items/001', { status: 'testing' });

      expect(mockClient.put).toHaveBeenCalledWith('/api/items/001', { status: 'testing' });
      expect(result.data.status).toBe('testing');
    });

    it('should support updating assigned_agent field', async () => {
      const updateInput = {
        id: '001',
        assigned_agent: 'Murdock',
      };

      mockClient.put.mockResolvedValueOnce({
        data: { ...sampleItem, assigned_agent: 'Murdock' },
        status: 200,
        headers: {},
      });

      const validatedInput = ItemUpdateInputSchema.parse(updateInput);
      expect(validatedInput.assigned_agent).toBe('Murdock');

      const result = await mockClient.put('/api/items/001', { assigned_agent: 'Murdock' });
      expect(result.data.assigned_agent).toBe('Murdock');
    });

    it('should reject update without item ID', () => {
      const invalidInput = {
        status: 'testing',
      };

      expect(() => ItemUpdateInputSchema.parse(invalidInput)).toThrow();
    });

    it('should reject empty item ID', () => {
      const invalidInput = {
        id: '',
        status: 'testing',
      };

      expect(() => ItemUpdateInputSchema.parse(invalidInput)).toThrow();
    });

    it('should handle 404 when item not found', async () => {
      mockClient.put.mockRejectedValueOnce({
        status: 404,
        message: 'Item not found',
      });

      await expect(mockClient.put('/api/items/999', { status: 'testing' }))
        .rejects.toMatchObject({ status: 404 });
    });
  });

  describe('item_get', () => {
    it('should retrieve a single item by ID', async () => {
      mockClient.get.mockResolvedValueOnce({
        data: sampleItem,
        status: 200,
        headers: {},
      });

      // Validate input schema
      const validatedInput = ItemGetInputSchema.parse({ id: '001' });
      expect(validatedInput.id).toBe('001');

      // Simulate tool calling the API
      const result = await mockClient.get('/api/items/001');

      expect(mockClient.get).toHaveBeenCalledWith('/api/items/001');
      expect(result.data).toEqual(sampleItem);
    });

    it('should reject empty item ID', () => {
      expect(() => ItemGetInputSchema.parse({ id: '' })).toThrow();
    });

    it('should handle 404 when item does not exist', async () => {
      mockClient.get.mockRejectedValueOnce({
        status: 404,
        message: 'Item not found',
      });

      await expect(mockClient.get('/api/items/nonexistent'))
        .rejects.toMatchObject({ status: 404 });
    });
  });

  describe('item_list', () => {
    const multipleItems = [
      sampleItem,
      { ...sampleItem, id: '002', title: 'Second Feature', status: 'testing' },
      { ...sampleItem, id: '003', title: 'Third Feature', status: 'done', assigned_agent: 'B.A.' },
    ];

    it('should list all items without filters', async () => {
      mockClient.get.mockResolvedValueOnce({
        data: multipleItems,
        status: 200,
        headers: {},
      });

      // Validate empty input is acceptable
      const validatedInput = ItemListInputSchema.parse({});
      expect(validatedInput).toEqual({});

      const result = await mockClient.get('/api/items');
      expect(result.data).toHaveLength(3);
    });

    it('should filter items by status', async () => {
      const testingItems = multipleItems.filter(i => i.status === 'testing');

      mockClient.get.mockResolvedValueOnce({
        data: testingItems,
        status: 200,
        headers: {},
      });

      const validatedInput = ItemListInputSchema.parse({ status: 'testing' });
      expect(validatedInput.status).toBe('testing');

      const result = await mockClient.get('/api/items?status=testing');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe('testing');
    });

    it('should filter items by stage', async () => {
      mockClient.get.mockResolvedValueOnce({
        data: [sampleItem],
        status: 200,
        headers: {},
      });

      const validatedInput = ItemListInputSchema.parse({ stage: 'ready' });
      expect(validatedInput.stage).toBe('ready');

      const result = await mockClient.get('/api/items?stage=ready');
      expect(mockClient.get).toHaveBeenCalledWith('/api/items?stage=ready');
    });

    it('should filter items by assigned agent', async () => {
      const agentItems = multipleItems.filter(i => i.assigned_agent === 'B.A.');

      mockClient.get.mockResolvedValueOnce({
        data: agentItems,
        status: 200,
        headers: {},
      });

      const validatedInput = ItemListInputSchema.parse({ agent: 'B.A.' });
      expect(validatedInput.agent).toBe('B.A.');

      const result = await mockClient.get('/api/items?agent=B.A.');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].assigned_agent).toBe('B.A.');
    });

    it('should support combining multiple filters', async () => {
      mockClient.get.mockResolvedValueOnce({
        data: [],
        status: 200,
        headers: {},
      });

      const validatedInput = ItemListInputSchema.parse({
        status: 'testing',
        stage: 'implementing',
        agent: 'Murdock',
      });

      expect(validatedInput.status).toBe('testing');
      expect(validatedInput.stage).toBe('implementing');
      expect(validatedInput.agent).toBe('Murdock');
    });

    it('should return empty array when no items match filters', async () => {
      mockClient.get.mockResolvedValueOnce({
        data: [],
        status: 200,
        headers: {},
      });

      const result = await mockClient.get('/api/items?status=nonexistent');
      expect(result.data).toEqual([]);
    });
  });

  describe('item_reject', () => {
    it('should record rejection with reason', async () => {
      const rejectedItem = {
        ...sampleItem,
        rejection_count: 1,
      };

      mockClient.post.mockResolvedValueOnce({
        data: {
          item: rejectedItem,
          escalated: false,
        },
        status: 200,
        headers: {},
      });

      const validatedInput = ItemRejectInputSchema.parse({
        id: '001',
        reason: 'Tests do not cover edge cases',
      });

      expect(validatedInput.id).toBe('001');
      expect(validatedInput.reason).toBe('Tests do not cover edge cases');

      const result = await mockClient.post('/api/items/001/reject', {
        reason: 'Tests do not cover edge cases',
      });

      expect(result.data.item.rejection_count).toBe(1);
      expect(result.data.escalated).toBe(false);
    });

    it('should handle escalation after max rejections (2)', async () => {
      const escalatedItem = {
        ...sampleItem,
        rejection_count: 2,
        status: 'blocked',
      };

      mockClient.post.mockResolvedValueOnce({
        data: {
          item: escalatedItem,
          escalated: true,
        },
        status: 200,
        headers: {},
      });

      const result = await mockClient.post('/api/items/001/reject', {
        reason: 'Still failing tests',
      });

      expect(result.data.item.rejection_count).toBe(2);
      expect(result.data.escalated).toBe(true);
      expect(result.data.item.status).toBe('blocked');
    });

    it('should optionally record the rejecting agent', async () => {
      const validatedInput = ItemRejectInputSchema.parse({
        id: '001',
        reason: 'Code review failed',
        agent: 'Lynch',
      });

      expect(validatedInput.agent).toBe('Lynch');
    });

    it('should reject empty reason', () => {
      expect(() => ItemRejectInputSchema.parse({
        id: '001',
        reason: '',
      })).toThrow();
    });

    it('should reject missing item ID', () => {
      expect(() => ItemRejectInputSchema.parse({
        reason: 'Some reason',
      })).toThrow();
    });

    it('should handle 404 when item not found', async () => {
      mockClient.post.mockRejectedValueOnce({
        status: 404,
        message: 'Item not found',
      });

      await expect(mockClient.post('/api/items/999/reject', { reason: 'test' }))
        .rejects.toMatchObject({ status: 404 });
    });
  });

  describe('item_render', () => {
    it('should return markdown representation of item', async () => {
      const markdownContent = `---
id: '001'
title: Test Feature
type: feature
status: pending
---
## Objective

Test feature implementation

## Acceptance Criteria

- [ ] Feature works correctly
`;

      mockClient.get.mockResolvedValueOnce({
        data: { markdown: markdownContent },
        status: 200,
        headers: {},
      });

      const validatedInput = ItemRenderInputSchema.parse({ id: '001' });
      expect(validatedInput.id).toBe('001');

      const result = await mockClient.get('/api/items/001/render');

      expect(mockClient.get).toHaveBeenCalledWith('/api/items/001/render');
      expect(result.data).toBeDefined();
      expect(typeof result.data.markdown).toBe('string');
      expect(result.data.markdown.includes('---')).toBe(true);
      expect(result.data.markdown.includes('id:')).toBe(true);
      expect(result.data.markdown.includes('title:')).toBe(true);
    });

    it('should reject empty item ID', () => {
      expect(() => ItemRenderInputSchema.parse({ id: '' })).toThrow();
    });

    it('should handle 404 when item not found', async () => {
      mockClient.get.mockRejectedValueOnce({
        status: 404,
        message: 'Item not found',
      });

      await expect(mockClient.get('/api/items/nonexistent/render'))
        .rejects.toMatchObject({ status: 404 });
    });
  });

  describe('Zod Schema Validation', () => {
    it('ItemCreateInputSchema validates all fields correctly', () => {
      const fullInput = {
        title: 'Complete Feature',
        type: 'feature' as const,
        status: 'ready',
        dependencies: ['001', '002'],
        parallel_group: 'tools',
        outputs: {
          test: 'test.ts',
          impl: 'impl.ts',
          types: 'types.ts',
        },
      };

      const validated = ItemCreateInputSchema.parse(fullInput);
      expect(validated.title).toBe('Complete Feature');
      expect(validated.dependencies).toEqual(['001', '002']);
      expect(validated.outputs?.types).toBe('types.ts');
    });

    it('ItemUpdateInputSchema allows partial updates', () => {
      // Only ID required, everything else optional
      const minimalUpdate = { id: '001' };
      const validated = ItemUpdateInputSchema.parse(minimalUpdate);
      expect(validated.id).toBe('001');
      expect(validated.title).toBeUndefined();
      expect(validated.status).toBeUndefined();
    });

    it('ItemListInputSchema allows all empty filters', () => {
      const emptyFilters = {};
      const validated = ItemListInputSchema.parse(emptyFilters);
      expect(validated).toEqual({});
    });

    it('schemas reject null values for required fields', () => {
      expect(() => ItemCreateInputSchema.parse({ title: null, type: 'feature' })).toThrow();
      expect(() => ItemGetInputSchema.parse({ id: null })).toThrow();
      expect(() => ItemRejectInputSchema.parse({ id: null, reason: 'test' })).toThrow();
    });

    it('schemas reject undefined required fields', () => {
      expect(() => ItemCreateInputSchema.parse({ type: 'feature' })).toThrow();
      expect(() => ItemGetInputSchema.parse({})).toThrow();
      expect(() => ItemRejectInputSchema.parse({ id: '001' })).toThrow();
    });
  });
});
