import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { UseBoardEventsOptions, UseBoardEventsReturn } from '@/hooks/use-board-events';
import { createMockFetch, createLogEntry } from './helpers/mock-api-responses';

/**
 * Tests for verifying activity logs are loaded on initial page load.
 *
 * This addresses the bug where activity logs disappear on page refresh.
 * The logs should be fetched from GET /api/activity when the page loads,
 * independently of the SSE connection state.
 */

// Store captured callbacks from useBoardEvents
let capturedCallbacks: UseBoardEventsOptions | null = null;
let mockConnectionState: 'connecting' | 'connected' | 'disconnected' = 'connecting';

// Mock Next.js navigation hooks
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => ({
    get: vi.fn(() => 'test-project'),
    toString: vi.fn(() => 'projectId=test-project'),
  })),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

// Mock useBoardEvents hook - allows us to control connection state
vi.mock('@/hooks/use-board-events', () => ({
  useBoardEvents: vi.fn((options: UseBoardEventsOptions): UseBoardEventsReturn => {
    capturedCallbacks = options;
    return {
      isConnected: mockConnectionState === 'connected',
      connectionState: mockConnectionState,
      connectionError: null,
    };
  }),
}));

// Initial log entries that should appear on page load
const initialLogEntries = [
  createLogEntry({
    timestamp: '2026-01-15T10:00:00Z',
    agent: 'Hannibal',
    message: 'Mission started - initial load entry 1',
  }),
  createLogEntry({
    timestamp: '2026-01-15T10:05:00Z',
    agent: 'Face',
    message: 'Work item picked up - initial load entry 2',
  }),
  createLogEntry({
    timestamp: '2026-01-15T10:10:00Z',
    agent: 'B.A.',
    message: 'Implementation complete - initial load entry 3',
  }),
];

// Import the page component after mocks are set up
import Home from '../app/page';

describe('Page Activity Log Initial Load', () => {
  beforeEach(() => {
    capturedCallbacks = null;
    mockConnectionState = 'connecting'; // Start in connecting state
    global.fetch = createMockFetch({ activityEntries: initialLogEntries });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('activity logs should load before SSE connects', () => {
    it('should display initial activity logs while SSE is still connecting', async () => {
      // Keep SSE in "connecting" state - it never connects during this test
      mockConnectionState = 'connecting';

      render(<Home />);

      // Wait for the initial fetch to complete and entries to appear
      await waitFor(() => {
        expect(screen.getByText('Mission started - initial load entry 1')).toBeInTheDocument();
      }, { timeout: 3000 });

      // All initial entries should be present
      expect(screen.getByText('Work item picked up - initial load entry 2')).toBeInTheDocument();
      expect(screen.getByText('Implementation complete - initial load entry 3')).toBeInTheDocument();
    });

    it('should fetch activity logs from GET /api/activity on page load', async () => {
      const mockFetch = createMockFetch({ activityEntries: initialLogEntries });
      global.fetch = mockFetch;

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Mission started - initial load entry 1')).toBeInTheDocument();
      });

      // Verify /api/activity was called
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/activity',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Project-ID': 'test-project',
          }),
        })
      );
    });

    it('should display logs in chronological order (oldest first) after reversing API response', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Mission started - initial load entry 1')).toBeInTheDocument();
      });

      // Get all log entries in the panel
      const logEntries = screen.getByTestId('log-entries');

      // The entries should appear in chronological order in the DOM
      // (API returns newest first, page reverses them)
      const entriesText = logEntries.textContent || '';
      const entry1Pos = entriesText.indexOf('initial load entry 1');
      const entry2Pos = entriesText.indexOf('initial load entry 2');
      const entry3Pos = entriesText.indexOf('initial load entry 3');

      expect(entry1Pos).toBeLessThan(entry2Pos);
      expect(entry2Pos).toBeLessThan(entry3Pos);
    });
  });

  describe('activity logs should persist after SSE connects', () => {
    it('should retain initial logs when SSE connection state changes to connected', async () => {
      // Start with connecting state
      mockConnectionState = 'connecting';

      const { rerender } = render(<Home />);

      // Wait for initial logs to appear
      await waitFor(() => {
        expect(screen.getByText('Mission started - initial load entry 1')).toBeInTheDocument();
      });

      // Simulate SSE connection completing
      mockConnectionState = 'connected';
      rerender(<Home />);

      // Initial logs should still be there
      expect(screen.getByText('Mission started - initial load entry 1')).toBeInTheDocument();
      expect(screen.getByText('Work item picked up - initial load entry 2')).toBeInTheDocument();
      expect(screen.getByText('Implementation complete - initial load entry 3')).toBeInTheDocument();
    });
  });

  describe('handles empty activity log', () => {
    it('should handle case when API returns no activity entries', async () => {
      global.fetch = createMockFetch({ activityEntries: [] });

      render(<Home />);

      // Wait for fetch to complete
      await waitFor(() => {
        expect(screen.getByTestId('log-entries')).toBeInTheDocument();
      });

      // Panel should exist but have no entry content (besides possible header)
      const logEntries = screen.getByTestId('log-entries');
      expect(logEntries.textContent).not.toContain('Mission started');
    });
  });

  describe('handles API errors gracefully', () => {
    it('should not crash if activity API fails', async () => {
      // Create a fetch that returns board data but fails on activity
      global.fetch = vi.fn((url: string) => {
        if (url === '/api/projects' || url.startsWith('/api/projects?')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: [{ id: 'test-project', name: 'Test Project' }],
            }),
          } as Response);
        }
        if (url.startsWith('/api/board')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: {
                stages: [{ id: 'ready', name: 'Ready', order: 1, wipLimit: null }],
                items: [],
                claims: [],
                currentMission: { id: 'M-001', name: 'Test', state: 'running', startedAt: '2026-01-01T00:00:00Z' },
              },
            }),
          } as Response);
        }
        if (url === '/api/activity' || url.startsWith('/api/activity?')) {
          // Activity API fails
          return Promise.reject(new Error('Network error'));
        }
        return Promise.reject(new Error(`Unknown URL: ${url}`));
      }) as typeof fetch;

      // Should render without crashing
      render(<Home />);

      // Board should still load
      await waitFor(() => {
        expect(screen.getByText('READY')).toBeInTheDocument();
      });
    });
  });
});
