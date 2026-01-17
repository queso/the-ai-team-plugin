#!/usr/bin/env node
/**
 * item-render.js - Render a work item as clean markdown.
 *
 * Usage:
 *   echo '{"itemId": "007"}' | node item-render.js
 *   node item-render.js --item=007
 *
 * Output: Pure markdown (not JSON)
 */

import { findItem } from '../lib/board.js';
import { readJsonInput, writeError } from '../lib/validate.js';
import { join } from 'path';

const MISSION_DIR = join(process.cwd(), 'mission');

function renderItem(item) {
  const fm = item.frontmatter;
  const lines = [];

  // Title
  lines.push(`# ${fm.id} - ${fm.title}`);
  lines.push('');

  // Metadata
  lines.push(`**Type:** ${fm.type || 'feature'}`);
  lines.push(`**Status:** ${fm.status || 'pending'}`);
  if (fm.assigned_agent) {
    lines.push(`**Agent:** ${fm.assigned_agent}`);
  }
  if (fm.dependencies?.length > 0) {
    lines.push(`**Dependencies:** ${fm.dependencies.join(', ')}`);
  }
  if (fm.parallel_group) {
    lines.push(`**Parallel Group:** ${fm.parallel_group}`);
  }
  lines.push('');

  // Outputs
  if (fm.outputs) {
    lines.push('## Outputs');
    lines.push('');
    if (fm.outputs.test) lines.push(`- Test: \`${fm.outputs.test}\``);
    if (fm.outputs.impl) lines.push(`- Implementation: \`${fm.outputs.impl}\``);
    if (fm.outputs.types) lines.push(`- Types: \`${fm.outputs.types}\``);
    lines.push('');
  }

  // Content (objective, acceptance criteria, context from markdown body)
  if (item.content.trim()) {
    lines.push(item.content.trim());
    lines.push('');
  }

  // Rejection history
  if (fm.rejection_history?.length > 0) {
    lines.push('## Rejection History');
    lines.push('');
    lines.push('| # | Reason | Agent | Date |');
    lines.push('|---|--------|-------|------|');
    fm.rejection_history.forEach((r, i) => {
      lines.push(`| ${i + 1} | ${r.reason} | ${r.agent || 'Lynch'} | ${r.date?.split('T')[0] || '-'} |`);
    });
    lines.push('');
  }

  // Stats
  if (fm.rejection_count > 0) {
    lines.push(`**Rejection Count:** ${fm.rejection_count}`);
    lines.push('');
  }

  return lines.join('\n');
}

async function main() {
  try {
    // Check for --item flag first
    const itemArg = process.argv.find(a => a.startsWith('--item='));
    let itemId = itemArg?.split('=')[1];

    // If not in args, read from stdin
    if (!itemId) {
      const input = await readJsonInput();
      itemId = input.itemId || input.id;
    }

    if (!itemId) {
      const error = new Error('Item ID required. Use --item=ID or provide {"itemId": "ID"}');
      error.code = 'INVALID_INPUT';
      error.exitCode = 11;
      throw error;
    }

    const item = await findItem(MISSION_DIR, itemId);
    if (!item) {
      const error = new Error(`Item not found: ${itemId}`);
      error.code = 'ITEM_NOT_FOUND';
      error.exitCode = 20;
      error.itemId = itemId;
      throw error;
    }

    // Output pure markdown (not JSON)
    console.log(renderItem(item));

  } catch (err) {
    writeError(err);
  }
}

main();
