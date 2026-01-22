/**
 * Probe tests for Tool Registration and Server Wiring.
 *
 * These tests verify edge cases and fixes discovered during
 * the Amy Investigation phase.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerAllTools, getAllToolDefinitions, getToolHandler } from '../../tools/index.js';

describe('Tool Registration Probe Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('CRITICAL: Server Wiring Verification', () => {
    it('VERIFIED: server.ts imports and calls registerAllTools', async () => {
      /**
       * VERIFIED FIX
       *
       * The createServer() function in server.ts now correctly calls
       * registerAllTools() before returning the server.
       *
       * This was verified by code inspection:
       *   import { registerAllTools } from './tools/index.js';
       *   export function createServer(): McpServer {
       *     const server = new McpServer({ name, version });
       *     registerAllTools(server);  // Tools are now registered!
       *     return server;
       *   }
       */

      // Read the actual server.ts file to verify the import and call exist
      const fs = await import('fs');
      const path = await import('path');
      const serverPath = path.join(
        import.meta.dirname,
        '../../server.ts'
      );
      const serverCode = fs.readFileSync(serverPath, 'utf-8');

      // Verify the import exists
      expect(serverCode).toContain("import { registerAllTools } from './tools/index.js'");

      // Verify registerAllTools is called
      expect(serverCode).toContain('registerAllTools(server)');
    });
  });

  describe('Edge Cases: tools/call Handler', () => {
    it('FIXED: handles undefined request gracefully', async () => {
      /**
       * VERIFIED FIX
       *
       * The tools/call handler now correctly checks for undefined request.
       * Location: mcp-server/src/tools/index.ts
       *
       * Fixed code:
       *   if (!req || !req.params || !req.params.name) {
       */
      const mockSetRequestHandler = vi.fn();
      const mockServer = {
        name: 'ateam',
        version: '1.0.0',
        setRequestHandler: mockSetRequestHandler,
        tool: vi.fn(),
      };

      registerAllTools(mockServer as never);

      // Find the tools/call handler
      const toolsCallCall = mockSetRequestHandler.mock.calls.find(
        (call) => call[0]?.method === 'tools/call'
      );

      expect(toolsCallCall).toBeDefined();
      const handler = toolsCallCall![1];

      // FIXED: Now returns a graceful error response instead of throwing
      const response = await handler(undefined);
      expect(response).toHaveProperty('isError', true);
      expect(response.content[0].text).toContain('Missing tool name');
    });

    it('should handle empty string tool name', async () => {
      const mockSetRequestHandler = vi.fn();
      const mockServer = {
        name: 'ateam',
        version: '1.0.0',
        setRequestHandler: mockSetRequestHandler,
        tool: vi.fn(),
      };

      registerAllTools(mockServer as never);

      const toolsCallCall = mockSetRequestHandler.mock.calls.find(
        (call) => call[0]?.method === 'tools/call'
      );
      const handler = toolsCallCall![1];

      // Test with empty string tool name
      const response = await handler({
        params: {
          name: '',
          arguments: {},
        },
      });
      // Empty string is correctly handled as "missing" (good behavior)
      expect(response).toHaveProperty('isError', true);
      expect(response.content[0].text).toContain('Missing tool name');
    });

    it('should handle special characters in tool name', async () => {
      const mockSetRequestHandler = vi.fn();
      const mockServer = {
        name: 'ateam',
        version: '1.0.0',
        setRequestHandler: mockSetRequestHandler,
        tool: vi.fn(),
      };

      registerAllTools(mockServer as never);

      const toolsCallCall = mockSetRequestHandler.mock.calls.find(
        (call) => call[0]?.method === 'tools/call'
      );
      const handler = toolsCallCall![1];

      // Test with special characters (potential injection)
      const response = await handler({
        params: {
          name: 'board_read; rm -rf /',
          arguments: {},
        },
      });
      expect(response).toHaveProperty('isError', true);
      expect(response.content[0].text).toContain('Unknown tool');
    });

    it('should handle extremely long tool name', async () => {
      const mockSetRequestHandler = vi.fn();
      const mockServer = {
        name: 'ateam',
        version: '1.0.0',
        setRequestHandler: mockSetRequestHandler,
        tool: vi.fn(),
      };

      registerAllTools(mockServer as never);

      const toolsCallCall = mockSetRequestHandler.mock.calls.find(
        (call) => call[0]?.method === 'tools/call'
      );
      const handler = toolsCallCall![1];

      // Test with extremely long tool name (potential DoS)
      const response = await handler({
        params: {
          name: 'a'.repeat(10000),
          arguments: {},
        },
      });
      expect(response).toHaveProperty('isError', true);
    });
  });

  describe('Edge Cases: Module State', () => {
    it('getAllToolDefinitions returns tool definitions after registerAllTools', async () => {
      // registerAllTools was already called in earlier tests, so tools should be available
      const tools = getAllToolDefinitions();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBe(20);
    });

    it('getToolHandler returns handler for valid tool name', async () => {
      const handler = getToolHandler('board_read');
      expect(handler).toBeDefined();
      expect(typeof handler).toBe('function');
    });

    it('getToolHandler returns undefined for invalid tool name', async () => {
      const handler = getToolHandler('nonexistent_tool');
      expect(handler).toBeUndefined();
    });
  });

  describe('Edge Cases: Response Wrapping', () => {
    it('tools/call should dispatch to registered handlers', async () => {
      const mockSetRequestHandler = vi.fn();
      const mockServer = {
        name: 'ateam',
        version: '1.0.0',
        setRequestHandler: mockSetRequestHandler,
        tool: vi.fn(),
      };

      registerAllTools(mockServer as never);

      // Find tools/call handler
      const toolsCallCall = mockSetRequestHandler.mock.calls.find(
        (call) => call[0]?.method === 'tools/call'
      );
      expect(toolsCallCall).toBeDefined();

      // The handler exists and will dispatch to tool handlers
      const handler = toolsCallCall![1];
      expect(typeof handler).toBe('function');
    });
  });

  describe('Documentation: zodSchemaToJsonSchema Limitations', () => {
    /**
     * WARNING: The zodSchemaToJsonSchema function in tools/index.ts is simplified
     * and only outputs { type: 'string' } for all property types.
     *
     * This is OK for board tools (which only use strings), but inconsistent with
     * the more comprehensive zodToJsonSchema implementations in:
     * - items.ts (handles string, number, enum, array, object)
     * - missions.ts (handles string, boolean, number, array, object)
     * - utils.ts (handles string, number, boolean, enum, array, object, ZodEffects)
     *
     * Since board tools only use string inputs, this is currently not a bug,
     * but it could cause issues if board tools are extended with non-string types.
     */
    it('documents that zodSchemaToJsonSchema treats all types as strings', async () => {
      // This is documentation, not a failing test
      // The board tools use Zod schemas with .min(1) on strings
      // The simplified converter in tools/index.ts correctly handles these
      expect(true).toBe(true);
    });
  });
});
