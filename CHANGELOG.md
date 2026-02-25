# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — PRD-007: Native Teams Hook Enforcement

Plugin-level enforcement hooks so agent boundaries work in native teams mode
(`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`). Previously, enforcement hooks only
fired for legacy subagent sessions (via frontmatter). Now all enforcement hooks
are dual-registered in `hooks/hooks.json` with `resolveAgent()` guards.

#### New Files
- `scripts/hooks/lib/resolve-agent.js` — shared agent identity utility (`resolveAgent`, `isKnownAgent`, `KNOWN_AGENTS`)
- `scripts/hooks/lib/send-denied-event.js` — fire-and-forget denied event recording via A(i)-Team API
- `scripts/hooks/block-lynch-writes.js` — new Lynch write enforcement hook (coverage gap fix)
- `scripts/hooks/__tests__/resolve-agent.test.ts` — 15 tests
- `scripts/hooks/__tests__/send-denied-event.test.ts` — 9 tests
- `scripts/hooks/__tests__/pretooluse-guards.test.ts` — ~115 tests
- `scripts/hooks/__tests__/stop-guards.test.ts` — 31 tests
- `scripts/hooks/__tests__/block-lynch-writes.test.ts` — 20 tests
- `scripts/hooks/__tests__/orchestrator-boundary.test.ts` — 28 tests

#### Changed
- `hooks/hooks.json` — 13 new PreToolUse + Stop enforcement entries registered at plugin level
- All 13 PreToolUse enforcement hooks — added `resolveAgent()` guard + `sendDeniedEvent()` telemetry
- All 5 Stop enforcement hooks — added `resolveAgent()` guard
- `scripts/hooks/enforce-orchestrator-boundary.js` — expanded from blocklist to allowlist approach with `resolveAgent()`
- `CLAUDE.md` — new sections on dual registration pattern, agent identity resolution, and denied event telemetry; fixed stale `hooks/` directory comment
- `agents/AGENTS.md` — new sections on dual registration pattern and shared utilities
