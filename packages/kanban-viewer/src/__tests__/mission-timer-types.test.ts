import { describe, it, expect } from 'vitest';
import type { Mission, BoardMetadata } from '../types';

/**
 * Tests for Mission interface - verifies optional started_at/created_at fields
 * and the 'planning' status for compatibility with board.json.
 */
describe('Mission Interface', () => {
  describe('date fields', () => {
    it('should accept mission with only created_at', () => {
      const mission: Mission = {
        name: 'Test Mission',
        created_at: '2026-01-17T06:00:00.000Z',
        status: 'active',
      };
      expect(mission.created_at).toBe('2026-01-17T06:00:00.000Z');
      expect(mission.started_at).toBeUndefined();
    });

    it('should accept mission with only started_at', () => {
      const mission: Mission = {
        name: 'Test Mission',
        started_at: '2026-01-17T06:00:00.000Z',
        status: 'active',
      };
      expect(mission.started_at).toBe('2026-01-17T06:00:00.000Z');
      expect(mission.created_at).toBeUndefined();
    });

    it('should accept mission with both started_at and created_at', () => {
      const mission: Mission = {
        name: 'Test Mission',
        started_at: '2026-01-17T06:00:00.000Z',
        created_at: '2026-01-17T05:00:00.000Z',
        status: 'active',
      };
      expect(mission.started_at).toBe('2026-01-17T06:00:00.000Z');
      expect(mission.created_at).toBe('2026-01-17T05:00:00.000Z');
    });

    it('should accept mission with neither date field', () => {
      const mission: Mission = {
        name: 'Test Mission',
        status: 'active',
      };
      expect(mission.started_at).toBeUndefined();
      expect(mission.created_at).toBeUndefined();
    });
  });

  describe('status field', () => {
    it('should accept active status', () => {
      const mission: Mission = {
        name: 'Test Mission',
        status: 'active',
      };
      expect(mission.status).toBe('active');
    });

    it('should accept paused status', () => {
      const mission: Mission = {
        name: 'Test Mission',
        status: 'paused',
      };
      expect(mission.status).toBe('paused');
    });

    it('should accept completed status', () => {
      const mission: Mission = {
        name: 'Test Mission',
        status: 'completed',
      };
      expect(mission.status).toBe('completed');
    });

    it('should accept planning status', () => {
      const mission: Mission = {
        name: 'Test Mission',
        status: 'planning',
      };
      expect(mission.status).toBe('planning');
    });
  });

  describe('BoardMetadata integration', () => {
    it('should work with BoardMetadata using created_at', () => {
      const metadata: BoardMetadata = {
        mission: {
          name: 'UI Enhancements v0.3.0',
          created_at: '2026-01-17T06:03:45.423Z',
          status: 'planning',
        },
        wip_limits: { testing: 2, implementing: 3 },
        phases: { briefings: ['001'], ready: [] },
        assignments: {},
        agents: { Hannibal: { status: 'idle' } },
        stats: {
          total_items: 1,
          completed: 0,
          in_progress: 0,
          blocked: 0,
          backlog: 1,
        },
        last_updated: '2026-01-17T06:03:45.423Z',
      };
      expect(metadata.mission.created_at).toBe('2026-01-17T06:03:45.423Z');
      expect(metadata.mission.status).toBe('planning');
    });
  });
});
