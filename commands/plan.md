# /ateam plan

Initialize a mission from a PRD file.

## Usage

```
/ateam plan <prd-file>
```

## Arguments

- `prd-file` (required): Path to the PRD markdown file

## Behavior

1. **Validate PRD file exists**
   ```
   if not exists(prd-file):
       error "PRD file not found: {prd-file}"
       exit
   ```

2. **Initialize mission (archive existing if any)**
   ```bash
   # This archives any existing mission and creates fresh directories
   echo '{"name": "<project-name-from-prd>"}' | node .claude/ai-team/scripts/mission-init.js --force
   ```

   The init script:
   - Archives all existing work items to `mission/archive/<old-mission-name>/`
   - Archives the activity.log (clears Live Feed)
   - Creates fresh stage directories
   - Initializes empty board.json
   - Logs mission start to activity.log

3. **Invoke Face agent**
   - Pass the PRD content
   - Face decomposes into work items
   - Face populates board.json with items

4. **Validate decomposition**
   - Check for circular dependencies
   - Verify all items have required fields
   - Ensure outputs field is present on all items

5. **Report summary**
   ```
   Mission briefing complete.

   {n} objectives identified:
   - {x} interfaces
   - {y} test suites
   - {z} implementations
   - {w} integrations

   Estimated parallel waves: {waves}

   Ready to roll out.
   ```

## Example

```
/ateam plan ./docs/shipping-feature-prd.md
```

## Output

- `mission/` directory with full structure
- Work item files in `mission/briefings/`
- Initialized `mission/board.json`
- Fresh `mission/activity.log`
- Previous mission archived (if any)
- Summary of decomposition

## Errors

- **PRD not found**: File path invalid
- **Circular dependency detected**: Decomposition has cycles
- **Invalid work item**: Missing required fields

## Implementation Notes

This command should:

1. Read the PRD file using the Read tool
2. **Run mission-init.js to archive existing and create fresh state**
3. Launch a Task with the Face agent (model: opus)
4. Pass the full PRD content to Face
5. Face will create all work items and board.json
6. Validate the output
7. Display summary to user

### Step 1: Initialize Mission

```bash
# Extract project name from PRD (first H1 header or filename)
# Then initialize fresh mission state
echo '{"name": "Project Name"}' | node .claude/ai-team/scripts/mission-init.js --force
```

If there's an existing mission, it will be archived to `mission/archive/<mission-slug>-<timestamp>/` with:
- All work item files
- activity.log (Live Feed history)
- board.json (final state)
- _archive-info.md (summary)

### Step 2: Invoke Face

```
Task(
  subagent_type: "clean-code-architect",
  model: "opus",
  prompt: "You are Face from the A(i)-Team. [full face.md prompt]

  Here is the PRD to decompose:

  {prd_content}

  Create work items in mission/briefings/ using the item-create.js script:

  echo '{
    \"title\": \"Feature Name\",
    \"type\": \"feature\",
    \"objective\": \"...\",
    \"acceptance\": [\"criterion 1\", \"criterion 2\"],
    \"outputs\": {
      \"test\": \"src/__tests__/feature.test.ts\",
      \"impl\": \"src/services/feature.ts\"
    },
    \"dependencies\": [],
    \"parallel_group\": \"group-name\"
  }' | node .claude/ai-team/scripts/item-create.js

  CRITICAL: Each work item MUST have the outputs field with test and impl paths.
  Without the outputs field, Murdock and B.A. won't know where to create files."
)
```

## CLI Scripts Used

| Script | Purpose |
|--------|---------|
| `mission-init.js` | Archive existing mission, create fresh state |
| `item-create.js` | Create work items (used by Face) |
