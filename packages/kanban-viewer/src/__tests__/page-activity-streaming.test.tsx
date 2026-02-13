import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import type { UseBoardEventsOptions, UseBoardEventsReturn } from '@/hooks/use-board-events';
import { createMockFetch, createLogEntry } from './helpers/mock-api-responses';

// Store captured callbacks from useBoardEvents
let capturedCallbacks: UseBoardEventsOptions | null = null;
let mockIsConnected = true;
let mockConnectionError: Error | null = null;

// Mock Next.js navigation hooks
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => ({
    get: vi.fn(() => 'kanban-viewer'),
    toString: vi.fn(() => 'projectId=kanban-viewer'),
  })),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

// Mock useBoardEvents hook to capture callbacks
vi.mock('@/hooks/use-board-events', () => ({
  useBoardEvents: vi.fn((options: UseBoardEventsOptions): UseBoardEventsReturn => {
    capturedCallbacks = options;
    return {
      isConnected: mockIsConnected,
      connectionState: 'connected' as const,
      connectionError: mockConnectionError,
    };
  }),
}));

const initialLogEntries = [
  {
    timestamp: '2026-01-15T10:00:00Z',
    agent: 'Hannibal',
    message: 'Mission started',
  },
  {
    timestamp: '2026-01-15T10:05:00Z',
    agent: 'Face',
    message: 'Work item 001 picked up',
  },
];

// Import the page component after mocks are set up
import Home from '../app/page';

describe('Page Activity Log Streaming Integration', () => {
  beforeEach(() => {
    capturedCallbacks = null;
    mockIsConnected = true;
    mockConnectionError = null;

    global.fetch = createMockFetch({ activityEntries: initialLogEntries });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('onActivityEntry callback registration', () => {
    it('should pass onActivityEntry callback to useBoardEvents', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(capturedCallbacks).not.toBeNull();
      });

      expect(capturedCallbacks).toHaveProperty('onActivityEntry');
      expect(typeof capturedCallbacks?.onActivityEntry).toBe('function');
    });

    it('should have all required callbacks including onActivityEntry', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(capturedCallbacks).not.toBeNull();
      });

      // Verify onActivityEntry is among the callbacks
      expect(capturedCallbacks?.onActivityEntry).toBeDefined();
      expect(capturedCallbacks?.onItemAdded).toBeDefined();
      expect(capturedCallbacks?.onItemMoved).toBeDefined();
      expect(capturedCallbacks?.onItemUpdated).toBeDefined();
      expect(capturedCallbacks?.onItemDeleted).toBeDefined();
      expect(capturedCallbacks?.onBoardUpdated).toBeDefined();
    });
  });

  describe('appending new activity entries', () => {
    it('should append new activity entry to logEntries state when onActivityEntry is called', async () => {
      render(<Home />);

      // Wait for initial data to load
      await waitFor(() => {
        expect(screen.getByTestId('log-entries')).toBeInTheDocument();
      });

      // Initial entries should be present
      await waitFor(() => {
        expect(screen.getByText('Mission started')).toBeInTheDocument();
      });

      const newEntry = createLogEntry({
        timestamp: '2026-01-16T14:00:00Z',
        agent: 'B.A.',
        message: 'New SSE activity message',
      });

      // Trigger the onActivityEntry callback
      act(() => {
        capturedCallbacks?.onActivityEntry?.(newEntry);
      });

      // New entry should be rendered
      await waitFor(() => {
        expect(screen.getByText('New SSE activity message')).toBeInTheDocument();
      });
    });

    it('should preserve existing entries when appending new ones', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Mission started')).toBeInTheDocument();
        expect(screen.getByText('Work item 001 picked up')).toBeInTheDocument();
      });

      const newEntry = createLogEntry({
        timestamp: '2026-01-16T14:00:00Z',
        agent: 'Lynch',
        message: 'Review completed',
      });

      act(() => {
        capturedCallbacks?.onActivityEntry?.(newEntry);
      });

      // All entries should be present
      await waitFor(() => {
        expect(screen.getByText('Mission started')).toBeInTheDocument();
        expect(screen.getByText('Work item 001 picked up')).toBeInTheDocument();
        expect(screen.getByText('Review completed')).toBeInTheDocument();
      });
    });

    it('should handle multiple new activity entries in sequence', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByTestId('log-entries')).toBeInTheDocument();
      });

      const entry1 = createLogEntry({
        timestamp: '2026-01-16T14:00:00Z',
        agent: 'Murdock',
        message: 'First new entry',
      });
      const entry2 = createLogEntry({
        timestamp: '2026-01-16T14:01:00Z',
        agent: 'B.A.',
        message: 'Second new entry',
      });
      const entry3 = createLogEntry({
        timestamp: '2026-01-16T14:02:00Z',
        agent: 'Hannibal',
        message: 'Third new entry',
      });

      act(() => {
        capturedCallbacks?.onActivityEntry?.(entry1);
        capturedCallbacks?.onActivityEntry?.(entry2);
        capturedCallbacks?.onActivityEntry?.(entry3);
      });

      await waitFor(() => {
        expect(screen.getByText('First new entry')).toBeInTheDocument();
        expect(screen.getByText('Second new entry')).toBeInTheDocument();
        expect(screen.getByText('Third new entry')).toBeInTheDocument();
      });
    });

    it('should handle activity entries with highlightType', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByTestId('log-entries')).toBeInTheDocument();
      });

      const approvedEntry = createLogEntry({
        timestamp: '2026-01-16T14:00:00Z',
        agent: 'Lynch',
        message: 'APPROVED: Work item 001 passed review',
        highlightType: 'approved',
      });

      act(() => {
        capturedCallbacks?.onActivityEntry?.(approvedEntry);
      });

      await waitFor(() => {
        expect(screen.getByText('APPROVED: Work item 001 passed review')).toBeInTheDocument();
      });
    });
  });

  describe('duplicate entry prevention', () => {
    it('should NOT add duplicate entries with same timestamp, agent, and message', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByTestId('log-entries')).toBeInTheDocument();
      });

      const entry = createLogEntry({
        timestamp: '2026-01-16T14:00:00Z',
        agent: 'Murdock',
        message: 'Unique activity message',
      });

      // Add the entry first time
      act(() => {
        capturedCallbacks?.onActivityEntry?.(entry);
      });

      await waitFor(() => {
        expect(screen.getByText('Unique activity message')).toBeInTheDocument();
      });

      // Try to add the same entry again
      act(() => {
        capturedCallbacks?.onActivityEntry?.(entry);
      });

      // Should only appear once - use getAllByText to count occurrences
      await waitFor(() => {
        const matches = screen.getAllByText('Unique activity message');
        expect(matches).toHaveLength(1);
      });
    });

    it('should NOT add entry that matches one from initial fetch', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Mission started')).toBeInTheDocument();
      });

      // Try to add an entry identical to one from initial fetch
      const duplicateOfInitial = createLogEntry({
        timestamp: '2026-01-15T10:00:00Z',
        agent: 'Hannibal',
        message: 'Mission started',
      });

      act(() => {
        capturedCallbacks?.onActivityEntry?.(duplicateOfInitial);
      });

      // Should still only have one "Mission started" entry
      await waitFor(() => {
        const matches = screen.getAllByText('Mission started');
        expect(matches).toHaveLength(1);
      });
    });

    it('should allow entries with same message but different timestamp', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByTestId('log-entries')).toBeInTheDocument();
      });

      const entry1 = createLogEntry({
        timestamp: '2026-01-16T14:00:00Z',
        agent: 'Murdock',
        message: 'Repeated message',
      });
      const entry2 = createLogEntry({
        timestamp: '2026-01-16T14:01:00Z', // Different timestamp
        agent: 'Murdock',
        message: 'Repeated message',
      });

      act(() => {
        capturedCallbacks?.onActivityEntry?.(entry1);
        capturedCallbacks?.onActivityEntry?.(entry2);
      });

      // Both entries should appear since timestamps differ
      await waitFor(() => {
        const matches = screen.getAllByText('Repeated message');
        expect(matches).toHaveLength(2);
      });
    });

    it('should allow entries with same timestamp but different agent', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByTestId('log-entries')).toBeInTheDocument();
      });

      const entry1 = createLogEntry({
        timestamp: '2026-01-16T14:00:00Z',
        agent: 'Murdock',
        message: 'Same time message',
      });
      const entry2 = createLogEntry({
        timestamp: '2026-01-16T14:00:00Z',
        agent: 'B.A.', // Different agent
        message: 'Same time message',
      });

      act(() => {
        capturedCallbacks?.onActivityEntry?.(entry1);
        capturedCallbacks?.onActivityEntry?.(entry2);
      });

      // Both entries should appear since agents differ
      await waitFor(() => {
        const matches = screen.getAllByText('Same time message');
        expect(matches).toHaveLength(2);
      });
    });

    it('should allow entries with same timestamp and agent but different message', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByTestId('log-entries')).toBeInTheDocument();
      });

      const entry1 = createLogEntry({
        timestamp: '2026-01-16T14:00:00Z',
        agent: 'Murdock',
        message: 'First message from Murdock',
      });
      const entry2 = createLogEntry({
        timestamp: '2026-01-16T14:00:00Z',
        agent: 'Murdock',
        message: 'Second message from Murdock', // Different message
      });

      act(() => {
        capturedCallbacks?.onActivityEntry?.(entry1);
        capturedCallbacks?.onActivityEntry?.(entry2);
      });

      // Both entries should appear since messages differ
      await waitFor(() => {
        expect(screen.getByText('First message from Murdock')).toBeInTheDocument();
        expect(screen.getByText('Second message from Murdock')).toBeInTheDocument();
      });
    });
  });

  describe('LiveFeedPanel receives updated entries', () => {
    it('should render LiveFeedPanel with initial entries', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByTestId('live-feed-panel')).toBeInTheDocument();
      });

      // Verify log-entries container exists and shows initial entries
      await waitFor(() => {
        const logEntriesContainer = screen.getByTestId('log-entries');
        expect(logEntriesContainer).toBeInTheDocument();
        expect(screen.getByText('Mission started')).toBeInTheDocument();
        expect(screen.getByText('Work item 001 picked up')).toBeInTheDocument();
      });
    });

    it('should update LiveFeedPanel when new activity entry is added', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByTestId('live-feed-panel')).toBeInTheDocument();
      });

      const newEntry = createLogEntry({
        timestamp: '2026-01-16T15:00:00Z',
        agent: 'Face',
        message: 'Streaming entry to LiveFeedPanel',
      });

      act(() => {
        capturedCallbacks?.onActivityEntry?.(newEntry);
      });

      // Verify the new entry appears in the LiveFeedPanel
      await waitFor(() => {
        const logEntriesContainer = screen.getByTestId('log-entries');
        expect(logEntriesContainer).toBeInTheDocument();
        expect(screen.getByText('Streaming entry to LiveFeedPanel')).toBeInTheDocument();
      });
    });

    it('should display agent name with correct styling in LiveFeedPanel', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByTestId('live-feed-panel')).toBeInTheDocument();
      });

      const newEntry = createLogEntry({
        timestamp: '2026-01-16T15:00:00Z',
        agent: 'Murdock',
        message: 'Agent name styling test',
      });

      act(() => {
        capturedCallbacks?.onActivityEntry?.(newEntry);
      });

      // Verify agent name is rendered with testid
      await waitFor(() => {
        const agentElement = screen.getByTestId('agent-name-Murdock');
        expect(agentElement).toBeInTheDocument();
        expect(agentElement).toHaveTextContent('Murdock');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty initial log entries', async () => {
      // Override fetch to return empty activity log and no items
      global.fetch = createMockFetch({ items: [], activityEntries: [] });

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByTestId('log-entries')).toBeInTheDocument();
      });

      // Add first entry via SSE
      const newEntry = createLogEntry({
        timestamp: '2026-01-16T15:00:00Z',
        agent: 'Hannibal',
        message: 'First entry via SSE',
      });

      act(() => {
        capturedCallbacks?.onActivityEntry?.(newEntry);
      });

      await waitFor(() => {
        expect(screen.getByText('First entry via SSE')).toBeInTheDocument();
      });
    });

    it('should handle activity entry with special characters in message', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByTestId('log-entries')).toBeInTheDocument();
      });

      const entryWithSpecialChars = createLogEntry({
        timestamp: '2026-01-16T15:00:00Z',
        agent: 'Face',
        message: 'Work item <001> completed with "success" & all tests passed!',
      });

      act(() => {
        capturedCallbacks?.onActivityEntry?.(entryWithSpecialChars);
      });

      await waitFor(() => {
        expect(screen.getByText('Work item <001> completed with "success" & all tests passed!')).toBeInTheDocument();
      });
    });

    it('should handle rapid streaming of activity entries', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByTestId('log-entries')).toBeInTheDocument();
      });

      // Simulate rapid SSE events
      const entries = Array.from({ length: 10 }, (_, i) =>
        createLogEntry({
          timestamp: `2026-01-16T15:00:${i.toString().padStart(2, '0')}Z`,
          agent: 'Murdock',
          message: `Rapid entry ${i + 1}`,
        })
      );

      act(() => {
        entries.forEach((entry) => {
          capturedCallbacks?.onActivityEntry?.(entry);
        });
      });

      // All entries should be rendered
      await waitFor(() => {
        entries.forEach((_, i) => {
          expect(screen.getByText(`Rapid entry ${i + 1}`)).toBeInTheDocument();
        });
      });
    });
  });

  describe('chronological ordering', () => {
    it('should display entries in chronological order (oldest first) even though API returns newest first', async () => {
      // This test verifies the fix for the bug where activity logs would disappear on refresh
      // The API returns entries in descending order (newest first), but the UI expects
      // ascending order (oldest first) so new SSE entries append at the bottom
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByTestId('log-entries')).toBeInTheDocument();
      });

      // Get the log entries container and find all message elements
      const logEntriesContainer = screen.getByTestId('log-entries');

      // Wait for both entries to appear
      await waitFor(() => {
        expect(screen.getByText('Mission started')).toBeInTheDocument();
        expect(screen.getByText('Work item 001 picked up')).toBeInTheDocument();
      });

      // Verify the order: "Mission started" (10:00:00) should appear BEFORE "Work item 001 picked up" (10:05:00)
      const allText = logEntriesContainer.textContent || '';
      const missionStartedIndex = allText.indexOf('Mission started');
      const workItemPickedIndex = allText.indexOf('Work item 001 picked up');

      expect(missionStartedIndex).toBeLessThan(workItemPickedIndex);
    });

    it('should append new SSE entries after initial chronologically-ordered entries', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Mission started')).toBeInTheDocument();
        expect(screen.getByText('Work item 001 picked up')).toBeInTheDocument();
      });

      // Add a new entry via SSE with a later timestamp
      const newEntry = createLogEntry({
        timestamp: '2026-01-15T10:10:00Z', // After the initial entries
        agent: 'B.A.',
        message: 'New SSE entry after initial load',
      });

      act(() => {
        capturedCallbacks?.onActivityEntry?.(newEntry);
      });

      await waitFor(() => {
        expect(screen.getByText('New SSE entry after initial load')).toBeInTheDocument();
      });

      // Verify order: all three should be in chronological order
      const logEntriesContainer = screen.getByTestId('log-entries');
      const allText = logEntriesContainer.textContent || '';

      const missionStartedIndex = allText.indexOf('Mission started');
      const workItemPickedIndex = allText.indexOf('Work item 001 picked up');
      const newEntryIndex = allText.indexOf('New SSE entry after initial load');

      // Should be in order: Mission started < Work item picked up < New SSE entry
      expect(missionStartedIndex).toBeLessThan(workItemPickedIndex);
      expect(workItemPickedIndex).toBeLessThan(newEntryIndex);
    });
  });
});
