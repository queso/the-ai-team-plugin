/**
 * Shared agent name validation module.
 *
 * Centralizes agent name constants, normalization, and Zod schema
 * used across board, agents, and utils tool modules.
 */
import { z } from 'zod';
import { VALID_AGENTS, AGENT_DISPLAY_NAMES, normalizeAgentName as sharedNormalizeAgentName, } from '@ai-team/shared';
/**
 * Valid agent names (lowercase for input validation).
 * Re-exported from @ai-team/shared for backward compatibility.
 */
export const VALID_AGENTS_LOWER = VALID_AGENTS;
/**
 * Map from lowercase agent names to API-expected format.
 * Re-exported from @ai-team/shared for backward compatibility.
 */
export const AGENT_NAME_MAP = AGENT_DISPLAY_NAMES;
/**
 * Normalize agent name to lowercase key format.
 * Handles special cases like "B.A." -> "ba"
 * Re-exported from @ai-team/shared.
 */
export const normalizeAgentName = sharedNormalizeAgentName;
/**
 * Zod schema for agent name validation.
 * Accepts case-insensitive input, validates, and transforms to API format.
 */
export const AgentNameSchema = z
    .string()
    .transform((val) => normalizeAgentName(val))
    .refine((val) => VALID_AGENTS_LOWER.includes(val), {
    message: `Invalid agent name. Must be one of: ${VALID_AGENTS_LOWER.join(', ')}`,
})
    .transform((val) => AGENT_NAME_MAP[val]);
//# sourceMappingURL=agents.js.map