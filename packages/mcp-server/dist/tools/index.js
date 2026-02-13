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
// Import tool definitions from each module
import { boardTools } from './board.js';
import { itemTools } from './items.js';
import { agentTools } from './agents.js';
import { missionTools } from './missions.js';
import { utilsTools } from './utils.js';
/**
 * All tool definitions combined from each module.
 */
let allToolDefinitions = [];
/**
 * Map of tool names to their handlers for quick lookup.
 */
let toolHandlerMap = new Map();
/**
 * Normalize board tools from object format to array format.
 * Board tools export Zod schemas directly as inputSchema.
 */
function normalizeBoardTools() {
    return Object.values(boardTools).map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: {},
        zodSchema: tool.inputSchema,
        handler: tool.handler,
    }));
}
/**
 * Initialize the tool definitions array.
 */
function initializeToolDefinitions() {
    // Normalize board tools (from object to array format)
    const normalizedBoardTools = normalizeBoardTools();
    // Combine all tools - each module now exports zodSchema
    allToolDefinitions = [
        ...normalizedBoardTools,
        ...itemTools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
            zodSchema: t.zodSchema,
            handler: t.handler,
        })),
        ...agentTools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
            zodSchema: t.zodSchema,
            handler: t.handler,
        })),
        ...missionTools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
            zodSchema: t.zodSchema,
            handler: t.handler,
        })),
        ...utilsTools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
            zodSchema: t.zodSchema,
            handler: t.handler,
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
export function getAllToolDefinitions() {
    return allToolDefinitions;
}
/**
 * Returns the handler function for a specific tool.
 *
 * @param name - The tool name
 * @returns The handler function, or undefined if not found
 */
export function getToolHandler(name) {
    return toolHandlerMap.get(name);
}
/**
 * Registers all tools with the MCP server using the high-level tool() API.
 *
 * @param server - The MCP server instance
 */
export function registerAllTools(server) {
    // Initialize tool definitions
    initializeToolDefinitions();
    // Log available tools to stderr
    process.stderr.write(`[ateam] Registering ${allToolDefinitions.length} tools: ${allToolDefinitions.map((t) => t.name).join(', ')}\n`);
    // Register each tool using the McpServer's high-level tool() API
    // The tool() method expects: name, description, paramsSchema (Zod shape), callback
    for (const toolDef of allToolDefinitions) {
        // Get the Zod shape from the schema
        const zodShape = toolDef.zodSchema.shape;
        server.tool(toolDef.name, toolDef.description, zodShape, async (args) => {
            try {
                const result = (await toolDef.handler(args));
                // Ensure proper response format
                if (result && 'content' in result) {
                    return result;
                }
                // Wrap unexpected response
                return {
                    content: [{ type: 'text', text: JSON.stringify(result) }],
                };
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                return {
                    content: [{ type: 'text', text: errorMessage }],
                    isError: true,
                };
            }
        });
    }
}
//# sourceMappingURL=index.js.map