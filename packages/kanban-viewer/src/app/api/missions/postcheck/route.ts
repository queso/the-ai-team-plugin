import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAndValidateProjectId } from '@/lib/project-utils';
import type { PostcheckResponse, ApiError } from '@/types/api';
import type { PostcheckResult } from '@/types/mission';

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
 * POST /api/missions/postcheck
 *
 * Accepts a pre-computed postcheck result { passed, blockers, output } from the MCP tool.
 * Does NOT execute shell commands itself — the caller (Hannibal) runs checks via Bash
 * in the target project directory and passes results here.
 *
 * State transitions:
 * - passed=true:  running -> completed
 * - passed=false: running -> failed
 *
 * Returns PostcheckResponse with:
 * - passed: boolean indicating if all checks passed
 * - lintErrors: count of lint errors found (parsed from output.lint)
 * - unitTestsPassed: count of passing unit tests (parsed from output.unit)
 * - unitTestsFailed: count of failing unit tests (parsed from output.unit)
 * - e2eTestsPassed: count of passing e2e tests (parsed from output.e2e)
 * - e2eTestsFailed: count of failing e2e tests (parsed from output.e2e)
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

    // Verify mission is in running state
    if (mission.state !== 'running') {
      const apiError: ApiError = {
        success: false,
        error: {
          code: 'INVALID_MISSION_STATE',
          message: `Mission must be in running state to run postcheck. Current state: ${mission.state}`,
        },
      };
      return NextResponse.json(apiError, { status: 400 });
    }

    const body = await request.json();
    const { passed, blockers = [], output = {} } = body;

    // Validate body fields
    if (typeof passed !== 'boolean') {
      const apiError: ApiError = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '`passed` must be a boolean',
        },
      };
      return NextResponse.json(apiError, { status: 400 });
    }

    if (!Array.isArray(blockers) || !blockers.every((b: unknown) => typeof b === 'string')) {
      const apiError: ApiError = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '`blockers` must be an array of strings',
        },
      };
      return NextResponse.json(apiError, { status: 400 });
    }

    if (typeof output !== 'object' || output === null || Array.isArray(output)) {
      const apiError: ApiError = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '`output` must be an object',
        },
      };
      return NextResponse.json(apiError, { status: 400 });
    }

    // Update mission state to postchecking
    await prisma.mission.update({
      where: { id: mission.id },
      data: { state: 'postchecking' },
    });

    // Log postcheck start
    await prisma.activityLog.create({
      data: {
        projectId,
        missionId: mission.id,
        agent: null,
        message: 'Postcheck started',
        level: 'info',
      },
    });

    // Parse counts from output map
    type CheckOutput = { stdout?: string; stderr?: string; timedOut?: boolean };
    const lintOut: CheckOutput = output.lint ?? {};
    const unitOut: CheckOutput = output.unit ?? {};
    const e2eOut: CheckOutput = output.e2e ?? {};

    const lintErrors = parseLintErrors(lintOut.stdout ?? '', lintOut.stderr ?? '');
    const { passed: unitTestsPassed, failed: unitTestsFailed } = parseTestResults(
      unitOut.stdout ?? '',
      unitOut.stderr ?? ''
    );
    const { passed: e2eTestsPassed, failed: e2eTestsFailed } = parseTestResults(
      e2eOut.stdout ?? '',
      e2eOut.stderr ?? ''
    );

    // Update mission state based on result
    const newState = passed ? 'completed' : 'failed';
    await prisma.mission.update({
      where: { id: mission.id },
      data: {
        state: newState,
        ...(passed ? { completedAt: new Date() } : {}),
      },
    });

    // Log postcheck results
    await prisma.activityLog.create({
      data: {
        projectId,
        missionId: mission.id,
        agent: null,
        message: passed
          ? `Postcheck passed: ${unitTestsPassed} unit tests, ${e2eTestsPassed} e2e tests passing, ${lintErrors} lint errors`
          : `Postcheck failed: ${blockers.join(', ')}`,
        level: passed ? 'info' : 'error',
      },
    });

    const result: PostcheckResult = {
      passed,
      lintErrors,
      unitTestsPassed,
      unitTestsFailed,
      e2eTestsPassed,
      e2eTestsFailed,
      blockers,
    };

    const response: PostcheckResponse = {
      success: true,
      data: result,
    };

    return NextResponse.json(response);
  } catch (error) {
    const apiError: ApiError = {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to run postcheck',
      },
    };
    return NextResponse.json(apiError, { status: 500 });
  }
}
