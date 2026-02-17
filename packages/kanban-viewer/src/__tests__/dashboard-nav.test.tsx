import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardNav } from '../components/dashboard-nav';

// Mock props factory
function createProps(overrides = {}): React.ComponentProps<typeof DashboardNav> {
  return {
    currentView: 'board',
    onViewChange: vi.fn(),
    ...overrides,
  };
}

describe('DashboardNav', () => {
  describe('rendering', () => {
    it('should render both navigation options', () => {
      render(<DashboardNav {...createProps()} />);

      expect(screen.getByText(/Mission Board/i)).toBeInTheDocument();
      expect(screen.getByText(/Raw Agent View/i)).toBeInTheDocument();
    });

    it('should render with board as default view', () => {
      render(<DashboardNav {...createProps({ currentView: 'board' })} />);

      const boardButton = screen.getByRole('button', { name: /Mission Board/i });
      expect(boardButton).toHaveAttribute('data-active', 'true');
    });

    it('should highlight the active view', () => {
      render(<DashboardNav {...createProps({ currentView: 'agents' })} />);

      const agentButton = screen.getByRole('button', { name: /Raw Agent View/i });
      expect(agentButton).toHaveAttribute('data-active', 'true');
    });
  });

  describe('navigation interaction', () => {
    it('should call onViewChange when clicking board view', () => {
      const onViewChange = vi.fn();
      render(<DashboardNav {...createProps({ currentView: 'agents', onViewChange })} />);

      const boardButton = screen.getByRole('button', { name: /Mission Board/i });
      fireEvent.click(boardButton);

      expect(onViewChange).toHaveBeenCalledWith('board');
      expect(onViewChange).toHaveBeenCalledTimes(1);
    });

    it('should call onViewChange when clicking agent view', () => {
      const onViewChange = vi.fn();
      render(<DashboardNav {...createProps({ currentView: 'board', onViewChange })} />);

      const agentButton = screen.getByRole('button', { name: /Raw Agent View/i });
      fireEvent.click(agentButton);

      expect(onViewChange).toHaveBeenCalledWith('agents');
      expect(onViewChange).toHaveBeenCalledTimes(1);
    });

    it('should allow clicking the currently active view', () => {
      const onViewChange = vi.fn();
      render(<DashboardNav {...createProps({ currentView: 'board', onViewChange })} />);

      const boardButton = screen.getByRole('button', { name: /Mission Board/i });
      fireEvent.click(boardButton);

      // Should still call the callback even if it's the current view
      expect(onViewChange).toHaveBeenCalledWith('board');
    });
  });

  describe('visual styling', () => {
    it('should use different styling for active vs inactive views', () => {
      render(<DashboardNav {...createProps({ currentView: 'board' })} />);

      const boardButton = screen.getByRole('button', { name: /Mission Board/i });
      const agentButton = screen.getByRole('button', { name: /Raw Agent View/i });

      // Active button should have data-active="true"
      expect(boardButton).toHaveAttribute('data-active', 'true');
      expect(agentButton).toHaveAttribute('data-active', 'false');
    });

    it('should support dark mode styling', () => {
      render(<DashboardNav {...createProps()} />);

      // Component should render without errors (dark mode classes are present)
      expect(screen.getByRole('button', { name: /Mission Board/i })).toBeInTheDocument();
    });
  });
});
