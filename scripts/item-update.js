#!/usr/bin/env node
/**
 * item-update.js - Update an existing work item's content or metadata.
 *
 * Usage:
 *   echo '{"itemId": "007", "updates": {...}}' | node item-update.js
 */

import {
  readBoard,
  writeBoard,
  findItem,
  parseWorkItem,
  writeWorkItem,
  logActivity
} from '../lib/board.js';
import { withLock } from '../lib/lock.js';
import { readJsonInput, writeJsonOutput, writeError, assertValid } from '../lib/validate.js';
import { join } from 'path';

const MISSION_DIR = join(process.cwd(), 'mission');

async function main() {
  try {
    const input = await readJsonInput();
    assertValid(input, 'itemUpdate');

    const { itemId, updates } = input;

    if (!updates || Object.keys(updates).length === 0) {
      const error = new Error('No updates provided');
      error.code = 'INVALID_INPUT';
      error.exitCode = 11;
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

      const changed = [];
      const oldFrontmatter = { ...item.frontmatter };
      let content = item.content;

      // Apply frontmatter updates
      const frontmatterFields = ['title', 'type', 'status', 'outputs', 'dependencies', 'parallel_group', 'estimate'];
      for (const field of frontmatterFields) {
        if (updates[field] !== undefined) {
          item.frontmatter[field] = updates[field];
          changed.push(field);
        }
      }

      // Handle acceptance criteria checkbox updates
      if (updates.checkAcceptance) {
        const { index, checked } = updates.checkAcceptance;
        // Parse content to find and update checkbox
        const lines = content.split('\n');
        let checkboxCount = 0;
        for (let i = 0; i < lines.length; i++) {
          const match = lines[i].match(/^- \[([ x])\] (.*)$/);
          if (match) {
            if (checkboxCount === index) {
              lines[i] = `- [${checked ? 'x' : ' '}] ${match[2]}`;
              changed.push(`acceptance[${index}]`);
              break;
            }
            checkboxCount++;
          }
        }
        content = lines.join('\n');
      }

      // Handle context append
      if (updates.context) {
        // Append to existing context or add new section
        if (content.includes('## Context')) {
          content = content.replace(
            /(## Context\n\n)([\s\S]*?)(\n\n##|$)/,
            `$1$2\n\n${updates.context}$3`
          );
        } else {
          content += `\n## Context\n\n${updates.context}\n`;
        }
        changed.push('context');
      }

      // Handle objective update
      if (updates.objective) {
        content = content.replace(
          /(## Objective\n\n)([\s\S]*?)(\n\n##)/,
          `$1${updates.objective}$3`
        );
        changed.push('objective');
      }

      // Handle acceptance criteria replacement
      if (updates.acceptance) {
        const newCriteria = updates.acceptance.map(c => `- [ ] ${c}`).join('\n');
        content = content.replace(
          /(## Acceptance Criteria\n\n)([\s\S]*?)(\n\n##|$)/,
          `$1${newCriteria}\n$3`
        );
        changed.push('acceptance');
      }

      // Write updated item
      await writeWorkItem(item.path, item.frontmatter, content);

      // Read and update board if needed
      const board = await readBoard(MISSION_DIR);
      let boardUpdated = false;

      // Update dependency graph if dependencies changed
      if (updates.dependencies !== undefined) {
        if (!board.dependency_graph) board.dependency_graph = {};
        board.dependency_graph[itemId] = updates.dependencies;
        boardUpdated = true;
      }

      // Update parallel groups if changed
      if (updates.parallel_group !== undefined) {
        if (!board.parallel_groups) board.parallel_groups = {};
        // Remove from old group
        if (oldFrontmatter.parallel_group) {
          const oldGroup = board.parallel_groups[oldFrontmatter.parallel_group];
          if (oldGroup) {
            board.parallel_groups[oldFrontmatter.parallel_group] = oldGroup.filter(id => id !== itemId);
          }
        }
        // Add to new group
        if (updates.parallel_group) {
          if (!board.parallel_groups[updates.parallel_group]) {
            board.parallel_groups[updates.parallel_group] = [];
          }
          if (!board.parallel_groups[updates.parallel_group].includes(itemId)) {
            board.parallel_groups[updates.parallel_group].push(itemId);
          }
        }
        boardUpdated = true;
      }

      if (boardUpdated) {
        await writeBoard(MISSION_DIR, board);
      }

      // Log activity
      await logActivity(MISSION_DIR, 'Hannibal', `Updated ${itemId}: ${changed.join(', ')}`);

      return {
        success: true,
        itemId,
        changed,
        item: item.frontmatter
      };
    });

    writeJsonOutput(result);

  } catch (err) {
    writeError(err);
  }
}

main();
