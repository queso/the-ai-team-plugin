#!/usr/bin/env node
/**
 * mission-precheck.js - Run pre-mission checks (lint, tests)
 *
 * Reads ateam.config.json to determine which checks to run.
 * Ensures the codebase is in a clean state before starting a mission.
 *
 * Usage:
 *   node scripts/mission-precheck.js
 *
 * Output:
 *   - success: boolean
 *   - checks: array of check results
 *   - allPassed: boolean
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const CONFIG_PATHS = [
  join(process.cwd(), 'ateam.config.json'),
  join(process.cwd(), '.claude/ai-team-config.json')
];

// Default config if none found
const DEFAULT_CONFIG = {
  checks: {
    lint: 'npm run lint',
    unit: 'npm test'
  },
  precheck: ['lint', 'unit']
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

async function main() {
  console.log('═'.repeat(50));
  console.log('A(i)-Team Pre-Mission Check');
  console.log('═'.repeat(50));

  const config = loadConfig();
  const checksToRun = config.precheck || [];

  if (checksToRun.length === 0) {
    console.log('\nNo pre-checks configured. Skipping.');
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

  console.log('\n' + '═'.repeat(50));
  console.log('Pre-Mission Check Summary');
  console.log('═'.repeat(50));

  for (const result of results) {
    const icon = result.passed ? '✓' : '✗';
    console.log(`${icon} ${result.name}`);
  }

  console.log('─'.repeat(50));

  if (allPassed) {
    console.log('✓ All pre-checks passed. Ready to start mission.');
  } else {
    console.log('✗ Some checks failed. Fix issues before starting mission.');
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
  console.error('Pre-check failed:', err.message);
  process.exit(1);
});
