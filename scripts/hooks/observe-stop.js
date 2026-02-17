#!/usr/bin/env node
/**
 * observe-stop.js - Stop hook for observing agent session ends
 *
 * Logs agent session completions to the API for observability.
 * This is a fire-and-forget observer - it must never block agents.
 */

import { buildObserverPayload, sendObserverEvent } from './lib/observer.js';

// Build environment object from process.env
const env = {
  TOOL_INPUT: process.env.TOOL_INPUT,
  TOOL_NAME: process.env.TOOL_NAME,
  AGENT_NAME: process.env.AGENT_NAME,
  HOOK_EVENT_TYPE: process.env.HOOK_EVENT_TYPE || 'stop',
  ATEAM_API_URL: process.env.ATEAM_API_URL,
  ATEAM_PROJECT_ID: process.env.ATEAM_PROJECT_ID,
};

// Build and send payload
const payload = buildObserverPayload(env);
if (payload) {
  sendObserverEvent(payload, env).catch(() => {});
}

// Always exit with success - must not block agents
process.exit(0);
