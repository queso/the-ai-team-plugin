import { describe, it, expect, beforeAll } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Tests for card animation CSS styles.
 * Verifies the CSS file contains all required animation classes and keyframes.
 */
describe('Card Animation Styles', () => {
  let cssContent: string;

  beforeAll(async () => {
    const cssPath = join(process.cwd(), 'src/styles/animations.css');
    cssContent = await readFile(cssPath, 'utf-8');
  });

  describe('exit animation', () => {
    it('should define card-exiting class', () => {
      expect(cssContent).toContain('.card-exiting');
    });

    it('should define card-exit keyframes', () => {
      expect(cssContent).toContain('@keyframes card-exit');
    });

    it('should include lift effect (translateY) in exit animation', () => {
      expect(cssContent).toMatch(/translateY\s*\(\s*-4px\s*\)/);
    });

    it('should include fade out (opacity: 0) in exit animation', () => {
      expect(cssContent).toMatch(/opacity:\s*0/);
    });

    it('should support left direction variant', () => {
      expect(cssContent).toContain('.card-exiting-left');
    });

    it('should support right direction variant', () => {
      expect(cssContent).toContain('.card-exiting-right');
    });
  });

  describe('enter animation', () => {
    it('should define card-entering class', () => {
      expect(cssContent).toContain('.card-entering');
    });

    it('should define card-enter keyframes', () => {
      expect(cssContent).toContain('@keyframes card-enter');
    });

    it('should support left direction variant', () => {
      expect(cssContent).toContain('.card-entering-left');
    });

    it('should support right direction variant', () => {
      expect(cssContent).toContain('.card-entering-right');
    });
  });

  describe('layout shift animation', () => {
    it('should define card-layout-shift class', () => {
      expect(cssContent).toContain('.card-layout-shift');
    });

    it('should use transition for smooth repositioning', () => {
      expect(cssContent).toMatch(/transition:\s*transform/);
    });
  });

  describe('animation timing', () => {
    it('should define animation duration CSS variable', () => {
      expect(cssContent).toContain('--card-animation-duration');
    });

    it('should define layout shift duration CSS variable', () => {
      expect(cssContent).toContain('--layout-shift-duration');
    });

    it('should use 300ms for card animations', () => {
      expect(cssContent).toMatch(/--card-animation-duration:\s*300ms/);
    });

    it('should use 200ms for layout shift', () => {
      expect(cssContent).toMatch(/--layout-shift-duration:\s*200ms/);
    });
  });

  describe('GPU acceleration', () => {
    it('should use transform for animations', () => {
      expect(cssContent).toContain('transform:');
    });

    it('should use scale transform', () => {
      expect(cssContent).toContain('scale(');
    });

    it('should use translateX transform', () => {
      expect(cssContent).toContain('translateX(');
    });
  });

  describe('accessibility', () => {
    it('should include prefers-reduced-motion media query', () => {
      expect(cssContent).toContain('@media (prefers-reduced-motion: reduce)');
    });

    it('should disable animations for reduced motion', () => {
      expect(cssContent).toMatch(/prefers-reduced-motion[\s\S]*animation:\s*none/);
    });
  });

  describe('idle state', () => {
    it('should define card-idle class', () => {
      expect(cssContent).toContain('.card-idle');
    });
  });
});
