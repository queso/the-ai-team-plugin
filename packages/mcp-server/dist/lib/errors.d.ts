/**
 * Error formatting utilities for MCP tools.
 * Transforms API and network errors into structured MCP responses.
 */
/**
 * Standard error response structure for MCP tools.
 */
export interface McpErrorResponse {
    isError: boolean;
    code: string;
    message: string;
}
/**
 * API error input structure.
 */
interface ApiError {
    status: number;
    message: string;
}
/**
 * Converts an HTTP API error to MCP error format.
 */
export declare function formatApiError(error: ApiError): McpErrorResponse;
/**
 * Converts a network error to MCP error format.
 */
export declare function formatNetworkError(error: Error): McpErrorResponse;
/**
 * Wraps a tool handler with error boundary that catches and formats errors.
 */
export declare function withErrorBoundary<TArgs, TResult>(handler: (args: TArgs) => Promise<TResult>): (args: TArgs) => Promise<TResult | McpErrorResponse>;
export {};
//# sourceMappingURL=errors.d.ts.map