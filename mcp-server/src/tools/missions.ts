/**
 * Mission lifecycle MCP tools.
 *
 * Provides tools for managing mission lifecycle:
 * - mission_init: Create new mission directory structure
 * - mission_current: Return active mission metadata
 * - mission_precheck: Run configured pre-flight checks
 * - mission_postcheck: Run configured post-completion checks
 * - mission_archive: Move completed mission to archive
 */

import { z } from 'zod';
import { createClient } from '../client/index.js';
import { withErrorBoundary, type McpErrorResponse } from '../lib/errors.js';

// Initialize HTTP client
const client = createClient({
  baseUrl: process.env.KANBAN_API_URL ?? 'http://localhost:3000',
  timeout: 30000,
  retries: 3,
});

// ============================================================================
// Zod Schemas for Input Validation
// ============================================================================

/**
 * Schema for mission_init tool input.
 */
export const MissionInitInputSchema = z.object({
  name: z.string().min(1).optional(),
  force: z.boolean().optional().default(false),
});

/**
 * Schema for mission_current tool input.
 */
export const MissionCurrentInputSchema = z.object({});

/**
 * Schema for mission_precheck tool input.
 */
export const MissionPrecheckInputSchema = z.object({
  checks: z.array(z.string()).optional(),
});

/**
 * Schema for mission_postcheck tool input.
 */
export const MissionPostcheckInputSchema = z.object({
  checks: z.array(z.string()).optional(),
});

/**
 * Schema for mission_archive tool input.
 */
export const MissionArchiveInputSchema = z.object({
  itemIds: z.array(z.string()).optional(),
  complete: z.boolean().optional().default(false),
  dryRun: z.boolean().optional().default(false),
});

// ============================================================================
// Type Definitions
// ============================================================================

type MissionInitInput = z.infer<typeof MissionInitInputSchema>;
type MissionCurrentInput = z.infer<typeof MissionCurrentInputSchema>;
type MissionPrecheckInput = z.infer<typeof MissionPrecheckInputSchema>;
type MissionPostcheckInput = z.infer<typeof MissionPostcheckInputSchema>;
type MissionArchiveInput = z.infer<typeof MissionArchiveInputSchema>;

interface PreviousMission {
  name: string;
  archiveDir: string;
  itemCount: number;
}

interface MissionInitResult {
  success: boolean;
  initialized: boolean;
  missionName: string;
  archived: boolean;
  previousMission?: PreviousMission;
  directories?: string[];
}

interface Mission {
  name: string;
  status: string;
  created_at: string;
  postcheck: PostcheckInfo | null;
}

interface PostcheckInfo {
  timestamp: string;
  passed: boolean;
  checks: Array<{ name: string; passed: boolean }>;
}

interface Columns {
  briefings: string[];
  ready: string[];
  testing: string[];
  implementing: string[];
  review: string[];
  probing: string[];
  done: string[];
  blocked: string[];
}

interface MissionCurrentResult {
  success: boolean;
  mission: Mission;
  progress: {
    done: number;
    total: number;
  };
  wip: {
    current: number;
    limit: number;
  };
  columns: Columns;
}

interface CheckResult {
  name: string;
  command?: string;
  passed: boolean;
  error?: string;
}

interface MissionPrecheckResult {
  success: boolean;
  allPassed: boolean;
  checks: CheckResult[];
  skipped?: boolean;
  configSource?: string;
}

interface MissionPostcheckResult {
  success: boolean;
  allPassed: boolean;
  checks: CheckResult[];
  boardUpdated?: boolean;
}

interface MissionArchiveResult {
  success: boolean;
  archived?: number;
  wouldArchive?: number;
  destination?: string;
  items?: string[];
  missionComplete?: boolean;
  summary?: string;
  message?: string;
  dryRun?: boolean;
  activityLogArchived?: boolean;
}

interface ToolResponse<T = unknown> {
  content: Array<{ type: 'text'; text: string }>;
  data?: T;
}

// ============================================================================
// Tool Handlers
// ============================================================================

/**
 * Creates a new mission directory structure.
 */
export async function missionInit(
  input: MissionInitInput
): Promise<ToolResponse<MissionInitResult> | McpErrorResponse> {
  const handler = async (args: MissionInitInput) => {
    const body: Record<string, unknown> = {};
    if (args.name !== undefined) {
      body.name = args.name;
    }
    if (args.force !== undefined) {
      body.force = args.force;
    }

    const result = await client.post<MissionInitResult>('/api/missions/init', body);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result.data) }],
      data: result.data,
    };
  };

  return withErrorBoundary(handler)(input);
}

/**
 * Returns active mission metadata.
 */
export async function missionCurrent(
  input: MissionCurrentInput
): Promise<ToolResponse<MissionCurrentResult> | McpErrorResponse> {
  const handler = async (_args: MissionCurrentInput) => {
    const result = await client.get<MissionCurrentResult>('/api/missions/current');
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result.data) }],
      data: result.data,
    };
  };

  return withErrorBoundary(handler)(input);
}

/**
 * Runs configured pre-flight checks.
 */
export async function missionPrecheck(
  input: MissionPrecheckInput
): Promise<ToolResponse<MissionPrecheckResult> | McpErrorResponse> {
  const handler = async (args: MissionPrecheckInput) => {
    const body: Record<string, unknown> = {};
    if (args.checks !== undefined) {
      body.checks = args.checks;
    }

    const result = await client.post<MissionPrecheckResult>('/api/missions/precheck', body);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result.data) }],
      data: result.data,
    };
  };

  return withErrorBoundary(handler)(input);
}

/**
 * Runs configured post-completion checks.
 */
export async function missionPostcheck(
  input: MissionPostcheckInput
): Promise<ToolResponse<MissionPostcheckResult> | McpErrorResponse> {
  const handler = async (args: MissionPostcheckInput) => {
    const body: Record<string, unknown> = {};
    if (args.checks !== undefined) {
      body.checks = args.checks;
    }

    const result = await client.post<MissionPostcheckResult>('/api/missions/postcheck', body);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result.data) }],
      data: result.data,
    };
  };

  return withErrorBoundary(handler)(input);
}

/**
 * Moves completed mission items to archive.
 */
export async function missionArchive(
  input: MissionArchiveInput
): Promise<ToolResponse<MissionArchiveResult> | McpErrorResponse> {
  const handler = async (args: MissionArchiveInput) => {
    const body: Record<string, unknown> = {};
    if (args.itemIds !== undefined) {
      body.itemIds = args.itemIds;
    }
    if (args.complete !== undefined) {
      body.complete = args.complete;
    }
    if (args.dryRun !== undefined) {
      body.dryRun = args.dryRun;
    }

    const result = await client.post<MissionArchiveResult>('/api/missions/archive', body);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result.data) }],
      data: result.data,
    };
  };

  return withErrorBoundary(handler)(input);
}

// ============================================================================
// Tool Definitions for MCP Server Registration
// ============================================================================

/**
 * Converts a Zod schema to JSON Schema format for MCP tool registration.
 */
function zodToJsonSchema(schema: z.ZodType): object {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, object> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const zodValue = value as z.ZodTypeAny;
      properties[key] = getPropertySchema(zodValue);

      if (!isOptional(zodValue)) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  return { type: 'object', properties: {} };
}

/**
 * Checks if a Zod schema is optional.
 */
function isOptional(schema: z.ZodTypeAny): boolean {
  if (schema instanceof z.ZodOptional) return true;
  if (schema instanceof z.ZodDefault) return true;
  if (schema._def?.typeName === 'ZodOptional') return true;
  if (schema._def?.typeName === 'ZodDefault') return true;
  return false;
}

/**
 * Gets the JSON Schema representation of a Zod property.
 */
function getPropertySchema(schema: z.ZodTypeAny): object {
  let unwrapped = schema;
  if (unwrapped instanceof z.ZodOptional) {
    unwrapped = unwrapped.unwrap();
  }
  if (unwrapped instanceof z.ZodDefault) {
    unwrapped = unwrapped._def.innerType;
  }

  if (unwrapped instanceof z.ZodString) {
    return { type: 'string' };
  }

  if (unwrapped instanceof z.ZodBoolean) {
    return { type: 'boolean' };
  }

  if (unwrapped instanceof z.ZodNumber) {
    return { type: 'number' };
  }

  if (unwrapped instanceof z.ZodArray) {
    return {
      type: 'array',
      items: getPropertySchema(unwrapped.element),
    };
  }

  if (unwrapped instanceof z.ZodObject) {
    return zodToJsonSchema(unwrapped);
  }

  return { type: 'string' };
}

/**
 * Tool definitions for MCP server registration.
 */
export const missionTools = [
  {
    name: 'mission_init',
    description: 'Create a new mission directory structure. Optionally provide a name and force flag to archive existing mission.',
    inputSchema: zodToJsonSchema(MissionInitInputSchema),
    handler: missionInit,
  },
  {
    name: 'mission_current',
    description: 'Return active mission metadata including progress, WIP limits, and column/phase information.',
    inputSchema: zodToJsonSchema(MissionCurrentInputSchema),
    handler: missionCurrent,
  },
  {
    name: 'mission_precheck',
    description: 'Run configured pre-flight checks (lint, tests) before starting mission execution.',
    inputSchema: zodToJsonSchema(MissionPrecheckInputSchema),
    handler: missionPrecheck,
  },
  {
    name: 'mission_postcheck',
    description: 'Run configured post-completion checks (lint, unit tests, e2e) after all items are done.',
    inputSchema: zodToJsonSchema(MissionPostcheckInputSchema),
    handler: missionPostcheck,
  },
  {
    name: 'mission_archive',
    description: 'Move completed mission items to archive. Use complete flag to archive entire mission with summary.',
    inputSchema: zodToJsonSchema(MissionArchiveInputSchema),
    handler: missionArchive,
  },
];
