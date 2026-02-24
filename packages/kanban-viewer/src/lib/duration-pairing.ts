/**
 * Duration Pairing
 *
 * Pure function that pairs PreToolUse events with matching PostToolUse/PostToolUseFailure
 * events using correlation IDs to calculate tool call duration.
 */

import type { HookEventSummary } from '@/types/hook-event';

/**
 * Pairs PreToolUse events with PostToolUse/PostToolUseFailure events to calculate durations.
 *
 * @param events - Array of hook event summaries
 * @returns New array with durationMs calculated for paired post events
 */
export function pairDurations(events: HookEventSummary[]): HookEventSummary[] {
  // Build a map of correlationId → timestamp from pre_tool_use events
  const preTimestamps = new Map<string, number>();

  for (const event of events) {
    if (event.eventType === 'pre_tool_use' && event.correlationId) {
      preTimestamps.set(event.correlationId, event.timestamp.getTime());
    }
  }

  // Process each event and calculate durations for post events
  return events.map((event) => {
    // Only process post_tool_use and post_tool_use_failure events
    if (
      (event.eventType === 'post_tool_use' || event.eventType === 'post_tool_use_failure') &&
      event.correlationId
    ) {
      // Look up the matching pre_tool_use timestamp
      const preTimestamp = preTimestamps.get(event.correlationId);

      if (preTimestamp !== undefined) {
        // Calculate duration and return new event object with durationMs
        const postTimestamp = event.timestamp.getTime();
        const durationMs = postTimestamp - preTimestamp;

        return {
          ...event,
          durationMs,
        };
      }
    }

    // For all other events (pre_tool_use, unpaired post events, events without correlationId),
    // return a copy without durationMs
    return { ...event };
  });
}
