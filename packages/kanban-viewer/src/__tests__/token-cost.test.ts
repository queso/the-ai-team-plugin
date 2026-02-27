/**
 * Smoke tests for calculateTokenCost() utility (WI-278).
 *
 * calculateTokenCost(tokens, model) computes estimated USD cost given
 * token counts and a model name. Uses a pricing config structured as:
 *   {
 *     models: {
 *       "model-name": { input_per_1m, output_per_1m, cache_read_per_1m }
 *     },
 *     fallback: { input_per_1m, output_per_1m, cache_read_per_1m }
 *   }
 *
 * cache_creation tokens are billed at the input rate.
 * cache_read tokens are billed at the discounted cache_read rate.
 *
 * The function lives at: packages/kanban-viewer/src/lib/token-cost.ts
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { calculateTokenCost } from '@/lib/token-cost';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('calculateTokenCost() - known model pricing', () => {
  it('should calculate correct USD cost for claude-sonnet-4-6 with all token types', () => {
    // claude-sonnet-4-6 pricing (per 1M tokens):
    //   input: $3.00, output: $15.00, cache_read: $0.30
    // cache_creation is billed at input rate
    const tokens = {
      inputTokens: 1_000_000,       // $3.00
      outputTokens: 1_000_000,      // $15.00
      cacheCreationTokens: 1_000_000, // $3.00 (input rate)
      cacheReadTokens: 1_000_000,   // $0.30
    };

    const result = calculateTokenCost(tokens, 'claude-sonnet-4-6');

    // Total: $3.00 + $15.00 + $3.00 + $0.30 = $21.30
    expect(result.totalUsd).toBeCloseTo(21.30, 2);
    expect(result.model).toBe('claude-sonnet-4-6');
    expect(result.usedFallback).toBe(false);
  });
});

describe('calculateTokenCost() - fallback pricing', () => {
  it('should use fallback rates and set usedFallback=true for unrecognized model', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const tokens = {
      inputTokens: 1_000_000,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
    };

    const result = calculateTokenCost(tokens, 'unknown-model-xyz');

    // Should not throw; usedFallback signals the caller
    expect(result.usedFallback).toBe(true);
    expect(result.model).toBe('unknown-model-xyz');
    // Should have logged a warning
    expect(consoleSpy).toHaveBeenCalled();
    // Cost should be a non-negative number (fallback rate applied)
    expect(result.totalUsd).toBeGreaterThanOrEqual(0);
  });
});

describe('calculateTokenCost() - edge case: zero tokens', () => {
  it('should return $0.00 when all token counts are zero', () => {
    const tokens = {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
    };

    const result = calculateTokenCost(tokens, 'claude-sonnet-4-6');

    expect(result.totalUsd).toBe(0);
    expect(result.usedFallback).toBe(false);
  });
});
