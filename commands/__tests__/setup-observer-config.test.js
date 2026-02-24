/**
 * Tests for /ateam setup command's observer hook configuration
 *
 * This test verifies that the setup.md command template includes
 * configuration for hook event reporting.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('/ateam setup - Observer Hook Configuration', () => {
  const setupPath = join(__dirname, '../setup.md');
  const setupContent = readFileSync(setupPath, 'utf-8');

  it('should contain a section for hook event reporting configuration', () => {
    // The setup command should have a dedicated step or section for hook event reporting
    expect(setupContent).toMatch(/hook event reporting|observer hook|telemetry hook/i);
  });

  it('should include API availability check before enabling hooks', () => {
    // The setup should verify API is reachable before configuring hooks
    expect(setupContent).toMatch(/check.*api|api.*availability|verify.*api/i);
  });

  it('should offer enable/disable option for hook event reporting', () => {
    // The setup should ask the user if they want to enable hook event reporting
    expect(setupContent).toMatch(/enable.*hook event|hook event.*enable|disable.*hook/i);
  });

  it('should reference the hooks configuration in settings', () => {
    // The setup should mention configuring hooks in settings file
    expect(setupContent).toMatch(/\.claude\/settings|hooks.*configuration|hook.*settings/i);
  });
});
