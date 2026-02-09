import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Tests for Prisma database indexes (prisma/schema.prisma)
 *
 * These tests verify that the schema contains @@index directives for
 * commonly filtered fields to improve query performance:
 *
 * Item table:
 * - stageId: Filtered when querying items by stage
 * - archivedAt: Filtered when excluding archived items
 * - assignedAgent: Filtered when querying items by agent
 *
 * Mission table:
 * - archivedAt: Filtered when excluding archived missions
 */

// Read the schema file once for all tests
const SCHEMA_PATH = join(process.cwd(), 'prisma', 'schema.prisma');

function readSchemaFile(): string {
  return readFileSync(SCHEMA_PATH, 'utf-8');
}

describe('Prisma Schema Indexes', () => {
  describe('Item table indexes', () => {
    it('should have an index on stageId for stage filtering', () => {
      const schema = readSchemaFile();

      // Look for @@index directive containing stageId within the Item model
      const itemModelMatch = schema.match(/model Item \{[\s\S]*?^\}/m);
      expect(itemModelMatch).not.toBeNull();

      const itemModel = itemModelMatch![0];
      const hasStageIdIndex = /@@index\(\[stageId\]\)/.test(itemModel);

      expect(hasStageIdIndex).toBe(true);
    });

    it('should have an index on archivedAt for archive filtering', () => {
      const schema = readSchemaFile();

      const itemModelMatch = schema.match(/model Item \{[\s\S]*?^\}/m);
      expect(itemModelMatch).not.toBeNull();

      const itemModel = itemModelMatch![0];
      const hasArchivedAtIndex = /@@index\(\[archivedAt\]\)/.test(itemModel);

      expect(hasArchivedAtIndex).toBe(true);
    });

    it('should have an index on assignedAgent for agent filtering', () => {
      const schema = readSchemaFile();

      const itemModelMatch = schema.match(/model Item \{[\s\S]*?^\}/m);
      expect(itemModelMatch).not.toBeNull();

      const itemModel = itemModelMatch![0];
      const hasAssignedAgentIndex = /@@index\(\[assignedAgent\]\)/.test(itemModel);

      expect(hasAssignedAgentIndex).toBe(true);
    });

    it('should have all three required indexes', () => {
      const schema = readSchemaFile();

      const itemModelMatch = schema.match(/model Item \{[\s\S]*?^\}/m);
      expect(itemModelMatch).not.toBeNull();

      const itemModel = itemModelMatch![0];

      // Count the number of @@index directives in the Item model
      const indexMatches = itemModel.match(/@@index\(/g);
      expect(indexMatches).not.toBeNull();
      expect(indexMatches!.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Mission table indexes', () => {
    it('should have an index on archivedAt for archive filtering', () => {
      const schema = readSchemaFile();

      const missionModelMatch = schema.match(/model Mission \{[\s\S]*?^\}/m);
      expect(missionModelMatch).not.toBeNull();

      const missionModel = missionModelMatch![0];
      const hasArchivedAtIndex = /@@index\(\[archivedAt\]\)/.test(missionModel);

      expect(hasArchivedAtIndex).toBe(true);
    });
  });

  describe('Schema file structure', () => {
    it('should have schema file at prisma/schema.prisma', () => {
      // This test verifies the schema file exists and is readable
      expect(() => readSchemaFile()).not.toThrow();
    });

    it('should contain Item model', () => {
      const schema = readSchemaFile();
      expect(schema).toContain('model Item {');
    });

    it('should contain Mission model', () => {
      const schema = readSchemaFile();
      expect(schema).toContain('model Mission {');
    });
  });

  describe('Index syntax validation', () => {
    it('should use correct Prisma @@index syntax', () => {
      const schema = readSchemaFile();

      // All @@index directives should have proper syntax: @@index([fieldName])
      const indexDirectives = schema.match(/@@index\([^)]+\)/g) || [];

      for (const directive of indexDirectives) {
        // Should match pattern @@index([field]) or @@index([field1, field2])
        expect(directive).toMatch(/^@@index\(\[[^\]]+\]\)$/);
      }
    });
  });
});
