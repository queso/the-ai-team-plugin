/**
 * Tests for observer hook configuration in agent markdown files.
 *
 * Verifies that all agent files have observer hooks properly configured
 * alongside existing enforcement hooks.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const AGENTS_DIR = join(__dirname, '..');
const OBSERVER_SCRIPTS = {
  preToolUse: 'scripts/hooks/observe-pre-tool-use.js',
  postToolUse: 'scripts/hooks/observe-post-tool-use.js',
  stop: 'scripts/hooks/observe-stop.js',
};

interface HookConfig {
  matcher?: string;
  hooks: Array<{
    type: string;
    command: string;
  }>;
}

interface AgentFrontmatter {
  name: string;
  description: string;
  hooks?: {
    PreToolUse?: HookConfig[];
    PostToolUse?: HookConfig[];
    Stop?: HookConfig[];
  };
}

/**
 * Simple YAML parser for agent frontmatter
 * Handles the specific structure we need without external dependencies
 */
function parseAgentFrontmatter(filePath: string): AgentFrontmatter | null {
  const content = readFileSync(filePath, 'utf-8');

  // Extract frontmatter between --- delimiters
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return null;
  }

  const yaml = frontmatterMatch[1];
  const lines = yaml.split('\n');

  const result: AgentFrontmatter = {
    name: '',
    description: '',
    hooks: {
      PreToolUse: [],
      PostToolUse: [],
      Stop: [],
    },
  };

  let currentSection: 'PreToolUse' | 'PostToolUse' | 'Stop' | null = null;
  let currentHookConfig: HookConfig | null = null;
  let indent = 0;

  for (const line of lines) {
    // Skip empty lines
    if (line.trim() === '') continue;

    // Calculate indentation
    const match = line.match(/^(\s*)/);
    const lineIndent = match ? match[1].length : 0;

    // Top-level fields
    if (lineIndent === 0) {
      if (line.startsWith('name:')) {
        result.name = line.substring(5).trim();
      } else if (line.startsWith('description:')) {
        result.description = line.substring(12).trim();
      } else if (line.startsWith('hooks:')) {
        // Start hooks section
        indent = 2;
      }
    }
    // Hook sections (PreToolUse, PostToolUse, Stop)
    else if (lineIndent === 2) {
      // Push pending hook config before changing sections
      if (currentSection && currentHookConfig) {
        result.hooks![currentSection]!.push(currentHookConfig);
        currentHookConfig = null;
      }

      if (line.includes('PreToolUse:')) {
        currentSection = 'PreToolUse';
      } else if (line.includes('PostToolUse:')) {
        currentSection = 'PostToolUse';
      } else if (line.includes('Stop:')) {
        currentSection = 'Stop';
      }
    }
    // Hook config items (- matcher: ...)
    else if (lineIndent === 4 && line.trim().startsWith('- ')) {
      if (currentSection && currentHookConfig) {
        result.hooks![currentSection]!.push(currentHookConfig);
      }
      currentHookConfig = { hooks: [] };

      const matcherMatch = line.match(/matcher:\s*"(.+?)"/);
      if (matcherMatch) {
        currentHookConfig.matcher = matcherMatch[1];
      }
    }
    // Hook config details (hooks:, - type:, command:)
    else if (lineIndent >= 6 && currentHookConfig) {
      if (line.includes('- type:')) {
        const typeMatch = line.match(/type:\s*(\w+)/);
        const type = typeMatch ? typeMatch[1] : '';
        currentHookConfig.hooks.push({ type, command: '' });
      } else if (line.includes('command:')) {
        const commandMatch = line.match(/command:\s*"(.+?)"/);
        const command = commandMatch ? commandMatch[1] : '';
        if (currentHookConfig.hooks.length > 0) {
          currentHookConfig.hooks[currentHookConfig.hooks.length - 1].command = command;
        }
      }
    }
  }

  // Push last hook config
  if (currentSection && currentHookConfig) {
    result.hooks![currentSection]!.push(currentHookConfig);
  }

  return result;
}

/**
 * Get all agent markdown files
 */
function getAgentFiles(): string[] {
  return readdirSync(AGENTS_DIR)
    .filter(file => file.endsWith('.md') && !file.startsWith('AGENTS'))
    .map(file => join(AGENTS_DIR, file));
}

/**
 * Check if hooks array contains the observer script
 */
function hasObserverHook(hooks: HookConfig['hooks'], scriptPath: string): boolean {
  return hooks.some(hook =>
    hook.type === 'command' && hook.command.includes(scriptPath)
  );
}

describe('Observer Hooks Configuration', () => {
  const agentFiles = getAgentFiles();

  it('should find agent markdown files', () => {
    expect(agentFiles.length).toBeGreaterThan(0);
  });

  describe('PreToolUse observer hooks', () => {
    agentFiles.forEach(filePath => {
      const fileName = filePath.split('/').pop();

      it(`${fileName} should have PreToolUse observer hook`, () => {
        const frontmatter = parseAgentFrontmatter(filePath);
        expect(frontmatter).toBeTruthy();
        expect(frontmatter?.hooks?.PreToolUse).toBeDefined();

        // Find the catch-all observer hook (no matcher or '*' matcher)
        const observerHook = frontmatter!.hooks!.PreToolUse!.find(
          hookConfig => !hookConfig.matcher || hookConfig.matcher === '*'
        );

        expect(observerHook).toBeDefined();
        expect(hasObserverHook(observerHook!.hooks, OBSERVER_SCRIPTS.preToolUse)).toBe(true);
      });
    });
  });

  describe('PostToolUse observer hooks', () => {
    agentFiles.forEach(filePath => {
      const fileName = filePath.split('/').pop();

      it(`${fileName} should have PostToolUse observer hook`, () => {
        const frontmatter = parseAgentFrontmatter(filePath);
        expect(frontmatter).toBeTruthy();
        expect(frontmatter?.hooks?.PostToolUse).toBeDefined();

        // PostToolUse should have at least one hook config
        expect(frontmatter!.hooks!.PostToolUse!.length).toBeGreaterThan(0);

        // Find the observer hook (no specific matcher, or '*')
        const observerHook = frontmatter!.hooks!.PostToolUse!.find(
          hookConfig => !hookConfig.matcher || hookConfig.matcher === '*'
        );

        expect(observerHook).toBeDefined();
        expect(hasObserverHook(observerHook!.hooks, OBSERVER_SCRIPTS.postToolUse)).toBe(true);
      });
    });
  });

  describe('Stop observer hooks', () => {
    agentFiles.forEach(filePath => {
      const fileName = filePath.split('/').pop();

      it(`${fileName} should have Stop observer hook`, () => {
        const frontmatter = parseAgentFrontmatter(filePath);
        expect(frontmatter).toBeTruthy();
        expect(frontmatter?.hooks?.Stop).toBeDefined();

        // Stop hooks have no matcher
        expect(frontmatter!.hooks!.Stop!.length).toBeGreaterThan(0);

        const stopConfig = frontmatter!.hooks!.Stop![0];
        expect(hasObserverHook(stopConfig.hooks, OBSERVER_SCRIPTS.stop)).toBe(true);
      });
    });
  });

  describe('Enforcement hooks preservation', () => {
    it('hannibal.md should retain block-hannibal-writes.js hook', () => {
      const filePath = join(AGENTS_DIR, 'hannibal.md');
      const frontmatter = parseAgentFrontmatter(filePath);

      const writeEditHook = frontmatter?.hooks?.PreToolUse?.find(
        hookConfig => hookConfig.matcher === 'Write|Edit'
      );

      expect(writeEditHook).toBeDefined();
      expect(hasObserverHook(writeEditHook!.hooks, 'block-hannibal-writes.js')).toBe(true);
    });

    it('hannibal.md should retain block-raw-mv.js hook', () => {
      const filePath = join(AGENTS_DIR, 'hannibal.md');
      const frontmatter = parseAgentFrontmatter(filePath);

      const bashHook = frontmatter?.hooks?.PreToolUse?.find(
        hookConfig => hookConfig.matcher === 'Bash'
      );

      expect(bashHook).toBeDefined();
      expect(hasObserverHook(bashHook!.hooks, 'block-raw-mv.js')).toBe(true);
    });

    it('hannibal.md should retain enforce-final-review.js hook', () => {
      const filePath = join(AGENTS_DIR, 'hannibal.md');
      const frontmatter = parseAgentFrontmatter(filePath);

      const stopConfig = frontmatter?.hooks?.Stop?.[0];
      expect(stopConfig).toBeDefined();
      expect(hasObserverHook(stopConfig!.hooks, 'enforce-final-review.js')).toBe(true);
    });

    it('working agents should retain block-raw-echo-log.js hook', () => {
      const workingAgents = ['murdock.md', 'ba.md', 'lynch.md', 'amy.md', 'tawnia.md'];

      workingAgents.forEach(agentFile => {
        const filePath = join(AGENTS_DIR, agentFile);
        const frontmatter = parseAgentFrontmatter(filePath);

        const bashHook = frontmatter?.hooks?.PreToolUse?.find(
          hookConfig => hookConfig.matcher === 'Bash'
        );

        expect(bashHook, `${agentFile} should have Bash matcher hook`).toBeDefined();
        expect(
          hasObserverHook(bashHook!.hooks, 'block-raw-echo-log.js'),
          `${agentFile} should have block-raw-echo-log.js`
        ).toBe(true);
      });
    });

    it('working agents should retain enforce-completion-log.js hook', () => {
      const workingAgents = ['murdock.md', 'ba.md', 'lynch.md', 'amy.md', 'tawnia.md'];

      workingAgents.forEach(agentFile => {
        const filePath = join(AGENTS_DIR, agentFile);
        const frontmatter = parseAgentFrontmatter(filePath);

        const stopConfig = frontmatter?.hooks?.Stop?.[0];
        expect(stopConfig, `${agentFile} should have Stop hook`).toBeDefined();
        expect(
          hasObserverHook(stopConfig!.hooks, 'enforce-completion-log.js'),
          `${agentFile} should have enforce-completion-log.js`
        ).toBe(true);
      });
    });

    it('amy.md should retain block-amy-test-writes.js hook', () => {
      const filePath = join(AGENTS_DIR, 'amy.md');
      const frontmatter = parseAgentFrontmatter(filePath);

      const writeEditHook = frontmatter?.hooks?.PreToolUse?.find(
        hookConfig => hookConfig.matcher === 'Write|Edit'
      );

      expect(writeEditHook).toBeDefined();
      expect(hasObserverHook(writeEditHook!.hooks, 'block-amy-test-writes.js')).toBe(true);
    });
  });
});
