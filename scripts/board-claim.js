#!/usr/bin/env node
/**
 * board-claim.js - Assign an agent to a work item.
 *
 * Usage:
 *   echo '{"itemId": "007", "agent": "ba"}' | node board-claim.js
 */

import { readBoard, writeBoard, findItem, logActivity } from '../lib/board.js';
import { withLock } from '../lib/lock.js';
import { readJsonInput, writeJsonOutput, writeError, assertValid, AGENTS } from '../lib/validate.js';
import { join } from 'path';

const MISSION_DIR = join(process.cwd(), 'mission');

// Claimable stages (not briefings or done)
const CLAIMABLE_STAGES = ['ready', 'testing', 'implementing', 'review'];

async function main() {
  try {
    const input = await readJsonInput();
    assertValid(input, 'boardClaim');

    const { itemId, agent, task_id } = input;
    const agentLower = agent.toLowerCase();

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

      // Check item is in claimable stage
      if (!CLAIMABLE_STAGES.includes(item.stage)) {
        const error = new Error(`Cannot claim item in stage: ${item.stage}`);
        error.code = 'INVALID_STAGE';
        error.exitCode = 21;
        error.itemId = itemId;
        throw error;
      }

      // Read board
      const board = await readBoard(MISSION_DIR);

      // Check if already claimed
      if (board.assignments?.[itemId]) {
        const currentAgent = board.assignments[itemId].agent;
        if (currentAgent.toLowerCase() !== agentLower) {
          const error = new Error(`Item already claimed by ${currentAgent}`);
          error.code = 'ALREADY_CLAIMED';
          error.exitCode = 23;
          error.itemId = itemId;
          throw error;
        }
        // Same agent re-claiming is ok (idempotent)
      }

      // Initialize assignments if needed
      if (!board.assignments) {
        board.assignments = {};
      }

      // Initialize agents if needed
      if (!board.agents) {
        board.agents = {};
      }

      const timestamp = new Date().toISOString();

      // Add assignment
      board.assignments[itemId] = {
        agent: agent,
        task_id: task_id,
        started_at: timestamp
      };

      // Update agent status
      board.agents[agent] = {
        status: 'active',
        current_item: itemId
      };

      // Write board
      await writeBoard(MISSION_DIR, board);

      // Log activity
      await logActivity(MISSION_DIR, 'Hannibal', `Assigned ${itemId} to ${agent}`);

      return {
        success: true,
        itemId,
        agent,
        task_id,
        timestamp
      };
    });

    writeJsonOutput(result);

  } catch (err) {
    writeError(err);
  }
}

main();
