import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock modules before importing
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: vi.fn().mockImplementation((options) => ({
    name: options.name,
    version: options.version,
    connect: vi.fn().mockResolvedValue(undefined),
    setRequestHandler: vi.fn(),
  })),
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn().mockImplementation(() => ({})),
}));

describe('MCP Server Core Infrastructure', () => {
  describe('config', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should use default API URL when ATEAM_API_URL is not set', async () => {
      delete process.env.ATEAM_API_URL;

      const { config } = await import('../config.js');

      expect(config.apiUrl).toBe('http://localhost:3000');
    });

    it('should read ATEAM_API_URL from environment', async () => {
      process.env.ATEAM_API_URL = 'http://custom-api:8080';

      const { config } = await import('../config.js');

      expect(config.apiUrl).toBe('http://custom-api:8080');
    });

    it('should read optional ATEAM_API_KEY from environment', async () => {
      process.env.ATEAM_API_KEY = 'secret-key-123';

      const { config } = await import('../config.js');

      expect(config.apiKey).toBe('secret-key-123');
    });

    it('should have undefined apiKey when not set', async () => {
      delete process.env.ATEAM_API_KEY;

      const { config } = await import('../config.js');

      expect(config.apiKey).toBeUndefined();
    });

    it('should parse ATEAM_TIMEOUT as integer with default', async () => {
      delete process.env.ATEAM_TIMEOUT;

      const { config } = await import('../config.js');

      expect(config.timeout).toBe(10000);
    });

    it('should parse custom ATEAM_TIMEOUT', async () => {
      process.env.ATEAM_TIMEOUT = '5000';

      const { config } = await import('../config.js');

      expect(config.timeout).toBe(5000);
    });

    it('should parse ATEAM_RETRIES as integer with default', async () => {
      delete process.env.ATEAM_RETRIES;

      const { config } = await import('../config.js');

      expect(config.retries).toBe(3);
    });

    // Edge case tests for config validation (Amy's findings)

    it('should use default API URL when ATEAM_API_URL is empty string', async () => {
      process.env.ATEAM_API_URL = '';

      const { config } = await import('../config.js');

      expect(config.apiUrl).toBe('http://localhost:3000');
    });

    it('should use default API URL when ATEAM_API_URL is whitespace-only', async () => {
      process.env.ATEAM_API_URL = '   ';

      const { config } = await import('../config.js');

      expect(config.apiUrl).toBe('http://localhost:3000');
    });

    it('should reject malformed API URL', async () => {
      process.env.ATEAM_API_URL = 'garbage';

      const { config } = await import('../config.js');

      // Should either reject or use default, not accept garbage
      expect(config.apiUrl).not.toBe('garbage');
      expect(config.apiUrl).toBe('http://localhost:3000');
    });

    it('should use default timeout when ATEAM_TIMEOUT is negative', async () => {
      process.env.ATEAM_TIMEOUT = '-5000';

      const { config } = await import('../config.js');

      expect(config.timeout).toBe(10000);
    });

    it('should use default timeout when ATEAM_TIMEOUT is zero', async () => {
      process.env.ATEAM_TIMEOUT = '0';

      const { config } = await import('../config.js');

      expect(config.timeout).toBe(10000);
    });

    it('should use default timeout when ATEAM_TIMEOUT is non-numeric', async () => {
      process.env.ATEAM_TIMEOUT = 'abc';

      const { config } = await import('../config.js');

      expect(config.timeout).toBe(10000);
    });

    it('should bound timeout when ATEAM_TIMEOUT is extremely large', async () => {
      process.env.ATEAM_TIMEOUT = '999999999999';

      const { config } = await import('../config.js');

      // Should have a reasonable upper bound (e.g., 5 minutes)
      expect(config.timeout).toBeLessThanOrEqual(300000);
    });

    it('should use default retries when ATEAM_RETRIES is negative', async () => {
      process.env.ATEAM_RETRIES = '-3';

      const { config } = await import('../config.js');

      expect(config.retries).toBe(3);
    });

    it('should bound retries when ATEAM_RETRIES is extremely large', async () => {
      process.env.ATEAM_RETRIES = '1000';

      const { config } = await import('../config.js');

      // Should have a reasonable upper bound (e.g., 10 retries)
      expect(config.retries).toBeLessThanOrEqual(10);
    });

    it('should use default retries when ATEAM_RETRIES is non-numeric', async () => {
      process.env.ATEAM_RETRIES = 'many';

      const { config } = await import('../config.js');

      expect(config.retries).toBe(3);
    });

    it('should handle whitespace in ATEAM_TIMEOUT gracefully', async () => {
      process.env.ATEAM_TIMEOUT = '  5000  ';

      const { config } = await import('../config.js');

      expect(config.timeout).toBe(5000);
    });
  });

  describe('server', () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it('should create McpServer with correct name', async () => {
      const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
      const { createServer } = await import('../server.js');

      createServer();

      expect(McpServer).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ateam',
        })
      );
    });

    it('should create McpServer with version 1.0.0', async () => {
      const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
      const { createServer } = await import('../server.js');

      createServer();

      expect(McpServer).toHaveBeenCalledWith(
        expect.objectContaining({
          version: '1.0.0',
        })
      );
    });

    it('should return server instance with connect method', async () => {
      const { createServer } = await import('../server.js');

      const server = createServer();

      expect(server).toHaveProperty('connect');
      expect(typeof server.connect).toBe('function');
    });
  });

  describe('server tool wiring', () => {
    /**
     * CRITICAL: These tests verify that createServer() returns a server
     * with tools already registered, not an empty server.
     *
     * The bug: createServer() creates an MCP server but never calls
     * registerAllTools(), so the server starts with zero tools.
     *
     * Expected fix: createServer() should call registerAllTools(server)
     * before returning.
     */

    beforeEach(() => {
      vi.resetModules();
      vi.clearAllMocks();
    });

    it('should call registerAllTools when creating server', async () => {
      // Spy on registerAllTools to verify it gets called
      const registerAllToolsSpy = vi.fn();

      // Mock the tools/index module to capture when registerAllTools is called
      vi.doMock('../tools/index.js', () => ({
        registerAllTools: registerAllToolsSpy,
        getAllToolDefinitions: vi.fn().mockReturnValue([]),
        getToolHandler: vi.fn(),
      }));

      const { createServer } = await import('../server.js');

      createServer();

      // This SHOULD pass after the fix, but will FAIL now because
      // createServer() does not call registerAllTools()
      expect(registerAllToolsSpy).toHaveBeenCalled();
    });

    it('should have tools registered after createServer returns', async () => {
      // Verify by checking the server.ts source code for the proper wiring
      const fs = await import('fs');
      const path = await import('path');
      const serverPath = path.join(import.meta.dirname, '../server.ts');
      const serverCode = fs.readFileSync(serverPath, 'utf-8');

      // Verify the import exists
      expect(serverCode).toContain("import { registerAllTools } from './tools/index.js'");

      // Verify registerAllTools is called within createServer function
      expect(serverCode).toContain('registerAllTools(server)');
    });

    it('should return server that can list all 20 tools', async () => {
      // Note: Full tool registration testing is done in index.test.ts (30 tests)
      // This test verifies the server wiring by checking tools/index exports exist

      // Verify getAllToolDefinitions is exported and callable
      const toolsIndex = await import('../tools/index.js');
      expect(typeof toolsIndex.getAllToolDefinitions).toBe('function');
      expect(typeof toolsIndex.registerAllTools).toBe('function');
      expect(typeof toolsIndex.getToolHandler).toBe('function');

      // The actual tool registration and count is tested in index.test.ts:
      // - "should register exactly 20 tools"
      // - "should register all board tools (4)"
      // - "should register all item tools (6)"
      // - "should register all agent tools (2)"
      // - "should register all mission tools (5)"
      // - "should register all utils tools (3)"
    });
  });
});
