/**
 * Type definitions for the Kanban API HTTP Client.
 * These types define the contract for all API communication.
 */

/**
 * HTTP methods supported by the client.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * Configuration options for the HTTP client.
 */
export interface ClientConfig {
  /** Base URL for API requests */
  baseUrl: string;
  /** Optional API key for authentication */
  apiKey?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Number of retry attempts (default: 3) */
  retries?: number;
}

/**
 * Options for individual API requests.
 */
export interface RequestOptions<TBody = unknown> {
  /** HTTP method */
  method: HttpMethod;
  /** URL path (relative to base URL) */
  path: string;
  /** Request body (for POST/PUT) */
  body?: TBody;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Override default timeout for this request */
  timeout?: number;
  /** Override default retry count for this request */
  retries?: number;
}

/**
 * Successful API response wrapper.
 */
export interface ApiResponse<TData = unknown> {
  /** Response data */
  data: TData;
  /** HTTP status code */
  status: number;
  /** Response headers */
  headers: Record<string, string>;
}

/**
 * API error structure returned by the server.
 */
export interface ApiError {
  /** HTTP status code */
  status: number;
  /** Error message from server */
  message: string;
  /** Optional error code */
  code?: string;
  /** Optional additional details */
  details?: unknown;
}

/**
 * Error thrown when API request fails.
 */
export class ApiRequestError extends Error {
  /** HTTP status code */
  readonly status: number;
  /** Error code for MCP compatibility */
  readonly code: string;
  /** Original API error details */
  readonly details?: unknown;

  constructor(apiError: ApiError) {
    super(apiError.message);
    this.name = 'ApiRequestError';
    this.status = apiError.status;
    this.code = apiError.code ?? 'API_ERROR';
    this.details = apiError.details;
  }
}

/**
 * Error thrown when network request fails.
 */
export class NetworkError extends Error {
  /** Error code (e.g., ECONNREFUSED, TIMEOUT) */
  readonly code: string;
  /** Original error that caused this */
  readonly cause?: Error;

  constructor(message: string, code: string, cause?: Error) {
    super(message);
    this.name = 'NetworkError';
    this.code = code;
    this.cause = cause;
  }
}

/**
 * Error thrown when max retries exceeded.
 */
export class MaxRetriesExceededError extends Error {
  /** Number of attempts made */
  readonly attempts: number;
  /** Last error encountered */
  readonly lastError: Error;

  constructor(attempts: number, lastError: Error) {
    super(`Request failed after ${attempts} attempts: ${lastError.message}`);
    this.name = 'MaxRetriesExceededError';
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

/**
 * HTTP client interface for API communication.
 */
export interface KanbanApiClient {
  /**
   * Perform a GET request.
   */
  get<TResponse>(path: string, options?: Partial<RequestOptions>): Promise<ApiResponse<TResponse>>;

  /**
   * Perform a POST request.
   */
  post<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: Partial<RequestOptions<TBody>>
  ): Promise<ApiResponse<TResponse>>;

  /**
   * Perform a PUT request.
   */
  put<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: Partial<RequestOptions<TBody>>
  ): Promise<ApiResponse<TResponse>>;

  /**
   * Perform a DELETE request.
   */
  delete<TResponse>(path: string, options?: Partial<RequestOptions>): Promise<ApiResponse<TResponse>>;

  /**
   * Perform a generic request.
   */
  request<TResponse, TBody = unknown>(
    options: RequestOptions<TBody>
  ): Promise<ApiResponse<TResponse>>;
}

/**
 * Board item from the Kanban API.
 */
export interface BoardItem {
  id: string;
  title: string;
  status: string;
  type: string;
  dependencies?: string[];
  parallel_group?: string;
  assigned_agent?: string;
}

/**
 * Board state from the Kanban API.
 */
export interface BoardState {
  mission: string;
  phases: string[];
  items: BoardItem[];
  wip_limit: number;
}

/**
 * Activity log entry.
 */
export interface ActivityLogEntry {
  timestamp: string;
  agent: string;
  message: string;
}
