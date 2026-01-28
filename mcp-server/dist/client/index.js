/**
 * Kanban API HTTP Client implementation.
 * Provides a typed HTTP client with retry logic and error handling.
 */
import { ApiRequestError, NetworkError, MaxRetriesExceededError, } from './types.js';
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
function isRetryableStatus(status) {
    return status >= 500 && status < 600;
}
/**
 * Determines if an error is a network error that should be retried.
 */
function isNetworkError(error) {
    return error instanceof Error && !(error instanceof ApiRequestError);
}
/**
 * Calculates the delay for exponential backoff.
 * @param attempt Zero-indexed attempt number (0 = first retry)
 * @returns Delay in milliseconds (1000, 2000, 4000, ...)
 */
function calculateBackoffDelay(attempt) {
    return BASE_DELAY_MS * Math.pow(2, attempt);
}
/**
 * Delays execution for a specified duration.
 * Uses setTimeout for proper exponential backoff timing.
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Builds a full URL from base URL and path.
 * Handles trailing/leading slashes correctly.
 */
function buildUrl(baseUrl, path) {
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${normalizedBase}${normalizedPath}`;
}
/**
 * Parses response headers into a plain object.
 */
function parseHeaders(headers) {
    const result = {};
    if (headers instanceof Map) {
        headers.forEach((value, key) => {
            result[key] = value;
        });
    }
    else {
        headers.forEach((value, key) => {
            result[key] = value;
        });
    }
    return result;
}
/**
 * Transforms a fetch error into the appropriate error type.
 */
function transformNetworkError(error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
        return new NetworkError('Request timeout', 'TIMEOUT', error);
    }
    if (error instanceof Error) {
        const code = error.code ?? 'NETWORK_ERROR';
        return new NetworkError(error.message, code, error);
    }
    return new NetworkError('Unknown network error', 'UNKNOWN');
}
/**
 * Parses the response body, handling empty responses.
 */
async function parseResponseBody(response) {
    if (response.status === 204) {
        return undefined;
    }
    try {
        return await response.json();
    }
    catch {
        // If JSON parsing fails, return undefined
        return undefined;
    }
}
/**
 * Creates a Kanban API HTTP client with the specified configuration.
 */
export function createClient(config) {
    const { baseUrl, projectId, apiKey, timeout = DEFAULT_TIMEOUT, retries = DEFAULT_RETRIES } = config;
    /**
     * Performs a single HTTP request without retry logic.
     */
    async function performRequest(options, requestTimeout) {
        const url = buildUrl(baseUrl, options.path);
        const headers = {
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
            const fetchOptions = {
                method: options.method,
                headers,
                signal,
            };
            if (options.body !== undefined && options.body !== null) {
                fetchOptions.body = JSON.stringify(options.body);
            }
            const response = await fetch(url, fetchOptions);
            const responseHeaders = parseHeaders(response.headers);
            // Parse response body
            const data = await parseResponseBody(response);
            if (!response.ok) {
                // Extract error message from response
                const errorMessage = data?.message ?? response.statusText;
                // Throw appropriate error based on status
                if (isRetryableStatus(response.status)) {
                    throw new ApiRequestError({
                        status: response.status,
                        message: errorMessage,
                    });
                }
                throw new ApiRequestError({
                    status: response.status,
                    message: errorMessage,
                });
            }
            return {
                data: data,
                status: response.status,
                headers: responseHeaders,
            };
        }
        catch (error) {
            if (error instanceof ApiRequestError) {
                throw error;
            }
            throw transformNetworkError(error);
        }
    }
    /**
     * Performs an HTTP request with retry logic.
     */
    async function request(options) {
        const requestTimeout = options.timeout ?? timeout;
        const maxRetries = options.retries ?? retries;
        let lastError = null;
        let attempt = 0;
        const totalAttempts = maxRetries + 1; // 1 initial + N retries
        while (attempt < totalAttempts) {
            try {
                return await performRequest(options, requestTimeout);
            }
            catch (error) {
                lastError = error;
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
            throw lastError;
        }
        // All retries exhausted - attempt count is total attempts made
        throw new MaxRetriesExceededError(attempt, lastError);
    }
    /**
     * Performs a GET request.
     */
    async function get(path, options) {
        return request({
            method: 'GET',
            path,
            ...options,
        });
    }
    /**
     * Performs a POST request.
     */
    async function post(path, body, options) {
        return request({
            method: 'POST',
            path,
            body,
            ...options,
        });
    }
    /**
     * Performs a PUT request.
     */
    async function put(path, body, options) {
        return request({
            method: 'PUT',
            path,
            body,
            ...options,
        });
    }
    /**
     * Performs a PATCH request.
     */
    async function patch(path, body, options) {
        return request({
            method: 'PATCH',
            path,
            body,
            ...options,
        });
    }
    /**
     * Performs a DELETE request.
     */
    async function del(path, options) {
        return request({
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
//# sourceMappingURL=index.js.map