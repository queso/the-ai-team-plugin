import { describe, it, expect, vi } from 'vitest';
import { formatApiError, formatNetworkError, withErrorBoundary, McpErrorResponse } from '../lib/errors.js';

describe('MCP Error Handling Utilities', () => {
  describe('formatApiError', () => {
    it('should convert HTTP 400 to MCP error with validation code', () => {
      const error = { status: 400, message: 'Invalid request body' };
      const result = formatApiError(error);

      expect(result.isError).toBe(true);
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.message).toBe('Invalid request body');
    });

    it('should convert HTTP 401 to MCP error with unauthorized code', () => {
      const error = { status: 401, message: 'Invalid credentials' };
      const result = formatApiError(error);

      expect(result.isError).toBe(true);
      expect(result.code).toBe('UNAUTHORIZED');
      expect(result.message).toBe('Invalid credentials');
    });

    it('should convert HTTP 404 to MCP error with not found code', () => {
      const error = { status: 404, message: 'Resource not found' };
      const result = formatApiError(error);

      expect(result.isError).toBe(true);
      expect(result.code).toBe('NOT_FOUND');
      expect(result.message).toBe('Resource not found');
    });

    it('should convert HTTP 500 to MCP error with server error code', () => {
      const error = { status: 500, message: 'Internal server error' };
      const result = formatApiError(error);

      expect(result.isError).toBe(true);
      expect(result.code).toBe('SERVER_ERROR');
      expect(result.message).toBe('Internal server error');
    });

    it('should handle unknown status codes with generic error', () => {
      const error = { status: 418, message: "I'm a teapot" };
      const result = formatApiError(error);

      expect(result.isError).toBe(true);
      expect(result.code).toBe('API_ERROR');
      expect(result.message).toBe("I'm a teapot");
    });


    it('should handle empty string message', () => {
      const error = { status: 400, message: '' };
      const result = formatApiError(error);

      expect(result.isError).toBe(true);
      expect(result.message).toBe('Unknown error');
    });
  });

  describe('formatNetworkError', () => {
    it('should handle connection refused errors', () => {
      const error = new Error('ECONNREFUSED');
      error.name = 'Error';
      (error as any).code = 'ECONNREFUSED';

      const result = formatNetworkError(error);

      expect(result.isError).toBe(true);
      expect(result.code).toBe('CONNECTION_FAILED');
      expect(result.message).toContain('connect');
    });

    it('should handle timeout errors', () => {
      const error = new Error('Request timed out');
      error.name = 'TimeoutError';

      const result = formatNetworkError(error);

      expect(result.isError).toBe(true);
      expect(result.code).toBe('TIMEOUT');
      expect(result.message).toContain('timed out');
    });

    it('should handle DNS resolution failures', () => {
      const error = new Error('getaddrinfo ENOTFOUND');
      (error as any).code = 'ENOTFOUND';

      const result = formatNetworkError(error);

      expect(result.isError).toBe(true);
      expect(result.code).toBe('DNS_ERROR');
      expect(result.message).toContain('resolve');
    });

    it('should handle generic network errors', () => {
      const error = new Error('Network failure');

      const result = formatNetworkError(error);

      expect(result.isError).toBe(true);
      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.message).toBe('Network failure');
    });
  });

  describe('withErrorBoundary', () => {
    it('should pass through successful handler results', async () => {
      const handler = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'success' }] });
      const wrapped = withErrorBoundary(handler);

      const result = await wrapped({ arg: 'value' });

      expect(result).toEqual({ content: [{ type: 'text', text: 'success' }] });
      expect(handler).toHaveBeenCalledWith({ arg: 'value' });
    });

    it('should catch and format thrown API errors', async () => {
      const apiError = { status: 404, message: 'Item not found' };
      const handler = vi.fn().mockRejectedValue(apiError);
      const wrapped = withErrorBoundary(handler);

      const result = await wrapped({}) as McpErrorResponse;

      expect(result.isError).toBe(true);
      expect(result.code).toBe('NOT_FOUND');
      expect(result.message).toBe('Item not found');
    });

    it('should catch and format thrown network errors', async () => {
      const networkError = new Error('Connection refused');
      (networkError as any).code = 'ECONNREFUSED';
      const handler = vi.fn().mockRejectedValue(networkError);
      const wrapped = withErrorBoundary(handler);

      const result = await wrapped({}) as McpErrorResponse;

      expect(result.isError).toBe(true);
      expect(result.code).toBe('CONNECTION_FAILED');
    });

    it('should handle unexpected error types gracefully', async () => {
      const handler = vi.fn().mockRejectedValue('string error');
      const wrapped = withErrorBoundary(handler);

      const result = await wrapped({}) as McpErrorResponse;

      expect(result.isError).toBe(true);
      expect(result.code).toBe('UNKNOWN_ERROR');
    });

    // Edge case tests for unknown error formatting
    it('should handle object errors without producing [object Object]', async () => {
      const handler = vi.fn().mockRejectedValue({ details: 'complex error object' });
      const wrapped = withErrorBoundary(handler);

      const result = await wrapped({}) as McpErrorResponse;

      expect(result.isError).toBe(true);
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.message).not.toBe('[object Object]');
      expect(result.message).toContain('details');
    });

    it('should handle errors with circular references', async () => {
      const circularError: any = { name: 'circular' };
      circularError.self = circularError;
      const handler = vi.fn().mockRejectedValue(circularError);
      const wrapped = withErrorBoundary(handler);

      const result = await wrapped({}) as McpErrorResponse;

      expect(result.isError).toBe(true);
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.message).toBeDefined();
    });

  });
});
