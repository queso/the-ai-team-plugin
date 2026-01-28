# Changelog

All notable changes to the A(i)-Team plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-01-28

### Added

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
