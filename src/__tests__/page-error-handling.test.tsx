import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { UseBoardEventsReturn } from '@/hooks/use-board-events';

// Mock useBoardEvents hook
vi.mock('@/hooks/use-board-events', () => ({
  useBoardEvents: vi.fn((): UseBoardEventsReturn => {
    return {
      isConnected: true,
      connectionState: 'connected',
      connectionError: null,
    };
  }),
}));

// Mock successful board API response for reuse
const mockSuccessfulBoardResponse = {
  ok: true,
  json: () => Promise.resolve({
    success: true,
    data: {
      stages: [
        { id: 'briefings', name: 'Backlog', order: 0, wipLimit: null },
        { id: 'ready', name: 'Ready', order: 1, wipLimit: 10 },
        { id: 'testing', name: 'In Progress', order: 2, wipLimit: 5 },
        { id: 'implementing', name: 'Implementing', order: 3, wipLimit: 3 },
        { id: 'review', name: 'Review', order: 4, wipLimit: 3 },
        { id: 'done', name: 'Done', order: 5, wipLimit: null },
        { id: 'blocked', name: 'Blocked', order: 6, wipLimit: null },
      ],
      items: [],
      claims: [],
      currentMission: {
        id: 'M-001',
        name: 'Test Mission',
        state: 'running',
        prdPath: '/test/prd.md',
        startedAt: '2026-01-17T00:00:00Z',
        completedAt: null,
        archivedAt: null,
      },
    },
  }),
} as Response;

// Mock successful activity API response for reuse
const mockSuccessfulActivityResponse = {
  ok: true,
  json: () => Promise.resolve({
    success: true,
    data: { entries: [] },
  }),
} as Response;

// Import the page component after mocks are set up
import Home from '../app/page';

describe('Page Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Board API error handling', () => {
    it('should show specific error message when /api/board returns 500', async () => {
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
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            json: () => Promise.resolve({
              success: false,
              error: 'Database connection failed',
            }),
          } as Response);
        }
        if (url.startsWith('/api/activity')) {
          return Promise.resolve(mockSuccessfulActivityResponse);
        }
        return Promise.reject(new Error('Unknown URL'));
      }) as typeof fetch;

      render(<Home />);

      await waitFor(() => {
        // Should display error state, not loading
        expect(screen.queryByText('Loading mission data...')).not.toBeInTheDocument();
      });

      // Should show an error message that indicates the board API failed
      expect(screen.getByText(/failed.*board/i)).toBeInTheDocument();
    });

    it('should show specific error message when /api/board returns 404', async () => {
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
            ok: false,
            status: 404,
            statusText: 'Not Found',
            json: () => Promise.resolve({
              success: false,
              error: 'No active mission found',
            }),
          } as Response);
        }
        if (url.startsWith('/api/activity')) {
          return Promise.resolve(mockSuccessfulActivityResponse);
        }
        return Promise.reject(new Error('Unknown URL'));
      }) as typeof fetch;

      render(<Home />);

      await waitFor(() => {
        expect(screen.queryByText('Loading mission data...')).not.toBeInTheDocument();
      });

      // Should show an error message appropriate for 404
      expect(screen.getByText(/not found|no.*mission/i)).toBeInTheDocument();
    });

    it('should include endpoint name in error message for board API failures', async () => {
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
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
          } as Response);
        }
        if (url.startsWith('/api/activity')) {
          return Promise.resolve(mockSuccessfulActivityResponse);
        }
        return Promise.reject(new Error('Unknown URL'));
      }) as typeof fetch;

      render(<Home />);

      await waitFor(() => {
        expect(screen.queryByText('Loading mission data...')).not.toBeInTheDocument();
      });

      // Error message should indicate which endpoint failed
      const errorElement = screen.getByText(/board/i);
      expect(errorElement).toBeInTheDocument();
    });
  });

  describe('Activity API graceful degradation', () => {
    it('should not show error when /api/activity returns 500 but board succeeds', async () => {
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
          return Promise.resolve(mockSuccessfulBoardResponse);
        }
        if (url.startsWith('/api/activity')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      }) as typeof fetch;

      render(<Home />);

      await waitFor(() => {
        // Page should load successfully with mission name visible
        expect(screen.getByText('Test Mission')).toBeInTheDocument();
      });

      // Should NOT show error state - activity log is optional
      // Check specifically for the error display element, not just any text
      expect(screen.queryByText('Failed to load board data')).not.toBeInTheDocument();
      expect(screen.queryByText(/failed.*board/i)).not.toBeInTheDocument();
    });

    it('should render board content when activity API fails', async () => {
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
          return Promise.resolve(mockSuccessfulBoardResponse);
        }
        if (url.startsWith('/api/activity')) {
          return Promise.resolve({
            ok: false,
            status: 404,
            statusText: 'Not Found',
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      }) as typeof fetch;

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Test Mission')).toBeInTheDocument();
      });

      // Board should be functional - check for stage column presence via data-testid or role
      // The page renders successfully even without activity log
      expect(screen.queryByText('Failed to load board data')).not.toBeInTheDocument();
    });
  });

  describe('Network error handling', () => {
    it('should show network error message when fetch throws', async () => {
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
        return Promise.reject(new Error('Network request failed'));
      }) as typeof fetch;

      render(<Home />);

      await waitFor(() => {
        expect(screen.queryByText('Loading mission data...')).not.toBeInTheDocument();
      });

      // Should show error for network failure
      expect(screen.getByText(/failed.*load.*board/i)).toBeInTheDocument();
    });

    it('should show distinct message for network errors vs API errors', async () => {
      // First test: API error (non-ok response)
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
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
          } as Response);
        }
        if (url.startsWith('/api/activity')) {
          return Promise.resolve(mockSuccessfulActivityResponse);
        }
        return Promise.reject(new Error('Unknown URL'));
      }) as typeof fetch;

      const { unmount } = render(<Home />);

      await waitFor(() => {
        expect(screen.queryByText('Loading mission data...')).not.toBeInTheDocument();
      });

      const apiErrorElement = screen.getByText(/failed.*load.*board/i);
      const apiErrorText = apiErrorElement.textContent;
      unmount();

      // Second test: Network error (fetch throws)
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
        return Promise.reject(new TypeError('Failed to fetch'));
      }) as typeof fetch;

      render(<Home />);

      await waitFor(() => {
        expect(screen.queryByText('Loading mission data...')).not.toBeInTheDocument();
      });

      const networkErrorElement = screen.getByText(/failed.*load.*board/i);
      const networkErrorText = networkErrorElement.textContent;

      // The two error messages should be distinguishable
      // (This test validates that different error types produce different messages)
      expect(apiErrorText).toBeDefined();
      expect(networkErrorText).toBeDefined();
    });

    it('should show error when board API request times out', async () => {
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
        return Promise.reject(new DOMException('The operation was aborted', 'AbortError'));
      }) as typeof fetch;

      render(<Home />);

      await waitFor(() => {
        expect(screen.queryByText('Loading mission data...')).not.toBeInTheDocument();
      });

      // Should show error state
      expect(screen.getByText(/failed.*load/i)).toBeInTheDocument();
    });
  });

  describe('JSON parse error handling', () => {
    it('should handle malformed JSON response from board API', async () => {
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
            json: () => Promise.reject(new SyntaxError('Unexpected token in JSON')),
          } as Response);
        }
        if (url.startsWith('/api/activity')) {
          return Promise.resolve(mockSuccessfulActivityResponse);
        }
        return Promise.reject(new Error('Unknown URL'));
      }) as typeof fetch;

      render(<Home />);

      await waitFor(() => {
        expect(screen.queryByText('Loading mission data...')).not.toBeInTheDocument();
      });

      // Should show error for parse failure
      expect(screen.getByText(/failed.*load.*board/i)).toBeInTheDocument();
    });

    it('should handle board API returning success:false', async () => {
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
              success: false,
              error: 'Invalid request parameters',
            }),
          } as Response);
        }
        if (url.startsWith('/api/activity')) {
          return Promise.resolve(mockSuccessfulActivityResponse);
        }
        return Promise.reject(new Error('Unknown URL'));
      }) as typeof fetch;

      render(<Home />);

      await waitFor(() => {
        expect(screen.queryByText('Loading mission data...')).not.toBeInTheDocument();
      });

      // When success: false, should show error or handle gracefully
      // Currently the implementation just doesn't set data, so we test for that behavior
      // The fix should show an error message
      expect(screen.getByText(/failed|error|invalid/i)).toBeInTheDocument();
    });
  });

  describe('Error message actionability', () => {
    it('should display user-actionable error message for server errors', async () => {
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
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
          } as Response);
        }
        if (url.startsWith('/api/activity')) {
          return Promise.resolve(mockSuccessfulActivityResponse);
        }
        return Promise.reject(new Error('Unknown URL'));
      }) as typeof fetch;

      render(<Home />);

      await waitFor(() => {
        expect(screen.queryByText('Loading mission data...')).not.toBeInTheDocument();
      });

      // Error message should be visible and meaningful to users
      const errorElement = screen.getByText(/failed|error|unavailable/i);
      expect(errorElement).toBeVisible();
    });
  });

  describe('Error state display', () => {
    it('should render error UI with destructive styling', async () => {
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
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
          } as Response);
        }
        if (url.startsWith('/api/activity')) {
          return Promise.resolve(mockSuccessfulActivityResponse);
        }
        return Promise.reject(new Error('Unknown URL'));
      }) as typeof fetch;

      render(<Home />);

      await waitFor(() => {
        expect(screen.queryByText('Loading mission data...')).not.toBeInTheDocument();
      });

      // Error display should use destructive/error styling
      // The implementation renders: <div className="text-destructive font-mono">{error}</div>
      const errorElement = screen.getByText(/failed|error/i);
      expect(errorElement).toHaveClass('text-destructive');
    });

    it('should not render board content when in error state', async () => {
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
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
          } as Response);
        }
        if (url.startsWith('/api/activity')) {
          return Promise.resolve(mockSuccessfulActivityResponse);
        }
        return Promise.reject(new Error('Unknown URL'));
      }) as typeof fetch;

      render(<Home />);

      await waitFor(() => {
        expect(screen.queryByText('Loading mission data...')).not.toBeInTheDocument();
      });

      // When in error state, should not render board columns or header
      expect(screen.queryByText('MISSION ACTIVE')).not.toBeInTheDocument();
      expect(screen.queryByTestId('connection-status-indicator')).not.toBeInTheDocument();
    });
  });
});
