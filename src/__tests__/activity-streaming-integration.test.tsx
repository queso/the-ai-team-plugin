import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import type { UseBoardEventsOptions, UseBoardEventsReturn } from '@/hooks/use-board-events';
import type { LogEntry } from '@/lib/activity-log';
import { createMockFetch, createLogEntry } from './helpers/mock-api-responses';

/**
 * Integration test for end-to-end activity log streaming.
 *
 * This test validates the complete pipeline:
 * activity.log write -> fs.watch detection -> SSE emit -> hook callback -> state update -> UI render
 *
 * Since we cannot write to the filesystem in JSDOM tests, we simulate the SSE layer
 * by mocking useBoardEvents and triggering callbacks that would be fired when
 * activity.log changes are detected.
 */

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
      connectionState: mockIsConnected ? 'connected' as const : 'disconnected' as const,
      connectionError: mockConnectionError,
    };
  }),
}));

// Initial log entries from "file"
const initialLogEntries = [
  {
    timestamp: '2026-01-15T10:00:00Z',
    agent: 'Hannibal',
    message: 'Mission briefing started',
  },
];

// Import the page component after mocks are set up
import Home from '../app/page';

describe('Activity Log Streaming Integration', () => {
  beforeEach(() => {
    capturedCallbacks = null;
    mockIsConnected = true;
    mockConnectionError = null;

    global.fetch = createMockFetch({
      missionName: 'Integration Test Mission',
      activityEntries: initialLogEntries,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('end-to-end data flow: file write -> SSE -> UI', () => {
    it('should display activity entry in Live Feed when SSE event fires (simulating file write)', async () => {
      render(<Home />);

      // Wait for initial data to load and Live Feed panel to render
      await waitFor(() => {
        expect(screen.getByTestId('live-feed-panel')).toBeInTheDocument();
        expect(screen.getByTestId('log-entries')).toBeInTheDocument();
      });

      // Verify initial entry from "file" is present
      await waitFor(() => {
        expect(screen.getByText('Mission briefing started')).toBeInTheDocument();
      });

      // Simulate: activity.log is written to -> fs.watch detects -> SSE emits activity-entry-added
      const newEntry = createLogEntry({
        timestamp: '2026-01-16T14:30:00Z',
        agent: 'B.A.',
        message: 'Implementation completed for item 001',
      });

      act(() => {
        capturedCallbacks?.onActivityEntry?.(newEntry);
      });

      // Verify: entry appears in UI
      await waitFor(() => {
        expect(screen.getByText('Implementation completed for item 001')).toBeInTheDocument();
      });
    });

    it('should include correct LogEntry data structure in displayed entry', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByTestId('log-entries')).toBeInTheDocument();
      });

      const entry = createLogEntry({
        timestamp: '2026-01-16T15:00:00Z',
        agent: 'Face',
        message: 'Resource acquisition complete',
      });

      act(() => {
        capturedCallbacks?.onActivityEntry?.(entry);
      });

      // Verify agent name is rendered correctly
      await waitFor(() => {
        const agentElement = screen.getByTestId('agent-name-Face');
        expect(agentElement).toBeInTheDocument();
        expect(agentElement).toHaveTextContent('Face');
      });

      // Verify message is rendered
      expect(screen.getByText('Resource acquisition complete')).toBeInTheDocument();
    });
  });

  describe('latency requirements', () => {
    it('should render new activity entry within 1 second of SSE event', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByTestId('log-entries')).toBeInTheDocument();
      });

      const entry = createLogEntry({
        timestamp: '2026-01-16T14:00:00Z',
        agent: 'Lynch',
        message: 'Review started for item 002',
      });

      const startTime = performance.now();

      act(() => {
        capturedCallbacks?.onActivityEntry?.(entry);
      });

      // Verify entry appears
      await waitFor(() => {
        expect(screen.getByText('Review started for item 002')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const latency = endTime - startTime;

      // Latency should be under 1 second (1000ms)
      expect(latency).toBeLessThan(1000);
    });

    it('should maintain sub-second latency for multiple sequential entries', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByTestId('log-entries')).toBeInTheDocument();
      });

      const entries = [
        createLogEntry({ timestamp: '2026-01-16T14:00:00Z', agent: 'Hannibal', message: 'Entry 1' }),
        createLogEntry({ timestamp: '2026-01-16T14:00:01Z', agent: 'Face', message: 'Entry 2' }),
        createLogEntry({ timestamp: '2026-01-16T14:00:02Z', agent: 'Murdock', message: 'Entry 3' }),
      ];

      for (const entry of entries) {
        const startTime = performance.now();

        act(() => {
          capturedCallbacks?.onActivityEntry?.(entry);
        });

        await waitFor(() => {
          expect(screen.getByText(entry.message)).toBeInTheDocument();
        });

        const latency = performance.now() - startTime;
        expect(latency).toBeLessThan(1000);
      }
    });
  });

  describe('rapid entry handling (no data loss)', () => {
    it('should handle 10 rapid entries without losing any', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByTestId('log-entries')).toBeInTheDocument();
      });

      // Create 10 rapid entries
      const rapidEntries = Array.from({ length: 10 }, (_, i) =>
        createLogEntry({
          timestamp: `2026-01-16T15:00:${i.toString().padStart(2, '0')}Z`,
          agent: 'Murdock',
          message: `Rapid activity ${i + 1}`,
        })
      );

      // Fire all entries in rapid succession (single act block)
      act(() => {
        rapidEntries.forEach((entry) => {
          capturedCallbacks?.onActivityEntry?.(entry);
        });
      });

      // Verify ALL entries appear - no loss
      await waitFor(() => {
        for (let i = 1; i <= 10; i++) {
          expect(screen.getByText(`Rapid activity ${i}`)).toBeInTheDocument();
        }
      });
    });

    it('should handle 50 rapid entries without data loss', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByTestId('log-entries')).toBeInTheDocument();
      });

      // Create 50 rapid entries to stress test
      const rapidEntries = Array.from({ length: 50 }, (_, i) =>
        createLogEntry({
          timestamp: `2026-01-16T15:${Math.floor(i / 60).toString().padStart(2, '0')}:${(i % 60).toString().padStart(2, '0')}Z`,
          agent: ['Hannibal', 'Face', 'Murdock', 'B.A.', 'Lynch'][i % 5] as LogEntry['agent'],
          message: `Stress test entry ${i + 1}`,
        })
      );

      act(() => {
        rapidEntries.forEach((entry) => {
          capturedCallbacks?.onActivityEntry?.(entry);
        });
      });

      // Verify all 50 entries are present
      await waitFor(() => {
        for (let i = 1; i <= 50; i++) {
          expect(screen.getByText(`Stress test entry ${i}`)).toBeInTheDocument();
        }
      });
    });

    it('should preserve entry order when entries arrive rapidly', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByTestId('log-entries')).toBeInTheDocument();
      });

      const orderedEntries = [
        createLogEntry({ timestamp: '2026-01-16T15:00:01Z', agent: 'Hannibal', message: 'First in sequence' }),
        createLogEntry({ timestamp: '2026-01-16T15:00:02Z', agent: 'Face', message: 'Second in sequence' }),
        createLogEntry({ timestamp: '2026-01-16T15:00:03Z', agent: 'Murdock', message: 'Third in sequence' }),
        createLogEntry({ timestamp: '2026-01-16T15:00:04Z', agent: 'B.A.', message: 'Fourth in sequence' }),
        createLogEntry({ timestamp: '2026-01-16T15:00:05Z', agent: 'Lynch', message: 'Fifth in sequence' }),
      ];

      act(() => {
        orderedEntries.forEach((entry) => {
          capturedCallbacks?.onActivityEntry?.(entry);
        });
      });

      // All entries should be present
      await waitFor(() => {
        expect(screen.getByText('First in sequence')).toBeInTheDocument();
        expect(screen.getByText('Fifth in sequence')).toBeInTheDocument();
      });

      // Verify order by checking DOM structure
      const logContainer = screen.getByTestId('log-entries');
      const textContent = logContainer.textContent || '';

      const firstIndex = textContent.indexOf('First in sequence');
      const secondIndex = textContent.indexOf('Second in sequence');
      const thirdIndex = textContent.indexOf('Third in sequence');
      const fourthIndex = textContent.indexOf('Fourth in sequence');
      const fifthIndex = textContent.indexOf('Fifth in sequence');

      expect(firstIndex).toBeLessThan(secondIndex);
      expect(secondIndex).toBeLessThan(thirdIndex);
      expect(thirdIndex).toBeLessThan(fourthIndex);
      expect(fourthIndex).toBeLessThan(fifthIndex);
    });
  });

  describe('SSE event data validation', () => {
    it('should correctly display entry with highlightType approved', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByTestId('log-entries')).toBeInTheDocument();
      });

      const approvedEntry = createLogEntry({
        timestamp: '2026-01-16T16:00:00Z',
        agent: 'Lynch',
        message: 'APPROVED: Item 001 passed all tests',
        highlightType: 'approved',
      });

      act(() => {
        capturedCallbacks?.onActivityEntry?.(approvedEntry);
      });

      await waitFor(() => {
        expect(screen.getByText('APPROVED: Item 001 passed all tests')).toBeInTheDocument();
      });
    });

    it('should correctly display entry with highlightType rejected', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByTestId('log-entries')).toBeInTheDocument();
      });

      const rejectedEntry = createLogEntry({
        timestamp: '2026-01-16T16:00:00Z',
        agent: 'Lynch',
        message: 'REJECTED: Item 002 failed code review',
        highlightType: 'rejected',
      });

      act(() => {
        capturedCallbacks?.onActivityEntry?.(rejectedEntry);
      });

      await waitFor(() => {
        expect(screen.getByText('REJECTED: Item 002 failed code review')).toBeInTheDocument();
      });
    });

    it('should handle entries from all agent types', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByTestId('log-entries')).toBeInTheDocument();
      });

      const agents = ['Hannibal', 'Face', 'Murdock', 'B.A.', 'Lynch'] as const;

      act(() => {
        agents.forEach((agent, i) => {
          capturedCallbacks?.onActivityEntry?.(createLogEntry({
            timestamp: `2026-01-16T17:00:0${i}Z`,
            agent,
            message: `Message from ${agent}`,
          }));
        });
      });

      // Verify all agents' messages appear with correct styling
      // Use getAllByTestId since Hannibal may appear from initial entries too
      await waitFor(() => {
        for (const agent of agents) {
          const agentElements = screen.getAllByTestId(`agent-name-${agent}`);
          expect(agentElements.length).toBeGreaterThanOrEqual(1);
          expect(screen.getByText(`Message from ${agent}`)).toBeInTheDocument();
        }
      });
    });
  });

  describe('integration with existing entries', () => {
    it('should append SSE entries to entries fetched from API', async () => {
      render(<Home />);

      // Wait for initial entries from API
      await waitFor(() => {
        expect(screen.getByText('Mission briefing started')).toBeInTheDocument();
      });

      // Add entry via SSE
      const sseEntry = createLogEntry({
        timestamp: '2026-01-16T14:00:00Z',
        agent: 'Face',
        message: 'New SSE streamed entry',
      });

      act(() => {
        capturedCallbacks?.onActivityEntry?.(sseEntry);
      });

      // Both should be present
      await waitFor(() => {
        expect(screen.getByText('Mission briefing started')).toBeInTheDocument();
        expect(screen.getByText('New SSE streamed entry')).toBeInTheDocument();
      });
    });

    it('should not duplicate entries that match existing ones', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Mission briefing started')).toBeInTheDocument();
      });

      // Try to add duplicate of initial entry
      const duplicateEntry = createLogEntry({
        timestamp: '2026-01-15T10:00:00Z',
        agent: 'Hannibal',
        message: 'Mission briefing started',
      });

      act(() => {
        capturedCallbacks?.onActivityEntry?.(duplicateEntry);
      });

      // Should only have one instance
      await waitFor(() => {
        const matches = screen.getAllByText('Mission briefing started');
        expect(matches).toHaveLength(1);
      });
    });
  });

  describe('connection state handling', () => {
    it('should continue to receive entries after reconnection', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByTestId('log-entries')).toBeInTheDocument();
      });

      // Simulate entry before "disconnection"
      act(() => {
        capturedCallbacks?.onActivityEntry?.(createLogEntry({
          timestamp: '2026-01-16T14:00:00Z',
          agent: 'Hannibal',
          message: 'Before disconnect',
        }));
      });

      await waitFor(() => {
        expect(screen.getByText('Before disconnect')).toBeInTheDocument();
      });

      // Simulate entry after "reconnection" (in real scenario, this is handled by the hook)
      act(() => {
        capturedCallbacks?.onActivityEntry?.(createLogEntry({
          timestamp: '2026-01-16T14:01:00Z',
          agent: 'Face',
          message: 'After reconnect',
        }));
      });

      // Both entries should be present
      await waitFor(() => {
        expect(screen.getByText('Before disconnect')).toBeInTheDocument();
        expect(screen.getByText('After reconnect')).toBeInTheDocument();
      });
    });
  });
});
