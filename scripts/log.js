#!/usr/bin/env node
/**
 * log.js - Simple activity logger for agents
 *
 * Usage (positional args - easier for agents):
 *   node scripts/log.js "B.A." "All tests passing"
 *   node scripts/log.js Murdock "Created 5 test cases"
 *
 * This is simpler than activity-log.js and doesn't require JSON piping.
 * Covered by permission: Bash(node scripts/log.js)
 */

import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const MISSION_DIR = join(process.cwd(), 'mission');
const LOG_PATH = join(MISSION_DIR, 'activity.log');

// Agent name normalization
const AGENT_NAMES = {
  'hannibal': 'Hannibal',
  'face': 'Face',
  'murdock': 'Murdock',
  'ba': 'B.A.',
  'b.a.': 'B.A.',
  'lynch': 'Lynch',
  'amy': 'Amy',
  'sosa': 'Sosa',
  'system': 'System'
};

function normalizeAgent(name) {
  const lower = name.toLowerCase().replace(/\./g, '');
  return AGENT_NAMES[lower] || name;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node scripts/log.js <agent> <message>');
    console.error('Example: node scripts/log.js "B.A." "All tests passing"');
    process.exit(1);
  }

  const agent = normalizeAgent(args[0]);
  const message = args.slice(1).join(' ');

  // Ensure mission directory exists
  if (!existsSync(MISSION_DIR)) {
    console.error('No mission directory found');
    process.exit(1);
  }

  // Format and append
  const timestamp = new Date().toISOString();
  const entry = `${timestamp} [${agent}] ${message}\n`;

  appendFileSync(LOG_PATH, entry);

  console.log(`Logged: [${agent}] ${message}`);
}

main();
