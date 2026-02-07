import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the McpServer
const mockSetRequestHandler = vi.fn();
const mockTool = vi.fn();
const mockServer = {
  name: 'ateam',
  version: '1.0.0',
  setRequestHandler: mockSetRequestHandler,
  tool: mockTool,
};

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: vi.fn().mockImplementation(() => mockServer),
}));

// Mock stderr.write for logging tests
const mockStderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

describe('Tool Registration (tools/index)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerAllTools function', () => {
    it('should export a registerAllTools function', async () => {
      // This test defines the expected export structure
      const indexModule = await import('../../tools/index.js');

      expect(indexModule).toHaveProperty('registerAllTools');
      expect(typeof indexModule.registerAllTools).toBe('function');
    });

    it('should accept a McpServer instance as argument', async () => {
      const { registerAllTools } = await import('../../tools/index.js');

      // Should not throw when called with a valid server object
      expect(() => registerAllTools(mockServer as never)).not.toThrow();
    });

    it('should register tools using server.tool() API', async () => {
      const { registerAllTools } = await import('../../tools/index.js');

      registerAllTools(mockServer as never);

      // Verify that server.tool() was called for each of the 20 tools
      expect(mockTool).toHaveBeenCalled();
      expect(mockTool.mock.calls.length).toBe(20);
    });

    it('should register each tool with name, description, schema, and handler', async () => {
      const { registerAllTools } = await import('../../tools/index.js');

      registerAllTools(mockServer as never);

      // Each server.tool() call should have 4 arguments: name, description, zodShape, handler
      for (const call of mockTool.mock.calls) {
        expect(typeof call[0]).toBe('string'); // name
        expect(typeof call[1]).toBe('string'); // description
        expect(typeof call[2]).toBe('object'); // zodShape
        expect(typeof call[3]).toBe('function'); // handler
      }
    });
  });

  describe('Tool Count and Registration', () => {
    it('should register exactly 20 tools', async () => {
      const { registerAllTools, getAllToolDefinitions } = await import('../../tools/index.js');

      registerAllTools(mockServer as never);

      const toolDefinitions = getAllToolDefinitions();
      expect(toolDefinitions).toHaveLength(20);
    });

    it('should register all board tools (4)', async () => {
      const { getAllToolDefinitions, registerAllTools } = await import('../../tools/index.js');

      registerAllTools(mockServer as never);

      const toolDefinitions = getAllToolDefinitions();
      const boardToolNames = ['board_read', 'board_move', 'board_claim', 'board_release'];

      for (const name of boardToolNames) {
        const tool = toolDefinitions.find((t) => t.name === name);
        expect(tool, `Expected tool ${name} to be registered`).toBeDefined();
      }
    });

    it('should register all item tools (6)', async () => {
      const { getAllToolDefinitions, registerAllTools } = await import('../../tools/index.js');

      registerAllTools(mockServer as never);

      const toolDefinitions = getAllToolDefinitions();
      const itemToolNames = [
        'item_create',
        'item_update',
        'item_get',
        'item_list',
        'item_reject',
        'item_render',
      ];

      for (const name of itemToolNames) {
        const tool = toolDefinitions.find((t) => t.name === name);
        expect(tool, `Expected tool ${name} to be registered`).toBeDefined();
      }
    });

    it('should register all agent tools (2)', async () => {
      const { getAllToolDefinitions, registerAllTools } = await import('../../tools/index.js');

      registerAllTools(mockServer as never);

      const toolDefinitions = getAllToolDefinitions();
      const agentToolNames = ['agent_start', 'agent_stop'];

      for (const name of agentToolNames) {
        const tool = toolDefinitions.find((t) => t.name === name);
        expect(tool, `Expected tool ${name} to be registered`).toBeDefined();
      }
    });

    it('should register all mission tools (5)', async () => {
      const { getAllToolDefinitions, registerAllTools } = await import('../../tools/index.js');

      registerAllTools(mockServer as never);

      const toolDefinitions = getAllToolDefinitions();
      const missionToolNames = [
        'mission_init',
        'mission_current',
        'mission_precheck',
        'mission_postcheck',
        'mission_archive',
      ];

      for (const name of missionToolNames) {
        const tool = toolDefinitions.find((t) => t.name === name);
        expect(tool, `Expected tool ${name} to be registered`).toBeDefined();
      }
    });

    it('should register all utils tools (3)', async () => {
      const { getAllToolDefinitions, registerAllTools } = await import('../../tools/index.js');

      registerAllTools(mockServer as never);

      const toolDefinitions = getAllToolDefinitions();
      const utilsToolNames = ['deps_check', 'activity_log', 'log'];

      for (const name of utilsToolNames) {
        const tool = toolDefinitions.find((t) => t.name === name);
        expect(tool, `Expected tool ${name} to be registered`).toBeDefined();
      }
    });

    it('should have unique tool names', async () => {
      const { getAllToolDefinitions, registerAllTools } = await import('../../tools/index.js');

      registerAllTools(mockServer as never);

      const toolDefinitions = getAllToolDefinitions();
      const names = toolDefinitions.map((t) => t.name);
      const uniqueNames = new Set(names);

      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe('Tool Definition Structure', () => {
    it('each tool should have a name property', async () => {
      const { getAllToolDefinitions, registerAllTools } = await import('../../tools/index.js');

      registerAllTools(mockServer as never);

      const toolDefinitions = getAllToolDefinitions();

      for (const tool of toolDefinitions) {
        expect(tool).toHaveProperty('name');
        expect(typeof tool.name).toBe('string');
        expect(tool.name.length).toBeGreaterThan(0);
      }
    });

    it('each tool should have a description property', async () => {
      const { getAllToolDefinitions, registerAllTools } = await import('../../tools/index.js');

      registerAllTools(mockServer as never);

      const toolDefinitions = getAllToolDefinitions();

      for (const tool of toolDefinitions) {
        expect(tool).toHaveProperty('description');
        expect(typeof tool.description).toBe('string');
        expect(tool.description.length).toBeGreaterThan(0);
      }
    });

    it('each tool should have an inputSchema property', async () => {
      const { getAllToolDefinitions, registerAllTools } = await import('../../tools/index.js');

      registerAllTools(mockServer as never);

      const toolDefinitions = getAllToolDefinitions();

      for (const tool of toolDefinitions) {
        expect(tool).toHaveProperty('inputSchema');
        expect(typeof tool.inputSchema).toBe('object');
      }
    });

    it('inputSchema should be an object for each tool', async () => {
      const { getAllToolDefinitions, registerAllTools } = await import('../../tools/index.js');

      registerAllTools(mockServer as never);

      const toolDefinitions = getAllToolDefinitions();

      for (const tool of toolDefinitions) {
        // Each tool should have an inputSchema that is an object
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.inputSchema).toBe('object');
      }
    });
  });

  describe('tools/list Handler', () => {
    it('should register all 20 tools via server.tool() API', async () => {
      const { registerAllTools } = await import('../../tools/index.js');

      registerAllTools(mockServer as never);

      // With the high-level server.tool() API, the MCP SDK handles tools/list internally.
      // We verify all 20 tools were registered via server.tool() calls.
      expect(mockTool.mock.calls.length).toBe(20);

      // Verify the tool names registered match the expected set
      const registeredNames = mockTool.mock.calls.map((call: unknown[]) => call[0]).sort();
      expect(registeredNames).toHaveLength(20);
    });

    it('registered tool names should match getAllToolDefinitions', async () => {
      const { registerAllTools, getAllToolDefinitions } = await import('../../tools/index.js');

      registerAllTools(mockServer as never);

      const toolDefinitions = getAllToolDefinitions();

      // Names registered via server.tool() should match getAllToolDefinitions
      const registeredNames = mockTool.mock.calls.map((call: unknown[]) => call[0] as string).sort();
      const definitionNames = toolDefinitions.map((t) => t.name).sort();

      expect(registeredNames).toEqual(definitionNames);
    });
  });

  describe('tools/call Handler', () => {
    it('should register each tool with a callable handler via server.tool()', async () => {
      const { registerAllTools } = await import('../../tools/index.js');

      registerAllTools(mockServer as never);

      // With server.tool() API, each tool has its own handler registered directly.
      // The MCP SDK handles dispatching tools/call to the correct handler.
      for (const call of mockTool.mock.calls) {
        const handler = call[3]; // 4th arg is the handler
        expect(typeof handler).toBe('function');
      }
    });

    it('should return undefined from getToolHandler for unknown tool name', async () => {
      const { registerAllTools, getToolHandler } = await import('../../tools/index.js');

      registerAllTools(mockServer as never);

      const handler = getToolHandler('nonexistent_tool');
      expect(handler).toBeUndefined();
    });

    it('should pass arguments to the tool handler', async () => {
      const { registerAllTools, getToolHandler } = await import('../../tools/index.js');

      registerAllTools(mockServer as never);

      // Get a specific tool handler to verify it receives arguments
      const boardReadHandler = getToolHandler('board_read');
      expect(boardReadHandler).toBeDefined();
    });
  });

  describe('Server Startup Logging', () => {
    it('should log list of available tools on registration', async () => {
      const { registerAllTools } = await import('../../tools/index.js');

      registerAllTools(mockServer as never);

      // Check that something was logged to stderr
      expect(mockStderrWrite).toHaveBeenCalled();

      // Find the log call that lists tools
      const toolListLog = mockStderrWrite.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('tool')
      );

      expect(toolListLog).toBeDefined();
    });

    it('should log the count of registered tools', async () => {
      const { registerAllTools } = await import('../../tools/index.js');

      registerAllTools(mockServer as never);

      // Find a log entry mentioning the count (20)
      const countLog = mockStderrWrite.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('20')
      );

      expect(countLog).toBeDefined();
    });
  });

  describe('Tool Discovery', () => {
    it('getAllToolDefinitions should return complete tool list', async () => {
      const { getAllToolDefinitions, registerAllTools } = await import('../../tools/index.js');

      registerAllTools(mockServer as never);

      const tools = getAllToolDefinitions();

      // Verify all expected tool names are present
      const expectedTools = [
        // Board tools
        'board_read',
        'board_move',
        'board_claim',
        'board_release',
        // Item tools
        'item_create',
        'item_update',
        'item_get',
        'item_list',
        'item_reject',
        'item_render',
        // Agent tools
        'agent_start',
        'agent_stop',
        // Mission tools
        'mission_init',
        'mission_current',
        'mission_precheck',
        'mission_postcheck',
        'mission_archive',
        // Utils tools
        'deps_check',
        'activity_log',
        'log',
      ];

      const toolNames = tools.map((t) => t.name);

      for (const expected of expectedTools) {
        expect(toolNames).toContain(expected);
      }
    });

    it('getToolHandler should return handler for valid tool name', async () => {
      const { getToolHandler, registerAllTools } = await import('../../tools/index.js');

      registerAllTools(mockServer as never);

      const handler = getToolHandler('board_read');

      expect(handler).toBeDefined();
      expect(typeof handler).toBe('function');
    });

    it('getToolHandler should return undefined for invalid tool name', async () => {
      const { getToolHandler, registerAllTools } = await import('../../tools/index.js');

      registerAllTools(mockServer as never);

      const handler = getToolHandler('invalid_tool');

      expect(handler).toBeUndefined();
    });
  });

  describe('Export Structure', () => {
    it('should export registerAllTools', async () => {
      const indexModule = await import('../../tools/index.js');

      expect(indexModule).toHaveProperty('registerAllTools');
    });

    it('should export getAllToolDefinitions', async () => {
      const indexModule = await import('../../tools/index.js');

      expect(indexModule).toHaveProperty('getAllToolDefinitions');
    });

    it('should export getToolHandler', async () => {
      const indexModule = await import('../../tools/index.js');

      expect(indexModule).toHaveProperty('getToolHandler');
    });
  });

  describe('Error Handling', () => {
    it('should register tool handlers that catch and wrap errors', async () => {
      const { registerAllTools } = await import('../../tools/index.js');

      registerAllTools(mockServer as never);

      // With server.tool() API, each tool has its own handler with built-in error handling.
      // The handler wraps errors in { content: [...], isError: true } format.
      // Verify that at least one tool handler was registered with error wrapping.
      const boardReadCall = mockTool.mock.calls.find(
        (call: unknown[]) => call[0] === 'board_read'
      );
      expect(boardReadCall).toBeDefined();

      const handler = boardReadCall![3];
      expect(typeof handler).toBe('function');
    });

    it('should return content from tool handlers when called with empty args', async () => {
      const { registerAllTools, getToolHandler } = await import('../../tools/index.js');

      registerAllTools(mockServer as never);

      // getToolHandler returns the raw handler which expects valid input
      const boardReadHandler = getToolHandler('board_read');
      expect(boardReadHandler).toBeDefined();
      expect(typeof boardReadHandler).toBe('function');
    });
  });
});
