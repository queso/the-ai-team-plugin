# PRD 010: Smaller UI Tweaks

## Overview

This PRD addresses several small UI issues identified during mission execution that affect visual feedback and state management.

## Issues

### 1. Working Agent Status Needs Pulsing Animation

**Current Behavior:** When an agent is in "WORKING" state, the status indicator shows a static colored dot.

**Expected Behavior:** The status dot should pulse/animate to indicate active work in progress, providing clear visual feedback that the agent is actively processing.

**Acceptance Criteria:**
- Status dot for "working" state has a pulsing animation
- Animation is subtle but noticeable (opacity pulse or scale pulse)
- Animation uses CSS animations (not JS) for performance
- Other states (idle, active) remain static

**Reference:** Agent status bar showing Murdock as "WORKING" with static indicator

### 2. Progress Bar Color Should Indicate Completion State

**Current Behavior:** The progress bar remains white/neutral even when showing 12/12 (100% complete).

**Expected Behavior:** Progress bar should change color to indicate completion status:
- In progress: Current color (white/neutral)
- Complete (100%): Green to indicate success

**Acceptance Criteria:**
- Progress bar fill is green (#22c55e / green-500) when progress equals total
- Progress bar fill remains current color when in progress
- Transition between states is smooth

**Reference:** Header showing "12/12" with white progress bar instead of green

### 3. Board UI Not Clearing After Archive

**Current Behavior:** When a mission is archived, the board UI retains stale data. Items remain visible in columns even though they've been moved to the archive folder.

**Expected Behavior:** When a mission is archived:
- Board should clear all columns
- UI should reflect the empty/reset state
- User should see a fresh board ready for a new mission

**Possible Solutions:**
1. **SSE Event:** Emit a `mission-archived` or `board-reset` event that triggers full state refresh
2. **Page Reload:** Trigger a page reload after archive completes
3. **State Reset:** Clear local React state when archive is detected

**Acceptance Criteria:**
- After archiving a mission, the board shows empty columns
- No stale work items remain visible
- System is ready to start a new mission
- Solution should work with the existing SSE infrastructure

## Technical Notes

### Pulsing Animation
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-pulse-dot {
  animation: pulse 2s ease-in-out infinite;
}
```

### Progress Bar Completion
The HeaderBar component should check if `completed === total` and apply appropriate color class.

### Archive Reset
The most robust solution is likely an SSE event that the `useBoardEvents` hook can listen for and trigger a full data refetch or state reset.

### 4. Live Feed Auto-Scroll Not Working

**Current Behavior:** The Live Feed panel does not auto-scroll to show new entries as they arrive, despite the smart auto-scroll feature being implemented in Feature 003.

**Expected Behavior:**
- Live Feed should be pinned to bottom by default
- New log entries should auto-scroll into view
- Auto-scroll should pause when user scrolls up to read history
- Auto-scroll should resume when user scrolls back to bottom (within 50px)

**Investigation Areas:**
- Is `scrollRef` correctly attached to the scrollable container?
- Is the `useEffect` firing when entries change?
- Is `isAtBottomRef` being set correctly?
- Is the scroll container the right element (might be ScrollArea vs inner div)?
- Are there CSS issues preventing scroll (overflow, height constraints)?

**Acceptance Criteria:**
- New entries appear and view scrolls to show them (when at bottom)
- Scrolling up pauses auto-scroll
- Scrolling back to bottom resumes auto-scroll
- Smooth scroll animation works

**Files to Investigate:**
- `/src/components/live-feed-panel.tsx` - Auto-scroll implementation
- `/src/components/responsive-board.tsx` - Panel container

### 5. Live Feed Text Alignment Inconsistent

**Current Behavior:** Agent names have variable widths causing message text to start at different horizontal positions. For example:
- `[Amy]` is short, message starts early
- `[Hannibal]` is long, message starts later
- `[B.A.]` and `[Murdock]` fall somewhere in between

This creates a ragged, hard-to-scan log display.

**Expected Behavior:** All three columns (timestamp, agent name, message) should have consistent alignment:
- Timestamp: Fixed width (already monospace, looks okay)
- Agent name: Fixed width to accommodate longest name `[Hannibal]`
- Message: Starts at same visual column for all entries

**Acceptance Criteria:**
- Agent name column has fixed width (e.g., `w-20` or `min-w-[80px]`)
- All message text starts at the same horizontal position
- Layout remains readable and doesn't waste excessive space
- Wrapped message lines should still indent properly

**Implementation:**
```tsx
<span className="shrink-0 w-20 font-semibold ...">[{entry.agent}]</span>
```

**File:** `/src/components/live-feed-panel.tsx`

### 6. Dependency Icon Should Show Tooltip on Hover

**Current Behavior:** The dependency link icon (chain link) shows a count but hovering over it provides no additional information about what the dependencies are.

**Expected Behavior:** Hovering over the dependency indicator should show a tooltip listing the dependency IDs/names.

**Acceptance Criteria:**
- Tooltip appears on hover over dependency icon
- Tooltip shows list of dependency IDs (e.g., "Depends on: 002, 010")
- Tooltip styling matches dark theme
- Tooltip disappears when mouse leaves

**Implementation Options:**
1. Native `title` attribute for simple tooltip
2. Radix UI Tooltip component for styled tooltip

**File:** `/src/components/work-item-card.tsx`

### 7. Mission Completion SSE Event

**Current Behavior:** When a mission completes (all items reach done), the UI doesn't receive notification to update its state. The timer keeps running and the interface doesn't reflect completion.

**Expected Behavior:** When mission completes:
- SSE event `mission-completed` is emitted
- Timer stops and shows final duration
- UI reflects completed state (checkmark, green indicator, etc.)
- Progress bar shows 100% complete styling

**Acceptance Criteria:**
- New SSE event type: `mission-completed`
- Event payload includes: `completed_at`, `duration_ms`, final stats
- `useBoardEvents` hook handles `onMissionCompleted` callback
- HeaderBar stops timer and shows completion state
- Progress bar turns green (ties into issue #2)

**Implementation:**
1. Backend: Emit `mission-completed` event when `board.mission.status` changes to `completed`
2. Frontend: Add `onMissionCompleted` handler to `useBoardEvents`
3. HeaderBar: Listen for completion and update timer/display

**Files:**
- `/src/app/api/board/events/route.ts` - Emit new event
- `/src/hooks/use-board-events.ts` - Handle new event
- `/src/components/header-bar.tsx` - Update UI on completion

### 8. Work Item Card Design Refinements

**Current Behavior:** Cards have rounded corners, solid color badges, and don't show assigned agent. Card heights vary based on content.

**Target Design (from mockup):**

1. **Card Shape:** More squared corners (reduce border-radius from `rounded-xl` to `rounded` or `rounded-md`)

2. **Tonal Type Badges:** Instead of solid colored badges, use tonal/muted style:
   - Background: Muted/transparent version of the badge color
   - Text: Full saturation of the color
   - Example: `feature` badge has subtle cyan background with cyan text (not solid cyan with white text)
   - Border: 1px border in the badge color

3. **Active Agent Display:** Show assigned agent on card when in WIP stages:
   - Status dot (colored by agent status - working/idle)
   - Person icon (User icon from lucide)
   - Agent name in agent's color
   - Layout: `● 👤 Murdock` at bottom of card
   - Only show in WIP stages (testing, implementing, review, probing)

4. **Consistent Card Height:** Cards should have a minimum height so they align:
   - Set `min-h-[140px]` or similar
   - Use flexbox with `justify-between` to push footer to bottom
   - Prevents ragged card edges across columns

5. **No Agent State:** When no agent is assigned (briefings, ready, done, blocked):
   - Don't show agent row at all, OR
   - Show empty space to maintain height consistency

**Acceptance Criteria:**
- Cards have reduced border-radius (more squared)
- Type badges use tonal styling (muted bg, colored text, border)
- Assigned agent displays with status dot + icon + name
- All cards have consistent minimum height
- Cards without agents handle gracefully

**Badge Color Mapping (Tonal):**
```
feature:     bg-cyan-500/20    text-cyan-400    border-cyan-500/50
bug:         bg-red-500/20     text-red-400     border-red-500/50
enhancement: bg-blue-500/20    text-blue-400    border-blue-500/50
task:        bg-green-500/20   text-green-400   border-green-500/50
test:        bg-purple-500/20  text-purple-400  border-purple-500/50
interface:   bg-emerald-500/20 text-emerald-400 border-emerald-500/50
integration: bg-yellow-500/20  text-yellow-400  border-yellow-500/50
implementation: bg-gray-500/20 text-gray-400    border-gray-500/50
```

**File:** `/src/components/work-item-card.tsx`

## Priority

Medium - These are polish items that improve user experience but don't block core functionality.

## Dependencies

None - these are independent improvements.
