#!/usr/bin/env node
/**
 * mission-init.js - Initialize a new mission, archiving any existing mission first.
 *
 * Usage:
 *   node mission-init.js                           # Interactive - warns if existing mission
 *   node mission-init.js --force                   # Archive existing and create new
 *   echo '{"name": "My Mission"}' | node mission-init.js
 *
 * This script should be run at the START of /ateam plan to ensure clean state.
 */

import { mkdir, readFile, writeFile, rename, rm, readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const MISSION_DIR = join(process.cwd(), 'mission');
const STAGES = ['briefings', 'ready', 'testing', 'implementing', 'review', 'probing', 'done', 'blocked'];

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

async function archiveExistingMission() {
  const boardPath = join(MISSION_DIR, 'board.json');

  if (!existsSync(boardPath)) {
    return { archived: false, reason: 'no_existing_mission' };
  }

  // Read existing board
  const boardContent = await readFile(boardPath, 'utf8');
  const board = JSON.parse(boardContent);
  const missionName = board.mission?.name || board.project || 'unnamed-mission';
  const archiveSlug = slugify(missionName) + '-' + Date.now();
  const archiveDir = join(MISSION_DIR, 'archive', archiveSlug);

  // Create archive directory
  await mkdir(archiveDir, { recursive: true });

  // Move all items from all stages to archive
  let archivedCount = 0;
  for (const stage of STAGES) {
    const stageDir = join(MISSION_DIR, stage);
    try {
      const files = await readdir(stageDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          await rename(join(stageDir, file), join(archiveDir, file));
          archivedCount++;
        }
      }
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }

  // Archive activity.log
  const activityLogPath = join(MISSION_DIR, 'activity.log');
  if (existsSync(activityLogPath)) {
    await rename(activityLogPath, join(archiveDir, 'activity.log'));
  }

  // Archive board.json
  await rename(boardPath, join(archiveDir, 'board.json'));

  // Generate archive summary
  const summary = `# Archived Mission: ${missionName}

**Archived:** ${new Date().toISOString()}
**Items:** ${archivedCount}
**Status:** ${board.mission?.status || 'unknown'}

## Final Stats
- Completed: ${board.stats?.completed || 0}
- Blocked: ${board.stats?.blocked || 0}
- Rejected: ${board.stats?.rejected_count || 0}
`;
  await writeFile(join(archiveDir, '_archive-info.md'), summary);

  return {
    archived: true,
    missionName,
    archiveDir,
    itemCount: archivedCount
  };
}

async function createFreshMission(missionName) {
  // Create stage directories
  for (const stage of STAGES) {
    await mkdir(join(MISSION_DIR, stage), { recursive: true });
  }

  // Create archive directory
  await mkdir(join(MISSION_DIR, 'archive'), { recursive: true });

  // Create empty activity.log
  await writeFile(join(MISSION_DIR, 'activity.log'), '');

  // Create initial board.json
  const board = {
    mission: {
      name: missionName || 'New Mission',
      status: 'planning',
      created_at: new Date().toISOString()
    },
    project: missionName || 'New Mission',
    wip_limit: 4,
    max_wip: 6,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    stats: {
      total_items: 0,
      completed: 0,
      in_flight: 0,
      blocked: 0,
      rejected_count: 0
    },
    phases: {
      briefings: [],
      ready: [],
      testing: [],
      implementing: [],
      review: [],
      probing: [],
      done: [],
      blocked: []
    },
    assignments: {},
    agents: {
      Hannibal: { status: 'idle' },
      Face: { status: 'idle' },
      Murdock: { status: 'idle' },
      'B.A.': { status: 'idle' },
      Lynch: { status: 'idle' },
      Amy: { status: 'idle' }
    },
    wip_limits: {
      testing: 3,
      implementing: 4,
      review: 3,
      probing: 3
    },
    dependency_graph: {},
    parallel_groups: {}
  };

  await writeFile(join(MISSION_DIR, 'board.json'), JSON.stringify(board, null, 2));

  // Log mission start
  const timestamp = new Date().toISOString();
  await writeFile(
    join(MISSION_DIR, 'activity.log'),
    `${timestamp} [Hannibal] Mission initialized: ${missionName || 'New Mission'}\n`
  );

  return board;
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const force = args.includes('--force');

    // Read mission name from stdin if provided
    let missionName = null;
    if (!process.stdin.isTTY) {
      let data = '';
      process.stdin.setEncoding('utf8');
      for await (const chunk of process.stdin) {
        data += chunk;
      }
      if (data.trim()) {
        try {
          const input = JSON.parse(data);
          missionName = input.name;
        } catch {
          // Not JSON, ignore
        }
      }
    }

    // Check for existing mission
    const boardPath = join(MISSION_DIR, 'board.json');
    const hasExisting = existsSync(boardPath);

    if (hasExisting && !force) {
      // Read existing mission info
      const board = JSON.parse(await readFile(boardPath, 'utf8'));
      const existingName = board.mission?.name || board.project || 'unnamed';
      const itemCount = board.stats?.total_items || 0;
      const completedCount = board.stats?.completed || 0;

      console.error(JSON.stringify({
        error: 'EXISTING_MISSION',
        message: `Existing mission found: "${existingName}" (${completedCount}/${itemCount} complete). Use --force to archive and start fresh.`,
        existingMission: {
          name: existingName,
          total: itemCount,
          completed: completedCount,
          status: board.mission?.status || 'unknown'
        }
      }, null, 2));
      process.exit(1);
    }

    // Archive existing mission if present
    let archiveResult = { archived: false };
    if (hasExisting) {
      archiveResult = await archiveExistingMission();
    }

    // Create fresh mission
    const board = await createFreshMission(missionName);

    // Output result
    const result = {
      success: true,
      initialized: true,
      missionName: board.mission.name,
      archived: archiveResult.archived
    };

    if (archiveResult.archived) {
      result.previousMission = {
        name: archiveResult.missionName,
        archiveDir: archiveResult.archiveDir,
        itemCount: archiveResult.itemCount
      };
    }

    console.log(JSON.stringify(result, null, 2));

  } catch (err) {
    console.error(JSON.stringify({
      error: err.code || 'INIT_FAILED',
      message: err.message
    }, null, 2));
    process.exit(1);
  }
}

main();
