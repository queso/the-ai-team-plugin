/**
 * SSE (Server-Sent Events) utility functions for formatting and parsing board events
 */

import type { BoardEvent } from '@/types';

/**
 * Formats a BoardEvent into SSE wire format
 *
 * SSE format:
 * data: {"type":"...","timestamp":"...","data":{...}}
 *
 * (followed by double newline)
 *
 * @param event - The board event to format
 * @returns Formatted SSE message string
 */
export function formatSSEEvent(event: BoardEvent): string {
  // Use a replacer to convert undefined to null to preserve property existence
  const json = JSON.stringify(event, (_, value) => (value === undefined ? null : value));
  return `data: ${json}\n\n`;
}

/**
 * Parses an SSE message string back into a BoardEvent object
 *
 * @param message - The SSE formatted message string
 * @returns Parsed BoardEvent object
 * @throws Error if the message is not valid SSE format or contains invalid JSON
 */
export function parseSSEEvent(message: string): BoardEvent {
  // Remove the 'data: ' prefix
  const dataPrefix = 'data: ';
  if (!message.startsWith(dataPrefix)) {
    throw new Error('Invalid SSE format: message must start with "data: "');
  }

  // Extract JSON string (remove prefix and trailing newlines)
  const jsonString = message.slice(dataPrefix.length).trim();

  try {
    const event = JSON.parse(jsonString) as BoardEvent;
    return event;
  } catch (error) {
    throw new Error(`Invalid SSE format: failed to parse JSON - ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}
