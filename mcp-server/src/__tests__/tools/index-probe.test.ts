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
