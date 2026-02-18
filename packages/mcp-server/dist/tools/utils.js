/**
 * Utility MCP tools.
 *
 * Provides helper functionality:
 * - deps_check: Validate dependency graph and detect cycles
 * - activity_log: Append structured JSON to activity feed
 * - log: Simple shorthand for activity logging
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';
import { createClient } from '../client/index.js';
import { config } from '../config.js';
import { AgentNameSchema } from '../lib/agents.js';
import { zodToJsonSchema } from '../lib/schema-utils.js';
import { formatErrorMessage } from '../lib/tool-response.js';
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
// ============================================================================
// HTTP Client
// ============================================================================
const client = createClient({
    baseUrl: config.apiUrl,
    projectId: config.projectId,
    apiKey: config.apiKey,
    timeout: config.timeout,
    retries: config.retries,
});
/**
 * Schema for plugin_root tool input (no parameters needed).
 */
export const PluginRootSchema = z.object({});
// ============================================================================
// Tool Handlers
// ============================================================================
/**
 * Returns the absolute path to the plugin root directory.
 * Derives this from the MCP server's own file location.
 */
export async function pluginRoot(_input) {
    // In the bundle: dist/bundle.mjs → plugin root is ../../..
    // In dev (unbundled): src/tools/utils.ts → plugin root is ../../../..
    // We detect by checking if import.meta.url contains 'dist/bundle'
    const currentFile = fileURLToPath(import.meta.url);
    const currentDir = dirname(currentFile);
    let root;
    if (currentFile.includes('dist/bundle')) {
        // Bundled: packages/mcp-server/dist/bundle.mjs → go up 3 levels
        root = resolve(currentDir, '..', '..', '..');
    }
    else {
        // Dev: packages/mcp-server/src/tools/utils.ts → go up 4 levels
        root = resolve(currentDir, '..', '..', '..', '..');
    }
    return {
        content: [{ type: 'text', text: root }],
        data: { path: root },
    };
}
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
 * Tool definitions for MCP server registration.
 * Each tool includes the original Zod schema for use with McpServer.tool() API.
 */
export const utilsTools = [
    {
        name: 'plugin_root',
        description: 'Returns the absolute path to the A(i)-Team plugin root directory. Use this to build paths to plugin files like playbooks, agents, etc.',
        inputSchema: zodToJsonSchema(PluginRootSchema),
        zodSchema: PluginRootSchema,
        handler: pluginRoot,
    },
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