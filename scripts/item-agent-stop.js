#!/usr/bin/env node
/**
 * item-agent-stop.js - Agent completes work and leaves summary in work item.
 *
 * This is a STOP HOOK - call this when an agent finishes work on an item.
 * It combines item-complete functionality with writing a work summary to the
 * work item's work_log array in frontmatter.
 *
 * Usage:
 *   echo '{"itemId": "007", "agent": "murdock", "status": "success", "summary": "Created 5 test cases covering happy path and edge cases"}' | node item-agent-stop.js
 *
 * Input:
 *   - itemId: Work item ID (required)
 *   - agent: Agent name (required) - murdock, ba, lynch, amy
 *   - status: "success" or "failed" (required)
 *   - summary: Work summary note (required) - what was done
 *   - files_created: Optional array of files created
 *   - files_modified: Optional array of files modified
 *
 * Output:
 *   - success: boolean
 *   - itemId: string
 *   - agent: string (display name)
 *   - completed_at: ISO timestamp
 *
 * Effects:
 *   1. Marks completion in board.json (same as item-complete.js)
 *   2. Clears assigned_agent from frontmatter
 *   3. Appends entry to work_log array in frontmatter
 *   4. Logs activity to mission/activity.log
 */

import {
  readBoard,
  writeBoard,
  findItem,
  writeWorkItem,
  logActivity,
  normalizeAgentName
} from '../lib/board.js';
import { withLock } from '../lib/lock.js';
import { readJsonInput, writeJsonOutput, writeError } from '../lib/validate.js';
import { join } from 'path';

const MISSION_DIR = join(process.cwd(), 'mission');

const VALID_AGENTS = ['murdock', 'ba', 'lynch', 'amy', 'hannibal', 'face', 'sosa'];
const VALID_STATUSES = ['success', 'failed'];

async function main() {
  try {
    const input = await readJsonInput();

    // Custom validation for this script
    const errors = [];
    if (!input.itemId) errors.push('Missing required field: itemId');
    if (!input.agent) errors.push('Missing required field: agent');
    if (!input.status) errors.push('Missing required field: status');
    if (!input.summary) errors.push('Missing required field: summary');

    if (input.agent && !VALID_AGENTS.includes(input.agent.toLowerCase().replace(/\./g, ''))) {
      errors.push(`agent must be one of: ${VALID_AGENTS.join(', ')}`);
    }
    if (input.status && !VALID_STATUSES.includes(input.status)) {
      errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    if (errors.length > 0) {
      const error = new Error(`Validation failed: ${errors.join('; ')}`);
      error.code = 'INVALID_INPUT';
      error.exitCode = 11;
      error.errors = errors;
      throw error;
    }

    const { itemId, agent, status, summary, files_created, files_modified } = input;
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

      const timestamp = new Date().toISOString();

      // Read board
      const board = await readBoard(MISSION_DIR);

      // Initialize assignments if needed
      if (!board.assignments) board.assignments = {};

      // Get or create assignment entry
      if (!board.assignments[itemId]) {
        board.assignments[itemId] = {
          agent: agentDisplay,
          started_at: timestamp
        };
      }

      // Update assignment with completion status
      board.assignments[itemId].completed_at = timestamp;
      board.assignments[itemId].status = status === 'success' ? 'completed' : 'failed';
      board.assignments[itemId].message = summary;

      // Update agent status to idle
      if (board.agents?.[agentDisplay]) {
        board.agents[agentDisplay] = {
          status: 'idle',
          current_item: null
        };
      }

      // Write updated board
      await writeBoard(MISSION_DIR, board);

      // Update work item frontmatter
      // 1. Clear assigned_agent (agent is done)
      delete item.frontmatter.assigned_agent;

      // 2. Initialize work_log if needed
      if (!item.frontmatter.work_log) {
        item.frontmatter.work_log = [];
      }

      // 3. Create work log entry
      const logEntry = {
        agent: agentDisplay,
        timestamp,
        status,
        summary
      };

      // Add optional fields if provided
      if (files_created && files_created.length > 0) {
        logEntry.files_created = files_created;
      }
      if (files_modified && files_modified.length > 0) {
        logEntry.files_modified = files_modified;
      }

      // 4. Append to work_log in frontmatter
      item.frontmatter.work_log.push(logEntry);

      // 5. Append human-readable note to work item content
      const workLogNote = `${agentDisplay} - ${summary}`;

      // Check if Work Log section exists
      if (item.content.includes('## Work Log')) {
        // Append to existing section
        item.content = item.content.replace(
          /(## Work Log\n)/,
          `$1${workLogNote}\n`
        );
      } else {
        // Create new section at the end
        item.content = item.content.trimEnd() + `\n\n## Work Log\n${workLogNote}\n`;
      }

      // Write updated work item
      await writeWorkItem(item.path, item.frontmatter, item.content);

      // Log activity
      const statusEmoji = status === 'success' ? '✓' : '✗';
      await logActivity(MISSION_DIR, agentDisplay, `${statusEmoji} ${itemId}: ${summary}`);

      return {
        success: true,
        itemId,
        agent: agentDisplay,
        status,
        completed_at: timestamp,
        work_log_entry: logEntry
      };
    });

    writeJsonOutput(result);

  } catch (err) {
    writeError(err);
  }
}

main();
