/**
 * Configuration module for the MCP server.
 * Reads environment variables with sensible defaults.
 */

export interface Config {
  /** Base URL for the A(i)-Team API */
  apiUrl: string;
  /** Project ID for multi-project isolation */
  projectId: string;
  /** Optional API key for authentication */
  apiKey: string | undefined;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Number of retry attempts for failed requests */
  retries: number;
}

/** Maximum allowed timeout in milliseconds (5 minutes) */
const MAX_TIMEOUT = 300000;

/** Maximum allowed retry attempts */
const MAX_RETRIES = 10;

/** Default API URL */
const DEFAULT_API_URL = 'http://localhost:3000';

/** Default timeout in milliseconds */
const DEFAULT_TIMEOUT = 10000;

/** Default retry count */
const DEFAULT_RETRIES = 3;

/**
 * Check if a string is a valid URL.
 */
function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse a string environment variable with trimming and empty check.
 * Returns undefined if the value is undefined, empty, or whitespace-only.
 */
function parseStringEnv(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

/**
 * Parse and validate an API URL from environment variable.
 * Returns the default URL if the value is undefined, empty, whitespace-only, or invalid.
 */
function parseApiUrl(value: string | undefined, defaultValue: string): string {
  const parsed = parseStringEnv(value);
  if (parsed === undefined) {
    return defaultValue;
  }
  return isValidUrl(parsed) ? parsed : defaultValue;
}

/**
 * Parse an integer from environment variable with bounds checking.
 * Returns the default value if:
 * - The value is undefined, empty, or whitespace-only
 * - The value is not a valid integer
 * - The value is less than or equal to zero
 * - The value exceeds the maximum bound
 */
function parseIntEnv(
  value: string | undefined,
  defaultValue: number,
  maxValue: number
): number {
  if (value === undefined) {
    return defaultValue;
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    return defaultValue;
  }
  const parsed = parseInt(trimmed, 10);
  if (isNaN(parsed) || parsed <= 0) {
    return defaultValue;
  }
  return parsed > maxValue ? maxValue : parsed;
}

/**
 * Parse and validate project ID from environment variable.
 * Returns 'default' if not set - allows single-project usage without configuration.
 */
function parseProjectId(value: string | undefined): string {
  const parsed = parseStringEnv(value);
  return parsed ?? 'default';
}

export const config: Config = {
  apiUrl: parseApiUrl(process.env.ATEAM_API_URL, DEFAULT_API_URL),
  projectId: parseProjectId(process.env.ATEAM_PROJECT_ID),
  apiKey: process.env.ATEAM_API_KEY,
  timeout: parseIntEnv(process.env.ATEAM_TIMEOUT, DEFAULT_TIMEOUT, MAX_TIMEOUT),
  retries: parseIntEnv(process.env.ATEAM_RETRIES, DEFAULT_RETRIES, MAX_RETRIES),
};
