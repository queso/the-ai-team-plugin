# User Perspective Test

Test features from a real user's perspective by combining static code analysis with browser-based verification.

## When to Use

- After implementing a feature: "Tests pass but does it actually work?"
- Debugging integration issues: "The component exists but nothing renders"
- Pre-merge validation: "Verify this actually works end-to-end"
- When unit tests pass but something feels off

## The Problem This Solves

Unit tests often pass while features are broken because:
- Tests mock the integration points
- Components are defined but never wired up
- Props/data are passed in tests but not in actual usage
- The "happy path" in tests doesn't match real user flows

**Example:** A test passes because it mocks `projectName` prop, but the actual page never passes that prop - so users see nothing.

## The Three-Layer Verification

### Layer 1: Static Code Analysis

Trace the data flow through the codebase:

```
Where is it defined? → Where is it imported? → Where is it used? → What renders it?
```

**Check for gaps:**
- Function exists but is never called
- Component is imported but not rendered
- Prop is defined but not passed
- Callback is created but never triggered

### Layer 2: Wiring Verification

Verify the connection chain is complete:

```bash
# 1. Find the definition
grep -r "function getProjectName" src/

# 2. Find imports (is it imported?)
grep -r "import.*getProjectName" src/

# 3. Find usage (is it actually called?)
grep -r "getProjectName(" src/

# 4. Trace to UI (does it reach the render?)
# Follow: service → hook → component → JSX
```

**Red flags:**
- Import exists but no usage on the same file
- Function call exists but return value is unused
- Prop is destructured but never rendered
- State is set but component doesn't read it

### Layer 3: Browser Verification

Actually load the app and verify from a user's perspective:

```
1. Navigate to the page
2. Take accessibility snapshot (understand structure)
3. Look for the expected element/behavior
4. Interact if needed (click, type, submit)
5. Verify the outcome matches expectations
6. Check console for errors
7. Capture evidence (screenshot)
```

## Process

### 1. Understand the Feature

Read the implementation to understand:
- What should the user see/experience?
- What's the entry point (URL, button, action)?
- What data should be displayed?

### 2. Trace the Wiring

Starting from the UI component, trace backwards:
```
UI renders X → X comes from prop Y → Y comes from hook Z → Z calls service W
```

Then verify each link in the chain:
- Is W defined and exported?
- Does Z import and call W?
- Does the component call Z?
- Does the parent pass the result as Y?
- Does the UI actually render X?

### 3. Test in Browser

**Pre-flight check:**
```bash
# Is dev server running?
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

**Browser verification:**
```
browser_navigate → target URL
browser_snapshot → understand page structure
browser_click/type → interact if needed
browser_console_messages → check for JS errors
browser_take_screenshot → capture evidence
```

### 4. Compare and Report

| Check | Unit Tests | User Perspective |
|-------|-----------|------------------|
| Component renders | ✅ (with mocked props) | ❌ (prop not passed) |
| Data displays | ✅ (test provides data) | ❌ (API not wired) |
| Button works | ✅ (handler exists) | ❌ (never attached) |

## Output Format

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

**Gap found:** [description of missing link, if any]

### Browser Verification
- URL: http://localhost:3000/path
- Expected: [what should appear]
- Actual: [what actually appeared]
- Console errors: [none / list of errors]

### Evidence
[Screenshot or snapshot excerpt]

### Verdict
**PASS** - Feature works as expected from user perspective
or
**FAIL** - [specific issue with location]
  - Root cause: [explanation]
  - Fix: [one-liner or file:line to change]
```

## Common Wiring Failures

### 1. The Phantom Prop
```tsx
// Component expects the prop
function Header({ projectName }: Props) {
  return <div>{projectName}</div>;
}

// Parent never passes it
<Header />  // projectName is undefined!
```

### 2. The Orphan Import
```tsx
import { useFeature } from './hooks';
// ... but useFeature is never called in this file
```

### 3. The Dead Callback
```tsx
const handleClick = () => { /* logic */ };
// ... but no element has onClick={handleClick}
```

### 4. The Silent Fetch
```tsx
const data = await fetchData();
// ... but data is never used or rendered
```

## Playwright Quick Reference

| Action | Tool |
|--------|------|
| Open page | `browser_navigate` |
| Understand structure | `browser_snapshot` |
| Click element | `browser_click` with ref from snapshot |
| Type text | `browser_type` with ref from snapshot |
| Check for errors | `browser_console_messages` |
| Visual evidence | `browser_take_screenshot` |
| Wait for content | `browser_wait_for` |

**Snapshot is better than screenshot** for understanding what's on the page - it gives you the accessibility tree with refs you can interact with.

## Key Insight

> Unit tests verify that code works in isolation.
> User perspective tests verify that code works in integration.
> Both are necessary. Neither is sufficient alone.

TDD catches component behavior. User perspective testing catches the wiring gaps.
