/**
 * API Route Handler for POST /api/board/claim
 *
 * Allows an agent to claim a work item, enforcing:
 * - Item must exist
 * - Item must be in a claimable stage (ready or in_progress)
 * - Item must not already be claimed by another agent (ITEM_CLAIMED)
 *
 * Note: Agents CAN claim multiple items simultaneously. The only limit
 * is the WIP limit per stage column.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  createValidationError,
  createItemNotFoundError,
  createDatabaseError,
  createClaimConflictError,
} from '@/lib/errors';
import { getAndValidateProjectId } from '@/lib/project-utils';
import { isAgentName } from '@/lib/api-validation';
import type { ClaimItemRequest, ClaimItemResponse, ApiError } from '@/types/api';
import type { AgentName } from '@/types/agent';

/**
 * Stages where items can be claimed.
 * Agents can claim items from ready or any work stage (including review for Lynch).
 */
const CLAIMABLE_STAGES = ['ready', 'testing', 'implementing', 'probing', 'review'];

/** Typed transaction error for item not found. */
class ItemNotFoundError extends Error {
  constructor(public readonly itemId: string) {
    super('ITEM_NOT_FOUND');
  }
}

/** Typed transaction error for invalid stage. */
class InvalidStageError extends Error {
  constructor(
    public readonly itemId: string,
    public readonly currentStage: string
  ) {
    super('INVALID_STAGE');
  }
}

/** Typed transaction error for item already claimed. */
class ItemClaimedError extends Error {
  constructor(
    public readonly itemId: string,
    public readonly claimedBy: string
  ) {
    super('ITEM_CLAIMED');
  }
}

/**
 * POST /api/board/claim
 *
 * Claim a work item for an agent.
 *
 * Request body: ClaimItemRequest { itemId: string, agent: AgentName }
 * Response: ClaimItemResponse with the new claim
 *
 * Error codes:
 * - VALIDATION_ERROR (400): Missing or invalid request fields
 * - ITEM_NOT_FOUND (404): Item does not exist
 * - INVALID_STAGE (400): Item is not in a claimable stage
 * - ITEM_CLAIMED (409): Item already claimed by another agent
 * - DATABASE_ERROR (500): Database operation failed
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ClaimItemResponse | ApiError>> {
  // Declare body at function scope so it's accessible in the catch block
  let body: ClaimItemRequest | undefined;

  try {
    const projectValidation = getAndValidateProjectId(request.headers);
    if (!projectValidation.valid) {
      const errorResponse: ApiError = {
        success: false,
        error: {
          code: projectValidation.error.code,
          message: projectValidation.error.message,
        },
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }
    const projectId = projectValidation.projectId;

    // Parse request body
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(createValidationError('Invalid JSON body').toResponse(), { status: 400 });
    }

    // Validate required fields
    if (!body || !body.itemId) {
      return NextResponse.json(createValidationError('itemId is required').toResponse(), { status: 400 });
    }

    if (!body.agent) {
      return NextResponse.json(createValidationError('agent is required').toResponse(), { status: 400 });
    }

    // Validate agent name
    if (!isAgentName(body.agent)) {
      return NextResponse.json(createValidationError(`Invalid agent name: ${body.agent}`).toResponse(), { status: 400 });
    }

    // Extract validated values to satisfy TypeScript
    const { itemId, agent } = body;

    // Create the claim and update item atomically within a transaction
    // All validation checks are inside the transaction to prevent TOCTOU race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Check if item exists and belongs to the specified project
      const item = await tx.item.findFirst({
        where: { id: itemId, projectId },
      });

      if (!item) {
        throw new ItemNotFoundError(itemId);
      }

      // Validate item is in a claimable stage
      if (!CLAIMABLE_STAGES.includes(item.stageId)) {
        throw new InvalidStageError(itemId, item.stageId);
      }

      // Check if item is already claimed by another agent
      const existingItemClaim = await tx.agentClaim.findFirst({
        where: { itemId },
      });

      if (existingItemClaim) {
        throw new ItemClaimedError(itemId, existingItemClaim.agentName);
      }

      // Create the claim
      const claim = await tx.agentClaim.create({
        data: {
          agentName: agent,
          itemId,
        },
      });

      // Update item's assigned agent
      const updatedItem = await tx.item.update({
        where: { id: itemId },
        data: { assignedAgent: agent },
      });

      return { claim, updatedItem };
    });

    // Return success response
    const response: ClaimItemResponse = {
      success: true,
      data: {
        agentName: result.claim.agentName as AgentName,
        itemId: result.claim.itemId,
        claimedAt: result.claim.claimedAt,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    // Handle typed errors thrown from inside the transaction
    if (error instanceof ItemNotFoundError) {
      return NextResponse.json(createItemNotFoundError(error.itemId).toResponse(), { status: 404 });
    }

    if (error instanceof InvalidStageError) {
      const errorResponse: ApiError = {
        success: false,
        error: {
          code: 'INVALID_STAGE',
          message: `Item cannot be claimed in stage: ${error.currentStage}`,
          details: {
            itemId: error.itemId,
            currentStage: error.currentStage,
            claimableStages: CLAIMABLE_STAGES,
          },
        },
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    if (error instanceof ItemClaimedError) {
      const errorResponse: ApiError = {
        success: false,
        error: {
          code: 'ITEM_CLAIMED',
          message: `Item ${error.itemId} is already claimed by ${error.claimedBy}`,
          details: {
            itemId: error.itemId,
            claimedBy: error.claimedBy,
          },
        },
      };
      return NextResponse.json(errorResponse, { status: 409 });
    }

    console.error('POST /api/board/claim error:', error);

    // Check for unique constraint violation (P2002) indicating concurrent claim conflict
    // This serves as a fallback safety net for race conditions not caught by the transaction checks
    const isPrismaError =
      error && typeof error === 'object' && 'code' in error && 'meta' in error;
    if (isPrismaError) {
      const prismaError = error as { code: string; meta?: { target?: string[] }; message?: string };
      if (prismaError.code === 'P2002') {
        // Unique constraint violation on itemId - item was claimed by another agent
        return NextResponse.json(
          createClaimConflictError(body?.itemId ?? 'unknown').toResponse(),
          { status: 409 }
        );
      }
    }

    return NextResponse.json(createDatabaseError('Failed to create claim', error).toResponse(), { status: 500 });
  }
}
