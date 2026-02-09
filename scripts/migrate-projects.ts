#!/usr/bin/env npx tsx

/**
 * Migration Script: Assign existing records to default project
 *
 * WI-039: Create data migration script for existing records
 *
 * This script assigns all existing Item, Mission, and ActivityLog records
 * that have null projectId to the default "kanban-viewer" project.
 *
 * Usage:
 *   npx tsx scripts/migrate-projects.ts
 *
 * Features:
 * - Creates default "kanban-viewer" project if it doesn't exist
 * - Updates all Items with null projectId to "kanban-viewer"
 * - Updates all Missions with null projectId to "kanban-viewer"
 * - Updates all ActivityLogs with null projectId to "kanban-viewer"
 * - Idempotent (safe to run multiple times)
 * - Uses transactions for atomicity
 */

import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { getDatabaseUrl } from '../src/lib/db-path';

// Default project configuration
const DEFAULT_PROJECT = {
  id: 'kanban-viewer',
  name: 'Kanban Viewer',
};

// Migration result interface
export interface MigrationResult {
  projectCreated: boolean;
  itemsUpdated: number;
  missionsUpdated: number;
  activityLogsUpdated: number;
  total: number;
}

/**
 * Create Prisma client with libSQL adapter
 */
function createPrismaClient(): PrismaClient {
  const adapter = new PrismaLibSql({ url: getDatabaseUrl() });

  return new PrismaClient({ adapter });
}

/**
 * Main migration function
 *
 * Creates the default project and assigns all existing records without
 * a projectId to the default project. Uses transactions for atomicity.
 */
export async function main(): Promise<MigrationResult> {
  const prisma = createPrismaClient();

  try {
    await prisma.$connect();
    console.log('Starting project migration...');

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create or update default project using upsert for idempotency
      const project = await tx.project.upsert({
        where: { id: DEFAULT_PROJECT.id },
        create: DEFAULT_PROJECT,
        update: {}, // No updates needed if exists
      });

      const projectCreated = project.id === DEFAULT_PROJECT.id;
      console.log(`Created default project: ${DEFAULT_PROJECT.id}`);

      // 2. Update all Items with null projectId
      const itemResult = await tx.item.updateMany({
        where: { projectId: null },
        data: { projectId: DEFAULT_PROJECT.id },
      });
      console.log(`Updated ${itemResult.count} items`);

      // 3. Update all Missions with null projectId
      const missionResult = await tx.mission.updateMany({
        where: { projectId: null },
        data: { projectId: DEFAULT_PROJECT.id },
      });
      console.log(`Updated ${missionResult.count} missions`);

      // 4. Update all ActivityLogs with null projectId
      const activityResult = await tx.activityLog.updateMany({
        where: { projectId: null },
        data: { projectId: DEFAULT_PROJECT.id },
      });
      console.log(`Updated ${activityResult.count} activity logs`);

      return {
        projectCreated,
        itemsUpdated: itemResult.count,
        missionsUpdated: missionResult.count,
        activityLogsUpdated: activityResult.count,
        total: itemResult.count + missionResult.count + activityResult.count,
      };
    });

    // Verification step
    const itemsWithoutProject = await prisma.item.count({
      where: { projectId: null },
    });
    const missionsWithoutProject = await prisma.mission.count({
      where: { projectId: null },
    });
    const logsWithoutProject = await prisma.activityLog.count({
      where: { projectId: null },
    });

    if (itemsWithoutProject > 0 || missionsWithoutProject > 0 || logsWithoutProject > 0) {
      console.warn('Warning: Some records still have null projectId');
      console.warn(`  Items: ${itemsWithoutProject}`);
      console.warn(`  Missions: ${missionsWithoutProject}`);
      console.warn(`  Activity Logs: ${logsWithoutProject}`);
    }

    console.log('Migration complete!');

    return result;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  console.log('=== Project Migration Script ===');
  console.log('');

  main()
    .then((result) => {
      console.log('\n=== Migration Summary ===');
      console.log(`Project created: ${result.projectCreated}`);
      console.log(`Items updated: ${result.itemsUpdated}`);
      console.log(`Missions updated: ${result.missionsUpdated}`);
      console.log(`Activity logs updated: ${result.activityLogsUpdated}`);
      console.log(`Total records updated: ${result.total}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
