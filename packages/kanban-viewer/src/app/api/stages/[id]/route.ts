/**
 * API Route Handler for /api/stages/[id]
 *
 * PATCH - Update a stage's WIP limit
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  createValidationError,
  createDatabaseError,
  ApiError,
} from '@/lib/errors';

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface StageResponse {
  id: string;
  name: string;
  order: number;
  wipLimit: number | null;
}

/**
 * Create a stage not found error.
 * Uses a specific error code for stage lookup failures.
 */
function createStageNotFoundError(stageId: string): ApiError {
  return new ApiError(
    'STAGE_NOT_FOUND',
    `Stage '${stageId}' not found`,
    { stageId }
  );
}

/**
 * Validate that wipLimit is a valid value.
 * Valid values are:
 * - null (unlimited)
 * - 0 (treated as unlimited, converted to null)
 * - Positive integers (1, 2, 3, ...)
 *
 * Returns the normalized value (null for unlimited, positive int otherwise).
 */
function validateWipLimit(value: unknown): { valid: true; value: number | null } | { valid: false; message: string } {
  // null is valid (unlimited)
  if (value === null) {
    return { valid: true, value: null };
  }

  // Must be a number
  if (typeof value !== 'number') {
    return { valid: false, message: 'wipLimit must be a number or null' };
  }

  // Must be an integer
  if (!Number.isInteger(value)) {
    return { valid: false, message: 'wipLimit must be an integer' };
  }

  // Zero means unlimited
  if (value === 0) {
    return { valid: true, value: null };
  }

  // Negative numbers are invalid
  if (value < 0) {
    return { valid: false, message: 'wipLimit must be a positive integer or null' };
  }

  return { valid: true, value };
}

/**
 * PATCH /api/stages/[id]
 *
 * Update a stage's WIP limit.
 * Accepts { wipLimit: number | null } in the request body.
 * Zero is treated as unlimited (null).
 *
 * Returns the updated stage on success.
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id: stageId } = await context.params;

    // Parse request body
    let body: { wipLimit?: unknown };
    try {
      body = await request.json();
    } catch {
      const error = createValidationError('Invalid JSON body');
      return NextResponse.json(error.toResponse(), { status: 400 });
    }

    // Check if wipLimit is present in body
    if (!('wipLimit' in body)) {
      const error = createValidationError('wipLimit is required');
      return NextResponse.json(error.toResponse(), { status: 400 });
    }

    // Validate wipLimit value
    const validation = validateWipLimit(body.wipLimit);
    if (!validation.valid) {
      const error = createValidationError(validation.message);
      return NextResponse.json(error.toResponse(), { status: 400 });
    }

    const normalizedWipLimit = validation.value;

    // Check if stage exists
    const existingStage = await prisma.stage.findUnique({
      where: { id: stageId },
    });

    if (!existingStage) {
      const error = createStageNotFoundError(stageId);
      return NextResponse.json(error.toResponse(), { status: 404 });
    }

    // Update the stage
    const updatedStage = await prisma.stage.update({
      where: { id: stageId },
      data: { wipLimit: normalizedWipLimit },
    });

    const response: StageResponse = {
      id: updatedStage.id,
      name: updatedStage.name,
      order: updatedStage.order,
      wipLimit: updatedStage.wipLimit,
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error('PATCH /api/stages/[id] error:', error);
    const apiError = createDatabaseError('Failed to update stage', error);
    return NextResponse.json(apiError.toResponse(), { status: 500 });
  }
}
