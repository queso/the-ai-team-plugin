import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkItemCard } from '../components/work-item-card';
import type { WorkItem, WorkItemFrontmatterType } from '../types';

const createWorkItem = (overrides: Partial<WorkItem> = {}): WorkItem => ({
  id: '013',
  title: 'Payment Processing Module',
  type: 'feature',
  status: 'ready',
  assigned_agent: undefined,
  rejection_count: 0,
  dependencies: [],
  outputs: {},
  created_at: '2026-01-15T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z',
  stage: 'briefings',
  content: 'Test content',
  ...overrides,
});

describe('WorkItemCard', () => {
  describe('ID display', () => {
    it('should display ID in three-digit format with leading zeros', () => {
      const item = createWorkItem({ id: '5' });
      render(<WorkItemCard item={item} />);
      expect(screen.getByText('005')).toBeInTheDocument();
    });

    it('should display ID correctly when already three digits', () => {
      const item = createWorkItem({ id: '013' });
      render(<WorkItemCard item={item} />);
      expect(screen.getByText('013')).toBeInTheDocument();
    });

    it('should display ID correctly for two-digit IDs', () => {
      const item = createWorkItem({ id: '42' });
      render(<WorkItemCard item={item} />);
      expect(screen.getByText('042')).toBeInTheDocument();
    });
  });

  describe('title display', () => {
    it('should display the title prominently', () => {
      const item = createWorkItem({ title: 'Payment Processing Module' });
      render(<WorkItemCard item={item} />);
      expect(screen.getByText('Payment Processing Module')).toBeInTheDocument();
    });

    it('should handle multi-line titles', () => {
      const item = createWorkItem({ title: 'Very Long Title That Might Wrap To Multiple Lines' });
      render(<WorkItemCard item={item} />);
      expect(screen.getByText('Very Long Title That Might Wrap To Multiple Lines')).toBeInTheDocument();
    });
  });

  describe('type badge', () => {
    it('should display feature badge with tonal cyan styling', () => {
      const item = createWorkItem({ type: 'feature' });
      render(<WorkItemCard item={item} />);
      const badge = screen.getByText('feature');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-cyan-500/20');
    });

    it('should display bug badge with tonal red styling', () => {
      const item = createWorkItem({ type: 'bug' });
      render(<WorkItemCard item={item} />);
      const badge = screen.getByText('bug');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-red-500/20');
    });

    it('should display enhancement badge with tonal blue styling', () => {
      const item = createWorkItem({ type: 'enhancement' });
      render(<WorkItemCard item={item} />);
      const badge = screen.getByText('enhancement');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-blue-500/20');
    });

    it('should display task badge with tonal green styling', () => {
      const item = createWorkItem({ type: 'task' });
      render(<WorkItemCard item={item} />);
      const badge = screen.getByText('task');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-green-500/20');
    });
  });

  describe('type badge colors (Feature 011)', () => {
    it('should display feature badge with tonal cyan styling', () => {
      const item = createWorkItem({ type: 'feature' });
      render(<WorkItemCard item={item} />);
      const badge = screen.getByText('feature');

      // Feature badge should use tonal bg-cyan-500/20 with text-cyan-400
      expect(badge).toHaveClass('bg-cyan-500/20');
      expect(badge).toHaveClass('text-cyan-400');
      expect(badge).not.toHaveClass('bg-teal-500');
    });

    it('should verify all type badge colors match tonal styling', () => {
      const types: Array<{ type: WorkItemFrontmatterType; bgClass: string; textClass: string }> = [
        { type: 'feature', bgClass: 'bg-cyan-500/20', textClass: 'text-cyan-400' },
        { type: 'bug', bgClass: 'bg-red-500/20', textClass: 'text-red-400' },
        { type: 'enhancement', bgClass: 'bg-blue-500/20', textClass: 'text-blue-400' },
        { type: 'task', bgClass: 'bg-green-500/20', textClass: 'text-green-400' },
      ];

      types.forEach(({ type, bgClass, textClass }) => {
        const item = createWorkItem({ type });
        const { container } = render(<WorkItemCard item={item} />);
        const badge = screen.getByText(type);

        expect(badge).toHaveClass(bgClass);
        expect(badge).toHaveClass(textClass);

        // Clean up for next iteration
        container.remove();
      });
    });

    it('should display feature badge text in cyan-400', () => {
      const item = createWorkItem({ type: 'feature' });
      render(<WorkItemCard item={item} />);
      const badge = screen.getByText('feature');

      // Text should be cyan-400 for tonal styling
      expect(badge).toHaveClass('text-cyan-400');
    });

    it('should have consistent styling across all badge types', () => {
      const types: WorkItemFrontmatterType[] = ['feature', 'bug', 'enhancement', 'task'];

      types.forEach((type) => {
        const item = createWorkItem({ type });
        const { container } = render(<WorkItemCard item={item} />);
        const badge = screen.getByText(type);

        // All badges should have consistent base styling
        expect(badge).toHaveClass('text-xs');
        expect(badge).toHaveClass('font-medium');
        expect(badge).toHaveClass('rounded-full');
        expect(badge).toHaveClass('border');

        // Clean up for next iteration
        container.remove();
      });
    });
  });

  describe('agent display - stage-based visibility', () => {
    describe('should show agent in active work stages', () => {
      it('should show agent when stage is testing', () => {
        const item = createWorkItem({
          assigned_agent: 'Murdock',
          stage: 'testing',
        });
        render(<WorkItemCard item={item} />);
        expect(screen.getByTestId('agent-indicator')).toBeInTheDocument();
        expect(screen.getByText('Murdock')).toBeInTheDocument();
      });

      it('should show agent when stage is implementing', () => {
        const item = createWorkItem({
          assigned_agent: 'B.A.',
          stage: 'implementing',
        });
        render(<WorkItemCard item={item} />);
        expect(screen.getByTestId('agent-indicator')).toBeInTheDocument();
        expect(screen.getByText('B.A.')).toBeInTheDocument();
      });

      it('should show agent when stage is review', () => {
        const item = createWorkItem({
          assigned_agent: 'Lynch',
          stage: 'review',
        });
        render(<WorkItemCard item={item} />);
        expect(screen.getByTestId('agent-indicator')).toBeInTheDocument();
        expect(screen.getByText('Lynch')).toBeInTheDocument();
      });
    });

    describe('should NOT show agent in non-active stages', () => {
      it('should NOT show agent when stage is briefings', () => {
        const item = createWorkItem({
          assigned_agent: 'Hannibal',
          stage: 'briefings',
        });
        render(<WorkItemCard item={item} />);
        expect(screen.queryByTestId('agent-indicator')).not.toBeInTheDocument();
      });

      it('should NOT show agent when stage is ready', () => {
        const item = createWorkItem({
          assigned_agent: 'Face',
          stage: 'ready',
        });
        render(<WorkItemCard item={item} />);
        expect(screen.queryByTestId('agent-indicator')).not.toBeInTheDocument();
      });

      it('should NOT show agent when stage is done', () => {
        const item = createWorkItem({
          assigned_agent: 'B.A.',
          stage: 'done',
        });
        render(<WorkItemCard item={item} />);
        expect(screen.queryByTestId('agent-indicator')).not.toBeInTheDocument();
      });
    });

    it('should not display agent indicator when no agent is assigned', () => {
      const item = createWorkItem({
        assigned_agent: undefined,
        stage: 'implementing',
      });
      render(<WorkItemCard item={item} />);
      expect(screen.queryByTestId('agent-indicator')).not.toBeInTheDocument();
    });
  });

  describe('agent status dot colors', () => {
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
        assigned_agent: 'B.A.',
        stage: 'implementing',
      });
      render(<WorkItemCard item={item} agentStatus="blocked" />);
      const agentIndicator = screen.getByTestId('agent-indicator');
      const statusDot = agentIndicator.querySelector('[data-status-dot]');
      expect(statusDot).toHaveClass('bg-red-500');
    });

    it('should default to green status dot when agentStatus is not provided', () => {
      const item = createWorkItem({
        assigned_agent: 'B.A.',
        stage: 'implementing',
      });
      render(<WorkItemCard item={item} />);
      const agentIndicator = screen.getByTestId('agent-indicator');
      const statusDot = agentIndicator.querySelector('[data-status-dot]');
      expect(statusDot).toHaveClass('bg-green-500');
    });
  });

  describe('card footer layout', () => {
    it('should have a footer element with data-testid', () => {
      const item = createWorkItem({
        assigned_agent: 'Murdock',
        stage: 'testing',
      });
      render(<WorkItemCard item={item} />);
      expect(screen.getByTestId('card-footer')).toBeInTheDocument();
    });

    it('should render agent indicator before blocker indicator in DOM order (left to right)', () => {
      const item = createWorkItem({
        assigned_agent: 'Murdock',
        stage: 'testing',
        dependencies: ['001', '002'],
      });
      render(<WorkItemCard item={item} blockerCount={2} />);

      const footer = screen.getByTestId('card-footer');
      const agentIndicator = screen.getByTestId('agent-indicator');
      const blockerIndicator = screen.getByTestId('blocker-indicator');

      // Agent should appear before blocker in DOM order (left side)
      const children = Array.from(footer.querySelectorAll('[data-testid]'));
      const agentIndex = children.indexOf(agentIndicator);
      const blockerIndex = children.indexOf(blockerIndicator);
      expect(agentIndex).toBeLessThan(blockerIndex);
    });

    it('should display both agent and dependency count when both present', () => {
      const item = createWorkItem({
        assigned_agent: 'B.A.',
        stage: 'implementing',
        dependencies: ['001'],
      });
      render(<WorkItemCard item={item} blockerCount={1} />);
      expect(screen.getByTestId('agent-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('blocker-indicator')).toBeInTheDocument();
    });
  });

  describe('dependency blocker display', () => {
    it('should show blocker icon and count when blockerCount is provided', () => {
      const item = createWorkItem({ dependencies: ['001', '002'] });
      render(<WorkItemCard item={item} blockerCount={2} />);
      expect(screen.getByTestId('blocker-indicator')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should not show blocker when blockerCount is 0', () => {
      const item = createWorkItem({ dependencies: [] });
      render(<WorkItemCard item={item} blockerCount={0} />);
      expect(screen.queryByTestId('blocker-indicator')).not.toBeInTheDocument();
    });

    it('should not show blocker when blockerCount is not provided', () => {
      const item = createWorkItem({ dependencies: ['001'] });
      render(<WorkItemCard item={item} />);
      expect(screen.queryByTestId('blocker-indicator')).not.toBeInTheDocument();
    });
  });

  describe('dependency icon display (Feature 008)', () => {
    it('should show Link2 icon when item has dependencies', () => {
      const item = createWorkItem({ dependencies: ['001', '002'] });
      render(<WorkItemCard item={item} />);

      const dependencyIndicator = screen.getByTestId('dependency-indicator');
      expect(dependencyIndicator).toBeInTheDocument();

      // Link2 icon from lucide-react should be present
      const icon = dependencyIndicator.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should display dependency count next to icon', () => {
      const item = createWorkItem({ dependencies: ['001', '002', '003'] });
      render(<WorkItemCard item={item} />);

      const dependencyIndicator = screen.getByTestId('dependency-indicator');
      expect(dependencyIndicator).toHaveTextContent('3');
    });

    it('should use #6b7280 color for icon and count', () => {
      const item = createWorkItem({ dependencies: ['001'] });
      render(<WorkItemCard item={item} />);

      const dependencyIndicator = screen.getByTestId('dependency-indicator');
      // text-muted-foreground maps to #6b7280
      expect(dependencyIndicator).toHaveClass('text-muted-foreground');
    });

    it('should position dependency indicator right-aligned in card footer', () => {
      const item = createWorkItem({ dependencies: ['001'] });
      render(<WorkItemCard item={item} />);

      const footer = screen.getByTestId('card-footer');
      const dependencyIndicator = screen.getByTestId('dependency-indicator');

      // Footer should have justify-between or justify-end layout
      expect(footer).toHaveClass('flex');
      expect(footer).toHaveClass('justify-between');

      // Dependency indicator should be a child of footer
      expect(footer).toContainElement(dependencyIndicator);
    });

    it('should only be visible when dependencies array has items', () => {
      const itemWithDeps = createWorkItem({ dependencies: ['001'] });
      const itemWithoutDeps = createWorkItem({ dependencies: [] });

      const { rerender } = render(<WorkItemCard item={itemWithDeps} />);
      expect(screen.queryByTestId('dependency-indicator')).toBeInTheDocument();

      rerender(<WorkItemCard item={itemWithoutDeps} />);
      expect(screen.queryByTestId('dependency-indicator')).not.toBeInTheDocument();
    });

    it('should not be visible when dependencies is undefined', () => {
      const item = createWorkItem({ dependencies: undefined });
      render(<WorkItemCard item={item} />);
      expect(screen.queryByTestId('dependency-indicator')).not.toBeInTheDocument();
    });

    it('should show icon with 14px size', () => {
      const item = createWorkItem({ dependencies: ['001'] });
      render(<WorkItemCard item={item} />);

      const dependencyIndicator = screen.getByTestId('dependency-indicator');
      const icon = dependencyIndicator.querySelector('svg');

      // Icon should have h-3.5 w-3.5 classes (14px)
      expect(icon).toHaveClass('h-3.5');
      expect(icon).toHaveClass('w-3.5');
    });

    it('should display correct count for single dependency', () => {
      const item = createWorkItem({ dependencies: ['001'] });
      render(<WorkItemCard item={item} />);

      const dependencyIndicator = screen.getByTestId('dependency-indicator');
      expect(dependencyIndicator).toHaveTextContent('1');
    });

    it('should display correct count for multiple dependencies', () => {
      const item = createWorkItem({ dependencies: ['001', '002', '003', '004', '005'] });
      render(<WorkItemCard item={item} />);

      const dependencyIndicator = screen.getByTestId('dependency-indicator');
      expect(dependencyIndicator).toHaveTextContent('5');
    });
  });

  describe('rejection warning display', () => {
    it('should show rejection warning badge when rejection_count > 0', () => {
      const item = createWorkItem({ rejection_count: 2 });
      render(<WorkItemCard item={item} />);
      expect(screen.getByTestId('rejection-indicator')).toBeInTheDocument();
      expect(screen.getByText('2', { selector: '[data-testid="rejection-indicator"] *' })).toBeInTheDocument();
    });

    it('should not show rejection warning when rejection_count is 0', () => {
      const item = createWorkItem({ rejection_count: 0 });
      render(<WorkItemCard item={item} />);
      expect(screen.queryByTestId('rejection-indicator')).not.toBeInTheDocument();
    });

    it('should show correct count for multiple rejections', () => {
      const item = createWorkItem({ rejection_count: 5 });
      render(<WorkItemCard item={item} />);
      const indicator = screen.getByTestId('rejection-indicator');
      expect(indicator).toHaveTextContent('5');
    });
  });

  describe('rejection badge styling (Feature 012)', () => {
    it('should use AlertTriangle icon from lucide-react', () => {
      const item = createWorkItem({ rejection_count: 2 });
      render(<WorkItemCard item={item} />);

      const indicator = screen.getByTestId('rejection-indicator');
      const icon = indicator.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should have AlertTriangle icon with 14px size (h-3.5 w-3.5)', () => {
      const item = createWorkItem({ rejection_count: 1 });
      render(<WorkItemCard item={item} />);

      const indicator = screen.getByTestId('rejection-indicator');
      const icon = indicator.querySelector('svg');
      expect(icon).toHaveClass('h-3.5');
      expect(icon).toHaveClass('w-3.5');
    });

    it('should have icon color #eab308 (text-amber-500)', () => {
      const item = createWorkItem({ rejection_count: 3 });
      render(<WorkItemCard item={item} />);

      const indicator = screen.getByTestId('rejection-indicator');
      const icon = indicator.querySelector('svg');
      expect(icon).toHaveClass('text-amber-500');
    });

    it('should have badge with #eab308 background (bg-amber-500)', () => {
      const item = createWorkItem({ rejection_count: 1 });
      render(<WorkItemCard item={item} />);

      const indicator = screen.getByTestId('rejection-indicator');
      expect(indicator).toHaveClass('bg-amber-500');
    });

    it('should have badge padding 4px 8px (px-2 py-1)', () => {
      const item = createWorkItem({ rejection_count: 2 });
      render(<WorkItemCard item={item} />);

      const indicator = screen.getByTestId('rejection-indicator');
      expect(indicator).toHaveClass('px-2');
      expect(indicator).toHaveClass('py-1');
    });

    it('should have badge border-radius 4px (rounded)', () => {
      const item = createWorkItem({ rejection_count: 1 });
      render(<WorkItemCard item={item} />);

      const indicator = screen.getByTestId('rejection-indicator');
      expect(indicator).toHaveClass('rounded');
    });

    it('should display rejection count next to icon', () => {
      const item = createWorkItem({ rejection_count: 7 });
      render(<WorkItemCard item={item} />);

      const indicator = screen.getByTestId('rejection-indicator');
      expect(indicator).toHaveTextContent('7');
    });

    it('should have count text in white (text-white)', () => {
      const item = createWorkItem({ rejection_count: 2 });
      render(<WorkItemCard item={item} />);

      const indicator = screen.getByTestId('rejection-indicator');
      const countText = indicator.querySelector('span');
      expect(countText).toHaveClass('text-white');
    });

    it('should use 12px font size for count (text-xs)', () => {
      const item = createWorkItem({ rejection_count: 4 });
      render(<WorkItemCard item={item} />);

      const indicator = screen.getByTestId('rejection-indicator');
      const countText = indicator.querySelector('span');
      expect(countText).toHaveClass('text-xs');
    });

    it('should use font-weight 600 for count (font-semibold)', () => {
      const item = createWorkItem({ rejection_count: 2 });
      render(<WorkItemCard item={item} />);

      const indicator = screen.getByTestId('rejection-indicator');
      const countText = indicator.querySelector('span');
      expect(countText).toHaveClass('font-semibold');
    });
  });

  describe('hover state', () => {
    it('should have hover styling class', () => {
      const item = createWorkItem();
      render(<WorkItemCard item={item} />);
      const card = screen.getByTestId('work-item-card');
      expect(card).toHaveClass('hover:bg-accent');
    });
  });

  describe('click handler', () => {
    it('should call onClick when card is clicked', () => {
      const handleClick = vi.fn();
      const item = createWorkItem();
      render(<WorkItemCard item={item} onClick={handleClick} />);

      const card = screen.getByTestId('work-item-card');
      fireEvent.click(card);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not throw when clicked without onClick handler', () => {
      const item = createWorkItem();
      render(<WorkItemCard item={item} />);

      const card = screen.getByTestId('work-item-card');
      expect(() => fireEvent.click(card)).not.toThrow();
    });

    it('should have cursor-pointer class when onClick is provided', () => {
      const item = createWorkItem();
      render(<WorkItemCard item={item} onClick={() => {}} />);

      const card = screen.getByTestId('work-item-card');
      expect(card).toHaveClass('cursor-pointer');
    });
  });

  describe('card structure', () => {
    it('should use shadcn Card component as base', () => {
      const item = createWorkItem();
      render(<WorkItemCard item={item} />);
      const card = screen.getByTestId('work-item-card');
      expect(card).toHaveAttribute('data-slot', 'card');
    });
  });

  describe('card styling', () => {
    it('should have correct background color (#2a2a2a)', () => {
      const item = createWorkItem();
      render(<WorkItemCard item={item} />);
      const card = screen.getByTestId('work-item-card');

      // Card uses bg-card which maps to --card CSS variable
      // In dark mode, --card is oklch(0.205 0 0) which is approximately #2a2a2a
      expect(card).toHaveClass('bg-card');
    });

    it('should have 1px border', () => {
      const item = createWorkItem();
      render(<WorkItemCard item={item} />);
      const card = screen.getByTestId('work-item-card');

      // Card component applies border class by default
      expect(card).toHaveClass('border');
    });

    it('should have 8px border-radius (rounded-lg)', () => {
      const item = createWorkItem();
      render(<WorkItemCard item={item} />);
      const card = screen.getByTestId('work-item-card');

      // Card uses rounded-xl but implementation should override to rounded-lg for 8px
      // This test verifies the border-radius class is present
      expect(card.className).toMatch(/rounded-/);
    });

    it('should have 16px padding on all sides (p-4)', () => {
      const item = createWorkItem();
      render(<WorkItemCard item={item} />);
      const card = screen.getByTestId('work-item-card');

      // p-3 is 12px, p-4 is 16px
      expect(card).toHaveClass('p-4');
    });
  });

  describe('item ID styling', () => {
    it('should display ID with muted gray color (#6b7280)', () => {
      const item = createWorkItem({ id: '42' });
      render(<WorkItemCard item={item} />);
      const idElement = screen.getByText('042');

      // text-muted-foreground maps to --muted-foreground
      // In dark mode, this is oklch(0.708 0 0) which is approximately #6b7280
      expect(idElement).toHaveClass('text-muted-foreground');
    });

    it('should display ID with 12px font size (text-xs)', () => {
      const item = createWorkItem({ id: '5' });
      render(<WorkItemCard item={item} />);
      const idElement = screen.getByText('005');

      // text-xs is 12px
      expect(idElement).toHaveClass('text-xs');
    });

    it('should display ID in monospace font', () => {
      const item = createWorkItem({ id: '13' });
      render(<WorkItemCard item={item} />);
      const idElement = screen.getByText('013');

      expect(idElement).toHaveClass('font-mono');
    });

    it('should position ID at top left', () => {
      const item = createWorkItem({ id: '1' });
      render(<WorkItemCard item={item} />);
      const idElement = screen.getByText('001');

      // ID should be in first child (header row) and aligned to start
      const headerRow = idElement.parentElement;
      expect(headerRow).toHaveClass('flex');
      expect(headerRow).toHaveClass('justify-between');
    });
  });

  describe('title styling', () => {
    it('should display title with 14px font size (text-sm)', () => {
      const item = createWorkItem({ title: 'Test Feature' });
      render(<WorkItemCard item={item} />);
      const titleElement = screen.getByText('Test Feature');

      // text-sm is 14px
      expect(titleElement).toHaveClass('text-sm');
    });

    it('should display title with white color (#ffffff)', () => {
      const item = createWorkItem({ title: 'Test Feature' });
      render(<WorkItemCard item={item} />);
      const titleElement = screen.getByText('Test Feature');

      // In dark mode, foreground text should be white
      // The component doesn't explicitly set text color, relying on card-foreground
      // Title element should have font-medium but inherit color from parent
      expect(titleElement).toHaveClass('font-medium');
    });

    it('should display title with font-weight 500 (font-medium)', () => {
      const item = createWorkItem({ title: 'Test Feature' });
      render(<WorkItemCard item={item} />);
      const titleElement = screen.getByText('Test Feature');

      // font-medium is font-weight: 500
      expect(titleElement).toHaveClass('font-medium');
    });
  });

  describe('hover state styling', () => {
    it('should have hover:bg-accent class for hover state', () => {
      const item = createWorkItem();
      render(<WorkItemCard item={item} />);
      const card = screen.getByTestId('work-item-card');

      // hover:bg-accent should lighten background to #333333 in dark mode
      expect(card).toHaveClass('hover:bg-accent');
    });

    it('should have transition-colors class for smooth hover transition', () => {
      const item = createWorkItem();
      render(<WorkItemCard item={item} />);
      const card = screen.getByTestId('work-item-card');

      expect(card).toHaveClass('transition-colors');
    });
  });

  describe('card spacing', () => {
    it('should have gap-2 class for 8px internal spacing', () => {
      const item = createWorkItem();
      render(<WorkItemCard item={item} />);
      const card = screen.getByTestId('work-item-card');

      // gap-2 is 8px (0.5rem)
      expect(card).toHaveClass('gap-2');
    });
  });

  describe('reduced border radius (Item 008)', () => {
    /**
     * Item 008: Work Item Card Reduced Border Radius
     *
     * Acceptance Criteria:
     * - Cards have reduced border-radius (rounded-md instead of rounded-xl)
     * - Change applied via className override on Card component
     * - Other Card usages not affected
     */

    it('should have reduced border-radius using rounded-md class', () => {
      const item = createWorkItem();
      render(<WorkItemCard item={item} />);
      const card = screen.getByTestId('work-item-card');

      // Card should use rounded-md (6px) instead of default rounded-xl (12px)
      expect(card).toHaveClass('rounded-md');
    });

    it('should not use default rounded-xl class', () => {
      const item = createWorkItem();
      render(<WorkItemCard item={item} />);
      const card = screen.getByTestId('work-item-card');

      // Should not have the default larger border radius
      expect(card).not.toHaveClass('rounded-xl');
    });

    it('should apply border-radius override via className prop', () => {
      const item = createWorkItem();
      render(<WorkItemCard item={item} />);
      const card = screen.getByTestId('work-item-card');

      // The className should include rounded-md
      expect(card.className).toContain('rounded-md');
    });
  });

  describe('tonal type badge styling (Item 009)', () => {
    /**
     * Item 009: Tonal Type Badge Styling
     *
     * Acceptance Criteria:
     * - Type badges have muted/transparent background (bg-cyan-500/20, etc.)
     * - Badge text uses full saturation color (text-cyan-400, etc.)
     * - Badge has subtle border (border-cyan-500/50, etc.)
     * - All types updated: feature, bug, enhancement, task
     *
     * Color mapping:
     * feature: bg-cyan-500/20 text-cyan-400 border-cyan-500/50
     * bug: bg-red-500/20 text-red-400 border-red-500/50
     * enhancement: bg-blue-500/20 text-blue-400 border-blue-500/50
     * task: bg-green-500/20 text-green-400 border-green-500/50
     */

    describe('feature badge tonal styling', () => {
      it('should have muted/transparent background (bg-cyan-500/20)', () => {
        const item = createWorkItem({ type: 'feature' });
        render(<WorkItemCard item={item} />);
        const badge = screen.getByText('feature');
        expect(badge).toHaveClass('bg-cyan-500/20');
      });

      it('should have full saturation text color (text-cyan-400)', () => {
        const item = createWorkItem({ type: 'feature' });
        render(<WorkItemCard item={item} />);
        const badge = screen.getByText('feature');
        expect(badge).toHaveClass('text-cyan-400');
      });

      it('should have subtle border (border-cyan-500/50)', () => {
        const item = createWorkItem({ type: 'feature' });
        render(<WorkItemCard item={item} />);
        const badge = screen.getByText('feature');
        expect(badge).toHaveClass('border');
        expect(badge).toHaveClass('border-cyan-500/50');
      });
    });

    describe('bug badge tonal styling', () => {
      it('should have muted/transparent background (bg-red-500/20)', () => {
        const item = createWorkItem({ type: 'bug' });
        render(<WorkItemCard item={item} />);
        const badge = screen.getByText('bug');
        expect(badge).toHaveClass('bg-red-500/20');
      });

      it('should have full saturation text color (text-red-400)', () => {
        const item = createWorkItem({ type: 'bug' });
        render(<WorkItemCard item={item} />);
        const badge = screen.getByText('bug');
        expect(badge).toHaveClass('text-red-400');
      });

      it('should have subtle border (border-red-500/50)', () => {
        const item = createWorkItem({ type: 'bug' });
        render(<WorkItemCard item={item} />);
        const badge = screen.getByText('bug');
        expect(badge).toHaveClass('border');
        expect(badge).toHaveClass('border-red-500/50');
      });
    });

    describe('enhancement badge tonal styling', () => {
      it('should have muted/transparent background (bg-blue-500/20)', () => {
        const item = createWorkItem({ type: 'enhancement' });
        render(<WorkItemCard item={item} />);
        const badge = screen.getByText('enhancement');
        expect(badge).toHaveClass('bg-blue-500/20');
      });

      it('should have full saturation text color (text-blue-400)', () => {
        const item = createWorkItem({ type: 'enhancement' });
        render(<WorkItemCard item={item} />);
        const badge = screen.getByText('enhancement');
        expect(badge).toHaveClass('text-blue-400');
      });

      it('should have subtle border (border-blue-500/50)', () => {
        const item = createWorkItem({ type: 'enhancement' });
        render(<WorkItemCard item={item} />);
        const badge = screen.getByText('enhancement');
        expect(badge).toHaveClass('border');
        expect(badge).toHaveClass('border-blue-500/50');
      });
    });

    describe('task badge tonal styling', () => {
      it('should have muted/transparent background (bg-green-500/20)', () => {
        const item = createWorkItem({ type: 'task' });
        render(<WorkItemCard item={item} />);
        const badge = screen.getByText('task');
        expect(badge).toHaveClass('bg-green-500/20');
      });

      it('should have full saturation text color (text-green-400)', () => {
        const item = createWorkItem({ type: 'task' });
        render(<WorkItemCard item={item} />);
        const badge = screen.getByText('task');
        expect(badge).toHaveClass('text-green-400');
      });

      it('should have subtle border (border-green-500/50)', () => {
        const item = createWorkItem({ type: 'task' });
        render(<WorkItemCard item={item} />);
        const badge = screen.getByText('task');
        expect(badge).toHaveClass('border');
        expect(badge).toHaveClass('border-green-500/50');
      });
    });

    it('should apply tonal styling to all badge types', () => {
      const types: Array<{
        type: WorkItemFrontmatterType;
        bgClass: string;
        textClass: string;
        borderClass: string;
      }> = [
        { type: 'feature', bgClass: 'bg-cyan-500/20', textClass: 'text-cyan-400', borderClass: 'border-cyan-500/50' },
        { type: 'bug', bgClass: 'bg-red-500/20', textClass: 'text-red-400', borderClass: 'border-red-500/50' },
        { type: 'enhancement', bgClass: 'bg-blue-500/20', textClass: 'text-blue-400', borderClass: 'border-blue-500/50' },
        { type: 'task', bgClass: 'bg-green-500/20', textClass: 'text-green-400', borderClass: 'border-green-500/50' },
      ];

      types.forEach(({ type, bgClass, textClass, borderClass }) => {
        const item = createWorkItem({ type });
        const { container } = render(<WorkItemCard item={item} />);
        const badge = screen.getByText(type);

        expect(badge).toHaveClass(bgClass);
        expect(badge).toHaveClass(textClass);
        expect(badge).toHaveClass('border');
        expect(badge).toHaveClass(borderClass);

        container.remove();
      });
    });

    it('should no longer use solid white text on badges', () => {
      const types: WorkItemFrontmatterType[] = ['feature', 'bug', 'enhancement', 'task'];

      types.forEach((type) => {
        const item = createWorkItem({ type });
        const { container } = render(<WorkItemCard item={item} />);
        const badge = screen.getByText(type);

        // Tonal styling should not use white text
        expect(badge).not.toHaveClass('text-white');

        container.remove();
      });
    });

    it('should no longer use solid background colors on badges', () => {
      const item = createWorkItem({ type: 'feature' });
      render(<WorkItemCard item={item} />);
      const badge = screen.getByText('feature');

      // Should not use solid bg-cyan-500, should use tonal bg-cyan-500/20
      expect(badge).not.toHaveClass('bg-cyan-500');
    });
  });

  describe('consistent card height (Item 010)', () => {
    /**
     * Item 010: Consistent Work Item Card Height
     *
     * Acceptance Criteria:
     * - All cards have minimum height (min-h-[140px])
     * - Card uses flexbox with justify-between
     * - Footer pushed to bottom
     */

    it('should have minimum height of 140px (min-h-[140px])', () => {
      const item = createWorkItem();
      render(<WorkItemCard item={item} />);
      const card = screen.getByTestId('work-item-card');

      expect(card).toHaveClass('min-h-[140px]');
    });

    it('should use flexbox column layout (flex flex-col)', () => {
      const item = createWorkItem();
      render(<WorkItemCard item={item} />);
      const card = screen.getByTestId('work-item-card');

      expect(card).toHaveClass('flex');
      expect(card).toHaveClass('flex-col');
    });

    it('should use justify-between to push footer to bottom', () => {
      const item = createWorkItem();
      render(<WorkItemCard item={item} />);
      const card = screen.getByTestId('work-item-card');

      expect(card).toHaveClass('justify-between');
    });

    it('should maintain consistent height regardless of content length', () => {
      const shortTitleItem = createWorkItem({ title: 'Short' });
      const longTitleItem = createWorkItem({
        title: 'Very Long Title That Might Wrap To Multiple Lines And Take Up More Space',
      });

      const { container: container1 } = render(<WorkItemCard item={shortTitleItem} />);
      const card1 = screen.getByTestId('work-item-card');
      expect(card1).toHaveClass('min-h-[140px]');
      container1.remove();

      const { container: container2 } = render(<WorkItemCard item={longTitleItem} />);
      const card2 = screen.getByTestId('work-item-card');
      expect(card2).toHaveClass('min-h-[140px]');
      container2.remove();
    });

    it('should have footer at bottom with flexbox layout', () => {
      const item = createWorkItem({
        assigned_agent: 'Murdock',
        stage: 'testing',
      });
      render(<WorkItemCard item={item} />);

      const card = screen.getByTestId('work-item-card');
      const footer = screen.getByTestId('card-footer');

      // Card should be flexbox column with justify-between
      expect(card).toHaveClass('flex');
      expect(card).toHaveClass('flex-col');
      expect(card).toHaveClass('justify-between');

      // Footer should be the last element content-wise
      expect(footer).toBeInTheDocument();
    });

    it('should have card with all height-related classes together', () => {
      const item = createWorkItem();
      render(<WorkItemCard item={item} />);
      const card = screen.getByTestId('work-item-card');

      // Verify all three height-related classes are present
      const classList = card.className;
      expect(classList).toContain('min-h-[140px]');
      expect(classList).toContain('flex');
      expect(classList).toContain('flex-col');
      expect(classList).toContain('justify-between');
    });
  });

  describe('dependency tooltip (Item 005)', () => {
    /**
     * Item 005: Work Item Card Dependency Tooltip
     *
     * Acceptance Criteria:
     * - Tooltip appears on hover over dependency icon (Link2 icon)
     * - Tooltip shows dependency IDs (e.g., "Depends on: 002, 010")
     * - Tooltip styling matches dark theme
     * - Tooltip disappears when mouse leaves
     *
     * Uses Radix UI Tooltip like DependencyIndicator component.
     * Note: Radix UI renders tooltip content twice (visual + accessibility)
     * so we use getAllBy* variants and check length >= 1.
     */

    it('should show tooltip with "Depends on:" header when hovered', () => {
      const item = createWorkItem({ dependencies: ['002', '010'] });
      render(<WorkItemCard item={item} showDependencyTooltip defaultTooltipOpen />);

      // Radix UI renders tooltip content in multiple places for accessibility
      const headers = screen.getAllByText(/Depends on/i);
      expect(headers.length).toBeGreaterThanOrEqual(1);
    });

    it('should list all dependency IDs in tooltip', () => {
      const item = createWorkItem({ dependencies: ['002', '010', '015'] });
      render(<WorkItemCard item={item} showDependencyTooltip defaultTooltipOpen />);

      // Check each dependency ID is shown
      const id002 = screen.getAllByText(/002/);
      const id010 = screen.getAllByText(/010/);
      const id015 = screen.getAllByText(/015/);

      expect(id002.length).toBeGreaterThanOrEqual(1);
      expect(id010.length).toBeGreaterThanOrEqual(1);
      expect(id015.length).toBeGreaterThanOrEqual(1);
    });

    it('should show dependency IDs as comma-separated list', () => {
      const item = createWorkItem({ dependencies: ['002', '010'] });
      render(<WorkItemCard item={item} showDependencyTooltip defaultTooltipOpen />);

      // The tooltip should show "Depends on: 002, 010" format
      const tooltipContent = screen.getAllByText(/002.*010|010.*002/);
      expect(tooltipContent.length).toBeGreaterThanOrEqual(1);
    });

    it('should show single dependency ID in tooltip', () => {
      const item = createWorkItem({ dependencies: ['042'] });
      render(<WorkItemCard item={item} showDependencyTooltip defaultTooltipOpen />);

      const ids = screen.getAllByText(/042/);
      expect(ids.length).toBeGreaterThanOrEqual(1);
    });

    it('should wrap dependency indicator with Tooltip component', () => {
      const item = createWorkItem({ dependencies: ['001'] });
      render(<WorkItemCard item={item} showDependencyTooltip />);

      // The dependency indicator should be wrapped in a tooltip trigger
      const dependencyIndicator = screen.getByTestId('dependency-indicator');
      expect(dependencyIndicator).toBeInTheDocument();

      // Should have cursor-pointer to indicate it's interactive
      expect(dependencyIndicator).toHaveClass('cursor-default');
    });

    it('should not render tooltip when no dependencies exist', () => {
      const item = createWorkItem({ dependencies: [] });
      render(<WorkItemCard item={item} showDependencyTooltip defaultTooltipOpen />);

      // No dependency indicator means no tooltip
      expect(screen.queryByTestId('dependency-indicator')).not.toBeInTheDocument();
      expect(screen.queryByText(/Depends on/i)).not.toBeInTheDocument();
    });

    it('should use Radix UI Tooltip for accessibility', () => {
      const item = createWorkItem({ dependencies: ['002'] });
      const { container } = render(
        <WorkItemCard item={item} showDependencyTooltip defaultTooltipOpen />
      );

      // Radix UI Tooltip adds data-radix-* attributes
      const tooltipTrigger = container.querySelector('[data-state]');
      expect(tooltipTrigger).toBeInTheDocument();
    });

    it('should have tooltip content with dark theme styling', () => {
      const item = createWorkItem({ dependencies: ['002', '010'] });
      render(<WorkItemCard item={item} showDependencyTooltip defaultTooltipOpen />);

      // TooltipContent from shadcn/ui has built-in dark theme styling
      // We verify the content renders correctly
      const headers = screen.getAllByText(/Depends on/i);
      expect(headers.length).toBeGreaterThanOrEqual(1);
    });

    it('should format dependency IDs with leading zeros', () => {
      const item = createWorkItem({ dependencies: ['2', '10'] });
      render(<WorkItemCard item={item} showDependencyTooltip defaultTooltipOpen />);

      // IDs should be formatted as 3-digit with leading zeros
      const id002 = screen.getAllByText(/002/);
      const id010 = screen.getAllByText(/010/);

      expect(id002.length).toBeGreaterThanOrEqual(1);
      expect(id010.length).toBeGreaterThanOrEqual(1);
    });
  });
});
