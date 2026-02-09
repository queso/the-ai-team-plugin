#!/bin/bash

# End-to-end regression test for real-time kanban board updates
# This script sets up a test mission using ai-team scripts and simulates agent activity
#
# Tests:
# - mission-init.js: Initialize fresh mission
# - item-create.js: Create work items
# - board-move.js: Move items through pipeline stages
# - log.js: Activity logging
# - Board UI real-time updates via SSE
# - All 7 agents including Tawnia
# - Mission completion flow (final_review, post_checks, documentation, complete)

set -e

MISSION_DIR="mission"
BACKUP_DIR="mission.backup.$$"
SCRIPTS_DIR=".claude/ai-team/scripts"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[E2E]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[E2E]${NC} $1"
}

info() {
    echo -e "${BLUE}[E2E]${NC} $1"
}

error() {
    echo -e "${RED}[E2E]${NC} $1"
}

agent_log() {
    local agent="$1"
    local message="$2"
    node "$SCRIPTS_DIR/log.js" "$agent" "$message" 2>/dev/null || echo "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z") [$agent] $message" >> "$MISSION_DIR/activity.log"
    info "[$agent] $message"
}

# Create work item using item-create.js
create_item() {
    local json="$1"
    echo "$json" | node "$SCRIPTS_DIR/item-create.js" 2>/dev/null
    if [[ $? -eq 0 ]]; then
        local id=$(echo "$json" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        info "Created item $id"
    else
        error "Failed to create item"
        return 1
    fi
}

# Move item using board-move.js
move_item() {
    local item_id="$1"
    local to_stage="$2"
    local agent="$3"

    local json="{\"itemId\":\"$item_id\",\"to\":\"$to_stage\""
    if [[ -n "$agent" ]]; then
        json="$json,\"agent\":\"$agent\""
    fi
    json="$json}"

    local result=$(echo "$json" | node "$SCRIPTS_DIR/board-move.js" 2>&1)
    if echo "$result" | grep -q '"success": true'; then
        info "Moved $item_id → $to_stage${agent:+ (agent: $agent)}"
        return 0
    else
        warn "Move failed: $result"
        return 1
    fi
}

cleanup() {
    if [[ -d "$BACKUP_DIR" ]]; then
        log "Restoring original mission directory..."
        rm -rf "$MISSION_DIR"
        mv "$BACKUP_DIR" "$MISSION_DIR"
        log "Restored."
    fi
}

# Setup trap for cleanup on exit
trap cleanup EXIT

# ---------------------------------------------------------------------------
# SETUP: Backup and initialize fresh mission
# ---------------------------------------------------------------------------

log "Backing up current mission directory..."
if [[ -d "$MISSION_DIR" ]]; then
    cp -r "$MISSION_DIR" "$BACKUP_DIR"
fi

log "Initializing fresh test mission using mission-init.js..."
echo '{"name": "E2E Regression Test - PRD 099"}' | node "$SCRIPTS_DIR/mission-init.js" --force

# Verify initialization
if [[ ! -f "$MISSION_DIR/board.json" ]]; then
    error "Mission initialization failed - board.json not found"
    exit 1
fi

log "Mission initialized successfully!"

# ---------------------------------------------------------------------------
# CREATE WORK ITEMS
# ---------------------------------------------------------------------------

log "Creating work items using item-create.js..."

# Item 001 - No dependencies (Wave 0)
create_item '{
  "id": "001",
  "title": "Add TypeScript types for feature X",
  "type": "interface",
  "dependencies": [],
  "outputs": {
    "test": "src/__tests__/feature-x-types.test.ts",
    "impl": "src/types/feature-x.ts"
  },
  "objective": "Define TypeScript interfaces and types for feature X",
  "acceptance": ["Type definitions are complete", "Types are exported correctly"]
}'

# Item 002 - Depends on 001 (Wave 1)
create_item '{
  "id": "002",
  "title": "Implement feature X service",
  "type": "implementation",
  "dependencies": ["001"],
  "outputs": {
    "test": "src/__tests__/feature-x-service.test.ts",
    "impl": "src/services/feature-x.ts"
  },
  "objective": "Implement the core service logic for feature X",
  "acceptance": ["Service methods are implemented", "All tests pass"]
}'

# Item 003 - Depends on 001 (Wave 1)
create_item '{
  "id": "003",
  "title": "Add feature X UI component",
  "type": "implementation",
  "dependencies": ["001"],
  "outputs": {
    "test": "src/__tests__/feature-x-component.test.tsx",
    "impl": "src/components/feature-x.tsx"
  },
  "objective": "Create React component for feature X UI",
  "acceptance": ["Component renders correctly", "Props are typed", "Tests pass"]
}'

# Item 004 - Depends on 002, 003 (Wave 2)
create_item '{
  "id": "004",
  "title": "Integration tests for feature X",
  "type": "test",
  "dependencies": ["002", "003"],
  "outputs": {
    "test": "src/__tests__/feature-x-integration.test.ts",
    "impl": "n/a"
  },
  "objective": "Write integration tests covering the full feature X flow",
  "acceptance": ["Integration tests pass", "Coverage is adequate"]
}'

log "Work items created!"

# Verify items created
node "$SCRIPTS_DIR/deps-check.js" | head -5

# ---------------------------------------------------------------------------
# SIMULATION START
# ---------------------------------------------------------------------------

echo ""
echo "========================================"
echo "  E2E REGRESSION TEST READY"
echo "========================================"
echo ""
log "Open http://localhost:3000 in your browser to watch the simulation."
echo ""

INITIAL_DELAY=3
DELAY=2

log "Starting simulation in $INITIAL_DELAY seconds..."
sleep $INITIAL_DELAY
log "Simulation started!"
echo ""

# ---------------------------------------------------------------------------
# WAVE 0: Item 001 through full pipeline
# ---------------------------------------------------------------------------

log "=== WAVE 0: Processing item 001 (no dependencies) ==="

# 001: briefings → ready
sleep $DELAY
move_item "001" "ready"

# 001: ready → testing (Murdock)
sleep $DELAY
move_item "001" "testing" "Murdock"
agent_log "Murdock" "Writing tests for TypeScript types"

sleep $DELAY
agent_log "Murdock" "Tests complete - 12 test cases"

# 001: testing → implementing (B.A.)
sleep $DELAY
move_item "001" "implementing" "B.A."
agent_log "B.A." "Implementing TypeScript types"

sleep $DELAY
agent_log "B.A." "Implementation complete - all tests passing"

# 001: implementing → review (Lynch)
sleep $DELAY
move_item "001" "review" "Lynch"
agent_log "Lynch" "Reviewing types implementation"

sleep $DELAY
agent_log "Lynch" "APPROVED - Clean type definitions"

# 001: review → probing (Amy)
sleep $DELAY
move_item "001" "probing" "Amy"
agent_log "Amy" "Investigating edge cases for types"

sleep $DELAY
agent_log "Amy" "VERIFIED - No hidden bugs found"

# 001: probing → done
sleep $DELAY
move_item "001" "done"
agent_log "Hannibal" "Item 001 complete!"

# ---------------------------------------------------------------------------
# WAVE 1: Items 002 and 003 in parallel
# ---------------------------------------------------------------------------

log "=== WAVE 1: Processing items 002, 003 (depend on 001) ==="

# Move both to ready (dependencies satisfied)
sleep $DELAY
move_item "002" "ready"
move_item "003" "ready"

# Start both in testing (parallel)
sleep $DELAY
move_item "002" "testing" "Murdock"
agent_log "Murdock" "Writing tests for feature X service"

sleep 1
move_item "003" "testing" "Murdock"
agent_log "Murdock" "Writing tests for feature X component"

sleep $DELAY
agent_log "Murdock" "Service tests complete - 8 test cases"
agent_log "Murdock" "Component tests complete - 15 test cases"

# Move to implementing
sleep $DELAY
move_item "002" "implementing" "B.A."
agent_log "B.A." "Implementing feature X service"

sleep 1
move_item "003" "implementing" "B.A."
agent_log "B.A." "Implementing feature X component"

sleep $DELAY
agent_log "B.A." "Service implementation complete"
agent_log "B.A." "Component implementation complete"

# Move to review
sleep $DELAY
move_item "002" "review" "Lynch"
move_item "003" "review" "Lynch"
agent_log "Lynch" "Reviewing service and component together"

sleep $DELAY
agent_log "Lynch" "APPROVED - Both implementations look solid"

# Move to probing
sleep $DELAY
move_item "002" "probing" "Amy"
move_item "003" "probing" "Amy"
agent_log "Amy" "Probing service and component for edge cases"

sleep $DELAY
agent_log "Amy" "VERIFIED - Both items clear"

# Move to done
sleep $DELAY
move_item "002" "done"
move_item "003" "done"
agent_log "Hannibal" "Wave 1 complete - items 002 and 003 done!"

# ---------------------------------------------------------------------------
# WAVE 2: Item 004 (integration tests)
# ---------------------------------------------------------------------------

log "=== WAVE 2: Processing item 004 (integration tests) ==="

sleep $DELAY
move_item "004" "ready"

sleep $DELAY
move_item "004" "testing" "Murdock"
agent_log "Murdock" "Writing integration tests for feature X"

sleep $DELAY
agent_log "Murdock" "Integration tests complete - 6 test cases"

# For test items, implementing is a quick pass-through
sleep $DELAY
move_item "004" "implementing" "B.A."
agent_log "B.A." "Verifying integration test setup"

sleep 1
move_item "004" "review" "Lynch"
agent_log "Lynch" "Reviewing integration tests"

sleep $DELAY
agent_log "Lynch" "APPROVED - Good coverage"

sleep $DELAY
move_item "004" "probing" "Amy"
agent_log "Amy" "Final verification of integration tests"

sleep $DELAY
agent_log "Amy" "VERIFIED - All clear"

sleep $DELAY
move_item "004" "done"
agent_log "Hannibal" "All items complete! Initiating final review."

# ---------------------------------------------------------------------------
# MISSION COMPLETION FLOW
# ---------------------------------------------------------------------------

log "=== MISSION COMPLETION FLOW ==="

# Update board.json to show final_review phase
sleep $DELAY
agent_log "Hannibal" "All items in done. Dispatching Lynch for final review."

# Manually update board.json for final_review status
node -e "
const fs = require('fs');
const board = JSON.parse(fs.readFileSync('$MISSION_DIR/board.json', 'utf8'));
board.mission.status = 'final_review';
board.finalReview = {
  started_at: new Date().toISOString(),
  passed: false,
  agent: 'Lynch'
};
board.agents.Lynch.status = 'working';
board.agents.Lynch.current_item = 'final-review';
fs.writeFileSync('$MISSION_DIR/board.json', JSON.stringify(board, null, 2));
"
info "Mission status → final_review"

sleep $DELAY
agent_log "Lynch" "FINAL MISSION REVIEW - Reviewing all 4 items holistically"

sleep $DELAY
agent_log "Lynch" "Checking code consistency across modules..."

sleep $DELAY
agent_log "Lynch" "VERDICT: FINAL APPROVED"

# Update board.json for post_checks
node -e "
const fs = require('fs');
const board = JSON.parse(fs.readFileSync('$MISSION_DIR/board.json', 'utf8'));
board.mission.status = 'post_checks';
board.finalReview.completed_at = new Date().toISOString();
board.finalReview.passed = true;
board.finalReview.verdict = 'APPROVED';
board.agents.Lynch.status = 'idle';
delete board.agents.Lynch.current_item;
board.postChecks = {
  started_at: new Date().toISOString(),
  passed: false,
  results: {
    lint: { status: 'pending' },
    typecheck: { status: 'pending' },
    test: { status: 'pending' },
    build: { status: 'pending' }
  }
};
fs.writeFileSync('$MISSION_DIR/board.json', JSON.stringify(board, null, 2));
"
info "Mission status → post_checks"

sleep $DELAY
agent_log "Hannibal" "Running post-mission checks..."

# Simulate checks passing one by one
sleep 1
node -e "
const fs = require('fs');
const board = JSON.parse(fs.readFileSync('$MISSION_DIR/board.json', 'utf8'));
board.postChecks.results.lint = { status: 'passed', completed_at: new Date().toISOString() };
fs.writeFileSync('$MISSION_DIR/board.json', JSON.stringify(board, null, 2));
"
agent_log "Hannibal" "Lint: PASSED"

sleep 1
node -e "
const fs = require('fs');
const board = JSON.parse(fs.readFileSync('$MISSION_DIR/board.json', 'utf8'));
board.postChecks.results.typecheck = { status: 'passed', completed_at: new Date().toISOString() };
fs.writeFileSync('$MISSION_DIR/board.json', JSON.stringify(board, null, 2));
"
agent_log "Hannibal" "TypeCheck: PASSED"

sleep 1
node -e "
const fs = require('fs');
const board = JSON.parse(fs.readFileSync('$MISSION_DIR/board.json', 'utf8'));
board.postChecks.results.test = { status: 'passed', completed_at: new Date().toISOString() };
fs.writeFileSync('$MISSION_DIR/board.json', JSON.stringify(board, null, 2));
"
agent_log "Hannibal" "Unit Tests: PASSED (41/41)"

sleep 1
node -e "
const fs = require('fs');
const board = JSON.parse(fs.readFileSync('$MISSION_DIR/board.json', 'utf8'));
board.postChecks.results.build = { status: 'passed', completed_at: new Date().toISOString() };
board.postChecks.passed = true;
board.postChecks.completed_at = new Date().toISOString();
fs.writeFileSync('$MISSION_DIR/board.json', JSON.stringify(board, null, 2));
"
agent_log "Hannibal" "Build: PASSED"

sleep $DELAY
agent_log "Hannibal" "Post-checks complete. Dispatching Tawnia for documentation."

# Update board.json for documentation phase
node -e "
const fs = require('fs');
const board = JSON.parse(fs.readFileSync('$MISSION_DIR/board.json', 'utf8'));
board.mission.status = 'documentation';
board.documentation = {
  started_at: new Date().toISOString(),
  completed: false,
  agent: 'Tawnia',
  files_modified: []
};
if (!board.agents.Tawnia) board.agents.Tawnia = {};
board.agents.Tawnia.status = 'working';
board.agents.Tawnia.current_item = 'documentation';
fs.writeFileSync('$MISSION_DIR/board.json', JSON.stringify(board, null, 2));
"
info "Mission status → documentation"

sleep $DELAY
agent_log "Tawnia" "Starting documentation phase"

sleep $DELAY
agent_log "Tawnia" "Updating CHANGELOG.md"

sleep $DELAY
agent_log "Tawnia" "Updating README.md"

sleep $DELAY
agent_log "Tawnia" "Creating final commit..."

sleep $DELAY
agent_log "Tawnia" "COMMITTED a1b2c3d - feat: E2E Regression Test - PRD 099"

# Update board.json for complete
node -e "
const fs = require('fs');
const board = JSON.parse(fs.readFileSync('$MISSION_DIR/board.json', 'utf8'));
board.mission.status = 'complete';
board.mission.completed_at = new Date().toISOString();
board.documentation.completed = true;
board.documentation.completed_at = new Date().toISOString();
board.documentation.files_modified = ['CHANGELOG.md', 'README.md'];
board.documentation.commit = { hash: 'a1b2c3d', message: 'feat: E2E Regression Test - PRD 099' };
board.documentation.summary = 'Updated CHANGELOG with 4 entries, updated README';
board.agents.Tawnia.status = 'idle';
delete board.agents.Tawnia.current_item;
fs.writeFileSync('$MISSION_DIR/board.json', JSON.stringify(board, null, 2));
"
info "Mission status → complete"

sleep $DELAY
agent_log "Hannibal" "I love it when a plan comes together."

# ---------------------------------------------------------------------------
# SUMMARY
# ---------------------------------------------------------------------------

echo ""
log "========================================"
log "  SIMULATION COMPLETE"
log "========================================"
log ""
log "Pipeline stages tested:"
log "  - briefings → ready → testing → implementing → review → probing → done"
log ""
log "Mission completion flow tested:"
log "  - final_review (Lynch)"
log "  - post_checks (lint, typecheck, test, build)"
log "  - documentation (Tawnia)"
log "  - complete"
log ""
log "Scripts tested:"
log "  - mission-init.js"
log "  - item-create.js"
log "  - board-move.js"
log "  - deps-check.js"
log "  - log.js"
log ""
log "Final state:"
log "  - Items completed: 4"
log "  - Mission status: complete"
log "  - Final review: APPROVED"
log "  - Post-checks: All passed"
log "  - Documentation: Committed"
log ""

log "Restoring original mission directory in 3 seconds..."
sleep 3
