/**
 * Item-related MCP tools.
 *
 * Provides CRUD operations for work items:
 * - item_create: Create a new work item
 * - item_update: Update an existing work item
 * - item_get: Retrieve a single item by ID
 * - item_list: List items with optional filtering
 * - item_reject: Record rejection with reason
 * - item_render: Get markdown representation
 */
import { z } from 'zod';
import { createClient } from '../client/index.js';
import { withErrorBoundary } from '../lib/errors.js';
// Initialize HTTP client
const client = createClient({
    baseUrl: process.env.KANBAN_API_URL ?? 'http://localhost:3000',
    timeout: 30000,
    retries: 3,
});
// ============================================================================
// Zod Schemas for Input Validation
// ============================================================================
/**
 * Schema for item_create tool input.
 */
export const ItemCreateInputSchema = z.object({
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
/**
 * Schema for item_update tool input.
 */
export const ItemUpdateInputSchema = z.object({
    id: z.string().min(1),
    title: z.string().min(1).optional(),
    status: z.string().optional(),
    assigned_agent: z.string().optional(),
    rejection_count: z.number().int().min(0).optional(),
});
/**
 * Schema for item_get tool input.
 */
export const ItemGetInputSchema = z.object({
    id: z.string().min(1),
});
/**
 * Schema for item_list tool input.
 */
export const ItemListInputSchema = z.object({
    status: z.string().optional(),
    stage: z.string().optional(),
    agent: z.string().optional(),
});
/**
 * Schema for item_reject tool input.
 */
export const ItemRejectInputSchema = z.object({
    id: z.string().min(1),
    reason: z.string().min(1),
    agent: z.string().optional(),
});
/**
 * Schema for item_render tool input.
 */
export const ItemRenderInputSchema = z.object({
    id: z.string().min(1),
});
// ============================================================================
// Tool Handlers
// ============================================================================
/**
 * Creates a new work item.
 */
export async function itemCreate(input) {
    const handler = async (args) => {
        const result = await client.post('/api/items', args);
        return {
            content: [{ type: 'text', text: JSON.stringify(result.data) }],
            data: result.data,
        };
    };
    return withErrorBoundary(handler)(input);
}
/**
 * Updates an existing work item.
 */
export async function itemUpdate(input) {
    const handler = async (args) => {
        const { id, ...updateData } = args;
        const result = await client.put(`/api/items/${id}`, updateData);
        return {
            content: [{ type: 'text', text: JSON.stringify(result.data) }],
            data: result.data,
        };
    };
    return withErrorBoundary(handler)(input);
}
/**
 * Retrieves a single work item by ID.
 */
export async function itemGet(input) {
    const handler = async (args) => {
        const result = await client.get(`/api/items/${args.id}`);
        return {
            content: [{ type: 'text', text: JSON.stringify(result.data) }],
            data: result.data,
        };
    };
    return withErrorBoundary(handler)(input);
}
/**
 * Lists work items with optional filtering.
 */
export async function itemList(input) {
    const handler = async (args) => {
        const queryParams = new URLSearchParams();
        if (args.status)
            queryParams.append('status', args.status);
        if (args.stage)
            queryParams.append('stage', args.stage);
        if (args.agent)
            queryParams.append('agent', args.agent);
        const queryString = queryParams.toString();
        const path = queryString ? `/api/items?${queryString}` : '/api/items';
        const result = await client.get(path);
        return {
            content: [{ type: 'text', text: JSON.stringify(result.data) }],
            data: result.data,
        };
    };
    return withErrorBoundary(handler)(input);
}
/**
 * Records a rejection with reason.
 */
export async function itemReject(input) {
    const handler = async (args) => {
        const { id, ...rejectData } = args;
        const result = await client.post(`/api/items/${id}/reject`, rejectData);
        return {
            content: [{ type: 'text', text: JSON.stringify(result.data) }],
            data: result.data,
        };
    };
    return withErrorBoundary(handler)(input);
}
/**
 * Returns markdown representation of an item.
 */
export async function itemRender(input) {
    const handler = async (args) => {
        const result = await client.get(`/api/items/${args.id}/render`);
        return {
            content: [{ type: 'text', text: JSON.stringify(result.data) }],
            data: result.data,
        };
    };
    return withErrorBoundary(handler)(input);
}
// ============================================================================
// Tool Definitions for MCP Server Registration
// ============================================================================
/**
 * Converts a Zod schema to JSON Schema format for MCP tool registration.
 */
function zodToJsonSchema(schema) {
    // Get the shape if it's an object schema
    if (schema instanceof z.ZodObject) {
        const shape = schema.shape;
        const properties = {};
        const required = [];
        for (const [key, value] of Object.entries(shape)) {
            const zodValue = value;
            properties[key] = getPropertySchema(zodValue);
            // Check if the field is required (not optional and no default)
            if (!isOptional(zodValue)) {
                required.push(key);
            }
        }
        return {
            type: 'object',
            properties,
            required: required.length > 0 ? required : undefined,
        };
    }
    return { type: 'object', properties: {} };
}
/**
 * Checks if a Zod schema is optional.
 */
function isOptional(schema) {
    if (schema instanceof z.ZodOptional)
        return true;
    if (schema instanceof z.ZodDefault)
        return true;
    if (schema._def?.typeName === 'ZodOptional')
        return true;
    if (schema._def?.typeName === 'ZodDefault')
        return true;
    return false;
}
/**
 * Gets the JSON Schema representation of a Zod property.
 */
function getPropertySchema(schema) {
    // Unwrap optional and default types
    let unwrapped = schema;
    if (unwrapped instanceof z.ZodOptional) {
        unwrapped = unwrapped.unwrap();
    }
    if (unwrapped instanceof z.ZodDefault) {
        unwrapped = unwrapped._def.innerType;
    }
    // Handle string
    if (unwrapped instanceof z.ZodString) {
        return { type: 'string' };
    }
    // Handle number
    if (unwrapped instanceof z.ZodNumber) {
        return { type: 'number' };
    }
    // Handle enum
    if (unwrapped instanceof z.ZodEnum) {
        return { type: 'string', enum: unwrapped.options };
    }
    // Handle array
    if (unwrapped instanceof z.ZodArray) {
        return {
            type: 'array',
            items: getPropertySchema(unwrapped.element),
        };
    }
    // Handle nested object
    if (unwrapped instanceof z.ZodObject) {
        return zodToJsonSchema(unwrapped);
    }
    return { type: 'string' };
}
/**
 * Tool definitions for MCP server registration.
 */
export const itemTools = [
    {
        name: 'item_create',
        description: 'Create a new work item with title, type, and optional fields like dependencies and outputs.',
        inputSchema: zodToJsonSchema(ItemCreateInputSchema),
        handler: itemCreate,
    },
    {
        name: 'item_update',
        description: 'Update an existing work item with partial fields. Requires item ID.',
        inputSchema: zodToJsonSchema(ItemUpdateInputSchema),
        handler: itemUpdate,
    },
    {
        name: 'item_get',
        description: 'Retrieve a single work item by its ID.',
        inputSchema: zodToJsonSchema(ItemGetInputSchema),
        handler: itemGet,
    },
    {
        name: 'item_list',
        description: 'List work items with optional filtering by status, stage, or assigned agent.',
        inputSchema: zodToJsonSchema(ItemListInputSchema),
        handler: itemList,
    },
    {
        name: 'item_reject',
        description: 'Record a rejection for a work item with reason. Handles escalation after max rejections.',
        inputSchema: zodToJsonSchema(ItemRejectInputSchema),
        handler: itemReject,
    },
    {
        name: 'item_render',
        description: 'Get the markdown representation of a work item including frontmatter.',
        inputSchema: zodToJsonSchema(ItemRenderInputSchema),
        handler: itemRender,
    },
];
//# sourceMappingURL=items.js.map