import { describe, it, expect } from 'vitest';
import {
  deriveAgentStatusesFromWorkItems,
  ACTIVE_STAGES,
} from '@/lib/agent-status-utils';
import type { WorkItem, Stage, AgentName } from '@/types';

/**
 * Factory function to create a minimal work item for testing.
 */
function createWorkItem(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    id: '001',
    title: 'Test Item',
    type: 'feature',
    status: 'pending',
    rejection_count: 0,
    dependencies: [],
    outputs: {},
    created_at: '2026-01-20T00:00:00Z',
    updated_at: '2026-01-20T00:00:00Z',
    stage: 'briefings',
    content: 'Test content',
    ...overrides,
  };
}

describe('agent-status-utils', () => {
  describe('ACTIVE_STAGES constant', () => {
    it('should include probing, testing, implementing, and review', () => {
      expect(ACTIVE_STAGES).toContain('probing');
      expect(ACTIVE_STAGES).toContain('testing');
      expect(ACTIVE_STAGES).toContain('implementing');
      expect(ACTIVE_STAGES).toContain('review');
    });

    it('should not include briefings, ready, done, or blocked', () => {
      expect(ACTIVE_STAGES).not.toContain('briefings');
      expect(ACTIVE_STAGES).not.toContain('ready');
      expect(ACTIVE_STAGES).not.toContain('done');
      expect(ACTIVE_STAGES).not.toContain('blocked');
    });

    it('should have exactly 4 stages', () => {
      expect(ACTIVE_STAGES).toHaveLength(4);
    });
  });

  describe('deriveAgentStatusesFromWorkItems', () => {
    describe('basic functionality', () => {
      it('should return empty object when no work items', () => {
        const result = deriveAgentStatusesFromWorkItems([]);
        expect(result).toEqual({});
      });

      it('should return empty object when no items in active stages', () => {
        const items = [
          createWorkItem({ id: '001', stage: 'briefings', assigned_agent: 'Amy' }),
          createWorkItem({ id: '002', stage: 'ready', assigned_agent: 'B.A.' }),
          createWorkItem({ id: '003', stage: 'done', assigned_agent: 'Murdock' }),
          createWorkItem({ id: '004', stage: 'blocked', assigned_agent: 'Face' }),
        ];

        const result = deriveAgentStatusesFromWorkItems(items);
        expect(result).toEqual({});
      });

      it('should mark agent as active when assigned to item in probing stage', () => {
        const items = [
          createWorkItem({ id: '001', stage: 'probing', assigned_agent: 'Amy' }),
        ];

        const result = deriveAgentStatusesFromWorkItems(items);
        expect(result).toEqual({ Amy: 'active' });
      });

      it('should mark agent as active when assigned to item in testing stage', () => {
        const items = [
          createWorkItem({ id: '001', stage: 'testing', assigned_agent: 'Murdock' }),
        ];

        const result = deriveAgentStatusesFromWorkItems(items);
        expect(result).toEqual({ Murdock: 'active' });
      });

      it('should mark agent as active when assigned to item in implementing stage', () => {
        const items = [
          createWorkItem({ id: '001', stage: 'implementing', assigned_agent: 'B.A.' }),
        ];

        const result = deriveAgentStatusesFromWorkItems(items);
        expect(result).toEqual({ 'B.A.': 'active' });
      });

      it('should mark agent as active when assigned to item in review stage', () => {
        const items = [
          createWorkItem({ id: '001', stage: 'review', assigned_agent: 'Lynch' }),
        ];

        const result = deriveAgentStatusesFromWorkItems(items);
        expect(result).toEqual({ Lynch: 'active' });
      });
    });

    describe('multiple agents', () => {
      it('should mark multiple agents as active when they have items in active stages', () => {
        const items = [
          createWorkItem({ id: '001', stage: 'probing', assigned_agent: 'Amy' }),
          createWorkItem({ id: '002', stage: 'implementing', assigned_agent: 'B.A.' }),
          createWorkItem({ id: '003', stage: 'testing', assigned_agent: 'Murdock' }),
        ];

        const result = deriveAgentStatusesFromWorkItems(items);
        expect(result).toEqual({
          Amy: 'active',
          'B.A.': 'active',
          Murdock: 'active',
        });
      });

      it('should only mark agents as active for items in active stages', () => {
        const items = [
          createWorkItem({ id: '001', stage: 'probing', assigned_agent: 'Amy' }),
          createWorkItem({ id: '002', stage: 'briefings', assigned_agent: 'B.A.' }),
          createWorkItem({ id: '003', stage: 'done', assigned_agent: 'Murdock' }),
        ];

        const result = deriveAgentStatusesFromWorkItems(items);
        expect(result).toEqual({ Amy: 'active' });
        expect(result['B.A.']).toBeUndefined();
        expect(result.Murdock).toBeUndefined();
      });
    });

    describe('edge cases', () => {
      it('should handle items without assigned_agent', () => {
        const items = [
          createWorkItem({ id: '001', stage: 'implementing' }),
          createWorkItem({ id: '002', stage: 'testing', assigned_agent: undefined }),
        ];

        const result = deriveAgentStatusesFromWorkItems(items);
        expect(result).toEqual({});
      });

      it('should handle same agent assigned to multiple items in active stages', () => {
        const items = [
          createWorkItem({ id: '001', stage: 'probing', assigned_agent: 'Amy' }),
          createWorkItem({ id: '002', stage: 'testing', assigned_agent: 'Amy' }),
        ];

        const result = deriveAgentStatusesFromWorkItems(items);
        expect(result).toEqual({ Amy: 'active' });
      });

      it('should handle invalid agent names gracefully', () => {
        const items = [
          createWorkItem({
            id: '001',
            stage: 'implementing',
            assigned_agent: 'InvalidAgent' as AgentName,
          }),
        ];

        const result = deriveAgentStatusesFromWorkItems(items);
        expect(result).toEqual({});
      });

      it('should handle all valid agent names', () => {
        const agents: AgentName[] = ['Hannibal', 'Face', 'Murdock', 'B.A.', 'Amy', 'Lynch', 'Tawnia'];
        const items = agents.map((agent, index) =>
          createWorkItem({
            id: `00${index + 1}`,
            stage: 'implementing',
            assigned_agent: agent,
          })
        );

        const result = deriveAgentStatusesFromWorkItems(items);
        expect(Object.keys(result)).toHaveLength(7);
        agents.forEach((agent) => {
          expect(result[agent]).toBe('active');
        });
      });
    });

    describe('all active stages', () => {
      it.each(ACTIVE_STAGES)(
        'should mark agent as active for items in %s stage',
        (stage: Stage) => {
          const items = [
            createWorkItem({ id: '001', stage, assigned_agent: 'Face' }),
          ];

          const result = deriveAgentStatusesFromWorkItems(items);
          expect(result).toEqual({ Face: 'active' });
        }
      );
    });

    describe('all non-active stages', () => {
      const nonActiveStages: Stage[] = ['briefings', 'ready', 'done', 'blocked'];

      it.each(nonActiveStages)(
        'should NOT mark agent as active for items in %s stage',
        (stage: Stage) => {
          const items = [
            createWorkItem({ id: '001', stage, assigned_agent: 'Face' }),
          ];

          const result = deriveAgentStatusesFromWorkItems(items);
          expect(result).toEqual({});
        }
      );
    });

    describe('realistic scenario', () => {
      it('should correctly derive statuses for a typical board state', () => {
        const items = [
          // Items in non-active stages (should not affect status)
          createWorkItem({ id: '001', stage: 'briefings' }),
          createWorkItem({ id: '002', stage: 'ready', assigned_agent: 'Hannibal' }),
          createWorkItem({ id: '003', stage: 'done', assigned_agent: 'Tawnia' }),
          createWorkItem({ id: '004', stage: 'blocked', assigned_agent: 'Lynch' }),
          // Items in active stages (should mark agents as active)
          createWorkItem({ id: '005', stage: 'probing', assigned_agent: 'Amy' }),
          createWorkItem({ id: '006', stage: 'testing', assigned_agent: 'Murdock' }),
          createWorkItem({ id: '007', stage: 'implementing', assigned_agent: 'B.A.' }),
          createWorkItem({ id: '008', stage: 'review', assigned_agent: 'Face' }),
        ];

        const result = deriveAgentStatusesFromWorkItems(items);

        // Only agents with items in active stages should be marked active
        expect(result).toEqual({
          Amy: 'active',
          Murdock: 'active',
          'B.A.': 'active',
          Face: 'active',
        });

        // Agents without items in active stages should not be in the result
        expect(result.Hannibal).toBeUndefined();
        expect(result.Lynch).toBeUndefined();
        expect(result.Tawnia).toBeUndefined();
      });
    });
  });
});
