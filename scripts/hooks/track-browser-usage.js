#!/usr/bin/env node
/**
 * track-browser-usage.js - PreToolUse hook for Amy
 *
 * Fires when Amy calls a Playwright MCP tool or the agent-browser skill.
 * Creates a marker file so the Stop hook can verify browser testing happened.
 *
 * Non-blocking - always exits 0.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';

const toolName = process.env.TOOL_NAME || '';
const toolInput = process.env.TOOL_INPUT || '';
const projectId = process.env.ATEAM_PROJECT_ID || 'default';

// Check if this is actually a browser tool call
let isBrowserTool = false;

if (toolName.startsWith('mcp__plugin_playwright')) {
  isBrowserTool = true;
} else if (toolName === 'Skill') {
  try {
    const input = JSON.parse(toolInput);
    if (input.skill === 'agent-browser') {
      isBrowserTool = true;
    }
  } catch { /* ignore parse errors */ }
}

if (isBrowserTool) {
  const markerPath = join(tmpdir(), `.ateam-browser-verified-${projectId}`);
  try {
    mkdirSync(dirname(markerPath), { recursive: true });
    writeFileSync(markerPath, new Date().toISOString());
  } catch { /* non-blocking */ }
}

process.exit(0);
