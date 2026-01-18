#!/usr/bin/env node
/**
 * mission-postcheck.js - Run post-mission checks (lint, unit tests, e2e)
 *
 * Reads ateam.config.json to determine which checks to run.
 * Proves the codebase works after a mission completes.
 *
 * Usage:
 *   node scripts/mission-postcheck.js
 *
 * Output:
 *   - success: boolean
 *   - checks: array of check results
 *   - allPassed: boolean
 *
 * Also updates board.json with postcheck results for the Stop hook to verify.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const CONFIG_PATHS = [
  join(process.cwd(), 'ateam.config.json'),
  join(process.cwd(), '.claude/ai-team-config.json')
];

const MISSION_DIR = join(process.cwd(), 'mission');
const BOARD_PATH = join(MISSION_DIR, 'board.json');

// Default config if none found
const DEFAULT_CONFIG = {
  checks: {
    lint: 'npm run lint',
    unit: 'npm test',
    e2e: null
  },
  postcheck: ['lint', 'unit']
};

function loadConfig() {
  for (const configPath of CONFIG_PATHS) {
    if (existsSync(configPath)) {
      try {
        return JSON.parse(readFileSync(configPath, 'utf8'));
      } catch (err) {
        console.error(`Warning: Could not parse ${configPath}: ${err.message}`);
      }
    }
  }
  console.error('No ateam.config.json found, using defaults');
  return DEFAULT_CONFIG;
}

function runCheck(name, command) {
  console.log(`\n▶ Running ${name}: ${command}`);
  console.log('─'.repeat(50));

  try {
    execSync(command, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log(`✓ ${name} passed`);
    return { name, command, passed: true };
  } catch (err) {
    console.error(`✗ ${name} failed`);
    return { name, command, passed: false, error: err.message };
  }
}

function updateBoardWithResults(results, allPassed) {
  if (!existsSync(BOARD_PATH)) {
    console.log('No board.json found, skipping board update');
    return;
  }

  try {
    const board = JSON.parse(readFileSync(BOARD_PATH, 'utf8'));

    if (!board.mission) board.mission = {};

    board.mission.postcheck = {
      timestamp: new Date().toISOString(),
      passed: allPassed,
      checks: results.map(r => ({
        name: r.name,
        passed: r.passed
      }))
    };

    writeFileSync(BOARD_PATH, JSON.stringify(board, null, 2));
    console.log('\n✓ Board updated with postcheck results');
  } catch (err) {
    console.error(`Warning: Could not update board.json: ${err.message}`);
  }
}

async function main() {
  console.log('═'.repeat(50));
  console.log('A(i)-Team Post-Mission Check');
  console.log('═'.repeat(50));

  const config = loadConfig();
  const checksToRun = config.postcheck || [];

  if (checksToRun.length === 0) {
    console.log('\nNo post-checks configured. Skipping.');
    updateBoardWithResults([], true);
    console.log(JSON.stringify({ success: true, checks: [], allPassed: true, skipped: true }));
    process.exit(0);
  }

  console.log(`\nChecks to run: ${checksToRun.join(', ')}`);

  const results = [];

  for (const checkName of checksToRun) {
    const command = config.checks?.[checkName];
    if (!command || command === 'None' || command === 'none') {
      console.log(`\n⊘ Skipping ${checkName} (not configured)`);
      continue;
    }
    results.push(runCheck(checkName, command));
  }

  const allPassed = results.every(r => r.passed);

  // Update board.json with results
  updateBoardWithResults(results, allPassed);

  console.log('\n' + '═'.repeat(50));
  console.log('Post-Mission Check Summary');
  console.log('═'.repeat(50));

  for (const result of results) {
    const icon = result.passed ? '✓' : '✗';
    console.log(`${icon} ${result.name}`);
  }

  console.log('─'.repeat(50));

  if (allPassed) {
    console.log('✓ All post-checks passed. Mission verified!');
  } else {
    console.log('✗ Some checks failed. Mission cannot complete until fixed.');
  }

  // Output JSON result
  const output = {
    success: allPassed,
    checks: results,
    allPassed
  };

  console.log('\n' + JSON.stringify(output, null, 2));

  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error('Post-check failed:', err.message);
  process.exit(1);
});
