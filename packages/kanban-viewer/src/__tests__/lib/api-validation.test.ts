import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests for API validation helpers.
 *
 * These tests verify strict validation helpers that throw on unexpected types
 * instead of silently defaulting. This surfaces data corruption early.
 *
 * - validateItemType: accepts feature, bug, enhancement, task; throws otherwise
 * - validateAgentName: accepts Hannibal, Face, Murdock, B.A., Lynch, Amy, Tawnia; throws otherwise
 * - validateDate: throws for invalid dates
 * - All errors include the unexpected value for debugging
 * - console.error is called before throwing
 */

import {
  validateItemType,
  validateAgentName,
  validateDate,
  ValidationError,
} from '@/lib/api-validation';

describe('validateItemType', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('valid item types', () => {
    it('should accept "feature"', () => {
      expect(validateItemType('feature')).toBe('feature');
    });

    it('should accept "bug"', () => {
      expect(validateItemType('bug')).toBe('bug');
    });

    it('should accept "enhancement"', () => {
      expect(validateItemType('enhancement')).toBe('enhancement');
    });

    it('should accept "task"', () => {
      expect(validateItemType('task')).toBe('task');
    });
  });

  describe('invalid item types', () => {
    it('should throw for "spike"', () => {
      expect(() => validateItemType('spike')).toThrow(ValidationError);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should throw for "chore"', () => {
      expect(() => validateItemType('chore')).toThrow(ValidationError);
    });

    it('should throw for "unknown"', () => {
      expect(() => validateItemType('unknown')).toThrow(ValidationError);
    });

    it('should throw for null', () => {
      expect(() => validateItemType(null as unknown as string)).toThrow(ValidationError);
    });

    it('should throw for undefined', () => {
      expect(() => validateItemType(undefined as unknown as string)).toThrow(ValidationError);
    });

    it('should throw for empty string', () => {
      expect(() => validateItemType('')).toThrow(ValidationError);
    });

    it('should include the invalid value in the error message', () => {
      try {
        validateItemType('spike');
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ValidationError);
        expect((e as ValidationError).message).toContain('spike');
      }
    });

    it('should include the invalid value in error details', () => {
      try {
        validateItemType('invalid-type');
        expect.fail('Should have thrown');
      } catch (e) {
        expect((e as ValidationError).value).toBe('invalid-type');
      }
    });

    it('should log the invalid value via console.error before throwing', () => {
      try {
        validateItemType('bad-type');
      } catch {
        // Expected
      }
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('bad-type')
      );
    });
  });
});

describe('validateAgentName', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('valid agent names', () => {
    it('should accept "Hannibal"', () => {
      expect(validateAgentName('Hannibal')).toBe('Hannibal');
    });

    it('should accept "Face"', () => {
      expect(validateAgentName('Face')).toBe('Face');
    });

    it('should accept "Murdock"', () => {
      expect(validateAgentName('Murdock')).toBe('Murdock');
    });

    it('should accept "B.A."', () => {
      expect(validateAgentName('B.A.')).toBe('B.A.');
    });

    it('should accept "Lynch"', () => {
      expect(validateAgentName('Lynch')).toBe('Lynch');
    });

    it('should accept "Amy"', () => {
      expect(validateAgentName('Amy')).toBe('Amy');
    });

    it('should accept "Tawnia"', () => {
      expect(validateAgentName('Tawnia')).toBe('Tawnia');
    });
  });

  describe('invalid agent names', () => {
    it('should throw for "BA" (missing periods)', () => {
      expect(() => validateAgentName('BA')).toThrow(ValidationError);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should throw for "unknown"', () => {
      expect(() => validateAgentName('unknown')).toThrow(ValidationError);
    });

    it('should throw for null', () => {
      expect(() => validateAgentName(null as unknown as string)).toThrow(ValidationError);
    });

    it('should throw for undefined', () => {
      expect(() => validateAgentName(undefined as unknown as string)).toThrow(ValidationError);
    });

    it('should throw for empty string', () => {
      expect(() => validateAgentName('')).toThrow(ValidationError);
    });

    it('should throw for lowercase agent names', () => {
      expect(() => validateAgentName('hannibal')).toThrow(ValidationError);
    });

    it('should throw for "Mr. T" (not a valid agent name)', () => {
      expect(() => validateAgentName('Mr. T')).toThrow(ValidationError);
    });

    it('should include the invalid value in the error message', () => {
      try {
        validateAgentName('BA');
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ValidationError);
        expect((e as ValidationError).message).toContain('BA');
      }
    });

    it('should include the invalid value in error details', () => {
      try {
        validateAgentName('InvalidAgent');
        expect.fail('Should have thrown');
      } catch (e) {
        expect((e as ValidationError).value).toBe('InvalidAgent');
      }
    });

    it('should log the invalid value via console.error before throwing', () => {
      try {
        validateAgentName('bad-agent');
      } catch {
        // Expected
      }
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('bad-agent')
      );
    });
  });
});

describe('validateDate', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('valid dates', () => {
    it('should accept a valid Date object', () => {
      const date = new Date('2024-01-15T10:00:00Z');
      expect(validateDate(date)).toEqual(date);
    });

    it('should accept a valid ISO date string', () => {
      const result = validateDate('2024-01-15T10:00:00Z');
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe('2024-01-15T10:00:00.000Z');
    });

    it('should accept a valid date string without time', () => {
      const result = validateDate('2024-01-15');
      expect(result).toBeInstanceOf(Date);
    });

    it('should accept a valid timestamp number', () => {
      const timestamp = Date.now();
      const result = validateDate(timestamp);
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(timestamp);
    });
  });

  describe('invalid dates', () => {
    it('should throw for "Invalid Date" Date object', () => {
      const invalidDate = new Date('not-a-date');
      expect(() => validateDate(invalidDate)).toThrow(ValidationError);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should throw for invalid date string', () => {
      expect(() => validateDate('not-a-date')).toThrow(ValidationError);
    });

    it('should throw for empty string', () => {
      expect(() => validateDate('')).toThrow(ValidationError);
    });

    it('should throw for null', () => {
      expect(() => validateDate(null as unknown as Date)).toThrow(ValidationError);
    });

    it('should throw for undefined', () => {
      expect(() => validateDate(undefined as unknown as Date)).toThrow(ValidationError);
    });

    it('should throw for object that is not a Date', () => {
      expect(() => validateDate({} as unknown as Date)).toThrow(ValidationError);
    });

    it('should throw for NaN', () => {
      expect(() => validateDate(NaN as unknown as Date)).toThrow(ValidationError);
    });

    it('should include the invalid value in the error message', () => {
      try {
        validateDate('garbage-date');
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ValidationError);
        expect((e as ValidationError).message).toContain('garbage-date');
      }
    });

    it('should include the invalid value in error details', () => {
      try {
        validateDate('bad-date-value');
        expect.fail('Should have thrown');
      } catch (e) {
        expect((e as ValidationError).value).toBe('bad-date-value');
      }
    });

    it('should log the invalid value via console.error before throwing', () => {
      try {
        validateDate('invalid-date-string');
      } catch {
        // Expected
      }
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('invalid-date-string')
      );
    });
  });
});

describe('ValidationError', () => {
  it('should be an instance of Error', () => {
    const error = new ValidationError('Test message', 'test-value');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ValidationError);
  });

  it('should have message and value properties', () => {
    const error = new ValidationError('Invalid type: spike', 'spike');
    expect(error.message).toBe('Invalid type: spike');
    expect(error.value).toBe('spike');
  });

  it('should have the correct name', () => {
    const error = new ValidationError('Test', 'value');
    expect(error.name).toBe('ValidationError');
  });

  it('should preserve the invalid value for debugging', () => {
    const badValue = { nested: { invalid: true } };
    const error = new ValidationError('Invalid object', badValue);
    expect(error.value).toBe(badValue);
  });
});
