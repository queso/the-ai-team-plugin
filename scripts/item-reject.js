#!/usr/bin/env node
/**
 * item-reject.js - Record a rejection from review.
 *
 * Usage:
 *   echo '{"itemId": "007", "agent": "lynch", "reason": "Missing edge case"}' | node item-reject.js
 */

import {
  readBoard,
  writeBoard,
  findItem,
  writeWorkItem,
  moveItemFile,
  updateBoardPhases,
  logActivity
} from '../lib/board.js';
import { withLock } from '../lib/lock.js';
import { readJsonInput, writeJsonOutput, writeError, assertValid } from '../lib/validate.js';
import { join } from 'path';

const MISSION_DIR = join(process.cwd(), 'mission');
const MAX_REJECTIONS = 2;

async function main() {
  try {
    const input = await readJsonInput();
    assertValid(input, 'itemReject');

    const { itemId, agent, reason, issues } = input;

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

      // Read board
      const board = await readBoard(MISSION_DIR);

      // Increment rejection count
      const rejectionCount = (item.frontmatter.rejection_count || 0) + 1;
      item.frontmatter.rejection_count = rejectionCount;

      // Add to rejection history
      if (!item.frontmatter.rejection_history) {
        item.frontmatter.rejection_history = [];
      }
      item.frontmatter.rejection_history.push({
        reason,
        issues: issues || [],
        agent: agent || 'Lynch',
        date: new Date().toISOString()
      });

      // Determine target stage
      const escalate = rejectionCount >= MAX_REJECTIONS;
      const targetStage = escalate ? 'blocked' : 'ready';

      // Update status
      item.frontmatter.status = escalate ? 'blocked' : 'pending';

      // Write updated item
      await writeWorkItem(item.path, item.frontmatter, item.content);

      // Move file to target stage
      const newPath = await moveItemFile(MISSION_DIR, item.path, targetStage);

      // Update board phases
      updateBoardPhases(board, itemId, item.stage, targetStage);

      // Update stats
      board.stats = board.stats || {};
      board.stats.rejected_count = (board.stats.rejected_count || 0) + 1;

      // Remove assignment if any
      if (board.assignments?.[itemId]) {
        const assignedAgent = board.assignments[itemId].agent;
        delete board.assignments[itemId];
        if (board.agents?.[assignedAgent]) {
          board.agents[assignedAgent] = { status: 'idle', current_item: null };
        }
      }

      // Write board
      await writeBoard(MISSION_DIR, board);

      // Log activity
      const logAgent = agent || 'Lynch';
      if (escalate) {
        await logActivity(MISSION_DIR, logAgent, `REJECTED ${itemId} (escalated to blocked): ${reason}`);
        await logActivity(MISSION_DIR, 'Hannibal', `ALERT: Item ${itemId} requires human intervention`);
      } else {
        await logActivity(MISSION_DIR, logAgent, `REJECTED ${itemId}: ${reason}`);
      }

      return {
        success: true,
        itemId,
        rejectionCount,
        movedTo: targetStage,
        path: newPath,
        escalate,
        timestamp: new Date().toISOString()
      };
    });

    writeJsonOutput(result);

  } catch (err) {
    writeError(err);
  }
}

main();
