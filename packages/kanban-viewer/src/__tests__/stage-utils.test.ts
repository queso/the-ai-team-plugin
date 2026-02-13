import { describe, it, expect } from 'vitest';
import { getStageFromPath, isValidStage } from '../lib/stage-utils';
import type { Stage } from '../types';

describe('Stage Utils', () => {
  describe('getStageFromPath', () => {
    describe('absolute paths', () => {
      it('should extract stage from absolute path', () => {
        expect(getStageFromPath('/mission/ready/foo.md')).toBe('ready');
        expect(getStageFromPath('/mission/testing/bar.md')).toBe('testing');
        expect(getStageFromPath('/mission/implementing/baz.md')).toBe('implementing');
      });

      it('should handle all valid stages', () => {
        expect(getStageFromPath('/mission/briefings/item.md')).toBe('briefings');
        expect(getStageFromPath('/mission/ready/item.md')).toBe('ready');
        expect(getStageFromPath('/mission/testing/item.md')).toBe('testing');
        expect(getStageFromPath('/mission/implementing/item.md')).toBe('implementing');
        expect(getStageFromPath('/mission/review/item.md')).toBe('review');
        expect(getStageFromPath('/mission/done/item.md')).toBe('done');
        expect(getStageFromPath('/mission/blocked/item.md')).toBe('blocked');
      });

      it('should handle deeply nested paths', () => {
        expect(getStageFromPath('/mission/ready/subfolder/nested/item.md')).toBe('ready');
        expect(getStageFromPath('/mission/testing/deep/path/file.md')).toBe('testing');
      });

      it('should handle paths with /mission/ in the middle', () => {
        expect(getStageFromPath('/home/user/project/mission/ready/item.md')).toBe('ready');
        expect(getStageFromPath('/var/data/mission/testing/file.md')).toBe('testing');
      });
    });

    describe('relative paths', () => {
      it('should extract stage from relative path', () => {
        expect(getStageFromPath('mission/ready/foo.md')).toBe('ready');
        expect(getStageFromPath('mission/testing/bar.md')).toBe('testing');
      });

      it('should handle relative paths starting with ./', () => {
        expect(getStageFromPath('./mission/ready/item.md')).toBe('ready');
        expect(getStageFromPath('./mission/testing/item.md')).toBe('testing');
      });

      it('should handle deeply nested relative paths', () => {
        expect(getStageFromPath('mission/ready/subfolder/item.md')).toBe('ready');
        expect(getStageFromPath('./mission/testing/deep/nested/file.md')).toBe('testing');
      });
    });

    describe('edge cases', () => {
      it('should return null for paths without mission folder', () => {
        expect(getStageFromPath('/some/random/path/file.md')).toBeNull();
        expect(getStageFromPath('ready/item.md')).toBeNull();
        expect(getStageFromPath('/ready/item.md')).toBeNull();
      });

      it('should return null for paths with mission but no stage', () => {
        expect(getStageFromPath('/mission/item.md')).toBeNull();
        expect(getStageFromPath('mission/item.md')).toBeNull();
      });

      it('should return null for invalid stage names', () => {
        expect(getStageFromPath('/mission/invalid-stage/item.md')).toBeNull();
        expect(getStageFromPath('/mission/pending/item.md')).toBeNull();
        expect(getStageFromPath('/mission/completed/item.md')).toBeNull();
      });

      it('should handle empty paths', () => {
        expect(getStageFromPath('')).toBeNull();
      });

      it('should handle paths with only mission/', () => {
        expect(getStageFromPath('/mission/')).toBeNull();
        expect(getStageFromPath('mission/')).toBeNull();
      });

      it('should handle paths with mission but invalid structure', () => {
        expect(getStageFromPath('/missionready/item.md')).toBeNull();
        expect(getStageFromPath('/mission-ready/item.md')).toBeNull();
      });

      it('should be case-sensitive for stage names', () => {
        expect(getStageFromPath('/mission/Ready/item.md')).toBeNull();
        expect(getStageFromPath('/mission/TESTING/item.md')).toBeNull();
      });

      it('should handle Windows-style paths', () => {
        expect(getStageFromPath('C:\\mission\\ready\\item.md')).toBe('ready');
        expect(getStageFromPath('C:\\Users\\mission\\testing\\file.md')).toBe('testing');
      });

      it('should handle trailing slashes', () => {
        expect(getStageFromPath('/mission/ready/')).toBe('ready');
        expect(getStageFromPath('mission/testing/')).toBe('testing');
      });
    });
  });

  describe('isValidStage', () => {
    it('should return true for valid stages', () => {
      expect(isValidStage('briefings')).toBe(true);
      expect(isValidStage('ready')).toBe(true);
      expect(isValidStage('testing')).toBe(true);
      expect(isValidStage('implementing')).toBe(true);
      expect(isValidStage('review')).toBe(true);
      expect(isValidStage('done')).toBe(true);
      expect(isValidStage('blocked')).toBe(true);
    });

    it('should return false for invalid stages', () => {
      expect(isValidStage('invalid')).toBe(false);
      expect(isValidStage('pending')).toBe(false);
      expect(isValidStage('completed')).toBe(false);
      expect(isValidStage('')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(isValidStage('Ready')).toBe(false);
      expect(isValidStage('TESTING')).toBe(false);
      expect(isValidStage('Implementing')).toBe(false);
    });

    it('should handle null and undefined', () => {
      expect(isValidStage(null as unknown as string)).toBe(false);
      expect(isValidStage(undefined as unknown as string)).toBe(false);
    });

    it('should handle non-string values', () => {
      expect(isValidStage(123 as unknown as string)).toBe(false);
      expect(isValidStage({} as unknown as string)).toBe(false);
      expect(isValidStage([] as unknown as string)).toBe(false);
    });

    it('should act as type guard', () => {
      const value: string = 'ready';

      if (isValidStage(value)) {
        // TypeScript should narrow the type to Stage
        const stage: Stage = value;
        expect(stage).toBe('ready');
      }
    });
  });
});
