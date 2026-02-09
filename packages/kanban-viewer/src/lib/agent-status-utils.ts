/**
 * Utility functions for deriving agent status from work items.
 */

import type { AgentName, AgentStatus, Stage, WorkItem } from '@/types';
import { VALID_AGENT_NAMES } from './api-validation';

/**
 * Stages where work is actively being performed.
 * An agent assigned to an item in one of these stages is considered "active".
 */
export const ACTIVE_STAGES: Stage[] = ['probing', 'testing', 'implementing', 'review'];

/**
 * Set of valid agent names for efficient lookup.
 */
const VALID_AGENT_NAMES_SET: ReadonlySet<string> = new Set(VALID_AGENT_NAMES);

/**
 * Type guard to check if a string is a valid AgentName.
 */
function isValidAgentName(name: string | undefined): name is AgentName {
  return name !== undefined && VALID_AGENT_NAMES_SET.has(name);
}

/**
 * Derives agent statuses from work items.
 *
 * An agent is considered "active" if they are assigned to any work item
 * in an active stage (probing, testing, implementing, review).
 * Otherwise, the agent is "idle".
 *
 * @param workItems - Array of work items to analyze
 * @returns Map of agent names to their derived status
 */
export function deriveAgentStatusesFromWorkItems(
  workItems: WorkItem[]
): Partial<Record<AgentName, AgentStatus>> {
  const statuses: Partial<Record<AgentName, AgentStatus>> = {};

  for (const item of workItems) {
    // Only consider items in active stages
    if (!ACTIVE_STAGES.includes(item.stage)) {
      continue;
    }

    // Check if item has a valid assigned agent
    if (isValidAgentName(item.assigned_agent)) {
      statuses[item.assigned_agent] = 'active';
    }
  }

  return statuses;
}
