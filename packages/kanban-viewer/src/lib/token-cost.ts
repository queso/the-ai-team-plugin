/**
 * token-cost.ts - Token usage cost calculator.
 *
 * Calculates estimated USD cost from token counts and model name.
 * Uses built-in pricing config; falls back to default rates for unknown models.
 */

interface ModelPricing {
  input_per_1m: number;
  output_per_1m: number;
  cache_read_per_1m: number;
}

interface PricingConfig {
  models: Record<string, ModelPricing>;
  fallback: ModelPricing;
}

export interface TokenCounts {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

export interface TokenCostResult {
  totalUsd: number;
  model: string;
  usedFallback: boolean;
}

/** Built-in pricing config (USD per 1M tokens). */
const DEFAULT_PRICING: PricingConfig = {
  models: {
    'claude-opus-4-6': {
      input_per_1m: 15.00,
      output_per_1m: 75.00,
      cache_read_per_1m: 1.50,
    },
    'claude-sonnet-4-6': {
      input_per_1m: 3.00,
      output_per_1m: 15.00,
      cache_read_per_1m: 0.30,
    },
    'claude-haiku-4-5-20251001': {
      input_per_1m: 0.80,
      output_per_1m: 4.00,
      cache_read_per_1m: 0.08,
    },
  },
  fallback: {
    input_per_1m: 3.00,
    output_per_1m: 15.00,
    cache_read_per_1m: 0.30,
  },
};

/**
 * Calculates the estimated USD cost for a set of token counts and model.
 *
 * Cache creation tokens are billed at the input rate.
 * Cache read tokens are billed at the discounted cache_read rate.
 *
 * @param tokens - Token count breakdown
 * @param model - Model name (e.g., 'claude-sonnet-4-6')
 * @param pricingConfig - Optional override for pricing config
 */
export function calculateTokenCost(
  tokens: TokenCounts,
  model: string,
  pricingConfig: PricingConfig = DEFAULT_PRICING
): TokenCostResult {
  const pricing = pricingConfig.models[model];
  let usedFallback = false;
  let rates: ModelPricing;

  if (!pricing) {
    console.warn(`[token-cost] Unknown model "${model}", using fallback pricing`);
    rates = pricingConfig.fallback;
    usedFallback = true;
  } else {
    rates = pricing;
  }

  const inputCost = (tokens.inputTokens / 1_000_000) * rates.input_per_1m;
  const outputCost = (tokens.outputTokens / 1_000_000) * rates.output_per_1m;
  const cacheCreationCost = (tokens.cacheCreationTokens / 1_000_000) * rates.input_per_1m;
  const cacheReadCost = (tokens.cacheReadTokens / 1_000_000) * rates.cache_read_per_1m;

  const totalUsd = inputCost + outputCost + cacheCreationCost + cacheReadCost;

  return { totalUsd, model, usedFallback };
}
