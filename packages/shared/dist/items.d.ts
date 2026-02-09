export declare const ITEM_TYPES: readonly ["feature", "bug", "task", "enhancement"];
export type ItemType = (typeof ITEM_TYPES)[number];
export declare const ITEM_PRIORITIES: readonly ["critical", "high", "medium", "low"];
export type ItemPriority = (typeof ITEM_PRIORITIES)[number];
export interface ItemOutputs {
    test?: string;
    impl?: string;
    types?: string;
}
export interface WorkLogEntry {
    agent: string;
    timestamp: string;
    status: 'success' | 'failed';
    summary: string;
    files_created?: string[];
    files_modified?: string[];
}
