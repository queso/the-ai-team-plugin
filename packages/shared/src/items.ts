export const ITEM_TYPES = ['feature', 'bug', 'task', 'enhancement'] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const ITEM_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;
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
