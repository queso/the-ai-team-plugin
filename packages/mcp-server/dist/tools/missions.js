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
import { writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { createClient } from '../client/index.js';
import { config } from '../config.js';
import { withErrorBoundary } from '../lib/errors.js';
import { zodToJsonSchema } from '../lib/schema-utils.js';
// Initialize HTTP client
const client = createClient({
    baseUrl: config.apiUrl,
    projectId: config.projectId,
    apiKey: config.apiKey,
    timeout: config.timeout,
    retries: config.retries,
});
// ============================================================================
// Mission-Active Marker
// ============================================================================
// Marker file at /tmp/.ateam-mission-active-{projectId} tells enforcement
// hooks that a mission is running. Managed here (not via playbook Bash
// commands) so the guarantee is code-level, not LLM-instruction-level.
function missionMarkerPath() {
    return join(tmpdir(), `.ateam-mission-active-${config.projectId}`);
}
function setMissionActive() {
    const p = missionMarkerPath();
    try {
        mkdirSync(dirname(p), { recursive: true });
        writeFileSync(p, new Date().toISOString());
    }
    catch { /* non-blocking — hooks degrade gracefully without marker */ }
}
function clearMissionActive() {
    try {
        unlinkSync(missionMarkerPath());
    }
    catch { /* ignore — already cleared or never set */ }
}
// ============================================================================
// Zod Schemas for Input Validation
// ============================================================================
/**
 * Schema for mission_init tool input.
 */
export const MissionInitInputSchema = z.object({
    name: z.string().min(1),
    prdPath: z.string().min(1),
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
// Tool Handlers
// ============================================================================
/**
 * Creates a new mission directory structure.
 */
export async function missionInit(input) {
    const handler = async (args) => {
        const body = {
            name: args.name,
            prdPath: args.prdPath,
        };
        if (args.force !== undefined) {
            body.force = args.force;
        }
        const result = await client.post('/api/missions', body);
        // Clear any stale mission-active marker from a previous crashed session.
        // Done AFTER the POST succeeds so we don't incorrectly clear the marker
        // when there's an actually-running mission and the POST throws.
        clearMissionActive();
        return {
            content: [{ type: 'text', text: JSON.stringify(result.data) }],
            data: result.data,
        };
    };
    return withErrorBoundary(handler)(input);
}
/**
 * Returns active mission metadata.
 */
export async function missionCurrent(input) {
    const handler = async (_args) => {
        const result = await client.get('/api/missions/current');
        return {
            content: [{ type: 'text', text: JSON.stringify(result.data) }],
            data: result.data,
        };
    };
    return withErrorBoundary(handler)(input);
}
/**
 * Runs configured pre-flight checks.
 */
export async function missionPrecheck(input) {
    const handler = async (args) => {
        const body = {};
        if (args.checks !== undefined) {
            body.checks = args.checks;
        }
        const result = await client.post('/api/missions/precheck', body);
        // Set mission-active marker when prechecks pass — signals enforcement
        // hooks that Hannibal's orchestration loop is about to start
        if (result.data.allPassed) {
            setMissionActive();
        }
        return {
            content: [{ type: 'text', text: JSON.stringify(result.data) }],
            data: result.data,
        };
    };
    return withErrorBoundary(handler)(input);
}
/**
 * Runs configured post-completion checks.
 */
export async function missionPostcheck(input) {
    const handler = async (args) => {
        const body = {};
        if (args.checks !== undefined) {
            body.checks = args.checks;
        }
        const result = await client.post('/api/missions/postcheck', body);
        return {
            content: [{ type: 'text', text: JSON.stringify(result.data) }],
            data: result.data,
        };
    };
    return withErrorBoundary(handler)(input);
}
/**
 * Moves completed mission items to archive.
 */
export async function missionArchive(input) {
    const handler = async (args) => {
        const body = {};
        if (args.itemIds !== undefined) {
            body.itemIds = args.itemIds;
        }
        if (args.complete !== undefined) {
            body.complete = args.complete;
        }
        if (args.dryRun !== undefined) {
            body.dryRun = args.dryRun;
        }
        const result = await client.post('/api/missions/archive', body);
        // Clear mission-active marker when the full mission is archived
        // (not for partial item archives or dry runs)
        if (args.complete && !args.dryRun && result.data.success) {
            clearMissionActive();
        }
        return {
            content: [{ type: 'text', text: JSON.stringify(result.data) }],
            data: result.data,
        };
    };
    return withErrorBoundary(handler)(input);
}
// ============================================================================
// Tool Definitions for MCP Server Registration
// ============================================================================
/**
 * Tool definitions for MCP server registration.
 * Each tool includes the original Zod schema for use with McpServer.tool() API.
 */
export const missionTools = [
    {
        name: 'mission_init',
        description: 'Create a new mission. Requires name and prdPath. Use force flag to archive existing active mission.',
        inputSchema: zodToJsonSchema(MissionInitInputSchema),
        zodSchema: MissionInitInputSchema,
        handler: missionInit,
    },
    {
        name: 'mission_current',
        description: 'Return active mission metadata including progress, WIP limits, and column/phase information.',
        inputSchema: zodToJsonSchema(MissionCurrentInputSchema),
        zodSchema: MissionCurrentInputSchema,
        handler: missionCurrent,
    },
    {
        name: 'mission_precheck',
        description: 'Run configured pre-flight checks (lint, tests) before starting mission execution.',
        inputSchema: zodToJsonSchema(MissionPrecheckInputSchema),
        zodSchema: MissionPrecheckInputSchema,
        handler: missionPrecheck,
    },
    {
        name: 'mission_postcheck',
        description: 'Run configured post-completion checks (lint, unit tests, e2e) after all items are done.',
        inputSchema: zodToJsonSchema(MissionPostcheckInputSchema),
        zodSchema: MissionPostcheckInputSchema,
        handler: missionPostcheck,
    },
    {
        name: 'mission_archive',
        description: 'Move completed mission items to archive. Use complete flag to archive entire mission with summary.',
        inputSchema: zodToJsonSchema(MissionArchiveInputSchema),
        zodSchema: MissionArchiveInputSchema,
        handler: missionArchive,
    },
];
//# sourceMappingURL=missions.js.map