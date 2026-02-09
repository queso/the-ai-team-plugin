import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAndValidateProjectId } from '@/lib/project-utils';
import type { ArchiveMissionResponse, ApiError } from '@/types/api';
import type { Mission } from '@/types/mission';

/**
 * POST /api/missions/archive
 * Archives the current active mission (where archivedAt is null) for the specified project.
 * Sets mission state to 'archived' and archivedAt to current timestamp.
 * Returns the archived mission and count of items in that mission.
 *
 * Query parameters:
 * - projectId (string, required): Filter by project ID
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const projectValidation = getAndValidateProjectId(request.headers);
    if (!projectValidation.valid) {
      const errorResponse: ApiError = {
        success: false,
        error: projectValidation.error,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }
    const projectId = projectValidation.projectId;

    // Find current active mission (not archived) for this project
    const currentMission = await prisma.mission.findFirst({
      where: {
        projectId,
        archivedAt: null,
      },
    });

    // Return error if no active mission exists
    if (!currentMission) {
      const apiError: ApiError = {
        success: false,
        error: {
          code: 'NO_ACTIVE_MISSION',
          message: 'No active mission exists to archive',
        },
      };
      return NextResponse.json(apiError, { status: 404 });
    }

    // Get item IDs linked to this mission
    const missionItems = await prisma.missionItem.findMany({
      where: { missionId: currentMission.id },
      select: { itemId: true },
    });
    const itemIds = missionItems.map((mi) => mi.itemId);

    // Archive mission and its items in a transaction
    const now = new Date();
    const [archivedMission] = await prisma.$transaction([
      prisma.mission.update({
        where: { id: currentMission.id },
        data: {
          state: 'archived',
          archivedAt: now,
        },
      }),
      prisma.item.updateMany({
        where: { id: { in: itemIds } },
        data: { archivedAt: now },
      }),
    ]);

    const itemCount = itemIds.length;

    const response: ArchiveMissionResponse = {
      success: true,
      data: {
        mission: archivedMission as Mission,
        archivedItems: itemCount,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    const apiError: ApiError = {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to archive mission',
      },
    };
    return NextResponse.json(apiError, { status: 500 });
  }
}
