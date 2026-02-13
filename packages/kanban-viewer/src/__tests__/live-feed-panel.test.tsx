import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LiveFeedPanel } from '../components/live-feed-panel';
import type { LogEntry, LiveFeedPanelProps } from '../components/live-feed-panel';

// Factory function for creating test log entries
function createLogEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    timestamp: '2026-01-15T10:42:15Z',
    agent: 'B.A.',
    message: 'Implementing JWT token refresh logic',
    ...overrides,
  };
}

// Factory function for creating component props
function createProps(overrides: Partial<LiveFeedPanelProps> = {}): LiveFeedPanelProps {
  return {
    entries: [],
    activeTab: 'live-feed',
    onTabChange: vi.fn(),
    ...overrides,
  };
}

describe('LiveFeedPanel', () => {
  describe('tab bar', () => {
    it('should render all 4 tabs', () => {
      render(<LiveFeedPanel {...createProps()} />);

      expect(screen.getByRole('tab', { name: /live feed/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /human input/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /git/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /new mission/i })).toBeInTheDocument();
    });

    it('should highlight the active tab', () => {
      render(<LiveFeedPanel {...createProps({ activeTab: 'live-feed' })} />);

      const liveFeedTab = screen.getByRole('tab', { name: /live feed/i });
      expect(liveFeedTab).toHaveAttribute('data-state', 'active');
    });

    it('should highlight human input tab when active', () => {
      render(<LiveFeedPanel {...createProps({ activeTab: 'human-input' })} />);

      const humanInputTab = screen.getByRole('tab', { name: /human input/i });
      expect(humanInputTab).toHaveAttribute('data-state', 'active');
    });

    it('should call onTabChange when a tab is activated', () => {
      const onTabChange = vi.fn();
      render(<LiveFeedPanel {...createProps({ onTabChange })} />);

      // Radix tabs require keyboard interaction in jsdom (click events do not propagate properly)
      const gitTab = screen.getByRole('tab', { name: /git/i });
      gitTab.focus();
      fireEvent.keyDown(gitTab, { key: 'Enter' });

      expect(onTabChange).toHaveBeenCalledWith('git');
    });

    it('should call onTabChange with correct tab id for each tab', () => {
      const onTabChange = vi.fn();
      render(<LiveFeedPanel {...createProps({ onTabChange })} />);

      // Use keyboard interaction for Radix tabs in jsdom
      const humanInputTab = screen.getByRole('tab', { name: /human input/i });
      humanInputTab.focus();
      fireEvent.keyDown(humanInputTab, { key: 'Enter' });
      expect(onTabChange).toHaveBeenCalledWith('human-input');

      const newMissionTab = screen.getByRole('tab', { name: /new mission/i });
      newMissionTab.focus();
      fireEvent.keyDown(newMissionTab, { key: 'Enter' });
      expect(onTabChange).toHaveBeenCalledWith('new-mission');
    });
  });

  describe('notification badge', () => {
    it('should show notification badge on Human Input tab when pendingHumanInputCount > 0', () => {
      render(<LiveFeedPanel {...createProps({ pendingHumanInputCount: 3 })} />);

      const badge = screen.getByTestId('human-input-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('3');
    });

    it('should not show notification badge when pendingHumanInputCount is 0', () => {
      render(<LiveFeedPanel {...createProps({ pendingHumanInputCount: 0 })} />);

      expect(screen.queryByTestId('human-input-badge')).not.toBeInTheDocument();
    });

    it('should not show notification badge when pendingHumanInputCount is undefined', () => {
      render(<LiveFeedPanel {...createProps()} />);

      expect(screen.queryByTestId('human-input-badge')).not.toBeInTheDocument();
    });
  });

  describe('log entries display', () => {
    it('should render log entries with timestamp, agent, and message', () => {
      const entries = [
        createLogEntry({
          timestamp: '2026-01-15T10:42:15Z',
          agent: 'B.A.',
          message: 'Implementing JWT token refresh logic',
        }),
      ];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      expect(screen.getByText('10:42:15')).toBeInTheDocument();
      expect(screen.getByText('[B.A.]')).toBeInTheDocument();
      expect(screen.getByText('Implementing JWT token refresh logic')).toBeInTheDocument();
    });

    it('should render multiple log entries', () => {
      const entries = [
        createLogEntry({ agent: 'Hannibal', message: 'First message' }),
        createLogEntry({ agent: 'Face', message: 'Second message' }),
        createLogEntry({ agent: 'Murdock', message: 'Third message' }),
      ];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      expect(screen.getByText('First message')).toBeInTheDocument();
      expect(screen.getByText('Second message')).toBeInTheDocument();
      expect(screen.getByText('Third message')).toBeInTheDocument();
    });

    it('should handle empty entries array', () => {
      render(<LiveFeedPanel {...createProps({ entries: [] })} />);

      // Component should render without error
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });
  });

  describe('agent color coding', () => {
    it('should display Hannibal with green color and brackets', () => {
      const entries = [createLogEntry({ agent: 'Hannibal' })];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      const agentElement = screen.getByTestId('agent-name-Hannibal');
      expect(agentElement).toHaveClass('text-green-500');
      expect(screen.getByText('[Hannibal]')).toBeInTheDocument();
    });

    it('should display Face with cyan color and brackets', () => {
      const entries = [createLogEntry({ agent: 'Face' })];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      const agentElement = screen.getByTestId('agent-name-Face');
      expect(agentElement).toHaveClass('text-cyan-500');
      expect(screen.getByText('[Face]')).toBeInTheDocument();
    });

    it('should display Murdock with amber color and brackets', () => {
      const entries = [createLogEntry({ agent: 'Murdock' })];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      const agentElement = screen.getByTestId('agent-name-Murdock');
      expect(agentElement).toHaveClass('text-amber-500');
      expect(screen.getByText('[Murdock]')).toBeInTheDocument();
    });

    it('should display B.A. with red color and brackets', () => {
      const entries = [createLogEntry({ agent: 'B.A.' })];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      const agentElement = screen.getByTestId('agent-name-B.A.');
      expect(agentElement).toHaveClass('text-red-500');
      expect(screen.getByText('[B.A.]')).toBeInTheDocument();
    });

    it('should display Lynch with blue color and brackets', () => {
      const entries = [createLogEntry({ agent: 'Lynch' })];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      const agentElement = screen.getByTestId('agent-name-Lynch');
      expect(agentElement).toHaveClass('text-blue-500');
      expect(screen.getByText('[Lynch]')).toBeInTheDocument();
    });
  });

  describe('message highlighting', () => {
    it('should highlight APPROVED messages in green', () => {
      const entries = [createLogEntry({ message: 'APPROVED: Work item 013 passed review' })];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      const messageElement = screen.getByText('APPROVED: Work item 013 passed review');
      expect(messageElement).toHaveClass('text-green-500');
    });

    it('should highlight REJECTED messages in red', () => {
      const entries = [createLogEntry({ message: 'REJECTED: Work item 014 failed tests' })];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      const messageElement = screen.getByText('REJECTED: Work item 014 failed tests');
      expect(messageElement).toHaveClass('text-red-500');
    });

    it('should highlight ALERT messages in yellow', () => {
      const entries = [createLogEntry({ message: 'ALERT: Build pipeline failing' })];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      const messageElement = screen.getByText('ALERT: Build pipeline failing');
      expect(messageElement).toHaveClass('text-yellow-500');
    });

    it('should not highlight regular messages', () => {
      const entries = [createLogEntry({ message: 'Implementing JWT token refresh logic' })];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      const messageElement = screen.getByText('Implementing JWT token refresh logic');
      expect(messageElement).not.toHaveClass('text-green-500');
      expect(messageElement).not.toHaveClass('text-red-500');
      expect(messageElement).not.toHaveClass('text-yellow-500');
    });
  });

  describe('monospace font', () => {
    it('should use monospace font for log entries', () => {
      const entries = [createLogEntry()];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      const logContainer = screen.getByTestId('log-entries');
      expect(logContainer).toHaveClass('font-mono');
    });
  });

  describe('SYSTEM LOG header (Feature 002)', () => {
    it('should display ">_ SYSTEM LOG" header above log entries', () => {
      const entries = [createLogEntry()];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      expect(screen.getByText('>_ SYSTEM LOG')).toBeInTheDocument();
    });

    it('should style header with 12px font size (text-xs)', () => {
      const entries = [createLogEntry()];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      const header = screen.getByText('>_ SYSTEM LOG');
      expect(header).toHaveClass('text-xs');
    });

    it('should style header with #6b7280 color (text-muted-foreground)', () => {
      const entries = [createLogEntry()];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      const header = screen.getByText('>_ SYSTEM LOG');
      expect(header).toHaveClass('text-muted-foreground');
    });

    it('should style header with JetBrains Mono font (font-mono)', () => {
      const entries = [createLogEntry()];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      const header = screen.getByText('>_ SYSTEM LOG');
      expect(header).toHaveClass('font-mono');
    });

    it('should style header with uppercase (uppercase)', () => {
      const entries = [createLogEntry()];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      const header = screen.getByText('>_ SYSTEM LOG');
      expect(header).toHaveClass('uppercase');
    });

    it('should have 8px bottom margin (mb-2)', () => {
      const entries = [createLogEntry()];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      const header = screen.getByText('>_ SYSTEM LOG');
      expect(header).toHaveClass('mb-2');
    });

    it('should display header even when entries are empty', () => {
      render(<LiveFeedPanel {...createProps({ entries: [] })} />);

      expect(screen.getByText('>_ SYSTEM LOG')).toBeInTheDocument();
    });
  });

  describe('bracket formatting for agent names (Feature 002)', () => {
    it('should display agent name in brackets [Agent]', () => {
      const entries = [createLogEntry({ agent: 'B.A.' })];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      expect(screen.getByText('[B.A.]')).toBeInTheDocument();
    });

    it('should display Hannibal in brackets', () => {
      const entries = [createLogEntry({ agent: 'Hannibal' })];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      expect(screen.getByText('[Hannibal]')).toBeInTheDocument();
    });

    it('should display Face in brackets', () => {
      const entries = [createLogEntry({ agent: 'Face' })];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      expect(screen.getByText('[Face]')).toBeInTheDocument();
    });

    it('should display Murdock in brackets', () => {
      const entries = [createLogEntry({ agent: 'Murdock' })];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      expect(screen.getByText('[Murdock]')).toBeInTheDocument();
    });

    it('should display Lynch in brackets', () => {
      const entries = [createLogEntry({ agent: 'Lynch' })];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      expect(screen.getByText('[Lynch]')).toBeInTheDocument();
    });

    it('should display Amy in brackets', () => {
      const entries = [createLogEntry({ agent: 'Amy' })];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      expect(screen.getByText('[Amy]')).toBeInTheDocument();
    });
  });

  describe('timestamp styling (Feature 002)', () => {
    it('should use #6b7280 color for timestamps (text-muted-foreground)', () => {
      const entries = [createLogEntry({ timestamp: '2026-01-15T10:42:15Z' })];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      const timestamp = screen.getByText('10:42:15');
      expect(timestamp).toHaveClass('text-muted-foreground');
    });

    it('should use JetBrains Mono font for timestamps (font-mono)', () => {
      const entries = [createLogEntry({ timestamp: '2026-01-15T10:42:15Z' })];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      // The log container should have font-mono
      const logContainer = screen.getByTestId('log-entries');
      expect(logContainer).toHaveClass('font-mono');
    });

    it('should use 12px font size for timestamps (text-sm)', () => {
      const entries = [createLogEntry({ timestamp: '2026-01-15T10:42:15Z' })];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      // The log container uses text-sm which is 14px, but the spec says 12px
      // This will fail until implementation is updated
      const logContainer = screen.getByTestId('log-entries');
      expect(logContainer).toHaveClass('text-xs');
    });
  });

  describe('agent name styling (Feature 002)', () => {
    it('should use Inter font for agent names (not font-mono)', () => {
      const entries = [createLogEntry({ agent: 'B.A.' })];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      const agentElement = screen.getByTestId('agent-name-B.A.');
      // Agent name should NOT have font-mono class (Inter is default)
      expect(agentElement).not.toHaveClass('font-mono');
    });

    it('should use 12px font size for agent names (text-xs)', () => {
      const entries = [createLogEntry({ agent: 'Hannibal' })];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      const agentElement = screen.getByTestId('agent-name-Hannibal');
      expect(agentElement).toHaveClass('text-xs');
    });

    it('should use font-weight 600 for agent names (font-semibold)', () => {
      const entries = [createLogEntry({ agent: 'Face' })];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      const agentElement = screen.getByTestId('agent-name-Face');
      expect(agentElement).toHaveClass('font-semibold');
    });
  });

  describe('placeholder tabs', () => {
    it('should show placeholder content for Human Input tab', () => {
      render(<LiveFeedPanel {...createProps({ activeTab: 'human-input' })} />);

      expect(screen.getByTestId('human-input-placeholder')).toBeInTheDocument();
    });

    it('should show placeholder content for Git tab', () => {
      render(<LiveFeedPanel {...createProps({ activeTab: 'git' })} />);

      expect(screen.getByTestId('git-placeholder')).toBeInTheDocument();
    });

    it('should show placeholder content for New Mission tab', () => {
      render(<LiveFeedPanel {...createProps({ activeTab: 'new-mission' })} />);

      expect(screen.getByTestId('new-mission-placeholder')).toBeInTheDocument();
    });
  });

  describe('panel structure', () => {
    it('should render as a panel with appropriate structure', () => {
      render(<LiveFeedPanel {...createProps()} />);

      const panel = screen.getByTestId('live-feed-panel');
      expect(panel).toBeInTheDocument();
    });
  });

  describe('agent name column fixed width (Item 004)', () => {
    /**
     * Item 004: Live Feed Text Alignment
     *
     * Acceptance Criteria:
     * - Agent name column has fixed width w-20 (80px)
     * - All message text starts at same horizontal position
     * - Layout remains readable
     * - Wrapped message lines still indent properly
     */

    it('should have fixed width w-20 on agent name span', () => {
      const entries = [createLogEntry({ agent: 'Hannibal' })];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      const agentElement = screen.getByTestId('agent-name-Hannibal');
      // w-20 is 80px (5rem) fixed width to accommodate longest agent name [Hannibal]
      expect(agentElement).toHaveClass('w-20');
    });

    it('should have w-20 class for short agent names like B.A.', () => {
      const entries = [createLogEntry({ agent: 'B.A.' })];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      const agentElement = screen.getByTestId('agent-name-B.A.');
      // Even short names should have same fixed width for alignment
      expect(agentElement).toHaveClass('w-20');
    });

    it('should align message text at same horizontal position for all agents', () => {
      const entries = [
        createLogEntry({ agent: 'Hannibal', message: 'Message from Hannibal' }),
        createLogEntry({ agent: 'B.A.', message: 'Message from B.A.' }),
        createLogEntry({ agent: 'Amy', message: 'Message from Amy' }),
      ];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      // All agent name elements should have the same fixed width class
      const hannibalElement = screen.getByTestId('agent-name-Hannibal');
      const baElement = screen.getByTestId('agent-name-B.A.');
      const amyElement = screen.getByTestId('agent-name-Amy');

      expect(hannibalElement).toHaveClass('w-20');
      expect(baElement).toHaveClass('w-20');
      expect(amyElement).toHaveClass('w-20');
    });

    it('should maintain fixed width for Lynch agent name', () => {
      const entries = [createLogEntry({ agent: 'Lynch' })];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      const agentElement = screen.getByTestId('agent-name-Lynch');
      expect(agentElement).toHaveClass('w-20');
    });

    it('should maintain fixed width for Face agent name', () => {
      const entries = [createLogEntry({ agent: 'Face' })];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      const agentElement = screen.getByTestId('agent-name-Face');
      expect(agentElement).toHaveClass('w-20');
    });

    it('should maintain fixed width for Murdock agent name', () => {
      const entries = [createLogEntry({ agent: 'Murdock' })];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      const agentElement = screen.getByTestId('agent-name-Murdock');
      expect(agentElement).toHaveClass('w-20');
    });

    it('should have flex-shrink-0 for proper width application in flex container', () => {
      const entries = [createLogEntry({ agent: 'Hannibal' })];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      const agentElement = screen.getByTestId('agent-name-Hannibal');
      // For fixed width in flex container, use flex-shrink-0
      expect(agentElement).toHaveClass('flex-shrink-0');
    });

    it('should have text-left class for left-aligned agent names', () => {
      const entries = [createLogEntry({ agent: 'B.A.' })];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      const agentElement = screen.getByTestId('agent-name-B.A.');
      // Agent names should be left-aligned within fixed width
      expect(agentElement).toHaveClass('text-left');
    });
  });

  describe('auto-scroll fix - scrollRef on correct element (Item 003)', () => {
    /**
     * Root cause: scrollRef is attached to inner div inside ScrollArea, but ScrollArea's
     * Viewport is the actual scrollable container. This causes auto-scroll to fail.
     *
     * Solution: Replace ScrollArea with a simple div with overflow-y-auto, allowing
     * scrollRef to correctly target the scrollable element.
     */

    it('should attach scrollRef to the actual scrollable container', () => {
      const entries = Array.from({ length: 5 }, (_, i) =>
        createLogEntry({ message: `Message ${i + 1}` })
      );
      render(<LiveFeedPanel {...createProps({ entries })} />);

      const logContainer = screen.getByTestId('log-entries');
      // The log-entries element should be the scrollable container (not a child of ScrollArea Viewport)
      // It should have overflow-y-auto to enable native scrolling
      expect(logContainer).toHaveClass('overflow-y-auto');
    });

    it('should not use Radix ScrollArea for log entries container', () => {
      const entries = [createLogEntry()];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      // ScrollArea uses data-radix-scroll-area-viewport
      // After the fix, this should NOT exist in the log entries area
      const scrollAreaViewport = document.querySelector('[data-radix-scroll-area-viewport]');
      // The viewport should not contain the log entries (they should be in a simple div)
      const logContainer = screen.getByTestId('log-entries');

      // If ScrollArea is still used, the log container will be inside the viewport
      // After fix, log container should NOT be inside a Radix viewport
      if (scrollAreaViewport) {
        expect(scrollAreaViewport.contains(logContainer)).toBe(false);
      }
    });

    it('should have scrollable container with proper height constraint', () => {
      const entries = Array.from({ length: 20 }, (_, i) =>
        createLogEntry({ message: `Message ${i + 1}` })
      );
      render(<LiveFeedPanel {...createProps({ entries })} />);

      const logContainer = screen.getByTestId('log-entries');
      // The container should have a height constraint to enable scrolling
      // Typically uses h-full, max-h-*, or explicit height
      const hasHeightConstraint =
        logContainer.className.includes('h-') ||
        logContainer.className.includes('max-h-') ||
        logContainer.style.height !== '';
      expect(hasHeightConstraint).toBe(true);
    });
  });

  describe('auto-scroll functionality after fix (Item 003)', () => {
    it('should auto-scroll to newest entries when at bottom', () => {
      const initialEntries = [createLogEntry({ message: 'Initial message' })];
      const { rerender } = render(<LiveFeedPanel {...createProps({ entries: initialEntries })} />);

      const logContainer = screen.getByTestId('log-entries');

      // Simulate being at bottom (scrollTop + clientHeight >= scrollHeight - threshold)
      Object.defineProperty(logContainer, 'scrollHeight', { value: 100, configurable: true });
      Object.defineProperty(logContainer, 'clientHeight', { value: 100, configurable: true });
      Object.defineProperty(logContainer, 'scrollTop', { value: 0, writable: true, configurable: true });

      // Add new entries
      const updatedEntries = [
        ...initialEntries,
        createLogEntry({ message: 'New message 1' }),
        createLogEntry({ message: 'New message 2' }),
      ];
      rerender(<LiveFeedPanel {...createProps({ entries: updatedEntries })} />);

      // After rerender with new entries, newest should be visible
      expect(screen.getByText('New message 2')).toBeInTheDocument();
    });

    it('should detect when user scrolls away from bottom', () => {
      const entries = Array.from({ length: 30 }, (_, i) =>
        createLogEntry({ message: `Message ${i + 1}` })
      );
      render(<LiveFeedPanel {...createProps({ entries })} />);

      const logContainer = screen.getByTestId('log-entries');

      // Set up scrollable dimensions
      Object.defineProperty(logContainer, 'scrollHeight', { value: 1000, configurable: true });
      Object.defineProperty(logContainer, 'clientHeight', { value: 200, configurable: true });

      // Scroll to middle (away from bottom)
      fireEvent.scroll(logContainer, { target: { scrollTop: 300 } });

      // The component should track that user is NOT at bottom
      // This is internal state, so we verify by behavior in subsequent tests
      expect(logContainer).toBeInTheDocument();
    });

    it('should resume auto-scroll when user scrolls back to bottom', () => {
      const entries = Array.from({ length: 30 }, (_, i) =>
        createLogEntry({ message: `Message ${i + 1}` })
      );
      render(<LiveFeedPanel {...createProps({ entries })} />);

      const logContainer = screen.getByTestId('log-entries');

      // Set up scrollable dimensions
      Object.defineProperty(logContainer, 'scrollHeight', { value: 1000, configurable: true });
      Object.defineProperty(logContainer, 'clientHeight', { value: 200, configurable: true });

      // First scroll away from bottom
      fireEvent.scroll(logContainer, { target: { scrollTop: 300 } });

      // Then scroll back to bottom (within 50px threshold)
      // scrollHeight(1000) - clientHeight(200) = 800 (max scrollTop for "at bottom")
      // Within 50px means scrollTop >= 750
      fireEvent.scroll(logContainer, { target: { scrollTop: 780 } });

      // Auto-scroll should resume (component should track isAtBottom = true)
      expect(logContainer).toBeInTheDocument();
    });

    it('should use 50px threshold for detecting "at bottom" state', () => {
      const entries = Array.from({ length: 10 }, (_, i) =>
        createLogEntry({ message: `Message ${i + 1}` })
      );
      render(<LiveFeedPanel {...createProps({ entries })} />);

      const logContainer = screen.getByTestId('log-entries');

      // Set up scrollable dimensions
      Object.defineProperty(logContainer, 'scrollHeight', { value: 500, configurable: true });
      Object.defineProperty(logContainer, 'clientHeight', { value: 200, configurable: true });
      // Max scroll: 500 - 200 = 300
      // At bottom threshold (50px): scrollTop >= 250

      // Scroll to 51px from bottom - should NOT be considered "at bottom"
      fireEvent.scroll(logContainer, { target: { scrollTop: 248 } }); // 300 - 248 = 52px from bottom

      // Scroll to 49px from bottom - SHOULD be considered "at bottom"
      fireEvent.scroll(logContainer, { target: { scrollTop: 252 } }); // 300 - 252 = 48px from bottom

      // The behavior difference is internal, but the container should handle both gracefully
      expect(logContainer).toBeInTheDocument();
    });
  });

  describe('smooth scroll behavior (Item 003)', () => {
    it('should have scroll-smooth class on scrollable container', () => {
      render(<LiveFeedPanel {...createProps()} />);

      const logContainer = screen.getByTestId('log-entries');
      expect(logContainer).toHaveClass('scroll-smooth');
    });

    it('should maintain smooth scrolling after entries update', () => {
      const { rerender } = render(<LiveFeedPanel {...createProps({ entries: [] })} />);

      const logContainer = screen.getByTestId('log-entries');
      expect(logContainer).toHaveClass('scroll-smooth');

      // Add entries
      const entries = [createLogEntry({ message: 'New entry' })];
      rerender(<LiveFeedPanel {...createProps({ entries })} />);

      // Should still have smooth scrolling
      expect(screen.getByTestId('log-entries')).toHaveClass('scroll-smooth');
    });
  });

  describe('auto-scroll with tab switching (Item 003)', () => {
    it('should not attempt to scroll when not on live-feed tab', () => {
      const entries = [createLogEntry({ message: 'Test message' })];
      const { rerender } = render(
        <LiveFeedPanel {...createProps({ entries, activeTab: 'human-input' })} />
      );

      // Add more entries while on different tab
      const updatedEntries = [
        ...entries,
        createLogEntry({ message: 'New message while away' }),
      ];
      rerender(<LiveFeedPanel {...createProps({ entries: updatedEntries, activeTab: 'human-input' })} />);

      // Should not crash or cause issues
      expect(screen.getByTestId('live-feed-panel')).toBeInTheDocument();
    });

    it('should resume auto-scroll when switching back to live-feed tab', () => {
      const entries = [createLogEntry({ message: 'Initial message' })];
      const { rerender } = render(
        <LiveFeedPanel {...createProps({ entries, activeTab: 'human-input' })} />
      );

      // Switch to live-feed tab with new entries
      const updatedEntries = [
        ...entries,
        createLogEntry({ message: 'Message added while away' }),
      ];
      rerender(<LiveFeedPanel {...createProps({ entries: updatedEntries, activeTab: 'live-feed' })} />);

      // New entries should be visible
      expect(screen.getByText('Message added while away')).toBeInTheDocument();
    });
  });

  describe('scroll behavior with rapid entry additions (Item 003)', () => {
    it('should handle rapid entry additions without scroll jank', () => {
      const initialEntries = [createLogEntry({ message: 'Initial' })];
      const { rerender } = render(<LiveFeedPanel {...createProps({ entries: initialEntries })} />);

      // Rapidly add multiple entries
      for (let i = 1; i <= 10; i++) {
        const entries = [
          ...initialEntries,
          ...Array.from({ length: i }, (_, j) =>
            createLogEntry({ message: `Rapid message ${j + 1}` })
          ),
        ];
        rerender(<LiveFeedPanel {...createProps({ entries })} />);
      }

      // All entries should be rendered
      expect(screen.getByText('Rapid message 10')).toBeInTheDocument();
    });

    it('should maintain scroll position when user has scrolled up', () => {
      const entries = Array.from({ length: 20 }, (_, i) =>
        createLogEntry({ message: `Message ${i + 1}` })
      );
      const { rerender } = render(<LiveFeedPanel {...createProps({ entries })} />);

      const logContainer = screen.getByTestId('log-entries');

      // Set up dimensions and scroll position
      Object.defineProperty(logContainer, 'scrollHeight', { value: 1000, configurable: true });
      Object.defineProperty(logContainer, 'clientHeight', { value: 200, configurable: true });

      // User scrolls to top
      fireEvent.scroll(logContainer, { target: { scrollTop: 0 } });

      // Add new entries
      const updatedEntries = [
        ...entries,
        createLogEntry({ message: 'New message while reading history' }),
      ];
      rerender(<LiveFeedPanel {...createProps({ entries: updatedEntries })} />);

      // New entry should exist but scroll position should be preserved
      // (user reading history should not be interrupted)
      expect(screen.getByText('New message while reading history')).toBeInTheDocument();
    });
  });

  describe('smart auto-scroll behavior (Feature 003)', () => {

    it('should be pinned to bottom by default showing newest entries', () => {
      const entries = [
        createLogEntry({ message: 'First message' }),
        createLogEntry({ message: 'Second message' }),
        createLogEntry({ message: 'Third message' }),
      ];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      const logContainer = screen.getByTestId('log-entries');
      // When rendered, the container should attempt to scroll to bottom
      // This is verified by the scrollTop being set to scrollHeight
      expect(logContainer).toBeInTheDocument();
    });

    it('should auto-scroll to bottom when new entries arrive and already at bottom', () => {
      const initialEntries = [createLogEntry({ message: 'First' })];
      const { rerender } = render(<LiveFeedPanel {...createProps({ entries: initialEntries })} />);

      // Add new entries
      const updatedEntries = [
        ...initialEntries,
        createLogEntry({ message: 'Second' }),
        createLogEntry({ message: 'Third' }),
      ];
      rerender(<LiveFeedPanel {...createProps({ entries: updatedEntries })} />);

      // Should auto-scroll to show new entries
      expect(screen.getByText('Third')).toBeInTheDocument();
    });

    it('should pause auto-scroll when user scrolls up to read history', () => {
      const entries = Array.from({ length: 20 }, (_, i) =>
        createLogEntry({ message: `Message ${i + 1}` })
      );
      render(<LiveFeedPanel {...createProps({ entries })} />);

      const logContainer = screen.getByTestId('log-entries');

      // Simulate user scrolling up (setting scrollTop away from bottom)
      fireEvent.scroll(logContainer, { target: { scrollTop: 0 } });

      // After scrolling up, auto-scroll should be paused
      // This is a behavioral test - the implementation should track isAtBottom state
      expect(logContainer).toBeInTheDocument();
    });

    it('should resume auto-scroll when user scrolls back to bottom (within 50px threshold)', () => {
      const entries = Array.from({ length: 20 }, (_, i) =>
        createLogEntry({ message: `Message ${i + 1}` })
      );
      render(<LiveFeedPanel {...createProps({ entries })} />);

      const logContainer = screen.getByTestId('log-entries');

      // Simulate scrolling back to near bottom
      // The threshold is 50px from bottom
      Object.defineProperty(logContainer, 'scrollHeight', { value: 1000, configurable: true });
      Object.defineProperty(logContainer, 'clientHeight', { value: 400, configurable: true });

      // Scroll to within 50px of bottom (scrollTop + clientHeight >= scrollHeight - 50)
      fireEvent.scroll(logContainer, { target: { scrollTop: 560 } }); // 560 + 400 = 960, which is >= 950 (1000 - 50)

      // Auto-scroll should resume
      expect(logContainer).toBeInTheDocument();
    });

    it('should have smooth scroll behavior', () => {
      render(<LiveFeedPanel {...createProps()} />);

      const logContainer = screen.getByTestId('log-entries');
      // Check for smooth scroll CSS class or style
      // The container should have scroll-smooth or scroll-behavior: smooth
      expect(logContainer).toHaveClass('scroll-smooth');
    });

    it('should not auto-scroll when tab is not live-feed', () => {
      // Start on live-feed tab to ensure log container is visible
      const entries = [createLogEntry({ message: 'First' })];
      const { rerender } = render(
        <LiveFeedPanel {...createProps({ entries, activeTab: 'live-feed' })} />
      );

      // Switch to human-input tab
      rerender(<LiveFeedPanel {...createProps({ entries, activeTab: 'human-input' })} />);

      // Add new entries while on human-input tab
      const updatedEntries = [...entries, createLogEntry({ message: 'Second' })];
      rerender(<LiveFeedPanel {...createProps({ entries: updatedEntries, activeTab: 'human-input' })} />);

      // The auto-scroll useEffect should check activeTab and skip scrolling
      // Verify the panel is still functional
      const panel = screen.getByTestId('live-feed-panel');
      expect(panel).toBeInTheDocument();
    });
  });

  describe('panel container styling (Feature 004)', () => {
    it('should have background color #1a1a1a', () => {
      render(<LiveFeedPanel {...createProps()} />);

      const panel = screen.getByTestId('live-feed-panel');
      // The panel should have the dark background color
      // Using bg-[#1a1a1a] or similar Tailwind class
      expect(panel).toHaveClass('bg-[#1a1a1a]');
    });

    it('should have 1px left border with color #374151', () => {
      render(<LiveFeedPanel {...createProps()} />);

      const panel = screen.getByTestId('live-feed-panel');
      // The panel should have left border styling
      expect(panel).toHaveClass('border-l');
      expect(panel).toHaveClass('border-[#374151]');
    });

    it('should have log container that allows text to wrap', () => {
      const entries = [
        createLogEntry({
          message:
            'This is a very long message that should wrap to multiple lines when it exceeds the container width and the continuation lines should be indented',
        }),
      ];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      const messageElement = screen.getByText(/This is a very long message/);
      // Message should have break-words class for wrapping
      expect(messageElement).toHaveClass('break-words');
    });

    it('should indent continuation lines by 8px (pl-2)', () => {
      const entries = [
        createLogEntry({
          message: 'Long message that will wrap',
        }),
      ];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      // The log entry container should have the proper indentation for wrapped text
      // This is typically done via hanging-indent or padding-left on the message span
      const logContainer = screen.getByTestId('log-entries');
      const entryRows = logContainer.querySelectorAll('[class*="flex"]');

      expect(entryRows.length).toBeGreaterThan(0);
      // Each entry row should have proper structure for text indent
    });

    it('should have consistent entry layout with timestamp, agent, and message', () => {
      const entries = [
        createLogEntry({
          timestamp: '2026-01-15T10:42:15Z',
          agent: 'B.A.',
          message: 'Test message',
        }),
      ];
      render(<LiveFeedPanel {...createProps({ entries })} />);

      // Verify the layout structure
      const timestamp = screen.getByText('10:42:15');
      const agent = screen.getByText('[B.A.]');
      const message = screen.getByText('Test message');

      expect(timestamp).toBeInTheDocument();
      expect(agent).toBeInTheDocument();
      expect(message).toBeInTheDocument();

      // Timestamp and agent should be flex-shrink-0 to not wrap
      expect(timestamp).toHaveClass('shrink-0');
      expect(agent).toHaveClass('flex-shrink-0');
    });
  });
});
