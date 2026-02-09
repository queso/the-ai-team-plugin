import { describe, it, expect } from 'vitest';
import type {
  CardAnimationState,
  CardAnimationDirection,
  AnimatingItem,
  Stage,
} from '../types';

/**
 * Tests for card animation TypeScript types.
 * Verifies type definitions for animation state management.
 */
describe('Card Animation Types', () => {
  describe('CardAnimationState', () => {
    it('should accept entering state', () => {
      const state: CardAnimationState = 'entering';
      expect(state).toBe('entering');
    });

    it('should accept exiting state', () => {
      const state: CardAnimationState = 'exiting';
      expect(state).toBe('exiting');
    });

    it('should accept idle state', () => {
      const state: CardAnimationState = 'idle';
      expect(state).toBe('idle');
    });

    it('should reject invalid state at compile time', () => {
      // @ts-expect-error - 'moving' is not a valid CardAnimationState
      const invalid: CardAnimationState = 'moving';
      expect(invalid).toBeDefined();
    });
  });

  describe('CardAnimationDirection', () => {
    it('should accept left direction', () => {
      const direction: CardAnimationDirection = 'left';
      expect(direction).toBe('left');
    });

    it('should accept right direction', () => {
      const direction: CardAnimationDirection = 'right';
      expect(direction).toBe('right');
    });

    it('should accept none direction', () => {
      const direction: CardAnimationDirection = 'none';
      expect(direction).toBe('none');
    });

    it('should reject invalid direction at compile time', () => {
      // @ts-expect-error - 'up' is not a valid CardAnimationDirection
      const invalid: CardAnimationDirection = 'up';
      expect(invalid).toBeDefined();
    });
  });

  describe('AnimatingItem', () => {
    it('should create item with required fields', () => {
      const item: AnimatingItem = {
        itemId: '001',
        state: 'entering',
        direction: 'right',
      };

      expect(item.itemId).toBe('001');
      expect(item.state).toBe('entering');
      expect(item.direction).toBe('right');
    });

    it('should create item with optional fromStage', () => {
      const item: AnimatingItem = {
        itemId: '001',
        state: 'exiting',
        direction: 'left',
        fromStage: 'ready',
      };

      expect(item.fromStage).toBe('ready');
      expect(item.toStage).toBeUndefined();
    });

    it('should create item with optional toStage', () => {
      const item: AnimatingItem = {
        itemId: '001',
        state: 'entering',
        direction: 'right',
        toStage: 'testing',
      };

      expect(item.toStage).toBe('testing');
      expect(item.fromStage).toBeUndefined();
    });

    it('should create item with both fromStage and toStage', () => {
      const item: AnimatingItem = {
        itemId: '001',
        state: 'exiting',
        direction: 'right',
        fromStage: 'ready',
        toStage: 'testing',
      };

      expect(item.fromStage).toBe('ready');
      expect(item.toStage).toBe('testing');
    });

    it('should work with all valid Stage values', () => {
      const stages: Stage[] = [
        'briefings',
        'ready',
        'testing',
        'implementing',
        'review',
        'done',
        'blocked',
      ];

      stages.forEach((stage) => {
        const item: AnimatingItem = {
          itemId: '001',
          state: 'idle',
          direction: 'none',
          fromStage: stage,
          toStage: stage,
        };
        expect(item.fromStage).toBe(stage);
        expect(item.toStage).toBe(stage);
      });
    });

    it('should track animation state for multiple items', () => {
      const animatingItems: AnimatingItem[] = [
        { itemId: '001', state: 'exiting', direction: 'right', fromStage: 'ready' },
        { itemId: '002', state: 'entering', direction: 'left', toStage: 'testing' },
        { itemId: '003', state: 'idle', direction: 'none' },
      ];

      expect(animatingItems).toHaveLength(3);
      expect(animatingItems[0].state).toBe('exiting');
      expect(animatingItems[1].state).toBe('entering');
      expect(animatingItems[2].state).toBe('idle');
    });
  });
});
