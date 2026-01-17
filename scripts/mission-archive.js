#!/usr/bin/env node
/**
 * mission-archive.js - Archive completed work items and optionally close mission.
 *
 * Usage:
 *   node mission-archive.js                    # Archive all done items
 *   echo '{"itemIds": ["001","002"]}' | node mission-archive.js  # Archive specific items
 *   node mission-archive.js --complete         # Archive and close mission
 *   node mission-archive.js --dry-run          # Show what would be archived
 */

import {
  readBoard,
  writeBoard,
  listStageItems,
  parseWorkItem,
  logActivity,
  STAGES
} from '../lib/board.js';
import { withLock } from '../lib/lock.js';
import { readJsonInput, writeJsonOutput, writeError } from '../lib/validate.js';
import { mkdir, rename, writeFile, readFile, copyFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const MISSION_DIR = join(process.cwd(), 'mission');

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

function generateSummary(board, items, startTime, endTime) {
  const lines = [];
  const missionName = board.mission?.name || board.project || 'Unnamed Mission';

  lines.push(`# Mission Complete: ${missionName}`);
  lines.push('');
  lines.push(`**Completed:** ${endTime}`);
  if (board.created_at) {
    const start = new Date(board.created_at);
    const end = new Date(endTime);
    const durationMs = end - start;
    const hours = Math.floor(durationMs / 3600000);
    const minutes = Math.floor((durationMs % 3600000) / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    lines.push(`**Duration:** ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
  }
  lines.push(`**Items Completed:** ${items.length}/${board.stats?.total_items || items.length}`);
  lines.push('');

  // Statistics
  lines.push('## Statistics');
  lines.push('');
  lines.push(`- Total rejections: ${board.stats?.rejected_count || 0}`);
  const blockedCount = items.filter(i => i.frontmatter.rejection_count >= 2).length;
  lines.push(`- Items requiring human input: ${blockedCount}`);
  const agentsUsed = new Set(['Hannibal', 'Face', 'Murdock', 'B.A.', 'Lynch']);
  lines.push(`- Agents utilized: ${agentsUsed.size}`);
  lines.push('');

  // Work Items table
  lines.push('## Work Items');
  lines.push('');
  lines.push('| ID | Title | Type | Rejections |');
  lines.push('|----|-------|------|------------|');
  for (const item of items.sort((a, b) => a.id.localeCompare(b.id))) {
    const fm = item.frontmatter;
    lines.push(`| ${fm.id} | ${fm.title} | ${fm.type || 'feature'} | ${fm.rejection_count || 0} |`);
  }
  lines.push('');

  // Rejection Summary (if any)
  const rejectedItems = items.filter(i => i.frontmatter.rejection_count > 0);
  if (rejectedItems.length > 0) {
    lines.push('## Rejection Summary');
    lines.push('');
    lines.push('| Item | Count | Reasons |');
    lines.push('|------|-------|---------|');
    for (const item of rejectedItems) {
      const fm = item.frontmatter;
      const reasons = fm.rejection_history?.map(r => r.reason).join('; ') || '-';
      lines.push(`| ${fm.id} | ${fm.rejection_count} | ${reasons} |`);
    }
    lines.push('');
  }

  // Timeline
  lines.push('## Timeline');
  lines.push('');
  if (board.created_at) {
    lines.push(`- ${board.created_at.split('T')[1]?.slice(0, 8) || '00:00:00'} - Mission started`);
  }
  lines.push(`- ${endTime.split('T')[1]?.slice(0, 8) || '00:00:00'} - Mission complete`);
  lines.push('');

  return lines.join('\n');
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const complete = args.includes('--complete');
    const dryRun = args.includes('--dry-run');

    // Read optional specific items from stdin
    let specificItems = null;
    if (!process.stdin.isTTY) {
      const input = await readJsonInput();
      if (input.itemIds?.length > 0) {
        specificItems = input.itemIds;
      }
    }

    const result = await withLock(MISSION_DIR, async () => {
      // Read board
      const board = await readBoard(MISSION_DIR);
      const missionName = board.mission?.name || board.project || 'mission';
      const archiveSlug = slugify(missionName);
      const archiveDir = join(MISSION_DIR, 'archive', archiveSlug);

      // Get items to archive
      const doneItems = await listStageItems(MISSION_DIR, 'done');
      let itemsToArchive;

      if (specificItems) {
        itemsToArchive = doneItems.filter(item => specificItems.includes(item.id));
        // Check all specified items are in done
        const doneIds = doneItems.map(i => i.id);
        const invalidIds = specificItems.filter(id => !doneIds.includes(id));
        if (invalidIds.length > 0) {
          const error = new Error(`Items not in done stage: ${invalidIds.join(', ')}`);
          error.code = 'INVALID_INPUT';
          error.exitCode = 11;
          throw error;
        }
      } else {
        itemsToArchive = doneItems;
      }

      if (itemsToArchive.length === 0) {
        return {
          success: true,
          archived: 0,
          message: 'No items to archive'
        };
      }

      // Dry run - just report what would be archived
      if (dryRun) {
        return {
          success: true,
          dryRun: true,
          wouldArchive: itemsToArchive.length,
          destination: archiveDir,
          items: itemsToArchive.map(i => i.id)
        };
      }

      // Create archive directory
      await mkdir(archiveDir, { recursive: true });

      // Move items to archive
      const archivedIds = [];
      for (const item of itemsToArchive) {
        const targetPath = join(archiveDir, item.filename);
        await rename(item.path, targetPath);
        archivedIds.push(item.id);
      }

      // Update board.json
      board.phases.done = board.phases.done.filter(id => !archivedIds.includes(id));

      // Update stats
      if (board.stats) {
        board.stats.completed = board.phases.done.length;
      }

      // Handle mission complete
      let summaryPath = null;
      const endTime = new Date().toISOString();

      if (complete) {
        // Read all archived items for summary
        const allArchivedItems = [];
        for (const item of itemsToArchive) {
          const targetPath = join(archiveDir, item.filename);
          const { frontmatter } = await parseWorkItem(targetPath);
          allArchivedItems.push({ id: item.id, frontmatter });
        }

        // Generate summary
        const summary = generateSummary(board, allArchivedItems, board.created_at, endTime);
        summaryPath = join(archiveDir, '_summary.md');
        await writeFile(summaryPath, summary);

        // Archive activity.log (copy to archive, then clear original)
        const activityLogPath = join(MISSION_DIR, 'activity.log');
        if (existsSync(activityLogPath)) {
          await copyFile(activityLogPath, join(archiveDir, 'activity.log'));
          // Clear the activity log for next mission
          await writeFile(activityLogPath, '');
        }

        // Archive board.json
        await copyFile(join(MISSION_DIR, 'board.json'), join(archiveDir, 'board.json'));

        // Mark mission complete
        if (!board.mission) board.mission = {};
        board.mission.status = 'completed';
        board.mission.completed_at = endTime;
      }

      // Write board
      await writeBoard(MISSION_DIR, board);

      // Log activity
      await logActivity(MISSION_DIR, 'Hannibal', `Archived ${archivedIds.length} items to ${archiveSlug}/`);
      if (complete) {
        await logActivity(MISSION_DIR, 'Hannibal', 'I love it when a plan comes together.');
      }

      return {
        success: true,
        archived: archivedIds.length,
        destination: archiveDir,
        items: archivedIds,
        missionComplete: complete,
        summary: summaryPath
      };
    });

    writeJsonOutput(result);

  } catch (err) {
    writeError(err);
  }
}

main();
