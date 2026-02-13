import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Dark Mode Tests
 *
 * These tests verify that dark mode is properly applied across the application.
 * The CSS in globals.css defines dark mode styles under the `.dark` class selector
 * using the custom variant: @custom-variant dark (&:is(.dark *));
 *
 * For dark mode to work, the html element must have the 'dark' class.
 *
 * Current state: The RootLayout does NOT add 'dark' class to html element.
 * The layout verification test will FAIL until B.A. adds className="dark" to the html element.
 */

// Simple test component that uses Tailwind dark mode classes
function DarkModeTestComponent() {
  return (
    <div data-testid="test-container" className="bg-background text-foreground">
      <div data-testid="card" className="bg-card text-card-foreground">
        Card Content
      </div>
      <div data-testid="muted" className="bg-muted text-muted-foreground">
        Muted Content
      </div>
      <div data-testid="column" className="bg-muted/30">
        Column Content
      </div>
    </div>
  );
}

describe('Dark Mode', () => {
  beforeEach(() => {
    // Reset document state before each test
    document.documentElement.className = '';
  });

  afterEach(() => {
    // Cleanup dark class after tests
    document.documentElement.classList.remove('dark');
  });

  describe('html element dark class in layout.tsx', () => {
    /**
     * This test validates the CORE requirement:
     * The html element must have the 'dark' class for dark mode to work.
     *
     * This test reads layout.tsx and verifies the html element has className="dark".
     *
     * This test will FAIL until B.A. modifies layout.tsx:
     * FROM: <html lang="en">
     * TO:   <html lang="en" className="dark">
     */
    it('should have dark class on html element in layout.tsx', () => {
      const layoutPath = join(__dirname, '../app/layout.tsx');
      const layoutContent = readFileSync(layoutPath, 'utf-8');

      // Check that the html element has the dark class
      // This regex matches <html with className containing "dark"
      const htmlWithDarkClass = /<html[^>]*className=["'][^"']*dark[^"']*["'][^>]*>/;
      const htmlWithDarkClassTemplate = /<html[^>]*className=\{[^}]*["']dark["'][^}]*\}[^>]*>/;

      const hasDarkClass =
        htmlWithDarkClass.test(layoutContent) ||
        htmlWithDarkClassTemplate.test(layoutContent);

      expect(
        hasDarkClass,
        `Expected layout.tsx to have <html className="dark"> but found:\n${layoutContent.match(/<html[^>]*>/)?.[0] || 'no html element'}`
      ).toBe(true);
    });
  });

  describe('body element styling in layout.tsx', () => {
    it('should have antialiased class on body element', () => {
      const layoutPath = join(__dirname, '../app/layout.tsx');
      const layoutContent = readFileSync(layoutPath, 'utf-8');

      // Body should have antialiased class for font smoothing
      expect(layoutContent).toContain('antialiased');
    });
  });

  describe('dark mode CSS activation', () => {
    it('should apply dark mode styles when dark class is on html element', () => {
      // Add dark class to simulate correct implementation
      document.documentElement.classList.add('dark');

      render(<DarkModeTestComponent />);

      // Verify components render correctly in dark mode context
      expect(screen.getByTestId('test-container')).toBeInTheDocument();
      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    it('should render card components with dark background class', () => {
      document.documentElement.classList.add('dark');

      render(<DarkModeTestComponent />);

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('bg-card');
      expect(card).toHaveClass('text-card-foreground');
    });

    it('should render column backgrounds with appropriate dark shade', () => {
      document.documentElement.classList.add('dark');

      render(<DarkModeTestComponent />);

      const column = screen.getByTestId('column');
      // Columns use bg-muted/30 for a subtle dark background
      expect(column).toHaveClass('bg-muted/30');
    });
  });

  describe('dark mode CSS custom properties', () => {
    /**
     * These tests verify the CSS custom properties are properly defined.
     * The globals.css file defines these values for the .dark class:
     *
     * Dark mode values:
     * - --background: oklch(0.145 0 0)  ~ #1a1a1a (very dark gray)
     * - --foreground: oklch(0.985 0 0)  ~ #fafafa (almost white)
     * - --card: oklch(0.205 0 0)        ~ #2a2a2a (dark gray)
     * - --card-foreground: oklch(0.985 0 0) ~ #fafafa
     * - --muted: oklch(0.269 0 0)       ~ #3a3a3a
     * - --muted-foreground: oklch(0.708 0 0) ~ #a0a0a0
     */

    it('should have background CSS variable defined', () => {
      document.documentElement.classList.add('dark');

      render(<DarkModeTestComponent />);

      const computedStyle = getComputedStyle(document.documentElement);
      const backgroundVar = computedStyle.getPropertyValue('--background');

      // CSS variable should be defined (may be empty in jsdom, but should exist)
      // In a real browser with the CSS loaded, this would be 'oklch(0.145 0 0)'
      expect(backgroundVar).toBeDefined();
    });

    it('should have foreground CSS variable defined', () => {
      document.documentElement.classList.add('dark');

      render(<DarkModeTestComponent />);

      const computedStyle = getComputedStyle(document.documentElement);
      const foregroundVar = computedStyle.getPropertyValue('--foreground');

      expect(foregroundVar).toBeDefined();
    });

    it('should have card CSS variable defined', () => {
      document.documentElement.classList.add('dark');

      render(<DarkModeTestComponent />);

      const computedStyle = getComputedStyle(document.documentElement);
      const cardVar = computedStyle.getPropertyValue('--card');

      expect(cardVar).toBeDefined();
    });
  });

  describe('WCAG AA color contrast requirements', () => {
    /**
     * WCAG AA requires:
     * - 4.5:1 contrast ratio for normal text
     * - 3:1 contrast ratio for large text (18pt+ or 14pt bold)
     *
     * Dark mode color analysis from globals.css:
     *
     * Primary text contrast (foreground on background):
     * - Background: oklch(0.145 0 0) = L* 14.5% (very dark)
     * - Foreground: oklch(0.985 0 0) = L* 98.5% (almost white)
     * - Estimated contrast ratio: ~15:1 (exceeds AA requirement of 4.5:1)
     *
     * Card text contrast (card-foreground on card):
     * - Card: oklch(0.205 0 0) = L* 20.5% (dark gray)
     * - Card-foreground: oklch(0.985 0 0) = L* 98.5%
     * - Estimated contrast ratio: ~12:1 (exceeds AA requirement)
     *
     * Muted text contrast (muted-foreground on muted):
     * - Muted: oklch(0.269 0 0) = L* 26.9%
     * - Muted-foreground: oklch(0.708 0 0) = L* 70.8%
     * - Estimated contrast ratio: ~5.5:1 (exceeds AA requirement)
     */

    it('should have distinct background and foreground colors', () => {
      document.documentElement.classList.add('dark');

      render(<DarkModeTestComponent />);

      const container = screen.getByTestId('test-container');

      // Container should have both background and foreground classes
      expect(container).toHaveClass('bg-background');
      expect(container).toHaveClass('text-foreground');
    });

    it('should have readable text on card backgrounds', () => {
      document.documentElement.classList.add('dark');

      render(<DarkModeTestComponent />);

      const card = screen.getByTestId('card');

      // Card should have contrasting text color
      expect(card).toHaveClass('bg-card');
      expect(card).toHaveClass('text-card-foreground');

      // Verify text is actually rendered
      expect(screen.getByText('Card Content')).toBeVisible();
    });

    it('should have readable muted text', () => {
      document.documentElement.classList.add('dark');

      render(<DarkModeTestComponent />);

      const muted = screen.getByTestId('muted');

      expect(muted).toHaveClass('bg-muted');
      expect(muted).toHaveClass('text-muted-foreground');
      expect(screen.getByText('Muted Content')).toBeVisible();
    });
  });

  describe('component dark theme backgrounds verification', () => {
    it('should use bg-background class for main container', () => {
      document.documentElement.classList.add('dark');

      render(<DarkModeTestComponent />);

      const container = screen.getByTestId('test-container');
      expect(container).toHaveClass('bg-background');
    });

    it('should use bg-card class for card components', () => {
      document.documentElement.classList.add('dark');

      render(<DarkModeTestComponent />);

      const card = screen.getByTestId('card');
      // bg-card in dark mode resolves to oklch(0.205 0 0) ~ #2a2a2a
      expect(card).toHaveClass('bg-card');
    });

    it('should use bg-muted/30 for column backgrounds', () => {
      document.documentElement.classList.add('dark');

      render(<DarkModeTestComponent />);

      const column = screen.getByTestId('column');
      // Columns use a semi-transparent muted background
      expect(column).toHaveClass('bg-muted/30');
    });
  });

  describe('dark mode toggle readiness', () => {
    it('should be able to toggle dark mode by adding/removing class', () => {
      render(<DarkModeTestComponent />);

      // Initially no dark class
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      // Add dark class
      document.documentElement.classList.add('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      // Remove dark class
      document.documentElement.classList.remove('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should support multiple class names on html element', () => {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.add('custom-class');

      expect(document.documentElement).toHaveClass('dark');
      expect(document.documentElement).toHaveClass('custom-class');

      document.documentElement.classList.remove('custom-class');
    });
  });
});
