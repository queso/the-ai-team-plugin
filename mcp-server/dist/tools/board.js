/**
 * Board Tools for the A(i)-Team MCP Server.
 * Provides MCP tools for managing the kanban board state.
 */
import { z } from 'zod';
import { createClient } from '../client/index.js';
import { config } from '../config.js';
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
 */
export const BoardClaimInputSchema = z.object({
    itemId: z.string().min(1, 'itemId is required'),
    agent: z.string().min(1, 'agent name is required'),
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
        apiKey: config.apiKey,
        timeout: config.timeout,
        retries: config.retries,
    });
}
/**
 * Read the full board state.
 *
 * @param client - Optional HTTP client (uses default if not provided)
 * @returns The full board state as structured JSON
 */
export async function boardRead(client = getDefaultClient()) {
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
    const result = await client.post('/api/board/move', {
        itemId: input.itemId,
        to: input.to,
    });
    return {
        content: [{ type: 'text', text: JSON.stringify(result.data) }],
        data: result.data,
    };
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