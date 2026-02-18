/**
 * Unified ToolResponse type and error formatting utilities.
 *
 * Consolidates the ToolResponse interface, ToolErrorResponse,
 * ApiErrorLike, and formatErrorMessage that were previously
 * duplicated across multiple tool modules.
 */
/**
 * Extracts a human-readable error message from various error shapes.
 *
 * Handles:
 * - Error instances (including ECONNREFUSED)
 * - API-like objects with a message property
 * - Unknown values (returns fallback)
 */
export function formatErrorMessage(error) {
    if (error instanceof Error) {
        const withCode = error;
        if (withCode.code === 'ECONNREFUSED') {
            return 'Connection refused - server may be unavailable';
        }
        return error.message;
    }
    if (typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string') {
        return error.message;
    }
    return 'Unknown error occurred';
}
//# sourceMappingURL=tool-response.js.map