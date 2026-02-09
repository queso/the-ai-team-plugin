/**
 * Type definitions for the Kanban API HTTP Client.
 * These types define the contract for all API communication.
 */
/**
 * Error thrown when API request fails.
 */
export class ApiRequestError extends Error {
    /** HTTP status code */
    status;
    /** Error code for MCP compatibility */
    code;
    /** Original API error details */
    details;
    constructor(apiError) {
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
    code;
    /** Original error that caused this */
    cause;
    constructor(message, code, cause) {
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
    attempts;
    /** Last error encountered */
    lastError;
    constructor(attempts, lastError) {
        super(`Request failed after ${attempts} attempts: ${lastError.message}`);
        this.name = 'MaxRetriesExceededError';
        this.attempts = attempts;
        this.lastError = lastError;
    }
}
//# sourceMappingURL=types.js.map