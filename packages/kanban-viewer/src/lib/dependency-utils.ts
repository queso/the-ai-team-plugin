/**
 * Dependency blocking utilities for kanban work items.
 *
 * A dependency is "met" when the dependency item ID appears in the done phase.
 * Items with unmet dependencies are considered "blocked".
 */

/**
 * Returns array of dependency IDs that are not in the done stage.
 *
 * @param dependencies - Array of dependency item IDs
 * @param doneItemIds - Array of item IDs that are completed (in done phase)
 * @returns Array of unmet dependency IDs (preserves original order)
 *
 * @example
 * getUnmetDependencies(['001', '004'], ['001', '002', '003'])
 * // returns ['004']
 */
export function getUnmetDependencies(
  dependencies: string[],
  doneItemIds: string[]
): string[] {
  const doneSet = new Set(doneItemIds);
  return dependencies.filter((dep) => !doneSet.has(dep));
}

/**
 * Returns true if the item has any unmet dependencies.
 *
 * @param dependencies - Array of dependency item IDs
 * @param doneItemIds - Array of item IDs that are completed (in done phase)
 * @returns true if blocked (has unmet dependencies), false otherwise
 *
 * @example
 * isBlocked(['001', '004'], ['001', '002', '003'])
 * // returns true (004 is not done)
 */
export function isBlocked(
  dependencies: string[],
  doneItemIds: string[]
): boolean {
  return getUnmetDependencies(dependencies, doneItemIds).length > 0;
}

/**
 * Returns the count of unmet dependencies.
 *
 * @param dependencies - Array of dependency item IDs
 * @param doneItemIds - Array of item IDs that are completed (in done phase)
 * @returns Number of unmet dependencies
 *
 * @example
 * getBlockerCount(['001', '004', '005'], ['001', '002', '003'])
 * // returns 2 (004 and 005 are not done)
 */
export function getBlockerCount(
  dependencies: string[],
  doneItemIds: string[]
): number {
  return getUnmetDependencies(dependencies, doneItemIds).length;
}

/**
 * Detects if an item is part of a circular dependency chain.
 *
 * Uses depth-first search to traverse the dependency graph and detect cycles.
 *
 * @param itemId - The item ID to check for circular dependencies
 * @param dependencyGraph - Map of item IDs to their dependency arrays
 * @param visited - Internal set used to track visited nodes during recursion
 * @returns true if the item is part of a circular dependency chain
 *
 * @example
 * const graph = { '001': ['002'], '002': ['001'] };
 * hasCircularDependency('001', graph)
 * // returns true (001 -> 002 -> 001)
 */
export function hasCircularDependency(
  itemId: string,
  dependencyGraph: Record<string, string[]>,
  visited: Set<string> = new Set()
): boolean {
  // Item not in graph - no dependencies, no cycle
  if (!(itemId in dependencyGraph)) {
    return false;
  }

  // If we've already visited this node in current path, we have a cycle
  if (visited.has(itemId)) {
    return true;
  }

  // Mark current node as visited in this path
  visited.add(itemId);

  // Check all dependencies recursively
  const dependencies = dependencyGraph[itemId];
  for (const dep of dependencies) {
    if (hasCircularDependency(dep, dependencyGraph, visited)) {
      return true;
    }
  }

  // Backtrack - remove from visited for other paths
  visited.delete(itemId);

  return false;
}
