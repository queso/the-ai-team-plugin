import { describe, it, expect } from 'vitest';
import {
  getUnmetDependencies,
  isBlocked,
  getBlockerCount,
  hasCircularDependency,
} from '../lib/dependency-utils';

describe('Dependency Utils', () => {
  describe('getUnmetDependencies', () => {
    describe('happy path', () => {
      it('should return empty array when all dependencies are met', () => {
        const dependencies = ['001', '002', '003'];
        const doneItemIds = ['001', '002', '003', '004'];

        expect(getUnmetDependencies(dependencies, doneItemIds)).toEqual([]);
      });

      it('should return unmet dependencies not in done', () => {
        const dependencies = ['001', '004'];
        const doneItemIds = ['001', '002', '003'];

        expect(getUnmetDependencies(dependencies, doneItemIds)).toEqual(['004']);
      });

      it('should return all dependencies when none are met', () => {
        const dependencies = ['005', '006'];
        const doneItemIds = ['001', '002', '003'];

        expect(getUnmetDependencies(dependencies, doneItemIds)).toEqual(['005', '006']);
      });

      it('should return multiple unmet dependencies', () => {
        const dependencies = ['001', '004', '005'];
        const doneItemIds = ['001', '002', '003'];

        expect(getUnmetDependencies(dependencies, doneItemIds)).toEqual(['004', '005']);
      });
    });

    describe('edge cases', () => {
      it('should return empty array when no dependencies', () => {
        expect(getUnmetDependencies([], ['001', '002'])).toEqual([]);
      });

      it('should return all dependencies when done list is empty', () => {
        const dependencies = ['001', '002'];
        expect(getUnmetDependencies(dependencies, [])).toEqual(['001', '002']);
      });

      it('should handle empty dependencies and empty done list', () => {
        expect(getUnmetDependencies([], [])).toEqual([]);
      });

      it('should preserve order of unmet dependencies', () => {
        const dependencies = ['003', '001', '004'];
        const doneItemIds = ['001'];

        expect(getUnmetDependencies(dependencies, doneItemIds)).toEqual(['003', '004']);
      });
    });
  });

  describe('isBlocked', () => {
    describe('happy path', () => {
      it('should return false when all dependencies are met', () => {
        const dependencies = ['001', '002'];
        const doneItemIds = ['001', '002', '003'];

        expect(isBlocked(dependencies, doneItemIds)).toBe(false);
      });

      it('should return true when any dependency is unmet', () => {
        const dependencies = ['001', '004'];
        const doneItemIds = ['001', '002', '003'];

        expect(isBlocked(dependencies, doneItemIds)).toBe(true);
      });

      it('should return true when all dependencies are unmet', () => {
        const dependencies = ['005', '006'];
        const doneItemIds = ['001', '002', '003'];

        expect(isBlocked(dependencies, doneItemIds)).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should return false when no dependencies', () => {
        expect(isBlocked([], ['001', '002'])).toBe(false);
      });

      it('should return false when dependencies is empty and done is empty', () => {
        expect(isBlocked([], [])).toBe(false);
      });

      it('should return true when has dependencies but done list is empty', () => {
        expect(isBlocked(['001'], [])).toBe(true);
      });
    });
  });

  describe('getBlockerCount', () => {
    describe('happy path', () => {
      it('should return 0 when all dependencies are met', () => {
        const dependencies = ['001', '002'];
        const doneItemIds = ['001', '002', '003'];

        expect(getBlockerCount(dependencies, doneItemIds)).toBe(0);
      });

      it('should return count of unmet dependencies', () => {
        const dependencies = ['001', '004'];
        const doneItemIds = ['001', '002', '003'];

        expect(getBlockerCount(dependencies, doneItemIds)).toBe(1);
      });

      it('should return count when multiple dependencies are unmet', () => {
        const dependencies = ['001', '004', '005', '006'];
        const doneItemIds = ['001', '002', '003'];

        expect(getBlockerCount(dependencies, doneItemIds)).toBe(3);
      });

      it('should return total count when no dependencies are met', () => {
        const dependencies = ['004', '005', '006'];
        const doneItemIds = ['001', '002', '003'];

        expect(getBlockerCount(dependencies, doneItemIds)).toBe(3);
      });
    });

    describe('edge cases', () => {
      it('should return 0 when no dependencies', () => {
        expect(getBlockerCount([], ['001', '002'])).toBe(0);
      });

      it('should return 0 when both arrays are empty', () => {
        expect(getBlockerCount([], [])).toBe(0);
      });

      it('should return full count when done is empty', () => {
        expect(getBlockerCount(['001', '002', '003'], [])).toBe(3);
      });
    });
  });

  describe('hasCircularDependency', () => {
    describe('happy path - no circular dependencies', () => {
      it('should return false for item with no dependencies', () => {
        const graph: Record<string, string[]> = {
          '001': [],
          '002': ['001'],
        };

        expect(hasCircularDependency('001', graph)).toBe(false);
      });

      it('should return false for linear dependency chain', () => {
        const graph: Record<string, string[]> = {
          '001': [],
          '002': ['001'],
          '003': ['002'],
        };

        expect(hasCircularDependency('003', graph)).toBe(false);
      });

      it('should return false for diamond dependency pattern', () => {
        // 004 depends on 002 and 003, both depend on 001
        const graph: Record<string, string[]> = {
          '001': [],
          '002': ['001'],
          '003': ['001'],
          '004': ['002', '003'],
        };

        expect(hasCircularDependency('004', graph)).toBe(false);
      });
    });

    describe('circular dependency detection', () => {
      it('should detect direct self-reference', () => {
        const graph: Record<string, string[]> = {
          '001': ['001'],
        };

        expect(hasCircularDependency('001', graph)).toBe(true);
      });

      it('should detect two-node cycle', () => {
        const graph: Record<string, string[]> = {
          '001': ['002'],
          '002': ['001'],
        };

        expect(hasCircularDependency('001', graph)).toBe(true);
        expect(hasCircularDependency('002', graph)).toBe(true);
      });

      it('should detect three-node cycle', () => {
        const graph: Record<string, string[]> = {
          '001': ['002'],
          '002': ['003'],
          '003': ['001'],
        };

        expect(hasCircularDependency('001', graph)).toBe(true);
        expect(hasCircularDependency('002', graph)).toBe(true);
        expect(hasCircularDependency('003', graph)).toBe(true);
      });

      it('should detect cycle in larger graph', () => {
        const graph: Record<string, string[]> = {
          '001': [],
          '002': ['001'],
          '003': ['002', '004'],
          '004': ['005'],
          '005': ['003'], // Creates cycle: 003 -> 004 -> 005 -> 003
        };

        expect(hasCircularDependency('003', graph)).toBe(true);
        expect(hasCircularDependency('004', graph)).toBe(true);
        expect(hasCircularDependency('005', graph)).toBe(true);
        // Items not in the cycle should not report circular
        expect(hasCircularDependency('001', graph)).toBe(false);
        expect(hasCircularDependency('002', graph)).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should handle missing item in graph gracefully', () => {
        const graph: Record<string, string[]> = {
          '001': [],
        };

        expect(hasCircularDependency('999', graph)).toBe(false);
      });

      it('should handle empty graph', () => {
        expect(hasCircularDependency('001', {})).toBe(false);
      });

      it('should handle dependency to non-existent item', () => {
        const graph: Record<string, string[]> = {
          '001': ['999'], // 999 doesn't exist in graph
        };

        expect(hasCircularDependency('001', graph)).toBe(false);
      });
    });
  });
});
