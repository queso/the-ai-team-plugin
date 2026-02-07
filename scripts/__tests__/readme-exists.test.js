import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const PROJECT_ROOT = join(__dirname, '..', '..');
const README_PATH = join(PROJECT_ROOT, 'README.md');

describe('README.md', () => {
  it('should exist at project root', () => {
    expect(existsSync(README_PATH)).toBe(true);
  });

  it('should contain required sections', () => {
    const content = readFileSync(README_PATH, 'utf8');

    // Must have installation instructions
    expect(content).toMatch(/install/i);
    // Must have quick start or getting started
    expect(content).toMatch(/quick start|getting started/i);
    // Must list prerequisites
    expect(content).toMatch(/prerequisit|require/i);
    // Must mention Node.js as a prerequisite
    expect(content).toMatch(/node/i);
    // Must mention Claude Code
    expect(content).toMatch(/claude code/i);
  });

  it('should reference key plugin commands', () => {
    const content = readFileSync(README_PATH, 'utf8');

    expect(content).toMatch(/\/ateam setup/);
    expect(content).toMatch(/\/ateam plan/);
    expect(content).toMatch(/\/ateam run/);
  });
});
