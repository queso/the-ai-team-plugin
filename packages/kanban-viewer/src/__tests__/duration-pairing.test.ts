/**
 * Duration Pairing Tests
 *
 * Tests for pairing PreToolUse events with PostToolUse/PostToolUseFailure events
 * to calculate tool call duration.
 */

import { describe, it, expect } from 'vitest';
import { pairDurations } from '@/lib/duration-pairing';
import type { HookEventSummary } from '@/types/hook-event';

describe('pairDurations', () => {
  it('calculates duration for pre_tool_use + post_tool_use with matching correlationId', () => {
    const events: HookEventSummary[] = [
      {
        id: 1,
        eventType: 'pre_tool_use',
        agentName: 'Murdock',
        toolName: 'Write',
        status: 'pending',
        summary: 'Writing test file',
        correlationId: 'abc-123',
        timestamp: new Date('2026-02-16T10:00:00.000Z'),
      },
      {
        id: 2,
        eventType: 'post_tool_use',
        agentName: 'Murdock',
        toolName: 'Write',
        status: 'success',
        summary: 'Wrote test file',
        correlationId: 'abc-123',
        timestamp: new Date('2026-02-16T10:00:02.500Z'),
      },
    ];

    const result = pairDurations(events);

    expect(result).toHaveLength(2);
    expect(result[0].durationMs).toBeUndefined(); // pre_tool_use has no duration
    expect(result[1].durationMs).toBe(2500); // 2.5 seconds
  });

  it('calculates duration for pre_tool_use + post_tool_use_failure with matching correlationId', () => {
    const events: HookEventSummary[] = [
      {
        id: 1,
        eventType: 'pre_tool_use',
        agentName: 'B.A.',
        toolName: 'Edit',
        status: 'pending',
        summary: 'Editing implementation',
        correlationId: 'xyz-789',
        timestamp: new Date('2026-02-16T10:00:00.000Z'),
      },
      {
        id: 2,
        eventType: 'post_tool_use_failure',
        agentName: 'B.A.',
        toolName: 'Edit',
        status: 'failure',
        summary: 'Edit failed: file not found',
        correlationId: 'xyz-789',
        timestamp: new Date('2026-02-16T10:00:01.250Z'),
      },
    ];

    const result = pairDurations(events);

    expect(result).toHaveLength(2);
    expect(result[0].durationMs).toBeUndefined();
    expect(result[1].durationMs).toBe(1250); // 1.25 seconds
  });

  it('leaves durationMs undefined for unpaired post_tool_use events', () => {
    const events: HookEventSummary[] = [
      {
        id: 1,
        eventType: 'post_tool_use',
        agentName: 'Lynch',
        toolName: 'Read',
        status: 'success',
        summary: 'Read file',
        correlationId: 'orphan-123',
        timestamp: new Date('2026-02-16T10:00:00.000Z'),
      },
    ];

    const result = pairDurations(events);

    expect(result).toHaveLength(1);
    expect(result[0].durationMs).toBeUndefined(); // no matching pre_tool_use
  });

  it('does not attempt pairing for events without correlationId', () => {
    const events: HookEventSummary[] = [
      {
        id: 1,
        eventType: 'pre_tool_use',
        agentName: 'Amy',
        toolName: 'Bash',
        status: 'pending',
        summary: 'Running command',
        timestamp: new Date('2026-02-16T10:00:00.000Z'),
      },
      {
        id: 2,
        eventType: 'post_tool_use',
        agentName: 'Amy',
        toolName: 'Bash',
        status: 'success',
        summary: 'Command completed',
        timestamp: new Date('2026-02-16T10:00:01.000Z'),
      },
    ];

    const result = pairDurations(events);

    expect(result).toHaveLength(2);
    expect(result[0].durationMs).toBeUndefined();
    expect(result[1].durationMs).toBeUndefined(); // no correlationId to match on
  });

  it('correctly pairs multiple events with different correlationIds', () => {
    const events: HookEventSummary[] = [
      // First pair
      {
        id: 1,
        eventType: 'pre_tool_use',
        agentName: 'Murdock',
        toolName: 'Write',
        status: 'pending',
        summary: 'Writing test 1',
        correlationId: 'pair-1',
        timestamp: new Date('2026-02-16T10:00:00.000Z'),
      },
      {
        id: 2,
        eventType: 'post_tool_use',
        agentName: 'Murdock',
        toolName: 'Write',
        status: 'success',
        summary: 'Wrote test 1',
        correlationId: 'pair-1',
        timestamp: new Date('2026-02-16T10:00:01.500Z'),
      },
      // Second pair
      {
        id: 3,
        eventType: 'pre_tool_use',
        agentName: 'B.A.',
        toolName: 'Edit',
        status: 'pending',
        summary: 'Editing implementation',
        correlationId: 'pair-2',
        timestamp: new Date('2026-02-16T10:00:02.000Z'),
      },
      {
        id: 4,
        eventType: 'post_tool_use',
        agentName: 'B.A.',
        toolName: 'Edit',
        status: 'success',
        summary: 'Edited implementation',
        correlationId: 'pair-2',
        timestamp: new Date('2026-02-16T10:00:03.200Z'),
      },
      // Orphaned event
      {
        id: 5,
        eventType: 'post_tool_use',
        agentName: 'Amy',
        toolName: 'Bash',
        status: 'success',
        summary: 'Command ran',
        correlationId: 'orphan',
        timestamp: new Date('2026-02-16T10:00:04.000Z'),
      },
    ];

    const result = pairDurations(events);

    expect(result).toHaveLength(5);
    // First pair
    expect(result[0].durationMs).toBeUndefined();
    expect(result[1].durationMs).toBe(1500);
    // Second pair
    expect(result[2].durationMs).toBeUndefined();
    expect(result[3].durationMs).toBe(1200);
    // Orphan
    expect(result[4].durationMs).toBeUndefined();
  });

  it('does not mutate original events array', () => {
    const events: HookEventSummary[] = [
      {
        id: 1,
        eventType: 'pre_tool_use',
        agentName: 'Murdock',
        toolName: 'Write',
        status: 'pending',
        summary: 'Writing test',
        correlationId: 'test-123',
        timestamp: new Date('2026-02-16T10:00:00.000Z'),
      },
      {
        id: 2,
        eventType: 'post_tool_use',
        agentName: 'Murdock',
        toolName: 'Write',
        status: 'success',
        summary: 'Wrote test',
        correlationId: 'test-123',
        timestamp: new Date('2026-02-16T10:00:01.000Z'),
      },
    ];

    const original = structuredClone(events); // Deep clone preserving Date objects
    pairDurations(events);

    expect(events).toEqual(original); // Original array unchanged
  });

  it('handles empty events array', () => {
    const result = pairDurations([]);
    expect(result).toEqual([]);
  });

  it('preserves all event properties during pairing', () => {
    const events: HookEventSummary[] = [
      {
        id: 1,
        eventType: 'pre_tool_use',
        agentName: 'Murdock',
        toolName: 'Write',
        status: 'pending',
        summary: 'Writing test',
        correlationId: 'preserve-123',
        timestamp: new Date('2026-02-16T10:00:00.000Z'),
      },
      {
        id: 2,
        eventType: 'post_tool_use',
        agentName: 'Murdock',
        toolName: 'Write',
        status: 'success',
        summary: 'Wrote test',
        correlationId: 'preserve-123',
        timestamp: new Date('2026-02-16T10:00:02.000Z'),
        durationMs: 999, // Pre-existing value should be overwritten
      },
    ];

    const result = pairDurations(events);

    // Check all properties are preserved on post_tool_use event
    expect(result[1]).toEqual({
      id: 2,
      eventType: 'post_tool_use',
      agentName: 'Murdock',
      toolName: 'Write',
      status: 'success',
      summary: 'Wrote test',
      correlationId: 'preserve-123',
      timestamp: new Date('2026-02-16T10:00:02.000Z'),
      durationMs: 2000, // Calculated duration
    });
  });
});
