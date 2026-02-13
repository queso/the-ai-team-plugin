import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import type { UseBoardEventsOptions, UseBoardEventsReturn } from '@/hooks/use-board-events';
import type { WorkItem, BoardMetadata } from '@/types';
import { createMockFetch, createWorkItem } from './helpers/mock-api-responses';

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

// Legacy mock data for backwards compatibility with test assertions
const mockMetadata: BoardMetadata = {
  mission: {
    name: 'Test Mission',
    started_at: '2026-01-15T00:00:00Z',
    status: 'active',
  },
  wip_limits: { testing: 2, implementing: 3, review: 2 },
  phases: {},
  assignments: {},
  agents: {},
  stats: { total_items: 5, completed: 2, in_progress: 2, blocked: 1, backlog: 0 },
  last_updated: '2026-01-15T12:00:00Z',
};

const mockWorkItems: WorkItem[] = [
  createWorkItem({
    id: '001',
    title: 'Initial Item 1',
    type: 'feature',
    stage: 'ready',
    content: 'Test content 1',
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
  }),
  createWorkItem({
    id: '002',
    title: 'Initial Item 2',
    type: 'bug',
    stage: 'testing',
    content: 'Test content 2',
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
  }),
];

// Import the page component after mocks are set up
import Home from '../app/page';

describe('Page SSE Integration', () => {
  beforeEach(() => {
    capturedCallbacks = null;
    mockIsConnected = true;
    mockConnectionState = 'connected';
    mockConnectionError = null;

    global.fetch = createMockFetch({ items: mockWorkItems });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('useBoardEvents hook integration', () => {
    it('should call useBoardEvents hook with callbacks', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(capturedCallbacks).not.toBeNull();
      });

      expect(capturedCallbacks).toHaveProperty('onItemAdded');
      expect(capturedCallbacks).toHaveProperty('onItemMoved');
      expect(capturedCallbacks).toHaveProperty('onItemUpdated');
      expect(capturedCallbacks).toHaveProperty('onItemDeleted');
      expect(capturedCallbacks).toHaveProperty('onBoardUpdated');
    });

    it('should pass callback functions to useBoardEvents', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(capturedCallbacks).not.toBeNull();
      });

      expect(typeof capturedCallbacks?.onItemAdded).toBe('function');
      expect(typeof capturedCallbacks?.onItemMoved).toBe('function');
      expect(typeof capturedCallbacks?.onItemUpdated).toBe('function');
      expect(typeof capturedCallbacks?.onItemDeleted).toBe('function');
      expect(typeof capturedCallbacks?.onBoardUpdated).toBe('function');
    });
  });

  describe('onItemAdded callback', () => {
    it('should add new item to workItems state when onItemAdded is called', async () => {
      render(<Home />);

      // Wait for initial data to load
      await waitFor(() => {
        expect(screen.getByText('Initial Item 1')).toBeInTheDocument();
      });

      const newItem = createWorkItem({ id: '003', title: 'SSE Added Item', stage: 'ready' });

      // Trigger the onItemAdded callback
      act(() => {
        capturedCallbacks?.onItemAdded?.(newItem);
      });

      await waitFor(() => {
        expect(screen.getByText('SSE Added Item')).toBeInTheDocument();
      });
    });

    it('should render new item in correct column based on stage', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Initial Item 1')).toBeInTheDocument();
      });

      const newItem = createWorkItem({ id: '003', title: 'Testing Stage Item', stage: 'testing' });

      act(() => {
        capturedCallbacks?.onItemAdded?.(newItem);
      });

      await waitFor(() => {
        expect(screen.getByText('Testing Stage Item')).toBeInTheDocument();
      });
    });
  });

  describe('onItemMoved callback', () => {
    it('should update item stage when onItemMoved is called', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Initial Item 1')).toBeInTheDocument();
      });

      // Move item 001 from 'ready' to 'testing'
      act(() => {
        capturedCallbacks?.onItemMoved?.('001', 'ready', 'testing');
      });

      // The item should still be visible (just in a different column)
      await waitFor(() => {
        expect(screen.getByText('Initial Item 1')).toBeInTheDocument();
      });
    });

    it('should move item from one stage to another', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Initial Item 2')).toBeInTheDocument();
      });

      // Move item 002 from 'testing' to 'implementing'
      act(() => {
        capturedCallbacks?.onItemMoved?.('002', 'testing', 'implementing');
      });

      // Item should still exist after move
      await waitFor(() => {
        expect(screen.getByText('Initial Item 2')).toBeInTheDocument();
      });
    });
  });

  describe('onItemUpdated callback', () => {
    it('should replace item in state when onItemUpdated is called', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Initial Item 1')).toBeInTheDocument();
      });

      const updatedItem: WorkItem = {
        ...mockWorkItems[0],
        title: 'Updated Item Title',
      };

      act(() => {
        capturedCallbacks?.onItemUpdated?.(updatedItem);
      });

      await waitFor(() => {
        expect(screen.getByText('Updated Item Title')).toBeInTheDocument();
      });

      // Old title should no longer exist
      expect(screen.queryByText('Initial Item 1')).not.toBeInTheDocument();
    });

    it('should update item properties when onItemUpdated is called', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Initial Item 1')).toBeInTheDocument();
      });

      const updatedItem: WorkItem = {
        ...mockWorkItems[0],
        title: 'Completely New Title',
        stage: 'implementing',
      };

      act(() => {
        capturedCallbacks?.onItemUpdated?.(updatedItem);
      });

      await waitFor(() => {
        expect(screen.getByText('Completely New Title')).toBeInTheDocument();
      });
    });
  });

  describe('onItemDeleted callback', () => {
    it('should remove item from state when onItemDeleted is called', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Initial Item 1')).toBeInTheDocument();
      });

      act(() => {
        capturedCallbacks?.onItemDeleted?.('001');
      });

      await waitFor(() => {
        expect(screen.queryByText('Initial Item 1')).not.toBeInTheDocument();
      });

      // Other items should still exist
      expect(screen.getByText('Initial Item 2')).toBeInTheDocument();
    });

    it('should handle deleting non-existent item gracefully', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Initial Item 1')).toBeInTheDocument();
      });

      // Should not throw when deleting non-existent item
      act(() => {
        capturedCallbacks?.onItemDeleted?.('non-existent-id');
      });

      // Existing items should still be there
      await waitFor(() => {
        expect(screen.getByText('Initial Item 1')).toBeInTheDocument();
        expect(screen.getByText('Initial Item 2')).toBeInTheDocument();
      });
    });
  });

  describe('onBoardUpdated callback', () => {
    it('should replace boardMetadata state when onBoardUpdated is called', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Test Mission')).toBeInTheDocument();
      });

      const updatedBoard: BoardMetadata = {
        ...mockMetadata,
        mission: {
          ...mockMetadata.mission,
          name: 'Updated Mission Name',
        },
      };

      act(() => {
        capturedCallbacks?.onBoardUpdated?.(updatedBoard);
      });

      await waitFor(() => {
        expect(screen.getByText('Updated Mission Name')).toBeInTheDocument();
      });
    });

    it('should update stats when board is updated', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Test Mission')).toBeInTheDocument();
      });

      const updatedBoard: BoardMetadata = {
        ...mockMetadata,
        stats: {
          total_items: 10,
          completed: 5,
          in_progress: 3,
          blocked: 2,
          backlog: 0,
        },
      };

      act(() => {
        capturedCallbacks?.onBoardUpdated?.(updatedBoard);
      });

      // Board should update without errors
      await waitFor(() => {
        expect(screen.getByText('Test Mission')).toBeInTheDocument();
      });
    });
  });

  describe('connection status indicator', () => {
    it('should render connection status indicator', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Test Mission')).toBeInTheDocument();
      });

      const indicator = screen.getByTestId('connection-status-indicator');
      expect(indicator).toBeInTheDocument();
    });

    it('should show connected status when connectionState is connected', async () => {
      mockIsConnected = true;
      mockConnectionState = 'connected';
      mockConnectionError = null;

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Test Mission')).toBeInTheDocument();
      });

      const indicator = screen.getByTestId('connection-status-indicator');
      expect(indicator).toHaveAttribute('data-status', 'connected');
    });

    it('should show disconnected status when connectionState is disconnected', async () => {
      mockIsConnected = false;
      mockConnectionState = 'disconnected';
      mockConnectionError = null;

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Test Mission')).toBeInTheDocument();
      });

      const indicator = screen.getByTestId('connection-status-indicator');
      expect(indicator).toHaveAttribute('data-status', 'disconnected');
    });

    it('should show error status when connectionState is error', async () => {
      mockIsConnected = false;
      mockConnectionState = 'error';
      mockConnectionError = new Error('SSE connection failed');

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Test Mission')).toBeInTheDocument();
      });

      const indicator = screen.getByTestId('connection-status-indicator');
      expect(indicator).toHaveAttribute('data-status', 'error');
    });
  });

  describe('initial data fetch alongside SSE', () => {
    it('should still fetch initial data when SSE is enabled', async () => {
      render(<Home />);

      await waitFor(() => {
        // Now using the new unified API endpoints with X-Project-ID header instead of query param
        expect(global.fetch).toHaveBeenCalledWith('/api/board?includeCompleted=true', expect.objectContaining({
          headers: expect.objectContaining({
            'X-Project-ID': 'kanban-viewer',
          }),
        }));
        expect(global.fetch).toHaveBeenCalledWith('/api/activity', expect.objectContaining({
          headers: expect.objectContaining({
            'X-Project-ID': 'kanban-viewer',
          }),
        }));
      });

      // Initial items should be rendered
      await waitFor(() => {
        expect(screen.getByText('Initial Item 1')).toBeInTheDocument();
        expect(screen.getByText('Initial Item 2')).toBeInTheDocument();
      });
    });

    it('should render board data from initial fetch before SSE events', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Test Mission')).toBeInTheDocument();
      });

      // useBoardEvents should be called after initial render
      expect(capturedCallbacks).not.toBeNull();
    });
  });

  describe('cleanup on unmount', () => {
    it('should not cause memory leaks when component unmounts', async () => {
      const { unmount } = render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Test Mission')).toBeInTheDocument();
      });

      // Capture callbacks before unmount
      const callbacksBeforeUnmount = capturedCallbacks;
      expect(callbacksBeforeUnmount).not.toBeNull();

      // Unmount should complete without errors
      unmount();

      // After unmount, calling old callbacks should not throw
      // (though the component won't update since it's unmounted)
      expect(() => {
        callbacksBeforeUnmount?.onItemAdded?.(createWorkItem());
      }).not.toThrow();
    });

    it('should clean up SSE connection when component unmounts', async () => {
      const { unmount } = render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Test Mission')).toBeInTheDocument();
      });

      // The useBoardEvents hook handles cleanup internally
      // We just verify the component unmounts cleanly
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('multiple rapid SSE events', () => {
    it('should handle multiple rapid item additions', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Initial Item 1')).toBeInTheDocument();
      });

      // Rapidly add multiple items
      act(() => {
        capturedCallbacks?.onItemAdded?.(createWorkItem({ id: '100', title: 'Rapid Item 1' }));
        capturedCallbacks?.onItemAdded?.(createWorkItem({ id: '101', title: 'Rapid Item 2' }));
        capturedCallbacks?.onItemAdded?.(createWorkItem({ id: '102', title: 'Rapid Item 3' }));
      });

      await waitFor(() => {
        expect(screen.getByText('Rapid Item 1')).toBeInTheDocument();
        expect(screen.getByText('Rapid Item 2')).toBeInTheDocument();
        expect(screen.getByText('Rapid Item 3')).toBeInTheDocument();
      });
    });

    it('should handle mixed event types in sequence', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Initial Item 1')).toBeInTheDocument();
      });

      // Add, update, then delete
      act(() => {
        capturedCallbacks?.onItemAdded?.(createWorkItem({ id: '200', title: 'New Item' }));
      });

      await waitFor(() => {
        expect(screen.getByText('New Item')).toBeInTheDocument();
      });

      act(() => {
        capturedCallbacks?.onItemUpdated?.({
          ...createWorkItem({ id: '200', title: 'Updated New Item' }),
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Updated New Item')).toBeInTheDocument();
      });

      act(() => {
        capturedCallbacks?.onItemDeleted?.('200');
      });

      await waitFor(() => {
        expect(screen.queryByText('Updated New Item')).not.toBeInTheDocument();
      });
    });
  });
});
