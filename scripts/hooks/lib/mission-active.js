#!/usr/bin/env node
/**
 * mission-active.js - Mission-active marker file utility
 *
 * Creates/checks/removes a marker file to distinguish "normal Claude session"
 * from "Hannibal's session during /ateam run". Without this, enforcement hooks
 * fire on every Write/Edit in the main session — even outside a mission.
 *
 * Follows the same marker-file pattern as track-browser-usage.js.
 *
 * Marker location: /tmp/.ateam-mission-active-{projectId}
 */
import { existsSync, writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';

/**
 * Returns the marker file path for the current project.
 * @returns {string}
 */
function markerPath() {
  const projectId = process.env.ATEAM_PROJECT_ID || 'default';
  return join(tmpdir(), `.ateam-mission-active-${projectId}`);
}

/**
 * Checks if a mission is currently active (marker file exists).
 * @returns {boolean}
 */
export function isMissionActive() {
  return existsSync(markerPath());
}

/**
 * Creates the mission-active marker file.
 */
export function setMissionActive() {
  const p = markerPath();
  try {
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, new Date().toISOString());
  } catch { /* non-blocking */ }
}

/**
 * Removes the mission-active marker file.
 * Graceful — no error if the file doesn't exist.
 */
export function clearMissionActive() {
  try {
    unlinkSync(markerPath());
  } catch { /* ignore — already cleared or never set */ }
}
