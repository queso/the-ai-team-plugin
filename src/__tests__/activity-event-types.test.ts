import { describe, it, expect } from 'vitest';
import type { BoardEventType, BoardEvent } from '../types';
import type { LogEntry } from '../lib/activity-log';

describe('Activity Event Types', () => {
  describe('BoardEventType union', () => {
    it('should include activity-entry-added as valid event type', () => {
      const eventType: BoardEventType = 'activity-entry-added';

      expect(eventType).toBe('activity-entry-added');
    });

    it('should include all existing event types', () => {
      const existingTypes: BoardEventType[] = [
        'item-added',
        'item-moved',
        'item-updated',
        'item-deleted',
        'board-updated',
      ];

      existingTypes.forEach((type) => {
        const validType: BoardEventType = type;
        expect(validType).toBe(type);
      });
    });

    it('should be compile-time type safe for invalid event types', () => {
      // @ts-expect-error - 'invalid-event' is not a valid BoardEventType
      const invalidType: BoardEventType = 'invalid-event';
      expect(invalidType).toBeDefined();
    });
  });

  describe('BoardEvent with logEntry', () => {
    it('should accept logEntry in data for activity-entry-added events', () => {
      const logEntry: LogEntry = {
        timestamp: '2026-01-16T10:00:00Z',
        agent: 'B.A.',
        message: 'Implementing JWT token refresh logic',
      };

      const event: BoardEvent = {
        type: 'activity-entry-added',
        timestamp: '2026-01-16T10:00:00Z',
        data: {
          logEntry,
        },
      };

      expect(event.type).toBe('activity-entry-added');
      expect(event.data.logEntry).toBeDefined();
      expect(event.data.logEntry?.agent).toBe('B.A.');
      expect(event.data.logEntry?.message).toBe('Implementing JWT token refresh logic');
    });

    it('should accept logEntry with highlightType field', () => {
      const logEntry: LogEntry = {
        timestamp: '2026-01-16T10:00:00Z',
        agent: 'Lynch',
        message: 'APPROVED: Code review passed all checks',
        highlightType: 'approved',
      };

      const event: BoardEvent = {
        type: 'activity-entry-added',
        timestamp: '2026-01-16T10:00:00Z',
        data: {
          logEntry,
        },
      };

      expect(event.data.logEntry?.highlightType).toBe('approved');
    });

    it('should not have logEntry on non-activity events', () => {
      const event: BoardEvent = {
        type: 'item-deleted',
        timestamp: '2026-01-16T10:00:00Z',
        data: {
          itemId: '001',
        },
      };

      expect(event.type).toBe('item-deleted');
      expect('logEntry' in event.data).toBe(false);
    });
  });

  describe('LogEntry type compatibility', () => {
    it('should have LogEntry with required timestamp, agent, and message', () => {
      const entry: LogEntry = {
        timestamp: '2026-01-16T10:00:00Z',
        agent: 'Murdock',
        message: 'Running test suite',
      };

      expect(entry.timestamp).toBeDefined();
      expect(entry.agent).toBeDefined();
      expect(entry.message).toBeDefined();
    });

    it('should accept LogEntry with optional highlightType', () => {
      const rejectedEntry: LogEntry = {
        timestamp: '2026-01-16T10:00:00Z',
        agent: 'Lynch',
        message: 'REJECTED: Missing unit tests',
        highlightType: 'rejected',
      };

      expect(rejectedEntry.highlightType).toBe('rejected');
    });

    it('should be compile-time type safe for highlightType values', () => {
      const entry: LogEntry = {
        timestamp: '2026-01-16T10:00:00Z',
        agent: 'Hannibal',
        message: 'ALERT: Critical security issue detected',
        // @ts-expect-error - 'warning' is not a valid highlightType
        highlightType: 'warning',
      };
      expect(entry).toBeDefined();
    });
  });

  describe('Event data field combinations', () => {
    it('should allow activity event with only logEntry', () => {
      const event: BoardEvent = {
        type: 'activity-entry-added',
        timestamp: '2026-01-16T10:00:00Z',
        data: {
          logEntry: {
            timestamp: '2026-01-16T10:00:00Z',
            agent: 'Face',
            message: 'Coordinating API integration',
          },
        },
      };

      expect(event.data.logEntry).toBeDefined();
      expect(event.data.logEntry.agent).toBe('Face');
    });

    it('should distinguish event types via discriminated union', () => {
      const activityEvent: BoardEvent = {
        type: 'activity-entry-added',
        timestamp: '2026-01-16T10:00:00Z',
        data: {
          logEntry: {
            timestamp: '2026-01-16T10:00:00Z',
            agent: 'B.A.',
            message: 'Started work on item 001',
          },
        },
      };

      // Narrowing via discriminated union
      if (activityEvent.type === 'activity-entry-added') {
        expect(activityEvent.data.logEntry).toBeDefined();
        expect(activityEvent.data.logEntry.agent).toBe('B.A.');
      }
    });
  });
});
