/**
 * Utility MCP tools.
 *
 * Provides helper functionality:
 * - deps_check: Validate dependency graph and detect cycles
 * - activity_log: Append structured JSON to activity feed
 * - log: Simple shorthand for activity logging
 */
import { z } from 'zod';
import { createClient } from '../client/index.js';
import { config } from '../config.js';
// ============================================================================
// Valid Agent Names
// ============================================================================
/**
 * Valid agent names (lowercase for input validation).
 */
const VALID_AGENTS_LOWER = [
    'murdock',
    'ba',
    'lynch',
    'amy',
    'hannibal',
    'face',
    'sosa',
    'tawnia',
];
/**
 * Map from lowercase agent names to API-expected format.
 */
const AGENT_NAME_MAP = {
    murdock: 'Murdock',
    ba: 'B.A.',
    lynch: 'Lynch',
    amy: 'Amy',
    hannibal: 'Hannibal',
    face: 'Face',
    sosa: 'Sosa',
    tawnia: 'Tawnia',
};
/**
 * Normalize agent name to lowercase key format.
 * Handles special cases like "B.A." -> "ba"
 */
function normalizeAgentName(val) {
    return val.toLowerCase().replace(/\./g, '');
}
/**
 * Zod schema for agent name validation.
 * Accepts case-insensitive input, validates, and transforms to API format.
 */
const AgentNameSchema = z
    .string()
    .transform((val) => normalizeAgentName(val))
    .refine((val) => VALID_AGENTS_LOWER.includes(val), {
    message: `Agent must be one of: ${VALID_AGENTS_LOWER.join(', ')}`,
})
    .transform((val) => AGENT_NAME_MAP[val]);
// ============================================================================
// Zod Schemas for Input Validation
// ============================================================================
/**
 * Schema for deps_check tool input.
 */
export const DepsCheckSchema = z.object({
    verbose: z.boolean().optional(),
});
/**
 * Schema for activity_log tool input.
 */
export const ActivityLogSchema = z.object({
    agent: AgentNameSchema,
    message: z.string().min(1, 'message is required'),
});
/**
 * Schema for log tool input (simple shorthand).
 */
export const LogSchema = z.object({
    agent: AgentNameSchema,
    message: z.string().min(1, 'message is required'),
});
/**
 * Formats an error message from an API error response.
 */
function formatErrorMessage(error) {
    if (error instanceof Error) {
        const apiError = error;
        if (apiError.code === 'ECONNREFUSED') {
            return 'Connection refused - server may be unavailable';
        }
        return error.message;
    }
    const apiError = error;
    if (apiError.message) {
        return apiError.message;
    }
    return 'Unknown error occurred';
}
// ============================================================================
// HTTP Client
// ============================================================================
const client = createClient({
    baseUrl: config.apiUrl,
    projectId: config.projectId,
    timeout: 30000,
    retries: 3,
});
// ============================================================================
// Tool Handlers
// ============================================================================
/**
 * Validates the dependency graph and detects cycles.
 */
export async function depsCheck(input) {
    try {
        const queryString = input.verbose ? '?verbose=true' : '';
        const path = `/api/deps/check${queryString}`;
        const result = await client.get(path);
        return {
            content: [{ type: 'text', text: JSON.stringify(result.data) }],
            data: result.data,
        };
    }
    catch (error) {
        const errorMessage = formatErrorMessage(error);
        return {
            content: [{ type: 'text', text: errorMessage }],
            isError: true,
        };
    }
}
/**
 * Appends structured JSON to activity feed.
 */
export async function activityLog(input) {
    try {
        const result = await client.post('/api/activity', {
            agent: input.agent,
            message: input.message,
        });
        return {
            content: [{ type: 'text', text: JSON.stringify(result.data) }],
            data: result.data,
        };
    }
    catch (error) {
        const errorMessage = formatErrorMessage(error);
        return {
            content: [{ type: 'text', text: errorMessage }],
            isError: true,
        };
    }
}
/**
 * Simple shorthand for activity logging.
 */
export async function log(input) {
    try {
        const result = await client.post('/api/activity', {
            agent: input.agent,
            message: input.message,
        });
        return {
            content: [{ type: 'text', text: JSON.stringify(result.data) }],
            data: result.data,
        };
    }
    catch (error) {
        const errorMessage = formatErrorMessage(error);
        return {
            content: [{ type: 'text', text: errorMessage }],
            isError: true,
        };
    }
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
    if (unwrapped instanceof z.ZodNumber) {
        return { type: 'number' };
    }
    if (unwrapped instanceof z.ZodBoolean) {
        return { type: 'boolean' };
    }
    if (unwrapped instanceof z.ZodEnum) {
        return { type: 'string', enum: unwrapped.options };
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
    // For refined types (like AgentNameSchema), check the inner type
    if (unwrapped instanceof z.ZodEffects) {
        return getPropertySchema(unwrapped.innerType());
    }
    return { type: 'string' };
}
/**
 * Tool definitions for MCP server registration.
 * Each tool includes the original Zod schema for use with McpServer.tool() API.
 */
export const utilsTools = [
    {
        name: 'deps_check',
        description: 'Validates the dependency graph and detects cycles. Returns analysis including ready items, depths, and any validation errors.',
        inputSchema: zodToJsonSchema(DepsCheckSchema),
        zodSchema: DepsCheckSchema,
        handler: depsCheck,
    },
    {
        name: 'activity_log',
        description: 'Appends a structured JSON log entry to the activity feed. Requires agent name and message.',
        inputSchema: zodToJsonSchema(ActivityLogSchema),
        zodSchema: ActivityLogSchema,
        handler: activityLog,
    },
    {
        name: 'log',
        description: 'Simple shorthand for activity logging. Appends a log entry with agent name and message.',
        inputSchema: zodToJsonSchema(LogSchema),
        zodSchema: LogSchema,
        handler: log,
    },
];
//# sourceMappingURL=utils.js.map