#!/usr/bin/env node
/**
 * deps-check.js - Validate dependency graph and detect cycles
 *
 * Usage:
 *   node deps-check.js                    # Check all dependencies
 *   node deps-check.js --verbose          # Show detailed output
 *
 * Output:
 *   {
 *     "valid": true/false,
 *     "cycles": [],                       // Array of cycle paths if any
 *     "depths": { "001": 0, "002": 1 },   // Dependency depth per item
 *     "maxDepth": 2,
 *     "parallelWaves": 3,                 // Minimum waves needed
 *     "readyItems": ["001", "003"]        // Items with no unmet dependencies
 *   }
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import matter from 'gray-matter';

const MISSION_DIR = join(process.cwd(), 'mission');
const STAGES = ['briefings', 'ready', 'testing', 'implementing', 'review', 'done', 'blocked'];

async function getAllItems() {
  const items = new Map();

  for (const stage of STAGES) {
    const stageDir = join(MISSION_DIR, stage);
    if (!existsSync(stageDir)) continue;

    try {
      const files = await readdir(stageDir);
      for (const file of files) {
        if (!file.endsWith('.md')) continue;

        const content = await readFile(join(stageDir, file), 'utf8');
        const { data } = matter(content);

        if (data.id) {
          items.set(data.id, {
            id: data.id,
            title: data.title,
            dependencies: data.dependencies || [],
            stage
          });
        }
      }
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }

  return items;
}

function buildDependencyGraph(items) {
  const graph = {};

  for (const [id, item] of items) {
    graph[id] = item.dependencies || [];
  }

  return graph;
}

function detectCycles(graph) {
  const visited = new Set();
  const recStack = new Set();
  const cycles = [];

  function dfs(id, path = []) {
    visited.add(id);
    recStack.add(id);
    path.push(id);

    const deps = graph[id] || [];
    for (const dep of deps) {
      if (!visited.has(dep)) {
        const cycle = dfs(dep, [...path]);
        if (cycle) cycles.push(cycle);
      } else if (recStack.has(dep)) {
        // Found a cycle - extract it
        const cycleStart = path.indexOf(dep);
        const cyclePath = path.slice(cycleStart);
        cyclePath.push(dep); // Complete the cycle
        return cyclePath;
      }
    }

    recStack.delete(id);
    return null;
  }

  for (const id of Object.keys(graph)) {
    if (!visited.has(id)) {
      const cycle = dfs(id);
      if (cycle) cycles.push(cycle);
    }
  }

  return cycles;
}

function calculateDepths(graph) {
  const depths = {};
  const memo = {};

  function getDepth(id) {
    if (memo[id] !== undefined) return memo[id];

    const deps = graph[id] || [];
    if (deps.length === 0) {
      memo[id] = 0;
      return 0;
    }

    // Check for missing dependencies
    for (const dep of deps) {
      if (!(dep in graph)) {
        // Missing dependency - treat as depth 0 but flag it
        console.error(`Warning: Item ${id} depends on unknown item ${dep}`);
      }
    }

    const validDeps = deps.filter(d => d in graph);
    if (validDeps.length === 0) {
      memo[id] = 0;
      return 0;
    }

    memo[id] = 1 + Math.max(...validDeps.map(d => getDepth(d)));
    return memo[id];
  }

  for (const id of Object.keys(graph)) {
    depths[id] = getDepth(id);
  }

  return depths;
}

function findReadyItems(items, graph) {
  const ready = [];
  const completedStages = new Set(['done']);

  for (const [id, item] of items) {
    // Skip already completed items
    if (completedStages.has(item.stage)) continue;

    const deps = graph[id] || [];

    // Check if all dependencies are satisfied (in done stage)
    const allDepsSatisfied = deps.every(depId => {
      const depItem = items.get(depId);
      return depItem && completedStages.has(depItem.stage);
    });

    // Items with no deps or all deps done are ready
    if (deps.length === 0 || allDepsSatisfied) {
      // Only include items still in briefings
      if (item.stage === 'briefings') {
        ready.push(id);
      }
    }
  }

  return ready;
}

function validateDependencies(items, graph) {
  const errors = [];

  for (const [id, item] of items) {
    for (const dep of item.dependencies) {
      if (!items.has(dep)) {
        errors.push({
          item: id,
          error: 'MISSING_DEPENDENCY',
          dependency: dep,
          message: `Item ${id} depends on non-existent item ${dep}`
        });
      }
    }
  }

  return errors;
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const verbose = args.includes('--verbose') || args.includes('-v');

    // Check mission exists
    if (!existsSync(MISSION_DIR)) {
      console.error(JSON.stringify({
        error: 'NO_MISSION',
        message: 'No mission directory found. Run /ateam plan first.'
      }, null, 2));
      process.exit(1);
    }

    // Get all items
    const items = await getAllItems();

    if (items.size === 0) {
      console.log(JSON.stringify({
        valid: true,
        cycles: [],
        depths: {},
        maxDepth: 0,
        parallelWaves: 0,
        readyItems: [],
        totalItems: 0,
        message: 'No work items found'
      }, null, 2));
      return;
    }

    // Build graph
    const graph = buildDependencyGraph(items);

    // Validate dependencies exist
    const validationErrors = validateDependencies(items, graph);

    // Detect cycles
    const cycles = detectCycles(graph);

    // Calculate depths
    const depths = calculateDepths(graph);
    const maxDepth = Math.max(...Object.values(depths), 0);

    // Find ready items
    const readyItems = findReadyItems(items, graph);

    // Calculate parallel waves (items at each depth level)
    const waves = {};
    for (const [id, depth] of Object.entries(depths)) {
      waves[depth] = waves[depth] || [];
      waves[depth].push(id);
    }
    const parallelWaves = Object.keys(waves).length;

    const result = {
      valid: cycles.length === 0 && validationErrors.length === 0,
      totalItems: items.size,
      cycles,
      validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
      depths,
      maxDepth,
      parallelWaves,
      readyItems
    };

    if (verbose) {
      result.waves = waves;
      result.graph = graph;
    }

    console.log(JSON.stringify(result, null, 2));

    // Exit with error code if invalid
    if (!result.valid) {
      process.exit(1);
    }

  } catch (err) {
    console.error(JSON.stringify({
      error: err.code || 'CHECK_FAILED',
      message: err.message
    }, null, 2));
    process.exit(1);
  }
}

main();
