/**
 * Core board operations for reading, writing, and manipulating mission state.
 */

import { readFile, writeFile, readdir, rename, mkdir } from 'fs/promises';
import { join, basename } from 'path';
import matter from 'gray-matter';

export const STAGES = ['briefings', 'ready', 'testing', 'implementing', 'review', 'probing', 'done', 'blocked'];

/**
 * Canonical display names for agents.
 * Maps lowercase agent IDs to their proper display format.
 */
export const AGENT_DISPLAY_NAMES = {
  hannibal: 'Hannibal',
  face: 'Face',
  sosa: 'Sosa',
  murdock: 'Murdock',
  ba: 'B.A.',
  lynch: 'Lynch',
  amy: 'Amy'
};

/**
 * Normalizes an agent name to its canonical display format.
 * @param {string} agent - Agent name in any format (ba, B.A., BA, etc.)
 * @returns {string} Canonical display name
 */
export function normalizeAgentName(agent) {
  if (!agent) return 'System';
  const key = agent.toLowerCase().replace(/\./g, '');
  return AGENT_DISPLAY_NAMES[key] || agent;
}

/**
 * Valid stage transitions map.
 * Key: current stage, Value: array of valid target stages.
 */
export const VALID_TRANSITIONS = {
  briefings: ['ready'],
  ready: ['testing', 'blocked'],
  testing: ['implementing', 'blocked'],
  implementing: ['review', 'blocked'],
  review: ['probing', 'ready'],  // probing on approve, ready on reject
  probing: ['done', 'ready'],    // done on VERIFIED, ready on FLAG
  done: [],                       // terminal state
  blocked: ['ready']              // after unblock
};

/**
 * Default WIP limits per stage.
 */
export const DEFAULT_WIP_LIMITS = {
  testing: 3,
  implementing: 4,
  review: 3,
  probing: 3
};

/**
 * Reads the board.json file.
 * @param {string} missionDir - Path to mission directory
 * @returns {Promise<object>} Board data
 */
export async function readBoard(missionDir) {
  const boardPath = join(missionDir, 'board.json');
  try {
    const content = await readFile(boardPath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    if (err.code === 'ENOENT') {
      const error = new Error('No mission found. Run /ateam plan first.');
      error.code = 'BOARD_NOT_FOUND';
      error.exitCode = 40;
      throw error;
    }
    throw err;
  }
}

/**
 * Writes the board.json file atomically.
 * @param {string} missionDir - Path to mission directory
 * @param {object} board - Board data
 */
export async function writeBoard(missionDir, board) {
  const boardPath = join(missionDir, 'board.json');
  const tmpPath = join(missionDir, 'board.json.tmp');
  board.updated_at = new Date().toISOString();
  await writeFile(tmpPath, JSON.stringify(board, null, 2));
  await rename(tmpPath, boardPath);
}

/**
 * Parses a work item markdown file.
 * @param {string} filePath - Path to item file
 * @returns {Promise<{ frontmatter: object, content: string }>}
 */
export async function parseWorkItem(filePath) {
  const content = await readFile(filePath, 'utf8');
  const { data: frontmatter, content: body } = matter(content);
  return { frontmatter, content: body };
}

/**
 * Writes a work item markdown file.
 * @param {string} filePath - Path to item file
 * @param {object} frontmatter - YAML frontmatter data
 * @param {string} content - Markdown content
 */
export async function writeWorkItem(filePath, frontmatter, content) {
  const output = matter.stringify(content, frontmatter);
  await writeFile(filePath, output);
}

/**
 * Generates a filename from item id and title.
 * @param {string} id - Item ID (e.g., "001")
 * @param {string} title - Item title
 * @returns {string} Filename (e.g., "001-order-sync.md")
 */
export function generateItemFilename(id, title) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
  return `${id}-${slug}.md`;
}

/**
 * Finds an item by ID across all stage directories.
 * @param {string} missionDir - Path to mission directory
 * @param {string} itemId - Item ID to find
 * @returns {Promise<{ stage: string, path: string, frontmatter: object, content: string } | null>}
 */
export async function findItem(missionDir, itemId) {
  for (const stage of STAGES) {
    const stageDir = join(missionDir, stage);
    try {
      const files = await readdir(stageDir);
      for (const file of files) {
        if (file.startsWith(itemId + '-') && file.endsWith('.md')) {
          const filePath = join(stageDir, file);
          const { frontmatter, content } = await parseWorkItem(filePath);
          return { stage, path: filePath, filename: file, frontmatter, content };
        }
      }
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }
  return null;
}

/**
 * Lists all items in a stage directory.
 * @param {string} missionDir - Path to mission directory
 * @param {string} stage - Stage name
 * @returns {Promise<Array<{ id: string, path: string, frontmatter: object }>>}
 */
export async function listStageItems(missionDir, stage) {
  const stageDir = join(missionDir, stage);
  const items = [];
  try {
    const files = await readdir(stageDir);
    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = join(stageDir, file);
        const { frontmatter } = await parseWorkItem(filePath);
        const id = frontmatter.id || file.split('-')[0];
        items.push({ id, path: filePath, filename: file, frontmatter });
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  return items;
}

/**
 * Validates a stage transition.
 * @param {string} from - Current stage
 * @param {string} to - Target stage
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateTransition(from, to) {
  if (!STAGES.includes(from)) {
    return { valid: false, error: `Invalid source stage: ${from}` };
  }
  if (!STAGES.includes(to)) {
    return { valid: false, error: `Invalid target stage: ${to}` };
  }
  if (!VALID_TRANSITIONS[from].includes(to)) {
    return {
      valid: false,
      error: `Cannot transition from ${from} to ${to}. Valid targets: ${VALID_TRANSITIONS[from].join(', ') || 'none'}`
    };
  }
  return { valid: true };
}

/**
 * Checks if WIP limit would be exceeded.
 * @param {object} board - Board data
 * @param {string} stage - Target stage
 * @returns {{ allowed: boolean, current: number, limit: number }}
 */
export function checkWipLimit(board, stage) {
  const wipStages = ['testing', 'implementing', 'review', 'probing'];
  if (!wipStages.includes(stage)) {
    return { allowed: true, current: 0, limit: Infinity };
  }

  const limit = board.wip_limits?.[stage] ?? DEFAULT_WIP_LIMITS[stage];
  const current = board.phases?.[stage]?.length ?? 0;

  return {
    allowed: current < limit,
    current,
    limit
  };
}

/**
 * Moves an item file between stage directories.
 * @param {string} missionDir - Path to mission directory
 * @param {string} itemPath - Current item path
 * @param {string} toStage - Target stage
 * @returns {Promise<string>} New item path
 */
export async function moveItemFile(missionDir, itemPath, toStage) {
  const filename = basename(itemPath);
  const targetDir = join(missionDir, toStage);
  const targetPath = join(targetDir, filename);

  // Ensure target directory exists
  await mkdir(targetDir, { recursive: true });

  // Move file
  await rename(itemPath, targetPath);

  return targetPath;
}

/**
 * Updates board.json phases after a move.
 * @param {object} board - Board data
 * @param {string} itemId - Item ID
 * @param {string} fromStage - Source stage
 * @param {string} toStage - Target stage
 */
export function updateBoardPhases(board, itemId, fromStage, toStage) {
  // Remove from source stage
  if (board.phases[fromStage]) {
    board.phases[fromStage] = board.phases[fromStage].filter(id => id !== itemId);
  }

  // Add to target stage
  if (!board.phases[toStage]) {
    board.phases[toStage] = [];
  }
  if (!board.phases[toStage].includes(itemId)) {
    board.phases[toStage].push(itemId);
  }

  // Update stats
  updateBoardStats(board);
}

/**
 * Updates board statistics.
 * @param {object} board - Board data
 */
export function updateBoardStats(board) {
  const phases = board.phases || {};
  const inFlightStages = ['testing', 'implementing', 'review', 'probing'];

  board.stats = {
    total_items: STAGES.reduce((sum, stage) => sum + (phases[stage]?.length || 0), 0),
    completed: phases.done?.length || 0,
    in_flight: inFlightStages.reduce((sum, stage) => sum + (phases[stage]?.length || 0), 0),
    blocked: phases.blocked?.length || 0,
    backlog: (phases.briefings?.length || 0) + (phases.ready?.length || 0),
    rejected_count: board.stats?.rejected_count || 0
  };
}

/**
 * Gets the next available item ID.
 * @param {object} board - Board data
 * @returns {string} Three-digit ID (e.g., "001")
 */
export function getNextItemId(board) {
  const allIds = STAGES.flatMap(stage => board.phases?.[stage] || []);
  if (allIds.length === 0) return '001';

  const maxId = Math.max(...allIds.map(id => parseInt(id, 10) || 0));
  return String(maxId + 1).padStart(3, '0');
}

/**
 * Ensures all stage directories exist.
 * @param {string} missionDir - Path to mission directory
 */
export async function ensureStageDirectories(missionDir) {
  for (const stage of STAGES) {
    await mkdir(join(missionDir, stage), { recursive: true });
  }
}

/**
 * Appends to the activity log.
 * @param {string} missionDir - Path to mission directory
 * @param {string} agent - Agent name
 * @param {string} message - Log message
 */
export async function logActivity(missionDir, agent, message) {
  const logPath = join(missionDir, 'activity.log');
  const timestamp = new Date().toISOString();
  const entry = `${timestamp} [${agent}] ${message}\n`;
  await writeFile(logPath, entry, { flag: 'a' });
}

/**
 * Checks if dependencies are satisfied for an item.
 * @param {object} board - Board data
 * @param {string[]} dependencies - Array of dependency item IDs
 * @returns {{ satisfied: boolean, pending: string[] }}
 */
export function checkDependencies(board, dependencies) {
  if (!dependencies || dependencies.length === 0) {
    return { satisfied: true, pending: [] };
  }

  const doneIds = board.phases?.done || [];
  const pending = dependencies.filter(id => !doneIds.includes(id));

  return {
    satisfied: pending.length === 0,
    pending
  };
}
