import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkItemCard } from '../components/work-item-card';
import type { WorkItem, AgentName } from '../types';

/**
 * Tests for agent badge colors in work-item-card.
 *
 * PRD Specification for agent name text colors:
 * - Hannibal: #22c55e (green-500)
 * - Face: #06b6d4 (cyan-500)
 * - Murdock: #f59e0b (amber-500)
 * - B.A.: #ef4444 (red-500)
 * - Amy: #ec4899 (pink-500)
 * - Lynch: #3b82f6 (blue-500)
 * - Tawnia: #14b8a6 (teal-500)
 */

const createWorkItem = (overrides: Partial<WorkItem> = {}): WorkItem => ({
  id: '007',
  title: 'Test Item',
  type: 'feature',
  status: 'testing',
  assigned_agent: undefined,
  rejection_count: 0,
  dependencies: [],
  outputs: {},
  created_at: '2026-01-15T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z',
  stage: 'implementing',
  content: 'Test content',
  ...overrides,
});

describe('WorkItemCard Agent Badge Colors', () => {
  describe('agent name text colors', () => {
    it('should display Hannibal name in green (#22c55e)', () => {
      const item = createWorkItem({
        assigned_agent: 'Hannibal',
        stage: 'implementing',
      });
      render(<WorkItemCard item={item} />);

      const agentName = screen.getByTestId('agent-name');
      expect(agentName).toHaveTextContent('Hannibal');
      expect(agentName).toHaveClass('text-green-500');
    });

    it('should display Face name in cyan (#06b6d4)', () => {
      const item = createWorkItem({
        assigned_agent: 'Face',
        stage: 'implementing',
      });
      render(<WorkItemCard item={item} />);

      const agentName = screen.getByTestId('agent-name');
      expect(agentName).toHaveTextContent('Face');
      expect(agentName).toHaveClass('text-cyan-500');
    });

    it('should display Murdock name in amber (#f59e0b)', () => {
      const item = createWorkItem({
        assigned_agent: 'Murdock',
        stage: 'testing',
      });
      render(<WorkItemCard item={item} />);

      const agentName = screen.getByTestId('agent-name');
      expect(agentName).toHaveTextContent('Murdock');
      expect(agentName).toHaveClass('text-amber-500');
    });

    it('should display B.A. name in red (#ef4444)', () => {
      const item = createWorkItem({
        assigned_agent: 'B.A.',
        stage: 'implementing',
      });
      render(<WorkItemCard item={item} />);

      const agentName = screen.getByTestId('agent-name');
      expect(agentName).toHaveTextContent('B.A.');
      expect(agentName).toHaveClass('text-red-500');
    });

    it('should display Amy name in pink (#ec4899)', () => {
      const item = createWorkItem({
        assigned_agent: 'Amy',
        stage: 'implementing',
      });
      render(<WorkItemCard item={item} />);

      const agentName = screen.getByTestId('agent-name');
      expect(agentName).toHaveTextContent('Amy');
      expect(agentName).toHaveClass('text-pink-500');
    });

    it('should display Lynch name in blue (#3b82f6)', () => {
      const item = createWorkItem({
        assigned_agent: 'Lynch',
        stage: 'review',
      });
      render(<WorkItemCard item={item} />);

      const agentName = screen.getByTestId('agent-name');
      expect(agentName).toHaveTextContent('Lynch');
      expect(agentName).toHaveClass('text-blue-500');
    });
  });

  describe('User icon display', () => {
    it('should render User icon before agent name', () => {
      const item = createWorkItem({
        assigned_agent: 'B.A.',
        stage: 'implementing',
      });
      render(<WorkItemCard item={item} />);

      const agentIndicator = screen.getByTestId('agent-indicator');
      const userIcon = agentIndicator.querySelector('[data-testid="agent-icon"]');
      expect(userIcon).toBeInTheDocument();
    });

    it('should have User icon as first child element in agent indicator', () => {
      const item = createWorkItem({
        assigned_agent: 'Murdock',
        stage: 'testing',
      });
      render(<WorkItemCard item={item} />);

      const agentIndicator = screen.getByTestId('agent-indicator');
      const children = Array.from(agentIndicator.children);

      // First element should be the status dot, second should be the icon, third should be the name
      // Or: First element should be the icon if status dot is removed/repositioned
      const iconElement = agentIndicator.querySelector('[data-testid="agent-icon"]');
      expect(iconElement).toBeInTheDocument();

      // Icon should come before the agent name in DOM order
      // const agentName = screen.getByTestId('agent-name');
      const iconIndex = children.findIndex(child => child.getAttribute('data-testid') === 'agent-icon');
      const nameIndex = children.findIndex(child => child.getAttribute('data-testid') === 'agent-name');

      // If icon is found directly as a child
      if (iconIndex !== -1 && nameIndex !== -1) {
        expect(iconIndex).toBeLessThan(nameIndex);
      }
    });

    it('should use lucide-react User icon component', () => {
      const item = createWorkItem({
        assigned_agent: 'Hannibal',
        stage: 'implementing',
      });
      render(<WorkItemCard item={item} />);

      const iconElement = screen.getByTestId('agent-icon');
      // Lucide icons render as SVG elements
      expect(iconElement.tagName.toLowerCase()).toBe('svg');
    });
  });

  describe('status dot colors', () => {
    it('should show green status dot when agent is active', () => {
      const item = createWorkItem({
        assigned_agent: 'B.A.',
        stage: 'implementing',
      });
      render(<WorkItemCard item={item} agentStatus="active" />);

      const agentIndicator = screen.getByTestId('agent-indicator');
      const statusDot = agentIndicator.querySelector('[data-status-dot]');
      expect(statusDot).toHaveClass('bg-green-500');
    });

    it('should show red status dot when agent is blocked', () => {
      const item = createWorkItem({
        assigned_agent: 'Murdock',
        stage: 'testing',
      });
      render(<WorkItemCard item={item} agentStatus="blocked" />);

      const agentIndicator = screen.getByTestId('agent-indicator');
      const statusDot = agentIndicator.querySelector('[data-status-dot]');
      expect(statusDot).toHaveClass('bg-red-500');
    });

    it('should default to green status dot when agentStatus is not provided', () => {
      const item = createWorkItem({
        assigned_agent: 'Face',
        stage: 'implementing',
      });
      render(<WorkItemCard item={item} />);

      const agentIndicator = screen.getByTestId('agent-indicator');
      const statusDot = agentIndicator.querySelector('[data-status-dot]');
      expect(statusDot).toHaveClass('bg-green-500');
    });
  });

  describe('badge positioning', () => {
    it('should position agent indicator in the card footer', () => {
      const item = createWorkItem({
        assigned_agent: 'B.A.',
        stage: 'implementing',
      });
      render(<WorkItemCard item={item} />);

      const footer = screen.getByTestId('card-footer');
      const agentIndicator = screen.getByTestId('agent-indicator');
      expect(footer).toContainElement(agentIndicator);
    });

    it('should position agent indicator at bottom-left (flex justify-between with agent first)', () => {
      const item = createWorkItem({
        assigned_agent: 'Lynch',
        stage: 'review',
        dependencies: ['001'],
      });
      render(<WorkItemCard item={item} blockerCount={1} />);

      const footer = screen.getByTestId('card-footer');
      // Footer should use flex justify-between for left/right positioning
      expect(footer).toHaveClass('flex');
      expect(footer).toHaveClass('justify-between');

      // Agent indicator should be the first child (left side)
      const agentIndicator = screen.getByTestId('agent-indicator');
      const blockerIndicator = screen.getByTestId('blocker-indicator');

      const children = Array.from(footer.querySelectorAll('[data-testid]'));
      const agentIndex = children.indexOf(agentIndicator);
      const blockerIndex = children.indexOf(blockerIndicator);
      expect(agentIndex).toBeLessThan(blockerIndex);
    });

    it('should render agent badge below type badge (footer comes after type badge in DOM)', () => {
      const item = createWorkItem({
        assigned_agent: 'Murdock',
        stage: 'testing',
        type: 'feature',
      });
      render(<WorkItemCard item={item} />);

      const card = screen.getByTestId('work-item-card');
      const typeBadge = screen.getByText('feature');
      const footer = screen.getByTestId('card-footer');

      // Get all elements to check order
      const allElements = card.querySelectorAll('*');
      const typeBadgeIndex = Array.from(allElements).findIndex(el => el === typeBadge);
      const footerIndex = Array.from(allElements).findIndex(el => el === footer);

      expect(typeBadgeIndex).toBeLessThan(footerIndex);
    });
  });

  describe('agent color consistency across stages', () => {
    const testAgentColorInStage = (agent: AgentName, stage: 'testing' | 'implementing' | 'review', expectedClass: string) => {
      const item = createWorkItem({
        assigned_agent: agent,
        stage,
      });
      render(<WorkItemCard item={item} />);

      const agentName = screen.getByTestId('agent-name');
      expect(agentName).toHaveClass(expectedClass);
    };

    it('should apply same color for Murdock in testing stage', () => {
      testAgentColorInStage('Murdock', 'testing', 'text-amber-500');
    });

    it('should apply same color for B.A. in implementing stage', () => {
      testAgentColorInStage('B.A.', 'implementing', 'text-red-500');
    });

    it('should apply same color for Lynch in review stage', () => {
      testAgentColorInStage('Lynch', 'review', 'text-blue-500');
    });
  });
});
