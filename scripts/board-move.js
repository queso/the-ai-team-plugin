#!/usr/bin/env node
/**
 * board-move.js - Move a work item to a different column.
 *
 * Usage:
 *   echo '{"itemId": "007", "to": "review"}' | node board-move.js
 *
 * This script performs BOTH:
 * 1. Moves the file on disk
 * 2. Updates board.json phases
 */

import {
  readBoard,
  writeBoard,
  findItem,
  validateTransition,
  checkWipLimit,
  moveItemFile,
  updateBoardPhases,
  checkDependencies,
  logActivity
} from '../lib/board.js';
import { withLock } from '../lib/lock.js';
import { readJsonInput, writeJsonOutput, writeError, assertValid } from '../lib/validate.js';
import { join } from 'path';

const MISSION_DIR = join(process.cwd(), 'mission');

async function main() {
  try {
    const input = await readJsonInput();
    assertValid(input, 'boardMove');

    const { itemId, to, agent } = input;

    const result = await withLock(MISSION_DIR, async () => {
      // Find the item
      const item = await findItem(MISSION_DIR, itemId);
      if (!item) {
        const error = new Error(`Item not found: ${itemId}`);
        error.code = 'ITEM_NOT_FOUND';
        error.exitCode = 20;
        error.itemId = itemId;
        throw error;
      }

      const from = item.stage;

      // Validate transition
      const transitionResult = validateTransition(from, to);
      if (!transitionResult.valid) {
        const error = new Error(transitionResult.error);
        error.code = 'INVALID_TRANSITION';
        error.exitCode = 21;
        error.itemId = itemId;
        throw error;
      }

      // Read board
      const board = await readBoard(MISSION_DIR);

      // Check WIP limits for target stage
      const wipCheck = checkWipLimit(board, to);
      if (!wipCheck.allowed) {
        const error = new Error(`Cannot move to ${to}: WIP limit ${wipCheck.current}/${wipCheck.limit} reached`);
        error.code = 'WIP_LIMIT_EXCEEDED';
        error.exitCode = 22;
        error.itemId = itemId;
        throw error;
      }

      // Check dependencies for forward moves
      if (to !== 'blocked' && to !== 'ready') {
        const deps = item.frontmatter.dependencies || [];
        const depCheck = checkDependencies(board, deps);
        if (!depCheck.satisfied) {
          const error = new Error(`Dependencies not satisfied: ${depCheck.pending.join(', ')}`);
          error.code = 'DEPENDENCY_BLOCKED';
          error.exitCode = 24;
          error.itemId = itemId;
          throw error;
        }
      }

      // Move the file
      const newPath = await moveItemFile(MISSION_DIR, item.path, to);

      // Update board.json phases
      updateBoardPhases(board, itemId, from, to);

      // Write board
      await writeBoard(MISSION_DIR, board);

      // Log activity
      await logActivity(MISSION_DIR, agent || 'Hannibal', `Feature ${itemId} → ${to}`);

      // Check if final review is needed (all items in done)
      let finalReviewReady = false;
      if (to === 'done') {
        const activeStages = ['briefings', 'ready', 'testing', 'implementing', 'review', 'blocked'];
        const hasActiveItems = activeStages.some(stage =>
          board.phases[stage] && board.phases[stage].length > 0
        );
        finalReviewReady = !hasActiveItems && board.phases.done && board.phases.done.length > 0;

        if (finalReviewReady) {
          await logActivity(MISSION_DIR, 'System', '🎯 All items complete - Final Mission Review ready');
        }
      }

      return {
        success: true,
        itemId,
        from,
        to,
        path: newPath,
        finalReviewReady,
        timestamp: new Date().toISOString()
      };
    });

    writeJsonOutput(result);

  } catch (err) {
    writeError(err);
  }
}

main();
