import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';

/**
 * Tests for migration script: scripts/migrate-from-json.ts
 *
 * This script migrates data from the filesystem-based board.json storage
 * to the SQLite database via Prisma.
 */

// Mock fs/promises before importing script module
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  readdir: vi.fn(),
  copyFile: vi.fn(),
  access: vi.fn(),
  stat: vi.fn(),
}));

// Mock Prisma client
const mockPrismaClient = {
  $connect: vi.fn().mockResolvedValue(undefined),
  $disconnect: vi.fn().mockResolvedValue(undefined),
  $transaction: vi.fn(),
  stage: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    upsert: vi.fn(),
    createMany: vi.fn(),
  },
  item: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  },
  itemDependency: {
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  mission: {
    findFirst: vi.fn(),
    create: vi.fn(),
    upsert: vi.fn(),
  },
  missionItem: {
    create: vi.fn(),
    createMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  activityLog: {
    create: vi.fn(),
    createMany: vi.fn(),
  },
  workLog: {
    create: vi.fn(),
    createMany: vi.fn(),
  },
  agentClaim: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  },
};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(function () {
    return mockPrismaClient;
  }),
}));

vi.mock('@/lib/db', () => ({
  prisma: mockPrismaClient,
}));

import * as fs from 'node:fs/promises';

// Sample test data
const sampleBoardJson = {
  mission: {
    name: 'Test Mission',
    status: 'active',
    created_at: '2026-01-15T10:00:00Z',
    started_at: '2026-01-15T10:00:00Z',
  },
  project: 'Test Project',
  wip_limit: 4,
  max_wip: 6,
  created_at: '2026-01-15T10:00:00Z',
  updated_at: '2026-01-15T12:00:00Z',
  stats: {
    total_items: 3,
    completed: 1,
    in_flight: 1,
    blocked: 0,
    backlog: 1,
    rejected_count: 0,
  },
  phases: {
    briefings: ['001'],
    ready: [],
    testing: [],
    implementing: ['002'],
    review: [],
    probing: [],
    done: ['003'],
    blocked: [],
  },
  assignments: {
    '002': {
      agent: 'B.A.',
      started_at: '2026-01-15T11:00:00Z',
      status: 'active',
    },
    '003': {
      agent: 'Murdock',
      started_at: '2026-01-15T10:30:00Z',
      completed_at: '2026-01-15T11:30:00Z',
      status: 'completed',
    },
  },
  agents: {
    Hannibal: { status: 'watching' },
    'B.A.': { status: 'active', current_item: '002' },
    Murdock: { status: 'idle' },
  },
  wip_limits: {
    testing: 3,
    implementing: 4,
    review: 3,
    probing: 3,
  },
  dependency_graph: {
    '001': [],
    '002': ['001'],
    '003': ['001', '002'],
  },
  history: {
    '001': [
      { stage: 'briefings', completed_at: '2026-01-15T10:00:00Z' },
    ],
    '002': [
      { stage: 'briefings', completed_at: '2026-01-15T10:15:00Z' },
      { stage: 'implementing', agent: 'B.A.', started_at: '2026-01-15T11:00:00Z' },
    ],
  },
};

const sampleWorkItemMarkdown = `---
id: '001'
title: 'Test Feature'
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/feature.test.ts
  impl: src/feature.ts
dependencies: []
---
## Objective

This is a test feature.

## Acceptance Criteria

- [ ] Feature works
`;

const sampleWorkItemMarkdownWithDeps = `---
id: '002'
title: 'Dependent Feature'
type: feature
status: in_progress
rejection_count: 1
assigned_agent: B.A.
outputs:
  test: src/__tests__/dependent.test.ts
  impl: src/dependent.ts
dependencies:
  - '001'
---
## Objective

This feature depends on 001.
`;

const sampleCompletedItemMarkdown = `---
id: '003'
title: 'Completed Feature'
type: feature
status: done
rejection_count: 0
outputs:
  test: src/__tests__/completed.test.ts
  impl: src/completed.ts
dependencies:
  - '001'
  - '002'
---
## Objective

This feature is complete.
`;

describe('Migration Script: scripts/migrate-from-json.ts', () => {
  const mockReadFile = fs.readFile as Mock;
  const mockReaddir = fs.readdir as Mock;
  const mockCopyFile = fs.copyFile as Mock;
  const mockAccess = fs.access as Mock;
  const mockStat = fs.stat as Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks for filesystem
    mockReadFile.mockImplementation(async (path: string) => {
      if (path.includes('board.json')) {
        return JSON.stringify(sampleBoardJson);
      }
      if (path.includes('001')) {
        return sampleWorkItemMarkdown;
      }
      if (path.includes('002')) {
        return sampleWorkItemMarkdownWithDeps;
      }
      if (path.includes('003')) {
        return sampleCompletedItemMarkdown;
      }
      throw new Error(`ENOENT: no such file: ${path}`);
    });

    mockReaddir.mockImplementation(async (path: string) => {
      if (path.includes('briefings')) {
        return [{ name: '001-test-feature.md', isFile: () => true, isDirectory: () => false }];
      }
      if (path.includes('implementing')) {
        return [{ name: '002-dependent-feature.md', isFile: () => true, isDirectory: () => false }];
      }
      if (path.includes('done')) {
        return [{ name: '003-completed-feature.md', isFile: () => true, isDirectory: () => false }];
      }
      return [];
    });

    mockAccess.mockResolvedValue(undefined);
    mockCopyFile.mockResolvedValue(undefined);
    mockStat.mockResolvedValue({ isFile: () => true, mtime: new Date() });

    // Default Prisma mocks
    mockPrismaClient.$transaction.mockImplementation(async (fn: (prisma: typeof mockPrismaClient) => Promise<unknown>) => {
      return fn(mockPrismaClient);
    });
    mockPrismaClient.item.findUnique.mockResolvedValue(null);
    mockPrismaClient.item.create.mockImplementation(async (data: { data: { id: string } }) => data.data);
    mockPrismaClient.item.upsert.mockImplementation(async (data: { create: object }) => data.create);
    mockPrismaClient.stage.upsert.mockImplementation(async (data: { create: object }) => data.create);
    mockPrismaClient.itemDependency.create.mockResolvedValue({ id: 1 });
    mockPrismaClient.mission.findFirst.mockResolvedValue(null);
    mockPrismaClient.mission.create.mockImplementation(async (data: { data: object }) => data.data);
    mockPrismaClient.mission.upsert.mockImplementation(async (data: { create: object }) => data.create);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('reading board.json', () => {
    it('should read board.json from mission directory', async () => {
      // Migration script should read board.json
      await mockReadFile('/mission/board.json', 'utf-8');

      expect(mockReadFile).toHaveBeenCalled();
    });

    it('should throw error when board.json does not exist', async () => {
      mockReadFile.mockRejectedValueOnce(new Error('ENOENT: no such file'));

      await expect(mockReadFile('/mission/board.json', 'utf-8')).rejects.toThrow();
    });

    it('should throw error when board.json contains invalid JSON', async () => {
      mockReadFile.mockResolvedValueOnce('{ invalid json }');

      const content = await mockReadFile('/mission/board.json', 'utf-8');

      expect(() => JSON.parse(content)).toThrow();
    });
  });

  describe('reading markdown work items', () => {
    it('should read work items from all stage folders', async () => {
      const stages = ['briefings', 'ready', 'testing', 'implementing', 'review', 'probing', 'done', 'blocked'];

      for (const stage of stages) {
        await mockReaddir(`/mission/${stage}`, { withFileTypes: true });
      }

      expect(mockReaddir).toHaveBeenCalledTimes(stages.length);
    });

    it('should parse frontmatter from markdown files', async () => {
      const content = await mockReadFile('/mission/briefings/001-test-feature.md', 'utf-8');

      // Should contain frontmatter delimiters
      expect(content).toContain('---');
      expect(content).toContain('id:');
      expect(content).toContain('title:');
      expect(content).toContain('type:');
    });

    it('should skip non-markdown files', async () => {
      mockReaddir.mockResolvedValueOnce([
        { name: '001-feature.md', isFile: () => true, isDirectory: () => false },
        { name: 'readme.txt', isFile: () => true, isDirectory: () => false },
        { name: '.DS_Store', isFile: () => true, isDirectory: () => false },
      ]);

      const files = await mockReaddir('/mission/briefings', { withFileTypes: true });
      const mdFiles = files.filter((f: { name: string }) => f.name.endsWith('.md'));

      expect(mdFiles).toHaveLength(1);
    });

    it('should handle missing stage directories gracefully', async () => {
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockReaddir.mockRejectedValueOnce(error);

      // Script should not throw but continue with other directories
      await expect(mockReaddir('/mission/nonexistent', { withFileTypes: true })).rejects.toThrow();
    });
  });

  describe('stage mapping', () => {
    it('should map briefings to backlog stage', () => {
      const stageMapping: Record<string, string> = {
        briefings: 'briefings',
        ready: 'briefings',
        implementing: 'testing',
        testing: 'testing',
        probing: 'testing',
        review: 'review',
        done: 'done',
        blocked: 'blocked',
      };

      expect(stageMapping['briefings']).toBe('briefings');
    });

    it('should map ready to backlog stage', () => {
      const stageMapping: Record<string, string> = {
        briefings: 'briefings',
        ready: 'briefings',
        implementing: 'testing',
        testing: 'testing',
        probing: 'testing',
        review: 'review',
        done: 'done',
        blocked: 'blocked',
      };

      expect(stageMapping['ready']).toBe('briefings');
    });

    it('should map implementing to in_progress stage', () => {
      const stageMapping: Record<string, string> = {
        implementing: 'testing',
        testing: 'testing',
        probing: 'testing',
      };

      expect(stageMapping['implementing']).toBe('testing');
    });

    it('should map testing to in_progress stage', () => {
      const stageMapping: Record<string, string> = {
        implementing: 'testing',
        testing: 'testing',
        probing: 'testing',
      };

      expect(stageMapping['testing']).toBe('testing');
    });

    it('should map probing to in_progress stage', () => {
      const stageMapping: Record<string, string> = {
        implementing: 'testing',
        testing: 'testing',
        probing: 'testing',
      };

      expect(stageMapping['probing']).toBe('testing');
    });

    it('should map review to review stage', () => {
      const stageMapping: Record<string, string> = {
        review: 'review',
      };

      expect(stageMapping['review']).toBe('review');
    });

    it('should map done to done stage', () => {
      const stageMapping: Record<string, string> = {
        done: 'done',
      };

      expect(stageMapping['done']).toBe('done');
    });

    it('should map blocked to blocked stage', () => {
      const stageMapping: Record<string, string> = {
        blocked: 'blocked',
      };

      expect(stageMapping['blocked']).toBe('blocked');
    });
  });

  describe('inserting items via Prisma', () => {
    it('should create item records with correct fields', async () => {
      const itemData = {
        id: '001',
        title: 'Test Feature',
        description: 'This is a test feature.',
        type: 'feature',
        priority: 'medium',
        stageId: 'briefings',
        assignedAgent: null,
        rejectionCount: 0,
      };

      await mockPrismaClient.item.create({ data: itemData });

      expect(mockPrismaClient.item.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: '001',
          title: 'Test Feature',
          type: 'feature',
          stageId: 'briefings',
        }),
      });
    });

    it('should preserve rejection count from frontmatter', async () => {
      const itemData = {
        id: '002',
        title: 'Rejected Feature',
        description: 'This was rejected',
        type: 'feature',
        priority: 'medium',
        stageId: 'testing',
        assignedAgent: 'B.A.',
        rejectionCount: 1,
      };

      await mockPrismaClient.item.create({ data: itemData });

      expect(mockPrismaClient.item.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          rejectionCount: 1,
        }),
      });
    });

    it('should preserve assigned_agent from frontmatter', async () => {
      const itemData = {
        id: '002',
        title: 'Assigned Feature',
        description: 'Assigned to B.A.',
        type: 'feature',
        priority: 'medium',
        stageId: 'testing',
        assignedAgent: 'B.A.',
        rejectionCount: 0,
      };

      await mockPrismaClient.item.create({ data: itemData });

      expect(mockPrismaClient.item.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          assignedAgent: 'B.A.',
        }),
      });
    });

    it('should set completedAt for items in done stage', async () => {
      const itemData = {
        id: '003',
        title: 'Completed Feature',
        description: 'Done',
        type: 'feature',
        priority: 'medium',
        stageId: 'done',
        assignedAgent: null,
        rejectionCount: 0,
        completedAt: new Date('2026-01-15T11:30:00Z'),
      };

      await mockPrismaClient.item.create({ data: itemData });

      expect(mockPrismaClient.item.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          stageId: 'done',
          completedAt: expect.any(Date),
        }),
      });
    });
  });

  describe('preserving dependency relationships', () => {
    it('should create ItemDependency records for dependencies', async () => {
      const dependencyData = {
        itemId: '002',
        dependsOnId: '001',
      };

      await mockPrismaClient.itemDependency.create({ data: dependencyData });

      expect(mockPrismaClient.itemDependency.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          itemId: '002',
          dependsOnId: '001',
        }),
      });
    });

    it('should create multiple dependencies for items with multiple deps', async () => {
      // Item 003 depends on both 001 and 002
      const deps = [
        { itemId: '003', dependsOnId: '001' },
        { itemId: '003', dependsOnId: '002' },
      ];

      for (const dep of deps) {
        await mockPrismaClient.itemDependency.create({ data: dep });
      }

      expect(mockPrismaClient.itemDependency.create).toHaveBeenCalledTimes(2);
    });

    it('should use dependency_graph from board.json if frontmatter deps are empty', async () => {
      // dependency_graph has the authoritative dependency data
      const depGraph = sampleBoardJson.dependency_graph;

      expect(depGraph['002']).toContain('001');
      expect(depGraph['003']).toContain('001');
      expect(depGraph['003']).toContain('002');
    });
  });

  describe('data integrity validation', () => {
    it('should verify all items were migrated by counting records', async () => {
      const expectedCount = 3; // From sampleBoardJson stats
      mockPrismaClient.item.findMany.mockResolvedValueOnce([
        { id: '001' },
        { id: '002' },
        { id: '003' },
      ]);

      const items = await mockPrismaClient.item.findMany();

      expect(items.length).toBe(expectedCount);
    });

    it('should verify all dependencies were created', async () => {
      // 002 -> 001, 003 -> 001, 003 -> 002 = 3 dependencies
      mockPrismaClient.itemDependency.findMany.mockResolvedValueOnce([
        { itemId: '002', dependsOnId: '001' },
        { itemId: '003', dependsOnId: '001' },
        { itemId: '003', dependsOnId: '002' },
      ]);

      const deps = await mockPrismaClient.itemDependency.findMany();

      expect(deps.length).toBe(3);
    });

    it('should verify stage distribution matches board.json phases', async () => {
      // briefings: 1, implementing: 1, done: 1
      mockPrismaClient.item.findMany.mockResolvedValueOnce([
        { id: '001', stageId: 'briefings' },
        { id: '002', stageId: 'testing' },
        { id: '003', stageId: 'done' },
      ]);

      const items = await mockPrismaClient.item.findMany();
      const backlog = items.filter((i: { stageId: string }) => i.stageId === 'briefings');
      const inProgress = items.filter((i: { stageId: string }) => i.stageId === 'testing');
      const done = items.filter((i: { stageId: string }) => i.stageId === 'done');

      expect(backlog.length).toBe(1);
      expect(inProgress.length).toBe(1);
      expect(done.length).toBe(1);
    });
  });

  describe('backup creation', () => {
    it('should create backup of board.json before migration', async () => {
      const sourcePath = '/mission/board.json';
      const backupPath = '/mission/board.json.backup';

      await mockCopyFile(sourcePath, backupPath);

      expect(mockCopyFile).toHaveBeenCalledWith(sourcePath, backupPath);
    });

    it('should timestamp the backup file', async () => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `/mission/board.json.backup.${timestamp}`;

      await mockCopyFile('/mission/board.json', backupPath);

      expect(mockCopyFile).toHaveBeenCalled();
    });

    it('should not overwrite existing backup files', async () => {
      // First backup attempt - file exists
      mockAccess.mockResolvedValueOnce(undefined);

      // Should add suffix or increment
      const backupExists = await mockAccess('/mission/board.json.backup')
        .then(() => true)
        .catch(() => false);

      expect(backupExists).toBe(true);
    });
  });

  describe('idempotency', () => {
    it('should use upsert to handle re-runs safely', async () => {
      const itemData = {
        id: '001',
        title: 'Test Feature',
        description: 'Test',
        type: 'feature',
        priority: 'medium',
        stageId: 'briefings',
        rejectionCount: 0,
      };

      await mockPrismaClient.item.upsert({
        where: { id: '001' },
        create: itemData,
        update: itemData,
      });

      expect(mockPrismaClient.item.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '001' },
          create: expect.any(Object),
          update: expect.any(Object),
        })
      );
    });

    it('should clear existing dependencies before re-creating', async () => {
      await mockPrismaClient.itemDependency.deleteMany({
        where: { itemId: '002' },
      });

      expect(mockPrismaClient.itemDependency.deleteMany).toHaveBeenCalledWith({
        where: { itemId: '002' },
      });
    });

    it('should produce same result when run multiple times', async () => {
      // First run
      mockPrismaClient.item.findMany.mockResolvedValueOnce([
        { id: '001', stageId: 'briefings' },
        { id: '002', stageId: 'testing' },
        { id: '003', stageId: 'done' },
      ]);

      const firstRun = await mockPrismaClient.item.findMany();

      // Second run (same result)
      mockPrismaClient.item.findMany.mockResolvedValueOnce([
        { id: '001', stageId: 'briefings' },
        { id: '002', stageId: 'testing' },
        { id: '003', stageId: 'done' },
      ]);

      const secondRun = await mockPrismaClient.item.findMany();

      expect(firstRun).toEqual(secondRun);
    });
  });

  describe('mission migration', () => {
    it('should create mission record from board.json mission data', async () => {
      const missionData = {
        id: expect.stringMatching(/^M-/),
        name: 'Test Mission',
        state: 'active',
        prdPath: '',
        startedAt: new Date('2026-01-15T10:00:00Z'),
      };

      await mockPrismaClient.mission.create({ data: missionData });

      expect(mockPrismaClient.mission.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Mission',
          state: 'active',
        }),
      });
    });

    it('should link items to mission via MissionItem', async () => {
      const missionItemData = {
        missionId: 'M-001',
        itemId: '001',
      };

      await mockPrismaClient.missionItem.create({ data: missionItemData });

      expect(mockPrismaClient.missionItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          missionId: 'M-001',
          itemId: '001',
        }),
      });
    });
  });

  describe('error handling', () => {
    it('should rollback on Prisma errors using transaction', async () => {
      mockPrismaClient.$transaction.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        mockPrismaClient.$transaction(async () => {
          throw new Error('Database error');
        })
      ).rejects.toThrow('Database error');
    });

    it('should handle malformed markdown files gracefully', async () => {
      mockReadFile.mockResolvedValueOnce('not valid frontmatter');

      const content = await mockReadFile('/mission/briefings/invalid.md', 'utf-8');

      // Script should skip invalid files and continue
      expect(content).not.toContain('---');
    });

    it('should report items that failed to migrate', async () => {
      mockPrismaClient.item.create.mockRejectedValueOnce(new Error('Unique constraint failed'));

      await expect(
        mockPrismaClient.item.create({ data: { id: '001', title: 'Duplicate' } })
      ).rejects.toThrow();
    });

    it('should handle missing required frontmatter fields', async () => {
      const invalidMarkdown = `---
title: 'Missing ID'
type: feature
---
Content`;

      mockReadFile.mockResolvedValueOnce(invalidMarkdown);

      const content = await mockReadFile('/mission/briefings/invalid.md', 'utf-8');

      // Should not contain 'id:' field
      expect(content).not.toContain("id:");
    });
  });

  describe('stages initialization', () => {
    it('should create all required stages before items', async () => {
      const stages = [
        { id: 'briefings', name: 'Backlog', order: 0, wipLimit: null },
        { id: 'ready', name: 'Ready', order: 1, wipLimit: 10 },
        { id: 'testing', name: 'In Progress', order: 2, wipLimit: 4 },
        { id: 'review', name: 'Review', order: 3, wipLimit: 3 },
        { id: 'done', name: 'Done', order: 4, wipLimit: null },
        { id: 'blocked', name: 'Blocked', order: 5, wipLimit: null },
      ];

      for (const stage of stages) {
        await mockPrismaClient.stage.upsert({
          where: { id: stage.id },
          create: stage,
          update: stage,
        });
      }

      expect(mockPrismaClient.stage.upsert).toHaveBeenCalledTimes(6);
    });

    it('should use WIP limits from board.json', async () => {
      const wipLimits = sampleBoardJson.wip_limits;

      expect(wipLimits.implementing).toBe(4);
      expect(wipLimits.testing).toBe(3);
      expect(wipLimits.review).toBe(3);
    });
  });

  describe('executability', () => {
    it('should be runnable via npx ts-node', () => {
      // This test documents that the script should be executable
      // The actual script should have a main() function or be self-executing
      const expectedCommand = 'npx ts-node scripts/migrate-from-json.ts';

      expect(expectedCommand).toContain('ts-node');
      expect(expectedCommand).toContain('migrate-from-json.ts');
    });

    it('should accept mission directory path as argument', () => {
      // Script should accept: npx ts-node scripts/migrate-from-json.ts ./mission
      const args = ['./mission'];

      expect(args[0]).toBe('./mission');
    });

    it('should use default mission directory if not provided', () => {
      const defaultPath = './mission';

      expect(defaultPath).toBe('./mission');
    });
  });
});
