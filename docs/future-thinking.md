# Future Thinking: Cloud-Native AI Development Pipeline

This document captures brainstorming on evolving the A(i)-Team plugin into a fully automated, cloud-deployable development pipeline.

## Vision

Feed a PRD to a cloud instance → Get a PR with implemented, tested, reviewed code.

Human review happens **after** the PR is pushed, not during the AI workflow. The goal is to refine the AI pipeline to maximize quality before any human touches it.

---

## Architecture

### Portable, Self-Contained Setup

Every target repo gets the full toolkit as submodules:

```
target-repo/
├── .claude/
│   ├── ai-team/           # submodule - orchestration + agents
│   └── kanban-viewer/     # submodule - live progress UI
├── mission/               # created at runtime (gitignored)
├── docker-compose.yml     # starts viewer, exposes port
└── ...application code...
```

**Why submodules everywhere?**
- Disk space is cheap
- Self-contained = portable
- Version controlled together with the target repo
- Works identically local and cloud

### Cloud VM Deployment

```
┌─────────────────────────────────────────────────────────┐
│  Cloud VM                                               │
│                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │ Claude Code │───▶│  mission/   │◀───│   Kanban    │ │
│  │   (CLI)     │    │ board.json  │    │   Viewer    │ │
│  └─────────────┘    │ activity.log│    │  :3000      │ │
│        │            └─────────────┘    └─────────────┘ │
│        ▼                                     ▲         │
│  ┌─────────────┐                             │         │
│  │ Target Repo │                      External Access  │
│  │  + code     │                      (watch progress) │
│  └─────────────┘                                       │
└─────────────────────────────────────────────────────────┘
```

**Workflow:**
1. Spin up VM
2. Clone repo with `--recurse-submodules`
3. `docker-compose up -d` → kanban-viewer on port 3000
4. Run Claude Code with ai-team commands
5. Watch progress remotely at `http://vm-ip:3000`
6. On completion → PR created, VM cleaned up

---

## Two-Stage Execution

### Stage 1: Planning

```bash
claude "/ateam plan ./prd.md"
```

- Face (opus model) decomposes PRD into work items
- Creates dependency graph
- Populates `mission/ready/` with item files
- **Output:** Structured work breakdown

### Stage 2: Execution

```bash
claude "/ateam run --wip 3"
```

- Agents work in parallel (pipeline parallelism)
- TDD workflow: tests → implementation → review → probing
- Final mission review on completion
- **Output:** Implemented code, passing tests

### Stage 3: Delivery (Future)

```bash
# Automated PR creation
git checkout -b ai-team/mission-name
git add .
git commit -m "feat: implement <mission-name> via A(i)-Team"
git push origin HEAD
gh pr create --title "..." --body "..."
```

---

## Orchestration Layer (To Be Built)

Something needs to manage the end-to-end flow:

```
orchestrator/
├── api/                    # Receives PRD, triggers jobs
│   └── routes/
│       ├── submit-prd.js   # POST /jobs - start new job
│       ├── job-status.js   # GET /jobs/:id - check status
│       └── webhook.js      # Receive completion callbacks
├── workers/
│   ├── provisioner.js      # Spin up/down VMs
│   ├── executor.js         # Run Claude Code commands
│   └── finalizer.js        # Create PR, cleanup
├── Dockerfile.claude       # Claude Code + ai-team pre-installed
└── docker-compose.yml
```

### API Flow

```
POST /jobs
{
  "repo": "github.com/org/target-repo",
  "prd": "# My Feature\n\n## Requirements\n...",
  "branch": "main",
  "callback": "https://my-service/webhook"
}

→ Returns job_id, viewer_url
```

---

## Quality Funnel

The current pipeline has multiple quality gates:

```
PRD
 │
 ▼
┌─────────────────────────────────────────────────────────┐
│ Face (Decomposer)                                       │
│ - Breaks PRD into smallest completable units            │
│ - Defines dependency graph                              │
│ - CRITICAL: Bad breakdown = bad everything downstream   │
└─────────────────────────────────────────────────────────┘
 │
 ▼
┌─────────────────────────────────────────────────────────┐
│ Murdock (QA Engineer)                                   │
│ - Writes tests FIRST                                    │
│ - Tests define acceptance criteria                      │
│ - Happy path + negative path + edge cases               │
└─────────────────────────────────────────────────────────┘
 │
 ▼
┌─────────────────────────────────────────────────────────┐
│ B.A. (Implementer)                                      │
│ - Implements code to pass Murdock's tests               │
│ - Clean code principles                                 │
│ - No over-engineering                                   │
└─────────────────────────────────────────────────────────┘
 │
 ▼
┌─────────────────────────────────────────────────────────┐
│ Lynch (Reviewer) - Per Feature                          │
│ - Reviews tests + implementation together               │
│ - Can reject (max 2x before blocked)                    │
│ - Checks for correctness, security, quality             │
└─────────────────────────────────────────────────────────┘
 │
 ▼
┌─────────────────────────────────────────────────────────┐
│ Amy (Investigator)                                      │
│ - Probes for bugs BEYOND test coverage                  │
│ - Edge cases tests might have missed                    │
│ - Reports findings with proof                           │
└─────────────────────────────────────────────────────────┘
 │
 ▼
┌─────────────────────────────────────────────────────────┐
│ Lynch (Final Mission Review)                            │
│ - Cross-cutting concerns across ALL features            │
│ - Consistency, race conditions, security                │
│ - Can reject specific items back to ready               │
└─────────────────────────────────────────────────────────┘
 │
 ▼
PR Created ← Human review starts here
```

---

## SDLC Parallel: This is Scrum with AI Agents

The A(i)-Team maps almost directly to traditional Scrum/Kanban:

| Scrum Concept | A(i)-Team Equivalent | Notes |
|---------------|---------------------|-------|
| Product Owner | PRD Author (human) | Defines what to build |
| Scrum Master | Hannibal | Orchestrates, removes blockers |
| Dev Team | Murdock, B.A., Amy | QA, Implementation, Bug Hunting |
| Sprint Planning | Face decomposition | Breaking work into items |
| **Backlog Refinement** | **Currently missing** | The gap we need to fill |
| Daily Standup | Kanban board / Live Feed | Visibility into progress |
| Code Review | Lynch (per-feature) | Quality gate |
| Sprint Review | Lynch Final Mission Review | Holistic review |
| Retrospective | Learning loop (future) | Improve over time |

The missing piece is **Backlog Refinement** - the iterative Q&A process that happens before work begins.

---

## Backlog Refinement: Two-Pass Decomposition

Face's decomposition is currently single-pass. In real teams, backlog refinement is conversational - the team asks questions, clarifies edge cases, and refines stories before committing to them.

### Option A: Face → Human Q&A → Face Refines

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Face Draft     │────▶│  Human Review   │────▶│  Face Refines   │
│  (First Pass)   │     │  Q&A Session    │     │  (Second Pass)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Flow:**
1. Face reads PRD, produces initial work item breakdown
2. Human reviews items, asks clarifying questions:
   - "What happens if X fails?"
   - "Should this handle Y edge case?"
   - "Is item 3 too big? Can we split it?"
3. Face incorporates answers, refines breakdown
4. Proceed to execution

**Pros:** Human expertise shapes the work before it starts
**Cons:** Requires human in the loop before execution

### Option B: Face → AI Critic → Human Review → Face Refines

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Face Draft     │────▶│  Critic Agent   │────▶│  Human Review   │────▶│  Face Refines   │
│  (First Pass)   │     │  Pokes Holes    │     │  Both Outputs   │     │  (Second Pass)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

**New Agent: "Sosa" (The Critic)**
- Reviews Face's breakdown
- Asks adversarial questions
- Identifies ambiguities, missing edge cases, sizing issues
- Produces a "refinement report"

**Flow:**
1. Face produces initial breakdown
2. Sosa reviews and generates questions/concerns
3. Human sees both: breakdown + critique
4. Human answers questions, confirms or adjusts
5. Face refines based on feedback
6. Proceed to execution

**Pros:** AI does heavy lifting on critique, human time is focused
**Cons:** More complex, another agent to maintain

### Option C: Face Asks First (Front-Loaded Q&A)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Face Reads PRD │────▶│  Face Asks      │────▶│  Face Decomposes│
│  Identifies Gaps│     │  Human Answers  │     │  (Informed)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Flow:**
1. Face reads PRD, identifies ambiguities and missing info
2. Face generates targeted questions:
   - "The PRD mentions 'user authentication' but doesn't specify OAuth vs email/password. Which approach?"
   - "Should the export feature support CSV only, or also JSON/XML?"
   - "What's the expected behavior when the API rate limit is hit?"
3. Human answers questions
4. Face decomposes with full context
5. Proceed to execution

**Pros:** Mimics what a good BA/architect does - asks before building
**Cons:** Requires upfront human time (but probably saves time overall)

### Recommendation: Option B (AI-Assisted Refinement)

Option B provides the best balance:
- AI does the heavy lifting on both decomposition AND critique
- Human time is focused on high-value decisions, not discovery
- Mirrors real team dynamics: architect proposes, team critiques, PO decides

---

## Sosa: The Critic Agent

**Character:** General Russell Morrison "Sosa" - In the A-Team universe, the antagonist who relentlessly pursues and challenges the team. Perfect for a critic role.

**Subagent Type:** `code-review-expert` or new `requirements-critic` type

**Purpose:** Review Face's decomposition and surface problems BEFORE work begins.

### What Sosa Looks For

**Ambiguity & Missing Details:**
- Vague acceptance criteria
- Undefined error handling
- Missing edge cases
- Unclear integration points

**Sizing Issues:**
- Items too large (should be split)
- Items too small (should be combined)
- Items with hidden complexity

**Dependency Problems:**
- Missing dependencies
- Circular dependencies
- Incorrect ordering
- Tight coupling that could be avoided

**Architectural Concerns:**
- Inconsistent patterns across items
- Missing shared components that multiple items need
- Security/performance implications not addressed

**Testability:**
- Items that will be hard to test
- Missing test infrastructure items
- Unclear what "done" means

### Sosa's Output: Refinement Report

```markdown
# Refinement Report for: <mission-name>

## Critical Issues (Must Address)
- [ ] Item 003 "User Authentication" doesn't specify session management approach
- [ ] Item 007 depends on Item 004, but Item 004 doesn't create the interface it needs

## Warnings (Should Address)
- [ ] Item 012 "Export System" is large - consider splitting into format-specific items
- [ ] Items 005-008 all need database access but no item creates the DB connection utility

## Questions for Product Owner
1. Item 003: OAuth, email/password, or both?
2. Item 015: What's the expected behavior when rate limited?
3. General: Is offline support required for any features?

## Suggestions
- Add Item 000: "Project scaffolding and shared utilities"
- Reorder: Item 006 should come before Item 005
- Consider parallel_group for Items 009-011 (independent features)
```

### Refinement Flow (Detailed)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Stage 0: Refinement                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐       │
│  │   PRD    │─────▶│   Face   │─────▶│   Sosa   │─────▶│  Human   │       │
│  │  (input) │      │ (draft)  │      │(critique)│      │ (decide) │       │
│  └──────────┘      └──────────┘      └──────────┘      └──────────┘       │
│                          │                                    │            │
│                          │                                    ▼            │
│                          │           ┌──────────────────────────────┐      │
│                          │           │ Human reviews:               │      │
│                          │           │ - Face's breakdown           │      │
│                          │           │ - Sosa's critique            │      │
│                          │           │ - Answers questions          │      │
│                          │           │ - Approves/requests changes  │      │
│                          │           └──────────────────────────────┘      │
│                          │                                    │            │
│                          ▼                                    ▼            │
│                    ┌──────────┐                         ┌──────────┐       │
│                    │   Face   │◀────────────────────────│ Feedback │       │
│                    │ (refine) │                         │          │       │
│                    └──────────┘                         └──────────┘       │
│                          │                                                 │
│                          ▼                                                 │
│                    ┌──────────┐                                            │
│                    │ Approved │                                            │
│                    │ Backlog  │                                            │
│                    └──────────┘                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
                    Stage 1: Execution (/ateam run)
```

### Command Flow

```bash
# New unified command with refinement built-in
claude "/ateam plan ./prd.md"

# Flow:
# 1. Face reads PRD, produces draft breakdown
# 2. Sosa reviews breakdown, produces critique
# 3. Human presented with both:
#    - "Here's the proposed breakdown (15 items)"
#    - "Here are Sosa's concerns (3 critical, 5 warnings, 4 questions)"
# 4. Human answers questions, approves or requests changes
# 5. If changes requested, Face refines and Sosa re-reviews
# 6. Loop until approved
# 7. Items written to mission/ready/

# Then execute as normal
claude "/ateam run --wip 3"
```

### Refinement Artifacts

Stored in `mission/` for traceability:

```
mission/
├── refinement/
│   ├── prd-original.md           # Original PRD (copied)
│   ├── face-draft-v1.json        # First breakdown attempt
│   ├── sosa-critique-v1.md       # Sosa's review
│   ├── human-feedback-v1.md      # Human's answers/decisions
│   ├── face-draft-v2.json        # Refined breakdown (if needed)
│   ├── sosa-critique-v2.md       # Re-review (if needed)
│   └── approved-breakdown.json   # Final approved version
├── ready/                        # Work items created from approved breakdown
├── ...
```

### Skip Refinement Option

For simple PRDs or when you trust the breakdown:

```bash
claude "/ateam plan ./prd.md --skip-refinement"
# → Face decomposes directly, no Sosa review, no human Q&A
# → Use for small/simple projects or when iterating quickly
```

---

## Pressure Points & Risks

### Face's Decomposition is Load-Bearing

If work items are:
- Too big → harder to implement, review, test
- Too vague → agents guess wrong
- Bad dependencies → items block unnecessarily
- Missing `outputs:` field → agents don't know where to write

**Mitigation ideas:**
- Stricter Face prompt with examples
- Validation step after decomposition
- Item size heuristics / warnings

### The 2-Rejection Limit

Currently: blocked items expect `/ateam unblock` with human guidance.

**In fully automated mode, options:**
1. PR includes blocked items flagged as "needs human attention"
2. AI attempts fundamentally different approach on 3rd try (risky)
3. Blocked items become separate GitHub issues
4. Accept partial success - PR what worked, note what didn't

**Recommendation:** Option 1 or 3. Don't hide failures.

### Amy's Findings Need a Destination

Amy finds bugs that tests didn't catch. Currently just reported.

**Ideas:**
- Findings go into PR description as "Known Issues / Areas to Review"
- Severe findings block the PR entirely
- Findings become test cases for regression

### Test Quality Variance

Murdock might write:
- Tests that are too trivial (just happy path)
- Tests that are too coupled to implementation
- Tests that miss obvious edge cases

**Ideas:**
- Amy could review test quality, not just probe implementation
- Mutation testing to verify test effectiveness
- Test coverage thresholds (but not chasing 100%)

---

## Future Enhancements

### Smarter Decomposition
- Face learns from past missions (what item sizes worked well)
- Automatic dependency inference from code analysis
- Template items for common patterns (CRUD, auth, etc.)

### Adversarial Testing
- Murdock writes property-based tests where applicable
- Fuzzing stage for input handling code
- Security-focused test generation

### Learning Loop
- Track which items get blocked most often
- Track which agent rejections are most common
- Feed back into prompt improvements

### Multi-Repo Coordination
- Orchestrator manages multiple missions
- Shared component detection across repos
- Consistent patterns enforcement

### Human-AI Handoff
- PR includes rich context: why decisions were made
- Blocked items have full rejection history
- Amy's findings linked to specific code locations

---

## Docker Setup

### docker-compose.yml (in target repo root)

```yaml
version: '3.8'

services:
  kanban:
    build: .claude/kanban-viewer
    volumes:
      - ./mission:/app/mission:ro
    ports:
      - "3000:3000"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Dockerfile.claude (for orchestrator)

```dockerfile
FROM ubuntu:22.04

# Install Node.js, Git, Claude Code CLI
RUN apt-get update && apt-get install -y \
    nodejs \
    npm \
    git \
    curl

# Install Claude Code CLI (placeholder - actual install method TBD)
RUN npm install -g @anthropic/claude-code

# Pre-configure for non-interactive use
ENV CLAUDE_NONINTERACTIVE=1

WORKDIR /workspace

ENTRYPOINT ["claude"]
```

---

## Open Questions

1. **Claude Code execution method**: CLI in VM? API wrapper? Headless mode?

2. **Authentication**: How does Claude Code auth work in automated/cloud context?

3. **Cost management**: Opus for Face, Sonnet for others - is this optimal?

4. **Timeout handling**: What if a mission takes too long? Checkpoint and resume?

5. **Partial success**: How to handle missions where some items succeed, others block?

6. **Viewer auth**: Kanban viewer exposed publicly? Need auth layer?

7. **Secrets management**: Target repo may need API keys, env vars for tests

---

## Next Steps

1. [ ] Build out kanban-viewer as standalone repo with Docker support
2. [ ] Test submodule setup on a real target repo
3. [ ] Prototype orchestration layer (even just shell scripts)
4. [ ] Document Claude Code headless/automated execution options
5. [ ] Run end-to-end test: PRD → PR on a simple feature
