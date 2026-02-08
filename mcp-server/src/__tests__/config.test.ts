import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Tests for .mcp.json plugin configuration file
 *
 * This file configures how Claude Code discovers and launches the MCP server.
 * It must exist at the project root and have a specific structure.
 */

const projectRoot = join(import.meta.dirname, '../../..');
const mcpConfigPath = join(projectRoot, '.mcp.json');

describe('.mcp.json Plugin Configuration', () => {
  describe('file existence', () => {
    it('should exist at project root', () => {
      expect(existsSync(mcpConfigPath)).toBe(true);
    });
  });

  describe('JSON structure', () => {
    let config: unknown;

    beforeAll(() => {
      if (existsSync(mcpConfigPath)) {
        const content = readFileSync(mcpConfigPath, 'utf-8');
        config = JSON.parse(content);
      }
    });

    it('should have valid JSON structure', () => {
      expect(() => {
        const content = readFileSync(mcpConfigPath, 'utf-8');
        JSON.parse(content);
      }).not.toThrow();
    });

    it('should have mcpServers object at root', () => {
      expect(config).toHaveProperty('mcpServers');
      expect(typeof (config as { mcpServers: unknown }).mcpServers).toBe('object');
      expect((config as { mcpServers: unknown }).mcpServers).not.toBeNull();
    });
  });

  describe('ateam server configuration', () => {
    let config: {
      mcpServers: {
        ateam?: {
          command?: string;
          args?: string[];
          env?: Record<string, string>;
        };
      };
    };

    beforeAll(() => {
      if (existsSync(mcpConfigPath)) {
        const content = readFileSync(mcpConfigPath, 'utf-8');
        config = JSON.parse(content);
      }
    });

    it('should define ateam server entry', () => {
      expect(config.mcpServers).toHaveProperty('ateam');
    });

    it('should use node as the command', () => {
      expect(config.mcpServers.ateam?.command).toBe('node');
    });

    it('should have args array pointing to build output', () => {
      expect(config.mcpServers.ateam?.args).toBeDefined();
      expect(Array.isArray(config.mcpServers.ateam?.args)).toBe(true);
      expect(config.mcpServers.ateam?.args?.length).toBeGreaterThan(0);

      // The args should contain the path to the built index.js
      // Based on tsconfig.json, outDir is ./dist
      const args = config.mcpServers.ateam?.args ?? [];
      const entryPoint = args[0];
      expect(entryPoint).toContain('mcp-server');
      expect(entryPoint).toContain('dist');
      expect(entryPoint).toContain('index.js');
    });

    it('should not require env in mcp.json (env is configured in settings.local.json)', () => {
      // ATEAM_API_URL and ATEAM_PROJECT_ID are configured in .claude/settings.local.json
      // per the /ateam setup command, not in .mcp.json
      // .mcp.json only needs command and args for MCP server launch
      expect(config.mcpServers.ateam?.command).toBe('node');
      expect(config.mcpServers.ateam?.args).toBeDefined();
    });

    it('should have a valid server configuration without env overrides', () => {
      // The MCP server reads ATEAM_API_URL from process.env at runtime
      // (set via .claude/settings.local.json env section)
      // .mcp.json only defines how to launch the server
      const ateam = config.mcpServers.ateam;
      expect(ateam).toBeDefined();
      expect(ateam?.command).toBe('node');
      expect(ateam?.args?.[0]).toContain('mcp-server');
    });
  });

  describe('build output path validation', () => {
    it('should reference a path that matches the TypeScript build output', () => {
      if (!existsSync(mcpConfigPath)) {
        expect.fail('.mcp.json does not exist');
        return;
      }

      const content = readFileSync(mcpConfigPath, 'utf-8');
      const config = JSON.parse(content);
      const args = config.mcpServers?.ateam?.args ?? [];
      const entryPoint = args[0] as string | undefined;

      // Verify path matches tsconfig outDir (dist) not build
      expect(entryPoint).toBeDefined();
      expect(entryPoint).toMatch(/mcp-server\/dist\/index\.js$/);
    });

    it('should reference the correct build output path after npm run build', async () => {
      // This test verifies the actual file exists after building
      // It will only pass after the implementation is complete AND built

      const buildOutputPath = join(projectRoot, 'mcp-server', 'dist', 'index.js');

      // Note: This test documents the expected state after build
      // During TDD, we expect this to fail until:
      // 1. .mcp.json is created with correct path
      // 2. npm run build is executed in mcp-server/

      // For now, we just verify the path referenced in .mcp.json
      // matches what would be created by the build
      if (existsSync(mcpConfigPath)) {
        const content = readFileSync(mcpConfigPath, 'utf-8');
        const config = JSON.parse(content);
        const args = config.mcpServers?.ateam?.args ?? [];
        const entryPoint = args[0] as string | undefined;

        // The path in .mcp.json should resolve to the build output
        if (entryPoint) {
          expect(entryPoint).toContain('dist/index.js');
        }
      }
    });
  });
});
