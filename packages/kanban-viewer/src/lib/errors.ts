/**
 * API Error types and factory functions for the Kanban Viewer API layer.
 *
 * Provides standardized error handling with consistent error codes
 * and response formats as specified in PRD 013-mcp-interface.md.
 */

import { ERROR_CODES as SHARED_ERROR_CODES } from '@ai-team/shared';

/**
 * Error codes for all API errors.
 * These codes should be used for programmatic error handling.
 *
 * Combines shared error codes with kanban-viewer-specific codes.
 */
export const ErrorCodes = {
  ...SHARED_ERROR_CODES,
  INVALID_STAGE: 'INVALID_STAGE',
  DEPENDENCY_CYCLE: 'DEPENDENCY_CYCLE',
  OUTPUT_COLLISION: 'OUTPUT_COLLISION',
  CLAIM_CONFLICT: 'CLAIM_CONFLICT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  SERVER_ERROR: 'SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * API error response format for serialization.
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Custom error class for API errors.
 * Extends Error with code, details, and serialization support.
 */
export class ApiError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;

    // Maintain proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Serialize error to API response format.
   */
  toResponse(): ApiErrorResponse {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: this.code,
        message: this.message,
      },
    };

    if (this.details !== undefined) {
      response.error.details = this.details;
    }

    return response;
  }
}

// ============ Error Factory Functions ============

/**
 * Create an error for when an item is not found.
 */
export function createItemNotFoundError(itemId: string): ApiError {
  return new ApiError(
    ErrorCodes.ITEM_NOT_FOUND,
    `Item ${itemId} not found`,
    { itemId }
  );
}

/**
 * Create an error for invalid stage transitions.
 */
export function createInvalidTransitionError(from: string, to: string): ApiError {
  return new ApiError(
    ErrorCodes.INVALID_TRANSITION,
    `Invalid transition from ${from} to ${to}`,
    { from, to }
  );
}

/**
 * Create an error for WIP limit exceeded.
 */
export function createWipLimitExceededError(
  stageId: string,
  limit: number,
  current: number
): ApiError {
  return new ApiError(
    ErrorCodes.WIP_LIMIT_EXCEEDED,
    `WIP limit exceeded for stage ${stageId}: limit is ${limit}, current is ${current}`,
    { stageId, limit, current }
  );
}

/**
 * Create an error for dependency cycles.
 */
export function createDependencyCycleError(cycle: string[]): ApiError {
  return new ApiError(
    ErrorCodes.DEPENDENCY_CYCLE,
    `Dependency cycle detected: ${cycle.join(' -> ')}`,
    { cycle }
  );
}

/**
 * Create a generic validation error.
 */
export function createValidationError(message: string, details?: unknown): ApiError {
  return new ApiError(ErrorCodes.VALIDATION_ERROR, message, details);
}

/**
 * Create an unauthorized error.
 */
export function createUnauthorizedError(message?: string): ApiError {
  return new ApiError(
    ErrorCodes.UNAUTHORIZED,
    message ?? 'Unauthorized'
  );
}

/**
 * Create a server error.
 */
export function createServerError(message?: string): ApiError {
  return new ApiError(
    ErrorCodes.SERVER_ERROR,
    message ?? 'Internal server error'
  );
}

/**
 * Create a database error with optional details from the caught exception.
 */
export function createDatabaseError(message: string, error?: unknown): ApiError {
  const details = error instanceof Error ? error.message : error !== undefined ? String(error) : undefined;
  return new ApiError(ErrorCodes.DATABASE_ERROR, message, details);
}

/**
 * Create an error for invalid stage operations.
 */
export function createInvalidStageError(
  currentStage: string,
  requiredStage: string,
  message?: string
): ApiError {
  return new ApiError(
    ErrorCodes.INVALID_STAGE,
    message ?? `Item must be in ${requiredStage} stage to be rejected`,
    { currentStage, requiredStage }
  );
}

/**
 * Collision information for the output collision error.
 */
export interface OutputCollisionDetail {
  /** The file path that has a collision */
  file: string;
  /** Item IDs that share this output path without a dependency relationship */
  items: string[];
}

/**
 * Create an error for output file collisions between items.
 *
 * This error is raised when two or more items share the same output file path
 * but do not have a dependency relationship, which could cause parallel write
 * conflicts during execution.
 */
export function createOutputCollisionError(
  collisions: OutputCollisionDetail[]
): ApiError {
  const fileList = collisions.map((c) => c.file).join(', ');
  return new ApiError(
    ErrorCodes.OUTPUT_COLLISION,
    `Output file collision detected: ${fileList}. Items sharing output files must have a dependency relationship.`,
    { collisions }
  );
}

/**
 * Create an error for claim conflicts during concurrent operations.
 *
 * This error occurs when an item is claimed by another agent during
 * a concurrent claim request (race condition detected via unique constraint).
 */
export function createClaimConflictError(itemId: string): ApiError {
  return new ApiError(
    ErrorCodes.CLAIM_CONFLICT,
    'Item was claimed by another agent during this request',
    { itemId }
  );
}
