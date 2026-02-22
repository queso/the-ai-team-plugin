#!/usr/bin/env node
/**
 * diagnostic-hook.js - Dumps hook execution environment for debugging
 *
 * Writes environment variables, stdin JSON, and process info to a temp file.
 * Use this to determine what data Claude Code provides to hook commands.
 *
 * Usage: Add to agent frontmatter or settings.local.json hooks:
 *   command: "node $CLAUDE_PLUGIN_ROOT/scripts/hooks/diagnostic-hook.js <label>"
 *
 * Output: /tmp/ateam-hook-diagnostics.log (appends)
 */

import { readFileSync, appendFileSync, writeFileSync } from 'fs';

const label = process.argv[2] || 'unknown';
const outFile = '/tmp/ateam-hook-diagnostics.log';

// Read stdin (non-blocking with timeout)
let stdinData = '';
try {
  stdinData = readFileSync(0, 'utf8');
} catch {
  stdinData = '<no stdin available>';
}

let stdinJson = null;
try {
  stdinJson = JSON.parse(stdinData);
} catch {
  // Not JSON
}

const entry = {
  timestamp: new Date().toISOString(),
  label,
  pid: process.pid,
  cwd: process.cwd(),
  argv: process.argv,
  stdinRaw: stdinData.substring(0, 2000),
  stdinParsed: stdinJson,
  env: {
    CLAUDE_PLUGIN_ROOT: process.env.CLAUDE_PLUGIN_ROOT || '<not set>',
    TOOL_NAME: process.env.TOOL_NAME || '<not set>',
    TOOL_INPUT: (process.env.TOOL_INPUT || '<not set>').substring(0, 200),
    HOOK_EVENT_TYPE: process.env.HOOK_EVENT_TYPE || '<not set>',
    AGENT_NAME: process.env.AGENT_NAME || '<not set>',
    ATEAM_API_URL: process.env.ATEAM_API_URL || '<not set>',
    ATEAM_PROJECT_ID: process.env.ATEAM_PROJECT_ID || '<not set>',
    CLAUDE_PROJECT_DIR: process.env.CLAUDE_PROJECT_DIR || '<not set>',
    SESSION_ID: process.env.SESSION_ID || '<not set>',
    HOME: process.env.HOME || '<not set>',
    NODE_ENV: process.env.NODE_ENV || '<not set>',
  },
};

const line = '--- HOOK DIAGNOSTIC ---\n' + JSON.stringify(entry, null, 2) + '\n\n';

try {
  appendFileSync(outFile, line);
} catch {
  // Fallback: write to stderr
  process.stderr.write(line);
}

process.exit(0);
