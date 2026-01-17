/**
 * File locking utilities for atomic board operations.
 * Uses proper-lockfile for cross-platform file locking.
 */

import lockfile from 'proper-lockfile';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';

const LOCK_OPTIONS = {
  stale: 10000,      // Consider lock stale after 10s
  retries: {
    retries: 5,
    minTimeout: 100,
    maxTimeout: 1000
  }
};

/**
 * Ensures the mission directory and lock file exist.
 * @param {string} missionDir - Path to mission directory
 */
async function ensureLockFile(missionDir) {
  const lockPath = join(missionDir, '.lock');
  try {
    await mkdir(dirname(lockPath), { recursive: true });
    // Create empty lock file if it doesn't exist
    const { writeFile } = await import('fs/promises');
    await writeFile(lockPath, '', { flag: 'a' });
  } catch (err) {
    // Ignore if already exists
    if (err.code !== 'EEXIST') throw err;
  }
  return lockPath;
}

/**
 * Acquires a lock on the mission directory.
 * @param {string} missionDir - Path to mission directory
 * @returns {Promise<Function>} Release function
 */
export async function acquireLock(missionDir) {
  const lockPath = await ensureLockFile(missionDir);
  try {
    const release = await lockfile.lock(lockPath, LOCK_OPTIONS);
    return release;
  } catch (err) {
    const error = new Error(`Lock acquisition failed: ${err.message}`);
    error.code = 'LOCK_FAILED';
    error.exitCode = 30;
    throw error;
  }
}

/**
 * Executes a function while holding the lock.
 * Automatically releases lock on completion or error.
 * @param {string} missionDir - Path to mission directory
 * @param {Function} fn - Async function to execute while holding lock
 * @returns {Promise<*>} Result of fn
 */
export async function withLock(missionDir, fn) {
  const release = await acquireLock(missionDir);
  try {
    return await fn();
  } finally {
    await release();
  }
}

/**
 * Checks if the mission directory is currently locked.
 * @param {string} missionDir - Path to mission directory
 * @returns {Promise<boolean>}
 */
export async function isLocked(missionDir) {
  const lockPath = join(missionDir, '.lock');
  try {
    return await lockfile.check(lockPath);
  } catch {
    return false;
  }
}
