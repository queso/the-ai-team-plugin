/**
 * Shared agent name validation module.
 *
 * Centralizes agent name constants, normalization, and Zod schema
 * used across board, agents, and utils tool modules.
 */

import { z } from 'zod';

/**
 * Valid agent names (lowercase for input validation).
 */
export const VALID_AGENTS_LOWER = [
  'murdock',
  'ba',
  'lynch',
  'amy',
  'hannibal',
  'face',
  'sosa',
  'tawnia',
] as const;

export type ValidAgentLower = (typeof VALID_AGENTS_LOWER)[number];

/**
 * Map from lowercase agent names to API-expected format.
 */
export const AGENT_NAME_MAP: Record<ValidAgentLower, string> = {
  murdock: 'Murdock',
  ba: 'B.A.',
  lynch: 'Lynch',
  amy: 'Amy',
  hannibal: 'Hannibal',
  face: 'Face',
  sosa: 'Sosa',
  tawnia: 'Tawnia',
};

/**
 * Normalize agent name to lowercase key format.
 * Handles special cases like "B.A." -> "ba"
 */
export function normalizeAgentName(val: string): string {
  return val.toLowerCase().replace(/\./g, '');
}

/**
 * Zod schema for agent name validation.
 * Accepts case-insensitive input, validates, and transforms to API format.
 */
export const AgentNameSchema = z
  .string()
  .transform((val) => normalizeAgentName(val) as ValidAgentLower)
  .refine((val): val is ValidAgentLower => VALID_AGENTS_LOWER.includes(val), {
    message: `Invalid agent name. Must be one of: ${VALID_AGENTS_LOWER.join(', ')}`,
  })
  .transform((val) => AGENT_NAME_MAP[val]);
