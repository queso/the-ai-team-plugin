#!/usr/bin/env node
/**
 * observe-pre-tool-use.js - PreToolUse hook for observing tool calls
 *
 * Logs tool invocations to the API for observability.
 * This is a fire-and-forget observer - it must never block agents.
 */

import { buildObserverPayload, sendObserverEvent } from './lib/observer.js';

// Build environment object from process.env
const env = {
  TOOL_INPUT: process.env.TOOL_INPUT,
  TOOL_NAME: process.env.TOOL_NAME,
  AGENT_NAME: process.env.AGENT_NAME,
  HOOK_EVENT_TYPE: process.env.HOOK_EVENT_TYPE || 'pre_tool_use',
  ATEAM_API_URL: process.env.ATEAM_API_URL,
  ATEAM_PROJECT_ID: process.env.ATEAM_PROJECT_ID,
};

// Build and send payload, awaiting the fetch before exiting
const payload = buildObserverPayload(env);
if (payload) {
  await sendObserverEvent(payload, env).catch(() => {});
}

process.exit(0);
