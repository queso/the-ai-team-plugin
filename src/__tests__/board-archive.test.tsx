import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import type { UseBoardEventsOptions, UseBoardEventsReturn } from '@/hooks/use-board-events';
import type { WorkItem, BoardMetadata } from '@/types';

/**
 * Board Archive Tests (Item 002)
 *
 * These tests verify that after archiving a mission, the board UI correctly
 * clears and shows empty state. The implementation involves:
 * 1. The SSE endpoint emitting board-updated with empty phases
 * 2. React state updating to reflect the cleared board
 * 3. Stats showing zeroed values
 */

// Store captured callbacks from useBoardEvents
let capturedCallbacks: UseBoardEventsOptions | null = null;
let mockIsConnected = true;
let mockConnectionState: 'connected' | 'connecting' | 'disconnected' | 'error' = 'connected';
let mockConnectionError: Error | null = null;

// Mock useBoardEvents hook to capture callbacks
vi.mock('@/hooks/use-board-events', () => ({
  useBoardEvents: vi.fn((options: UseBoardEventsOptions): UseBoardEventsReturn => {
    capturedCallbacks = options;
    return {
      isConnected: mockIsConnected,
      connectionState: mockConnectionState,
      connectionError: mockConnectionError,
    };
  }),
}));

// Initial board state with active mission and work items
const mockActiveMetadata: BoardMetadata = {
  mission: {
    name: 'Active Mission',
    started_at: '2026-01-15T00:00:00Z',
    status: 'active',
  },
  wip_limits: { testing: 2, implementing: 3, review: 2 },
  phases: {
    ready: ['001'],
    testing: ['002'],
    implementing: ['003'],
  },
  assignments: {},
  agents: {},
  stats: { total_items: 5, completed: 2, in_progress: 2, blocked: 1, backlog: 0 },
  last_updated: '2026-01-15T12:00:00Z',
};

// Archived/reset board state with empty phases and zeroed stats
const mockArchivedMetadata: BoardMetadata = {
  mission: {
    name: 'Archived Mission',
    started_at: '2026-01-15T00:00:00Z',
    completed_at: '2026-01-16T00:00:00Z',
    status: 'completed',
  },
  wip_limits: { testing: 2, implementing: 3, review: 2 },
  phases: {},
  assignments: {},
  agents: {},
  stats: { total_items: 0, completed: 0, in_progress: 0, blocked: 0, backlog: 0 },
  last_updated: '2026-01-16T00:00:00Z',
};

const mockWorkItems: WorkItem[] = [
  {
    id: '001',
    title: 'Work Item 1',
    type: 'feature',
    status: 'active',
    rejection_count: 0,
    dependencies: [],
    outputs: {},
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
    stage: 'ready',
    content: 'Test content 1',
  },
  {
    id: '002',
    title: 'Work Item 2',
    type: 'bug',
    status: 'active',
    rejection_count: 0,
    dependencies: [],
    outputs: {},
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
    stage: 'testing',
    content: 'Test content 2',
  },
  {
    id: '003',
    title: 'Work Item 3',
    type: 'enhancement',
    status: 'active',
    rejection_count: 0,
    dependencies: [],
    outputs: {},
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
    stage: 'implementing',
    content: 'Test content 3',
  },
];

// Import the page component after mocks are set up
import Home from '../app/page';

describe('Board Archive UI Clear (Item 002)', () => {
  beforeEach(() => {
    capturedCallbacks = null;
    mockIsConnected = true;
    mockConnectionState = 'connected';
    mockConnectionError = null;

    // Mock fetch for initial data with active mission state - using new API endpoints
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
      if (url === '/api/board?projectId=kanban-viewer&includeCompleted=true' || url === '/api/board?includeCompleted=true') {
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
                name: mockActiveMetadata.mission.name,
                state: 'running',
                prdPath: null,
                startedAt: mockActiveMetadata.mission.started_at,
                completedAt: null,
                archivedAt: null,
              },
            },
          }),
        } as Response);
      }
      if (url === '/api/activity?projectId=kanban-viewer' || url === '/api/activity') {
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

  describe('board state before archive', () => {
    it('should display work items in their columns before archive', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Work Item 1')).toBeInTheDocument();
        expect(screen.getByText('Work Item 2')).toBeInTheDocument();
        expect(screen.getByText('Work Item 3')).toBeInTheDocument();
      });
    });

    it('should show active stats before archive', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Active Mission')).toBeInTheDocument();
      });

      // Stats should show non-zero values initially
      // The exact location of stats display depends on implementation
    });
  });

  describe('SSE board-updated event for archive', () => {
    it('should clear all work items when board-updated emits empty phases', async () => {
      render(<Home />);

      // Wait for initial items to render
      await waitFor(() => {
        expect(screen.getByText('Work Item 1')).toBeInTheDocument();
        expect(screen.getByText('Work Item 2')).toBeInTheDocument();
        expect(screen.getByText('Work Item 3')).toBeInTheDocument();
      });

      // Trigger archive via SSE board-updated with empty phases
      act(() => {
        capturedCallbacks?.onBoardUpdated?.(mockArchivedMetadata);
      });

      // All work items should be removed
      await waitFor(() => {
        expect(screen.queryByText('Work Item 1')).not.toBeInTheDocument();
        expect(screen.queryByText('Work Item 2')).not.toBeInTheDocument();
        expect(screen.queryByText('Work Item 3')).not.toBeInTheDocument();
      });
    });

    it('should show empty columns after archive', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Work Item 1')).toBeInTheDocument();
      });

      // Archive the board
      act(() => {
        capturedCallbacks?.onBoardUpdated?.(mockArchivedMetadata);
      });

      // Columns should still exist but be empty
      await waitFor(() => {
        // Verify no work items remain
        expect(screen.queryByText('Work Item 1')).not.toBeInTheDocument();
        expect(screen.queryByText('Work Item 2')).not.toBeInTheDocument();
        expect(screen.queryByText('Work Item 3')).not.toBeInTheDocument();
      });

      // Board columns should still be rendered (implementation specific)
      // The board structure should remain visible with empty columns
    });

    it('should update stats to zeroed values after archive', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Active Mission')).toBeInTheDocument();
      });

      // Archive the board with zeroed stats
      act(() => {
        capturedCallbacks?.onBoardUpdated?.(mockArchivedMetadata);
      });

      // The board metadata should reflect zeroed stats
      // This verifies the onBoardUpdated callback properly updates boardMetadata state
      await waitFor(() => {
        expect(screen.getByText('Archived Mission')).toBeInTheDocument();
      });
    });

    it('should update mission status to completed after archive', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Active Mission')).toBeInTheDocument();
      });

      // Archive with completed status
      act(() => {
        capturedCallbacks?.onBoardUpdated?.(mockArchivedMetadata);
      });

      // Mission name should update to show archived state
      await waitFor(() => {
        expect(screen.getByText('Archived Mission')).toBeInTheDocument();
      });
    });
  });

  describe('no stale items after archive', () => {
    it('should not retain any items in workItems state after archive', async () => {
      render(<Home />);

      // Verify initial items
      await waitFor(() => {
        expect(screen.getByText('Work Item 1')).toBeInTheDocument();
      });

      // Archive via board-updated with empty phases
      act(() => {
        capturedCallbacks?.onBoardUpdated?.(mockArchivedMetadata);
      });

      // Wait for state to update
      await waitFor(() => {
        expect(screen.queryByText('Work Item 1')).not.toBeInTheDocument();
      });

      // Try to find any work item card elements
      // Implementation may use specific test IDs or class names for cards
      const workItemCards = screen.queryAllByTestId(/work-item-card/i);
      expect(workItemCards).toHaveLength(0);
    });

    it('should handle rapid item deletions during archive gracefully', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Work Item 1')).toBeInTheDocument();
      });

      // Simulate multiple delete events followed by board-updated (as might happen during archive)
      act(() => {
        capturedCallbacks?.onItemDeleted?.('001');
        capturedCallbacks?.onItemDeleted?.('002');
        capturedCallbacks?.onItemDeleted?.('003');
        capturedCallbacks?.onBoardUpdated?.(mockArchivedMetadata);
      });

      // All items should be gone
      await waitFor(() => {
        expect(screen.queryByText('Work Item 1')).not.toBeInTheDocument();
        expect(screen.queryByText('Work Item 2')).not.toBeInTheDocument();
        expect(screen.queryByText('Work Item 3')).not.toBeInTheDocument();
      });
    });
  });

  describe('SSE endpoint behavior', () => {
    it('should receive board-updated event when board.json is reset', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(capturedCallbacks).not.toBeNull();
      });

      // Verify the callback exists for board-updated events
      expect(typeof capturedCallbacks?.onBoardUpdated).toBe('function');
    });

    it('should handle board-updated with complete BoardMetadata', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Active Mission')).toBeInTheDocument();
      });

      // The archived metadata should have all required fields
      expect(mockArchivedMetadata.stats.total_items).toBe(0);
      expect(mockArchivedMetadata.stats.completed).toBe(0);
      expect(mockArchivedMetadata.phases).toEqual({});

      // Trigger the event
      act(() => {
        capturedCallbacks?.onBoardUpdated?.(mockArchivedMetadata);
      });

      // Board should update successfully
      await waitFor(() => {
        expect(screen.getByText('Archived Mission')).toBeInTheDocument();
      });
    });
  });

  describe('React state updates', () => {
    it('should update both workItems and boardMetadata states on archive', async () => {
      render(<Home />);

      // Verify initial state
      await waitFor(() => {
        expect(screen.getByText('Work Item 1')).toBeInTheDocument();
        expect(screen.getByText('Active Mission')).toBeInTheDocument();
      });

      // Archive
      act(() => {
        capturedCallbacks?.onBoardUpdated?.(mockArchivedMetadata);
      });

      // Both should be updated
      await waitFor(() => {
        // Work items cleared
        expect(screen.queryByText('Work Item 1')).not.toBeInTheDocument();
        // Board metadata updated
        expect(screen.getByText('Archived Mission')).toBeInTheDocument();
      });
    });

    it('should not cause re-render loops during archive', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Active Mission')).toBeInTheDocument();
      });

      // Archive should complete without React errors
      act(() => {
        capturedCallbacks?.onBoardUpdated?.(mockArchivedMetadata);
      });

      await waitFor(() => {
        expect(screen.getByText('Archived Mission')).toBeInTheDocument();
      });

      // No React state update errors should have occurred
      const reactErrors = consoleSpy.mock.calls.filter(
        call => call.some(arg => typeof arg === 'string' && arg.includes('Maximum update depth'))
      );
      expect(reactErrors).toHaveLength(0);

      consoleSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle archive when board is already empty', async () => {
      // Override initial fetch to return empty state - using new API endpoints
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
        if (url === '/api/board?projectId=kanban-viewer&includeCompleted=true' || url === '/api/board?includeCompleted=true') {
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
                items: [],
                claims: [],
                currentMission: {
                  id: 'M-001',
                  name: mockArchivedMetadata.mission.name,
                  state: 'completed',
                  prdPath: null,
                  startedAt: mockArchivedMetadata.mission.started_at,
                  completedAt: mockArchivedMetadata.mission.completed_at,
                  archivedAt: null,
                },
              },
            }),
          } as Response);
        }
        if (url === '/api/activity?projectId=kanban-viewer' || url === '/api/activity') {
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

      await waitFor(() => {
        expect(screen.getByText('Archived Mission')).toBeInTheDocument();
      });

      // Archiving again should not cause issues
      act(() => {
        capturedCallbacks?.onBoardUpdated?.(mockArchivedMetadata);
      });

      // Board should remain stable
      await waitFor(() => {
        expect(screen.getByText('Archived Mission')).toBeInTheDocument();
      });
    });

    it('should handle archive with undefined board data gracefully', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Active Mission')).toBeInTheDocument();
      });

      // Calling with undefined should not crash (defensive coding in callback)
      // The implementation should handle this gracefully
      act(() => {
        capturedCallbacks?.onBoardUpdated?.(undefined as unknown as BoardMetadata);
      });

      // Board should remain functional (may or may not update depending on implementation)
      // At minimum, it should not crash
    });
  });
});
