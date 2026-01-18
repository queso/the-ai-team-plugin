#!/usr/bin/env node
/**
 * item-agent-start.js - Agent claims item and writes assigned_agent to frontmatter.
 *
 * This is a START HOOK - call this when an agent begins work on an item.
 * It combines board-claim functionality with writing assigned_agent to the work item
 * so the kanban UI can display which agent is working on each card.
 *
 * Usage:
 *   echo '{"itemId": "007", "agent": "murdock"}' | node item-agent-start.js
 *
 * Input:
 *   - itemId: Work item ID (required)
 *   - agent: Agent name (required) - murdock, ba, lynch, amy
 *   - task_id: Optional task ID for tracking
 *
 * Output:
 *   - success: boolean
 *   - itemId: string
 *   - agent: string (display name)
 *   - timestamp: ISO timestamp
 *
 * Effects:
 *   1. Claims the item in board.json (same as board-claim.js)
 *   2. Writes assigned_agent to work item frontmatter
 *   3. Logs activity to mission/activity.log
 */

import {
  readBoard,
  writeBoard,
  findItem,
  parseWorkItem,
  writeWorkItem,
  logActivity,
  normalizeAgentName
} from '../lib/board.js';
import { withLock } from '../lib/lock.js';
import { readJsonInput, writeJsonOutput, writeError, assertValid } from '../lib/validate.js';
import { join } from 'path';

const MISSION_DIR = join(process.cwd(), 'mission');

const CLAIMABLE_STAGES = ['ready', 'testing', 'implementing', 'review', 'probing'];

async function main() {
  try {
    const input = await readJsonInput();
    assertValid(input, 'boardClaim');

    const { itemId, agent, task_id } = input;
    const agentLower = agent.toLowerCase().replace(/\./g, '');
    const agentDisplay = normalizeAgentName(agent);

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

      // Check if already claimed by different agent
      if (board.assignments?.[itemId]) {
        const currentAgent = board.assignments[itemId].agent;
        if (currentAgent.toLowerCase().replace(/\./g, '') !== agentLower) {
          const error = new Error(`Item already claimed by ${currentAgent}`);
          error.code = 'ALREADY_CLAIMED';
          error.exitCode = 23;
          error.itemId = itemId;
          throw error;
        }
        // Same agent re-claiming is ok (idempotent)
      }

      const timestamp = new Date().toISOString();

      // Initialize assignments if needed
      if (!board.assignments) {
        board.assignments = {};
      }

      // Initialize agents if needed
      if (!board.agents) {
        board.agents = {};
      }

      // Add assignment to board.json
      board.assignments[itemId] = {
        agent: agentDisplay,
        task_id: task_id,
        started_at: timestamp
      };

      // Update agent status
      board.agents[agentDisplay] = {
        status: 'active',
        current_item: itemId
      };

      // Write board
      await writeBoard(MISSION_DIR, board);

      // Write assigned_agent to work item frontmatter
      item.frontmatter.assigned_agent = agentDisplay;
      await writeWorkItem(item.path, item.frontmatter, item.content);

      // Log activity
      await logActivity(MISSION_DIR, agentDisplay, `Started work on ${itemId}`);

      return {
        success: true,
        itemId,
        agent: agentDisplay,
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
