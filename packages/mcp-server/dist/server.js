/**
 * MCP Server factory module.
 * Creates and configures the McpServer instance.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAllTools } from './tools/index.js';
const SERVER_NAME = 'ateam';
const SERVER_VERSION = '1.0.0';
/**
 * Creates a new MCP server instance with A(i)-Team configuration.
 * @returns Configured McpServer instance
 */
export function createServer() {
    const server = new McpServer({
        name: SERVER_NAME,
        version: SERVER_VERSION,
    });
    registerAllTools(server);
    return server;
}
//# sourceMappingURL=server.js.map