/**
 * Board Tools for the A(i)-Team MCP Server.
 * Provides MCP tools for managing the kanban board state.
 */

import { z } from 'zod';
import { TRANSITION_MATRIX, PIPELINE_STAGES } from '@ai-team/shared';
import { createClient, BoardState, KanbanApiClient, ApiRequestError } from '../client/index.js';
import { config } from '../config.js';
import { AgentNameSchema } from '../lib/agents.js';
import type { ToolResponse, ToolErrorResponse } from '../lib/tool-response.js';

/**
 * Valid stage transitions for the kanban board.
 * Used to provide actionable guidance when an invalid transition is attempted.
 */
const VALID_TRANSITIONS = TRANSITION_MATRIX;

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
 * Input types derived from Zod schemas.
 */
export type BoardReadInput = z.infer<typeof BoardReadInputSchema>;
export type BoardMoveInput = z.infer<typeof BoardMoveInputSchema>;
export type BoardClaimInput = z.infer<typeof BoardClaimInputSchema>;
export type BoardReleaseInput = z.infer<typeof BoardReleaseInputSchema>;

/**
 * Result type for board_move operation.
 */
export interface MoveResult {
  success: boolean;
  itemId: string;
  from: string;
  to: string;
}

/**
 * Result type for board_claim operation.
 */
export interface ClaimResult {
  success: boolean;
  itemId: string;
  agent: string;
}

/**
 * Result type for board_release operation.
 */
export interface ReleaseResult {
  success: boolean;
  itemId: string;
}

export type { ToolResponse, ToolErrorResponse };

/**
 * Create a default HTTP client using the config.
 */
function getDefaultClient(): KanbanApiClient {
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
export async function boardRead(
  _input?: BoardReadInput
): Promise<ToolResponse<BoardState>> {
  const client = getDefaultClient();
  const result = await client.get<BoardState>('/api/board');
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
export async function boardMove(
  input: BoardMoveInput,
  client: KanbanApiClient = getDefaultClient()
): Promise<ToolResponse<MoveResult> | ToolErrorResponse> {
  const parsed = BoardMoveInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      isError: true,
      code: 'VALIDATION_ERROR',
      message: parsed.error.errors[0].message,
    };
  }

  try {
    const result = await client.post<MoveResult>('/api/board/move', {
      itemId: input.itemId,
      toStage: input.to,
    });
    return {
      content: [{ type: 'text', text: JSON.stringify(result.data) }],
      data: result.data,
    };
  } catch (error) {
    if (error instanceof ApiRequestError) {
      // Extract 'from' stage from error details if available
      const details = error.details as { from?: string; to?: string } | undefined;
      const fromStage = details?.from;
      const toStage = details?.to ?? input.to;

      let message = error.message;

      // Build actionable guidance for invalid transitions
      if (error.code === 'INVALID_TRANSITION' && fromStage && fromStage in VALID_TRANSITIONS) {
        const validNext = VALID_TRANSITIONS[fromStage as keyof typeof VALID_TRANSITIONS];
        const pipelineInfo = PIPELINE_STAGES[fromStage as keyof typeof PIPELINE_STAGES];

        message = `Cannot move directly from '${fromStage}' to '${toStage}'. `;

        if (pipelineInfo?.nextStage) {
          const nextInfo = PIPELINE_STAGES[pipelineInfo.nextStage as keyof typeof PIPELINE_STAGES];
          message += `The pipeline requires moving to '${pipelineInfo.nextStage}' next. `;
          if (nextInfo) {
            message += `Dispatch ${nextInfo.agentDisplay} to claim this item — ${nextInfo.agentDisplay} ${nextInfo.description}. `;
          }
        } else {
          message += `Valid next stages: ${validNext.join(', ')}. `;
        }

        message += "No stage in the pipeline may be skipped. ";
        message += `Allowed transitions from '${fromStage}': ${validNext.join(', ')}.`;
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
export async function boardClaim(
  input: BoardClaimInput,
  client: KanbanApiClient = getDefaultClient()
): Promise<ToolResponse<ClaimResult> | ToolErrorResponse> {
  const parsed = BoardClaimInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      isError: true,
      code: 'VALIDATION_ERROR',
      message: parsed.error.errors[0].message,
    };
  }

  const result = await client.post<ClaimResult>('/api/board/claim', {
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
export async function boardRelease(
  input: BoardReleaseInput,
  client: KanbanApiClient = getDefaultClient()
): Promise<ToolResponse<ReleaseResult> | ToolErrorResponse> {
  const parsed = BoardReleaseInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      isError: true,
      code: 'VALIDATION_ERROR',
      message: parsed.error.errors[0].message,
    };
  }

  const result = await client.post<ReleaseResult>('/api/board/release', {
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
