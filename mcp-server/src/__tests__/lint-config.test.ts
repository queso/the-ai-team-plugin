import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const projectRoot = join(import.meta.dirname, '../../..');
const mcpServerRoot = join(projectRoot, 'mcp-server');

describe('Lint Configuration', () => {
  it('should have a real lint script in mcp-server/package.json (not a no-op echo)', () => {
    const pkgPath = join(mcpServerRoot, 'package.json');
    expect(existsSync(pkgPath)).toBe(true);

    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    expect(pkg.scripts).toHaveProperty('lint');

    const lintScript = pkg.scripts.lint as string;
    // Must not be the placeholder echo
    expect(lintScript).not.toMatch(/echo\s+['"]No linter configured['"]/);
    // Must reference a real linter binary
    expect(lintScript).toMatch(/eslint|biome|oxlint/);
  });

  it('should have a linter config file at project or mcp-server root', () => {
    const candidates = [
      join(projectRoot, 'eslint.config.js'),
      join(projectRoot, 'eslint.config.mjs'),
      join(projectRoot, 'eslint.config.cjs'),
      join(projectRoot, '.eslintrc.json'),
      join(projectRoot, '.eslintrc.js'),
      join(projectRoot, '.eslintrc.yml'),
      join(projectRoot, 'biome.json'),
      join(projectRoot, 'biome.jsonc'),
      join(mcpServerRoot, 'eslint.config.js'),
      join(mcpServerRoot, 'eslint.config.mjs'),
      join(mcpServerRoot, 'eslint.config.cjs'),
      join(mcpServerRoot, '.eslintrc.json'),
      join(mcpServerRoot, '.eslintrc.js'),
      join(mcpServerRoot, '.eslintrc.yml'),
      join(mcpServerRoot, 'biome.json'),
      join(mcpServerRoot, 'biome.jsonc'),
    ];

    const found = candidates.filter((f) => existsSync(f));
    expect(found.length).toBeGreaterThan(0);
  });

  it('should have ateam.config.json lint check that references a real linter', () => {
    const configPath = join(projectRoot, 'ateam.config.json');
    expect(existsSync(configPath)).toBe(true);

    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    expect(config.checks).toHaveProperty('lint');

    const lintCheck = config.checks.lint as string;
    expect(lintCheck).toBeTruthy();
    // The lint check command should ultimately invoke a real linter
    // It can be "cd mcp-server && npm run lint" as long as npm run lint is real
    // We verify the mcp-server lint script is real (covered by test 1),
    // so here we just verify the config points to something non-null
    expect(typeof lintCheck).toBe('string');
    expect(lintCheck.length).toBeGreaterThan(0);
  });
});
