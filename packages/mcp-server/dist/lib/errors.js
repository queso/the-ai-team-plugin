/**
 * Error formatting utilities for MCP tools.
 * Transforms API and network errors into structured MCP responses.
 */
/**
 * Maps HTTP status codes to MCP error codes.
 */
const STATUS_CODE_MAP = {
    400: 'VALIDATION_ERROR',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    429: 'RATE_LIMITED',
    500: 'SERVER_ERROR',
    502: 'BAD_GATEWAY',
    503: 'SERVICE_UNAVAILABLE',
    504: 'GATEWAY_TIMEOUT',
};
/**
 * Validates that a status code is a valid HTTP status code.
 * Must be an integer between 100 and 599.
 */
function isValidHttpStatusCode(status) {
    return (Number.isFinite(status) &&
        Number.isInteger(status) &&
        status >= 100 &&
        status <= 599);
}
/**
 * Validates that a message is a valid non-empty string.
 */
function isValidMessage(message) {
    return typeof message === 'string' && message.trim().length > 0;
}
/**
 * Converts an HTTP API error to MCP error format.
 */
export function formatApiError(error) {
    // Validate status code
    if (!isValidHttpStatusCode(error.status)) {
        return {
            isError: true,
            code: 'INVALID_STATUS',
            message: `Invalid status code: ${error.status}`,
        };
    }
    // Validate message type
    if (typeof error.message !== 'string') {
        return {
            isError: true,
            code: STATUS_CODE_MAP[error.status] ?? 'API_ERROR',
            message: 'Invalid error message format',
        };
    }
    // Handle empty/whitespace message
    if (error.message.trim().length === 0) {
        return {
            isError: true,
            code: STATUS_CODE_MAP[error.status] ?? 'API_ERROR',
            message: 'Unknown error',
        };
    }
    const code = STATUS_CODE_MAP[error.status] ?? 'API_ERROR';
    return {
        isError: true,
        code,
        message: error.message,
    };
}
/**
 * Converts a network error to MCP error format.
 */
export function formatNetworkError(error) {
    const networkError = error;
    // Connection refused
    if (networkError.code === 'ECONNREFUSED') {
        return {
            isError: true,
            code: 'CONNECTION_FAILED',
            message: 'Failed to connect to the API server. Please ensure it is running.',
        };
    }
    // Timeout
    if (error.name === 'TimeoutError' || error.message.includes('timed out')) {
        return {
            isError: true,
            code: 'TIMEOUT',
            message: 'Request timed out. The server may be overloaded.',
        };
    }
    // DNS resolution failure
    if (networkError.code === 'ENOTFOUND') {
        return {
            isError: true,
            code: 'DNS_ERROR',
            message: 'Could not resolve the API server address.',
        };
    }
    // Generic network error
    return {
        isError: true,
        code: 'NETWORK_ERROR',
        message: error.message,
    };
}
/**
 * Type guard to check if an error is an API error.
 * Uses Object.hasOwn to prevent prototype pollution attacks.
 * Validates status is a valid HTTP code and message is a string.
 */
function isApiError(error) {
    if (typeof error !== 'object' || error === null) {
        return false;
    }
    // Use Object.hasOwn to check own properties only (prevents prototype pollution)
    if (!Object.hasOwn(error, 'status') || !Object.hasOwn(error, 'message')) {
        return false;
    }
    const candidate = error;
    // Validate status is a valid HTTP status code
    if (!isValidHttpStatusCode(candidate.status)) {
        return false;
    }
    // Validate message is a string
    if (typeof candidate.message !== 'string') {
        return false;
    }
    return true;
}
/**
 * Safely converts an unknown error to a string.
 * Handles objects without producing [object Object].
 * Handles circular references gracefully.
 */
function formatUnknownError(error) {
    // Handle null and undefined
    if (error === null) {
        return 'null';
    }
    if (error === undefined) {
        return 'undefined';
    }
    // Handle primitives
    if (typeof error === 'string') {
        return error;
    }
    if (typeof error === 'number' || typeof error === 'boolean') {
        return String(error);
    }
    // Handle objects - try JSON.stringify with circular reference handling
    if (typeof error === 'object') {
        try {
            const seen = new WeakSet();
            const result = JSON.stringify(error, (key, value) => {
                if (typeof value === 'object' && value !== null) {
                    if (seen.has(value)) {
                        return '[Circular]';
                    }
                    seen.add(value);
                }
                return value;
            });
            return result;
        }
        catch {
            // Fallback if JSON.stringify fails for any reason
            return 'Unknown error (could not serialize)';
        }
    }
    // Fallback for functions and symbols
    return String(error);
}
/**
 * Wraps a tool handler with error boundary that catches and formats errors.
 */
export function withErrorBoundary(handler) {
    return async (args) => {
        try {
            return await handler(args);
        }
        catch (error) {
            // API error
            if (isApiError(error)) {
                return formatApiError(error);
            }
            // Network/system error
            if (error instanceof Error) {
                return formatNetworkError(error);
            }
            // Unknown error type
            return {
                isError: true,
                code: 'UNKNOWN_ERROR',
                message: formatUnknownError(error),
            };
        }
    };
}
//# sourceMappingURL=errors.js.map