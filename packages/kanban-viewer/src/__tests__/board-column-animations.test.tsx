import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BoardColumn } from '../components/board-column';
import type { WorkItem, CardAnimationState, CardAnimationDirection } from '@/types';

// Factory for creating test work items
function createTestItem(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    id: '001',
    title: 'Test Work Item',
    type: 'feature',
    status: 'pending',
    rejection_count: 0,
    dependencies: [],
    outputs: {},
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
    stage: 'briefings',
    content: 'Test content',
    ...overrides,
  };
}

function createTestItems(count: number): WorkItem[] {
  return Array.from({ length: count }, (_, i) =>
    createTestItem({
      id: String(i + 1).padStart(3, '0'),
      title: `Work Item ${i + 1}`,
    })
  );
}

describe('BoardColumn Animation Support', () => {
  describe('layout transition classes', () => {
    it('should apply card-layout-shift class to card wrappers', () => {
      const items = createTestItems(3);
      render(<BoardColumn stage="briefings" items={items} />);

      const wrapper1 = screen.getByTestId('card-wrapper-001');
      const wrapper2 = screen.getByTestId('card-wrapper-002');
      const wrapper3 = screen.getByTestId('card-wrapper-003');

      expect(wrapper1).toHaveClass('card-layout-shift');
      expect(wrapper2).toHaveClass('card-layout-shift');
      expect(wrapper3).toHaveClass('card-layout-shift');
    });

    it('should add will-change-transform when card is animating', () => {
      const items = createTestItems(2);
      const animatingItems = new Map<
        string,
        { state: CardAnimationState; direction: CardAnimationDirection }
      >([['001', { state: 'entering', direction: 'left' }]]);

      render(
        <BoardColumn
          stage="briefings"
          items={items}
          animatingItems={animatingItems}
        />
      );

      const animatingWrapper = screen.getByTestId('card-wrapper-001');
      const idleWrapper = screen.getByTestId('card-wrapper-002');

      expect(animatingWrapper).toHaveClass('will-change-transform');
      expect(idleWrapper).not.toHaveClass('will-change-transform');
    });

    it('should not add will-change-transform for idle animation state', () => {
      const items = createTestItems(1);
      const animatingItems = new Map<
        string,
        { state: CardAnimationState; direction: CardAnimationDirection }
      >([['001', { state: 'idle', direction: 'none' }]]);

      render(
        <BoardColumn
          stage="briefings"
          items={items}
          animatingItems={animatingItems}
        />
      );

      const wrapper = screen.getByTestId('card-wrapper-001');
      expect(wrapper).not.toHaveClass('will-change-transform');
    });
  });

  describe('animatingItems prop', () => {
    it('should pass animation state to WorkItemCard', () => {
      const items = createTestItems(1);
      const animatingItems = new Map<
        string,
        { state: CardAnimationState; direction: CardAnimationDirection }
      >([['001', { state: 'exiting', direction: 'right' }]]);

      render(
        <BoardColumn
          stage="briefings"
          items={items}
          animatingItems={animatingItems}
        />
      );

      const card = screen.getByTestId('work-item-card');
      expect(card).toHaveClass('card-exiting');
      expect(card).toHaveClass('card-exiting-right');
    });

    it('should handle entering animation with direction', () => {
      const items = createTestItems(1);
      const animatingItems = new Map<
        string,
        { state: CardAnimationState; direction: CardAnimationDirection }
      >([['001', { state: 'entering', direction: 'left' }]]);

      render(
        <BoardColumn
          stage="briefings"
          items={items}
          animatingItems={animatingItems}
        />
      );

      const card = screen.getByTestId('work-item-card');
      expect(card).toHaveClass('card-entering');
      expect(card).toHaveClass('card-entering-left');
    });

    it('should handle multiple items with different animation states', () => {
      const items = createTestItems(3);
      const animatingItems = new Map<
        string,
        { state: CardAnimationState; direction: CardAnimationDirection }
      >([
        ['001', { state: 'entering', direction: 'left' }],
        ['002', { state: 'idle', direction: 'none' }],
        ['003', { state: 'exiting', direction: 'right' }],
      ]);

      render(
        <BoardColumn
          stage="briefings"
          items={items}
          animatingItems={animatingItems}
        />
      );

      const cards = screen.getAllByTestId('work-item-card');
      expect(cards[0]).toHaveClass('card-entering');
      expect(cards[1]).toHaveClass('card-idle');
      expect(cards[2]).toHaveClass('card-exiting');
    });

    it('should render cards with no animation when animatingItems is undefined', () => {
      const items = createTestItems(2);

      render(<BoardColumn stage="briefings" items={items} />);

      const cards = screen.getAllByTestId('work-item-card');
      cards.forEach((card) => {
        expect(card).toHaveClass('card-idle');
      });
    });
  });

  describe('onAnimationEnd callback', () => {
    it('should call onAnimationEnd with item id when animation completes', () => {
      const items = createTestItems(1);
      const animatingItems = new Map<
        string,
        { state: CardAnimationState; direction: CardAnimationDirection }
      >([['001', { state: 'entering', direction: 'left' }]]);
      const handleAnimationEnd = vi.fn();

      render(
        <BoardColumn
          stage="briefings"
          items={items}
          animatingItems={animatingItems}
          onAnimationEnd={handleAnimationEnd}
        />
      );

      const card = screen.getByTestId('work-item-card');
      fireEvent.animationEnd(card);

      expect(handleAnimationEnd).toHaveBeenCalledTimes(1);
      expect(handleAnimationEnd).toHaveBeenCalledWith('001');
    });

    it('should not throw when onAnimationEnd is undefined', () => {
      const items = createTestItems(1);
      const animatingItems = new Map<
        string,
        { state: CardAnimationState; direction: CardAnimationDirection }
      >([['001', { state: 'entering', direction: 'left' }]]);

      render(
        <BoardColumn
          stage="briefings"
          items={items}
          animatingItems={animatingItems}
        />
      );

      const card = screen.getByTestId('work-item-card');

      expect(() => {
        fireEvent.animationEnd(card);
      }).not.toThrow();
    });

    it('should call onAnimationEnd for correct item when multiple cards animate', () => {
      const items = createTestItems(3);
      const animatingItems = new Map<
        string,
        { state: CardAnimationState; direction: CardAnimationDirection }
      >([
        ['001', { state: 'entering', direction: 'left' }],
        ['002', { state: 'entering', direction: 'left' }],
        ['003', { state: 'entering', direction: 'left' }],
      ]);
      const handleAnimationEnd = vi.fn();

      render(
        <BoardColumn
          stage="briefings"
          items={items}
          animatingItems={animatingItems}
          onAnimationEnd={handleAnimationEnd}
        />
      );

      const cards = screen.getAllByTestId('work-item-card');
      fireEvent.animationEnd(cards[1]); // Middle card

      expect(handleAnimationEnd).toHaveBeenCalledTimes(1);
      expect(handleAnimationEnd).toHaveBeenCalledWith('002');
    });
  });

  describe('card container structure', () => {
    it('should have card-container testid for scrollable area', () => {
      const items = createTestItems(2);
      render(<BoardColumn stage="briefings" items={items} />);

      const container = screen.getByTestId('card-container');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('p-2');
      expect(container).toHaveClass('space-y-2');
    });

    it('should maintain scroll area structure', () => {
      const items = createTestItems(2);
      render(<BoardColumn stage="briefings" items={items} />);

      const scrollArea = screen.getByTestId('column-scroll-area');
      expect(scrollArea).toBeInTheDocument();
      expect(scrollArea).toHaveClass('flex-1');
    });
  });

  describe('preserves existing functionality', () => {
    it('should still display column header with stage name', () => {
      render(<BoardColumn stage="testing" items={[]} />);

      expect(screen.getByText('TESTING')).toBeInTheDocument();
    });

    it('should still show item count', () => {
      const items = createTestItems(5);
      render(<BoardColumn stage="briefings" items={items} />);

      // WIP display shows count/limit format (5/∞ for unlimited)
      expect(screen.getByTestId('wip-display').textContent).toMatch(/^5\//);
    });

    it('should still call onItemClick when card is clicked', () => {
      const items = createTestItems(1);
      const handleClick = vi.fn();

      render(
        <BoardColumn
          stage="briefings"
          items={items}
          onItemClick={handleClick}
        />
      );

      const card = screen.getByTestId('work-item-card');
      fireEvent.click(card);

      expect(handleClick).toHaveBeenCalledWith(items[0]);
    });

    it('should render all items correctly', () => {
      const items = createTestItems(3);
      render(<BoardColumn stage="briefings" items={items} />);

      expect(screen.getByText('Work Item 1')).toBeInTheDocument();
      expect(screen.getByText('Work Item 2')).toBeInTheDocument();
      expect(screen.getByText('Work Item 3')).toBeInTheDocument();
    });
  });

  describe('rapid updates handling', () => {
    it('should handle animatingItems Map updates without issues', () => {
      const items = createTestItems(2);
      const initialAnimating = new Map<
        string,
        { state: CardAnimationState; direction: CardAnimationDirection }
      >([['001', { state: 'entering', direction: 'left' }]]);

      const { rerender } = render(
        <BoardColumn
          stage="briefings"
          items={items}
          animatingItems={initialAnimating}
        />
      );

      // Update animation states
      const updatedAnimating = new Map<
        string,
        { state: CardAnimationState; direction: CardAnimationDirection }
      >([
        ['001', { state: 'idle', direction: 'none' }],
        ['002', { state: 'exiting', direction: 'right' }],
      ]);

      rerender(
        <BoardColumn
          stage="briefings"
          items={items}
          animatingItems={updatedAnimating}
        />
      );

      const cards = screen.getAllByTestId('work-item-card');
      expect(cards[0]).toHaveClass('card-idle');
      expect(cards[1]).toHaveClass('card-exiting');
    });

    it('should handle items being added during animation', () => {
      const items = createTestItems(2);

      const { rerender } = render(
        <BoardColumn stage="briefings" items={items} />
      );

      // Add a new item with animation
      const newItems = [...items, createTestItem({ id: '003', title: 'New Item' })];
      const animatingItems = new Map<
        string,
        { state: CardAnimationState; direction: CardAnimationDirection }
      >([['003', { state: 'entering', direction: 'left' }]]);

      rerender(
        <BoardColumn
          stage="briefings"
          items={newItems}
          animatingItems={animatingItems}
        />
      );

      expect(screen.getByText('New Item')).toBeInTheDocument();
      const cards = screen.getAllByTestId('work-item-card');
      expect(cards[2]).toHaveClass('card-entering');
    });

    it('should handle items being removed during animation', () => {
      const items = createTestItems(3);
      const animatingItems = new Map<
        string,
        { state: CardAnimationState; direction: CardAnimationDirection }
      >([['002', { state: 'exiting', direction: 'right' }]]);

      const { rerender } = render(
        <BoardColumn
          stage="briefings"
          items={items}
          animatingItems={animatingItems}
        />
      );

      // Remove the exiting item
      const remainingItems = items.filter((item) => item.id !== '002');

      rerender(
        <BoardColumn
          stage="briefings"
          items={remainingItems}
        />
      );

      expect(screen.queryByText('Work Item 2')).not.toBeInTheDocument();
      expect(screen.getByText('Work Item 1')).toBeInTheDocument();
      expect(screen.getByText('Work Item 3')).toBeInTheDocument();
    });
  });
});
