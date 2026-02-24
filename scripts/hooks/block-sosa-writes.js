#!/usr/bin/env node
/**
 * block-sosa-writes.js - PreToolUse hook for Sosa
 *
 * Blocks Sosa from writing or editing any files. Sosa reviews and critiques
 * Face's decomposition, but she does NOT write work items, tests, or code.
 * Her output is a review report provided as text to Hannibal.
 *
 * Claude Code sends hook context via stdin JSON (tool_name, tool_input).
 */

import { readFileSync } from 'fs';

let hookInput = {};
try {
  const raw = readFileSync(0, 'utf8');
  hookInput = JSON.parse(raw);
} catch {
  // Can't read stdin, allow through
  process.exit(0);
}

const toolName = hookInput.tool_name || '';

if (toolName === 'Write' || toolName === 'Edit') {
  console.error('BLOCKED: Sosa cannot write or edit files.');
  console.error('Sosa reviews Face\'s decomposition and provides recommendations.');
  console.error('Put your findings in your review report (as text output).');
  console.error('Face will use your recommendations to refine the work items.');
  process.exit(2);
}

// Allow other tools
process.exit(0);
