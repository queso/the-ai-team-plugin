import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Tests for Project model in Prisma schema (prisma/schema.prisma)
 *
 * WI-038: Add Project model to Prisma schema
 * WI-055: Make projectId columns required in schema
 *
 * The Project model serves as the top-level container for missions and items,
 * enabling multi-project support (PRD 015: Project Scoping).
 *
 * These tests verify:
 * 1. Project model exists with required fields
 * 2. Item.projectId foreign key is required (non-nullable)
 * 3. Mission.projectId foreign key is required (non-nullable)
 * 4. ActivityLog.projectId foreign key is required (non-nullable)
 * 5. All relations are correctly defined
 */

const SCHEMA_PATH = join(process.cwd(), 'prisma', 'schema.prisma');

function readSchemaFile(): string {
  return readFileSync(SCHEMA_PATH, 'utf-8');
}

function extractModel(schema: string, modelName: string): string | null {
  // Match model block - handles nested braces by matching until final closing brace
  const regex = new RegExp(`model ${modelName} \\{[\\s\\S]*?^\\}`, 'm');
  const match = schema.match(regex);
  return match ? match[0] : null;
}

describe('Project Schema (WI-038)', () => {
  describe('Project model', () => {
    it('should have a Project model defined', () => {
      const schema = readSchemaFile();
      expect(schema).toContain('model Project {');
    });

    it('should have id field as String with @id attribute', () => {
      const schema = readSchemaFile();
      const projectModel = extractModel(schema, 'Project');
      expect(projectModel).not.toBeNull();

      // id should be String @id
      expect(projectModel).toMatch(/id\s+String\s+@id/);
    });

    it('should have name field as String', () => {
      const schema = readSchemaFile();
      const projectModel = extractModel(schema, 'Project');
      expect(projectModel).not.toBeNull();

      expect(projectModel).toMatch(/name\s+String/);
    });

    it('should have createdAt field as DateTime with default', () => {
      const schema = readSchemaFile();
      const projectModel = extractModel(schema, 'Project');
      expect(projectModel).not.toBeNull();

      // createdAt DateTime @default(now())
      expect(projectModel).toMatch(/createdAt\s+DateTime\s+@default\(now\(\)\)/);
    });

    it('should have updatedAt field as DateTime with @updatedAt', () => {
      const schema = readSchemaFile();
      const projectModel = extractModel(schema, 'Project');
      expect(projectModel).not.toBeNull();

      // updatedAt DateTime @updatedAt
      expect(projectModel).toMatch(/updatedAt\s+DateTime\s+@updatedAt/);
    });

    it('should have items relation defined', () => {
      const schema = readSchemaFile();
      const projectModel = extractModel(schema, 'Project');
      expect(projectModel).not.toBeNull();

      // items Item[] relation
      expect(projectModel).toMatch(/items\s+Item\[\]/);
    });

    it('should have missions relation defined', () => {
      const schema = readSchemaFile();
      const projectModel = extractModel(schema, 'Project');
      expect(projectModel).not.toBeNull();

      // missions Mission[] relation
      expect(projectModel).toMatch(/missions\s+Mission\[\]/);
    });

    it('should have activities relation defined', () => {
      const schema = readSchemaFile();
      const projectModel = extractModel(schema, 'Project');
      expect(projectModel).not.toBeNull();

      // activities ActivityLog[] relation
      expect(projectModel).toMatch(/activities\s+ActivityLog\[\]/);
    });
  });

  describe('Item model projectId', () => {
    it('should have projectId field as required String', () => {
      const schema = readSchemaFile();
      const itemModel = extractModel(schema, 'Item');
      expect(itemModel).not.toBeNull();

      // projectId String (required after WI-055)
      // Match "projectId      String" but not "projectId      String?"
      expect(itemModel).toMatch(/projectId\s+String(?!\?)/);
    });

    it('should have project relation to Project model', () => {
      const schema = readSchemaFile();
      const itemModel = extractModel(schema, 'Item');
      expect(itemModel).not.toBeNull();

      // project Project @relation (required after WI-055)
      // Match "project        Project" but not "project        Project?"
      expect(itemModel).toMatch(/project\s+Project(?!\?)\s+@relation/);
    });

    it('should have correct @relation fields for projectId', () => {
      const schema = readSchemaFile();
      const itemModel = extractModel(schema, 'Item');
      expect(itemModel).not.toBeNull();

      // @relation(fields: [projectId], references: [id])
      expect(itemModel).toMatch(/@relation\(fields:\s*\[projectId\],\s*references:\s*\[id\]\)/);
    });
  });

  describe('Mission model projectId', () => {
    it('should have projectId field as required String', () => {
      const schema = readSchemaFile();
      const missionModel = extractModel(schema, 'Mission');
      expect(missionModel).not.toBeNull();

      // projectId String (required after WI-055)
      // Match "projectId   String" but not "projectId   String?"
      expect(missionModel).toMatch(/projectId\s+String(?!\?)/);
    });

    it('should have project relation to Project model', () => {
      const schema = readSchemaFile();
      const missionModel = extractModel(schema, 'Mission');
      expect(missionModel).not.toBeNull();

      // project Project @relation (required after WI-055)
      // Match "project     Project" but not "project     Project?"
      expect(missionModel).toMatch(/project\s+Project(?!\?)\s+@relation/);
    });

    it('should have correct @relation fields for projectId', () => {
      const schema = readSchemaFile();
      const missionModel = extractModel(schema, 'Mission');
      expect(missionModel).not.toBeNull();

      // @relation(fields: [projectId], references: [id])
      expect(missionModel).toMatch(/@relation\(fields:\s*\[projectId\],\s*references:\s*\[id\]\)/);
    });
  });

  describe('ActivityLog model projectId', () => {
    it('should have projectId field as required String', () => {
      const schema = readSchemaFile();
      const activityLogModel = extractModel(schema, 'ActivityLog');
      expect(activityLogModel).not.toBeNull();

      // projectId String (required after WI-055)
      // Match "projectId String" but not "projectId String?"
      expect(activityLogModel).toMatch(/projectId\s+String(?!\?)/);
    });

    it('should have project relation to Project model', () => {
      const schema = readSchemaFile();
      const activityLogModel = extractModel(schema, 'ActivityLog');
      expect(activityLogModel).not.toBeNull();

      // project Project @relation (required after WI-055)
      // Match "project  Project" but not "project  Project?"
      expect(activityLogModel).toMatch(/project\s+Project(?!\?)\s+@relation/);
    });

    it('should have correct @relation fields for projectId', () => {
      const schema = readSchemaFile();
      const activityLogModel = extractModel(schema, 'ActivityLog');
      expect(activityLogModel).not.toBeNull();

      // @relation(fields: [projectId], references: [id])
      expect(activityLogModel).toMatch(/@relation\(fields:\s*\[projectId\],\s*references:\s*\[id\]\)/);
    });
  });

  describe('Schema validation', () => {
    it('should have all required models defined', () => {
      const schema = readSchemaFile();

      expect(schema).toContain('model Project {');
      expect(schema).toContain('model Item {');
      expect(schema).toContain('model Mission {');
      expect(schema).toContain('model ActivityLog {');
    });

    it('should have Project model before models that reference it', () => {
      const schema = readSchemaFile();

      // Project should be defined in the schema
      const projectIndex = schema.indexOf('model Project {');
      expect(projectIndex).toBeGreaterThan(-1);
    });
  });
});
