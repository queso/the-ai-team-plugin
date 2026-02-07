import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Tests for consistent HTTP client configuration across all tool modules.
 *
 * All tool modules should use config.timeout and config.retries from config.ts
 * instead of hardcoding values. board.ts demonstrates the correct pattern via
 * getDefaultClient(). The other modules (agents.ts, items.ts, missions.ts, utils.ts)
 * should follow the same pattern.
 *
 * Bug: WI-119 - agents.ts hardcodes retries: 0 (critical - agent_stop has no retries!)
 *       items.ts, missions.ts, utils.ts hardcode timeout: 30000, retries: 3
 */

const toolsDir = join(import.meta.dirname, '..', 'tools');

/** All tool modules that create HTTP clients */
const TOOL_MODULES = ['board.ts', 'agents.ts', 'items.ts', 'missions.ts', 'utils.ts'];

/**
 * Read the source of a tool module.
 */
function readToolSource(filename: string): string {
  return readFileSync(join(toolsDir, filename), 'utf-8');
}

describe('HTTP client configuration consistency (WI-119)', () => {
  it('no tool module should hardcode timeout values in createClient calls', () => {
    const modulesWithHardcodedTimeout: string[] = [];

    for (const mod of TOOL_MODULES) {
      const source = readToolSource(mod);
      // Match createClient calls that contain a hardcoded numeric timeout
      // e.g. timeout: 30000 (literal number, not config.timeout)
      const createClientBlocks = source.match(/createClient\(\{[\s\S]*?\}\)/g) ?? [];
      for (const block of createClientBlocks) {
        // Check for hardcoded timeout (a number literal, not config.timeout)
        if (/timeout:\s*\d+/.test(block)) {
          modulesWithHardcodedTimeout.push(mod);
          break;
        }
      }
    }

    expect(
      modulesWithHardcodedTimeout,
      `These modules hardcode timeout in createClient instead of using config.timeout: ${modulesWithHardcodedTimeout.join(', ')}`
    ).toEqual([]);
  });

  it('no tool module should hardcode retries values in createClient calls', () => {
    const modulesWithHardcodedRetries: string[] = [];

    for (const mod of TOOL_MODULES) {
      const source = readToolSource(mod);
      const createClientBlocks = source.match(/createClient\(\{[\s\S]*?\}\)/g) ?? [];
      for (const block of createClientBlocks) {
        // Check for hardcoded retries (a number literal, not config.retries)
        if (/retries:\s*\d+/.test(block)) {
          modulesWithHardcodedRetries.push(mod);
          break;
        }
      }
    }

    expect(
      modulesWithHardcodedRetries,
      `These modules hardcode retries in createClient instead of using config.retries: ${modulesWithHardcodedRetries.join(', ')}`
    ).toEqual([]);
  });

  it('agents.ts must not use retries: 0 (agent_stop needs retries for reliability)', () => {
    const source = readToolSource('agents.ts');
    const createClientBlocks = source.match(/createClient\(\{[\s\S]*?\}\)/g) ?? [];

    for (const block of createClientBlocks) {
      expect(block, 'agents.ts createClient call contains retries: 0 -- agent_stop will have no retries!').not.toMatch(
        /retries:\s*0/
      );
    }
  });

  it('all tool modules should use config.timeout and config.retries in createClient calls', () => {
    const modulesNotUsingConfig: string[] = [];

    for (const mod of TOOL_MODULES) {
      const source = readToolSource(mod);
      const createClientBlocks = source.match(/createClient\(\{[\s\S]*?\}\)/g) ?? [];

      for (const block of createClientBlocks) {
        const usesConfigTimeout = /config\.timeout/.test(block);
        const usesConfigRetries = /config\.retries/.test(block);

        if (!usesConfigTimeout || !usesConfigRetries) {
          modulesNotUsingConfig.push(mod);
          break;
        }
      }
    }

    expect(
      modulesNotUsingConfig,
      `These modules do not use config.timeout and config.retries: ${modulesNotUsingConfig.join(', ')}`
    ).toEqual([]);
  });
});
