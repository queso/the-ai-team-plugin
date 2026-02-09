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
export declare const config: Config;
//# sourceMappingURL=config.d.ts.map