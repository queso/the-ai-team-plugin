/**
 * Board Tools for the A(i)-Team MCP Server.
 * Provides MCP tools for managing the kanban board state.
 */
import { z } from 'zod';
import { createClient, ApiRequestError } from '../client/index.js';
import { config } from '../config.js';
/**
 * Valid agent names (lowercase for input validation).
 */
const VALID_AGENTS_LOWER = [
    'murdock',
    'ba',
    'lynch',
    'amy',
    'hannibal',
    'face',
    'sosa',
    'tawnia',
];
/**
 * Map from lowercase agent names to API-expected format.
 */
const AGENT_NAME_MAP = {
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
function normalizeAgentName(val) {
    return val.toLowerCase().replace(/\./g, '');
}
/**
 * Zod schema for agent name validation.
 * Accepts case-insensitive input, validates, and transforms to API format.
 */
const AgentNameSchema = z
    .string()
    .transform((val) => normalizeAgentName(val))
    .refine((val) => VALID_AGENTS_LOWER.includes(val), {
    message: `Invalid agent name. Must be one of: ${VALID_AGENTS_LOWER.join(', ')}`,
})
    .transform((val) => AGENT_NAME_MAP[val]);
/**
 * Valid stage transitions for the kanban board.
 * Used to provide actionable guidance when an invalid transition is attempted.
 */
const VALID_TRANSITIONS = {
    briefings: ['ready', 'blocked'],
    ready: ['testing', 'implementing', 'probing', 'blocked', 'briefings'],
    testing: ['review', 'blocked'],
    implementing: ['review', 'blocked'],
    probing: ['ready', 'done', 'blocked'],
    review: ['done', 'testing', 'implementing', 'probing', 'blocked'],
    done: [],
    blocked: ['ready'],
};
/**
 * Zod schema for board_read input (empty object).
 */
export const BoardReadInputSchema = z.object({});
/**
 * Zod schema for board_move input.
 */
export const BoardMoveInputSchema = z.object({
    itemId: z.string().min(1, 'itemId is required'),
    to: z.string().min(1, 'target stage is required'),
});
/**
 * Zod schema for board_claim input.
 * Agent name accepts lowercase (murdock, ba, lynch, amy) and transforms to API format.
 */
export const BoardClaimInputSchema = z.object({
    itemId: z.string().min(1, 'itemId is required'),
    agent: AgentNameSchema,
});
/**
 * Zod schema for board_release input.
 */
export const BoardReleaseInputSchema = z.object({
    itemId: z.string().min(1, 'itemId is required'),
});
/**
 * Create a default HTTP client using the config.
 */
function getDefaultClient() {
    return createClient({
        baseUrl: config.apiUrl,
        projectId: config.projectId,
        apiKey: config.apiKey,
        timeout: config.timeout,
        retries: config.retries,
    });
}
/**
 * Read the full board state.
 *
 * @param _input - Unused input parameter (required for MCP handler signature)
 * @returns The full board state as structured JSON
 */
export async function boardRead(_input) {
    const client = getDefaultClient();
    const result = await client.get('/api/board');
    return {
        content: [{ type: 'text', text: JSON.stringify(result.data) }],
        data: result.data,
    };
}
/**
 * Move an item to a target stage.
 * Validates stage transitions and enforces WIP limits.
 *
 * @param input - The move parameters (itemId, to)
 * @param client - Optional HTTP client (uses default if not provided)
 * @returns The move result or validation error
 */
export async function boardMove(input, client = getDefaultClient()) {
    const parsed = BoardMoveInputSchema.safeParse(input);
    if (!parsed.success) {
        return {
            isError: true,
            code: 'VALIDATION_ERROR',
            message: parsed.error.errors[0].message,
        };
    }
    try {
        const result = await client.post('/api/board/move', {
            itemId: input.itemId,
            toStage: input.to,
        });
        return {
            content: [{ type: 'text', text: JSON.stringify(result.data) }],
            data: result.data,
        };
    }
    catch (error) {
        if (error instanceof ApiRequestError) {
            // Extract 'from' stage from error details if available
            const details = error.details;
            const fromStage = details?.from;
            const toStage = details?.to ?? input.to;
            let message = error.message;
            // Build actionable guidance for invalid transitions
            if (error.code === 'INVALID_TRANSITION' && fromStage && VALID_TRANSITIONS[fromStage]) {
                const validNext = VALID_TRANSITIONS[fromStage];
                const suggestedStage = validNext[0]; // First valid option (usually the main path)
                message = `Cannot move directly from '${fromStage}' to '${toStage}'. `;
                message += `Move to '${suggestedStage}' first and verify the work is complete before proceeding. `;
                message += `Valid next stages: ${validNext.join(', ')}.`;
            }
            return {
                isError: true,
                code: error.code,
                message,
            };
        }
        throw error;
    }
}
/**
 * Claim an item for an agent.
 * Detects and rejects conflicts when item is already claimed.
 *
 * @param input - The claim parameters (itemId, agent)
 * @param client - Optional HTTP client (uses default if not provided)
 * @returns The claim result or validation error
 */
export async function boardClaim(input, client = getDefaultClient()) {
    const parsed = BoardClaimInputSchema.safeParse(input);
    if (!parsed.success) {
        return {
            isError: true,
            code: 'VALIDATION_ERROR',
            message: parsed.error.errors[0].message,
        };
    }
    const result = await client.post('/api/board/claim', {
        itemId: input.itemId,
        agent: input.agent,
    });
    return {
        content: [{ type: 'text', text: JSON.stringify(result.data) }],
        data: result.data,
    };
}
/**
 * Release an item's agent assignment.
 * Handles unclaimed items gracefully (idempotent).
 *
 * @param input - The release parameters (itemId)
 * @param client - Optional HTTP client (uses default if not provided)
 * @returns The release result or validation error
 */
export async function boardRelease(input, client = getDefaultClient()) {
    const parsed = BoardReleaseInputSchema.safeParse(input);
    if (!parsed.success) {
        return {
            isError: true,
            code: 'VALIDATION_ERROR',
            message: parsed.error.errors[0].message,
        };
    }
    const result = await client.post('/api/board/release', {
        itemId: input.itemId,
    });
    return {
        content: [{ type: 'text', text: JSON.stringify(result.data) }],
        data: result.data,
    };
}
/**
 * Tool definitions for MCP registration.
 */
export const boardTools = {
    board_read: {
        name: 'board_read',
        description: 'Returns full board state as structured JSON',
        inputSchema: BoardReadInputSchema,
        handler: boardRead,
    },
    board_move: {
        name: 'board_move',
        description: 'Validates stage transitions and enforces WIP limits',
        inputSchema: BoardMoveInputSchema,
        handler: boardMove,
    },
    board_claim: {
        name: 'board_claim',
        description: 'Assigns agent to item with conflict detection',
        inputSchema: BoardClaimInputSchema,
        handler: boardClaim,
    },
    board_release: {
        name: 'board_release',
        description: 'Removes agent assignment from item',
        inputSchema: BoardReleaseInputSchema,
        handler: boardRelease,
    },
};
//# sourceMappingURL=board.js.map