/**
 * POST /api/hooks/events/prune
 *
 * Prune old hook events to prevent unbounded database growth.
 * Preserves events for active missions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAndValidateProjectId } from '@/lib/project-utils';
import { z } from 'zod';

/**
 * Request body schema for pruning hook events.
 */
const PruneRequestSchema = z.object({
  olderThan: z.string().datetime(),
});

/**
 * Prune hook events older than specified timestamp.
 * Events for active missions are preserved.
 *
 * @param request - NextRequest with X-Project-ID header and olderThan timestamp
 * @returns Response with count of pruned events
 */
export async function POST(request: NextRequest) {
  // Validate project ID from header
  const validation = getAndValidateProjectId(request.headers);
  if (!validation.valid) {
    return NextResponse.json(
      {
        success: false,
        error: validation.error,
      },
      { status: 400 }
    );
  }
  const { projectId } = validation;

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid JSON in request body',
        },
      },
      { status: 400 }
    );
  }

  const parseResult = PruneRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parseResult.error.format(),
        },
      },
      { status: 400 }
    );
  }

  const { olderThan } = parseResult.data;
  const cutoffDate = new Date(olderThan);

  try {
    // Amy's finding: Cap deletions at 1000 events per call to prevent long-running transactions
    const MAX_DELETE_BATCH = 1000;

    // Find events eligible for pruning (older than cutoff, not for active missions)
    const eventsToDelete = await prisma.hookEvent.findMany({
      where: {
        projectId,
        timestamp: {
          lt: cutoffDate,
        },
        OR: [
          // Events with no mission association
          { missionId: null },
          // Events for archived missions
          {
            mission: {
              archivedAt: {
                not: null,
              },
            },
          },
        ],
      },
      select: { id: true },
      take: MAX_DELETE_BATCH, // Limit to 1000 events
      orderBy: { timestamp: 'asc' }, // Delete oldest first
    });

    // Prune events within transaction for atomicity (Amy's finding)
    // Batch deletions to avoid SQLite parameter limit (999 max)
    const CHUNK_SIZE = 500;
    const result = await prisma.$transaction(async (tx) => {
      let totalDeleted = 0;

      // Process deletions in chunks
      for (let i = 0; i < eventsToDelete.length; i += CHUNK_SIZE) {
        const chunk = eventsToDelete.slice(i, i + CHUNK_SIZE);
        const deleted = await tx.hookEvent.deleteMany({
          where: {
            id: {
              in: chunk.map((e) => e.id),
            },
          },
        });
        totalDeleted += deleted.count;
      }

      return { count: totalDeleted };
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          pruned: result.count,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to prune hook events:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to prune hook events',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
