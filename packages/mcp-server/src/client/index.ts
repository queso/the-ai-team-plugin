/**
 * Kanban API HTTP Client implementation.
 * Provides a typed HTTP client with retry logic and error handling.
 */

import {
  ClientConfig,
  RequestOptions,
  ApiResponse,
  KanbanApiClient,
  ApiRequestError,
  NetworkError,
  MaxRetriesExceededError,
} from './types.js';

// Re-export types for convenience
export * from './types.js';

/**
 * Default configuration values.
 */
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRIES = 3;
const BASE_DELAY_MS = 1000;

/**
 * Determines if an HTTP status code is retryable (5xx server errors).
 */
function isRetryableStatus(status: number): boolean {
  return status >= 500 && status < 600;
}

/**
 * Determines if an error is a network error that should be retried.
 */
function isNetworkError(error: unknown): boolean {
  return error instanceof Error && !(error instanceof ApiRequestError);
}

/**
 * Calculates the delay for exponential backoff.
 * @param attempt Zero-indexed attempt number (0 = first retry)
 * @returns Delay in milliseconds (1000, 2000, 4000, ...)
 */
function calculateBackoffDelay(attempt: number): number {
  return BASE_DELAY_MS * Math.pow(2, attempt);
}

/**
 * Delays execution for a specified duration.
 * Uses setTimeout for proper exponential backoff timing.
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Builds a full URL from base URL and path.
 * Handles trailing/leading slashes correctly.
 */
function buildUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

/**
 * Parses response headers into a plain object.
 */
function parseHeaders(headers: Headers | Map<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  if (headers instanceof Map) {
    headers.forEach((value, key) => {
      result[key] = value;
    });
  } else {
    headers.forEach((value, key) => {
      result[key] = value;
    });
  }
  return result;
}

/**
 * Transforms a fetch error into the appropriate error type.
 */
function transformNetworkError(error: unknown): NetworkError {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new NetworkError('Request timeout', 'TIMEOUT', error);
  }

  if (error instanceof Error) {
    const code = (error as Error & { code?: string }).code ?? 'NETWORK_ERROR';
    return new NetworkError(error.message, code, error);
  }

  return new NetworkError('Unknown network error', 'UNKNOWN');
}

/**
 * Parses the response body, handling empty responses.
 */
async function parseResponseBody<T>(response: Response | { ok: boolean; status: number; json(): Promise<T>; text(): Promise<string> }): Promise<T | undefined> {
  if (response.status === 204) {
    return undefined;
  }

  try {
    return await response.json() as T;
  } catch {
    // If JSON parsing fails, return undefined
    return undefined;
  }
}

/**
 * Creates a Kanban API HTTP client with the specified configuration.
 */
export function createClient(config: ClientConfig): KanbanApiClient {
  const { baseUrl, projectId, apiKey, timeout = DEFAULT_TIMEOUT, retries = DEFAULT_RETRIES } = config;

  /**
   * Performs a single HTTP request without retry logic.
   */
  async function performRequest<TResponse, TBody = unknown>(
    options: RequestOptions<TBody>,
    requestTimeout: number
  ): Promise<ApiResponse<TResponse>> {
    const url = buildUrl(baseUrl, options.path);

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-Project-ID': projectId,
      ...options.headers,
    };

    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    if (options.body !== undefined && options.body !== null) {
      headers['Content-Type'] = 'application/json';
    }

    // Use AbortSignal.timeout for request timeout (doesn't use setTimeout)
    const signal = AbortSignal.timeout(requestTimeout);

    try {
      const fetchOptions: RequestInit = {
        method: options.method,
        headers,
        signal,
      };

      if (options.body !== undefined && options.body !== null) {
        fetchOptions.body = JSON.stringify(options.body);
      }

      const response = await fetch(url, fetchOptions);

      const responseHeaders = parseHeaders(response.headers as Headers | Map<string, string>);

      // Parse response body
      const data = await parseResponseBody<TResponse>(response);

      if (!response.ok) {
        // Extract error from nested API response structure
        // API returns: { success: false, error: { code, message, details } }
        const errorData = data as {
          error?: { code?: string; message?: string; details?: unknown };
          message?: string;
        };
        const errorCode = errorData?.error?.code ?? 'API_ERROR';
        const errorMessage = errorData?.error?.message ?? errorData?.message ?? response.statusText;
        const errorDetails = errorData?.error?.details;

        throw new ApiRequestError({
          status: response.status,
          code: errorCode,
          message: errorMessage,
          details: errorDetails,
        });
      }

      return {
        data: data as TResponse,
        status: response.status,
        headers: responseHeaders,
      };
    } catch (error) {
      if (error instanceof ApiRequestError) {
        throw error;
      }

      throw transformNetworkError(error);
    }
  }

  /**
   * Performs an HTTP request with retry logic.
   */
  async function request<TResponse, TBody = unknown>(
    options: RequestOptions<TBody>
  ): Promise<ApiResponse<TResponse>> {
    const requestTimeout = options.timeout ?? timeout;
    const maxRetries = options.retries ?? retries;

    let lastError: Error | null = null;
    let attempt = 0;
    const totalAttempts = maxRetries + 1; // 1 initial + N retries

    while (attempt < totalAttempts) {
      try {
        return await performRequest<TResponse, TBody>(options, requestTimeout);
      } catch (error) {
        lastError = error as Error;

        // Don't retry client errors (4xx)
        if (error instanceof ApiRequestError && !isRetryableStatus(error.status)) {
          throw error;
        }

        attempt++;

        // Don't retry if we've exhausted retries
        if (attempt >= totalAttempts) {
          break;
        }

        // Calculate and wait for backoff delay (attempt-1 because attempt is now 1-indexed for retries)
        const backoffDelay = calculateBackoffDelay(attempt - 1);
        await delay(backoffDelay);
      }
    }

    // If no retries were configured (maxRetries = 0), throw the original error
    // Otherwise, wrap in MaxRetriesExceededError
    if (maxRetries === 0) {
      throw lastError!;
    }

    // All retries exhausted - attempt count is total attempts made
    throw new MaxRetriesExceededError(attempt, lastError!);
  }

  /**
   * Performs a GET request.
   */
  async function get<TResponse>(
    path: string,
    options?: Partial<RequestOptions>
  ): Promise<ApiResponse<TResponse>> {
    return request<TResponse>({
      method: 'GET',
      path,
      ...options,
    });
  }

  /**
   * Performs a POST request.
   */
  async function post<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: Partial<RequestOptions<TBody>>
  ): Promise<ApiResponse<TResponse>> {
    return request<TResponse, TBody>({
      method: 'POST',
      path,
      body,
      ...options,
    });
  }

  /**
   * Performs a PUT request.
   */
  async function put<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: Partial<RequestOptions<TBody>>
  ): Promise<ApiResponse<TResponse>> {
    return request<TResponse, TBody>({
      method: 'PUT',
      path,
      body,
      ...options,
    });
  }

  /**
   * Performs a PATCH request.
   */
  async function patch<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: Partial<RequestOptions<TBody>>
  ): Promise<ApiResponse<TResponse>> {
    return request<TResponse, TBody>({
      method: 'PATCH',
      path,
      body,
      ...options,
    });
  }

  /**
   * Performs a DELETE request.
   */
  async function del<TResponse>(
    path: string,
    options?: Partial<RequestOptions>
  ): Promise<ApiResponse<TResponse>> {
    return request<TResponse>({
      method: 'DELETE',
      path,
      ...options,
    });
  }

  return {
    get,
    post,
    put,
    patch,
    delete: del,
    request,
  };
}
