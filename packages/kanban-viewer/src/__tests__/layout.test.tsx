import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Layout Font Configuration Tests
 *
 * These tests verify that the layout.tsx file properly imports and configures
 * Inter and JetBrains Mono fonts from Google Fonts.
 *
 * Requirements from PRD:
 * - Inter font family for body text (weights: 400, 500, 600, 700)
 * - JetBrains Mono font family for monospace elements (weights: 400, 500)
 * - CSS variables configured for both fonts
 * - Fonts applied via next/font/google for optimal performance
 *
 * Current state: layout.tsx uses Geist and Geist_Mono fonts
 * These tests will FAIL until B.A. implements the font changes
 */

describe('Layout Font Configuration', () => {
  const layoutPath = join(__dirname, '../app/layout.tsx');
  let layoutContent: string;

  // Read layout.tsx once for all tests
  try {
    layoutContent = readFileSync(layoutPath, 'utf-8');
  } catch (error) {
    layoutContent = '';
    console.error('Could not read layout.tsx:', error);
  }

  describe('Google Fonts imports', () => {
    /**
     * Verify that Inter and JetBrains Mono are imported from next/font/google
     * instead of Geist and Geist_Mono
     */

    it('should import Inter from next/font/google', () => {
      // Check for Inter import
      const hasInterImport = /import\s+{[^}]*Inter[^}]*}\s+from\s+['"]next\/font\/google['"]/.test(
        layoutContent
      );

      expect(
        hasInterImport,
        'Expected to find Inter import from next/font/google in layout.tsx'
      ).toBe(true);
    });

    it('should import JetBrains_Mono from next/font/google', () => {
      // Check for JetBrains_Mono import (note the underscore)
      const hasJetBrainsMonoImport =
        /import\s+{[^}]*JetBrains_Mono[^}]*}\s+from\s+['"]next\/font\/google['"]/.test(
          layoutContent
        );

      expect(
        hasJetBrainsMonoImport,
        'Expected to find JetBrains_Mono import from next/font/google in layout.tsx'
      ).toBe(true);
    });

    it('should not import Geist fonts anymore', () => {
      // These old imports should be removed
      const hasGeistImport = /import\s+{[^}]*Geist[^}]*}\s+from\s+['"]next\/font\/google['"]/.test(
        layoutContent
      );

      expect(
        hasGeistImport,
        'layout.tsx should not import Geist fonts anymore (should use Inter and JetBrains Mono instead)'
      ).toBe(false);
    });
  });

  describe('Inter font configuration', () => {
    /**
     * Verify Inter font is configured with correct weights and CSS variable
     */

    it('should configure Inter with required font weights', () => {
      // Look for Inter configuration with weight array
      const interConfigMatch = layoutContent.match(
        /const\s+\w+\s*=\s*Inter\s*\(\s*{[\s\S]*?}\s*\)/
      );

      expect(
        interConfigMatch,
        'Expected to find Inter font configuration in layout.tsx'
      ).toBeTruthy();

      if (interConfigMatch) {
        const config = interConfigMatch[0];

        // Check for weight configuration
        const hasWeightConfig = /weight:\s*\[/.test(config);

        expect(
          hasWeightConfig,
          'Inter configuration should include weight array'
        ).toBe(true);

        // Verify all required weights are present
        const hasWeight400 = config.includes("'400'") || config.includes('"400"');
        const hasWeight500 = config.includes("'500'") || config.includes('"500"');
        const hasWeight600 = config.includes("'600'") || config.includes('"600"');
        const hasWeight700 = config.includes("'700'") || config.includes('"700"');

        expect(hasWeight400, 'Inter should include weight 400').toBe(true);
        expect(hasWeight500, 'Inter should include weight 500').toBe(true);
        expect(hasWeight600, 'Inter should include weight 600').toBe(true);
        expect(hasWeight700, 'Inter should include weight 700').toBe(true);
      }
    });

    it('should configure Inter with subsets including latin', () => {
      const interConfigMatch = layoutContent.match(
        /const\s+\w+\s*=\s*Inter\s*\(\s*{[\s\S]*?}\s*\)/
      );

      if (interConfigMatch) {
        const config = interConfigMatch[0];
        const hasLatinSubset =
          config.includes('subsets: ["latin"]') ||
          config.includes("subsets: ['latin']");

        expect(
          hasLatinSubset,
          'Inter configuration should include latin subset'
        ).toBe(true);
      }
    });

    it('should configure Inter with --font-inter CSS variable', () => {
      const interConfigMatch = layoutContent.match(
        /const\s+\w+\s*=\s*Inter\s*\(\s*{[\s\S]*?}\s*\)/
      );

      expect(interConfigMatch).toBeTruthy();

      if (interConfigMatch) {
        const config = interConfigMatch[0];
        const hasInterVariable =
          config.includes('variable: "--font-inter"') ||
          config.includes("variable: '--font-inter'");

        expect(
          hasInterVariable,
          'Inter configuration should set CSS variable --font-inter'
        ).toBe(true);
      }
    });
  });

  describe('JetBrains Mono font configuration', () => {
    /**
     * Verify JetBrains Mono is configured with correct weights and CSS variable
     */

    it('should configure JetBrains_Mono with required font weights', () => {
      // Look for JetBrains_Mono configuration
      const jetBrainsConfigMatch = layoutContent.match(
        /const\s+\w+\s*=\s*JetBrains_Mono\s*\(\s*{[\s\S]*?}\s*\)/
      );

      expect(
        jetBrainsConfigMatch,
        'Expected to find JetBrains_Mono font configuration in layout.tsx'
      ).toBeTruthy();

      if (jetBrainsConfigMatch) {
        const config = jetBrainsConfigMatch[0];

        // Check for weight configuration
        const hasWeightConfig = /weight:\s*\[/.test(config);

        expect(
          hasWeightConfig,
          'JetBrains_Mono configuration should include weight array'
        ).toBe(true);

        // Verify required weights
        const hasWeight400 = config.includes("'400'") || config.includes('"400"');
        const hasWeight500 = config.includes("'500'") || config.includes('"500"');

        expect(hasWeight400, 'JetBrains_Mono should include weight 400').toBe(true);
        expect(hasWeight500, 'JetBrains_Mono should include weight 500').toBe(true);
      }
    });

    it('should configure JetBrains_Mono with subsets including latin', () => {
      const jetBrainsConfigMatch = layoutContent.match(
        /const\s+\w+\s*=\s*JetBrains_Mono\s*\(\s*{[\s\S]*?}\s*\)/
      );

      if (jetBrainsConfigMatch) {
        const config = jetBrainsConfigMatch[0];
        const hasLatinSubset =
          config.includes('subsets: ["latin"]') ||
          config.includes("subsets: ['latin']");

        expect(
          hasLatinSubset,
          'JetBrains_Mono configuration should include latin subset'
        ).toBe(true);
      }
    });

    it('should configure JetBrains_Mono with --font-jetbrains-mono CSS variable', () => {
      const jetBrainsConfigMatch = layoutContent.match(
        /const\s+\w+\s*=\s*JetBrains_Mono\s*\(\s*{[\s\S]*?}\s*\)/
      );

      expect(jetBrainsConfigMatch).toBeTruthy();

      if (jetBrainsConfigMatch) {
        const config = jetBrainsConfigMatch[0];
        const hasJetBrainsVariable =
          config.includes('variable: "--font-jetbrains-mono"') ||
          config.includes("variable: '--font-jetbrains-mono'");

        expect(
          hasJetBrainsVariable,
          'JetBrains_Mono configuration should set CSS variable --font-jetbrains-mono'
        ).toBe(true);
      }
    });
  });

  describe('body element font application', () => {
    /**
     * Verify that the font CSS variables are applied to the body element
     */

    it('should apply Inter font variable to body className', () => {
      // Look for body element and its className
      const bodyMatch = layoutContent.match(/<body[\s\S]*?className=\{(.+?)\}\s*>/s);

      expect(bodyMatch, 'Expected to find body element with className').toBeTruthy();

      if (bodyMatch) {
        const classNameExpression = bodyMatch[1];

        // Check that the Inter variable is included in the className
        // Could be something like: ${inter.variable} or ${fontInter.variable}
        const hasInterVariable = /\$\{[^}]*inter[^}]*\.variable\}/.test(
          classNameExpression
        );

        expect(
          hasInterVariable,
          'body className should include Inter font variable (e.g., ${inter.variable})'
        ).toBe(true);
      }
    });

    it('should apply JetBrains Mono font variable to body className', () => {
      const bodyMatch = layoutContent.match(/<body[\s\S]*?className=\{(.+?)\}\s*>/s);

      expect(bodyMatch, 'Expected to find body element with className').toBeTruthy();

      if (bodyMatch) {
        const classNameExpression = bodyMatch[1];

        // Check that the JetBrains Mono variable is included
        const hasJetBrainsVariable = /\$\{[^}]*jetbrains[^}]*\.variable\}/.test(
          classNameExpression.toLowerCase()
        );

        expect(
          hasJetBrainsVariable,
          'body className should include JetBrains Mono font variable'
        ).toBe(true);
      }
    });

    it('should maintain antialiased class on body element', () => {
      // The body should still have antialiased for font smoothing
      expect(
        layoutContent,
        'body element should include antialiased class for font smoothing'
      ).toContain('antialiased');
    });

    it('should not reference Geist font variables anymore', () => {
      const bodyMatch = layoutContent.match(/<body[\s\S]*?className=\{(.+?)\}\s*>/s);

      if (bodyMatch) {
        const classNameExpression = bodyMatch[1];

        // Should not contain references to geist
        const hasGeistReference = /geist/i.test(classNameExpression);

        expect(
          hasGeistReference,
          'body className should not reference Geist fonts anymore'
        ).toBe(false);
      }
    });
  });

  describe('CSS variable naming conventions', () => {
    /**
     * Verify CSS variables follow consistent naming patterns
     */

    it('should use --font-inter for Inter font variable name', () => {
      // The variable name should be --font-inter to match pattern
      const hasInterVariable =
        layoutContent.includes('--font-inter') ||
        layoutContent.includes("'--font-inter'") ||
        layoutContent.includes('"--font-inter"');

      expect(
        hasInterVariable,
        'layout.tsx should define --font-inter CSS variable'
      ).toBe(true);
    });

    it('should use --font-jetbrains-mono for JetBrains Mono variable name', () => {
      const hasJetBrainsVariable =
        layoutContent.includes('--font-jetbrains-mono') ||
        layoutContent.includes("'--font-jetbrains-mono'") ||
        layoutContent.includes('"--font-jetbrains-mono"');

      expect(
        hasJetBrainsVariable,
        'layout.tsx should define --font-jetbrains-mono CSS variable'
      ).toBe(true);
    });

    it('should not define Geist font CSS variables anymore', () => {
      const hasGeistSansVariable = layoutContent.includes('--font-geist-sans');
      const hasGeistMonoVariable = layoutContent.includes('--font-geist-mono');

      expect(
        hasGeistSansVariable,
        'layout.tsx should not define --font-geist-sans anymore'
      ).toBe(false);
      expect(
        hasGeistMonoVariable,
        'layout.tsx should not define --font-geist-mono anymore'
      ).toBe(false);
    });
  });

  describe('font loading optimization', () => {
    /**
     * Verify that next/font/google is used for performance optimization
     */

    it('should use next/font/google instead of CSS imports', () => {
      // Should import from next/font/google, not have @import in CSS
      const usesNextFont = /from\s+['"]next\/font\/google['"]/.test(layoutContent);

      expect(
        usesNextFont,
        'Should use next/font/google for optimized font loading'
      ).toBe(true);
    });

    it('should not have Google Fonts CSS @import statements', () => {
      // Check if layout references any CSS imports (it shouldn't)
      const hasCssImport = /@import.*fonts\.googleapis\.com/.test(layoutContent);

      expect(
        hasCssImport,
        'Should not use CSS @import for Google Fonts (use next/font/google instead)'
      ).toBe(false);
    });
  });

  describe('layout structure preservation', () => {
    /**
     * Verify that other layout elements remain unchanged
     */

    it('should maintain html element with lang="en"', () => {
      const hasHtmlLang = /<html\s+lang="en"/.test(layoutContent);

      expect(hasHtmlLang, 'html element should have lang="en" attribute').toBe(true);
    });

    it('should maintain dark class on html element', () => {
      const hasDarkClass = /<html[^>]*className=["'][^"']*dark[^"']*["']/.test(
        layoutContent
      );

      expect(
        hasDarkClass,
        'html element should maintain className="dark" for dark mode'
      ).toBe(true);
    });

    it('should preserve metadata export', () => {
      const hasMetadata = /export\s+const\s+metadata:\s*Metadata/.test(layoutContent);

      expect(hasMetadata, 'Should preserve metadata export').toBe(true);
    });

    it('should preserve RootLayout component export', () => {
      const hasRootLayout = /export\s+default\s+function\s+RootLayout/.test(
        layoutContent
      );

      expect(hasRootLayout, 'Should preserve RootLayout function export').toBe(true);
    });
  });
});
