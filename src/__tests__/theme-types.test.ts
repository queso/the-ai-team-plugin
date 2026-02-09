import { describe, it, expect } from 'vitest';
import type { ThemeColors, WorkItemTypeBadgeColor, WorkItemType } from '../types';
import { DARK_THEME_COLORS, WORK_ITEM_TYPE_BADGE_COLORS } from '../types';

describe('Theme Types', () => {
  describe('ThemeColors interface', () => {
    it('should have background colors with primary, cards, and columns', () => {
      const theme: ThemeColors = DARK_THEME_COLORS;

      expect(theme.background).toBeDefined();
      expect(theme.background.primary).toBeDefined();
      expect(theme.background.cards).toBeDefined();
      expect(theme.background.columns).toBeDefined();
    });

    it('should have text colors with primary and secondary', () => {
      const theme: ThemeColors = DARK_THEME_COLORS;

      expect(theme.text).toBeDefined();
      expect(theme.text.primary).toBeDefined();
      expect(theme.text.secondary).toBeDefined();
    });

    it('should have accent colors with success, warning, active, and idle', () => {
      const theme: ThemeColors = DARK_THEME_COLORS;

      expect(theme.accent).toBeDefined();
      expect(theme.accent.success).toBeDefined();
      expect(theme.accent.warning).toBeDefined();
      expect(theme.accent.active).toBeDefined();
      expect(theme.accent.idle).toBeDefined();
    });
  });

  describe('DARK_THEME_COLORS', () => {
    describe('background colors match PRD specification', () => {
      it('should have primary background as #1a1a1a', () => {
        expect(DARK_THEME_COLORS.background.primary).toBe('#1a1a1a');
      });

      it('should have cards background as #2a2a2a', () => {
        expect(DARK_THEME_COLORS.background.cards).toBe('#2a2a2a');
      });

      it('should have columns background as #242424', () => {
        expect(DARK_THEME_COLORS.background.columns).toBe('#242424');
      });
    });

    describe('text colors match PRD specification', () => {
      it('should have primary text as #ffffff', () => {
        expect(DARK_THEME_COLORS.text.primary).toBe('#ffffff');
      });

      it('should have secondary text as #a0a0a0', () => {
        expect(DARK_THEME_COLORS.text.secondary).toBe('#a0a0a0');
      });
    });

    describe('accent colors match PRD specification', () => {
      it('should have success accent as #22c55e (green)', () => {
        expect(DARK_THEME_COLORS.accent.success).toBe('#22c55e');
      });

      it('should have warning accent as #f59e0b (amber)', () => {
        expect(DARK_THEME_COLORS.accent.warning).toBe('#f59e0b');
      });

      it('should have active accent as #ef4444 (red)', () => {
        expect(DARK_THEME_COLORS.accent.active).toBe('#ef4444');
      });

      it('should have idle accent as #6b7280 (gray)', () => {
        expect(DARK_THEME_COLORS.accent.idle).toBe('#6b7280');
      });
    });
  });

  describe('WorkItemTypeBadgeColor', () => {
    it('should have colors for all WorkItemType values', () => {
      const types: WorkItemType[] = ['implementation', 'interface', 'integration', 'test'];

      types.forEach((type) => {
        expect(WORK_ITEM_TYPE_BADGE_COLORS[type]).toBeDefined();
        expect(typeof WORK_ITEM_TYPE_BADGE_COLORS[type]).toBe('string');
      });
    });

    it('should have implementation badge as #22c55e (green)', () => {
      expect(WORK_ITEM_TYPE_BADGE_COLORS.implementation).toBe('#22c55e');
    });

    it('should have integration badge as #3b82f6 (blue)', () => {
      expect(WORK_ITEM_TYPE_BADGE_COLORS.integration).toBe('#3b82f6');
    });

    it('should have interface badge as #8b5cf6 (purple)', () => {
      expect(WORK_ITEM_TYPE_BADGE_COLORS.interface).toBe('#8b5cf6');
    });

    it('should have test badge as #eab308 (yellow)', () => {
      expect(WORK_ITEM_TYPE_BADGE_COLORS.test).toBe('#eab308');
    });
  });

  describe('Type safety', () => {
    it('should enforce ThemeColors structure at compile time', () => {
      // @ts-expect-error - missing required background property
      const invalidTheme: ThemeColors = {
        text: { primary: '#fff', secondary: '#aaa' },
        accent: { success: '#22c55e', warning: '#f59e0b', active: '#ef4444', idle: '#6b7280' },
      };
      expect(invalidTheme).toBeDefined();
    });

    it('should enforce WorkItemTypeBadgeColor keys at compile time', () => {
      // @ts-expect-error - missing required 'test' key
      const invalidBadgeColors: WorkItemTypeBadgeColor = {
        implementation: '#22c55e',
        integration: '#3b82f6',
        interface: '#8b5cf6',
      };
      expect(invalidBadgeColors).toBeDefined();
    });

    it('should allow valid ThemeColors object', () => {
      const validTheme: ThemeColors = {
        background: { primary: '#000', cards: '#111', columns: '#222' },
        text: { primary: '#fff', secondary: '#aaa' },
        accent: { success: '#0f0', warning: '#ff0', active: '#f00', idle: '#888' },
      };

      expect(validTheme.background.primary).toBe('#000');
    });
  });

  describe('Color format validation', () => {
    it('should have all colors in valid hex format', () => {
      const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

      // Background colors
      expect(DARK_THEME_COLORS.background.primary).toMatch(hexColorRegex);
      expect(DARK_THEME_COLORS.background.cards).toMatch(hexColorRegex);
      expect(DARK_THEME_COLORS.background.columns).toMatch(hexColorRegex);

      // Text colors
      expect(DARK_THEME_COLORS.text.primary).toMatch(hexColorRegex);
      expect(DARK_THEME_COLORS.text.secondary).toMatch(hexColorRegex);

      // Accent colors
      expect(DARK_THEME_COLORS.accent.success).toMatch(hexColorRegex);
      expect(DARK_THEME_COLORS.accent.warning).toMatch(hexColorRegex);
      expect(DARK_THEME_COLORS.accent.active).toMatch(hexColorRegex);
      expect(DARK_THEME_COLORS.accent.idle).toMatch(hexColorRegex);
    });

    it('should have all badge colors in valid hex format', () => {
      const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

      expect(WORK_ITEM_TYPE_BADGE_COLORS.implementation).toMatch(hexColorRegex);
      expect(WORK_ITEM_TYPE_BADGE_COLORS.integration).toMatch(hexColorRegex);
      expect(WORK_ITEM_TYPE_BADGE_COLORS.interface).toMatch(hexColorRegex);
      expect(WORK_ITEM_TYPE_BADGE_COLORS.test).toMatch(hexColorRegex);
    });
  });
});
