# Changelog

All notable changes to the A(i)-Team plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Kanban UI End-to-End Verification Suite** (PRD-006) - FlowSpec-based verification specs and seed data infrastructure for the Kanban viewer UI
  - Created `packages/kanban-viewer/scripts/seed-demo-data.ts` — TypeScript seed script populating the Kanban board with realistic demo data (agents, stages, hook events)
  - Created `packages/kanban-viewer/flowspec.config.yaml` — FlowSpec test runner configuration for all Kanban UI specs
  - Created `packages/kanban-viewer/specs/kanban-board.flow.yaml` — Board stage columns and WI card verification spec
  - Created `packages/kanban-viewer/specs/activity-feed.flow.yaml` — Activity feed panel and event ordering verification spec
  - Created `packages/kanban-viewer/specs/raw-agent-view.flow.yaml` — Agent swim lanes and tool call card verification spec
  - Created `packages/kanban-viewer/specs/agent-event-details.flow.yaml` — Hook event card detail expansion verification spec
  - Created `packages/kanban-viewer/specs/view-switching.flow.yaml` — Tab navigation round-trip verification spec

### Fixed

- **MCP server board.ts lint** — Replaced template literal with plain string literal in `board_move` tool description to satisfy Biome lint rules

- **Raw Agent Observability Dashboard** (PRD-005) - Real-time visibility into agent tool calls via observer hooks and dedicated UI
  - Created HookEvent Prisma model with correlationId-based deduplication
  - Added POST /api/hooks/events endpoint with Zod validation, batching, and deduplication
  - Integrated hook events into SSE stream for real-time updates
  - Built observer hook scripts (PreToolUse, PostToolUse, Stop) that fire-and-forget event data to API
  - Added observer hooks to all 8 agent frontmatter files (hannibal, face, sosa, murdock, ba, lynch, amy, tawnia)
  - Created Raw Agent View UI component with swim lanes showing tool calls per agent
  - Added filtering controls (by agent, tool, status) for hook events
  - Implemented dashboard navigation to switch between Mission Board and Raw Agent View
  - Added duration pairing for PreToolUse → PostToolUse events (e.g., "Write took 1.2s")
  - Created hook event pruning endpoint with transactional batch deletion
  - Updated /ateam setup command with observer hook configuration

- **Monorepo structure with shared types package** (PRD-004) - Migrated from two separate repositories into a unified bun workspaces monorepo
  - Created `packages/shared/` - @ai-team/shared package with shared TypeScript types, constants, and validation functions
  - Moved `mcp-server/` to `packages/mcp-server/` - now imports from @ai-team/shared
  - Imported `packages/kanban-viewer/` via git subtree from separate repository - now imports from @ai-team/shared
  - Added root `docker-compose.yml` for one-command kanban-viewer startup
  - Converted root `package.json` to bun workspace root with `workspaces: ["packages/*"]`
  - Updated `.mcp.json` to point to `packages/mcp-server/src/index.ts` with bun runtime

- **Compile-time safety verification** (WI-174) - Documented proof of end-to-end TypeScript safety
  - Created `docs/compile-time-safety-verification.md` with test scenarios and results
  - Verified: Adding stage to ALL_STAGES without updating TRANSITION_MATRIX → TypeScript error
  - Verified: Removing agent from VALID_AGENTS without updating AGENT_DISPLAY_NAMES → TypeScript error
  - Verified: Item types are backwards-compatible with extensible design
  - Architecture analysis explains const assertions, indexed access types, and Record exhaustiveness

### Changed

- **MCP Server test suite cleanup** - Removed 170 dead tests and replaced with 62 behavioral tests
  - Deleted 6 fake MCP server test files testing mock schemas instead of real code (129 tests)
  - Deleted 2 root-level useless test files (6 tests)
  - Trimmed 48 low-value tests from 6 files (meta-tests, tautological tests, duplicate tests)
  - Trimmed 6 legacy migration guard tests from enforce-hooks.test.js
  - Added 14 real behavioral tests for board.ts handlers (DI pattern for client mocking)
  - Added 23 real behavioral tests for items.ts handlers (vi.mock() pattern)
  - Added 25 real behavioral tests for missions.ts handlers (vi.mock() pattern)
  - Updated agents/murdock.md with "What NOT to Test" anti-pattern examples
  - Updated agents/face.md with NO_TEST_NEEDED identification guidance
  - Net result: 407 tests → 304 tests (all behavioral)

- **Unified CI pipeline** - Updated `.github/workflows/ci.yml` for bun workspaces with conditional build detection
  - Added workspace-level dependency installation with `bun install`
  - Added conditional builds: only build packages with changes
  - Unified test execution across all packages
  - Added build verification step before tests

- **Documentation updates** - Updated CLAUDE.md with monorepo structure and workspace patterns
  - Added workspace architecture diagram
  - Added shared package usage examples
  - Updated file organization section
  - Added bun workspace commands

- **Enhanced /ateam setup command** - Added Docker detection and kanban-viewer startup guidance
  - Auto-detects Docker Compose installation
  - Provides one-command startup instructions for kanban-viewer
  - Updates `ateam.config.json` with dev server configuration
---

## [2.3.0] - 2026-02-07

### Fixed

- **Enforcement hooks now query API** - Both `enforce-completion-log.js` and `enforce-final-review.js` were completely inert, reading from a non-existent local `board.json` instead of the API database. Hooks now query `ATEAM_API_URL` for live mission state. Error messages reference MCP tools instead of legacy scripts. (Finding 1)

- **Pipeline prompt contradictions** - Hannibal's "Handling Approvals" section skipped Amy's mandatory probing stage (review -> done). Lynch's per-feature review section allowed spawning Amy, duplicating the mandatory pipeline stage. Fixed approval flow to include probing, scoped Lynch's deep investigation to Final Mission Review only. (Findings 5, 6)

- **Resume recovery strategies** - Three contradictory recovery approaches in `commands/resume.md`. Consolidated into a single consistent strategy with all stages covered (including `probing`), consistent across legacy and native teams modes. (Finding 7)

- **HTTP client retries:0 bug** - `agents.ts` hardcoded `retries: 0` for agent lifecycle calls. A network blip during `agent_stop` could lose work completion records permanently. Now uses `config.retries` (default 3). (Finding 9)

- **23 test failures across 5 files** - Fixed client retry tests, tool registration tests, server mock, config env var expectations, and API path mismatches. All 1,632 tests now pass (1,221 root + 411 MCP server). (Finding 8)

- **CLAUDE.md documentation inaccuracies** - Updated `plugin.json` path to `.claude-plugin/plugin.json`, corrected Hannibal's hook references, listed all 5 hook scripts, clarified subagent type labels as role descriptions. (Findings 11, 12, 14)

### Added

- **Shared agent validation module** (`mcp-server/src/lib/agents.ts`) - Extracted agent name validation (VALID_AGENTS_LOWER, AGENT_NAME_MAP, normalizeAgentName, AgentNameSchema) from 3 duplicated copies across board.ts, agents.ts, and utils.ts. (Finding 2)

- **Shared schema utilities** (`mcp-server/src/lib/schema-utils.ts`) - Unified `zodToJsonSchema`, `isOptional`, and `getPropertySchema` from 3 incomplete copies, each handling different Zod types. Single module now handles all: ZodEffects, ZodBoolean, ZodEnum, ZodOptional, ZodDefault, ZodString, ZodNumber, ZodArray, ZodObject. (Finding 3)

- **Shared ToolResponse type** (`mcp-server/src/lib/tool-response.ts`) - Consolidated the `ToolResponse` interface from 4 duplicated definitions across all tool modules. (Finding 4)

- **Biome linter** - Configured `@biomejs/biome` for the MCP server with TypeScript rules. `npm run lint` now produces real output. (Finding 17)

### Changed

- **Updated Kanban UI PRD** - Marked `docs/kanban-ui-prd.md` as superseded with pointer to the current API-based architecture. Updated agent roster (added Sosa, Amy, Tawnia) and stage list (added probing). (Finding 13)

- **TDD workflow skill** - Enhanced `skills/tdd-workflow.md` with expanded testing guidance and stage-specific instructions.

### Removed

- **~1,600 lines of legacy dead code** - Removed `lib/board.js`, `lib/lock.js`, `lib/validate.js` (~600 lines) and 18 scripts in `scripts/` (~1,000 lines). These were the legacy CLI interface superseded by the MCP server + API. Cleaned up root `package.json` dependencies (`gray-matter`, `proper-lockfile`). (Finding 15)

---

## [2.2.0] - 2026-01-28

### Changed

- **Self-contained agent definitions** - Merged external base agent expertise into A(i)-Team agents
  - `murdock.md` - Absorbed qa-engineer expertise (Testing Best Practices, API/Browser Testing Guidelines, Quality Gates)
  - `ba.md` - Absorbed clean-code-architect expertise (SOLID principles, DRY, Type Safety, Testability by Design)
  - `lynch.md` - Absorbed code-review-expert expertise (Priority Framework, Rule of Three, Check for Existing Solutions)
  - `amy.md` - Absorbed bug-hunter expertise (Investigation Methodology, Log Analysis, Hypothesis-Driven Debugging)
  - `sosa.md` - Absorbed requirements-critic expertise (Key Principles, Analysis Framework, AskUserQuestion guidance)

- **Simplified subagent dispatch** - All agents now use `subagent_type: "general-purpose"`
  - Removed dependency on external agent definitions (`qa-engineer`, `clean-code-architect`, etc.)
  - Agent behavior is fully defined in the prompt from `agents/*.md` files
  - Updated: `hannibal.md`, `lynch.md`, `CLAUDE.md`, `commands/plan.md`, `commands/perspective-test.md`

---

## [2.1.0] - 2026-01-28

### Added

- **Native task tracking for session orchestration** - Hannibal now uses Claude's native `TaskCreate`/`TaskUpdate` tools for CLI progress visibility
  - Added "Session Progress Tracking" section to `agents/hannibal.md`
  - Added "Task Tracking: Two Systems" section to `CLAUDE.md`
  - Native tasks track coarse-grained milestones (waves, phases) - not per-item mirrors
  - MCP items remain the source of truth for persistent mission state

- **Permission failure handling** - Explicit guidance preventing Hannibal from "taking over" when agents fail
  - Added "When Agents Fail Due to Permissions" section to `agents/hannibal.md`
  - Makes clear that stopping and running `/ateam setup` is the ONLY valid solution
  - "Hannibal writes directly" is explicitly forbidden, not a workaround option

- **Expanded background agent permissions** - Added missing permissions for agents to work autonomously
  - `Bash(mkdir *)` - create directories for tests and implementations
  - `Edit(src/**)` - edit existing files during implementation
  - Updated CLAUDE.md, README.md, and commands/setup.md

### Fixed

- **Hook path matching** - `block-hannibal-writes.js` now handles relative paths (`src/...`) not just absolute (`/src/...`)

- **Dependency ID validation** - `item_create` now validates dependency IDs match `WI-XXX` format
  - Zod schema rejects bare numeric IDs like `"001"` with a helpful error message
  - Runtime validation runs before API call, catching format issues early
  - Error message suggests using the ID returned from previous `item_create` calls

### Changed

- **`item_update`** - Uses PATCH instead of PUT for partial updates

### Fixed

- **ID format documentation** - Updated all examples from bare `"001"` to `"WI-001"` format
  - `agents/face.md` - ID Convention section, YAML examples, deps_check output
  - `agents/sosa.md` - Consolidation and refinement examples
  - `CLAUDE.md` - Work item format example
  - `README.md` - Work item format example

- **Face agent error handling** - Face no longer strips dependencies to work around validation errors
  - Added explicit "Error Handling" section forbidding dependency removal workarounds
  - Added guidance to create items in dependency order (Wave 0 first)

- **Face second pass scope** - Face no longer explores the codebase on second pass
  - Tools section split by pass (first: Glob/Grep/MCP, second: MCP only)
  - Second pass explicitly forbids Glob, Grep, Search tools
  - Plan command prompt reinforced with MCP-only instruction

- **Working directory boundary** - Agents no longer explore the ai-team plugin directory
  - Added "Working Directory" section to Critical Requirements in CLAUDE.md
  - All agents are directed to work on the target project only

---

## [2.0.0] - 2026-01-22

### Added

- **MCP Server** - New Model Context Protocol server for Claude Code plugin integration
  - Server core (`mcp-server/src/server.ts`) with stdio transport using `@modelcontextprotocol/sdk`
  - HTTP client (`mcp-server/src/client/index.ts`) with exponential backoff retry logic (1s/2s/4s delays)
  - HTTP client supports GET, POST, PUT, PATCH, DELETE with `X-Project-ID` header on every request
  - Error utilities (`mcp-server/src/lib/errors.ts`) for MCP-compatible error responses
  - Configuration module with `ATEAM_PROJECT_ID` for multi-project isolation

- **20 MCP Tools** across 5 modules:
  - **Board tools** (`board.ts`): `board_read`, `board_move`, `board_claim`, `board_release`
  - **Item tools** (`items.ts`): `item_create`, `item_update`, `item_get`, `item_list`, `item_reject`, `item_render`
  - **Agent tools** (`agents.ts`): `agent_start`, `agent_stop`
  - **Mission tools** (`missions.ts`): `mission_init`, `mission_current`, `mission_precheck`, `mission_postcheck`, `mission_archive`
  - **Utility tools** (`utils.ts`): `deps_check`, `activity_log`, `log`

- **Tool Registration** (`mcp-server/src/tools/index.ts`) - Registers tools via `McpServer.tool()` high-level API with Zod schemas
  - Agent name normalization: case-insensitive input transformed to proper case (`ba` → `B.A.`)

- **Plugin Configuration** (`.mcp.json`) - Registers MCP server with Claude Code using `CLAUDE_PLUGIN_ROOT` for portable paths

### Changed

- **Agent interaction model** - All agents now use MCP tools instead of CLI scripts for board operations
  - Agents invoke tools directly rather than shelling out to Node.js scripts
  - Reduced permission requirements (no longer need `Bash(node **/scripts/*.js)` or `Bash(cat <<*)`)
  - Cleaner error handling with structured MCP responses

- **Documentation updates** - Updated all documentation to reference MCP tools:
  - `CLAUDE.md` - Updated CLI scripts section to MCP tools section
  - `README.md` - Replaced script examples with MCP tool usage
  - `commands/*.md` - Updated command documentation

- **Hook enforcement** - Hooks still use internal scripts but agent-facing API is now MCP tools

### Deprecated

- **CLI scripts** - Scripts in `scripts/` directory are now only used internally by hooks
  - `board-*.js`, `item-*.js`, `mission-*.js` scripts are superseded by MCP tools
  - Scripts remain for hook enforcement but are not directly called by agents

### Technical Details

- All tools use Zod schemas for input validation
- Comprehensive error handling with HTTP status code mapping
- Type-safe TypeScript implementation throughout
- 355 tests with full coverage
- Maintains backward compatibility through hook scripts

---

## [1.8.0] - 2026-01-18

### Changed

- **`lib/validate.js`** - Made `outputs` field required for work item creation
  - `outputs` is now in the required array for `itemCreate` schema
  - Added nested required validation: `outputs.test` and `outputs.impl` must be provided
  - Prevents Face from creating work items that are missing critical file path information
  - Clear error messages: "Missing required field: outputs" or "outputs.test is required"

- **`scripts/item-create.js`** - Removed conditional check for `outputs`
  - Since `outputs` is now required by validation, the conditional `if (input.outputs)` was removed
  - Frontmatter always includes `outputs` field

- **`agents/amy.md`** - Strengthened Raptor Protocol to catch integration bugs
  - Added **Wiring Check** (step 2): Trace full data flow from implementation to UI
    - Verify components are actually *imported* where needed
    - Verify components are actually *used*, not just defined
    - When a callback is added, verify something actually *calls* it
    - Follow path: implementation → hook → handler → state → UI render
  - Added **User Perspective** (step 3): Test from the user's point of view
    - Load the actual app/page (not just run unit tests)
    - Trigger the feature as a user would
    - Verify expected visual/behavioral outcome
  - Updated Investigation Checklist with Wiring, Data flow, and User-visible checks
  - Updated Output Format with "Wiring Verification" and "User Perspective Test" sections

### Fixed

- Work items created without `outputs` field now fail validation with clear error messages
- Amy's probing now catches "component exists but isn't wired" integration bugs

---

## [1.7.0] - 2026-01-16

### Changed

- **`board-move.js`** - Now returns `finalReviewReady: true` when all items reach done
  - Automatically logs "All items complete - Final Mission Review ready" to activity log
  - Hannibal watches for this flag to trigger Final Mission Review
- **`hannibal.md`** - Updated to check `finalReviewReady` flag after each move to done

---

## [1.6.0] - 2026-01-16

### Added

- **`activity-log.js`** - New script for worker agents to log progress to Live Feed
  - Used by Murdock, B.A., and Lynch to report their activity
  - Enables real-time visibility into all agent work

### Changed

- **`murdock.md`** - Added logging progress section
- **`ba.md`** - Added logging progress section
- **`lynch.md`** - Added logging progress section

---

## [1.5.0] - 2026-01-16

### Added

- **`deps-check.js`** - New script to validate dependency graph after Face creates work items
  - Detects circular dependencies using DFS
  - Validates all referenced dependencies exist
  - Calculates dependency depth per item
  - Reports parallel waves needed and ready items

### Changed

- **`face.md`** - Updated to use CLI scripts instead of Write tool
  - Face now uses `item-create.js` for work items (enables activity logging)
  - Added validation step using `deps-check.js`

---

## [1.4.0] - 2026-01-16

### Changed

- **Restructured plugin layout** - Moved `scripts/` and `lib/` from `.claude/` to the plugin root for better compatibility with symlinked installations
  - Scripts now at `scripts/` (was `.claude/scripts/`)
  - Libraries now at `lib/` (was `.claude/lib/`)
  - `package.json` now at root (was `.claude/package.json`)
- Updated all documentation to reflect new paths

### Migration

If upgrading from 1.3.x:
```bash
# In target project, recreate symlink
rm -rf .claude/ai-team
ln -s /path/to/ai-team .claude/ai-team

# Reinstall dependencies in plugin directory
cd .claude/ai-team && npm install
```

---

## [1.3.0] - 2026-01-16

### Added

- **Final Mission Review** - Lynch now performs a holistic review of ALL code produced during the mission before declaring completion. This catches cross-cutting issues that per-feature reviews miss:
  - Readability & consistency across files
  - Race conditions & async issues
  - Security vulnerabilities
  - Code quality & DRY violations
  - Integration issues between modules

### Changed

- Updated `agents/lynch.md` with comprehensive Final Mission Review checklist
- Updated `agents/hannibal.md` orchestration loop to trigger final review when all items reach done
- Updated `commands/run.md` to document the final review step

---

## [1.2.0] - 2026-01-16

### Added

- **`mission-init.js`** - New script to initialize fresh missions, automatically archiving any existing mission first. Run at the start of `/ateam plan` to ensure clean state.

### Changed

- **`mission-archive.js`** - Now archives `activity.log` (Live Feed data) and `board.json` when using `--complete` flag
- **`plan.md`** - Updated to run `mission-init.js` at the start, ensuring previous missions are archived before creating new ones
- **`hannibal.md`** - Updated to use CLI scripts for all board operations instead of manual file manipulation

### Fixed

- Kanban UI now properly reflects work in progress (items moved to stages before agent dispatch)
- Live Feed data persisted in archives for historical reference

---

## [1.1.0] - 2026-01-16

### Added

- **CLI Scripts for Board Management** - 9 Node.js scripts that provide atomic, lockable operations for board state management. Agents now use these scripts instead of directly manipulating files.

  - `board-read.js` - Read board state as JSON with optional filters (`--column`, `--item`, `--agents`)
  - `board-move.js` - Move items between stages with transition validation and WIP limit enforcement
  - `board-claim.js` - Assign an agent to a work item
  - `board-release.js` - Release an agent's claim on an item
  - `item-create.js` - Create new work items with YAML frontmatter
  - `item-update.js` - Update existing work item metadata or content
  - `item-reject.js` - Record rejections with automatic escalation after 2 rejections
  - `item-render.js` - Render work items as clean markdown
  - `mission-archive.js` - Archive completed items and generate mission summaries

- **Shared Libraries** - Reusable modules for common operations:
  - `lib/board.js` - Core board operations (read/write board, parse items, validate transitions)
  - `lib/lock.js` - File locking utilities using `proper-lockfile`
  - `lib/validate.js` - Input validation and stdin/stdout helpers

- **File Locking** - All write operations now acquire an exclusive lock on `mission/.lock` to prevent race conditions between concurrent agents

- **Activity Logging** - All script operations append to `mission/activity.log` with timestamps and agent attribution

- **Transition Validation** - Scripts enforce valid stage transitions:
  - `briefings` → `ready`
  - `ready` → `testing`, `blocked`
  - `testing` → `implementing`, `blocked`
  - `implementing` → `review`, `blocked`
  - `review` → `probing`, `ready` (on rejection)
  - `probing` → `done`, `ready` (on bugs found)
  - `blocked` → `ready` (after unblock)

- **WIP Limit Enforcement** - `board-move.js` checks WIP limits before allowing moves to `testing`, `implementing`, `review`, or `probing` stages

- **Rejection Escalation** - Items rejected twice are automatically moved to `blocked/` stage

### Changed

- Updated README with CLI scripts documentation and usage examples
- Plugin structure now includes `.claude/scripts/` and `.claude/lib/` directories

### Technical Details

- Uses ESM modules (`"type": "module"` in package.json)
- Dependencies: `gray-matter` (YAML frontmatter), `proper-lockfile` (file locking)
- Dev dependencies: `vitest` (testing)
- Requires Node.js >= 18.0.0

## [1.0.0] - 2026-01-15

### Added

- Initial release of A(i)-Team plugin
- Agent definitions: Hannibal, Face, Murdock, B.A., Lynch
- Slash commands: `/ateam plan`, `/ateam run`, `/ateam status`, `/ateam resume`, `/ateam unblock`
- TDD workflow skill
- Pipeline-based execution with parallel agent orchestration
- Work item format with YAML frontmatter
- Mission directory structure with stage-based folders
