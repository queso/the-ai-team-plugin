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
import { z } from 'zod';
/**
 * Tool definition structure with Zod schema for MCP registration.
 */
export interface ToolDefinitionWithZod {
    name: string;
    description: string;
    inputSchema: object;
    zodSchema: z.ZodObject<z.ZodRawShape>;
    handler: (input: unknown) => Promise<unknown>;
}
/**
 * Legacy tool definition structure (JSON Schema only).
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
export declare function getAllToolDefinitions(): ToolDefinitionWithZod[];
/**
 * Returns the handler function for a specific tool.
 *
 * @param name - The tool name
 * @returns The handler function, or undefined if not found
 */
export declare function getToolHandler(name: string): ((input: unknown) => Promise<unknown>) | undefined;
/**
 * Registers all tools with the MCP server using the high-level tool() API.
 *
 * @param server - The MCP server instance
 */
export declare function registerAllTools(server: McpServer): void;
//# sourceMappingURL=index.d.ts.map