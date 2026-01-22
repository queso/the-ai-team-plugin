/**
 * Utility MCP tools.
 *
 * Provides helper functionality:
 * - deps_check: Validate dependency graph and detect cycles
 * - activity_log: Append structured JSON to activity feed
 * - log: Simple shorthand for activity logging
 */
import { z } from 'zod';
/**
 * Schema for deps_check tool input.
 */
export declare const DepsCheckSchema: z.ZodObject<{
    verbose: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    verbose?: boolean | undefined;
}, {
    verbose?: boolean | undefined;
}>;
/**
 * Schema for activity_log tool input.
 */
export declare const ActivityLogSchema: z.ZodObject<{
    agent: z.ZodEffects<z.ZodString, "murdock" | "ba" | "lynch" | "amy" | "hannibal" | "face" | "sosa" | "tawnia", string>;
    message: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
    agent: "murdock" | "ba" | "lynch" | "amy" | "hannibal" | "face" | "sosa" | "tawnia";
}, {
    message: string;
    agent: string;
}>;
/**
 * Schema for log tool input (simple shorthand).
 */
export declare const LogSchema: z.ZodObject<{
    agent: z.ZodEffects<z.ZodString, "murdock" | "ba" | "lynch" | "amy" | "hannibal" | "face" | "sosa" | "tawnia", string>;
    message: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
    agent: "murdock" | "ba" | "lynch" | "amy" | "hannibal" | "face" | "sosa" | "tawnia";
}, {
    message: string;
    agent: string;
}>;
type DepsCheckInput = z.infer<typeof DepsCheckSchema>;
type ActivityLogInput = z.infer<typeof ActivityLogSchema>;
type LogInput = z.infer<typeof LogSchema>;
interface DepsCheckResponse {
    valid: boolean;
    totalItems: number;
    cycles: string[][];
    depths: Record<string, number>;
    maxDepth: number;
    parallelWaves: number;
    readyItems: string[];
    validationErrors?: Array<{
        item: string;
        error: string;
        dependency?: string;
        message: string;
    }>;
    waves?: Record<string, string[]>;
    graph?: Record<string, string[]>;
    message?: string;
}
interface ActivityLogResponse {
    success: boolean;
    logged: {
        timestamp: string;
        agent: string;
        message: string;
    };
}
interface ToolResponse<T = unknown> {
    content: Array<{
        type: 'text';
        text: string;
    }>;
    data?: T;
    isError?: boolean;
}
/**
 * Validates the dependency graph and detects cycles.
 */
export declare function depsCheck(input: DepsCheckInput): Promise<ToolResponse<DepsCheckResponse>>;
/**
 * Appends structured JSON to activity feed.
 */
export declare function activityLog(input: ActivityLogInput): Promise<ToolResponse<ActivityLogResponse>>;
/**
 * Simple shorthand for activity logging.
 */
export declare function log(input: LogInput): Promise<ToolResponse<ActivityLogResponse>>;
/**
 * Tool definitions for MCP server registration.
 */
export declare const utilsTools: ({
    name: string;
    description: string;
    inputSchema: object;
    handler: typeof depsCheck;
} | {
    name: string;
    description: string;
    inputSchema: object;
    handler: typeof activityLog;
})[];
export {};
//# sourceMappingURL=utils.d.ts.map