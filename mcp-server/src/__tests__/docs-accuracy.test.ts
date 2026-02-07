import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const projectRoot = join(import.meta.dirname, '../../..');

/**
 * WI-121: Verify CLAUDE.md documentation accuracy
 * WI-122: Verify Kanban UI PRD accuracy
 *
 * These are grep-based smoke tests that ensure documentation
 * matches the actual project structure and conventions.
 */

describe('WI-121: CLAUDE.md documentation accuracy', () => {
  const claudeMdPath = join(projectRoot, 'CLAUDE.md');
  let content: string;

  // Load the file once
  content = readFileSync(claudeMdPath, 'utf-8');

  it('file tree should reference .claude-plugin/plugin.json, not root plugin.json', () => {
    // The File Organization section has a tree listing.
    // It should show plugin.json under .claude-plugin/, not at the root.
    // The actual file lives at .claude-plugin/plugin.json (confirmed by git status + glob).

    // Extract the file tree block (between "## File Organization" and the next "##")
    const fileOrgMatch = content.match(/## File Organization[\s\S]*?```([\s\S]*?)```/);
    expect(fileOrgMatch).not.toBeNull();
    const fileTree = fileOrgMatch![1];

    // The tree should NOT show plugin.json as a direct child of ai-team/
    // (i.e., should not have a line like "├── plugin.json" at the top level)
    // It SHOULD reference .claude-plugin/plugin.json somewhere
    expect(fileTree).toContain('.claude-plugin/plugin.json');
  });

  it('hook section should list all 5 hook scripts in scripts/hooks/', () => {
    // There are 5 actual hook scripts:
    // 1. block-raw-echo-log.js
    // 2. block-raw-mv.js
    // 3. block-hannibal-writes.js
    // 4. enforce-completion-log.js
    // 5. enforce-final-review.js

    const expectedHooks = [
      'block-raw-echo-log.js',
      'block-raw-mv.js',
      'block-hannibal-writes.js',
      'enforce-completion-log.js',
      'enforce-final-review.js',
    ];

    for (const hook of expectedHooks) {
      expect(
        content.includes(hook),
        `CLAUDE.md should mention hook script "${hook}"`
      ).toBe(true);
    }
  });
});

describe('WI-122: Kanban UI PRD accuracy', () => {
  const prdPath = join(projectRoot, 'docs/kanban-ui-prd.md');
  let content: string;

  content = readFileSync(prdPath, 'utf-8');

  it('should mention all 8 agents', () => {
    // The current system has 8 agents:
    // Hannibal, Face, Sosa, Murdock, B.A., Lynch, Amy, Tawnia
    const agents = ['Hannibal', 'Face', 'Sosa', 'Murdock', 'B.A.', 'Lynch', 'Amy', 'Tawnia'];

    for (const agent of agents) {
      expect(
        content.includes(agent),
        `PRD should mention agent "${agent}"`
      ).toBe(true);
    }
  });

  it('should include the probing stage and reference API architecture', () => {
    // The PRD must mention the "probing" stage (Amy's mandatory stage)
    expect(
      content.toLowerCase().includes('probing'),
      'PRD should mention the "probing" stage'
    ).toBe(true);

    // The PRD should reference API-based architecture, not filesystem-only.
    // Specifically, it should mention the API or REST endpoint pattern,
    // rather than only describing board.json / filesystem reads.
    const hasApiReference =
      content.includes('API') ||
      content.includes('api') ||
      content.includes('/api/');

    // It should NOT describe the architecture as purely filesystem-based
    // without also referencing the API layer
    expect(
      hasApiReference,
      'PRD should reference API-based architecture'
    ).toBe(true);

    // Specifically, it should NOT say "fully file-based" for the database
    // since the system now uses the A(i)-Team API database
    expect(
      content.includes('fully file-based'),
      'PRD should not claim database is "fully file-based" since data comes from API'
    ).toBe(false);
  });
});
