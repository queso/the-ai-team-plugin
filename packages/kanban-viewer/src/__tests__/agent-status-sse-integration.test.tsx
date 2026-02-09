import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import type { UseBoardEventsOptions, UseBoardEventsReturn } from '@/hooks/use-board-events';
import type { AgentName, Stage } from '@/types';
import { createMockFetch, createWorkItem } from './helpers/mock-api-responses';

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
      connectionState: mockIsConnected ? 'connected' : 'disconnected',
      connectionError: mockConnectionError,
    };
  }),
}));

// Import the page component after mocks are set up
import Home from '../app/page';

describe('Agent Status SSE Integration', () => {
  beforeEach(() => {
    capturedCallbacks = null;
    mockIsConnected = true;
    mockConnectionError = null;

    global.fetch = createMockFetch();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('agent status derived from work items', () => {
    it('should show all agents as IDLE when no work items have assigned agents in active stages', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Test Mission')).toBeInTheDocument();
      });

      // All agents should be idle since no items have assigned_agent in active stages
      const agents: AgentName[] = ['Hannibal', 'Face', 'Murdock', 'B.A.', 'Amy', 'Lynch', 'Tawnia'];
      agents.forEach((agent) => {
        expect(screen.getByTestId(`agent-status-${agent}`)).toHaveTextContent('IDLE');
      });
    });

    it('should mark agent as ACTIVE when a work item is added in an active stage', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Test Mission')).toBeInTheDocument();
      });

      // Verify initial idle status for Amy
      expect(screen.getByTestId('agent-status-Amy')).toHaveTextContent('IDLE');

      // Simulate SSE item-added event with Amy assigned in probing stage
      const newItem = createWorkItem({
        id: '002',
        stage: 'probing',
        assigned_agent: 'Amy',
      });

      act(() => {
        capturedCallbacks?.onItemAdded?.(newItem);
      });

      // Amy should now be active
      await waitFor(() => {
        expect(screen.getByTestId('agent-status-Amy')).toHaveTextContent('ACTIVE');
      });
    });

    it('should mark agent as ACTIVE when work item moves to an active stage', async () => {
      // Start with an item in ready stage with B.A. assigned
      const initialItems = [
        createWorkItem({ id: '001', stage: 'ready', assigned_agent: 'B.A.' }),
      ];

      global.fetch = createMockFetch({ items: initialItems });

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Test Mission')).toBeInTheDocument();
      });

      // B.A. should be idle since item is in 'ready' (non-active stage)
      expect(screen.getByTestId('agent-status-B.A.')).toHaveTextContent('IDLE');

      // Simulate SSE item-moved event: item moves from ready to implementing
      const movedItem = createWorkItem({
        id: '001',
        stage: 'implementing',
        assigned_agent: 'B.A.',
      });

      act(() => {
        capturedCallbacks?.onItemMoved?.('001', 'ready', 'implementing', movedItem);
      });

      // Wait for animation to complete and verify B.A. is now active
      await waitFor(() => {
        expect(screen.getByTestId('agent-status-B.A.')).toHaveTextContent('ACTIVE');
      }, { timeout: 1000 });
    });

    it('should mark agent as IDLE when work item moves out of active stage to done', async () => {
      // Start with Murdock assigned to item in testing stage
      const initialItems = [
        createWorkItem({ id: '001', stage: 'testing', assigned_agent: 'Murdock' }),
      ];

      global.fetch = createMockFetch({ items: initialItems });

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Test Mission')).toBeInTheDocument();
      });

      // Murdock should be active since item is in testing stage
      expect(screen.getByTestId('agent-status-Murdock')).toHaveTextContent('ACTIVE');

      // Simulate SSE item-moved event: item moves from testing to done
      const movedItem = createWorkItem({
        id: '001',
        stage: 'done',
        assigned_agent: 'Murdock',
      });

      act(() => {
        capturedCallbacks?.onItemMoved?.('001', 'testing', 'done', movedItem);
      });

      // Wait for animation and verify Murdock is now idle
      await waitFor(() => {
        expect(screen.getByTestId('agent-status-Murdock')).toHaveTextContent('IDLE');
      }, { timeout: 1000 });
    });
  });

  describe('visual indicators update correctly', () => {
    it('should show green pulsing dot when agent becomes active', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Test Mission')).toBeInTheDocument();
      });

      // Verify initial idle state - gray dot, no pulse
      const initialDot = screen.getByTestId('agent-dot-Face');
      expect(initialDot).toHaveClass('bg-gray-500');
      expect(initialDot).not.toHaveClass('animate-pulse');

      // Add item with Face assigned in review stage
      const newItem = createWorkItem({
        id: '002',
        stage: 'review',
        assigned_agent: 'Face',
      });

      act(() => {
        capturedCallbacks?.onItemAdded?.(newItem);
      });

      // Verify active state - green dot with pulse
      await waitFor(() => {
        const updatedDot = screen.getByTestId('agent-dot-Face');
        expect(updatedDot).toHaveClass('bg-green-500');
        expect(updatedDot).toHaveClass('animate-pulse');
      });
    });

    it('should show gray non-pulsing dot when agent becomes idle', async () => {
      // Start with Lynch assigned to item in review stage
      const initialItems = [
        createWorkItem({ id: '001', stage: 'review', assigned_agent: 'Lynch' }),
      ];

      global.fetch = createMockFetch({ items: initialItems });

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Test Mission')).toBeInTheDocument();
      });

      // Verify initial active state - green dot with pulse
      const initialDot = screen.getByTestId('agent-dot-Lynch');
      expect(initialDot).toHaveClass('bg-green-500');
      expect(initialDot).toHaveClass('animate-pulse');

      // Delete the item
      act(() => {
        capturedCallbacks?.onItemDeleted?.('001');
      });

      // Verify idle state - gray dot, no pulse
      await waitFor(() => {
        const updatedDot = screen.getByTestId('agent-dot-Lynch');
        expect(updatedDot).toHaveClass('bg-gray-500');
        expect(updatedDot).not.toHaveClass('animate-pulse');
      });
    });
  });

  describe('multiple agents with different statuses', () => {
    it('should correctly show multiple agents as active when assigned to items in different active stages', async () => {
      const initialItems = [
        createWorkItem({ id: '001', stage: 'probing', assigned_agent: 'Amy' }),
        createWorkItem({ id: '002', stage: 'testing', assigned_agent: 'Murdock' }),
        createWorkItem({ id: '003', stage: 'implementing', assigned_agent: 'B.A.' }),
        createWorkItem({ id: '004', stage: 'review', assigned_agent: 'Lynch' }),
        createWorkItem({ id: '005', stage: 'done', assigned_agent: 'Face' }), // Not active
        createWorkItem({ id: '006', stage: 'ready', assigned_agent: 'Hannibal' }), // Not active
      ];

      global.fetch = createMockFetch({ items: initialItems });

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Test Mission')).toBeInTheDocument();
      });

      // Agents in active stages should be ACTIVE
      expect(screen.getByTestId('agent-status-Amy')).toHaveTextContent('ACTIVE');
      expect(screen.getByTestId('agent-status-Murdock')).toHaveTextContent('ACTIVE');
      expect(screen.getByTestId('agent-status-B.A.')).toHaveTextContent('ACTIVE');
      expect(screen.getByTestId('agent-status-Lynch')).toHaveTextContent('ACTIVE');

      // Agents in non-active stages should be IDLE
      expect(screen.getByTestId('agent-status-Face')).toHaveTextContent('IDLE');
      expect(screen.getByTestId('agent-status-Hannibal')).toHaveTextContent('IDLE');
      expect(screen.getByTestId('agent-status-Tawnia')).toHaveTextContent('IDLE');
    });
  });

  describe('onItemUpdated callback updates agent status', () => {
    it('should update agent status when item assigned_agent changes', async () => {
      const initialItems = [
        createWorkItem({ id: '001', stage: 'implementing', assigned_agent: 'B.A.' }),
      ];

      global.fetch = createMockFetch({ items: initialItems });

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Test Mission')).toBeInTheDocument();
      });

      // B.A. should be active, Hannibal should be idle
      expect(screen.getByTestId('agent-status-B.A.')).toHaveTextContent('ACTIVE');
      expect(screen.getByTestId('agent-status-Hannibal')).toHaveTextContent('IDLE');

      // Update item to reassign to Hannibal
      const updatedItem = createWorkItem({
        id: '001',
        stage: 'implementing',
        assigned_agent: 'Hannibal',
      });

      act(() => {
        capturedCallbacks?.onItemUpdated?.(updatedItem);
      });

      // Now Hannibal should be active, B.A. should be idle
      await waitFor(() => {
        expect(screen.getByTestId('agent-status-Hannibal')).toHaveTextContent('ACTIVE');
        expect(screen.getByTestId('agent-status-B.A.')).toHaveTextContent('IDLE');
      });
    });
  });

  describe('page receives SSE callbacks', () => {
    it('should pass onItemAdded callback to useBoardEvents', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(capturedCallbacks).not.toBeNull();
      });

      expect(capturedCallbacks).toHaveProperty('onItemAdded');
      expect(typeof capturedCallbacks?.onItemAdded).toBe('function');
    });

    it('should pass onItemMoved callback to useBoardEvents', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(capturedCallbacks).not.toBeNull();
      });

      expect(capturedCallbacks).toHaveProperty('onItemMoved');
      expect(typeof capturedCallbacks?.onItemMoved).toBe('function');
    });

    it('should pass onItemUpdated callback to useBoardEvents', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(capturedCallbacks).not.toBeNull();
      });

      expect(capturedCallbacks).toHaveProperty('onItemUpdated');
      expect(typeof capturedCallbacks?.onItemUpdated).toBe('function');
    });

    it('should pass onItemDeleted callback to useBoardEvents', async () => {
      render(<Home />);

      await waitFor(() => {
        expect(capturedCallbacks).not.toBeNull();
      });

      expect(capturedCallbacks).toHaveProperty('onItemDeleted');
      expect(typeof capturedCallbacks?.onItemDeleted).toBe('function');
    });
  });

  describe('all active stages trigger agent status update', () => {
    const activeStages: Stage[] = ['probing', 'testing', 'implementing', 'review'];

    it.each(activeStages)(
      'should mark agent as ACTIVE when assigned to item in %s stage',
      async (stage) => {
        render(<Home />);

        await waitFor(() => {
          expect(screen.getByText('Test Mission')).toBeInTheDocument();
        });

        // Verify initial idle status
        expect(screen.getByTestId('agent-status-Tawnia')).toHaveTextContent('IDLE');

        // Add item in the active stage
        const newItem = createWorkItem({
          id: '002',
          stage,
          assigned_agent: 'Tawnia',
        });

        act(() => {
          capturedCallbacks?.onItemAdded?.(newItem);
        });

        // Should be active now
        await waitFor(() => {
          expect(screen.getByTestId('agent-status-Tawnia')).toHaveTextContent('ACTIVE');
        });
      }
    );
  });

  describe('non-active stages do not trigger agent activity', () => {
    const nonActiveStages: Stage[] = ['briefings', 'ready', 'done', 'blocked'];

    it.each(nonActiveStages)(
      'should NOT mark agent as ACTIVE when assigned to item in %s stage',
      async (stage) => {
        render(<Home />);

        await waitFor(() => {
          expect(screen.getByText('Test Mission')).toBeInTheDocument();
        });

        // Verify initial idle status
        expect(screen.getByTestId('agent-status-Tawnia')).toHaveTextContent('IDLE');

        // Add item in a non-active stage
        const newItem = createWorkItem({
          id: '002',
          stage,
          assigned_agent: 'Tawnia',
        });

        act(() => {
          capturedCallbacks?.onItemAdded?.(newItem);
        });

        // Should still be idle
        await waitFor(() => {
          expect(screen.getByTestId('agent-status-Tawnia')).toHaveTextContent('IDLE');
        });
      }
    );
  });
});
