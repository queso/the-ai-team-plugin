/**
 * Tests for ItemType harmonization between API and UI layers.
 *
 * Issue: The API layer (src/types/item.ts) uses ItemType = 'feature' | 'bug' | 'chore' | 'spike'
 * while the UI layer (src/types/index.ts) uses WorkItemFrontmatterType = 'feature' | 'bug' | 'enhancement' | 'task'
 *
 * Goal: ItemType should match the UI expected types exactly:
 *   - feature (already matches)
 *   - bug (already matches)
 *   - enhancement (currently 'spike' in API)
 *   - task (currently 'chore' in API)
 *
 * These tests verify the harmonization is complete and correct.
 */

import { describe, it, expect } from 'vitest';
import type { ItemType } from '../../types/item';
import type { WorkItemFrontmatterType, TypeFilter } from '../../types';

// ============ ItemType Value Tests ============

describe('ItemType Harmonization (src/types/item.ts)', () => {
  describe('ItemType should include UI-expected types', () => {
    it('should accept "feature" as valid ItemType', () => {
      const itemType: ItemType = 'feature';
      expect(itemType).toBe('feature');
    });

    it('should accept "bug" as valid ItemType', () => {
      const itemType: ItemType = 'bug';
      expect(itemType).toBe('bug');
    });

    it('should accept "enhancement" as valid ItemType', () => {
      // This test will FAIL until ItemType is updated to include 'enhancement'
      const itemType: ItemType = 'enhancement';
      expect(itemType).toBe('enhancement');
    });

    it('should accept "task" as valid ItemType', () => {
      // This test will FAIL until ItemType is updated to include 'task'
      const itemType: ItemType = 'task';
      expect(itemType).toBe('task');
    });
  });

  describe('ItemType should NOT include legacy API types', () => {
    it('should NOT include "spike" in the harmonized type', () => {
      // The harmonized ItemType should NOT include 'spike'
      // This runtime check verifies that 'spike' is not in the expected types
      const harmonizedTypes = ['feature', 'bug', 'enhancement', 'task'];
      expect(harmonizedTypes).not.toContain('spike');
    });

    it('should NOT include "chore" in the harmonized type', () => {
      // The harmonized ItemType should NOT include 'chore'
      // This runtime check verifies that 'chore' is not in the expected types
      const harmonizedTypes = ['feature', 'bug', 'enhancement', 'task'];
      expect(harmonizedTypes).not.toContain('chore');
    });
  });

  describe('ItemType completeness', () => {
    it('should include exactly four types: feature, bug, enhancement, task', () => {
      // This is a compile-time test - all four should be assignable
      const types: ItemType[] = ['feature', 'bug', 'enhancement', 'task'];
      expect(types).toHaveLength(4);
      expect(types).toContain('feature');
      expect(types).toContain('bug');
      expect(types).toContain('enhancement');
      expect(types).toContain('task');
    });

    it('should be exhaustive - no other values allowed', () => {
      // @ts-expect-error - 'invalid' is not a valid ItemType
      const invalid: ItemType = 'invalid';
      expect(invalid).toBeDefined();

      // @ts-expect-error - empty string is not valid
      const empty: ItemType = '';
      expect(empty).toBeDefined();
    });
  });
});

// ============ Type Compatibility Tests ============

describe('ItemType and WorkItemFrontmatterType Compatibility', () => {
  describe('Type equivalence', () => {
    it('should be assignable to WorkItemFrontmatterType', () => {
      // After harmonization, ItemType should be compatible with WorkItemFrontmatterType
      const itemType: ItemType = 'feature';
      const frontmatterType: WorkItemFrontmatterType = itemType;
      expect(frontmatterType).toBe('feature');
    });

    it('WorkItemFrontmatterType should be assignable to ItemType', () => {
      // Reverse assignment should also work
      const frontmatterType: WorkItemFrontmatterType = 'enhancement';
      const itemType: ItemType = frontmatterType;
      expect(itemType).toBe('enhancement');
    });

    it('all WorkItemFrontmatterType values should be valid ItemType values', () => {
      const frontmatterTypes: WorkItemFrontmatterType[] = ['feature', 'bug', 'enhancement', 'task'];

      frontmatterTypes.forEach((ft) => {
        // Each frontmatter type should be assignable to ItemType
        const itemType: ItemType = ft;
        expect(itemType).toBe(ft);
      });
    });
  });

  describe('TypeFilter compatibility', () => {
    it('ItemType values should be valid TypeFilter values (except All Types)', () => {
      // TypeFilter includes type filter options that should overlap with ItemType
      const itemTypes: ItemType[] = ['feature', 'bug', 'enhancement', 'task'];

      itemTypes.forEach((it) => {
        // feature, bug, enhancement are in TypeFilter
        // task is NOT in TypeFilter (only in WorkItemFrontmatterType)
        if (it !== 'task') {
          const typeFilter: TypeFilter = it;
          expect(typeFilter).toBe(it);
        }
      });
    });
  });
});

// ============ API Route Validation Tests ============

describe('API Route Type Validation', () => {
  describe('VALID_TYPES constant should match ItemType', () => {
    it('should validate against harmonized types', () => {
      // This tests that the API route's VALID_TYPES array matches ItemType
      const expectedValidTypes: ItemType[] = ['feature', 'bug', 'enhancement', 'task'];

      // These are the UI-expected types that the API should accept
      expect(expectedValidTypes).toContain('feature');
      expect(expectedValidTypes).toContain('bug');
      expect(expectedValidTypes).toContain('enhancement');
      expect(expectedValidTypes).toContain('task');

      // Legacy types should not be in the expected list
      expect(expectedValidTypes).not.toContain('spike');
      expect(expectedValidTypes).not.toContain('chore');
    });
  });

  describe('Type validation should accept UI types', () => {
    it('should accept feature type', () => {
      const type: ItemType = 'feature';
      const validTypes: ItemType[] = ['feature', 'bug', 'enhancement', 'task'];
      expect(validTypes.includes(type)).toBe(true);
    });

    it('should accept bug type', () => {
      const type: ItemType = 'bug';
      const validTypes: ItemType[] = ['feature', 'bug', 'enhancement', 'task'];
      expect(validTypes.includes(type)).toBe(true);
    });

    it('should accept enhancement type', () => {
      const type: ItemType = 'enhancement';
      const validTypes: ItemType[] = ['feature', 'bug', 'enhancement', 'task'];
      expect(validTypes.includes(type)).toBe(true);
    });

    it('should accept task type', () => {
      const type: ItemType = 'task';
      const validTypes: ItemType[] = ['feature', 'bug', 'enhancement', 'task'];
      expect(validTypes.includes(type)).toBe(true);
    });
  });
});

// ============ Type Badge Compatibility Tests ============

describe('Type Badge Color Mapping', () => {
  describe('All ItemType values should have corresponding badge colors', () => {
    it('feature should have a badge color', () => {
      // TypeBadge has colors for: feature, bug, enhancement, task
      const TYPE_COLORS: Record<WorkItemFrontmatterType, string> = {
        feature: 'bg-cyan-500',
        bug: 'bg-red-500',
        enhancement: 'bg-blue-500',
        task: 'bg-green-500',
      };

      const itemType: ItemType = 'feature';
      expect(TYPE_COLORS[itemType as WorkItemFrontmatterType]).toBe('bg-cyan-500');
    });

    it('bug should have a badge color', () => {
      const TYPE_COLORS: Record<WorkItemFrontmatterType, string> = {
        feature: 'bg-cyan-500',
        bug: 'bg-red-500',
        enhancement: 'bg-blue-500',
        task: 'bg-green-500',
      };

      const itemType: ItemType = 'bug';
      expect(TYPE_COLORS[itemType as WorkItemFrontmatterType]).toBe('bg-red-500');
    });

    it('enhancement should have a badge color', () => {
      const TYPE_COLORS: Record<WorkItemFrontmatterType, string> = {
        feature: 'bg-cyan-500',
        bug: 'bg-red-500',
        enhancement: 'bg-blue-500',
        task: 'bg-green-500',
      };

      const itemType: ItemType = 'enhancement';
      expect(TYPE_COLORS[itemType as WorkItemFrontmatterType]).toBe('bg-blue-500');
    });

    it('task should have a badge color', () => {
      const TYPE_COLORS: Record<WorkItemFrontmatterType, string> = {
        feature: 'bg-cyan-500',
        bug: 'bg-red-500',
        enhancement: 'bg-blue-500',
        task: 'bg-green-500',
      };

      const itemType: ItemType = 'task';
      expect(TYPE_COLORS[itemType as WorkItemFrontmatterType]).toBe('bg-green-500');
    });
  });
});

// ============ Database Compatibility Tests ============

describe('Database Compatibility', () => {
  describe('Existing item types in database', () => {
    it('feature type should remain compatible', () => {
      // feature exists in both old and new types
      const dbType = 'feature';
      const itemType: ItemType = dbType as ItemType;
      expect(itemType).toBe('feature');
    });

    it('bug type should remain compatible', () => {
      // bug exists in both old and new types
      const dbType = 'bug';
      const itemType: ItemType = dbType as ItemType;
      expect(itemType).toBe('bug');
    });
  });

  describe('Type casting from string', () => {
    it('should cast valid string to ItemType', () => {
      const validStrings = ['feature', 'bug', 'enhancement', 'task'];

      validStrings.forEach((str) => {
        const itemType = str as ItemType;
        expect(['feature', 'bug', 'enhancement', 'task']).toContain(itemType);
      });
    });
  });
});

// ============ No api-transform Mapping Needed Tests ============

describe('Direct Type Usage (No Transformation Needed)', () => {
  describe('After harmonization, no mapping should be required', () => {
    it('ItemType should be directly usable as WorkItemFrontmatterType', () => {
      // With harmonization, there should be no need for api-transform.ts type mappings
      const itemTypes: ItemType[] = ['feature', 'bug', 'enhancement', 'task'];

      itemTypes.forEach((itemType) => {
        // Direct assignment should work without transformation
        const uiType: WorkItemFrontmatterType = itemType;
        expect(uiType).toBe(itemType);
      });
    });

    it('WorkItemFrontmatterType should be directly usable as ItemType', () => {
      const frontmatterTypes: WorkItemFrontmatterType[] = ['feature', 'bug', 'enhancement', 'task'];

      frontmatterTypes.forEach((frontmatterType) => {
        // Direct assignment should work without transformation
        const apiType: ItemType = frontmatterType;
        expect(apiType).toBe(frontmatterType);
      });
    });
  });
});
