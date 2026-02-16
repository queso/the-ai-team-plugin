# MCP Server

Bridge between Claude Code agents and the A(i)-Team API. Exposes 21 MCP tools that translate tool calls into HTTP requests against the kanban-viewer backend (plus `plugin_root` for path resolution). Does NOT implement business logic — that lives in the API.

## Entry Points

- `src/index.ts` - Stdio transport (Claude Code connects here)
- `src/server.ts` - McpServer factory, calls `registerAllTools()`
- `src/tools/index.ts` - Aggregates and registers all 21 tools

## Architecture

```
index.ts → server.ts → tools/index.ts → 5 tool modules
                                              ↓
                                         client/index.ts → HTTP → API
```

**Tool modules** (in `src/tools/`):

| Module | Tools | What it does |
|--------|-------|-------------|
| `board.ts` | 4 | Board state, stage transitions (validates via `TRANSITION_MATRIX`) |
| `items.ts` | 6 | Work item CRUD (validates `WI-XXX` dependency format) |
| `agents.ts` | 2 | Agent lifecycle (`agent_start`/`agent_stop`) |
| `missions.ts` | 5 | Mission init, checks, archive |
| `utils.ts` | 4 | Plugin root path, dependency graph, activity logging |

**Supporting layers:**

| Path | What it does |
|------|-------------|
| `src/config.ts` | Parses env vars (`ATEAM_PROJECT_ID`, `ATEAM_API_URL`, etc.) |
| `src/client/` | HTTP client with retry logic, exponential backoff, project ID header |
| `src/lib/errors.ts` | Error boundary wrapper, HTTP status → MCP error code mapping |
| `src/lib/schema-utils.ts` | Zod → JSON Schema conversion for MCP protocol |
| `src/lib/agents.ts` | Agent name normalization (re-exports from `@ai-team/shared`) |

## Contracts & Invariants

- **Every HTTP request includes `X-Project-ID` header** — injected by client, enables multi-project isolation.
- **Retries only 5xx and network errors** — never retries 4xx. Exponential backoff: 1s, 2s, 4s...
- **Agent names are case-insensitive** — `normalizeAgentName("B.A.")` → `"ba"`, then `AGENT_DISPLAY_NAMES` maps back to `"B.A."`.
- **Dependency IDs must match `WI-XXX`** — Zod schema rejects bare numbers like `"001"`.

## Patterns

**Adding a new tool:**
1. Add Zod input schema + handler in the appropriate `src/tools/*.ts` module
2. Export tool definition with `name`, `description`, `inputSchema` (JSON Schema), `zodSchema` (Zod), `handler`
3. If new module, add to `getAllTools()` array in `src/tools/index.ts`

**Tool response format (all tools must return):**
```typescript
// Success:
{ content: [{ type: 'text', text: JSON.stringify(data) }] }
// Error:
{ isError: true, code: 'ERROR_CODE', message: 'Human-readable' }
```

**Wrap API-calling handlers** with `withErrorBoundary()` from `src/lib/errors.ts`.

## Pitfalls

- **Two schema formats per tool** — `inputSchema` (JSON Schema for MCP docs) and `zodSchema` (for `McpServer.tool()`). Both required. Registration extracts `.shape` from Zod.
- **`.js` extensions in imports** — `moduleResolution: "NodeNext"` requires it. Write `import { config } from '../config.js'` even though source is `.ts`.
- **`board.ts` exports object, others export array** — historical inconsistency. `tools/index.ts` normalizes via `normalizeBoardTools()`. New modules should export arrays.
- **Build `@ai-team/shared` first** — workspace dependency. Run `cd packages/shared && bun run build` before type-checking this package.
- **Use `bun run test` not `bun test`** — tests use vitest, not bun's native runner.
