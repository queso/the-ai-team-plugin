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

2. **Create mission directory structure**
   ```
   mission/
   ├── board.json
   ├── briefings/
   ├── ready/
   ├── in-progress/
   ├── review/
   └── done/
   ```

3. **Invoke Face agent**
   - Pass the PRD content
   - Face decomposes into work items
   - Face creates board.json

4. **Validate decomposition**
   - Check for circular dependencies
   - Verify all items have required fields
   - Ensure test items precede implementations

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
- Summary of decomposition

## Errors

- **PRD not found**: File path invalid
- **Circular dependency detected**: Decomposition has cycles
- **Invalid work item**: Missing required fields

## Implementation Notes

This command should:

1. Read the PRD file using the Read tool
2. Launch a Task with the Face agent (model: opus)
3. Pass the full PRD content to Face
4. Face will create all work items and board.json
5. Validate the output
6. Display summary to user

```
Task(
  subagent_type: "clean-code-architect",
  model: "opus",
  prompt: "You are Face from the A(i)-Team. [full face.md prompt]

  Here is the PRD to decompose:

  {prd_content}

  Create work items in mission/briefings/ and initialize mission/board.json."
)
```
