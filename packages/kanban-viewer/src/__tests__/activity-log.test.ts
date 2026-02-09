import { describe, it, expect } from 'vitest';
import { parseLogEntry, parseLogFile, type LogEntry } from '../lib/activity-log';

describe('Activity Log Parser', () => {
  describe('parseLogEntry', () => {
    describe('valid entries', () => {
      it('should parse a standard log entry with timestamp, agent, and message', () => {
        const line = '2026-01-15T10:42:15Z [B.A.] Implementing JWT token refresh logic';
        const result = parseLogEntry(line);

        expect(result).not.toBeNull();
        expect(result?.timestamp).toBe('2026-01-15T10:42:15Z');
        expect(result?.agent).toBe('B.A.');
        expect(result?.message).toBe('Implementing JWT token refresh logic');
        expect(result?.highlightType).toBeUndefined();
      });

      it('should parse entry with APPROVED prefix and set highlightType', () => {
        const line = '2026-01-15T10:41:40Z [Lynch] APPROVED 006-database-schema';
        const result = parseLogEntry(line);

        expect(result).not.toBeNull();
        expect(result?.timestamp).toBe('2026-01-15T10:41:40Z');
        expect(result?.agent).toBe('Lynch');
        expect(result?.message).toBe('APPROVED 006-database-schema');
        expect(result?.highlightType).toBe('approved');
      });

      it('should parse entry with REJECTED prefix and set highlightType', () => {
        const line = '2026-01-15T10:40:00Z [Lynch] REJECTED 007-api-endpoint - missing tests';
        const result = parseLogEntry(line);

        expect(result).not.toBeNull();
        expect(result?.timestamp).toBe('2026-01-15T10:40:00Z');
        expect(result?.agent).toBe('Lynch');
        expect(result?.message).toBe('REJECTED 007-api-endpoint - missing tests');
        expect(result?.highlightType).toBe('rejected');
      });

      it('should parse entry with ALERT: prefix and set highlightType', () => {
        const line = '2026-01-15T10:41:00Z [Hannibal] ALERT: Item 024 requires human input';
        const result = parseLogEntry(line);

        expect(result).not.toBeNull();
        expect(result?.timestamp).toBe('2026-01-15T10:41:00Z');
        expect(result?.agent).toBe('Hannibal');
        expect(result?.message).toBe('ALERT: Item 024 requires human input');
        expect(result?.highlightType).toBe('alert');
      });

      it('should parse entry with COMMITTED prefix and set highlightType', () => {
        const line = '2026-01-15T10:45:00Z [Tawnia] COMMITTED abc123f - feat: add user authentication';
        const result = parseLogEntry(line);

        expect(result).not.toBeNull();
        expect(result?.timestamp).toBe('2026-01-15T10:45:00Z');
        expect(result?.agent).toBe('Tawnia');
        expect(result?.message).toBe('COMMITTED abc123f - feat: add user authentication');
        expect(result?.highlightType).toBe('committed');
      });

      it('should parse COMMITTED entry with full commit hash', () => {
        const line = '2026-01-15T10:46:00Z [Tawnia] COMMITTED a1b2c3d4e5f6789012345678901234567890abcd - chore: update dependencies';
        const result = parseLogEntry(line);

        expect(result).not.toBeNull();
        expect(result?.agent).toBe('Tawnia');
        expect(result?.message).toBe('COMMITTED a1b2c3d4e5f6789012345678901234567890abcd - chore: update dependencies');
        expect(result?.highlightType).toBe('committed');
      });

      it('should parse COMMITTED entry with short commit hash', () => {
        const line = '2026-01-15T10:47:00Z [Tawnia] COMMITTED 1234567 - fix: resolve login bug';
        const result = parseLogEntry(line);

        expect(result).not.toBeNull();
        expect(result?.highlightType).toBe('committed');
      });

      it('should handle all agent names', () => {
        const agents = ['Hannibal', 'Face', 'Murdock', 'B.A.', 'Lynch', 'Tawnia'];

        agents.forEach((agent) => {
          const line = `2026-01-15T10:00:00Z [${agent}] Test message`;
          const result = parseLogEntry(line);

          expect(result).not.toBeNull();
          expect(result?.agent).toBe(agent);
        });
      });

      it('should handle messages with special characters', () => {
        const line = '2026-01-15T10:00:00Z [Face] Deploying to https://example.com/api?v=1.0';
        const result = parseLogEntry(line);

        expect(result).not.toBeNull();
        expect(result?.message).toBe('Deploying to https://example.com/api?v=1.0');
      });

      it('should handle timestamps with milliseconds', () => {
        const line = '2026-01-16T22:27:12.968Z [Hannibal] Mission initialized';
        const result = parseLogEntry(line);

        expect(result).not.toBeNull();
        expect(result?.timestamp).toBe('2026-01-16T22:27:12.968Z');
        expect(result?.agent).toBe('Hannibal');
        expect(result?.message).toBe('Mission initialized');
      });
    });

    describe('malformed entries', () => {
      it('should return null for empty string', () => {
        const result = parseLogEntry('');
        expect(result).toBeNull();
      });

      it('should return null for line without timestamp', () => {
        const line = '[Hannibal] Some message without timestamp';
        const result = parseLogEntry(line);
        expect(result).toBeNull();
      });

      it('should return null for line without agent brackets', () => {
        const line = '2026-01-15T10:00:00Z Hannibal Some message';
        const result = parseLogEntry(line);
        expect(result).toBeNull();
      });

      it('should return null for line with malformed timestamp', () => {
        const line = '2026-01-15 10:00:00 [Hannibal] Some message';
        const result = parseLogEntry(line);
        expect(result).toBeNull();
      });

      it('should return null for completely invalid format', () => {
        const line = 'This is just random text';
        const result = parseLogEntry(line);
        expect(result).toBeNull();
      });
    });
  });

  describe('parseLogFile', () => {
    const sampleLogContent = `2026-01-15T10:42:15Z [B.A.] Implementing JWT token refresh logic
2026-01-15T10:41:40Z [Lynch] APPROVED 006-database-schema
2026-01-15T10:41:00Z [Hannibal] ALERT: Item 024 requires human input
2026-01-15T10:40:30Z [Murdock] Writing unit tests for auth module
2026-01-15T10:40:00Z [Face] REJECTED 005-ui-component - needs refactoring
2026-01-15T10:39:00Z [Tawnia] COMMITTED abc1234 - feat: add user authentication`;

    describe('parsing full files', () => {
      it('should parse entire log file into array of entries', () => {
        const result = parseLogFile(sampleLogContent);

        expect(result).toHaveLength(6);
        expect(result[0].agent).toBe('B.A.');
        expect(result[1].agent).toBe('Lynch');
        expect(result[1].highlightType).toBe('approved');
        expect(result[2].highlightType).toBe('alert');
        expect(result[4].highlightType).toBe('rejected');
        expect(result[5].agent).toBe('Tawnia');
        expect(result[5].highlightType).toBe('committed');
      });

      it('should return empty array for empty content', () => {
        const result = parseLogFile('');
        expect(result).toEqual([]);
      });

      it('should handle single line log', () => {
        const content = '2026-01-15T10:00:00Z [Hannibal] Single entry';
        const result = parseLogFile(content);

        expect(result).toHaveLength(1);
        expect(result[0].agent).toBe('Hannibal');
      });
    });

    describe('handling malformed lines', () => {
      it('should skip malformed lines gracefully', () => {
        const contentWithBadLines = `2026-01-15T10:42:15Z [B.A.] Valid entry
This is a malformed line
2026-01-15T10:41:00Z [Hannibal] Another valid entry
Also malformed`;

        const result = parseLogFile(contentWithBadLines);

        expect(result).toHaveLength(2);
        expect(result[0].agent).toBe('B.A.');
        expect(result[1].agent).toBe('Hannibal');
      });

      it('should skip empty lines', () => {
        const contentWithEmptyLines = `2026-01-15T10:42:15Z [B.A.] First entry

2026-01-15T10:41:00Z [Hannibal] Second entry

`;

        const result = parseLogFile(contentWithEmptyLines);

        expect(result).toHaveLength(2);
      });
    });

    describe('lastN parameter', () => {
      it('should return last N entries when specified', () => {
        const result = parseLogFile(sampleLogContent, 2);

        expect(result).toHaveLength(2);
        // Last 2 entries from the file
        expect(result[0].agent).toBe('Face');
        expect(result[1].agent).toBe('Tawnia');
      });

      it('should return all entries if N is greater than total', () => {
        const result = parseLogFile(sampleLogContent, 100);

        expect(result).toHaveLength(6);
      });

      it('should return empty array if N is 0', () => {
        const result = parseLogFile(sampleLogContent, 0);

        expect(result).toEqual([]);
      });

      it('should handle N of 1 correctly', () => {
        const result = parseLogFile(sampleLogContent, 1);

        expect(result).toHaveLength(1);
        expect(result[0].agent).toBe('Tawnia');
      });
    });
  });

  describe('LogEntry type', () => {
    it('should have correct structure with all fields', () => {
      const entry: LogEntry = {
        timestamp: '2026-01-15T10:00:00Z',
        agent: 'Hannibal',
        message: 'Test message',
        highlightType: 'approved',
      };

      expect(entry.timestamp).toBe('2026-01-15T10:00:00Z');
      expect(entry.agent).toBe('Hannibal');
      expect(entry.message).toBe('Test message');
      expect(entry.highlightType).toBe('approved');
    });

    it('should allow highlightType to be undefined', () => {
      const entry: LogEntry = {
        timestamp: '2026-01-15T10:00:00Z',
        agent: 'Hannibal',
        message: 'Test message',
      };

      expect(entry.highlightType).toBeUndefined();
    });

    it('should accept committed as highlightType', () => {
      const entry: LogEntry = {
        timestamp: '2026-01-15T10:00:00Z',
        agent: 'Tawnia',
        message: 'COMMITTED abc1234 - feat: add feature',
        highlightType: 'committed',
      };

      expect(entry.highlightType).toBe('committed');
    });
  });
});
