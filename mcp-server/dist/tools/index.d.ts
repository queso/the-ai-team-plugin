/**
 * Tool Registration and Server Wiring.
 *
 * This module aggregates all tool definitions and provides functions
 * to register them with the MCP server.
 *
 * Exports:
 * - registerAllTools(server): Registers all tools with the MCP server
 * - getAllToolDefinitions(): Returns the complete list of tool definitions
 * - getToolHandler(name): Returns the handler function for a specific tool
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
/**
 * Tool definition structure for MCP registration.
 */
export interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: {
        type: 'object';
        properties: Record<string, unknown>;
        required?: string[];
    };
    handler: (input: unknown) => Promise<unknown>;
}
/**
 * Returns all tool definitions.
 * Must call registerAllTools first to initialize.
 *
 * @returns Array of tool definitions with name, description, and inputSchema
 */
export declare function getAllToolDefinitions(): ToolDefinition[];
/**
 * Returns the handler function for a specific tool.
 *
 * @param name - The tool name
 * @returns The handler function, or undefined if not found
 */
export declare function getToolHandler(name: string): ((input: unknown) => Promise<unknown>) | undefined;
/**
 * Registers all tools with the MCP server.
 *
 * Sets up:
 * - tools/list handler to return all tool definitions
 * - tools/call handler to dispatch calls to the appropriate tool handler
 *
 * @param server - The MCP server instance
 */
export declare function registerAllTools(server: McpServer & {
    setRequestHandler: (schema: {
        method: string;
    }, handler: (request: unknown) => Promise<unknown>) => void;
}): void;
//# sourceMappingURL=index.d.ts.map