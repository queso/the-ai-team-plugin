/**
 * Activity Log Parser
 *
 * Parses log entries from the A(i)-Team activity log format.
 * Format: {ISO timestamp} [{Agent}] {Action message}
 *
 * Example:
 *   2026-01-15T10:42:15Z [B.A.] Implementing JWT token refresh logic
 */

export interface LogEntry {
  timestamp: string;
  agent: string;
  message: string;
  highlightType?: 'approved' | 'rejected' | 'alert' | 'committed';
}

// Regex to match the log format: ISO timestamp, agent in brackets, message
// Captures: timestamp, agent name, message
const LOG_ENTRY_REGEX = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)\s+\[([^\]]+)\]\s+(.+)$/;

/**
 * Parse a single log line into a LogEntry object.
 *
 * @param line - A single line from the activity log
 * @returns LogEntry object or null if the line is malformed
 */
export function parseLogEntry(line: string): LogEntry | null {
  if (!line || line.trim() === '') {
    return null;
  }

  const match = line.match(LOG_ENTRY_REGEX);
  if (!match) {
    return null;
  }

  const [, timestamp, agent, message] = match;

  // Determine highlight type based on message prefix
  let highlightType: LogEntry['highlightType'];
  if (message.startsWith('APPROVED')) {
    highlightType = 'approved';
  } else if (message.startsWith('REJECTED')) {
    highlightType = 'rejected';
  } else if (message.startsWith('ALERT:')) {
    highlightType = 'alert';
  } else if (message.startsWith('COMMITTED')) {
    highlightType = 'committed';
  }

  return {
    timestamp,
    agent,
    message,
    highlightType,
  };
}

/**
 * Parse an entire log file content into an array of LogEntry objects.
 *
 * @param content - The full content of a log file
 * @param lastN - Optional: only return the last N entries (for initial load)
 * @returns Array of LogEntry objects (malformed lines are skipped)
 */
export function parseLogFile(content: string, lastN?: number): LogEntry[] {
  if (!content || content.trim() === '') {
    return [];
  }

  const lines = content.split('\n');
  const entries: LogEntry[] = [];

  for (const line of lines) {
    const entry = parseLogEntry(line);
    if (entry) {
      entries.push(entry);
    }
  }

  // If lastN is specified, return only the last N entries
  if (lastN !== undefined) {
    if (lastN <= 0) {
      return [];
    }
    return entries.slice(-lastN);
  }

  return entries;
}
