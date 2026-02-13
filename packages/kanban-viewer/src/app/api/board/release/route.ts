import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  createValidationError,
  createItemNotFoundError,
  createDatabaseError,
} from '@/lib/errors';
import { getAndValidateProjectId } from '@/lib/project-utils';
import type { ReleaseItemRequest, ReleaseItemResponse, ApiError } from '@/types/api';
import type { AgentName } from '@/types/agent';

/**
 * POST /api/board/release
 *
 * Releases an agent's claim on a work item, freeing them to claim another item.
 * This is typically called when an agent finishes work or abandons a task.
 *
 * Request body: ReleaseItemRequest { itemId: string }
 *
 * Responses:
 * - 200: Successfully released claim (ReleaseItemResponse)
 * - 400: VALIDATION_ERROR (missing itemId or invalid JSON)
 * - 400: NOT_CLAIMED (item has no active claim)
 * - 404: ITEM_NOT_FOUND (item does not exist)
 * - 500: DATABASE_ERROR (database operation failed)
 */
export async function POST(request: NextRequest): Promise<NextResponse<ReleaseItemResponse | ApiError>> {
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

  let body: ReleaseItemRequest;

  // Parse and validate request body
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(createValidationError('Invalid JSON body').toResponse(), { status: 400 });
  }

  // Validate itemId is present
  if (!body.itemId) {
    return NextResponse.json(createValidationError('itemId is required').toResponse(), { status: 400 });
  }

  const { itemId } = body;

  try {
    // Check if item exists and belongs to the specified project
    const item = await prisma.item.findFirst({
      where: { id: itemId, projectId },
    });

    if (!item) {
      return NextResponse.json(createItemNotFoundError(itemId).toResponse(), { status: 404 });
    }

    // Check if item has an active claim
    const claim = await prisma.agentClaim.findFirst({
      where: { itemId, item: { projectId } },
    });

    if (!claim) {
      // Idempotent: return success even if not claimed, with null agent
      const response: ReleaseItemResponse = {
        success: true,
        data: {
          released: false,
          agent: null,
        },
      };
      return NextResponse.json(response, { status: 200 });
    }

    // Delete the claim (by itemId, which is unique)
    await prisma.agentClaim.delete({
      where: { itemId },
    });

    const response: ReleaseItemResponse = {
      success: true,
      data: {
        released: true,
        agent: claim.agentName as AgentName,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return NextResponse.json(createDatabaseError('Database error', error).toResponse(), { status: 500 });
  }
}
