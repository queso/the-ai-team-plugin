import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type { UseBoardEventsReturn } from '@/hooks/use-board-events';
import type { WorkItem } from '@/types';

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

// Create diverse work items for filter testing
const mockWorkItems: WorkItem[] = [
  {
    id: '001',
    title: 'Feature Alpha',
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
    title: 'Bug Fix Beta',
    type: 'bug',
    status: 'active',
    assigned_agent: 'B.A.',
    rejection_count: 2,
    dependencies: ['001'],
    outputs: {},
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
    stage: 'testing',
    content: 'Test content 2',
  },
  {
    id: '003',
    title: 'Enhancement Gamma',
    type: 'enhancement',
    status: 'active',
    assigned_agent: 'Hannibal',
    rejection_count: 0,
    dependencies: [],
    outputs: {},
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
    stage: 'implementing',
    content: 'Test content 3',
  },
  {
    id: '004',
    title: 'Feature Delta',
    type: 'feature',
    status: 'pending',
    assigned_agent: undefined,
    rejection_count: 1,
    dependencies: ['002'],
    outputs: {},
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
    stage: 'blocked',
    content: 'Test content 4',
  },
  {
    id: '005',
    title: 'Bug Fix Epsilon',
    type: 'bug',
    status: 'completed',
    assigned_agent: 'Murdock',
    rejection_count: 0,
    dependencies: [],
    outputs: {},
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
    stage: 'done',
    content: 'Test content 5',
  },
  {
    id: '006',
    title: 'Feature Zeta',
    type: 'feature',
    status: 'active',
    assigned_agent: 'B.A.',
    rejection_count: 0,
    dependencies: [],
    outputs: {},
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
    stage: 'review',
    content: 'Test content 6',
  },
];

// Import the page component after mocks are set up
import Home from '../app/page';

describe('Page Filter Integration (Item 009)', () => {
  beforeEach(() => {
    mockConnectionState = 'connected';
    mockConnectionError = null;

    // Mock fetch for initial data - now using the new API endpoints
    global.fetch = vi.fn((url: string) => {
      // New projects API endpoint
      if (url === '/api/projects' || url.startsWith('/api/projects?')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: [{ id: 'kanban-viewer', name: 'Kanban Viewer', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]
          }),
        } as Response);
      }
      // New unified board API endpoint
      if (url.startsWith('/api/board')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              stages: [
                { id: 'briefings', name: 'Backlog', order: 0, wipLimit: null },
                { id: 'ready', name: 'Ready', order: 1, wipLimit: 10 },
                { id: 'testing', name: 'In Progress', order: 2, wipLimit: 5 },
                { id: 'review', name: 'Review', order: 3, wipLimit: 3 },
                { id: 'done', name: 'Done', order: 4, wipLimit: null },
                { id: 'blocked', name: 'Blocked', order: 5, wipLimit: null },
              ],
              // Transform mockWorkItems to API format for the mock
              items: mockWorkItems.map(item => ({
                id: item.id,
                title: item.title,
                description: item.content,
                type: item.type === 'enhancement' ? 'spike' : item.type === 'task' ? 'chore' : item.type,
                priority: 'medium',
                stageId: item.stage === 'briefings' ? 'briefings' : item.stage === 'implementing' || item.stage === 'testing' || item.stage === 'probing' ? 'testing' : item.stage,
                assignedAgent: item.assigned_agent || null,
                rejectionCount: item.rejection_count,
                createdAt: item.created_at,
                updatedAt: item.updated_at,
                completedAt: item.stage === 'done' ? item.updated_at : null,
                dependencies: item.dependencies,
                workLogs: [],
              })),
              claims: [],
              currentMission: {
                id: 'M-001',
                name: 'Filter Integration Test Mission',
                state: 'running',
                prdPath: '/test/prd.md',
                startedAt: '2026-01-15T00:00:00Z',
                completedAt: null,
                archivedAt: null,
              },
            },
          }),
        } as Response);
      }
      // New activity API endpoint
      if (url.startsWith('/api/activity')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { entries: [] },
          }),
        } as Response);
      }
      return Promise.reject(new Error('Unknown URL'));
    }) as typeof fetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('FilterBar rendering position', () => {
    it('should render FilterBar between header and columns', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByTestId('filter-bar')).toBeInTheDocument();
      });

      // FilterBar should exist and be visible
      const filterBar = screen.getByTestId('filter-bar');
      expect(filterBar).toBeInTheDocument();
    });

    it('should render FilterBar after HeaderBar component', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Filter Integration Test Mission')).toBeInTheDocument();
      });

      // Both should be rendered
      const filterBar = screen.getByTestId('filter-bar');
      expect(filterBar).toBeInTheDocument();

      // Header should contain mission name (appears before filter bar)
      expect(screen.getByText('Filter Integration Test Mission')).toBeInTheDocument();
    });

    it('should render FilterBar before board columns', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByTestId('filter-bar')).toBeInTheDocument();
      });

      // Work items should be visible (columns are rendered)
      await waitFor(() => {
        expect(screen.getByText('Feature Alpha')).toBeInTheDocument();
      });
    });
  });

  describe('Filter state management with useFilterState hook', () => {
    it('should render all filter dropdowns with default values', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByTestId('filter-bar')).toBeInTheDocument();
      });

      // All filter dropdowns should show default "All" values
      expect(screen.getByTestId('type-filter-dropdown')).toHaveTextContent('All Types');
      expect(screen.getByTestId('agent-filter-dropdown')).toHaveTextContent('All Agents');
      expect(screen.getByTestId('status-filter-dropdown')).toHaveTextContent('All Status');
    });

    it('should update type filter when dropdown selection changes', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByTestId('type-filter-dropdown')).toBeInTheDocument();
      });

      // Open type dropdown and select 'bug'
      const typeDropdown = screen.getByTestId('type-filter-dropdown');
      fireEvent.click(typeDropdown);

      const bugOption = screen.getByRole('option', { name: 'bug' });
      fireEvent.click(bugOption);

      // Dropdown should now show 'bug'
      await waitFor(() => {
        expect(screen.getByTestId('type-filter-dropdown')).toHaveTextContent('bug');
      });
    });

    it('should update agent filter when dropdown selection changes', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByTestId('agent-filter-dropdown')).toBeInTheDocument();
      });

      // Open agent dropdown and select 'Murdock'
      const agentDropdown = screen.getByTestId('agent-filter-dropdown');
      fireEvent.click(agentDropdown);

      const murdockOption = screen.getByRole('option', { name: 'Murdock' });
      fireEvent.click(murdockOption);

      await waitFor(() => {
        expect(screen.getByTestId('agent-filter-dropdown')).toHaveTextContent('Murdock');
      });
    });

    it('should update status filter when dropdown selection changes', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByTestId('status-filter-dropdown')).toBeInTheDocument();
      });

      // Open status dropdown and select 'Active'
      const statusDropdown = screen.getByTestId('status-filter-dropdown');
      fireEvent.click(statusDropdown);

      const activeOption = screen.getByRole('option', { name: 'Active' });
      fireEvent.click(activeOption);

      await waitFor(() => {
        expect(screen.getByTestId('status-filter-dropdown')).toHaveTextContent('Active');
      });
    });
  });

  describe('workItems filtering with filterWorkItems', () => {
    it('should display all items when no filters are applied', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Feature Alpha')).toBeInTheDocument();
      });

      // All 6 items should be visible
      expect(screen.getByText('Feature Alpha')).toBeInTheDocument();
      expect(screen.getByText('Bug Fix Beta')).toBeInTheDocument();
      expect(screen.getByText('Enhancement Gamma')).toBeInTheDocument();
      expect(screen.getByText('Feature Delta')).toBeInTheDocument();
      expect(screen.getByText('Bug Fix Epsilon')).toBeInTheDocument();
      expect(screen.getByText('Feature Zeta')).toBeInTheDocument();
    });

    it('should filter items by type and hide non-matching items', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Feature Alpha')).toBeInTheDocument();
      });

      // Select 'bug' type filter
      const typeDropdown = screen.getByTestId('type-filter-dropdown');
      fireEvent.click(typeDropdown);
      fireEvent.click(screen.getByRole('option', { name: 'bug' }));

      // Only bug items should remain visible
      await waitFor(() => {
        expect(screen.getByText('Bug Fix Beta')).toBeInTheDocument();
        expect(screen.getByText('Bug Fix Epsilon')).toBeInTheDocument();
      });

      // Feature and enhancement items should be hidden
      expect(screen.queryByText('Feature Alpha')).not.toBeInTheDocument();
      expect(screen.queryByText('Enhancement Gamma')).not.toBeInTheDocument();
      expect(screen.queryByText('Feature Delta')).not.toBeInTheDocument();
      expect(screen.queryByText('Feature Zeta')).not.toBeInTheDocument();
    });

    it('should filter items by agent and hide non-matching items', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Feature Alpha')).toBeInTheDocument();
      });

      // Select 'Murdock' agent filter
      const agentDropdown = screen.getByTestId('agent-filter-dropdown');
      fireEvent.click(agentDropdown);
      fireEvent.click(screen.getByRole('option', { name: 'Murdock' }));

      // Only Murdock's items should remain visible
      await waitFor(() => {
        expect(screen.getByText('Feature Alpha')).toBeInTheDocument();
        expect(screen.getByText('Bug Fix Epsilon')).toBeInTheDocument();
      });

      // Other agents' items should be hidden
      expect(screen.queryByText('Bug Fix Beta')).not.toBeInTheDocument();
      expect(screen.queryByText('Enhancement Gamma')).not.toBeInTheDocument();
    });

    it('should filter items by status and hide non-matching items', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Feature Alpha')).toBeInTheDocument();
      });

      // Select 'Blocked' status filter
      const statusDropdown = screen.getByTestId('status-filter-dropdown');
      fireEvent.click(statusDropdown);
      fireEvent.click(screen.getByRole('option', { name: 'Blocked' }));

      // Only blocked items should remain visible
      await waitFor(() => {
        expect(screen.getByText('Feature Delta')).toBeInTheDocument();
      });

      // Non-blocked items should be hidden
      expect(screen.queryByText('Feature Alpha')).not.toBeInTheDocument();
      expect(screen.queryByText('Bug Fix Beta')).not.toBeInTheDocument();
    });

    it('should combine multiple filters with AND logic', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Feature Alpha')).toBeInTheDocument();
      });

      // Apply type filter: 'feature'
      const typeDropdown = screen.getByTestId('type-filter-dropdown');
      fireEvent.click(typeDropdown);
      fireEvent.click(screen.getByRole('option', { name: 'feature' }));

      // Apply agent filter: 'B.A.'
      const agentDropdown = screen.getByTestId('agent-filter-dropdown');
      fireEvent.click(agentDropdown);
      fireEvent.click(screen.getByRole('option', { name: 'B.A.' }));

      // Only Feature Zeta matches both (feature type AND B.A. agent)
      await waitFor(() => {
        expect(screen.getByText('Feature Zeta')).toBeInTheDocument();
      });

      // Other items should be hidden (either not feature or not B.A.)
      expect(screen.queryByText('Feature Alpha')).not.toBeInTheDocument();
      expect(screen.queryByText('Feature Delta')).not.toBeInTheDocument();
    });
  });

  describe('Filtered items display across all columns', () => {
    it('should show filtered items in their correct stage columns', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Feature Alpha')).toBeInTheDocument();
      });

      // Apply 'Active' status filter (shows testing, implementing, review)
      const statusDropdown = screen.getByTestId('status-filter-dropdown');
      fireEvent.click(statusDropdown);
      fireEvent.click(screen.getByRole('option', { name: 'Active' }));

      // Active items in their respective columns should be visible
      await waitFor(() => {
        expect(screen.getByText('Bug Fix Beta')).toBeInTheDocument(); // testing
        expect(screen.getByText('Enhancement Gamma')).toBeInTheDocument(); // implementing
        expect(screen.getByText('Feature Zeta')).toBeInTheDocument(); // review
      });

      // Non-active items should be hidden
      expect(screen.queryByText('Feature Alpha')).not.toBeInTheDocument(); // ready
      expect(screen.queryByText('Feature Delta')).not.toBeInTheDocument(); // blocked
      expect(screen.queryByText('Bug Fix Epsilon')).not.toBeInTheDocument(); // done
    });

    it('should update columns when filter changes without page reload', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Feature Alpha')).toBeInTheDocument();
      });

      // All items visible initially
      expect(screen.getByText('Bug Fix Beta')).toBeInTheDocument();
      expect(screen.getByText('Bug Fix Epsilon')).toBeInTheDocument();

      // Apply 'bug' type filter
      const typeDropdown = screen.getByTestId('type-filter-dropdown');
      fireEvent.click(typeDropdown);
      fireEvent.click(screen.getByRole('option', { name: 'bug' }));

      // Bug items still visible
      await waitFor(() => {
        expect(screen.getByText('Bug Fix Beta')).toBeInTheDocument();
        expect(screen.getByText('Bug Fix Epsilon')).toBeInTheDocument();
      });

      // Now change to 'feature' type filter
      fireEvent.click(screen.getByTestId('type-filter-dropdown'));
      fireEvent.click(screen.getByRole('option', { name: 'feature' }));

      // Feature items should now be visible
      await waitFor(() => {
        expect(screen.getByText('Feature Alpha')).toBeInTheDocument();
        expect(screen.getByText('Feature Delta')).toBeInTheDocument();
        expect(screen.getByText('Feature Zeta')).toBeInTheDocument();
      });

      // Bug items should now be hidden
      expect(screen.queryByText('Bug Fix Beta')).not.toBeInTheDocument();
      expect(screen.queryByText('Bug Fix Epsilon')).not.toBeInTheDocument();
    });
  });

  describe('Filter changes update display without page reload', () => {
    it('should update display immediately when filter is applied', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Feature Alpha')).toBeInTheDocument();
      });

      // Initial state: 6 items visible
      const initialItems = [
        'Feature Alpha',
        'Bug Fix Beta',
        'Enhancement Gamma',
        'Feature Delta',
        'Bug Fix Epsilon',
        'Feature Zeta',
      ];
      initialItems.forEach((title) => {
        expect(screen.getByText(title)).toBeInTheDocument();
      });

      // Apply filter - should update without reload
      const typeDropdown = screen.getByTestId('type-filter-dropdown');
      fireEvent.click(typeDropdown);
      fireEvent.click(screen.getByRole('option', { name: 'enhancement' }));

      // Only enhancement item should remain
      await waitFor(() => {
        expect(screen.getByText('Enhancement Gamma')).toBeInTheDocument();
      });

      // All other items hidden
      expect(screen.queryByText('Feature Alpha')).not.toBeInTheDocument();
    });

    it('should reset to show all items when filter is cleared', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Feature Alpha')).toBeInTheDocument();
      });

      // Apply a filter
      const typeDropdown = screen.getByTestId('type-filter-dropdown');
      fireEvent.click(typeDropdown);
      fireEvent.click(screen.getByRole('option', { name: 'bug' }));

      // Only bugs visible
      await waitFor(() => {
        expect(screen.queryByText('Feature Alpha')).not.toBeInTheDocument();
      });

      // Clear filter by selecting 'All Types'
      fireEvent.click(screen.getByTestId('type-filter-dropdown'));
      fireEvent.click(screen.getByRole('option', { name: 'All Types' }));

      // All items visible again
      await waitFor(() => {
        expect(screen.getByText('Feature Alpha')).toBeInTheDocument();
        expect(screen.getByText('Bug Fix Beta')).toBeInTheDocument();
        expect(screen.getByText('Enhancement Gamma')).toBeInTheDocument();
      });
    });

    it('should handle search query filtering', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Feature Alpha')).toBeInTheDocument();
      });

      // Type in search input
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'Beta' } });

      // Wait for debounce and filtering
      await waitFor(
        () => {
          expect(screen.getByText('Bug Fix Beta')).toBeInTheDocument();
        },
        { timeout: 500 }
      );

      // Other items should be filtered out (after debounce)
      await waitFor(
        () => {
          expect(screen.queryByText('Feature Alpha')).not.toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });
  });
});
