#!/usr/bin/env node
/**
 * observer.js - Shared logic for observer hook scripts
 *
 * This module provides functions to build and send hook event payloads
 * to the A(i)-Team API for observability.
 */

import { randomUUID } from 'crypto';

/**
 * Builds a hook event payload from environment variables.
 *
 * @param {Object} env - Environment variables
 * @param {string} [env.TOOL_INPUT] - JSON string of tool input
 * @param {string} [env.TOOL_NAME] - Name of the tool being called
 * @param {string} [env.AGENT_NAME] - Name of the agent
 * @param {string} [env.HOOK_EVENT_TYPE] - Type of hook event
 * @param {string} [env.ATEAM_API_URL] - API base URL
 * @param {string} [env.ATEAM_PROJECT_ID] - Project ID
 * @returns {Object|null} Payload object or null if invalid
 */
function buildObserverPayload(env) {
  const toolName = env.TOOL_NAME || '';
  const agentName = env.AGENT_NAME || 'unknown';
  const eventType = env.HOOK_EVENT_TYPE || '';
  const apiUrl = env.ATEAM_API_URL || 'http://localhost:3000';
  const projectId = env.ATEAM_PROJECT_ID || 'default';

  // If no event type, nothing to log
  if (!eventType) {
    return null;
  }

  // Parse tool input for summary generation
  let toolInput = {};
  if (env.TOOL_INPUT) {
    try {
      toolInput = JSON.parse(env.TOOL_INPUT);
    } catch {
      // Ignore parse errors
    }
  }

  // Generate summary based on event type
  let summary = '';
  let status = 'pending';

  if (eventType === 'pre_tool_use') {
    status = 'pending';
    const command = toolInput.command || toolInput.file_path || '';
    summary = `${toolName}: ${command}`.trim();
  } else if (eventType === 'post_tool_use') {
    status = 'success';
    const command = toolInput.command || toolInput.file_path || '';
    summary = `${toolName}: ${command} (completed)`.trim();
  } else if (eventType === 'post_tool_use_failure') {
    status = 'failed';
    const command = toolInput.command || toolInput.file_path || '';
    summary = `${toolName}: ${command} (failed)`.trim();
  } else if (eventType === 'subagent_start') {
    status = 'started';
    summary = `${agentName} started`;
  } else if (eventType === 'subagent_stop') {
    status = 'completed';
    summary = `${agentName} completed`;
  } else if (eventType === 'stop') {
    status = 'stopped';
    summary = `${agentName} stopped`;
  } else {
    summary = `${eventType}: ${agentName}`;
  }

  // Generate a correlation ID (UUID v4)
  const correlationId = randomUUID();

  return {
    eventType,
    agentName,
    toolName: toolName || undefined,
    status,
    summary,
    correlationId,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Sends a hook event payload to the API.
 * Fire-and-forget: catches all errors and returns false on failure.
 *
 * @param {Object} payload - The event payload to send
 * @param {Object} env - Environment variables
 * @param {string} [env.ATEAM_API_URL] - API base URL
 * @param {string} [env.ATEAM_PROJECT_ID] - Project ID
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function sendObserverEvent(payload, env) {
  const apiUrl = env.ATEAM_API_URL || 'http://localhost:3000';
  const projectId = env.ATEAM_PROJECT_ID || 'default';

  // Strip trailing slash from API URL to avoid double slashes
  const cleanUrl = apiUrl.replace(/\/+$/, '');
  const url = `${cleanUrl}/api/hooks/events`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Project-ID': projectId,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      // Log non-200 responses to stderr for debugging (visible in hook output)
      const text = await response.text().catch(() => '');
      process.stderr.write(`[observer] POST ${url} → ${response.status}: ${text}\n`);
    }

    return response.ok;
  } catch (err) {
    // Log connection errors to stderr for debugging
    process.stderr.write(`[observer] POST ${url} failed: ${err.message}\n`);
    return false;
  }
}

export { buildObserverPayload, sendObserverEvent };
