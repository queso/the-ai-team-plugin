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

// Import tool definitions from each module
import { boardTools } from './board.js';
import { itemTools } from './items.js';
import { agentTools } from './agents.js';
import { missionTools } from './missions.js';
import { utilsTools } from './utils.js';
import type { ToolResponse } from '../lib/tool-response.js';

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
 * MCP tool response with index signature required by the MCP SDK.
 */
interface McpToolResponse extends ToolResponse {
  [key: string]: unknown;
}

/**
 * All tool definitions combined from each module.
 */
let allToolDefinitions: ToolDefinitionWithZod[] = [];

/**
 * Map of tool names to their handlers for quick lookup.
 */
let toolHandlerMap: Map<string, (input: unknown) => Promise<unknown>> = new Map();

/**
 * Normalize board tools from object format to array format.
 * Board tools export Zod schemas directly as inputSchema.
 */
function normalizeBoardTools(): ToolDefinitionWithZod[] {
  return Object.values(boardTools).map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: {},
    zodSchema: tool.inputSchema as z.ZodObject<z.ZodRawShape>,
    handler: tool.handler as (input: unknown) => Promise<unknown>,
  }));
}

/**
 * Initialize the tool definitions array.
 */
function initializeToolDefinitions(): void {
  // Normalize board tools (from object to array format)
  const normalizedBoardTools = normalizeBoardTools();

  // Combine all tools - each module now exports zodSchema
  allToolDefinitions = [
    ...normalizedBoardTools,
    ...itemTools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      zodSchema: t.zodSchema as z.ZodObject<z.ZodRawShape>,
      handler: t.handler as (input: unknown) => Promise<unknown>,
    })),
    ...agentTools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      zodSchema: t.zodSchema as z.ZodObject<z.ZodRawShape>,
      handler: t.handler as (input: unknown) => Promise<unknown>,
    })),
    ...missionTools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema as object,
      zodSchema: t.zodSchema as z.ZodObject<z.ZodRawShape>,
      handler: t.handler as (input: unknown) => Promise<unknown>,
    })),
    ...utilsTools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema as object,
      zodSchema: t.zodSchema as z.ZodObject<z.ZodRawShape>,
      handler: t.handler as (input: unknown) => Promise<unknown>,
    })),
  ];

  // Build handler map
  toolHandlerMap = new Map();
  for (const tool of allToolDefinitions) {
    toolHandlerMap.set(tool.name, tool.handler);
  }
}

/**
 * Returns all tool definitions.
 * Must call registerAllTools first to initialize.
 *
 * @returns Array of tool definitions with name, description, and inputSchema
 */
export function getAllToolDefinitions(): ToolDefinitionWithZod[] {
  return allToolDefinitions;
}

/**
 * Returns the handler function for a specific tool.
 *
 * @param name - The tool name
 * @returns The handler function, or undefined if not found
 */
export function getToolHandler(
  name: string
): ((input: unknown) => Promise<unknown>) | undefined {
  return toolHandlerMap.get(name);
}

/**
 * Registers all tools with the MCP server using the high-level tool() API.
 *
 * @param server - The MCP server instance
 */
export function registerAllTools(server: McpServer): void {
  // Initialize tool definitions
  initializeToolDefinitions();

  // Log available tools to stderr
  process.stderr.write(
    `[ateam] Registering ${allToolDefinitions.length} tools: ${allToolDefinitions.map((t) => t.name).join(', ')}\n`
  );

  // Register each tool using the McpServer's high-level tool() API
  // The tool() method expects: name, description, paramsSchema (Zod shape), callback
  for (const toolDef of allToolDefinitions) {
    // Get the Zod shape from the schema
    const zodShape = toolDef.zodSchema.shape;

    server.tool(
      toolDef.name,
      toolDef.description,
      zodShape,
      async (args: unknown): Promise<McpToolResponse> => {
        try {
          const result = (await toolDef.handler(args)) as McpToolResponse;

          // Ensure proper response format
          if (result && 'content' in result) {
            return result;
          }

          // Wrap unexpected response
          return {
            content: [{ type: 'text', text: JSON.stringify(result) }],
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error occurred';
          return {
            content: [{ type: 'text', text: errorMessage }],
            isError: true,
          };
        }
      }
    );
  }
}
