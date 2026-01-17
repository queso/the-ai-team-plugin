#!/usr/bin/env node
/**
 * board-read.js - Read current board state as JSON.
 *
 * Usage:
 *   node board-read.js
 *   node board-read.js --column=implementing
 *   node board-read.js --item=007
 *   node board-read.js --agents
 */

import { readBoard, listStageItems, findItem, STAGES } from '../lib/board.js';
import { readJsonInput, writeJsonOutput, writeError } from '../lib/validate.js';
import { join } from 'path';

const MISSION_DIR = join(process.cwd(), 'mission');

async function main() {
  try {
    // Parse args
    const args = process.argv.slice(2);
    const columnArg = args.find(a => a.startsWith('--column='));
    const itemArg = args.find(a => a.startsWith('--item='));
    const includeAgents = args.includes('--agents');

    const column = columnArg?.split('=')[1];
    const itemId = itemArg?.split('=')[1];

    // Read board
    const board = await readBoard(MISSION_DIR);

    // If specific item requested
    if (itemId) {
      const item = await findItem(MISSION_DIR, itemId);
      if (!item) {
        const error = new Error(`Item not found: ${itemId}`);
        error.code = 'ITEM_NOT_FOUND';
        error.exitCode = 20;
        error.itemId = itemId;
        throw error;
      }

      writeJsonOutput({
        success: true,
        item: {
          id: item.frontmatter.id || itemId,
          title: item.frontmatter.title,
          stage: item.stage,
          path: item.path,
          ...item.frontmatter
        }
      });
      return;
    }

    // If specific column requested
    if (column) {
      if (!STAGES.includes(column)) {
        const error = new Error(`Invalid column: ${column}`);
        error.code = 'INVALID_INPUT';
        error.exitCode = 11;
        throw error;
      }

      const items = await listStageItems(MISSION_DIR, column);
      writeJsonOutput({
        success: true,
        column,
        items: items.map(item => ({
          id: item.id,
          title: item.frontmatter.title,
          path: item.path
        }))
      });
      return;
    }

    // Full board read
    const result = {
      success: true,
      mission: board.mission || { name: board.project, status: 'active' },
      status: board.mission?.status || 'active',
      progress: {
        done: board.phases?.done?.length || 0,
        total: board.stats?.total_items || 0
      },
      wip: {
        current: board.stats?.in_flight || 0,
        limit: board.wip_limit || 3
      },
      columns: {}
    };

    // Populate columns with item details
    for (const stage of STAGES) {
      const itemIds = board.phases?.[stage] || [];
      result.columns[stage] = itemIds;
    }

    // Include agents if requested
    if (includeAgents) {
      result.agents = board.agents || {
        hannibal: 'watching',
        face: 'idle',
        murdock: 'idle',
        ba: 'idle',
        lynch: 'idle'
      };
      result.assignments = board.assignments || {};
    }

    writeJsonOutput(result);

  } catch (err) {
    writeError(err);
  }
}

main();
