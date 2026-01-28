/**
 * Mission lifecycle MCP tools.
 *
 * Provides tools for managing mission lifecycle:
 * - mission_init: Create new mission directory structure
 * - mission_current: Return active mission metadata
 * - mission_precheck: Run configured pre-flight checks
 * - mission_postcheck: Run configured post-completion checks
 * - mission_archive: Move completed mission to archive
 */
import { z } from 'zod';
import { createClient } from '../client/index.js';
import { config } from '../config.js';
import { withErrorBoundary } from '../lib/errors.js';
// Initialize HTTP client
const client = createClient({
    baseUrl: config.apiUrl,
    projectId: config.projectId,
    timeout: 30000,
    retries: 3,
});
// ============================================================================
// Zod Schemas for Input Validation
// ============================================================================
/**
 * Schema for mission_init tool input.
 */
export const MissionInitInputSchema = z.object({
    name: z.string().min(1),
    prdPath: z.string().min(1),
    force: z.boolean().optional().default(false),
});
/**
 * Schema for mission_current tool input.
 */
export const MissionCurrentInputSchema = z.object({});
/**
 * Schema for mission_precheck tool input.
 */
export const MissionPrecheckInputSchema = z.object({
    checks: z.array(z.string()).optional(),
});
/**
 * Schema for mission_postcheck tool input.
 */
export const MissionPostcheckInputSchema = z.object({
    checks: z.array(z.string()).optional(),
});
/**
 * Schema for mission_archive tool input.
 */
export const MissionArchiveInputSchema = z.object({
    itemIds: z.array(z.string()).optional(),
    complete: z.boolean().optional().default(false),
    dryRun: z.boolean().optional().default(false),
});
// ============================================================================
// Tool Handlers
// ============================================================================
/**
 * Creates a new mission directory structure.
 */
export async function missionInit(input) {
    const handler = async (args) => {
        const body = {
            name: args.name,
            prdPath: args.prdPath,
        };
        if (args.force !== undefined) {
            body.force = args.force;
        }
        const result = await client.post('/api/missions', body);
        return {
            content: [{ type: 'text', text: JSON.stringify(result.data) }],
            data: result.data,
        };
    };
    return withErrorBoundary(handler)(input);
}
/**
 * Returns active mission metadata.
 */
export async function missionCurrent(input) {
    const handler = async (_args) => {
        const result = await client.get('/api/missions/current');
        return {
            content: [{ type: 'text', text: JSON.stringify(result.data) }],
            data: result.data,
        };
    };
    return withErrorBoundary(handler)(input);
}
/**
 * Runs configured pre-flight checks.
 */
export async function missionPrecheck(input) {
    const handler = async (args) => {
        const body = {};
        if (args.checks !== undefined) {
            body.checks = args.checks;
        }
        const result = await client.post('/api/missions/precheck', body);
        return {
            content: [{ type: 'text', text: JSON.stringify(result.data) }],
            data: result.data,
        };
    };
    return withErrorBoundary(handler)(input);
}
/**
 * Runs configured post-completion checks.
 */
export async function missionPostcheck(input) {
    const handler = async (args) => {
        const body = {};
        if (args.checks !== undefined) {
            body.checks = args.checks;
        }
        const result = await client.post('/api/missions/postcheck', body);
        return {
            content: [{ type: 'text', text: JSON.stringify(result.data) }],
            data: result.data,
        };
    };
    return withErrorBoundary(handler)(input);
}
/**
 * Moves completed mission items to archive.
 */
export async function missionArchive(input) {
    const handler = async (args) => {
        const body = {};
        if (args.itemIds !== undefined) {
            body.itemIds = args.itemIds;
        }
        if (args.complete !== undefined) {
            body.complete = args.complete;
        }
        if (args.dryRun !== undefined) {
            body.dryRun = args.dryRun;
        }
        const result = await client.post('/api/missions/archive', body);
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
    if (schema instanceof z.ZodObject) {
        const shape = schema.shape;
        const properties = {};
        const required = [];
        for (const [key, value] of Object.entries(shape)) {
            const zodValue = value;
            properties[key] = getPropertySchema(zodValue);
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
    let unwrapped = schema;
    if (unwrapped instanceof z.ZodOptional) {
        unwrapped = unwrapped.unwrap();
    }
    if (unwrapped instanceof z.ZodDefault) {
        unwrapped = unwrapped._def.innerType;
    }
    if (unwrapped instanceof z.ZodString) {
        return { type: 'string' };
    }
    if (unwrapped instanceof z.ZodBoolean) {
        return { type: 'boolean' };
    }
    if (unwrapped instanceof z.ZodNumber) {
        return { type: 'number' };
    }
    if (unwrapped instanceof z.ZodArray) {
        return {
            type: 'array',
            items: getPropertySchema(unwrapped.element),
        };
    }
    if (unwrapped instanceof z.ZodObject) {
        return zodToJsonSchema(unwrapped);
    }
    return { type: 'string' };
}
/**
 * Tool definitions for MCP server registration.
 * Each tool includes the original Zod schema for use with McpServer.tool() API.
 */
export const missionTools = [
    {
        name: 'mission_init',
        description: 'Create a new mission. Requires name and prdPath. Use force flag to archive existing active mission.',
        inputSchema: zodToJsonSchema(MissionInitInputSchema),
        zodSchema: MissionInitInputSchema,
        handler: missionInit,
    },
    {
        name: 'mission_current',
        description: 'Return active mission metadata including progress, WIP limits, and column/phase information.',
        inputSchema: zodToJsonSchema(MissionCurrentInputSchema),
        zodSchema: MissionCurrentInputSchema,
        handler: missionCurrent,
    },
    {
        name: 'mission_precheck',
        description: 'Run configured pre-flight checks (lint, tests) before starting mission execution.',
        inputSchema: zodToJsonSchema(MissionPrecheckInputSchema),
        zodSchema: MissionPrecheckInputSchema,
        handler: missionPrecheck,
    },
    {
        name: 'mission_postcheck',
        description: 'Run configured post-completion checks (lint, unit tests, e2e) after all items are done.',
        inputSchema: zodToJsonSchema(MissionPostcheckInputSchema),
        zodSchema: MissionPostcheckInputSchema,
        handler: missionPostcheck,
    },
    {
        name: 'mission_archive',
        description: 'Move completed mission items to archive. Use complete flag to archive entire mission with summary.',
        inputSchema: zodToJsonSchema(MissionArchiveInputSchema),
        zodSchema: MissionArchiveInputSchema,
        handler: missionArchive,
    },
];
//# sourceMappingURL=missions.js.map