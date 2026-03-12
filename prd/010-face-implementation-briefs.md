# PRD-010: Face Implementation Briefs

**Version:** 1.0.0
**Status:** Draft
**Author:** Josh / Claude
**Date:** 2026-03-12

---

## Problem Statement

When a mission PR is opened, the reviewer has the PRD (why and what at feature level) and the diff (what was actually built). There is nothing in between — no declared intent that captures what the agents specifically planned to change, what they explicitly stayed out of, and what they assumed about the codebase.

Without that layer, reviewers must reverse-engineer scope from the code. A file the agent touched unexpectedly is indistinguishable from a file it deliberately changed. A wrong codebase assumption that produces correct-looking code is invisible in the diff.

---

## Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| Give reviewers declared intent before they read the diff | Brief present in every mission PR | 100% of missions |
| Make planned scope and explicit exclusions visible | Reviewer can understand full planned scope in <2 min | Qualitative, assessed in retro |
| Create a checkable artifact: PRD + brief + tests + code | Reviewer can cross-check all four without asking the agent | Qualitative |

---

## User Stories

**As a** code reviewer, **I want** a single document that tells me what this mission planned to build, **so that** I can evaluate the diff against declared intent rather than reconstructing intent from the code.

**As a** code reviewer, **I want** to see explicit scope exclusions the agents declared, **so that** I can immediately flag unexpected file changes.

**As** Hannibal, **I want** a brief committed to the repo before coding starts, **so that** there's a verifiable record of what the mission set out to build.

---

## Scope

### In Scope

- Face produces one `brief.md` per mission during the planning phase, after Sosa refinement and before items move to `ready`
- Brief stored in the target project repo at `briefings/brief.md`
- Standard schema: Mission Summary, Work Items, Will Do, Won't Do, Assumptions, Acceptance Criteria
- Brief committed to the mission branch, visible in the PR alongside code and tests
- Tawnia includes a link to `briefings/brief.md` in the PR description
- Lynch-Final performs an informal brief-vs-diff check as part of the Final Mission Review

### Out of Scope

- Per-work-item briefs — the brief is mission-scoped, not item-scoped
- Automated conformance checking (diff vs. brief) — future work
- Brief approval gate — no separate approval step; Sosa reviews the brief as part of its normal decomposition review
- Updating the brief mid-mission — if scope changes during implementation, agents log the delta in their `agentStop` summary; the brief captures original declared intent
- Briefs for human-authored PRs

---

## Requirements

### Functional Requirements

1. After Sosa's refinement pass is complete and before Face moves items to `ready`, Face shall produce a single `briefings/brief.md` in the target project directory.

2. If the `briefings/` directory does not exist, Face shall create it.

3. The brief shall follow this schema:

   ```markdown
   # Mission Brief: [Mission Name]

   **PRD:** [path to PRD file]
   **Date:** [date]

   ## Summary
   [2-4 sentences describing what this mission builds, at a level the diff reviewer can use to orient themselves]

   ## Work Items
   | ID | Title | Type |
   |----|-------|------|
   | WI-001 | ... | feature |
   | WI-002 | ... | task |

   ## Will Do
   - [Specific file, function, endpoint, or test to be created or modified]
   - [...]

   ## Won't Do
   - [Adjacent code or system this mission explicitly will not touch, and why]
   - [...]

   ## Assumptions
   - [Statement about existing codebase behavior the implementation depends on]
   - [...]

   ## Acceptance Criteria
   - [ ] [Checkable condition derived from the PRD, maps to at least one test]
   - [ ] [...]
   ```

4. The `Will Do` section shall name specific files, functions, or endpoints. "Add `POST /api/widgets` handler in `src/handlers/widgets.ts`" is acceptable; "Add widget endpoint" is not.

5. The `Won't Do` section shall list adjacent modules or files the mission explicitly will not modify. If nothing adjacent needs excluding, the section shall say "No explicit exclusions for this mission."

6. The `Assumptions` section shall capture any codebase behavior the mission depends on that is not directly verifiable from the files being created (e.g., error types thrown by upstream services, middleware guarantees, schema constraints already in place).

7. The `Acceptance Criteria` section shall be the mission-level definition of done, derived from the PRD — one checkable condition per meaningful outcome.

8. Sosa's review pass shall include the brief draft. Sosa may flag vague Will-Do items, missing exclusions, or unverifiable assumptions as part of its normal refinement feedback to Face.

9. Tawnia shall include a link to `briefings/brief.md` in the PR description it creates, so reviewers know the brief exists before reading the diff.

10. Lynch-Final's holistic review shall include an informal brief-vs-diff check: does the diff match the Will Do list, does anything in the diff contradict the Won't Do list, and are the Acceptance Criteria reflected in the tests? Lynch-Final shall call out any meaningful discrepancies in its review report.

### Non-Functional Requirements

1. The brief shall be written as a single atomic operation after all work items are finalized — not incrementally as items are created.

2. Brief section headers shall match the schema exactly to support future automated parsing.

### Edge Cases & Error States

- **Brief-to-code drift.** When an agent discovers during implementation that a brief assumption is false or scope needs to expand, they note it in their `agentStop` summary. The brief is not updated — it preserves the original declared intent, and the delta is in the `work_log`. The reviewer can see both.

- **Mission with only `task`-type items.** Scaffolding missions still get a brief. Will-Do and Assumptions may be thin, but Won't Do and Acceptance Criteria are still valuable.

- **Re-run after `force: true` archive.** A new mission init replaces `briefings/brief.md`. The old brief is preserved in git history on the archived branch.

---

## Risks & Open Questions

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Face writes vague Will-Do items | Medium | Brief doesn't help reviewer | Sosa review includes brief; requirements mandate file/function specificity |
| Brief is ignored because reviewers don't know to look for it | Medium | No adoption | PR template or Tawnia PR description should reference the brief |
| Brief-to-code drift makes brief misleading | Low | Reviewer trusts stale intent | `agentStop` summaries capture deltas; brief is explicitly "declared intent at planning time" |

### Open Questions

None outstanding.
