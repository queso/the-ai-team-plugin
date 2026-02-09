/**
 * Tests for progress stats updates via SSE events.
 *
 * Note: Stats are now calculated dynamically from workItems, not from boardMetadata.stats.
 * This is the fix for the bug where progress bar stayed at 0/7 when items moved to done.
 * Tests have been updated to work with actual work items as the source of truth.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import type { UseBoardEventsOptions, UseBoardEventsReturn } from '@/hooks/use-board-events';
import type { BoardMetadata, WorkItem, Stage } from '@/types';

// Store captured callbacks from useBoardEvents
let capturedCallbacks: UseBoardEventsOptions | null = null;
let mockIsConnected = true;
let mockConnectionError: Error | null = null;

// Mock useBoardEvents hook to capture callbacks
vi.mock('@/hooks/use-board-events', () => ({
  useBoardEvents: vi.fn((options: UseBoardEventsOptions): UseBoardEventsReturn => {
    capturedCallbacks = options;
    return {
      isConnected: mockIsConnected,
      connectionState: mockIsConnected ? 'connected' : 'disconnected',
      connectionError: mockConnectionError,
    };
  }),
}));

// Helper to create a work item
function createWorkItem(id: string, stage: Stage): WorkItem {
  return {
    id,
    title: `Item ${id}`,
    type: 'feature',
    status: 'active',
    rejection_count: 0,
    dependencies: [],
    outputs: {},
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
    stage,
    content: `Content for ${id}`,
  };
}

// Create initial work items: 10 items with 2 in done
function createInitialWorkItems(): WorkItem[] {
  return [
    createWorkItem('001', 'done'),      // completed
    createWorkItem('002', 'done'),      // completed
    createWorkItem('003', 'testing'),   // in progress
    createWorkItem('004', 'implementing'), // in progress
    createWorkItem('005', 'review'),    // in progress
    createWorkItem('006', 'blocked'),   // blocked
    createWorkItem('007', 'briefings'), // backlog
    createWorkItem('008', 'ready'),     // backlog
    createWorkItem('009', 'briefings'), // backlog
    createWorkItem('010', 'ready'),     // backlog
  ];
}

// Initial mock metadata
// Note: phases must have actual entries to prevent onBoardUpdated from clearing workItems
const mockMetadata: BoardMetadata = {
  mission: {
    name: 'Test Mission',
    started_at: new Date().toISOString(),
    status: 'active',
  },
  wip_limits: { testing: 2, implementing: 3, review: 2 },
  phases: {
    done: ['001', '002'],
    testing: ['003'],
    implementing: ['004'],
    review: ['005'],
    blocked: ['006'],
    briefings: ['007', '009'],
    ready: ['008', '010'],
  },
  assignments: {},
  agents: {},
  // Note: these stats are stale - actual stats are calculated from workItems
  stats: { total_items: 10, completed: 2, in_progress: 3, blocked: 1, backlog: 4 },
  last_updated: new Date().toISOString(),
};

// Variable to hold the current work items for fetch mock
let currentMockItems: WorkItem[] = [];
let currentMockMetadata: BoardMetadata = mockMetadata;

// Mock fetch for initial data loading - using new API endpoints
function setupFetchMock(items: WorkItem[] = createInitialWorkItems(), metadata: BoardMetadata = mockMetadata) {
  currentMockItems = items;
  currentMockMetadata = metadata;
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
            items: currentMockItems.map(item => ({
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
              name: currentMockMetadata.mission.name,
              state: 'running',
              prdPath: null,
              startedAt: currentMockMetadata.mission.started_at,
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
}

// Import the page component after mocks are set up
import Home from '../app/page';

describe('Progress Stats SSE Integration', () => {
  beforeEach(() => {
    capturedCallbacks = null;
    mockIsConnected = true;
    mockConnectionError = null;
    currentMockMetadata = mockMetadata;
    currentMockItems = createInitialWorkItems();
    setupFetchMock();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('stats calculated from workItems', () => {
    it('should show correct initial stats based on work items', async () => {
      render(<Home />);

      // Stats should be calculated from actual items (2 in done, 10 total)
      await waitFor(() => {
        expect(screen.getByText('2/10')).toBeInTheDocument();
      });

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '20'); // 2/10 = 20%
    });

    it('should update stats when items are added via SSE', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('2/10')).toBeInTheDocument();
      });

      // Add new items via SSE
      act(() => {
        capturedCallbacks?.onItemAdded?.(createWorkItem('011', 'briefings'));
        capturedCallbacks?.onItemAdded?.(createWorkItem('012', 'done'));
      });

      // Now 3 completed, 12 total
      await waitFor(() => {
        expect(screen.getByText('3/12')).toBeInTheDocument();
      });

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '25'); // 3/12 = 25%
    });

    it('should update stats when items move to done via SSE', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('2/10')).toBeInTheDocument();
      });

      // Move items 003, 004, 005 to done
      act(() => {
        capturedCallbacks?.onItemMoved?.('003', 'testing', 'done');
        capturedCallbacks?.onItemMoved?.('004', 'implementing', 'done');
        capturedCallbacks?.onItemMoved?.('005', 'review', 'done');
      });

      // Now 5 completed, 10 total
      await waitFor(() => {
        expect(screen.getByText('5/10')).toBeInTheDocument();
      });

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50'); // 5/10 = 50%
    });

    it('should handle 100% completion when all items move to done', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('2/10')).toBeInTheDocument();
      });

      // Move all remaining items to done
      act(() => {
        capturedCallbacks?.onItemMoved?.('003', 'testing', 'done');
        capturedCallbacks?.onItemMoved?.('004', 'implementing', 'done');
        capturedCallbacks?.onItemMoved?.('005', 'review', 'done');
        capturedCallbacks?.onItemMoved?.('006', 'blocked', 'done');
        capturedCallbacks?.onItemMoved?.('007', 'briefings', 'done');
        capturedCallbacks?.onItemMoved?.('008', 'ready', 'done');
        capturedCallbacks?.onItemMoved?.('009', 'briefings', 'done');
        capturedCallbacks?.onItemMoved?.('010', 'ready', 'done');
      });

      await waitFor(() => {
        expect(screen.getByText('10/10')).toBeInTheDocument();
      });

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });

    it('should handle 0% completion with no items in done', async () => {
      // Start with no items in done
      const itemsWithNoneDone = [
        createWorkItem('001', 'testing'),
        createWorkItem('002', 'implementing'),
        createWorkItem('003', 'review'),
        createWorkItem('004', 'blocked'),
        createWorkItem('005', 'briefings'),
        createWorkItem('006', 'ready'),
        createWorkItem('007', 'briefings'),
        createWorkItem('008', 'ready'),
        createWorkItem('009', 'briefings'),
        createWorkItem('010', 'ready'),
      ];
      setupFetchMock(itemsWithNoneDone);

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('0/10')).toBeInTheDocument();
      });

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    it('should decrease completed count when items move out of done', async () => {
      // Start with 5 items in done
      const itemsWith5Done = [
        createWorkItem('001', 'done'),
        createWorkItem('002', 'done'),
        createWorkItem('003', 'done'),
        createWorkItem('004', 'done'),
        createWorkItem('005', 'done'),
        createWorkItem('006', 'blocked'),
        createWorkItem('007', 'briefings'),
        createWorkItem('008', 'ready'),
        createWorkItem('009', 'briefings'),
        createWorkItem('010', 'ready'),
      ];
      setupFetchMock(itemsWith5Done);

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('5/10')).toBeInTheDocument();
      });

      // Move items back out of done (rejection scenario)
      act(() => {
        capturedCallbacks?.onItemMoved?.('003', 'done', 'review');
        capturedCallbacks?.onItemMoved?.('004', 'done', 'testing');
        capturedCallbacks?.onItemMoved?.('005', 'done', 'implementing');
      });

      // Now 2 completed
      await waitFor(() => {
        expect(screen.getByText('2/10')).toBeInTheDocument();
      });
    });
  });

  describe('rapid stats updates', () => {
    it('should handle multiple rapid item moves correctly', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('2/10')).toBeInTheDocument();
      });

      // Rapidly move multiple items to done
      act(() => {
        capturedCallbacks?.onItemMoved?.('003', 'testing', 'done');
        capturedCallbacks?.onItemMoved?.('004', 'implementing', 'done');
        capturedCallbacks?.onItemMoved?.('005', 'review', 'done');
      });

      // Should end up with the correct final value
      await waitFor(() => {
        expect(screen.getByText('5/10')).toBeInTheDocument();
      });
    });
  });

  describe('stats with other board updates', () => {
    it('should update mission name while preserving stats from items', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Test Mission')).toBeInTheDocument();
        expect(screen.getByText('2/10')).toBeInTheDocument();
      });

      // Update mission name via onBoardUpdated
      const updatedBoard: BoardMetadata = {
        ...mockMetadata,
        mission: {
          ...mockMetadata.mission,
          name: 'Updated Mission',
        },
      };

      act(() => {
        capturedCallbacks?.onBoardUpdated?.(updatedBoard);
      });

      await waitFor(() => {
        expect(screen.getByText('Updated Mission')).toBeInTheDocument();
      });

      // Stats should still reflect actual items (2/10)
      expect(screen.getByText('2/10')).toBeInTheDocument();
    });

    it('should update stats when items are added along with board update', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Test Mission')).toBeInTheDocument();
        expect(screen.getByText('2/10')).toBeInTheDocument();
      });

      // Add items to done and update board
      act(() => {
        capturedCallbacks?.onItemAdded?.(createWorkItem('011', 'done'));
        capturedCallbacks?.onItemAdded?.(createWorkItem('012', 'done'));
        capturedCallbacks?.onBoardUpdated?.({
          ...mockMetadata,
          mission: { ...mockMetadata.mission, name: 'Updated Mission' },
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Updated Mission')).toBeInTheDocument();
        expect(screen.getByText('4/12')).toBeInTheDocument();
      });
    });

    it('should preserve stats when only mission name changes', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('2/10')).toBeInTheDocument();
      });

      // Update only mission name
      const updatedBoard: BoardMetadata = {
        ...mockMetadata,
        mission: {
          ...mockMetadata.mission,
          name: 'New Name Only',
        },
      };

      act(() => {
        capturedCallbacks?.onBoardUpdated?.(updatedBoard);
      });

      await waitFor(() => {
        expect(screen.getByText('New Name Only')).toBeInTheDocument();
      });

      // Stats should remain based on actual items
      expect(screen.getByText('2/10')).toBeInTheDocument();
    });
  });

  describe('callback registration', () => {
    it('should register onBoardUpdated callback with useBoardEvents', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(capturedCallbacks).not.toBeNull();
      });

      expect(capturedCallbacks).toHaveProperty('onBoardUpdated');
      expect(typeof capturedCallbacks?.onBoardUpdated).toBe('function');
    });

    it('should register onItemMoved callback with useBoardEvents', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(capturedCallbacks).not.toBeNull();
      });

      expect(capturedCallbacks).toHaveProperty('onItemMoved');
      expect(typeof capturedCallbacks?.onItemMoved).toBe('function');
    });

    it('should register onItemAdded callback with useBoardEvents', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(capturedCallbacks).not.toBeNull();
      });

      expect(capturedCallbacks).toHaveProperty('onItemAdded');
      expect(typeof capturedCallbacks?.onItemAdded).toBe('function');
    });
  });
});
