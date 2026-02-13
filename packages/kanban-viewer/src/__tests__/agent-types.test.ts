import { describe, it, expect } from 'vitest';
import type { AgentName } from '../types';

/**
 * Tests for AgentName type - verifies all 6 agents are valid values
 * including Amy (the investigator agent).
 */
describe('AgentName Type', () => {
  describe('valid agent names', () => {
    it('should accept Hannibal as a valid AgentName', () => {
      const agent: AgentName = 'Hannibal';
      expect(agent).toBe('Hannibal');
    });

    it('should accept Face as a valid AgentName', () => {
      const agent: AgentName = 'Face';
      expect(agent).toBe('Face');
    });

    it('should accept Murdock as a valid AgentName', () => {
      const agent: AgentName = 'Murdock';
      expect(agent).toBe('Murdock');
    });

    it('should accept B.A. as a valid AgentName', () => {
      const agent: AgentName = 'B.A.';
      expect(agent).toBe('B.A.');
    });

    it('should accept Amy as a valid AgentName', () => {
      const agent: AgentName = 'Amy';
      expect(agent).toBe('Amy');
    });

    it('should accept Lynch as a valid AgentName', () => {
      const agent: AgentName = 'Lynch';
      expect(agent).toBe('Lynch');
    });
  });

  describe('all agents collection', () => {
    it('should have exactly 6 valid agent names', () => {
      const allAgents: AgentName[] = [
        'Hannibal',
        'Face',
        'Murdock',
        'B.A.',
        'Amy',
        'Lynch',
      ];

      expect(allAgents).toHaveLength(6);
      allAgents.forEach((agent) => {
        expect(typeof agent).toBe('string');
      });
    });
  });

  describe('type safety', () => {
    it('should reject invalid agent names at compile time', () => {
      // @ts-expect-error - 'InvalidAgent' is not a valid AgentName
      const invalid: AgentName = 'InvalidAgent';
      expect(invalid).toBeDefined();
    });

    it('should reject empty string at compile time', () => {
      // @ts-expect-error - empty string is not a valid AgentName
      const empty: AgentName = '';
      expect(empty).toBeDefined();
    });
  });
});
