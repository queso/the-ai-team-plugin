# /perspective-test

Test a feature from a real user's perspective by combining static code analysis with browser-based verification.

## Usage

```
/perspective-test <feature-description>
/perspective-test <file-path>
/perspective-test <url-path>
```

## Examples

```
/perspective-test "the login form"
/perspective-test "project name display in header"
/perspective-test src/components/UserProfile.tsx
/perspective-test /dashboard
```

## Purpose

Unit tests pass but something feels off? This command verifies features work from a real user's perspective, catching integration issues that unit tests miss because they mock away the wiring.

## Behavior

### 1. Parse Input

Determine what to test:
- Feature description → search for related components/files
- File path → start analysis from that file
- URL path → navigate directly and work backwards

### 2. Understand the Feature

```
Read the implementation to understand:
- What should the user see/experience?
- What's the entry point (URL, button, action)?
- What data should be displayed?
```

### 3. Trace the Wiring (Static Analysis)

Starting from the UI, trace the data flow:

```
UI renders X → X comes from prop Y → Y comes from hook Z → Z calls service W
```

Verify each link:
- Is W defined and exported?
- Does Z import and call W?
- Does the component call Z?
- Does the parent pass the result as Y?
- Does the UI actually render X?

Use Grep/Read to verify each connection exists.

### 4. Browser Verification (Playwright)

**Check dev server:**
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

If not running, prompt user to start it.

**Test the feature:**
```
browser_navigate → target URL
browser_snapshot → understand page structure
browser_click/type → interact if needed
browser_console_messages → check for JS errors
browser_take_screenshot → capture evidence
```

### 5. Compare and Report

| Check | Unit Tests | User Perspective |
|-------|-----------|------------------|
| Component renders | ✅ (mocked) | ❓ (actual) |
| Data displays | ✅ (mocked) | ❓ (actual) |
| Button works | ✅ (mocked) | ❓ (actual) |

### 6. Output Report

```markdown
## User Perspective Test: [feature name]

### Feature Understanding
- Expected behavior: [what user should see]
- Entry point: [URL or action]

### Wiring Trace
- [✓/✗] Definition: `functionName` in `file.ts:42`
- [✓/✗] Import: found in `consumer.ts:3`
- [✓/✗] Usage: called at `consumer.ts:28`
- [✓/✗] UI binding: rendered in `Component.tsx:55`

**Gap found:** [description if any]

### Browser Verification
- URL: http://localhost:3000/path
- Expected: [what should appear]
- Actual: [what actually appeared]
- Console errors: [none / list]

### Evidence
[Screenshot or snapshot excerpt]

### Verdict
**PASS** - Feature works from user perspective
or
**FAIL** - [issue] at [file:line]
  - Root cause: [explanation]
  - Fix: [suggestion]
```

## Implementation

This command uses the `general-purpose` subagent with the perspective-test skill:

```
subagent_type: general-purpose
model: sonnet
```

The agent has access to:
- Read/Grep/Glob for static analysis
- Playwright MCP tools for browser verification
- Bash for running commands

## Common Findings

### The Phantom Prop
Component expects a prop that parent never passes.

### The Orphan Import
Module imported but never used.

### The Dead Callback
Handler defined but never attached to any element.

### The Silent Fetch
Data fetched but never rendered.

## Requirements

- Dev server running (checks automatically)
- Playwright MCP plugin (for browser verification)

Without Playwright, falls back to static analysis only with a warning.

## Related

- `/ateam run` - Full A(i)-Team mission with Amy's probing phase
- `skills/perspective-test.md` - Detailed methodology reference
