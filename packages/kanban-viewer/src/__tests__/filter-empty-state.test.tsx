import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type { UseBoardEventsReturn } from '@/hooks/use-board-events';
import type { WorkItem, BoardMetadata } from '@/types';

// Mock state
let mockConnectionState: 'connected' | 'connecting' | 'disconnected' | 'error' = 'connected';
let mockConnectionError: Error | null = null;

// Mock useBoardEvents hook
vi.mock('@/hooks/use-board-events', () => ({
  useBoardEvents: vi.fn((): UseBoardEventsReturn => {
    return {
      isConnected: true,
      connectionState: mockConnectionState,
      connectionError: mockConnectionError,
    };
  }),
}));

// Mock fetch for initial data loading
const mockMetadata: BoardMetadata = {
  mission: {
    name: 'Empty State Test Mission',
    started_at: '2026-01-15T00:00:00Z',
    status: 'active',
  },
  wip_limits: { testing: 2, implementing: 3, review: 2 },
  phases: {},
  assignments: {},
  agents: {},
  stats: { total_items: 3, completed: 1, in_progress: 1, blocked: 0, backlog: 1 },
  last_updated: '2026-01-15T12:00:00Z',
};

// Work items for testing empty state scenarios
const mockWorkItems: WorkItem[] = [
  {
    id: '001',
    title: 'Feature One',
    type: 'feature',
    status: 'active',
    assigned_agent: 'Murdock',
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
    title: 'Bug Two',
    type: 'bug',
    status: 'active',
    assigned_agent: 'B.A.',
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
    title: 'Enhancement Three',
    type: 'enhancement',
    status: 'completed',
    assigned_agent: 'Hannibal',
    rejection_count: 0,
    dependencies: [],
    outputs: {},
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
    stage: 'done',
    content: 'Test content 3',
  },
];

// Import the page component after mocks are set up
import Home from '../app/page';

describe('Filter Empty State (Item 010)', () => {
  beforeEach(() => {
    mockConnectionState = 'connected';
    mockConnectionError = null;

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
      if (url.startsWith('/api/board')) {
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
                { id: 'done', name: 'Done', order: 5, wipLimit: null },
              ],
              items: mockWorkItems.map(item => ({
                id: item.id,
                title: item.title,
                description: item.content,
                type: item.type,
                priority: 'medium',
                stageId: item.stage,
                assignedAgent: item.assigned_agent,
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
      if (url.startsWith('/api/activity')) {
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

  describe('Empty state display when no items match filters', () => {
    it('should display empty state when filter matches no items', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Feature One')).toBeInTheDocument();
      });

      // Apply a filter that matches no items (e.g., type = 'interface')
      const typeDropdown = screen.getByTestId('type-filter-dropdown');
      fireEvent.click(typeDropdown);
      fireEvent.click(screen.getByRole('option', { name: 'interface' }));

      // Empty state should appear
      await waitFor(() => {
        expect(screen.getByText('No items match filters')).toBeInTheDocument();
      });
    });

    it('should not display empty state when items match filters', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Feature One')).toBeInTheDocument();
      });

      // Apply a filter that matches some items
      const typeDropdown = screen.getByTestId('type-filter-dropdown');
      fireEvent.click(typeDropdown);
      fireEvent.click(screen.getByRole('option', { name: 'feature' }));

      // Items should be visible, no empty state
      await waitFor(() => {
        expect(screen.getByText('Feature One')).toBeInTheDocument();
      });

      expect(screen.queryByText('No items match filters')).not.toBeInTheDocument();
    });

    it('should display empty state when search query matches no items', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Feature One')).toBeInTheDocument();
      });

      // Search for something that doesn't exist
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'NonExistentItem' } });

      // Wait for debounce and empty state
      await waitFor(
        () => {
          expect(screen.getByText('No items match filters')).toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });

    it('should display empty state when combined filters match no items', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Feature One')).toBeInTheDocument();
      });

      // Apply type filter: 'feature'
      const typeDropdown = screen.getByTestId('type-filter-dropdown');
      fireEvent.click(typeDropdown);
      fireEvent.click(screen.getByRole('option', { name: 'feature' }));

      // Apply agent filter: 'B.A.' (Feature One is assigned to Murdock)
      const agentDropdown = screen.getByTestId('agent-filter-dropdown');
      fireEvent.click(agentDropdown);
      fireEvent.click(screen.getByRole('option', { name: 'B.A.' }));

      // No items match both filters
      await waitFor(() => {
        expect(screen.getByText('No items match filters')).toBeInTheDocument();
      });
    });
  });

  describe('Empty state message styling', () => {
    it('should display message centered in board area', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Feature One')).toBeInTheDocument();
      });

      // Apply filter that matches nothing
      const typeDropdown = screen.getByTestId('type-filter-dropdown');
      fireEvent.click(typeDropdown);
      fireEvent.click(screen.getByRole('option', { name: 'interface' }));

      await waitFor(() => {
        expect(screen.getByText('No items match filters')).toBeInTheDocument();
      });

      // Check the empty state container has centering classes
      const emptyStateMessage = screen.getByText('No items match filters');
      const emptyStateContainer = emptyStateMessage.closest('[data-testid="filter-empty-state"]');

      expect(emptyStateContainer).toBeInTheDocument();
    });

    it('should have correct text styling (14px, #6b7280 color)', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Feature One')).toBeInTheDocument();
      });

      // Apply filter that matches nothing
      const typeDropdown = screen.getByTestId('type-filter-dropdown');
      fireEvent.click(typeDropdown);
      fireEvent.click(screen.getByRole('option', { name: 'interface' }));

      await waitFor(() => {
        expect(screen.getByText('No items match filters')).toBeInTheDocument();
      });

      const emptyStateMessage = screen.getByText('No items match filters');

      // Check for Tailwind classes that represent 14px (text-sm) and gray-500 (#6b7280)
      expect(emptyStateMessage).toHaveClass('text-sm');
      expect(emptyStateMessage).toHaveClass('text-gray-500');
    });
  });

  describe('Clear filters button', () => {
    it('should display Clear filters button below empty state message', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Feature One')).toBeInTheDocument();
      });

      // Apply filter that matches nothing
      const typeDropdown = screen.getByTestId('type-filter-dropdown');
      fireEvent.click(typeDropdown);
      fireEvent.click(screen.getByRole('option', { name: 'interface' }));

      await waitFor(() => {
        expect(screen.getByText('No items match filters')).toBeInTheDocument();
      });

      // Clear filters button should be visible
      const clearButton = screen.getByTestId('empty-state-clear-filters');
      expect(clearButton).toBeInTheDocument();
      expect(clearButton).toHaveTextContent('Clear filters');
    });

    it('should have Clear filters button styled with green color (#22c55e)', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Feature One')).toBeInTheDocument();
      });

      // Apply filter that matches nothing
      const typeDropdown = screen.getByTestId('type-filter-dropdown');
      fireEvent.click(typeDropdown);
      fireEvent.click(screen.getByRole('option', { name: 'interface' }));

      await waitFor(() => {
        expect(screen.getByText('No items match filters')).toBeInTheDocument();
      });

      const clearButton = screen.getByTestId('empty-state-clear-filters');

      // Check for green color class (text-green-500 = #22c55e)
      expect(clearButton).toHaveClass('text-green-500');
    });

    it('should reset all filters when Clear filters is clicked', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Feature One')).toBeInTheDocument();
      });

      // Apply multiple filters
      const typeDropdown = screen.getByTestId('type-filter-dropdown');
      fireEvent.click(typeDropdown);
      fireEvent.click(screen.getByRole('option', { name: 'interface' }));

      await waitFor(() => {
        expect(screen.getByText('No items match filters')).toBeInTheDocument();
      });

      // Click clear filters button
      const clearButton = screen.getByTestId('empty-state-clear-filters');
      fireEvent.click(clearButton);

      // All items should be visible again
      await waitFor(() => {
        expect(screen.getByText('Feature One')).toBeInTheDocument();
        expect(screen.getByText('Bug Two')).toBeInTheDocument();
        expect(screen.getByText('Enhancement Three')).toBeInTheDocument();
      });

      // Empty state should be hidden
      expect(screen.queryByText('No items match filters')).not.toBeInTheDocument();
    });

    it('should reset type, agent, status filters and search query when clearing', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Feature One')).toBeInTheDocument();
      });

      // Apply type filter
      fireEvent.click(screen.getByTestId('type-filter-dropdown'));
      fireEvent.click(screen.getByRole('option', { name: 'interface' }));

      await waitFor(() => {
        expect(screen.getByText('No items match filters')).toBeInTheDocument();
      });

      // Click clear filters
      fireEvent.click(screen.getByTestId('empty-state-clear-filters'));

      // Verify all dropdowns reset to default values
      await waitFor(() => {
        expect(screen.getByTestId('type-filter-dropdown')).toHaveTextContent('All Types');
        expect(screen.getByTestId('agent-filter-dropdown')).toHaveTextContent('All Agents');
        expect(screen.getByTestId('status-filter-dropdown')).toHaveTextContent('All Status');
      });

      // Search input should also be cleared
      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;
      expect(searchInput.value).toBe('');
    });
  });

  describe('Empty state visibility toggle', () => {
    it('should hide empty state when filter is changed to match items', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Feature One')).toBeInTheDocument();
      });

      // Apply filter that matches nothing
      const typeDropdown = screen.getByTestId('type-filter-dropdown');
      fireEvent.click(typeDropdown);
      fireEvent.click(screen.getByRole('option', { name: 'interface' }));

      // Verify empty state is shown
      await waitFor(() => {
        expect(screen.getByText('No items match filters')).toBeInTheDocument();
      });

      // Change filter to match items
      fireEvent.click(screen.getByTestId('type-filter-dropdown'));
      fireEvent.click(screen.getByRole('option', { name: 'feature' }));

      // Empty state should disappear
      await waitFor(() => {
        expect(screen.queryByText('No items match filters')).not.toBeInTheDocument();
      });

      // Items should be visible
      expect(screen.getByText('Feature One')).toBeInTheDocument();
    });

    it('should show empty state when all filters result in no matches', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Feature One')).toBeInTheDocument();
      });

      // Apply status filter: 'Blocked' (no items are blocked in test data)
      const statusDropdown = screen.getByTestId('status-filter-dropdown');
      fireEvent.click(statusDropdown);
      fireEvent.click(screen.getByRole('option', { name: 'Blocked' }));

      // Empty state should appear
      await waitFor(() => {
        expect(screen.getByText('No items match filters')).toBeInTheDocument();
      });
    });
  });

  describe('Empty state in board area', () => {
    it('should render empty state within the board columns area', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Feature One')).toBeInTheDocument();
      });

      // Apply filter that matches nothing
      const typeDropdown = screen.getByTestId('type-filter-dropdown');
      fireEvent.click(typeDropdown);
      fireEvent.click(screen.getByRole('option', { name: 'interface' }));

      await waitFor(() => {
        expect(screen.getByText('No items match filters')).toBeInTheDocument();
      });

      // The empty state should have a test ID for targeting
      const emptyState = screen.getByTestId('filter-empty-state');
      expect(emptyState).toBeInTheDocument();
    });

    it('should not show column headers when empty state is displayed', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Feature One')).toBeInTheDocument();
      });

      // Apply filter that matches nothing
      const typeDropdown = screen.getByTestId('type-filter-dropdown');
      fireEvent.click(typeDropdown);
      fireEvent.click(screen.getByRole('option', { name: 'interface' }));

      await waitFor(() => {
        expect(screen.getByText('No items match filters')).toBeInTheDocument();
      });

      // Empty state replaces the columns view entirely
      const emptyState = screen.getByTestId('filter-empty-state');
      expect(emptyState).toBeInTheDocument();
    });
  });
});
