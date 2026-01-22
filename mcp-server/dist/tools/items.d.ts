/**
 * Item-related MCP tools.
 *
 * Provides CRUD operations for work items:
 * - item_create: Create a new work item
 * - item_update: Update an existing work item
 * - item_get: Retrieve a single item by ID
 * - item_list: List items with optional filtering
 * - item_reject: Record rejection with reason
 * - item_render: Get markdown representation
 */
import { z } from 'zod';
import { type McpErrorResponse } from '../lib/errors.js';
/**
 * Schema for item_create tool input.
 */
export declare const ItemCreateInputSchema: z.ZodObject<{
    title: z.ZodString;
    type: z.ZodEnum<["feature", "bug", "task"]>;
    status: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    dependencies: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    parallel_group: z.ZodOptional<z.ZodString>;
    outputs: z.ZodOptional<z.ZodObject<{
        test: z.ZodString;
        impl: z.ZodString;
        types: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        test: string;
        impl: string;
        types?: string | undefined;
    }, {
        test: string;
        impl: string;
        types?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    status: string;
    type: "feature" | "bug" | "task";
    title: string;
    dependencies: string[];
    parallel_group?: string | undefined;
    outputs?: {
        test: string;
        impl: string;
        types?: string | undefined;
    } | undefined;
}, {
    type: "feature" | "bug" | "task";
    title: string;
    status?: string | undefined;
    dependencies?: string[] | undefined;
    parallel_group?: string | undefined;
    outputs?: {
        test: string;
        impl: string;
        types?: string | undefined;
    } | undefined;
}>;
/**
 * Schema for item_update tool input.
 */
export declare const ItemUpdateInputSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    assigned_agent: z.ZodOptional<z.ZodString>;
    rejection_count: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    status?: string | undefined;
    title?: string | undefined;
    assigned_agent?: string | undefined;
    rejection_count?: number | undefined;
}, {
    id: string;
    status?: string | undefined;
    title?: string | undefined;
    assigned_agent?: string | undefined;
    rejection_count?: number | undefined;
}>;
/**
 * Schema for item_get tool input.
 */
export declare const ItemGetInputSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
/**
 * Schema for item_list tool input.
 */
export declare const ItemListInputSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodString>;
    stage: z.ZodOptional<z.ZodString>;
    agent: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status?: string | undefined;
    agent?: string | undefined;
    stage?: string | undefined;
}, {
    status?: string | undefined;
    agent?: string | undefined;
    stage?: string | undefined;
}>;
/**
 * Schema for item_reject tool input.
 */
export declare const ItemRejectInputSchema: z.ZodObject<{
    id: z.ZodString;
    reason: z.ZodString;
    agent: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    reason: string;
    agent?: string | undefined;
}, {
    id: string;
    reason: string;
    agent?: string | undefined;
}>;
/**
 * Schema for item_render tool input.
 */
export declare const ItemRenderInputSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
type ItemCreateInput = z.infer<typeof ItemCreateInputSchema>;
type ItemUpdateInput = z.infer<typeof ItemUpdateInputSchema>;
type ItemGetInput = z.infer<typeof ItemGetInputSchema>;
type ItemListInput = z.infer<typeof ItemListInputSchema>;
type ItemRejectInput = z.infer<typeof ItemRejectInputSchema>;
type ItemRenderInput = z.infer<typeof ItemRenderInputSchema>;
interface WorkItem {
    id: string;
    title: string;
    type: string;
    status: string;
    rejection_count: number;
    dependencies?: string[];
    parallel_group?: string;
    assigned_agent?: string;
    outputs?: {
        test: string;
        impl: string;
        types?: string;
    };
}
interface RejectResult {
    item: WorkItem;
    escalated: boolean;
}
interface RenderResult {
    markdown: string;
}
interface ToolResponse<T = unknown> {
    content: Array<{
        type: 'text';
        text: string;
    }>;
    data?: T;
}
/**
 * Creates a new work item.
 */
export declare function itemCreate(input: ItemCreateInput): Promise<ToolResponse<WorkItem> | McpErrorResponse>;
/**
 * Updates an existing work item.
 */
export declare function itemUpdate(input: ItemUpdateInput): Promise<ToolResponse<WorkItem> | McpErrorResponse>;
/**
 * Retrieves a single work item by ID.
 */
export declare function itemGet(input: ItemGetInput): Promise<ToolResponse<WorkItem> | McpErrorResponse>;
/**
 * Lists work items with optional filtering.
 */
export declare function itemList(input: ItemListInput): Promise<ToolResponse<WorkItem[]> | McpErrorResponse>;
/**
 * Records a rejection with reason.
 */
export declare function itemReject(input: ItemRejectInput): Promise<ToolResponse<RejectResult> | McpErrorResponse>;
/**
 * Returns markdown representation of an item.
 */
export declare function itemRender(input: ItemRenderInput): Promise<ToolResponse<RenderResult> | McpErrorResponse>;
/**
 * Tool definitions for MCP server registration.
 */
export declare const itemTools: ({
    name: string;
    description: string;
    inputSchema: object;
    handler: typeof itemCreate;
} | {
    name: string;
    description: string;
    inputSchema: object;
    handler: typeof itemUpdate;
} | {
    name: string;
    description: string;
    inputSchema: object;
    handler: typeof itemList;
} | {
    name: string;
    description: string;
    inputSchema: object;
    handler: typeof itemReject;
} | {
    name: string;
    description: string;
    inputSchema: object;
    handler: typeof itemRender;
})[];
export {};
//# sourceMappingURL=items.d.ts.map