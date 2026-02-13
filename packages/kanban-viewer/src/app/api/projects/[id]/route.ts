/**
 * API Route Handler for /api/projects/[id]
 *
 * GET - Retrieve a single project by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { ApiError } from '@/types/api';

/**
 * Project response format for API.
 */
interface ProjectResponse {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/projects/[id]
 *
 * Returns a single project by ID.
 * Returns 404 if project doesn't exist.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse<{ success: true; data: ProjectResponse } | ApiError>> {
  try {
    const { id } = await context.params;

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      const errorResponse: ApiError = {
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: `Project with id '${id}' not found`,
        },
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: project,
    });
  } catch (error) {
    const errorResponse: ApiError = {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch project from database',
        details: error instanceof Error ? error.message : String(error),
      },
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
