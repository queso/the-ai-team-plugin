#!/usr/bin/env node
/**
 * board-release.js - Release an agent's claim on a work item.
 *
 * Usage:
 *   echo '{"itemId": "007", "agent": "ba"}' | node board-release.js
 */

import { readBoard, writeBoard, logActivity } from '../lib/board.js';
import { withLock } from '../lib/lock.js';
import { readJsonInput, writeJsonOutput, writeError, assertValid } from '../lib/validate.js';
import { join } from 'path';

const MISSION_DIR = join(process.cwd(), 'mission');

async function main() {
  try {
    const input = await readJsonInput();
    assertValid(input, 'boardRelease');

    const { itemId, agent, reason } = input;

    const result = await withLock(MISSION_DIR, async () => {
      // Read board
      const board = await readBoard(MISSION_DIR);

      // Check if item is claimed
      const assignment = board.assignments?.[itemId];
      if (!assignment) {
        // Not claimed - this is fine (idempotent)
        return {
          success: true,
          itemId,
          released: false,
          message: 'Item was not claimed'
        };
      }

      // If agent specified, verify it matches
      if (agent && assignment.agent.toLowerCase() !== agent.toLowerCase()) {
        const error = new Error(`Item is claimed by ${assignment.agent}, not ${agent}`);
        error.code = 'INVALID_AGENT';
        error.exitCode = 23;
        error.itemId = itemId;
        throw error;
      }

      const wasAgent = assignment.agent;
      const wasTaskId = assignment.task_id;

      // Remove assignment
      delete board.assignments[itemId];

      // Update agent status to idle
      if (board.agents?.[wasAgent]) {
        board.agents[wasAgent] = {
          status: 'idle',
          current_item: null
        };
      }

      // Write board
      await writeBoard(MISSION_DIR, board);

      // Log activity
      const logMsg = reason
        ? `Released ${itemId} from ${wasAgent}: ${reason}`
        : `Released ${itemId} from ${wasAgent}`;
      await logActivity(MISSION_DIR, 'Hannibal', logMsg);

      return {
        success: true,
        itemId,
        released: true,
        was_agent: wasAgent,
        was_task_id: wasTaskId,
        timestamp: new Date().toISOString()
      };
    });

    writeJsonOutput(result);

  } catch (err) {
    writeError(err);
  }
}

main();
