/**
 * Project validation utilities for the Kanban Viewer API layer.
 *
 * Provides validation and auto-creation logic for project IDs.
 * Project IDs are URL-safe identifiers (alphanumeric, hyphens, underscores).
 *
 * The MCP server and API clients pass the project ID via the X-Project-ID header.
 */

import { prisma } from '@/lib/db';
import type { Project } from '@prisma/client';

/**
 * HTTP header name for project ID.
 * All API requests should include this header to scope operations to a project.
 */
export const PROJECT_ID_HEADER = 'X-Project-ID';

/**
 * Validation error type matching the pattern used in API responses.
 */
export interface ValidationError {
  code: 'VALIDATION_ERROR';
  message: string;
}

/**
 * Maximum allowed length for project IDs.
 */
const MAX_PROJECT_ID_LENGTH = 100;

/**
 * Regular expression for valid project IDs.
 * - Alphanumeric characters (a-z, A-Z, 0-9)
 * - Hyphens and underscores
 * - At least 1 character, maximum 100 characters
 */
export const PROJECT_ID_REGEX = /^[a-zA-Z0-9_-]{1,100}$/;

/**
 * Validate a project ID for required presence and format.
 *
 * @param projectId - The project ID to validate
 * @returns ValidationError if invalid, null if valid
 */
export function validateProjectId(projectId: string | null | undefined): ValidationError | null {
  // Check for missing or empty projectId
  if (projectId === null || projectId === undefined || projectId === '') {
    return {
      code: 'VALIDATION_ERROR',
      message: 'X-Project-ID header is required',
    };
  }

  // Check length first for clearer error message
  if (projectId.length > MAX_PROJECT_ID_LENGTH) {
    return {
      code: 'VALIDATION_ERROR',
      message: `projectId must be 100 characters or less`,
    };
  }

  // Check format
  if (!PROJECT_ID_REGEX.test(projectId)) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'projectId must be alphanumeric with hyphens and underscores only (format: ^[a-zA-Z0-9_-]+$)',
    };
  }

  return null;
}

/**
 * Type guard version of validateProjectId.
 * Returns true if projectId is valid, false otherwise.
 * Use getValidationError to get the error details if invalid.
 */
export function isValidProjectId(projectId: string | null | undefined): projectId is string {
  return validateProjectId(projectId) === null;
}

/**
 * Validate and narrow a project ID to a non-null string.
 *
 * Returns the validated projectId as a string if valid,
 * or a ValidationError if invalid.
 */
export function validateAndGetProjectId(
  projectId: string | null | undefined
): { valid: true; projectId: string } | { valid: false; error: ValidationError } {
  const validationError = validateProjectId(projectId);
  if (validationError) {
    return { valid: false, error: validationError };
  }
  // Normalize to lowercase for case-insensitive matching
  return { valid: true, projectId: (projectId as string).toLowerCase() };
}

/**
 * Extract project ID from request headers.
 *
 * @param headers - Request headers (from NextRequest or standard Request)
 * @returns The project ID from X-Project-ID header, or null if not present
 */
export function getProjectIdFromHeader(headers: Headers): string | null {
  return headers.get(PROJECT_ID_HEADER);
}

/**
 * Extract and validate project ID from request headers.
 * Returns the validated projectId string or a ValidationError.
 *
 * @param headers - Request headers (from NextRequest or standard Request)
 * @returns Discriminated union with validated projectId or error
 */
export function getAndValidateProjectId(
  headers: Headers
): { valid: true; projectId: string } | { valid: false; error: ValidationError } {
  const projectId = headers.get(PROJECT_ID_HEADER);
  return validateAndGetProjectId(projectId);
}

/**
 * Ensure a project exists, creating it if necessary.
 *
 * Project IDs are normalized to lowercase for case-insensitive matching.
 * When creating a new project, the projectId is used as the name.
 *
 * @param projectId - The project ID to find or create
 * @returns The existing or newly created project
 */
export async function ensureProject(projectId: string): Promise<Project> {
  const normalizedId = projectId.toLowerCase();

  // Try to find existing project
  const existingProject = await prisma.project.findUnique({
    where: { id: normalizedId },
  });

  if (existingProject) {
    return existingProject;
  }

  // Create new project using projectId as name
  const newProject = await prisma.project.create({
    data: {
      id: normalizedId,
      name: normalizedId,
    },
  });

  return newProject;
}
