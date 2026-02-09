import { describe, it, expect } from 'vitest';

/**
 * Tests for unified ToolResponse type and consolidated error formatting.
 *
 * Validates that a single shared ToolResponse type can represent both
 * success and error responses across all 6 tool modules, and that
 * formatErrorMessage / ApiErrorLike are not duplicated.
 */

// These imports target the shared location where the consolidated types will live.
// Until B.A. implements the consolidation, these imports will fail (TDD).
import type { ToolResponse, ToolErrorResponse, ApiErrorLike } from '../../lib/tool-response.js';
import { formatErrorMessage } from '../../lib/tool-response.js';

describe('lib/tool-response - unified ToolResponse type', () => {
  describe('ToolResponse success shape', () => {
    it('represents a success response with content and optional data', () => {
      const response: ToolResponse<{ id: string }> = {
        content: [{ type: 'text', text: '{"id":"WI-001"}' }],
        data: { id: 'WI-001' },
      };

      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe('text');
      expect(response.content[0].text).toContain('WI-001');
      expect(response.data).toEqual({ id: 'WI-001' });
      expect(response.isError).toBeUndefined();
    });

    it('allows content-only success response without data', () => {
      const response: ToolResponse = {
        content: [{ type: 'text', text: 'Operation completed' }],
      };

      expect(response.content).toHaveLength(1);
      expect(response.data).toBeUndefined();
      expect(response.isError).toBeUndefined();
    });
  });

  describe('ToolResponse error shape', () => {
    it('represents an error response with isError flag on content-based shape', () => {
      const response: ToolResponse = {
        content: [{ type: 'text', text: 'Connection refused' }],
        isError: true,
      };

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toBe('Connection refused');
    });
  });

  describe('ToolErrorResponse shape', () => {
    it('represents a structured error with code and message', () => {
      const error: ToolErrorResponse = {
        isError: true,
        code: 'VALIDATION_ERROR',
        message: 'itemId is required',
      };

      expect(error.isError).toBe(true);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('itemId is required');
    });
  });

  describe('formatErrorMessage', () => {
    it('extracts message from Error instances', () => {
      const error = new Error('Something went wrong');
      expect(formatErrorMessage(error)).toBe('Something went wrong');
    });

    it('handles ECONNREFUSED errors with friendly message', () => {
      const error = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
      expect(formatErrorMessage(error)).toBe('Connection refused - server may be unavailable');
    });

    it('extracts message from API-like error objects', () => {
      const error: ApiErrorLike = { status: 404, message: 'Not found' };
      expect(formatErrorMessage(error)).toBe('Not found');
    });

    it('returns fallback for unknown error shapes', () => {
      expect(formatErrorMessage(42)).toBe('Unknown error occurred');
      expect(formatErrorMessage(null)).toBe('Unknown error occurred');
    });
  });
});
