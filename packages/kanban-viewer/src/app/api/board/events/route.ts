/**
 * SSE endpoint for real-time board updates (Database Polling)
 *
 * GET /api/board/events returns a Server-Sent Events stream that polls
 * the SQLite database for changes and emits events for:
 * - item-added: new item created in database
 * - item-moved: item stage changed
 * - item-updated: item content changed
 * - item-deleted: item removed from database
 * - board-updated: mission state changed
 * - mission-completed: mission transitioned to completed state
 * - activity-entry-added: new activity log entry
 *
 * Item 025: Updated to poll database instead of filesystem
 */

import { prisma } from '@/lib/db';
import { validateAndGetProjectId, PROJECT_ID_HEADER } from '@/lib/project-utils';
import type { BoardEvent, WorkItem, Stage } from '@/types';
import { formatSSEEvent } from '@/lib/sse-utils';

// Configuration
const DEFAULT_POLL_INTERVAL_MS = 1000;
const HEARTBEAT_INTERVAL_MS = 30000;
const MAX_CONSECUTIVE_ERRORS = 5;

/** Get polling interval from environment or use default */
function getPollInterval(): number {
  const envValue = process.env.SSE_POLL_INTERVAL_MS;
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_POLL_INTERVAL_MS;
}

/** Database item type from Prisma */
interface DbItem {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  stageId: string;
  assignedAgent: string | null;
  rejectionCount: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  archivedAt: Date | null;
  outputTest: string | null;
  outputImpl: string | null;
  outputTypes: string | null;
  dependsOn: Array<{ dependsOnId: string }>;
  workLogs: Array<{
    agent: string;
    action: string;
    summary: string;
    timestamp: Date;
  }>;
}

/** Database mission type from Prisma */
interface DbMission {
  id: string;
  name: string;
  state: string;
  prdPath: string;
  startedAt: Date;
  completedAt: Date | null;
  archivedAt: Date | null;
}

/** Database activity log type from Prisma */
interface DbActivityLog {
  id: number;
  missionId: string | null;
  agent: string | null;
  message: string;
  level: string;
  timestamp: Date;
}

/** Tracked item state for change detection */
interface TrackedItemState {
  stageId: string;
  updatedAt: number; // Timestamp in ms
  title: string;
  description: string;
  assignedAgent: string | null;
  rejectionCount: number;
}

/** Convert database item to WorkItem format for SSE events */
function dbItemToWorkItem(item: DbItem): WorkItem {
  // After stage harmonization, database uses same names as frontend
  // Direct mapping - no transformation needed
  const stage = item.stageId as Stage;

  // Build outputs object from database fields
  const outputs: WorkItem['outputs'] = {};
  if (item.outputTest) outputs.test = item.outputTest;
  if (item.outputImpl) outputs.impl = item.outputImpl;
  if (item.outputTypes) outputs.types = item.outputTypes;

  return {
    id: item.id,
    title: item.title,
    type: item.type as WorkItem['type'],
    status: item.completedAt ? 'completed' : 'pending',
    assigned_agent: item.assignedAgent as WorkItem['assigned_agent'],
    rejection_count: item.rejectionCount,
    dependencies: item.dependsOn.map((d) => d.dependsOnId),
    outputs,
    created_at: item.createdAt.toISOString(),
    updated_at: item.updatedAt.toISOString(),
    stage,
    content: item.description,
  };
}

/** Create item-added event */
function createItemAddedEvent(item: DbItem): BoardEvent {
  return {
    type: 'item-added',
    timestamp: new Date().toISOString(),
    data: {
      itemId: item.id,
      toStage: item.stageId,
      item: dbItemToWorkItem(item),
    },
  };
}

/** Create item-moved event */
function createItemMovedEvent(
  item: DbItem,
  fromStage: string,
  toStage: string
): BoardEvent {
  return {
    type: 'item-moved',
    timestamp: new Date().toISOString(),
    data: {
      itemId: item.id,
      fromStage,
      toStage,
      item: dbItemToWorkItem(item),
    },
  };
}

/** Create item-updated event */
function createItemUpdatedEvent(item: DbItem): BoardEvent {
  return {
    type: 'item-updated',
    timestamp: new Date().toISOString(),
    data: {
      itemId: item.id,
      toStage: item.stageId,
      item: dbItemToWorkItem(item),
    },
  };
}

/** Create item-deleted event */
function createItemDeletedEvent(itemId: string, fromStage: string): BoardEvent {
  return {
    type: 'item-deleted',
    timestamp: new Date().toISOString(),
    data: {
      itemId,
      fromStage,
    },
  };
}

/** Create board-updated event */
function createBoardUpdatedEvent(mission: DbMission | null): BoardEvent {
  return {
    type: 'board-updated',
    timestamp: new Date().toISOString(),
    data: {
      board: mission
        ? {
            mission: {
              name: mission.name,
              status: mission.state as 'active' | 'completed',
              started_at: mission.startedAt.toISOString(),
              completed_at: mission.completedAt?.toISOString(),
            },
            wip_limits: {},
            phases: {},
            assignments: {},
            agents: {},
            stats: {
              total_items: 0,
              completed: 0,
              in_progress: 0,
              blocked: 0,
              backlog: 0,
            },
            last_updated: new Date().toISOString(),
          }
        : undefined,
    },
  };
}

/** Create mission-completed event */
function createMissionCompletedEvent(mission: DbMission): BoardEvent {
  return {
    type: 'mission-completed',
    timestamp: new Date().toISOString(),
    data: {
      completed_at: mission.completedAt?.toISOString(),
      duration_ms: mission.completedAt
        ? mission.completedAt.getTime() - mission.startedAt.getTime()
        : undefined,
    },
  };
}

/** Create activity-entry-added event */
function createActivityEntryAddedEvent(log: DbActivityLog): BoardEvent {
  return {
    type: 'activity-entry-added',
    timestamp: new Date().toISOString(),
    data: {
      logEntry: {
        timestamp: log.timestamp.toISOString(),
        agent: log.agent || '',
        message: log.message,
      },
    },
  };
}

export async function GET(request?: Request): Promise<Response> {
  // Get projectId from header (preferred) or query param (fallback for EventSource)
  // EventSource API doesn't support custom headers, so we accept both
  if (request) {
    const url = new URL(request.url);
    // Try header first, fall back to query param for EventSource compatibility
    const rawProjectId = request.headers.get(PROJECT_ID_HEADER) ?? url.searchParams.get('projectId');

    // Validate projectId using shared utility
    const projectValidation = validateAndGetProjectId(rawProjectId);
    if (!projectValidation.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: projectValidation.error,
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Store projectId for use in polling
    return createSSEStream(projectValidation.projectId);
  }

  // Fallback for tests without request (backwards compatibility)
  return createSSEStream(null);
}

function createSSEStream(projectId: string | null): Response {
  let pollInterval: NodeJS.Timeout | null = null;
  let heartbeatInterval: NodeJS.Timeout | null = null;
  let isCancelled = false;

  // State tracking for change detection
  const trackedItems = new Map<string, TrackedItemState>();
  let lastActivityLogId = 0; // Track by ID for reliable comparison
  let previousMissionState: string | null = null;
  let isFirstPoll = true; // Track first poll to establish baseline without emitting
  let consecutiveErrors = 0; // Track consecutive database errors for circuit breaker

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Helper to flush all collected events as a single batch
      const flushEvents = (events: BoardEvent[]) => {
        if (isCancelled || events.length === 0) return;
        try {
          // Combine all events into a single string and enqueue once
          const combined = events.map((event) => formatSSEEvent(event)).join('');
          controller.enqueue(encoder.encode(combined));
        } catch {
          // Controller may be closed
        }
      };

      // Poll function to check for changes
      const poll = async () => {
        if (isCancelled) return;

        // Collect events during this poll cycle
        const pendingEvents: BoardEvent[] = [];

        try {
          // Build item filter - optionally filter by projectId
          const itemWhere: { archivedAt: null; projectId?: string } = {
            archivedAt: null,
          };
          if (projectId) {
            itemWhere.projectId = projectId;
          }

          // Fetch all non-archived items with their dependencies
          const items = await prisma.item.findMany({
            where: itemWhere,
            include: {
              dependsOn: true,
              workLogs: true,
            },
          });

          // Detect changes
          const currentItemIds = new Set<string>();

          for (const item of items) {
            currentItemIds.add(item.id);
            const tracked = trackedItems.get(item.id);
            const itemUpdatedAt = item.updatedAt.getTime();

            if (!tracked) {
              // New item - on first poll just record state, otherwise emit event
              if (!isFirstPoll) {
                pendingEvents.push(createItemAddedEvent(item as DbItem));
              }
              trackedItems.set(item.id, {
                stageId: item.stageId,
                updatedAt: itemUpdatedAt,
                title: item.title,
                description: item.description,
                assignedAgent: item.assignedAgent,
                rejectionCount: item.rejectionCount,
              });
            } else if (tracked.stageId !== item.stageId) {
              // Item moved to different stage
              pendingEvents.push(createItemMovedEvent(item as DbItem, tracked.stageId, item.stageId));
              trackedItems.set(item.id, {
                stageId: item.stageId,
                updatedAt: itemUpdatedAt,
                title: item.title,
                description: item.description,
                assignedAgent: item.assignedAgent,
                rejectionCount: item.rejectionCount,
              });
            } else if (
              tracked.updatedAt !== itemUpdatedAt ||
              tracked.title !== item.title ||
              tracked.description !== item.description ||
              tracked.assignedAgent !== item.assignedAgent ||
              tracked.rejectionCount !== item.rejectionCount
            ) {
              // Item content updated (same stage)
              pendingEvents.push(createItemUpdatedEvent(item as DbItem));
              trackedItems.set(item.id, {
                stageId: item.stageId,
                updatedAt: itemUpdatedAt,
                title: item.title,
                description: item.description,
                assignedAgent: item.assignedAgent,
                rejectionCount: item.rejectionCount,
              });
            }
          }

          // Detect deleted items (only after first poll)
          if (!isFirstPoll) {
            for (const [itemId, state] of trackedItems) {
              if (!currentItemIds.has(itemId)) {
                pendingEvents.push(createItemDeletedEvent(itemId, state.stageId));
                trackedItems.delete(itemId);
              }
            }
          }

          // Build mission filter - optionally filter by projectId
          const missionWhere: { projectId?: string } = {};
          if (projectId) {
            missionWhere.projectId = projectId;
          }

          // Fetch mission state
          const mission = await prisma.mission.findFirst({
            where: missionWhere,
            orderBy: { startedAt: 'desc' },
          });

          if (mission) {
            const currentMissionState = mission.state;

            // Check for mission state changes (only after first poll establishes baseline)
            if (!isFirstPoll && previousMissionState !== null && previousMissionState !== currentMissionState) {
              // Emit board-updated for any state change
              pendingEvents.push(createBoardUpdatedEvent(mission));

              // Check for transition to completed
              if (currentMissionState === 'completed' && previousMissionState !== 'completed') {
                pendingEvents.push(createMissionCompletedEvent(mission));
              }
            }

            previousMissionState = currentMissionState;
          }

          // Build activity log filter - optionally filter by projectId
          const activityLogWhere: { projectId?: string } = {};
          if (projectId) {
            activityLogWhere.projectId = projectId;
          }

          // Fetch all activity log entries, ordered by ID for reliable tracking
          const activityLogs = await prisma.activityLog.findMany({
            where: activityLogWhere,
            orderBy: { id: 'asc' },
          });

          // Filter to only new entries (ID greater than last seen)
          const newLogs = activityLogs.filter((log) => log.id > lastActivityLogId);

          // On first poll, just record the latest ID without emitting
          if (isFirstPoll) {
            if (activityLogs.length > 0) {
              lastActivityLogId = activityLogs[activityLogs.length - 1].id;
            }
          } else {
            for (const log of newLogs) {
              pendingEvents.push(createActivityEntryAddedEvent(log));
            }
            // Update tracking position only after all entries processed
            if (newLogs.length > 0) {
              lastActivityLogId = newLogs[newLogs.length - 1].id;
            }
          }

          // Flush all events from this poll cycle
          flushEvents(pendingEvents);

          // Reset error counter on successful poll
          consecutiveErrors = 0;

          // Mark first poll as complete
          isFirstPoll = false;
        } catch (error) {
          consecutiveErrors++;
          console.error(`SSE poll error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, error);

          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            console.error('SSE circuit breaker triggered - closing connection');
            // Clean up intervals
            if (pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
            }
            if (heartbeatInterval) {
              clearInterval(heartbeatInterval);
              heartbeatInterval = null;
            }
            isCancelled = true;
            controller.close();
            return;
          }
        }
      };

      // Start polling
      const pollIntervalMs = getPollInterval();
      pollInterval = setInterval(poll, pollIntervalMs);

      // Set up heartbeat
      heartbeatInterval = setInterval(() => {
        if (isCancelled) return;
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          // Controller may be closed
        }
      }, HEARTBEAT_INTERVAL_MS);
    },

    cancel() {
      isCancelled = true;

      // Clean up poll interval
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }

      // Clean up heartbeat interval
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
