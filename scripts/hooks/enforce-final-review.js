#!/usr/bin/env node
/**
 * enforce-final-review.js - Stop hook for Hannibal
 *
 * Prevents mission from ending without:
 * 1. All items reaching done/
 * 2. Final Mission Review being completed
 * 3. Post-mission checks passing (lint, tests, e2e)
 *
 * This ensures the workflow is fully executed before Claude stops.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const missionDir = join(process.cwd(), 'mission');
const boardPath = join(missionDir, 'board.json');

// No active mission - allow stop
if (!existsSync(boardPath)) {
  process.exit(0);
}

try {
  const board = JSON.parse(readFileSync(boardPath, 'utf8'));
  const phases = board.phases || {};

  // Check for items still in active stages
  const activeStages = ['briefings', 'ready', 'testing', 'implementing', 'review', 'probing', 'blocked'];
  const activeCounts = {};
  let totalActive = 0;

  for (const stage of activeStages) {
    const count = phases[stage]?.length || 0;
    if (count > 0) {
      activeCounts[stage] = count;
      totalActive += count;
    }
  }

  const doneCount = phases.done?.length || 0;

  // If items are still active, block stop
  if (totalActive > 0) {
    const summary = Object.entries(activeCounts)
      .map(([stage, count]) => `${stage}: ${count}`)
      .join(', ');

    console.error(`Mission incomplete. ${totalActive} items still in progress.`);
    console.error(`Status: ${summary}`);
    console.error(`Done: ${doneCount}`);
    process.exit(2);
  }

  // If all items done but no final review verdict, block stop
  if (doneCount > 0 && !board.mission?.final_review_verdict) {
    console.error('Final Mission Review required.');
    console.error(`All ${doneCount} items are done, but Lynch has not completed the final review.`);
    console.error('Dispatch Lynch for Final Mission Review before ending.');
    process.exit(2);
  }

  // If final review done but post-checks not run/passed, block stop
  if (board.mission?.final_review_verdict && !board.mission?.postcheck?.passed) {
    console.error('Post-mission checks required.');
    console.error('Final review is complete, but post-checks have not passed.');
    console.error('');
    console.error('Run the post-mission checks:');
    console.error('  node scripts/mission-postcheck.js');
    console.error('');
    console.error('This verifies lint, tests, and e2e all pass after the mission.');
    process.exit(2);
  }

  // Mission complete with final review and passing post-checks - allow stop
  process.exit(0);

} catch (err) {
  // On error, allow stop (don't block due to parse errors)
  console.error(`Warning: Could not check mission status: ${err.message}`);
  process.exit(0);
}
