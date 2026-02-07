import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..', '..');

describe('Legacy dead code removal', () => {
  it('lib/ directory files should not exist', () => {
    const legacyLibFiles = ['board.js', 'lock.js', 'validate.js'];
    const existing = legacyLibFiles.filter(f =>
      existsSync(join(ROOT, 'lib', f))
    );
    expect(existing).toEqual([]);
  });

  it('legacy scripts in scripts/ root should not exist', () => {
    const legacyScripts = [
      'board-read.js', 'board-move.js', 'board-claim.js', 'board-release.js',
      'item-create.js', 'item-update.js', 'item-render.js', 'item-reject.js',
      'item-complete.js', 'item-agent-start.js', 'item-agent-stop.js',
      'mission-init.js', 'mission-precheck.js', 'mission-postcheck.js',
      'mission-archive.js', 'deps-check.js', 'activity-log.js', 'log.js',
    ];
    const existing = legacyScripts.filter(f =>
      existsSync(join(ROOT, 'scripts', f))
    );
    expect(existing).toEqual([]);
  });

  it('scripts/hooks/ directory and its files should be preserved', () => {
    const hooksDir = join(ROOT, 'scripts', 'hooks');
    expect(existsSync(hooksDir)).toBe(true);

    const expectedHooks = [
      'block-raw-echo-log.js',
      'block-raw-mv.js',
      'block-hannibal-writes.js',
      'enforce-completion-log.js',
      'enforce-final-review.js',
    ];
    const existing = readdirSync(hooksDir).filter(f => f.endsWith('.js') && !f.includes('__tests__'));
    expect(existing.sort()).toEqual(expectedHooks.sort());
  });
});
