/**
 * Item-related types for the API layer.
 *
 * These types define work items, their properties, and work log entries
 * for the new API layer as specified in PRD 013-mcp-interface.md.
 */

import type { StageId } from './board';

/**
 * Valid item type classifications.
 */
export type ItemType = 'feature' | 'bug' | 'enhancement' | 'task';

/**
 * Valid item priority levels.
 */
export type ItemPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Valid work log action types.
 */
export type WorkLogAction = 'started' | 'completed' | 'rejected' | 'note';

/**
 * Output file paths for a work item.
 */
export interface ItemOutputs {
  test?: string;
  impl?: string;
  types?: string;
}

/**
 * Base work item interface.
 */
export interface Item {
  id: string;
  title: string;
  description: string;
  type: ItemType;
  priority: ItemPriority;
  stageId: StageId;
  assignedAgent: string | null;
  rejectionCount: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  outputs: ItemOutputs;
}

/**
 * Work log entry recording agent actions on an item.
 */
export interface WorkLogEntry {
  id: number;
  agent: string;
  action: WorkLogAction;
  summary: string;
  timestamp: Date;
}

/**
 * Extended item interface including dependency and work log relations.
 */
export interface ItemWithRelations extends Item {
  dependencies: string[];
  workLogs: WorkLogEntry[];
}
