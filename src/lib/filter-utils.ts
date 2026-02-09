/**
 * Filter utility functions for Kanban board work items
 * Pure functions that take a WorkItem and filter criteria, returning boolean
 */

import type { WorkItem, TypeFilter, AgentFilter, StatusFilter, FilterState } from '../types';

/**
 * Check if a work item matches the type filter
 * @param item - The work item to check
 * @param filter - The type filter to apply
 * @returns true if item matches the filter
 */
export function matchesType(item: WorkItem, filter: TypeFilter): boolean {
  if (filter === 'All Types') {
    return true;
  }
  return item.type === filter;
}

/**
 * Check if a work item matches the agent filter
 * @param item - The work item to check
 * @param filter - The agent filter to apply
 * @returns true if item matches the filter
 */
export function matchesAgent(item: WorkItem, filter: AgentFilter): boolean {
  if (filter === 'All Agents') {
    return true;
  }
  if (filter === 'Unassigned') {
    return item.assigned_agent === undefined;
  }
  return item.assigned_agent === filter;
}

/**
 * Check if a work item matches the status filter
 * Status filter logic:
 * - Active: items in TESTING, IMPLEMENTING, or REVIEW stages
 * - Blocked: items in BLOCKED stage
 * - Has Rejections: rejection_count > 0
 * - Has Dependencies: dependencies.length > 0
 * - Completed: items in DONE stage
 *
 * @param item - The work item to check
 * @param filter - The status filter to apply
 * @returns true if item matches the filter
 */
export function matchesStatus(item: WorkItem, filter: StatusFilter): boolean {
  if (filter === 'All Status') {
    return true;
  }

  switch (filter) {
    case 'Active':
      return ['testing', 'implementing', 'review'].includes(item.stage);
    case 'Blocked':
      return item.stage === 'blocked';
    case 'Has Rejections':
      return item.rejection_count > 0;
    case 'Has Dependencies':
      return item.dependencies.length > 0;
    case 'Completed':
      return item.stage === 'done';
    default:
      return false;
  }
}

/**
 * Check if a work item matches the search query
 * Performs case-insensitive search on item title
 *
 * @param item - The work item to check
 * @param query - The search query string
 * @returns true if item title contains query (case-insensitive)
 */
export function matchesSearch(item: WorkItem, query: string): boolean {
  if (query === '') {
    return true;
  }
  return item.title.toLowerCase().includes(query.toLowerCase());
}

/**
 * Filter work items by combining all filters with AND logic
 * An item must match ALL filters to be included in the result
 *
 * @param items - Array of work items to filter
 * @param filters - Filter state containing all filter criteria
 * @returns Array of work items that match all filters
 */
export function filterWorkItems(items: WorkItem[], filters: FilterState): WorkItem[] {
  return items.filter((item) => {
    return (
      matchesType(item, filters.typeFilter) &&
      matchesAgent(item, filters.agentFilter) &&
      matchesStatus(item, filters.statusFilter) &&
      matchesSearch(item, filters.searchQuery)
    );
  });
}
