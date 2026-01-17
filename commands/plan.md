# /ateam plan

Initialize a mission from a PRD file with two-pass refinement.

## Usage

```
/ateam plan <prd-file> [--skip-refinement]
```

## Arguments

- `prd-file` (required): Path to the PRD markdown file
- `--skip-refinement` (optional): Skip Sosa's review for simple PRDs

## Flow

```
/ateam plan ./prd.md
         │
         ▼
┌─────────────────────────────────────┐
│ 1. mission-init.js                  │
│    Initialize fresh mission         │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 2. Face (opus) - FIRST PASS         │
│    • Decompose PRD into items       │
│    • Create items in briefings/     │
│    • Do NOT move to ready/          │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 3. deps-check.js                    │
│    Validate dependency graph        │
└─────────────────────────────────────┘
         │
         ▼ (skip if --skip-refinement)
┌─────────────────────────────────────┐
│ 4. Sosa (opus, requirements-critic) │
│    • Review all items in briefings/ │
│    • Identify issues & ambiguities  │
│    • Ask human questions            │
│    • Output refinement report       │
└─────────────────────────────────────┘
         │
         ▼ (skip if --skip-refinement)
┌─────────────────────────────────────┐
│ 5. Face (opus) - SECOND PASS        │
│    • Apply Sosa's recommendations   │
│    • Update items in-place          │
│    • Move Wave 0 items to ready/    │
│    • Dependent items stay briefings/│
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 6. Report Summary                   │
│    Display results to user          │
└─────────────────────────────────────┘
```

## Behavior

### 1. Validate PRD file exists

```
if not exists(prd-file):
    error "PRD file not found: {prd-file}"
    exit
```

### 2. Initialize mission (archive existing if any)

```bash
# Extract project name from PRD (first H1 header or filename)
echo '{"name": "<project-name-from-prd>"}' | node .claude/ai-team/scripts/mission-init.js --force
```

The init script:
- Archives all existing work items to `mission/archive/<old-mission-name>/`
- Archives the activity.log (clears Live Feed)
- Creates fresh stage directories
- Initializes empty board.json
- Logs mission start to activity.log

### 3. Invoke Face - First Pass

```
Task(
  subagent_type: "clean-code-architect",
  model: "opus",
  prompt: "You are Face from the A(i)-Team. [full face.md prompt]

  **THIS IS THE FIRST PASS.** Create work items in briefings/ only.
  Do NOT move items to ready/ - that happens in the second pass.

  Here is the PRD to decompose:

  {prd_content}

  Create work items in mission/briefings/ using the item-create.js script.
  When done, run deps-check.js and report summary."
)
```

### 4. Validate dependencies

```bash
node .claude/ai-team/scripts/deps-check.js
```

Check for:
- Circular dependencies
- Missing references
- Orphaned items

If validation fails, report errors and stop.

### 5. Invoke Sosa (skip with --skip-refinement)

```
Task(
  subagent_type: "requirements-critic",
  model: "opus",
  prompt: "You are Sosa from the A(i)-Team. [full sosa.md prompt]

  Review all work items in mission/briefings/.

  Use AskUserQuestion to clarify any ambiguities with the human.

  Output a refinement report with:
  - Critical issues (must fix)
  - Warnings (should fix)
  - Human answers received
  - Specific update instructions for Face

  Here is the original PRD for context:

  {prd_content}"
)
```

Sosa will:
- Read all items in `briefings/`
- Identify issues and ambiguities
- Use `AskUserQuestion` to get human clarification
- Produce a detailed refinement report

### 6. Invoke Face - Second Pass (skip with --skip-refinement)

```
Task(
  subagent_type: "clean-code-architect",
  model: "opus",
  prompt: "You are Face from the A(i)-Team. [full face.md prompt]

  **THIS IS THE SECOND PASS.** Apply Sosa's refinements.

  Here is Sosa's refinement report:

  {sosa_report}

  For each item needing changes:
  1. Use item-update.js to modify the item
  2. Apply the specific recommendations

  After all updates:
  1. Run deps-check.js to get the readyItems list
  2. Move items with NO dependencies to ready/ using board-move.js
  3. Leave items WITH dependencies in briefings/

  Report what was updated and moved."
)
```

### 7. Report summary

```
Mission planning complete.

{n} objectives identified:
- {x} in ready/ (Wave 0 - no dependencies)
- {y} in briefings/ (waiting on dependencies)

Dependency depth: {max_depth}
Parallel waves: {waves}

Refinement applied:
- {critical} critical issues resolved
- {warnings} warnings addressed
- {questions} questions answered

Ready for /ateam run
```

## Example

```
/ateam plan ./docs/shipping-feature-prd.md
```

With skip refinement:
```
/ateam plan ./docs/simple-fix-prd.md --skip-refinement
```

## Output

- `mission/` directory with full structure
- Work item files in `mission/briefings/` and `mission/ready/`
- Initialized `mission/board.json`
- Fresh `mission/activity.log`
- Previous mission archived (if any)
- Summary of decomposition and refinement

## Errors

- **PRD not found**: File path invalid
- **Circular dependency detected**: Decomposition has cycles
- **Invalid work item**: Missing required fields
- **Refinement blocked**: Critical issues Sosa can't resolve

## CLI Scripts Used

| Script | Purpose |
|--------|---------|
| `mission-init.js` | Archive existing mission, create fresh state |
| `item-create.js` | Create work items (Face first pass) |
| `item-update.js` | Update work items (Face second pass) |
| `board-move.js` | Move items between stages (Face second pass) |
| `deps-check.js` | Validate dependency graph |

## Agent Invocations

| Agent | Pass | Subagent Type | Model | Purpose |
|-------|------|---------------|-------|---------|
| Face | First | clean-code-architect | opus | Decompose PRD into items |
| Sosa | - | requirements-critic | opus | Review and challenge items |
| Face | Second | clean-code-architect | opus | Refine and move to ready/ |
