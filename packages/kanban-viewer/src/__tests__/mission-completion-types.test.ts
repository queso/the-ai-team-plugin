import { describe, it, expect } from 'vitest';
import type { Mission, BoardMetadata } from '../types';

/**
 * Tests for Mission completion fields - verifies completed_at and duration_ms
 * optional fields for tracking when missions are completed and how long they took.
 */
describe('Mission Completion Fields', () => {
  describe('completed_at field', () => {
    it('should accept mission with completed_at as optional string', () => {
      const mission: Mission = {
        name: 'Completed Mission',
        status: 'completed',
        completed_at: '2026-01-17T12:00:00.000Z',
      };
      expect(mission.completed_at).toBe('2026-01-17T12:00:00.000Z');
    });

    it('should accept mission without completed_at', () => {
      const mission: Mission = {
        name: 'Active Mission',
        status: 'active',
      };
      expect(mission.completed_at).toBeUndefined();
    });
  });

  describe('duration_ms field', () => {
    it('should accept mission with duration_ms as optional number', () => {
      const mission: Mission = {
        name: 'Timed Mission',
        status: 'completed',
        duration_ms: 3600000, // 1 hour in milliseconds
      };
      expect(mission.duration_ms).toBe(3600000);
    });

    it('should accept mission without duration_ms', () => {
      const mission: Mission = {
        name: 'Active Mission',
        status: 'active',
      };
      expect(mission.duration_ms).toBeUndefined();
    });

    it('should accept zero duration_ms', () => {
      const mission: Mission = {
        name: 'Instant Mission',
        status: 'completed',
        duration_ms: 0,
      };
      expect(mission.duration_ms).toBe(0);
    });
  });

  describe('backward compatibility', () => {
    it('should work with existing Mission objects without new fields', () => {
      const existingMission: Mission = {
        name: 'Legacy Mission',
        started_at: '2026-01-17T06:00:00.000Z',
        created_at: '2026-01-17T05:00:00.000Z',
        status: 'active',
      };
      expect(existingMission.name).toBe('Legacy Mission');
      expect(existingMission.started_at).toBe('2026-01-17T06:00:00.000Z');
      expect(existingMission.created_at).toBe('2026-01-17T05:00:00.000Z');
      expect(existingMission.status).toBe('active');
      expect(existingMission.completed_at).toBeUndefined();
      expect(existingMission.duration_ms).toBeUndefined();
    });

    it('should work with minimal Mission (only required fields)', () => {
      const minimalMission: Mission = {
        name: 'Minimal Mission',
        status: 'planning',
      };
      expect(minimalMission.name).toBe('Minimal Mission');
      expect(minimalMission.status).toBe('planning');
      expect(minimalMission.completed_at).toBeUndefined();
      expect(minimalMission.duration_ms).toBeUndefined();
    });
  });

  describe('complete mission with all fields', () => {
    it('should accept mission with both new completion fields set', () => {
      const completeMission: Mission = {
        name: 'Full Mission',
        started_at: '2026-01-17T06:00:00.000Z',
        created_at: '2026-01-17T05:00:00.000Z',
        status: 'completed',
        completed_at: '2026-01-17T12:00:00.000Z',
        duration_ms: 21600000, // 6 hours
      };
      expect(completeMission.name).toBe('Full Mission');
      expect(completeMission.started_at).toBe('2026-01-17T06:00:00.000Z');
      expect(completeMission.created_at).toBe('2026-01-17T05:00:00.000Z');
      expect(completeMission.status).toBe('completed');
      expect(completeMission.completed_at).toBe('2026-01-17T12:00:00.000Z');
      expect(completeMission.duration_ms).toBe(21600000);
    });
  });

  describe('BoardMetadata integration', () => {
    it('should work with BoardMetadata containing completed mission', () => {
      const metadata: BoardMetadata = {
        mission: {
          name: 'UI Enhancements v0.3.0',
          started_at: '2026-01-17T06:00:00.000Z',
          status: 'completed',
          completed_at: '2026-01-17T18:00:00.000Z',
          duration_ms: 43200000, // 12 hours
        },
        wip_limits: { testing: 2, implementing: 3 },
        phases: { briefings: [], done: ['001', '002'] },
        assignments: {},
        agents: { Hannibal: { status: 'idle' } },
        stats: {
          total_items: 2,
          completed: 2,
          in_progress: 0,
          blocked: 0,
          backlog: 0,
        },
        last_updated: '2026-01-17T18:00:00.000Z',
      };
      expect(metadata.mission.completed_at).toBe('2026-01-17T18:00:00.000Z');
      expect(metadata.mission.duration_ms).toBe(43200000);
      expect(metadata.mission.status).toBe('completed');
    });
  });
});
