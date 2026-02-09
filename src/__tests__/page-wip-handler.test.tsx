import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, within, fireEvent } from '@testing-library/react';
import type { UseBoardEventsOptions, UseBoardEventsReturn } from '@/hooks/use-board-events';
import type { WorkItem } from '@/types';
import { createMockFetch, createWorkItem } from './helpers/mock-api-responses';

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

const mockWorkItems: WorkItem[] = [
  createWorkItem({
    id: '001',
    title: 'Item in Testing',
    type: 'feature',
    stage: 'testing',
    content: 'Test content 1',
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
  }),
  createWorkItem({
    id: '002',
    title: 'Item in Implementing',
    type: 'bug',
    stage: 'implementing',
    content: 'Test content 2',
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
  }),
  createWorkItem({
    id: '003',
    title: 'Item in Review',
    type: 'task',
    stage: 'review',
    content: 'Test content 3',
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
  }),
];

// Import the page component after mocks are set up
import Home from '../app/page';

describe('Page WIP Handler', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    capturedCallbacks = null;
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Create base mock fetch for board/activity/projects endpoints
    const baseFetch = createMockFetch({ items: mockWorkItems });

    // Wrap it to also handle PATCH /api/stages/:id
    mockFetch = vi.fn((url: string | URL | Request, options?: RequestInit) => {
      const urlString = typeof url === 'string' ? url : url.toString();

      // Handle PATCH /api/stages/:id
      if (urlString.match(/\/api\/stages\/\w+/) && options?.method === 'PATCH') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response);
      }

      // Delegate to base mock fetch for other URLs
      return baseFetch(url as string);
    });

    global.fetch = mockFetch as typeof fetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy.mockRestore();
  });

  describe('handleWipLimitChange function', () => {
    it('should call PATCH /api/stages/:id when WIP limit is changed', async () => {
      render(<Home />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Test Mission')).toBeInTheDocument();
      });

      // Find the testing column and its WIP limit display
      const columns = screen.getAllByTestId('board-column');
      const testingColumn = columns.find((col) =>
        col.textContent?.includes('TESTING')
      );
      expect(testingColumn).toBeDefined();

      // Click on the WIP limit value to enter edit mode
      const wipLimitValue = within(testingColumn!).getByTestId('wip-limit-value');
      await act(async () => {
        wipLimitValue.click();
      });

      // Find the input and change the value
      const input = within(testingColumn!).getByTestId('wip-limit-input');
      fireEvent.change(input, { target: { value: '5' } });

      // Press Enter to save
      fireEvent.keyDown(input, { key: 'Enter' });

      // Verify the API call was made
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/stages/testing',
          expect.objectContaining({
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wipLimit: 5 }),
          })
        );
      });
    });

    it('should call API with null when WIP limit is set to unlimited (empty input)', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Test Mission')).toBeInTheDocument();
      });

      const columns = screen.getAllByTestId('board-column');
      const testingColumn = columns.find((col) =>
        col.textContent?.includes('TESTING')
      );
      expect(testingColumn).toBeDefined();

      const wipLimitValue = within(testingColumn!).getByTestId('wip-limit-value');
      await act(async () => {
        wipLimitValue.click();
      });

      const input = within(testingColumn!).getByTestId('wip-limit-input');
      fireEvent.change(input, { target: { value: '' } });

      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/stages/testing',
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ wipLimit: null }),
          })
        );
      });
    });

    it('should call API with null when WIP limit is set to 0', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Test Mission')).toBeInTheDocument();
      });

      const columns = screen.getAllByTestId('board-column');
      const testingColumn = columns.find((col) =>
        col.textContent?.includes('TESTING')
      );
      expect(testingColumn).toBeDefined();

      const wipLimitValue = within(testingColumn!).getByTestId('wip-limit-value');
      await act(async () => {
        wipLimitValue.click();
      });

      const input = within(testingColumn!).getByTestId('wip-limit-input');
      fireEvent.change(input, { target: { value: '0' } });

      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/stages/testing',
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ wipLimit: null }),
          })
        );
      });
    });

    it('should update local state immediately after successful API call', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Test Mission')).toBeInTheDocument();
      });

      const columns = screen.getAllByTestId('board-column');
      const reviewColumn = columns.find((col) =>
        col.textContent?.includes('REVIEW')
      );
      expect(reviewColumn).toBeDefined();

      // Initial WIP limit for review is 2
      const initialWipDisplay = within(reviewColumn!).getByTestId('wip-display');
      expect(initialWipDisplay.textContent).toContain('/2');

      // Click to edit
      const wipLimitValue = within(reviewColumn!).getByTestId('wip-limit-value');
      await act(async () => {
        wipLimitValue.click();
      });

      // Change to 10
      const input = within(reviewColumn!).getByTestId('wip-limit-input');
      fireEvent.change(input, { target: { value: '10' } });

      fireEvent.keyDown(input, { key: 'Enter' });

      // Wait for API call to complete and state to update
      await waitFor(() => {
        const wipDisplay = within(reviewColumn!).getByTestId('wip-display');
        expect(wipDisplay.textContent).toContain('/10');
      });
    });

    it('should log error when API call fails', async () => {
      // Override fetch to make PATCH fail
      mockFetch.mockImplementation((url: string | URL | Request, options?: RequestInit) => {
        const urlString = typeof url === 'string' ? url : url.toString();

        if (urlString.match(/\/api\/stages\/\w+/) && options?.method === 'PATCH') {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
          } as Response);
        }

        // Use original mock for other URLs
        const baseFetch = createMockFetch({ items: mockWorkItems });
        return baseFetch(url as string);
      });

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Test Mission')).toBeInTheDocument();
      });

      const columns = screen.getAllByTestId('board-column');
      const testingColumn = columns.find((col) =>
        col.textContent?.includes('TESTING')
      );
      expect(testingColumn).toBeDefined();

      const wipLimitValue = within(testingColumn!).getByTestId('wip-limit-value');
      await act(async () => {
        wipLimitValue.click();
      });

      const input = within(testingColumn!).getByTestId('wip-limit-input');
      fireEvent.change(input, { target: { value: '99' } });

      fireEvent.keyDown(input, { key: 'Enter' });

      // Wait for error to be logged
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to update WIP limit');
      });
    });

    it('should log error when API call throws network error', async () => {
      mockFetch.mockImplementation((url: string | URL | Request, options?: RequestInit) => {
        const urlString = typeof url === 'string' ? url : url.toString();

        if (urlString.match(/\/api\/stages\/\w+/) && options?.method === 'PATCH') {
          return Promise.reject(new Error('Network error'));
        }

        const baseFetch = createMockFetch({ items: mockWorkItems });
        return baseFetch(url as string);
      });

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Test Mission')).toBeInTheDocument();
      });

      const columns = screen.getAllByTestId('board-column');
      const testingColumn = columns.find((col) =>
        col.textContent?.includes('TESTING')
      );
      expect(testingColumn).toBeDefined();

      const wipLimitValue = within(testingColumn!).getByTestId('wip-limit-value');
      await act(async () => {
        wipLimitValue.click();
      });

      const input = within(testingColumn!).getByTestId('wip-limit-input');
      fireEvent.change(input, { target: { value: '5' } });

      fireEvent.keyDown(input, { key: 'Enter' });

      // Wait for error to be logged
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error updating WIP limit:',
          expect.any(Error)
        );
      });
    });

    it('should not update local state when API call fails', async () => {
      mockFetch.mockImplementation((url: string | URL | Request, options?: RequestInit) => {
        const urlString = typeof url === 'string' ? url : url.toString();

        if (urlString.match(/\/api\/stages\/\w+/) && options?.method === 'PATCH') {
          return Promise.resolve({
            ok: false,
            status: 500,
          } as Response);
        }

        const baseFetch = createMockFetch({ items: mockWorkItems });
        return baseFetch(url as string);
      });

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Test Mission')).toBeInTheDocument();
      });

      const columns = screen.getAllByTestId('board-column');
      const testingColumn = columns.find((col) =>
        col.textContent?.includes('TESTING')
      );
      expect(testingColumn).toBeDefined();

      // Check initial value
      const initialWipDisplay = within(testingColumn!).getByTestId('wip-display');
      expect(initialWipDisplay.textContent).toContain('/2');

      const wipLimitValue = within(testingColumn!).getByTestId('wip-limit-value');
      await act(async () => {
        wipLimitValue.click();
      });

      const input = within(testingColumn!).getByTestId('wip-limit-input');
      fireEvent.change(input, { target: { value: '99' } });

      fireEvent.keyDown(input, { key: 'Enter' });

      // Wait for API call to complete
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      // Value should remain unchanged since API failed
      // After edit mode exits, the display should still show the original value
      await waitFor(() => {
        const wipDisplay = within(testingColumn!).getByTestId('wip-display');
        expect(wipDisplay.textContent).toContain('/2');
      });
    });
  });

  describe('onWipLimitChange prop passing', () => {
    it('should pass onWipLimitChange handler to all BoardColumn instances', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Test Mission')).toBeInTheDocument();
      });

      const columns = screen.getAllByTestId('board-column');

      // Each column should have a clickable WIP limit value
      for (const column of columns) {
        const wipLimitValue = within(column).getByTestId('wip-limit-value');
        // If onWipLimitChange is passed, clicking should enter edit mode
        await act(async () => {
          wipLimitValue.click();
        });

        // Edit mode should be active (input should appear)
        const input = within(column).queryByTestId('wip-limit-input');
        expect(input).toBeInTheDocument();

        // Exit edit mode by pressing Escape
        if (input) {
          fireEvent.keyDown(input, { key: 'Escape' });
        }
      }
    });

    it('should correctly identify stage when handler is called from different columns', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Test Mission')).toBeInTheDocument();
      });

      // Test implementing column
      const columns = screen.getAllByTestId('board-column');
      const implementingColumn = columns.find((col) =>
        col.textContent?.includes('IMPLEMENTING')
      );
      expect(implementingColumn).toBeDefined();

      const wipLimitValue = within(implementingColumn!).getByTestId('wip-limit-value');
      await act(async () => {
        wipLimitValue.click();
      });

      const input = within(implementingColumn!).getByTestId('wip-limit-input');
      fireEvent.change(input, { target: { value: '7' } });

      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/stages/implementing',
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ wipLimit: 7 }),
          })
        );
      });
    });
  });

  describe('persistence verification', () => {
    it('should make API call to persist WIP limit change', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Test Mission')).toBeInTheDocument();
      });

      const columns = screen.getAllByTestId('board-column');
      const testingColumn = columns.find((col) =>
        col.textContent?.includes('TESTING')
      );
      expect(testingColumn).toBeDefined();

      const wipLimitValue = within(testingColumn!).getByTestId('wip-limit-value');
      await act(async () => {
        wipLimitValue.click();
      });

      const input = within(testingColumn!).getByTestId('wip-limit-input');
      fireEvent.change(input, { target: { value: '15' } });

      fireEvent.keyDown(input, { key: 'Enter' });

      // Verify the API was called, which means the change will persist
      await waitFor(() => {
        const patchCalls = mockFetch.mock.calls.filter(
          (call: unknown[]) => {
            const url = call[0] as string;
            const options = call[1] as RequestInit | undefined;
            return url.includes('/api/stages/') && options?.method === 'PATCH';
          }
        );
        expect(patchCalls.length).toBe(1);
        expect(patchCalls[0][0]).toBe('/api/stages/testing');
      });
    });
  });

  describe('multiple WIP limit changes', () => {
    it('should handle multiple WIP limit changes sequentially', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Test Mission')).toBeInTheDocument();
      });

      // Change testing column
      const columns = screen.getAllByTestId('board-column');
      const testingColumn = columns.find((col) =>
        col.textContent?.includes('TESTING')
      );

      const testingWipValue = within(testingColumn!).getByTestId('wip-limit-value');
      await act(async () => {
        testingWipValue.click();
      });

      const testingInput = within(testingColumn!).getByTestId('wip-limit-input');
      fireEvent.change(testingInput, { target: { value: '5' } });

      fireEvent.keyDown(testingInput, { key: 'Enter' });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/stages/testing',
          expect.anything()
        );
      });

      // Change review column
      const reviewColumn = columns.find((col) =>
        col.textContent?.includes('REVIEW')
      );

      const reviewWipValue = within(reviewColumn!).getByTestId('wip-limit-value');
      await act(async () => {
        reviewWipValue.click();
      });

      const reviewInput = within(reviewColumn!).getByTestId('wip-limit-input');
      fireEvent.change(reviewInput, { target: { value: '8' } });

      fireEvent.keyDown(reviewInput, { key: 'Enter' });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/stages/review',
          expect.anything()
        );
      });

      // Verify both calls were made
      const patchCalls = mockFetch.mock.calls.filter(
        (call: unknown[]) => {
          const url = call[0] as string;
          const options = call[1] as RequestInit | undefined;
          return url.includes('/api/stages/') && options?.method === 'PATCH';
        }
      );
      expect(patchCalls.length).toBe(2);
    });
  });
});
