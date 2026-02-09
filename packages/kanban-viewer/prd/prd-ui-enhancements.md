# PRD: UI Enhancements v0.3.0

## Overview

This PRD covers three UI enhancements to improve the kanban board viewer experience:

1. **Fix Mission Timer NaN Display** - Timer shows "NaN:NaN:NaN" due to data field mismatch
2. **Card Movement Animations** - CSS animations for smooth drag-and-drop style transitions
3. **Add Amy Agent to Status Bar** - Include the new investigator agent in the footer

## 1. Fix Mission Timer NaN Display

### Problem

The mission timer in the header displays "NaN:NaN:NaN" instead of elapsed time.

**Root Cause:** The `header-bar.tsx` component expects `mission.started_at` but `board.json` provides `mission.created_at`.

```typescript
// header-bar.tsx expects:
interface Mission {
  started_at: string;  // <-- Expected
}

// board.json provides:
{
  "mission": {
    "created_at": "2026-01-16T22:27:12.967Z"  // <-- Actual field name
  }
}
```

### Solution

Update the header-bar component to:
1. Use `created_at` as fallback when `started_at` is missing
2. Handle invalid/missing dates gracefully (display "00:00:00" or "--:--:--")
3. Update the Mission interface to reflect optional `started_at`

### Acceptance Criteria

- [ ] Timer displays valid time when `created_at` is present
- [ ] Timer displays placeholder when no valid date exists
- [ ] No NaN values ever displayed
- [ ] Tests updated for edge cases

---

## 2. Card Movement Animations

### Problem

When work items move between columns via SSE events, the cards instantly appear/disappear. This makes it hard to visually track what changed.

### Solution

Implement CSS animations that create a "drag and drop" visual effect when cards move:

1. **Exit Animation** (leaving column):
   - Card lifts slightly (scale + shadow)
   - Fades out while sliding toward destination column
   - Duration: 300ms

2. **Enter Animation** (arriving at column):
   - Card slides in from source direction
   - Settles into place with subtle bounce
   - Duration: 300ms

3. **Layout Shift Animation**:
   - Other cards in the column smoothly reposition
   - Uses CSS `transition` on position/transform
   - Duration: 200ms

### Technical Approach

```typescript
// Track animation state per item
interface AnimatingItem {
  id: string;
  fromStage: Stage;
  toStage: Stage;
  phase: 'exiting' | 'entering';
}

// CSS classes
.card-exiting {
  animation: card-exit 300ms ease-out forwards;
}

.card-entering {
  animation: card-enter 300ms ease-out forwards;
}

@keyframes card-exit {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.02) translateY(-4px); box-shadow: 0 8px 16px rgba(0,0,0,0.2); }
  100% { transform: scale(0.95) translateX(var(--exit-direction)); opacity: 0; }
}

@keyframes card-enter {
  0% { transform: scale(0.95) translateX(var(--enter-direction)); opacity: 0; }
  50% { transform: scale(1.02) translateY(-4px); }
  100% { transform: scale(1); opacity: 1; }
}
```

### Implementation Notes

- Use `onItemMoved` callback to trigger animations
- Track `--exit-direction` and `--enter-direction` CSS variables based on column positions
- Consider using Framer Motion or CSS-only approach
- Maintain item in DOM during animation (remove after animation completes)

### Acceptance Criteria

- [ ] Cards animate out of source column with lift effect
- [ ] Cards animate into destination column with settle effect
- [ ] Animation direction reflects actual column movement (left/right)
- [ ] Other cards in column smoothly reposition
- [ ] Animations don't block or delay state updates
- [ ] Works correctly with rapid successive moves
- [ ] Graceful degradation (instant move) if animations disabled
- [ ] Performance: no jank on lower-end devices

---

## 3. Add Amy Agent to Status Bar

### Problem

The agent status bar in the footer shows 5 agents (Hannibal, Face, Murdock, B.A., Lynch) but Amy Allen (the investigator) is missing.

### About Amy

Amy Allen is the investigative journalist/QA specialist who:
- Probes implementations for bugs that slip past tests
- Uses the "Raptor Protocol" to test edge cases
- Called by Lynch during review for complex features
- Called by Hannibal on rejection to diagnose issues

**Color scheme:** Should complement existing agents. Suggested: Purple/Violet (investigative, analytical)

### Solution

1. Add Amy to the `AgentName` type
2. Add Amy's avatar and color to the agent status bar
3. Update `board.json` schema to include Amy in agents
4. Display Amy's status (idle/working) like other agents

### Agent Bar Layout

Current:
```
[H] Hannibal  [F] Face  [M] Murdock  [B] B.A.  [L] Lynch
```

Proposed:
```
[H] Hannibal  [F] Face  [M] Murdock  [B] B.A.  [A] Amy  [L] Lynch
```

Note: Amy positioned before Lynch since she's invoked BY Lynch during reviews.

### Acceptance Criteria

- [ ] Amy appears in agent status bar with unique avatar (A)
- [ ] Amy has distinct color (purple/violet suggested)
- [ ] Amy's status (idle/working/current_item) displayed correctly
- [ ] Agent bar layout accommodates 6 agents without overflow
- [ ] AgentName type includes 'Amy'
- [ ] Tests updated for new agent

---

## Implementation Order

1. **Fix Timer NaN** (quick fix, high visibility)
2. **Add Amy Agent** (simple addition)
3. **Card Animations** (larger feature, can iterate)

## Files Likely to Change

### Timer Fix
- `src/components/header-bar.tsx`
- `src/types/index.ts` (Mission interface)
- `src/__tests__/header-bar.test.tsx`

### Amy Agent
- `src/types/index.ts` (AgentName type)
- `src/components/agent-status-bar.tsx`
- `src/__tests__/agent-status-bar.test.tsx`
- `mission/board.json` (add Amy to agents)

### Card Animations
- `src/components/work-item-card.tsx`
- `src/components/board-column.tsx`
- `src/app/page.tsx` (animation state management)
- `src/styles/animations.css` (new file)
- `src/__tests__/card-animations.test.tsx` (new file)

## Out of Scope

- Drag-and-drop user interaction (cards move via SSE only)
- Sound effects on movement
- Animation preferences/settings
- Agent avatars as images (letters only for now)
