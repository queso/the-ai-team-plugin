#!/usr/bin/env node
/**
 * board-move.js - Move a work item to a different column.
 *
 * Usage:
 *   echo '{"itemId": "007", "to": "review", "agent": "lynch"}' | node board-move.js
 *   echo '{"itemId": "007", "to": "testing", "agent": "murdock", "task_id": "abc123"}' | node board-move.js
 *
 * This script performs:
 * 1. Moves the file on disk
 * 2. Updates board.json phases
 * 3. Auto-claims agent when moving to WIP stages (testing, implementing, review)
 * 4. Releases previous agent claim when moving out of WIP stages
 * 5. Stores task_id in assignment (if provided) for TaskOutput polling
 *
 * The "agent" parameter is REQUIRED when moving to testing, implementing, or review.
 * The "task_id" parameter is OPTIONAL - used by Hannibal to track background agents.
 */

// WIP stages that require agent assignment
const WIP_STAGES = ['testing', 'implementing', 'review'];

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

    const { itemId, to, agent, task_id } = input;

    // Validate agent is provided for WIP stages
    if (WIP_STAGES.includes(to) && !agent) {
      const error = new Error(`Agent is required when moving to ${to}. Provide "agent" parameter.`);
      error.code = 'AGENT_REQUIRED';
      error.exitCode = 25;
      throw error;
    }

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

      // Initialize agents, assignments, and history if needed
      if (!board.agents) board.agents = {};
      if (!board.assignments) board.assignments = {};
      if (!board.history) board.history = {};
      if (!board.history[itemId]) board.history[itemId] = [];

      const timestamp = new Date().toISOString();

      // Release previous agent claim when moving OUT of a WIP stage
      if (WIP_STAGES.includes(from)) {
        const previousAssignment = board.assignments[itemId];
        if (previousAssignment) {
          const previousAgent = previousAssignment.agent;

          // Record completed stage in history
          board.history[itemId].push({
            stage: from,
            agent: previousAgent,
            started_at: previousAssignment.started_at,
            completed_at: timestamp,
            duration_ms: new Date(timestamp) - new Date(previousAssignment.started_at)
          });

          // Set previous agent to idle (if not working on other items)
          const otherItems = Object.entries(board.assignments)
            .filter(([id, a]) => id !== itemId && a.agent === previousAgent);
          if (otherItems.length === 0 && board.agents[previousAgent]) {
            board.agents[previousAgent] = { status: 'idle' };
          }
          delete board.assignments[itemId];
        }
      }

      // Auto-claim when moving TO a WIP stage
      if (WIP_STAGES.includes(to) && agent) {
        // Capitalize agent name for display
        const agentDisplay = agent.charAt(0).toUpperCase() + agent.slice(1);
        const agentKey = agentDisplay === 'Ba' ? 'B.A.' : agentDisplay;

        const assignment = {
          agent: agentKey,
          started_at: timestamp,
          status: 'working'
        };

        // Store task_id if provided (for TaskOutput polling)
        if (task_id) {
          assignment.task_id = task_id;
        }

        board.assignments[itemId] = assignment;

        board.agents[agentKey] = {
          status: 'working',
          current_item: itemId
        };
      }

      // Record non-WIP stage transitions (briefings→ready, review→done)
      if (!WIP_STAGES.includes(from) && !WIP_STAGES.includes(to)) {
        board.history[itemId].push({
          stage: from,
          completed_at: timestamp
        });
      }

      // Track mission started_at (first time ANY item enters a WIP stage)
      if (WIP_STAGES.includes(to) && !board.mission.started_at) {
        board.mission.started_at = timestamp;
      }

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

        if (finalReviewReady && !board.mission.completed_at) {
          board.mission.completed_at = timestamp;

          // Calculate total mission duration
          if (board.mission.started_at) {
            board.mission.duration_ms = new Date(timestamp) - new Date(board.mission.started_at);
          }

          await writeBoard(MISSION_DIR, board);
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
