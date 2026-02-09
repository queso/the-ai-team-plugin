import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentBadge } from '../components/agent-badge';
import type { AgentName } from '../types';

describe('AgentBadge', () => {
  describe('conditional rendering', () => {
    it('should return null when agent is undefined', () => {
      const { container } = render(<AgentBadge agent={undefined} />);
      expect(container.firstChild).toBeNull();
    });

    it('should return null when agent is empty string', () => {
      const { container } = render(<AgentBadge agent={'' as AgentName} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render when agent is provided', () => {
      render(<AgentBadge agent="Hannibal" />);
      expect(screen.getByTestId('agent-badge')).toBeInTheDocument();
    });
  });

  describe('agent name display', () => {
    it('should display Hannibal name', () => {
      render(<AgentBadge agent="Hannibal" />);
      expect(screen.getByText('Hannibal')).toBeInTheDocument();
    });

    it('should display Face name', () => {
      render(<AgentBadge agent="Face" />);
      expect(screen.getByText('Face')).toBeInTheDocument();
    });

    it('should display Murdock name', () => {
      render(<AgentBadge agent="Murdock" />);
      expect(screen.getByText('Murdock')).toBeInTheDocument();
    });

    it('should display B.A. name', () => {
      render(<AgentBadge agent="B.A." />);
      expect(screen.getByText('B.A.')).toBeInTheDocument();
    });

    it('should display Lynch name', () => {
      render(<AgentBadge agent="Lynch" />);
      expect(screen.getByText('Lynch')).toBeInTheDocument();
    });
  });

  describe('agent colors', () => {
    it('should apply blue color for Hannibal', () => {
      render(<AgentBadge agent="Hannibal" />);
      const dot = screen.getByTestId('agent-dot');
      expect(dot).toHaveClass('bg-blue-500');
    });

    it('should apply green color for Face', () => {
      render(<AgentBadge agent="Face" />);
      const dot = screen.getByTestId('agent-dot');
      expect(dot).toHaveClass('bg-green-500');
    });

    it('should apply yellow color for Murdock', () => {
      render(<AgentBadge agent="Murdock" />);
      const dot = screen.getByTestId('agent-dot');
      expect(dot).toHaveClass('bg-yellow-500');
    });

    it('should apply orange color for B.A.', () => {
      render(<AgentBadge agent="B.A." />);
      const dot = screen.getByTestId('agent-dot');
      expect(dot).toHaveClass('bg-orange-500');
    });

    it('should apply purple color for Lynch', () => {
      render(<AgentBadge agent="Lynch" />);
      const dot = screen.getByTestId('agent-dot');
      expect(dot).toHaveClass('bg-purple-500');
    });
  });

  describe('dot styling', () => {
    it('should have rounded shape', () => {
      render(<AgentBadge agent="Hannibal" />);
      const dot = screen.getByTestId('agent-dot');
      expect(dot).toHaveClass('rounded-full');
    });

    it('should have small fixed size', () => {
      render(<AgentBadge agent="Hannibal" />);
      const dot = screen.getByTestId('agent-dot');
      expect(dot).toHaveClass('w-2');
      expect(dot).toHaveClass('h-2');
    });
  });

  describe('badge styling', () => {
    it('should have small text size', () => {
      render(<AgentBadge agent="Hannibal" />);
      const badge = screen.getByTestId('agent-badge');
      expect(badge).toHaveClass('text-xs');
    });

    it('should use flexbox for layout', () => {
      render(<AgentBadge agent="Hannibal" />);
      const badge = screen.getByTestId('agent-badge');
      expect(badge).toHaveClass('flex');
      expect(badge).toHaveClass('items-center');
    });

    it('should have gap between dot and name', () => {
      render(<AgentBadge agent="Hannibal" />);
      const badge = screen.getByTestId('agent-badge');
      expect(badge).toHaveClass('gap-1');
    });
  });
});
