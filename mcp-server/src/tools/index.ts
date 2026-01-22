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

// Import tool definitions from each module
import { boardTools } from './board.js';
import { itemTools } from './items.js';
import { agentTools } from './agents.js';
import { missionTools } from './missions.js';
import { utilsTools } from './utils.js';

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
 * MCP tool response content structure.
 */
interface ToolResponseContent {
  type: 'text';
  text: string;
}

/**
 * MCP tool response structure.
 */
interface ToolResponse {
  content: ToolResponseContent[];
  isError?: boolean;
}

/**
 * Convert a Zod schema to JSON Schema format.
 * Handles the Zod schemas used in board tools.
 */
function zodSchemaToJsonSchema(zodSchema: unknown): {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
} {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const schema = zodSchema as any;

  // If it's already a JSON Schema object, return it
  if (schema && typeof schema === 'object' && schema.type === 'object') {
    return schema as {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  }

  // If it's a Zod schema, try to extract the shape
  if (schema && typeof schema === 'object' && schema._def) {
    const shape = schema.shape || schema._def?.shape?.() || {};
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const zodValue = value as any;
      properties[key] = { type: 'string' };

      // Check if the field is required
      if (
        !zodValue._def?.typeName?.includes('Optional') &&
        !zodValue._def?.typeName?.includes('Default')
      ) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  // Fallback: return empty schema
  return {
    type: 'object',
    properties: {},
  };
}

/**
 * Normalize board tools from object format to array format.
 */
function normalizeBoardTools(): ToolDefinition[] {
  return Object.values(boardTools).map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: zodSchemaToJsonSchema(tool.inputSchema),
    handler: tool.handler as (input: unknown) => Promise<unknown>,
  }));
}

/**
 * All tool definitions combined from each module.
 */
let allToolDefinitions: ToolDefinition[] = [];

/**
 * Map of tool names to their handlers for quick lookup.
 */
let toolHandlerMap: Map<string, (input: unknown) => Promise<unknown>> = new Map();

/**
 * Initialize the tool definitions array.
 */
function initializeToolDefinitions(): void {
  // Normalize board tools (from object to array format)
  const normalizedBoardTools = normalizeBoardTools();

  // Combine all tools
  allToolDefinitions = [
    ...normalizedBoardTools,
    ...itemTools,
    ...agentTools,
    ...missionTools,
    ...utilsTools,
  ] as ToolDefinition[];

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
export function getAllToolDefinitions(): ToolDefinition[] {
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
 * Registers all tools with the MCP server.
 *
 * Sets up:
 * - tools/list handler to return all tool definitions
 * - tools/call handler to dispatch calls to the appropriate tool handler
 *
 * @param server - The MCP server instance
 */
export function registerAllTools(
  server: McpServer & {
    setRequestHandler: (
      schema: { method: string },
      handler: (request: unknown) => Promise<unknown>
    ) => void;
  }
): void {
  // Initialize tool definitions
  initializeToolDefinitions();

  // Log available tools to stderr
  process.stderr.write(
    `[ateam] Registering 20 tools: ${allToolDefinitions.map((t) => t.name).join(', ')}\n`
  );

  // Register tools/list handler
  server.setRequestHandler({ method: 'tools/list' }, async (): Promise<{
    tools: Array<{
      name: string;
      description: string;
      inputSchema: {
        type: 'object';
        properties: Record<string, unknown>;
        required?: string[];
      };
    }>;
  }> => {
    return {
      tools: allToolDefinitions.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  });

  // Register tools/call handler
  server.setRequestHandler(
    { method: 'tools/call' },
    async (request: unknown): Promise<ToolResponse> => {
      // Validate request structure
      const req = request as {
        params?: {
          name?: string;
          arguments?: unknown;
        };
      };

      if (!req || !req.params || !req.params.name) {
        return {
          content: [{ type: 'text', text: 'Missing tool name in request' }],
          isError: true,
        };
      }

      const toolName = req.params.name;
      const handler = toolHandlerMap.get(toolName);

      if (!handler) {
        return {
          content: [{ type: 'text', text: `Unknown tool: ${toolName}` }],
          isError: true,
        };
      }

      try {
        // Call the tool handler with the provided arguments
        const args = req.params.arguments ?? {};
        const result = (await handler(args)) as ToolResponse;

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
