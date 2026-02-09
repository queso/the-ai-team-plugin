import { NextRequest, NextResponse } from 'next/server';
import * as childProcess from 'child_process';
import { prisma } from '@/lib/db';
import { getAndValidateProjectId } from '@/lib/project-utils';
import type { PrecheckResponse, ApiError } from '@/types/api';
import type { PrecheckResult } from '@/types/mission';

/**
 * Default timeout for lint command in milliseconds.
 */
const DEFAULT_LINT_TIMEOUT_MS = 60000;

/**
 * Default timeout for test command in milliseconds.
 */
const DEFAULT_TEST_TIMEOUT_MS = 120000;

/**
 * Gets the lint timeout from environment variable or default.
 */
function getLintTimeout(): number {
  const envTimeout = process.env.PRECHECK_LINT_TIMEOUT_MS;
  if (envTimeout) {
    const parsed = parseInt(envTimeout, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_LINT_TIMEOUT_MS;
}

/**
 * Gets the test timeout from environment variable or default.
 */
function getTestTimeout(): number {
  const envTimeout = process.env.PRECHECK_TEST_TIMEOUT_MS;
  if (envTimeout) {
    const parsed = parseInt(envTimeout, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_TEST_TIMEOUT_MS;
}

/**
 * Executes a shell command with a timeout.
 * Returns the result including stdout, stderr, and success status.
 */
function executeCommand(
  command: string,
  timeout: number
): Promise<{ success: boolean; stdout: string; stderr: string; timedOut: boolean }> {
  return new Promise((resolve) => {
    childProcess.exec(
      command,
      { timeout },
      (error: Error | null, stdoutOrResult: string | { stdout: string; stderr: string }, stderrArg?: string) => {
        const typedError = error as Error & { killed?: boolean; signal?: string };
        const timedOut = typedError?.killed === true && typedError?.signal === 'SIGTERM';

        // Handle both real exec signature and mock signature
        // Real: (error, stdout: string, stderr: string)
        // Mock: (error, { stdout, stderr })
        let stdout: string;
        let stderr: string;
        if (typeof stdoutOrResult === 'object' && stdoutOrResult !== null) {
          stdout = stdoutOrResult.stdout || '';
          stderr = stdoutOrResult.stderr || '';
        } else {
          stdout = stdoutOrResult || '';
          stderr = stderrArg || '';
        }

        resolve({
          success: !error,
          stdout,
          stderr,
          timedOut,
        });
      }
    );
  });
}

/**
 * Parses lint output to count errors.
 * Looks for patterns like "X errors" in the output.
 */
function parseLintErrors(stdout: string, stderr: string): number {
  const combined = `${stdout} ${stderr}`;

  // Match patterns like "5 errors" or "5 errors and 2 warnings"
  const errorMatch = combined.match(/(\d+)\s+errors?/i);
  if (errorMatch) {
    return parseInt(errorMatch[1], 10);
  }

  return 0;
}

/**
 * Parses test output to extract pass/fail counts.
 * Looks for Vitest output patterns.
 */
function parseTestResults(stdout: string, stderr: string): { passed: number; failed: number } {
  const combined = `${stdout} ${stderr}`;

  let passed = 0;
  let failed = 0;

  // Match patterns like "8 passed" or "Tests: 8 passed, 2 failed"
  const passedMatch = combined.match(/(\d+)\s+passed/i);
  if (passedMatch) {
    passed = parseInt(passedMatch[1], 10);
  }

  const failedMatch = combined.match(/(\d+)\s+failed/i);
  if (failedMatch) {
    failed = parseInt(failedMatch[1], 10);
  }

  return { passed, failed };
}

/**
 * POST /api/missions/precheck
 *
 * Runs pre-mission validation checks (lint, tests) and updates mission state.
 *
 * Query parameters:
 * - projectId (string, required): Filter by project ID
 *
 * State transitions:
 * - initializing -> prechecking (when starting)
 * - prechecking -> running (on success)
 * - prechecking -> failed (on failure)
 *
 * Returns PrecheckResponse with:
 * - passed: boolean indicating if all checks passed
 * - lintErrors: count of lint errors found
 * - testsPassed: count of passing tests
 * - testsFailed: count of failing tests
 * - blockers: array of blocking issues
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const projectValidation = getAndValidateProjectId(request.headers);
    if (!projectValidation.valid) {
      const errorResponse: ApiError = {
        success: false,
        error: projectValidation.error,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }
    const projectId = projectValidation.projectId;

    // Find active mission (not archived) for this project
    const mission = await prisma.mission.findFirst({
      where: {
        projectId,
        archivedAt: null,
      },
    });

    // Return 404 if no active mission
    if (!mission) {
      const apiError: ApiError = {
        success: false,
        error: {
          code: 'NO_ACTIVE_MISSION',
          message: 'No active mission found',
        },
      };
      return NextResponse.json(apiError, { status: 404 });
    }

    // Verify mission is in initializing state
    if (mission.state !== 'initializing') {
      const apiError: ApiError = {
        success: false,
        error: {
          code: 'INVALID_MISSION_STATE',
          message: `Mission must be in initializing state to run precheck. Current state: ${mission.state}`,
        },
      };
      return NextResponse.json(apiError, { status: 400 });
    }

    // Update mission state to prechecking
    await prisma.mission.update({
      where: { id: mission.id },
      data: { state: 'prechecking' },
    });

    // Log precheck start
    await prisma.activityLog.create({
      data: {
        projectId,
        missionId: mission.id,
        agent: null,
        message: 'Precheck started',
        level: 'info',
      },
    });

    const blockers: string[] = [];
    let lintErrors = 0;
    let testsPassed = 0;
    let testsFailed = 0;

    // Run lint command
    const lintTimeout = getLintTimeout();
    const lintResult = await executeCommand('npm run lint', lintTimeout);

    if (lintResult.timedOut) {
      blockers.push('Lint command timeout');
    } else if (!lintResult.success) {
      lintErrors = parseLintErrors(lintResult.stdout, lintResult.stderr);
      if (lintErrors === 0) {
        // If we couldn't parse errors but lint failed, report at least 1
        lintErrors = 1;
      }
      blockers.push(`Lint failed with ${lintErrors} error(s)`);
    }

    // Run test command
    const testTimeout = getTestTimeout();
    const testResult = await executeCommand('npm test', testTimeout);

    if (testResult.timedOut) {
      blockers.push('Test command timeout');
    } else {
      const testCounts = parseTestResults(testResult.stdout, testResult.stderr);
      testsPassed = testCounts.passed;
      testsFailed = testCounts.failed;

      if (!testResult.success) {
        blockers.push(`Tests failed: ${testsFailed} test(s) failed`);
      }
    }

    // Determine overall pass/fail
    const passed = blockers.length === 0;

    // Update mission state based on result
    const newState = passed ? 'running' : 'failed';
    await prisma.mission.update({
      where: { id: mission.id },
      data: { state: newState },
    });

    // Log precheck results
    await prisma.activityLog.create({
      data: {
        projectId,
        missionId: mission.id,
        agent: null,
        message: passed
          ? `Precheck passed: ${testsPassed} tests passing, ${lintErrors} lint errors`
          : `Precheck failed: ${blockers.join(', ')}`,
        level: passed ? 'info' : 'error',
      },
    });

    const result: PrecheckResult = {
      passed,
      lintErrors,
      testsPassed,
      testsFailed,
      blockers,
    };

    const response: PrecheckResponse = {
      success: true,
      data: result,
    };

    return NextResponse.json(response);
  } catch (error) {
    const apiError: ApiError = {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to run precheck',
      },
    };
    return NextResponse.json(apiError, { status: 500 });
  }
}
