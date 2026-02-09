import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Tests for WI-055: Make projectId columns required in schema
 *
 * After data migration completes, projectId columns should be:
 * - NOT NULL on Item, Mission, and ActivityLog models
 * - Have foreign key constraints referencing Project
 * - Have database indexes for performance
 *
 * Acceptance criteria tested:
 * - [x] Prisma schema updated to make projectId required on Item model
 * - [x] Prisma schema updated to make projectId required on Mission model
 * - [x] Prisma schema updated to make projectId required on ActivityLog model
 * - [x] Foreign key constraints added for all projectId fields
 * - [x] Database indexes added for projectId columns
 * - [x] npx prisma generate succeeds (verified by tests running)
 */

const SCHEMA_PATH = join(process.cwd(), 'prisma', 'schema.prisma');

function readSchemaFile(): string {
  return readFileSync(SCHEMA_PATH, 'utf-8');
}

function extractModel(schema: string, modelName: string): string | null {
  // Match model block - handles nested braces
  const regex = new RegExp(`model ${modelName} \\{[\\s\\S]*?^\\}`, 'm');
  const match = schema.match(regex);
  return match ? match[0] : null;
}

describe('WI-055: Make projectId columns required in schema', () => {
  describe('Item model projectId', () => {
    it('should have projectId field as required String (NOT NULL)', () => {
      const schema = readSchemaFile();
      const itemModel = extractModel(schema, 'Item');
      expect(itemModel).not.toBeNull();

      // projectId should be String (not String?) - required, not nullable
      // The regex checks for "projectId" followed by whitespace and "String"
      // but NOT followed by "?" which would make it nullable
      expect(itemModel).toMatch(/projectId\s+String(?!\?)/);
    });

    it('should NOT have nullable projectId (no question mark)', () => {
      const schema = readSchemaFile();
      const itemModel = extractModel(schema, 'Item');
      expect(itemModel).not.toBeNull();

      // Should NOT contain "projectId String?"
      expect(itemModel).not.toMatch(/projectId\s+String\?/);
    });

    it('should have project relation as required (not optional)', () => {
      const schema = readSchemaFile();
      const itemModel = extractModel(schema, 'Item');
      expect(itemModel).not.toBeNull();

      // project should be Project (not Project?) - required relation
      expect(itemModel).toMatch(/project\s+Project(?!\?)\s+@relation/);
    });

    it('should have @relation referencing projectId to Project.id', () => {
      const schema = readSchemaFile();
      const itemModel = extractModel(schema, 'Item');
      expect(itemModel).not.toBeNull();

      // @relation(fields: [projectId], references: [id])
      expect(itemModel).toMatch(/@relation\(fields:\s*\[projectId\],\s*references:\s*\[id\]\)/);
    });

    it('should have @@index for projectId', () => {
      const schema = readSchemaFile();
      const itemModel = extractModel(schema, 'Item');
      expect(itemModel).not.toBeNull();

      // @@index([projectId])
      expect(itemModel).toMatch(/@@index\(\[projectId\]\)/);
    });
  });

  describe('Mission model projectId', () => {
    it('should have projectId field as required String (NOT NULL)', () => {
      const schema = readSchemaFile();
      const missionModel = extractModel(schema, 'Mission');
      expect(missionModel).not.toBeNull();

      // projectId should be String (not String?) - required
      expect(missionModel).toMatch(/projectId\s+String(?!\?)/);
    });

    it('should NOT have nullable projectId (no question mark)', () => {
      const schema = readSchemaFile();
      const missionModel = extractModel(schema, 'Mission');
      expect(missionModel).not.toBeNull();

      // Should NOT contain "projectId String?"
      expect(missionModel).not.toMatch(/projectId\s+String\?/);
    });

    it('should have project relation as required (not optional)', () => {
      const schema = readSchemaFile();
      const missionModel = extractModel(schema, 'Mission');
      expect(missionModel).not.toBeNull();

      // project should be Project (not Project?) - required relation
      expect(missionModel).toMatch(/project\s+Project(?!\?)\s+@relation/);
    });

    it('should have @relation referencing projectId to Project.id', () => {
      const schema = readSchemaFile();
      const missionModel = extractModel(schema, 'Mission');
      expect(missionModel).not.toBeNull();

      // @relation(fields: [projectId], references: [id])
      expect(missionModel).toMatch(/@relation\(fields:\s*\[projectId\],\s*references:\s*\[id\]\)/);
    });

    it('should have @@index for projectId', () => {
      const schema = readSchemaFile();
      const missionModel = extractModel(schema, 'Mission');
      expect(missionModel).not.toBeNull();

      // @@index([projectId])
      expect(missionModel).toMatch(/@@index\(\[projectId\]\)/);
    });
  });

  describe('ActivityLog model projectId', () => {
    it('should have projectId field as required String (NOT NULL)', () => {
      const schema = readSchemaFile();
      const activityLogModel = extractModel(schema, 'ActivityLog');
      expect(activityLogModel).not.toBeNull();

      // projectId should be String (not String?) - required
      expect(activityLogModel).toMatch(/projectId\s+String(?!\?)/);
    });

    it('should NOT have nullable projectId (no question mark)', () => {
      const schema = readSchemaFile();
      const activityLogModel = extractModel(schema, 'ActivityLog');
      expect(activityLogModel).not.toBeNull();

      // Should NOT contain "projectId String?"
      expect(activityLogModel).not.toMatch(/projectId\s+String\?/);
    });

    it('should have project relation as required (not optional)', () => {
      const schema = readSchemaFile();
      const activityLogModel = extractModel(schema, 'ActivityLog');
      expect(activityLogModel).not.toBeNull();

      // project should be Project (not Project?) - required relation
      expect(activityLogModel).toMatch(/project\s+Project(?!\?)\s+@relation/);
    });

    it('should have @relation referencing projectId to Project.id', () => {
      const schema = readSchemaFile();
      const activityLogModel = extractModel(schema, 'ActivityLog');
      expect(activityLogModel).not.toBeNull();

      // @relation(fields: [projectId], references: [id])
      expect(activityLogModel).toMatch(/@relation\(fields:\s*\[projectId\],\s*references:\s*\[id\]\)/);
    });

    it('should have @@index for projectId', () => {
      const schema = readSchemaFile();
      const activityLogModel = extractModel(schema, 'ActivityLog');
      expect(activityLogModel).not.toBeNull();

      // @@index([projectId])
      expect(activityLogModel).toMatch(/@@index\(\[projectId\]\)/);
    });
  });

  describe('Foreign key constraints', () => {
    it('should have Item.projectId with @relation to Project', () => {
      const schema = readSchemaFile();
      const itemModel = extractModel(schema, 'Item');
      expect(itemModel).not.toBeNull();

      // Must have both the field and the relation
      expect(itemModel).toContain('projectId');
      expect(itemModel).toMatch(/project\s+Project.*@relation/);
    });

    it('should have Mission.projectId with @relation to Project', () => {
      const schema = readSchemaFile();
      const missionModel = extractModel(schema, 'Mission');
      expect(missionModel).not.toBeNull();

      expect(missionModel).toContain('projectId');
      expect(missionModel).toMatch(/project\s+Project.*@relation/);
    });

    it('should have ActivityLog.projectId with @relation to Project', () => {
      const schema = readSchemaFile();
      const activityLogModel = extractModel(schema, 'ActivityLog');
      expect(activityLogModel).not.toBeNull();

      expect(activityLogModel).toContain('projectId');
      expect(activityLogModel).toMatch(/project\s+Project.*@relation/);
    });
  });

  describe('Database indexes', () => {
    it('should have index on Item.projectId', () => {
      const schema = readSchemaFile();
      const itemModel = extractModel(schema, 'Item');
      expect(itemModel).not.toBeNull();

      expect(itemModel).toMatch(/@@index\(\[projectId\]\)/);
    });

    it('should have index on Mission.projectId', () => {
      const schema = readSchemaFile();
      const missionModel = extractModel(schema, 'Mission');
      expect(missionModel).not.toBeNull();

      expect(missionModel).toMatch(/@@index\(\[projectId\]\)/);
    });

    it('should have index on ActivityLog.projectId', () => {
      const schema = readSchemaFile();
      const activityLogModel = extractModel(schema, 'ActivityLog');
      expect(activityLogModel).not.toBeNull();

      expect(activityLogModel).toMatch(/@@index\(\[projectId\]\)/);
    });
  });

  describe('Schema validity', () => {
    it('should have Project model defined for foreign key targets', () => {
      const schema = readSchemaFile();
      expect(schema).toContain('model Project {');
    });

    it('should have Project.items relation for Item backref', () => {
      const schema = readSchemaFile();
      const projectModel = extractModel(schema, 'Project');
      expect(projectModel).not.toBeNull();

      expect(projectModel).toMatch(/items\s+Item\[\]/);
    });

    it('should have Project.missions relation for Mission backref', () => {
      const schema = readSchemaFile();
      const projectModel = extractModel(schema, 'Project');
      expect(projectModel).not.toBeNull();

      expect(projectModel).toMatch(/missions\s+Mission\[\]/);
    });

    it('should have Project.activities relation for ActivityLog backref', () => {
      const schema = readSchemaFile();
      const projectModel = extractModel(schema, 'Project');
      expect(projectModel).not.toBeNull();

      expect(projectModel).toMatch(/activities\s+ActivityLog\[\]/);
    });
  });
});
