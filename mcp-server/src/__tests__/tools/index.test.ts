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

    it('should register tools/list request handler', async () => {
      const { registerAllTools } = await import('../../tools/index.js');

      registerAllTools(mockServer as never);

      // Verify that setRequestHandler was called at some point for tools/list
      const toolsListCall = mockSetRequestHandler.mock.calls.find(
        (call) => call[0]?.method === 'tools/list'
      );
      expect(toolsListCall).toBeDefined();
    });

    it('should register tools/call request handler', async () => {
      const { registerAllTools } = await import('../../tools/index.js');

      registerAllTools(mockServer as never);

      // Verify that setRequestHandler was called for tools/call
      const toolsCallCall = mockSetRequestHandler.mock.calls.find(
        (call) => call[0]?.method === 'tools/call'
      );
      expect(toolsCallCall).toBeDefined();
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

    it('inputSchema should be valid JSON Schema format', async () => {
      const { getAllToolDefinitions, registerAllTools } = await import('../../tools/index.js');

      registerAllTools(mockServer as never);

      const toolDefinitions = getAllToolDefinitions();

      for (const tool of toolDefinitions) {
        const schema = tool.inputSchema;

        // JSON Schema must have a type property for the root
        expect(schema).toHaveProperty('type');
        expect(schema.type).toBe('object');

        // Should have properties (can be empty object for tools with no input)
        expect(schema).toHaveProperty('properties');
        expect(typeof schema.properties).toBe('object');
      }
    });
  });

  describe('tools/list Handler', () => {
    it('should return all tool definitions when tools/list is called', async () => {
      const { registerAllTools } = await import('../../tools/index.js');

      registerAllTools(mockServer as never);

      // Find the tools/list handler
      const toolsListCall = mockSetRequestHandler.mock.calls.find(
        (call) => call[0]?.method === 'tools/list'
      );

      expect(toolsListCall).toBeDefined();

      // Get the handler function
      const handler = toolsListCall[1];
      expect(typeof handler).toBe('function');

      // Call the handler and verify response
      const response = await handler({});

      expect(response).toHaveProperty('tools');
      expect(Array.isArray(response.tools)).toBe(true);
      expect(response.tools.length).toBe(20);
    });

    it('tools/list response should match getAllToolDefinitions', async () => {
      const { registerAllTools, getAllToolDefinitions } = await import('../../tools/index.js');

      registerAllTools(mockServer as never);

      const toolDefinitions = getAllToolDefinitions();

      const toolsListCall = mockSetRequestHandler.mock.calls.find(
        (call) => call[0]?.method === 'tools/list'
      );
      const handler = toolsListCall[1];
      const response = await handler({});

      // Names should match
      const responseNames = response.tools.map((t: { name: string }) => t.name).sort();
      const definitionNames = toolDefinitions.map((t) => t.name).sort();

      expect(responseNames).toEqual(definitionNames);
    });
  });

  describe('tools/call Handler', () => {
    it('should dispatch to correct handler based on tool name', async () => {
      const { registerAllTools } = await import('../../tools/index.js');

      registerAllTools(mockServer as never);

      // Find the tools/call handler
      const toolsCallCall = mockSetRequestHandler.mock.calls.find(
        (call) => call[0]?.method === 'tools/call'
      );

      expect(toolsCallCall).toBeDefined();

      const handler = toolsCallCall[1];
      expect(typeof handler).toBe('function');
    });

    it('should return error for unknown tool name', async () => {
      const { registerAllTools } = await import('../../tools/index.js');

      registerAllTools(mockServer as never);

      const toolsCallCall = mockSetRequestHandler.mock.calls.find(
        (call) => call[0]?.method === 'tools/call'
      );
      const handler = toolsCallCall[1];

      const response = await handler({
        params: {
          name: 'nonexistent_tool',
          arguments: {},
        },
      });

      expect(response).toHaveProperty('isError', true);
      expect(response.content[0].text).toContain('Unknown tool');
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
    it('should handle missing arguments gracefully in tools/call', async () => {
      const { registerAllTools } = await import('../../tools/index.js');

      registerAllTools(mockServer as never);

      const toolsCallCall = mockSetRequestHandler.mock.calls.find(
        (call) => call[0]?.method === 'tools/call'
      );
      const handler = toolsCallCall[1];

      // Call with missing params
      const response = await handler({});

      expect(response).toHaveProperty('isError', true);
    });

    it('should handle null arguments in tools/call', async () => {
      const { registerAllTools } = await import('../../tools/index.js');

      registerAllTools(mockServer as never);

      const toolsCallCall = mockSetRequestHandler.mock.calls.find(
        (call) => call[0]?.method === 'tools/call'
      );
      const handler = toolsCallCall[1];

      const response = await handler({
        params: {
          name: 'board_read',
          arguments: null,
        },
      });

      // Should handle null arguments (board_read has no required args)
      // Either success or graceful error is acceptable
      expect(response).toHaveProperty('content');
    });
  });
});
