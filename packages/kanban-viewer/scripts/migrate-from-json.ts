#!/usr/bin/env npx ts-node

/**
 * Migration Script: board.json to SQLite
 *
 * Migrates data from the filesystem-based board.json storage to SQLite via Prisma.
 *
 * Usage:
 *   npx ts-node scripts/migrate-from-json.ts [mission-directory]
 *
 * Default mission directory: ./mission
 *
 * Features:
 * - Reads board.json and work item markdown files
 * - Maps filesystem stages to database stages
 * - Preserves dependency relationships
 * - Creates backup of board.json before migration
 * - Idempotent (safe to run multiple times)
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { getDatabaseUrl } from '../src/lib/db-path';

// Stage mapping from filesystem stages to database stages
const STAGE_MAPPING: Record<string, string> = {
  briefings: 'briefings',
  ready: 'ready',
  implementing: 'implementing',
  testing: 'testing',
  probing: 'probing',
  review: 'review',
  done: 'done',
  blocked: 'blocked',
};

// All filesystem stages to scan
const FILESYSTEM_STAGES = [
  'briefings',
  'ready',
  'testing',
  'implementing',
  'review',
  'probing',
  'done',
  'blocked',
];

// Database stages with their configuration
const DATABASE_STAGES = [
  { id: 'briefings', name: 'Briefings', order: 0, wipLimit: null },
  { id: 'ready', name: 'Ready', order: 1, wipLimit: 10 },
  { id: 'testing', name: 'Testing', order: 2, wipLimit: 2 },
  { id: 'implementing', name: 'Implementing', order: 3, wipLimit: 3 },
  { id: 'review', name: 'Review', order: 4, wipLimit: 2 },
  { id: 'probing', name: 'Probing', order: 5, wipLimit: null },
  { id: 'done', name: 'Done', order: 6, wipLimit: null },
  { id: 'blocked', name: 'Blocked', order: 7, wipLimit: null },
];

// Types for board.json structure
interface BoardJson {
  mission: {
    name: string;
    status: string;
    created_at: string;
    started_at?: string;
  };
  project: string;
  wip_limit: number;
  max_wip: number;
  created_at: string;
  updated_at: string;
  stats: {
    total_items: number;
    completed: number;
    in_flight: number;
    blocked: number;
    backlog: number;
    rejected_count: number;
  };
  phases: Record<string, string[]>;
  assignments: Record<
    string,
    {
      agent: string;
      started_at: string;
      completed_at?: string;
      status: string;
      message?: string;
    }
  >;
  agents: Record<
    string,
    {
      status: string;
      current_item?: string | null;
    }
  >;
  wip_limits: Record<string, number>;
  dependency_graph: Record<string, string[]>;
  history?: Record<
    string,
    Array<{
      stage: string;
      agent?: string;
      started_at?: string;
      completed_at?: string;
      duration_ms?: number;
    }>
  >;
}

// Parsed work item from markdown
interface ParsedWorkItem {
  id: string;
  title: string;
  type: string;
  status: string;
  rejectionCount: number;
  assignedAgent: string | null;
  dependencies: string[];
  outputs?: {
    test?: string;
    impl?: string;
    types?: string;
  };
  content: string;
  filesystemStage: string;
}

/**
 * Parse YAML frontmatter from markdown content
 */
function parseFrontmatter(content: string): { frontmatter: Record<string, unknown>; body: string } | null {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return null;
  }

  const [, frontmatterYaml, body] = match;

  // Simple YAML parsing for our specific format
  const frontmatter: Record<string, unknown> = {};
  let currentKey = '';
  let inArray = false;
  let arrayItems: string[] = [];
  let inObject = false;
  let objectData: Record<string, string> = {};

  const lines = frontmatterYaml.split('\n');

  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) continue;

    // Check for array item
    if (inArray && line.match(/^\s+-\s+/)) {
      const value = line.replace(/^\s+-\s+/, '').replace(/^['"]|['"]$/g, '').trim();
      arrayItems.push(value);
      continue;
    }

    // Check for nested object key-value
    if (inObject && line.match(/^\s+\w+:/)) {
      const objMatch = line.match(/^\s+(\w+):\s*(.*)$/);
      if (objMatch) {
        const [, key, value] = objMatch;
        objectData[key] = value.replace(/^['"]|['"]$/g, '').trim();
      }
      continue;
    }

    // End of array or object
    if (inArray && !line.match(/^\s+-/)) {
      frontmatter[currentKey] = arrayItems;
      inArray = false;
      arrayItems = [];
    }
    if (inObject && !line.match(/^\s+\w+:/)) {
      frontmatter[currentKey] = objectData;
      inObject = false;
      objectData = {};
    }

    // Check for new key-value pair
    const keyValueMatch = line.match(/^(\w+):\s*(.*)$/);
    if (keyValueMatch) {
      const [, key, value] = keyValueMatch;
      currentKey = key;

      if (value === '' || value === '>-') {
        // Check if next items form an array or object
        continue;
      }

      // Parse the value
      const cleanValue = value.replace(/^['"]|['"]$/g, '').trim();

      // Check for inline array
      if (value.startsWith('[') && value.endsWith(']')) {
        const arrayContent = value.slice(1, -1);
        if (arrayContent.trim() === '') {
          frontmatter[key] = [];
        } else {
          frontmatter[key] = arrayContent.split(',').map((v) => v.replace(/^['"]|['"]$/g, '').trim());
        }
      } else if (cleanValue === 'true') {
        frontmatter[key] = true;
      } else if (cleanValue === 'false') {
        frontmatter[key] = false;
      } else if (/^\d+$/.test(cleanValue)) {
        frontmatter[key] = parseInt(cleanValue, 10);
      } else {
        frontmatter[key] = cleanValue;
      }
    }

    // Check if line starts an array
    if (line.match(/^(\w+):$/)) {
      const key = line.replace(':', '').trim();
      currentKey = key;
      inArray = true;
      arrayItems = [];
    }

    // Check if line starts an object (like outputs:)
    if (line.match(/^(\w+):\s*$/) && !inArray) {
      currentKey = line.replace(':', '').trim();
      inObject = true;
      objectData = {};
    }
  }

  // Handle any remaining array or object
  if (inArray) {
    frontmatter[currentKey] = arrayItems;
  }
  if (inObject && Object.keys(objectData).length > 0) {
    frontmatter[currentKey] = objectData;
  }

  return { frontmatter, body };
}

/**
 * Read and parse a markdown work item file
 */
async function parseWorkItem(filePath: string, filesystemStage: string): Promise<ParsedWorkItem | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = parseFrontmatter(content);

    if (!parsed) {
      console.warn(`Skipping ${filePath}: Invalid frontmatter format`);
      return null;
    }

    const { frontmatter, body } = parsed;

    // Validate required fields
    if (!frontmatter.id) {
      console.warn(`Skipping ${filePath}: Missing required 'id' field`);
      return null;
    }

    const id = String(frontmatter.id);
    const title = String(frontmatter.title || 'Untitled');
    const type = String(frontmatter.type || 'feature');
    const status = String(frontmatter.status || 'pending');
    const rejectionCount =
      typeof frontmatter.rejection_count === 'number' ? frontmatter.rejection_count : 0;
    const assignedAgent = frontmatter.assigned_agent ? String(frontmatter.assigned_agent) : null;

    // Parse dependencies
    let dependencies: string[] = [];
    if (Array.isArray(frontmatter.dependencies)) {
      dependencies = frontmatter.dependencies.map(String);
    }

    // Parse outputs
    let outputs: ParsedWorkItem['outputs'];
    if (frontmatter.outputs && typeof frontmatter.outputs === 'object') {
      outputs = frontmatter.outputs as ParsedWorkItem['outputs'];
    }

    // Extract description from body (first paragraph after ## Objective)
    let description = body.trim();
    const objectiveMatch = body.match(/## Objective\n\n([\s\S]*?)(?=\n## |$)/);
    if (objectiveMatch) {
      description = objectiveMatch[1].trim();
    }

    return {
      id,
      title,
      type,
      status,
      rejectionCount,
      assignedAgent,
      dependencies,
      outputs,
      content: description,
      filesystemStage,
    };
  } catch (error) {
    console.warn(`Error parsing ${filePath}:`, error);
    return null;
  }
}

/**
 * Read all work items from a stage directory
 */
async function readStageItems(missionDir: string, stage: string): Promise<ParsedWorkItem[]> {
  const stageDir = path.join(missionDir, stage);
  const items: ParsedWorkItem[] = [];

  try {
    const entries = await fs.readdir(stageDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) {
        continue;
      }

      const filePath = path.join(stageDir, entry.name);
      const item = await parseWorkItem(filePath, stage);

      if (item) {
        items.push(item);
      }
    }
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      // Directory doesn't exist, skip silently
      return [];
    }
    console.warn(`Error reading stage directory ${stageDir}:`, error);
  }

  return items;
}

/**
 * Create a timestamped backup of board.json
 */
async function createBackup(filePath: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${filePath}.backup.${timestamp}`;

  // Check if backup already exists (unlikely with timestamp, but be safe)
  try {
    await fs.access(backupPath);
    // If we get here, file exists - add additional suffix
    const uniqueBackupPath = `${backupPath}.${Date.now()}`;
    await fs.copyFile(filePath, uniqueBackupPath);
    return uniqueBackupPath;
  } catch {
    // File doesn't exist, proceed with original backup path
    await fs.copyFile(filePath, backupPath);
    return backupPath;
  }
}

/**
 * Main migration function
 */
export async function migrate(missionDir: string = './mission'): Promise<{
  itemsCreated: number;
  dependenciesCreated: number;
  missionCreated: boolean;
  backupPath: string;
  errors: string[];
}> {
  const adapter = new PrismaLibSql({ url: getDatabaseUrl() });
  const prisma = new PrismaClient({ adapter });
  const errors: string[] = [];
  let itemsCreated = 0;
  let dependenciesCreated = 0;
  let missionCreated = false;
  let backupPath = '';

  try {
    await prisma.$connect();

    // Read board.json
    const boardJsonPath = path.join(missionDir, 'board.json');
    let boardJson: BoardJson;

    try {
      const boardContent = await fs.readFile(boardJsonPath, 'utf-8');
      boardJson = JSON.parse(boardContent);
    } catch (error) {
      throw new Error(`Failed to read board.json: ${error}`);
    }

    // Create backup
    backupPath = await createBackup(boardJsonPath);
    console.log(`Backup created: ${backupPath}`);

    // Read all work items from filesystem
    const allItems: ParsedWorkItem[] = [];
    for (const stage of FILESYSTEM_STAGES) {
      const stageItems = await readStageItems(missionDir, stage);
      allItems.push(...stageItems);
    }

    console.log(`Found ${allItems.length} work items to migrate`);

    // Run migration in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Create/update stages
      for (const stage of DATABASE_STAGES) {
        await tx.stage.upsert({
          where: { id: stage.id },
          create: stage,
          update: stage,
        });
      }
      console.log(`Created/updated ${DATABASE_STAGES.length} stages`);

      // 2. Determine projectId from board.json or use default
      const projectId = boardJson.project || 'kanban-viewer';

      // Ensure project exists
      await tx.project.upsert({
        where: { id: projectId },
        update: {},
        create: {
          id: projectId,
          name: projectId,
        },
      });

      // 3. Create/update mission
      const missionId = `M-${Date.now()}`;
      await tx.mission.upsert({
        where: { id: missionId },
        create: {
          id: missionId,
          name: boardJson.mission.name,
          state: boardJson.mission.status,
          prdPath: '',
          projectId,
          startedAt: boardJson.mission.started_at
            ? new Date(boardJson.mission.started_at)
            : new Date(),
        },
        update: {
          name: boardJson.mission.name,
          state: boardJson.mission.status,
        },
      });
      missionCreated = true;
      console.log(`Created mission: ${missionId}`);

      // 4. Create/update items
      for (const item of allItems) {
        const dbStageId = STAGE_MAPPING[item.filesystemStage] || 'backlog';

        // Get assignment info from board.json
        const assignment = boardJson.assignments[item.id];
        const assignedAgent = item.assignedAgent || assignment?.agent || null;

        // Determine completedAt for done items
        let completedAt: Date | null = null;
        if (dbStageId === 'done' && assignment?.completed_at) {
          completedAt = new Date(assignment.completed_at);
        } else if (dbStageId === 'done') {
          // Check history for completion time
          const itemHistory = boardJson.history?.[item.id];
          if (itemHistory) {
            const doneEntry = itemHistory.find((h) => h.stage === 'done' || h.completed_at);
            if (doneEntry?.completed_at) {
              completedAt = new Date(doneEntry.completed_at);
            }
          }
          // If still no completedAt, use current time for done items
          if (!completedAt) {
            completedAt = new Date();
          }
        }

        try {
          await tx.item.upsert({
            where: { id: item.id },
            create: {
              id: item.id,
              title: item.title,
              description: item.content,
              type: item.type,
              priority: 'medium', // Default priority
              stageId: dbStageId,
              projectId,
              assignedAgent,
              rejectionCount: item.rejectionCount,
              completedAt,
            },
            update: {
              title: item.title,
              description: item.content,
              type: item.type,
              stageId: dbStageId,
              assignedAgent,
              rejectionCount: item.rejectionCount,
              completedAt,
            },
          });
          itemsCreated++;
        } catch (error) {
          errors.push(`Failed to create item ${item.id}: ${error}`);
        }

        // Link item to mission
        try {
          await tx.missionItem.deleteMany({
            where: { itemId: item.id },
          });
          await tx.missionItem.create({
            data: {
              missionId,
              itemId: item.id,
            },
          });
        } catch (error) {
          // MissionItem link error is non-fatal
          console.warn(`Failed to link item ${item.id} to mission:`, error);
        }
      }
      console.log(`Created/updated ${itemsCreated} items`);

      // 5. Create dependencies
      // Use dependency_graph from board.json as authoritative source
      for (const [itemId, deps] of Object.entries(boardJson.dependency_graph)) {
        // Clear existing dependencies for this item (for idempotency)
        await tx.itemDependency.deleteMany({
          where: { itemId },
        });

        // Create new dependencies
        for (const depId of deps) {
          try {
            await tx.itemDependency.create({
              data: {
                itemId,
                dependsOnId: depId,
              },
            });
            dependenciesCreated++;
          } catch (error) {
            // Dependency creation might fail if item doesn't exist
            errors.push(`Failed to create dependency ${itemId} -> ${depId}: ${error}`);
          }
        }
      }
      console.log(`Created ${dependenciesCreated} dependencies`);
    });

    // Validate migration
    const migratedItems = await prisma.item.findMany();
    const migratedDeps = await prisma.itemDependency.findMany();

    console.log('\n=== Migration Validation ===');
    console.log(`Items in database: ${migratedItems.length}`);
    console.log(`Dependencies in database: ${migratedDeps.length}`);

    // Verify stage distribution
    const briefingsCount = migratedItems.filter((i) => i.stageId === 'briefings').length;
    const readyCount = migratedItems.filter((i) => i.stageId === 'ready').length;
    const testingCount = migratedItems.filter((i) => i.stageId === 'testing').length;
    const implementingCount = migratedItems.filter((i) => i.stageId === 'implementing').length;
    const reviewCount = migratedItems.filter((i) => i.stageId === 'review').length;
    const probingCount = migratedItems.filter((i) => i.stageId === 'probing').length;
    const doneCount = migratedItems.filter((i) => i.stageId === 'done').length;
    const blockedCount = migratedItems.filter((i) => i.stageId === 'blocked').length;

    console.log(`Stage distribution:`);
    console.log(`  - Briefings: ${briefingsCount}`);
    console.log(`  - Ready: ${readyCount}`);
    console.log(`  - Testing: ${testingCount}`);
    console.log(`  - Implementing: ${implementingCount}`);
    console.log(`  - Review: ${reviewCount}`);
    console.log(`  - Probing: ${probingCount}`);
    console.log(`  - Done: ${doneCount}`);
    console.log(`  - Blocked: ${blockedCount}`);

    if (errors.length > 0) {
      console.log(`\nWarnings/Errors (${errors.length}):`);
      for (const error of errors) {
        console.warn(`  - ${error}`);
      }
    }

    return {
      itemsCreated,
      dependenciesCreated,
      missionCreated,
      backupPath,
      errors,
    };
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  const missionDir = process.argv[2] || './mission';

  console.log('=== Board.json to SQLite Migration ===');
  console.log(`Mission directory: ${missionDir}`);
  console.log('');

  migrate(missionDir)
    .then((result) => {
      console.log('\n=== Migration Complete ===');
      console.log(`Items created/updated: ${result.itemsCreated}`);
      console.log(`Dependencies created: ${result.dependenciesCreated}`);
      console.log(`Mission created: ${result.missionCreated}`);
      console.log(`Backup: ${result.backupPath}`);

      if (result.errors.length > 0) {
        console.log(`\nCompleted with ${result.errors.length} warnings`);
        process.exit(1);
      }

      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
