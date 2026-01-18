#!/usr/bin/env node
/**
 * item-complete.js - Signal agent completion for a work item.
 *
 * Usage:
 *   echo '{"itemId": "003", "agent": "murdock", "status": "success", "message": "Tests created"}' | node item-complete.js
 *
 * This script allows agents to signal when they've finished working on an item,
 * enabling Hannibal to detect completion without waiting for batch completion.
 *
 * Input:
 *   - itemId: Work item ID (required)
 *   - agent: Agent name (required)
 *   - status: "success" or "failed" (required)
 *   - message: Optional completion message
 *
 * Output:
 *   - success: boolean
 *   - itemId: string
 *   - completed_at: ISO timestamp
 */

import {
  readBoard,
  writeBoard,
  logActivity,
  normalizeAgentName
} from '../lib/board.js';
import { withLock } from '../lib/lock.js';
import { readJsonInput, writeJsonOutput, writeError, assertValid } from '../lib/validate.js';
import { join } from 'path';

const MISSION_DIR = join(process.cwd(), 'mission');

async function main() {
  try {
    const input = await readJsonInput();
    assertValid(input, 'itemComplete');

    const { itemId, agent, status, message } = input;

    const result = await withLock(MISSION_DIR, async () => {
      const board = await readBoard(MISSION_DIR);

      // Initialize assignments if needed
      if (!board.assignments) board.assignments = {};

      const timestamp = new Date().toISOString();

      // Get or create assignment entry
      if (!board.assignments[itemId]) {
        board.assignments[itemId] = {
          agent: agent.charAt(0).toUpperCase() + agent.slice(1),
          started_at: timestamp
        };
      }

      // Update assignment with completion status
      board.assignments[itemId].completed_at = timestamp;
      board.assignments[itemId].status = status === 'success' ? 'completed' : 'failed';
      if (message) {
        board.assignments[itemId].message = message;
      }

      // Write updated board
      await writeBoard(MISSION_DIR, board);

      // Log activity
      const agentDisplay = normalizeAgentName(agent);
      const statusEmoji = status === 'success' ? '✓' : '✗';
      const logMessage = message
        ? `${statusEmoji} Feature ${itemId} complete: ${message}`
        : `${statusEmoji} Feature ${itemId} ${status}`;
      await logActivity(MISSION_DIR, agentDisplay, logMessage);

      return {
        success: true,
        itemId,
        agent: agentDisplay,
        status,
        completed_at: timestamp
      };
    });

    writeJsonOutput(result);

  } catch (err) {
    writeError(err);
  }
}

main();
