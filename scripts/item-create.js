#!/usr/bin/env node
/**
 * item-create.js - Create a new work item from structured input.
 *
 * Usage:
 *   cat item-spec.json | node item-create.js
 */

import {
  readBoard,
  writeBoard,
  writeWorkItem,
  generateItemFilename,
  getNextItemId,
  ensureStageDirectories,
  logActivity
} from '../lib/board.js';
import { withLock } from '../lib/lock.js';
import { readJsonInput, writeJsonOutput, writeError, assertValid } from '../lib/validate.js';
import { join } from 'path';

const MISSION_DIR = join(process.cwd(), 'mission');

function buildItemContent(input) {
  const lines = [];

  lines.push('## Objective');
  lines.push('');
  lines.push(input.objective);
  lines.push('');

  lines.push('## Acceptance Criteria');
  lines.push('');
  for (const criterion of input.acceptance) {
    lines.push(`- [ ] ${criterion}`);
  }
  lines.push('');

  if (input.context) {
    lines.push('## Context');
    lines.push('');
    lines.push(input.context);
    lines.push('');
  }

  return lines.join('\n');
}

async function main() {
  try {
    const input = await readJsonInput();
    assertValid(input, 'itemCreate');

    const result = await withLock(MISSION_DIR, async () => {
      // Ensure stage directories exist
      await ensureStageDirectories(MISSION_DIR);

      // Read board
      const board = await readBoard(MISSION_DIR);

      // Get or generate ID
      const id = input.id || getNextItemId(board);

      // Validate ID format
      if (!/^\d{3}$/.test(id)) {
        const error = new Error(`Invalid ID format: ${id}. Must be 3 digits.`);
        error.code = 'INVALID_INPUT';
        error.exitCode = 11;
        throw error;
      }

      // Check ID doesn't already exist
      const allIds = Object.values(board.phases || {}).flat();
      if (allIds.includes(id)) {
        const error = new Error(`Item ID already exists: ${id}`);
        error.code = 'DUPLICATE_ID';
        error.exitCode = 11;
        throw error;
      }

      // Build frontmatter
      const frontmatter = {
        id,
        title: input.title,
        type: input.type,
        status: 'pending',
        rejection_count: 0
      };

      if (input.outputs) {
        frontmatter.outputs = input.outputs;
      }
      if (input.dependencies?.length > 0) {
        frontmatter.dependencies = input.dependencies;
      }
      if (input.parallel_group) {
        frontmatter.parallel_group = input.parallel_group;
      }
      if (input.estimate) {
        frontmatter.estimate = input.estimate;
      }

      // Build content
      const content = buildItemContent(input);

      // Generate filename
      const filename = generateItemFilename(id, input.title);
      const filePath = join(MISSION_DIR, 'briefings', filename);

      // Write item file
      await writeWorkItem(filePath, frontmatter, content);

      // Update board.json
      if (!board.phases) {
        board.phases = { briefings: [], ready: [], testing: [], implementing: [], review: [], done: [], blocked: [] };
      }
      board.phases.briefings.push(id);

      // Update stats
      if (!board.stats) {
        board.stats = { total_items: 0, completed: 0, in_flight: 0, blocked: 0, rejected_count: 0 };
      }
      board.stats.total_items++;
      board.stats.backlog = (board.phases.briefings?.length || 0) + (board.phases.ready?.length || 0);

      // Update dependency graph
      if (!board.dependency_graph) {
        board.dependency_graph = {};
      }
      board.dependency_graph[id] = input.dependencies || [];

      // Update parallel groups
      if (input.parallel_group) {
        if (!board.parallel_groups) {
          board.parallel_groups = {};
        }
        if (!board.parallel_groups[input.parallel_group]) {
          board.parallel_groups[input.parallel_group] = [];
        }
        board.parallel_groups[input.parallel_group].push(id);
      }

      // Write board
      await writeBoard(MISSION_DIR, board);

      // Log activity
      await logActivity(MISSION_DIR, 'Face', `Created item ${id}: ${input.title}`);

      return {
        success: true,
        itemId: id,
        path: filePath,
        column: 'briefings'
      };
    });

    writeJsonOutput(result);

  } catch (err) {
    writeError(err);
  }
}

main();
