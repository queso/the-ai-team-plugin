#!/usr/bin/env node
/**
 * activity-log.js - Log activity to the Live Feed
 *
 * Usage:
 *   echo '{"agent": "Murdock", "message": "Writing tests for auth"}' | node activity-log.js
 *   node activity-log.js --agent=Murdock --message="Writing tests for auth"
 *
 * Used by worker agents (Murdock, B.A., Lynch) to report progress.
 */

import { appendFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { normalizeAgentName } from '../lib/board.js';

const MISSION_DIR = join(process.cwd(), 'mission');

async function readInput() {
  const args = process.argv.slice(2);

  // Check for --agent and --message flags
  let agent = null;
  let message = null;

  for (const arg of args) {
    if (arg.startsWith('--agent=')) {
      agent = arg.slice(8);
    } else if (arg.startsWith('--message=')) {
      message = arg.slice(10);
    }
  }

  if (agent && message) {
    return { agent, message };
  }

  // Read from stdin
  if (!process.stdin.isTTY) {
    let data = '';
    process.stdin.setEncoding('utf8');
    for await (const chunk of process.stdin) {
      data += chunk;
    }
    if (data.trim()) {
      return JSON.parse(data);
    }
  }

  return null;
}

async function main() {
  try {
    const input = await readInput();

    if (!input || !input.agent || !input.message) {
      console.error(JSON.stringify({
        error: 'INVALID_INPUT',
        message: 'Required: agent and message'
      }));
      process.exit(1);
    }

    // Check mission exists
    const logPath = join(MISSION_DIR, 'activity.log');
    if (!existsSync(MISSION_DIR)) {
      console.error(JSON.stringify({
        error: 'NO_MISSION',
        message: 'No mission directory found'
      }));
      process.exit(1);
    }

    // Format and append log entry
    const timestamp = new Date().toISOString();
    const agent = normalizeAgentName(input.agent);
    const entry = `${timestamp} [${agent}] ${input.message}\n`;

    await appendFile(logPath, entry);

    console.log(JSON.stringify({
      success: true,
      logged: {
        timestamp,
        agent,
        message: input.message
      }
    }));

  } catch (err) {
    console.error(JSON.stringify({
      error: err.code || 'LOG_FAILED',
      message: err.message
    }));
    process.exit(1);
  }
}

main();
