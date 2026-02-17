/**
 * Tests for observer hook scripts
 *
 * These hooks observe tool lifecycle events and POST them to the API.
 * They must be fast (<100ms) and always exit with code 0.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  buildObserverPayload,
  sendObserverEvent,
} from '../lib/observer.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

/**
 * Type definitions for observer hook environment and payload.
 */
interface ObserverHookInput {
  TOOL_INPUT?: string;
  TOOL_NAME?: string;
  AGENT_NAME?: string;
  HOOK_EVENT_TYPE?: string;
  ATEAM_API_URL?: string;
  ATEAM_PROJECT_ID?: string;
}

interface HookEventPayload {
  eventType: string;
  agentName: string;
  toolName?: string;
  status: string;
  summary: string;
  correlationId: string;
  timestamp: string;
}

describe('Observer Hook - Payload Construction', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should generate a valid payload for pre_tool_use events', () => {
    const env: ObserverHookInput = {
      TOOL_INPUT: JSON.stringify({ command: 'npm test' }),
      TOOL_NAME: 'Bash',
      AGENT_NAME: 'Murdock',
      HOOK_EVENT_TYPE: 'pre_tool_use',
      ATEAM_API_URL: 'http://localhost:3000',
      ATEAM_PROJECT_ID: 'test-project',
    };

    const payload = buildObserverPayload(env);

    expect(payload).not.toBeNull();
    expect(payload?.eventType).toBe('pre_tool_use');
    expect(payload?.agentName).toBe('Murdock');
    expect(payload?.toolName).toBe('Bash');
    expect(payload?.status).toBe('pending');
    expect(payload?.summary).toBe('Bash: npm test');
    expect(payload?.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
    expect(payload?.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('should generate a valid payload for post_tool_use events', () => {
    const env: ObserverHookInput = {
      TOOL_INPUT: JSON.stringify({ file_path: 'src/test.ts' }),
      TOOL_NAME: 'Write',
      AGENT_NAME: 'B.A.',
      HOOK_EVENT_TYPE: 'post_tool_use',
      ATEAM_API_URL: 'http://localhost:3000',
      ATEAM_PROJECT_ID: 'test-project',
    };

    const payload = buildObserverPayload(env);

    expect(payload).not.toBeNull();
    expect(payload?.eventType).toBe('post_tool_use');
    expect(payload?.agentName).toBe('B.A.');
    expect(payload?.toolName).toBe('Write');
    expect(payload?.status).toBe('success');
    expect(payload?.summary).toBe('Write: src/test.ts (completed)');
    expect(payload?.correlationId).toBeDefined();
  });

  it('should generate a valid payload for post_tool_use_failure events', () => {
    const env: ObserverHookInput = {
      TOOL_INPUT: JSON.stringify({ command: 'npm test' }),
      TOOL_NAME: 'Bash',
      AGENT_NAME: 'Murdock',
      HOOK_EVENT_TYPE: 'post_tool_use_failure',
      ATEAM_API_URL: 'http://localhost:3000',
      ATEAM_PROJECT_ID: 'test-project',
    };

    const payload = buildObserverPayload(env);

    expect(payload).not.toBeNull();
    expect(payload?.eventType).toBe('post_tool_use_failure');
    expect(payload?.agentName).toBe('Murdock');
    expect(payload?.status).toBe('failed');
    expect(payload?.summary).toContain('(failed)');
  });

  it('should generate a valid payload for subagent_start events', () => {
    const env: ObserverHookInput = {
      AGENT_NAME: 'Lynch',
      HOOK_EVENT_TYPE: 'subagent_start',
      ATEAM_API_URL: 'http://localhost:3000',
      ATEAM_PROJECT_ID: 'test-project',
    };

    const payload = buildObserverPayload(env);

    expect(payload).not.toBeNull();
    expect(payload?.eventType).toBe('subagent_start');
    expect(payload?.agentName).toBe('Lynch');
    expect(payload?.status).toBe('started');
    expect(payload?.summary).toBe('Lynch started');
  });

  it('should generate a valid payload for subagent_stop events', () => {
    const env: ObserverHookInput = {
      AGENT_NAME: 'Amy',
      HOOK_EVENT_TYPE: 'subagent_stop',
      ATEAM_API_URL: 'http://localhost:3000',
      ATEAM_PROJECT_ID: 'test-project',
    };

    const payload = buildObserverPayload(env);

    expect(payload).not.toBeNull();
    expect(payload?.eventType).toBe('subagent_stop');
    expect(payload?.agentName).toBe('Amy');
    expect(payload?.status).toBe('completed');
    expect(payload?.summary).toBe('Amy completed');
  });

  it('should generate a valid payload for stop events', () => {
    const env: ObserverHookInput = {
      AGENT_NAME: 'Hannibal',
      HOOK_EVENT_TYPE: 'stop',
      ATEAM_API_URL: 'http://localhost:3000',
      ATEAM_PROJECT_ID: 'test-project',
    };

    const payload = buildObserverPayload(env);

    expect(payload).not.toBeNull();
    expect(payload?.eventType).toBe('stop');
    expect(payload?.agentName).toBe('Hannibal');
    expect(payload?.status).toBe('stopped');
    expect(payload?.summary).toBe('Hannibal stopped');
  });

  it('should always generate a unique correlationId', () => {
    const env: ObserverHookInput = {
      TOOL_NAME: 'Bash',
      AGENT_NAME: 'Murdock',
      HOOK_EVENT_TYPE: 'pre_tool_use',
    };

    const payload1 = buildObserverPayload(env);
    const payload2 = buildObserverPayload(env);

    expect(payload1?.correlationId).toBeDefined();
    expect(payload2?.correlationId).toBeDefined();
    expect(payload1?.correlationId).not.toBe(payload2?.correlationId);
  });

  it('should return null when event type is missing', () => {
    const env: ObserverHookInput = {
      AGENT_NAME: 'Murdock',
      TOOL_NAME: 'Bash',
    };

    const payload = buildObserverPayload(env);

    expect(payload).toBeNull();
  });

  it('should return null when agent name is missing', () => {
    const env: ObserverHookInput = {
      HOOK_EVENT_TYPE: 'pre_tool_use',
      TOOL_NAME: 'Bash',
    };

    const payload = buildObserverPayload(env);

    expect(payload).toBeNull();
  });

  it('should handle malformed TOOL_INPUT gracefully', () => {
    const env: ObserverHookInput = {
      TOOL_INPUT: 'not-valid-json',
      TOOL_NAME: 'Bash',
      AGENT_NAME: 'Murdock',
      HOOK_EVENT_TYPE: 'pre_tool_use',
    };

    const payload = buildObserverPayload(env);

    // Should still generate payload with empty command
    expect(payload).not.toBeNull();
    expect(payload?.summary).toBe('Bash:');
  });
});

describe('Observer Hook - API Communication', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should POST to the correct API endpoint with correct headers', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const env: ObserverHookInput = {
      TOOL_NAME: 'Bash',
      AGENT_NAME: 'Murdock',
      HOOK_EVENT_TYPE: 'pre_tool_use',
      ATEAM_API_URL: 'http://localhost:3000',
      ATEAM_PROJECT_ID: 'test-project',
    };

    const payload = buildObserverPayload(env);
    expect(payload).not.toBeNull();

    const success = await sendObserverEvent(payload!, env);

    expect(success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/hooks/events',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-ID': 'test-project',
        },
        body: expect.stringContaining('"eventType":"pre_tool_use"'),
      })
    );
  });

  it('should use default API URL when not provided', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const env: ObserverHookInput = {
      TOOL_NAME: 'Bash',
      AGENT_NAME: 'Murdock',
      HOOK_EVENT_TYPE: 'pre_tool_use',
      ATEAM_PROJECT_ID: 'test-project',
    };

    const payload = buildObserverPayload(env);
    await sendObserverEvent(payload!, env);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/hooks/events',
      expect.any(Object)
    );
  });

  it('should use default project ID when not provided', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const env: ObserverHookInput = {
      TOOL_NAME: 'Bash',
      AGENT_NAME: 'Murdock',
      HOOK_EVENT_TYPE: 'pre_tool_use',
      ATEAM_API_URL: 'http://localhost:3000',
    };

    const payload = buildObserverPayload(env);
    await sendObserverEvent(payload!, env);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Project-ID': 'default',
        }),
      })
    );
  });

  it('should handle trailing slash in ATEAM_API_URL without creating double slashes', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const env: ObserverHookInput = {
      TOOL_NAME: 'Bash',
      AGENT_NAME: 'Murdock',
      HOOK_EVENT_TYPE: 'pre_tool_use',
      ATEAM_API_URL: 'http://localhost:3000/', // Trailing slash
      ATEAM_PROJECT_ID: 'test-project',
    };

    const payload = buildObserverPayload(env);
    expect(payload).not.toBeNull();

    const success = await sendObserverEvent(payload!, env);

    expect(success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/hooks/events', // Should have single slash, not double
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-ID': 'test-project',
        },
      })
    );
  });

  it('should handle API errors gracefully and return false', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const env: ObserverHookInput = {
      TOOL_NAME: 'Bash',
      AGENT_NAME: 'Murdock',
      HOOK_EVENT_TYPE: 'pre_tool_use',
    };

    const payload = buildObserverPayload(env);
    const success = await sendObserverEvent(payload!, env);

    expect(success).toBe(false);
  });

  it('should handle network errors gracefully and return false', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const env: ObserverHookInput = {
      TOOL_NAME: 'Bash',
      AGENT_NAME: 'Murdock',
      HOOK_EVENT_TYPE: 'pre_tool_use',
    };

    const payload = buildObserverPayload(env);
    const success = await sendObserverEvent(payload!, env);

    expect(success).toBe(false);
  });
});

describe('Observer Hook - Payload Format', () => {
  it('should match the API expected schema', () => {
    const env: ObserverHookInput = {
      TOOL_INPUT: JSON.stringify({ command: 'npm test' }),
      TOOL_NAME: 'Bash',
      AGENT_NAME: 'Murdock',
      HOOK_EVENT_TYPE: 'pre_tool_use',
    };

    const payload = buildObserverPayload(env);

    expect(payload).not.toBeNull();

    // Validate required fields from API schema
    expect(payload).toHaveProperty('eventType');
    expect(payload).toHaveProperty('agentName');
    expect(payload).toHaveProperty('status');
    expect(payload).toHaveProperty('summary');
    expect(payload).toHaveProperty('timestamp');
    expect(payload).toHaveProperty('correlationId');

    // Validate field types
    expect(typeof payload?.eventType).toBe('string');
    expect(typeof payload?.agentName).toBe('string');
    expect(typeof payload?.status).toBe('string');
    expect(typeof payload?.summary).toBe('string');
    expect(typeof payload?.timestamp).toBe('string');
    expect(typeof payload?.correlationId).toBe('string');

    // Optional field
    if (payload?.toolName) {
      expect(typeof payload.toolName).toBe('string');
    }
  });

  it('should generate timestamps in ISO 8601 format', () => {
    const env: ObserverHookInput = {
      AGENT_NAME: 'Murdock',
      HOOK_EVENT_TYPE: 'pre_tool_use',
    };

    const payload = buildObserverPayload(env);

    expect(payload?.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

    // Validate it can be parsed as a Date
    const date = new Date(payload!.timestamp);
    expect(date.getTime()).not.toBeNaN();
  });
});
