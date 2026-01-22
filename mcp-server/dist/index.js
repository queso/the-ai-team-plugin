/**
 * MCP Server entry point.
 * Initializes the server with stdio transport for communication with Claude Code.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';
async function main() {
    const server = createServer();
    const transport = new StdioServerTransport();
    try {
        await server.connect(transport);
        process.stderr.write('A(i)-Team MCP server started successfully\n');
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        process.stderr.write(`Failed to start MCP server: ${errorMessage}\n`);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=index.js.map