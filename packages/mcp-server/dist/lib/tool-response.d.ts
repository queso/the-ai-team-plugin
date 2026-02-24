/**
 * Unified ToolResponse type and error formatting utilities.
 *
 * Consolidates the ToolResponse interface, ToolErrorResponse,
 * ApiErrorLike, and formatErrorMessage that were previously
 * duplicated across multiple tool modules.
 */
/**
 * Standard MCP tool response structure.
 * Used by all tool modules for both success and error responses.
 */
export interface ToolResponse<T = unknown> {
    content: Array<{
        type: 'text';
        text: string;
    }>;
    data?: T;
    isError?: boolean;
}
/**
 * Structured error response with code and message.
 * Used for validation errors and API error responses.
 */
export interface ToolErrorResponse {
    isError: true;
    code: string;
    message: string;
}
/**
 * Shape for API-like error objects with optional status and message.
 */
export interface ApiErrorLike {
    status?: number;
    message?: string;
}
/**
 * Extracts a human-readable error message from various error shapes.
 *
 * Handles:
 * - Error instances (including ECONNREFUSED)
 * - API-like objects with a message property
 * - Unknown values (returns fallback)
 */
export declare function formatErrorMessage(error: unknown): string;
//# sourceMappingURL=tool-response.d.ts.map