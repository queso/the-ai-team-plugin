#!/usr/bin/env node
/**
 * observe-stop.js - Stop hook for observing agent session ends
 *
 * Logs agent session completions to the API for observability.
 * This is a fire-and-forget observer - it must never block agents.
 *
 * Claude Code sends hook context via stdin JSON, not env vars.
 * Agent name is passed as CLI arg (process.argv[2]) from frontmatter hooks.
 */

import { readHookInput, buildObserverPayload, sendObserverEvent } from './lib/observer.js';

const hookInput = readHookInput();
const agentName = process.argv[2] || undefined;

const payload = buildObserverPayload(hookInput, agentName);
if (payload) {
  await sendObserverEvent(payload).catch(() => {});
}

process.exit(0);
