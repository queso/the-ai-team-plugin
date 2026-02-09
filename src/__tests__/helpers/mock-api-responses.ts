import { vi } from 'vitest';
import type { WorkItem } from '@/types';
import type { LogEntry } from '@/components/live-feed-panel';

/**
 * Default stages returned by the /api/board endpoint.
 */
const DEFAULT_STAGES = [
  { id: 'briefings', name: 'Briefings', order: 0, wipLimit: null },
  { id: 'ready', name: 'Ready', order: 1, wipLimit: null },
  { id: 'testing', name: 'Testing', order: 2, wipLimit: 2 },
  { id: 'implementing', name: 'Implementing', order: 3, wipLimit: 3 },
  { id: 'review', name: 'Review', order: 4, wipLimit: 2 },
  { id: 'done', name: 'Done', order: 5, wipLimit: null },
];

/**
 * Default mission returned by the /api/board endpoint.
 */
const DEFAULT_MISSION = {
  id: 'M-001',
  name: 'Test Mission',
  state: 'running',
  prdPath: null,
  startedAt: '2026-01-15T00:00:00Z',
  completedAt: null,
  archivedAt: null,
};

/**
 * Default project returned by the /api/projects endpoint.
 */
const DEFAULT_PROJECT = {
  id: 'kanban-viewer',
  name: 'Kanban Viewer',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Transforms a WorkItem into the API response shape used by /api/board.
 */
function workItemToApiShape(item: WorkItem) {
  return {
    id: item.id,
    title: item.title,
    description: item.content,
    type: item.type,
    priority: 'medium',
    stageId: item.stage,
    assignedAgent: item.assigned_agent ?? null,
    rejectionCount: item.rejection_count,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    completedAt: null,
    dependencies: item.dependencies,
    workLogs: [],
  };
}

/**
 * Creates a WorkItem with sensible defaults. Override any field via the overrides parameter.
 */
export function createWorkItem(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    id: '001',
    title: 'Test Item',
    type: 'feature',
    status: 'active',
    rejection_count: 0,
    dependencies: [],
    outputs: {},
    created_at: '2026-01-17T00:00:00Z',
    updated_at: '2026-01-17T00:00:00Z',
    stage: 'ready',
    content: 'Test content',
    ...overrides,
  };
}

/**
 * Creates a LogEntry with sensible defaults. Override any field via the overrides parameter.
 */
export function createLogEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    agent: 'Murdock',
    message: 'Test activity entry',
    ...overrides,
  };
}

/**
 * Options for configuring the mock fetch created by createMockFetch.
 */
export interface MockFetchOptions {
  /** Work items to include in the /api/board response. Defaults to a single item in 'ready'. */
  items?: WorkItem[];
  /** Activity log entries for /api/activity. Defaults to empty array. */
  activityEntries?: LogEntry[];
  /** Mission name. Defaults to 'Test Mission'. */
  missionName?: string;
  /** Override stages array. Defaults to the standard 6 stages. */
  stages?: typeof DEFAULT_STAGES;
  /** Override the full mission object. */
  mission?: typeof DEFAULT_MISSION;
}

/**
 * Creates a mock `global.fetch` that handles the three API URL patterns
 * used by the page component:
 *
 * - `/api/projects` - Returns a single default project
 * - `/api/board` or `/api/board?includeCompleted=true` - Returns board state
 * - `/api/activity` - Returns activity log entries
 *
 * Rejects with an error for any unrecognized URL.
 */
export function createMockFetch(options: MockFetchOptions = {}): typeof fetch {
  const {
    items = [createWorkItem()],
    activityEntries = [],
    missionName,
    stages = DEFAULT_STAGES,
    mission: missionOverride,
  } = options;

  const mission = missionOverride ?? {
    ...DEFAULT_MISSION,
    ...(missionName ? { name: missionName } : {}),
  };

  return vi.fn((url: string) => {
    if (url === '/api/projects' || url.startsWith('/api/projects?')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: [DEFAULT_PROJECT],
        }),
      } as Response);
    }

    if (url.startsWith('/api/board')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            stages,
            items: items.map(workItemToApiShape),
            claims: [],
            currentMission: mission,
          },
        }),
      } as Response);
    }

    if (url === '/api/activity' || url.startsWith('/api/activity?')) {
      // Real API returns entries in descending order (newest first)
      // Reverse the array to simulate this behavior
      const reversedEntries = [...activityEntries].reverse();
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            entries: reversedEntries.map((entry, i) => ({
              id: `log-${i}`,
              missionId: 'M-001',
              agent: entry.agent,
              message: entry.message,
              level: 'info',
              timestamp: entry.timestamp,
            })),
          },
        }),
      } as Response);
    }

    return Promise.reject(new Error(`Unknown URL: ${url}`));
  }) as typeof fetch;
}
