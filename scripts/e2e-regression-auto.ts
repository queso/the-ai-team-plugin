#!/usr/bin/env tsx

/**
 * Auto-run version of the E2E regression script (skips interactive prompt)
 *
 * Supports --project CLI argument to specify the project ID:
 *   ./e2e-regression-auto.ts --project my-project
 *   ./e2e-regression-auto.ts --project=my-project
 *
 * Defaults to "kanban-viewer" if not specified.
 */

// Run the original script (which handles --project argument parsing)
import('./e2e-regression.ts');
