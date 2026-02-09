/**
 * Tests for progress bar updating when items are moved via SSE events.
 *
 * This test file specifically covers the bug where the progress bar remained
 * stuck at 0/7 even when items moved to the Done column via onItemMoved SSE events.
 *
 * Root cause: The stats were only updated via onBoardUpdated events (when board.json
 * changed), not when items moved between stages via onItemMoved. The fix calculates
 * stats dynamically from the actual workItems state.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import type { UseBoardEventsOptions, UseBoardEventsReturn } from '@/hooks/use-board-events';
import type { WorkItem, BoardMetadata } from '@/types';

// Store captured callbacks from useBoardEvents
let capturedCallbacks: UseBoardEventsOptions | null = null;

// Mock useBoardEvents hook to capture callbacks
vi.mock('@/hooks/use-board-events', () => ({
  useBoardEvents: vi.fn((options: UseBoardEventsOptions): UseBoardEventsReturn => {
    capturedCallbacks = options;
    return {
      isConnected: true,
      connectionState: 'connected',
      connectionError: null,
    };
  }),
}));

// Initial mock work items - 7 items, none in done
const mockWorkItems: WorkItem[] = [
  {
    id: '001',
    title: 'Item 1',
    type: 'feature',
    status: 'active',
    rejection_count: 0,
    dependencies: [],
    outputs: {},
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
    stage: 'briefings',
    content: 'Test content 1',
  },
  {
    id: '002',
    title: 'Item 2',
    type: 'feature',
    status: 'active',
    rejection_count: 0,
    dependencies: [],
    outputs: {},
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
    stage: 'ready',
    content: 'Test content 2',
  },
  {
    id: '003',
    title: 'Item 3',
    type: 'feature',
    status: 'active',
    rejection_count: 0,
    dependencies: [],
    outputs: {},
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
    stage: 'testing',
    content: 'Test content 3',
  },
  {
    id: '004',
    title: 'Item 4',
    type: 'feature',
    status: 'active',
    rejection_count: 0,
    dependencies: [],
    outputs: {},
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
    stage: 'implementing',
    content: 'Test content 4',
  },
  {
    id: '005',
    title: 'Item 5',
    type: 'feature',
    status: 'active',
    rejection_count: 0,
    dependencies: [],
    outputs: {},
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
    stage: 'review',
    content: 'Test content 5',
  },
  {
    id: '006',
    title: 'Item 6',
    type: 'feature',
    status: 'active',
    rejection_count: 0,
    dependencies: [],
    outputs: {},
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
    stage: 'probing',
    content: 'Test content 6',
  },
  {
    id: '007',
    title: 'Item 7',
    type: 'feature',
    status: 'active',
    rejection_count: 0,
    dependencies: [],
    outputs: {},
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
    stage: 'blocked',
    content: 'Test content 7',
  },
];

// Mock metadata with stale stats (this simulates the bug scenario where
// board.json stats don't reflect actual item positions)
const mockMetadata: BoardMetadata = {
  mission: {
    name: 'Test Mission',
    started_at: '2026-01-15T00:00:00Z',
    status: 'active',
  },
  wip_limits: { testing: 2, implementing: 3, review: 2, probing: 2 },
  phases: {},
  assignments: {},
  agents: {},
  // Intentionally stale stats - shows 0 completed even though items may move to done
  stats: { total_items: 7, completed: 0, in_progress: 4, blocked: 1, backlog: 2 },
  last_updated: '2026-01-15T12:00:00Z',
};

// Import the page component after mocks are set up
import Home from '../app/page';

describe('Progress Bar Item Move Bug Fix', () => {
  beforeEach(() => {
    capturedCallbacks = null;

    // Mock fetch for initial data - using new API endpoints
    global.fetch = vi.fn((url: string) => {
      if (url === '/api/projects' || url.startsWith('/api/projects?')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: [{ id: 'kanban-viewer', name: 'Kanban Viewer', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]
          }),
        } as Response);
      }
      if (url === '/api/board?includeCompleted=true') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              stages: [
                { id: 'briefings', name: 'Briefings', order: 0, wipLimit: null },
                { id: 'ready', name: 'Ready', order: 1, wipLimit: null },
                { id: 'testing', name: 'Testing', order: 2, wipLimit: 2 },
                { id: 'implementing', name: 'Implementing', order: 3, wipLimit: 3 },
                { id: 'review', name: 'Review', order: 4, wipLimit: 2 },
                { id: 'probing', name: 'Probing', order: 5, wipLimit: 2 },
                { id: 'done', name: 'Done', order: 6, wipLimit: null },
                { id: 'blocked', name: 'Blocked', order: 7, wipLimit: null },
              ],
              items: mockWorkItems.map(item => ({
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
              })),
              claims: [],
              currentMission: {
                id: 'M-001',
                name: mockMetadata.mission.name,
                state: 'running',
                prdPath: null,
                startedAt: mockMetadata.mission.started_at,
                completedAt: null,
                archivedAt: null,
              },
            },
          }),
        } as Response);
      }
      if (url === '/api/activity') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { entries: [] },
          }),
        } as Response);
      }
      return Promise.reject(new Error(`Unknown URL: ${url}`));
    }) as typeof fetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('progress bar updates on item move to done', () => {
    it('should show 0/7 initially when no items are in done stage', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('0/7')).toBeInTheDocument();
      });

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    it('should update progress to 1/7 when one item moves to done via onItemMoved', async () => {
      render(<Home />);

      // Wait for initial render with 0/7
      await waitFor(() => {
        expect(screen.getByText('0/7')).toBeInTheDocument();
      });

      // Move item 005 from review to done via SSE event
      act(() => {
        capturedCallbacks?.onItemMoved?.('005', 'review', 'done');
      });

      // Progress should update to 1/7
      await waitFor(() => {
        expect(screen.getByText('1/7')).toBeInTheDocument();
      });

      // Old value should not be present
      expect(screen.queryByText('0/7')).not.toBeInTheDocument();

      // Progress bar percentage should also update
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '14'); // 1/7 = ~14%
    });

    it('should update progress to 5/7 when five items move to done', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('0/7')).toBeInTheDocument();
      });

      // Move items 001-005 to done in sequence (simulating the e2e regression test scenario)
      act(() => {
        capturedCallbacks?.onItemMoved?.('001', 'briefings', 'done');
      });

      await waitFor(() => {
        expect(screen.getByText('1/7')).toBeInTheDocument();
      });

      act(() => {
        capturedCallbacks?.onItemMoved?.('002', 'ready', 'done');
      });

      await waitFor(() => {
        expect(screen.getByText('2/7')).toBeInTheDocument();
      });

      act(() => {
        capturedCallbacks?.onItemMoved?.('003', 'testing', 'done');
      });

      await waitFor(() => {
        expect(screen.getByText('3/7')).toBeInTheDocument();
      });

      act(() => {
        capturedCallbacks?.onItemMoved?.('004', 'implementing', 'done');
      });

      await waitFor(() => {
        expect(screen.getByText('4/7')).toBeInTheDocument();
      });

      act(() => {
        capturedCallbacks?.onItemMoved?.('005', 'review', 'done');
      });

      await waitFor(() => {
        expect(screen.getByText('5/7')).toBeInTheDocument();
      });

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '71'); // 5/7 = ~71%
    });

    it('should update progress to 7/7 (100%) when all items move to done', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('0/7')).toBeInTheDocument();
      });

      // Move all items to done
      act(() => {
        capturedCallbacks?.onItemMoved?.('001', 'briefings', 'done');
        capturedCallbacks?.onItemMoved?.('002', 'ready', 'done');
        capturedCallbacks?.onItemMoved?.('003', 'testing', 'done');
        capturedCallbacks?.onItemMoved?.('004', 'implementing', 'done');
        capturedCallbacks?.onItemMoved?.('005', 'review', 'done');
        capturedCallbacks?.onItemMoved?.('006', 'probing', 'done');
        capturedCallbacks?.onItemMoved?.('007', 'blocked', 'done');
      });

      await waitFor(() => {
        expect(screen.getByText('7/7')).toBeInTheDocument();
      });

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });
  });

  describe('progress bar decreases when items move out of done', () => {
    it('should decrease progress when item moves from done back to another stage', async () => {
      // Start with one item already in done
      const itemsWithOneDone = mockWorkItems.map((item) =>
        item.id === '001' ? { ...item, stage: 'done' as const } : item
      );

      global.fetch = vi.fn((url: string) => {
        if (url === '/api/projects' || url.startsWith('/api/projects?')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: [{ id: 'kanban-viewer', name: 'Kanban Viewer', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]
            }),
          } as Response);
        }
        if (url === '/api/board?includeCompleted=true') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: {
                stages: [
                  { id: 'briefings', name: 'Briefings', order: 0, wipLimit: null },
                  { id: 'ready', name: 'Ready', order: 1, wipLimit: null },
                  { id: 'testing', name: 'Testing', order: 2, wipLimit: 2 },
                  { id: 'implementing', name: 'Implementing', order: 3, wipLimit: 3 },
                  { id: 'review', name: 'Review', order: 4, wipLimit: 2 },
                  { id: 'probing', name: 'Probing', order: 5, wipLimit: 2 },
                  { id: 'done', name: 'Done', order: 6, wipLimit: null },
                  { id: 'blocked', name: 'Blocked', order: 7, wipLimit: null },
                ],
                items: itemsWithOneDone.map(item => ({
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
                })),
                claims: [],
                currentMission: {
                  id: 'M-001',
                  name: mockMetadata.mission.name,
                  state: 'running',
                  prdPath: null,
                  startedAt: mockMetadata.mission.started_at,
                  completedAt: null,
                  archivedAt: null,
                },
              },
            }),
          } as Response);
        }
        if (url === '/api/activity') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: { entries: [] },
            }),
          } as Response);
        }
        return Promise.reject(new Error(`Unknown URL: ${url}`));
      }) as typeof fetch;

      render(<Home />);

      // Should show 1/7 initially
      await waitFor(() => {
        expect(screen.getByText('1/7')).toBeInTheDocument();
      });

      // Move item back from done to review (rejection scenario)
      act(() => {
        capturedCallbacks?.onItemMoved?.('001', 'done', 'review');
      });

      // Progress should decrease to 0/7
      await waitFor(() => {
        expect(screen.getByText('0/7')).toBeInTheDocument();
      });
    });
  });

  describe('progress bar with item additions and deletions', () => {
    it('should update total count when new item is added', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('0/7')).toBeInTheDocument();
      });

      // Add a new item
      const newItem: WorkItem = {
        id: '008',
        title: 'New Item',
        type: 'feature',
        status: 'active',
        rejection_count: 0,
        dependencies: [],
        outputs: {},
        created_at: '2026-01-16T00:00:00Z',
        updated_at: '2026-01-16T00:00:00Z',
        stage: 'briefings',
        content: 'New content',
      };

      act(() => {
        capturedCallbacks?.onItemAdded?.(newItem);
      });

      // Total should increase to 8
      await waitFor(() => {
        expect(screen.getByText('0/8')).toBeInTheDocument();
      });
    });

    it('should update total count when item is deleted', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('0/7')).toBeInTheDocument();
      });

      // Delete an item
      act(() => {
        capturedCallbacks?.onItemDeleted?.('007');
      });

      // Total should decrease to 6
      await waitFor(() => {
        expect(screen.getByText('0/6')).toBeInTheDocument();
      });
    });

    it('should correctly calculate completed/total after add then move to done', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('0/7')).toBeInTheDocument();
      });

      // Add a new item
      const newItem: WorkItem = {
        id: '008',
        title: 'New Item',
        type: 'feature',
        status: 'active',
        rejection_count: 0,
        dependencies: [],
        outputs: {},
        created_at: '2026-01-16T00:00:00Z',
        updated_at: '2026-01-16T00:00:00Z',
        stage: 'ready',
        content: 'New content',
      };

      act(() => {
        capturedCallbacks?.onItemAdded?.(newItem);
      });

      await waitFor(() => {
        expect(screen.getByText('0/8')).toBeInTheDocument();
      });

      // Move the new item to done
      act(() => {
        capturedCallbacks?.onItemMoved?.('008', 'ready', 'done');
      });

      await waitFor(() => {
        expect(screen.getByText('1/8')).toBeInTheDocument();
      });
    });
  });

  describe('progress bar independence from boardMetadata.stats', () => {
    it('should show correct stats even when boardMetadata.stats is stale', async () => {
      // Start with items already in done, but metadata has stale stats
      const itemsWithThreeDone = mockWorkItems.map((item) =>
        ['001', '002', '003'].includes(item.id) ? { ...item, stage: 'done' as const } : item
      );

      // Metadata still says 0 completed (simulating stale board.json)
      const staleMetadata = {
        ...mockMetadata,
        stats: { ...mockMetadata.stats, completed: 0 },
      };

      global.fetch = vi.fn((url: string) => {
        if (url === '/api/projects' || url.startsWith('/api/projects?')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: [{ id: 'kanban-viewer', name: 'Kanban Viewer', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]
            }),
          } as Response);
        }
        if (url === '/api/board?includeCompleted=true') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: {
                stages: [
                  { id: 'briefings', name: 'Briefings', order: 0, wipLimit: null },
                  { id: 'ready', name: 'Ready', order: 1, wipLimit: null },
                  { id: 'testing', name: 'Testing', order: 2, wipLimit: 2 },
                  { id: 'implementing', name: 'Implementing', order: 3, wipLimit: 3 },
                  { id: 'review', name: 'Review', order: 4, wipLimit: 2 },
                  { id: 'probing', name: 'Probing', order: 5, wipLimit: 2 },
                  { id: 'done', name: 'Done', order: 6, wipLimit: null },
                  { id: 'blocked', name: 'Blocked', order: 7, wipLimit: null },
                ],
                items: itemsWithThreeDone.map(item => ({
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
                })),
                claims: [],
                currentMission: {
                  id: 'M-001',
                  name: staleMetadata.mission.name,
                  state: 'running',
                  prdPath: null,
                  startedAt: staleMetadata.mission.started_at,
                  completedAt: null,
                  archivedAt: null,
                },
              },
            }),
          } as Response);
        }
        if (url === '/api/activity') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: { entries: [] },
            }),
          } as Response);
        }
        return Promise.reject(new Error(`Unknown URL: ${url}`));
      }) as typeof fetch;

      render(<Home />);

      // Should show 3/7 based on actual items, not stale metadata stats
      await waitFor(() => {
        expect(screen.getByText('3/7')).toBeInTheDocument();
      });

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '43'); // 3/7 = ~43%
    });
  });
});
