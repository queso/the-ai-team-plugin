# A(i)-Team Dashboard UI Alignment PRD

**Version:** 1.0
**Date:** January 15, 2026
**Status:** ✅ Completed

> **Implementation Date:** January 15, 2026
> **Completed By:** A(i)-Team (Hannibal, Face, Murdock, B.A.)
> **Work Items:** 17 delivered across 6 parallel groups

---

## Overview

The current dashboard implementation has diverged from the original design specification. This PRD documents the required changes to bring the UI into alignment with the approved design.

---

## Current State vs. Design

| Element | Current Implementation | Original Design | Action |
|---------|----------------------|-----------------|--------|
| Color Mode | Light mode | Dark mode | **Fix** |
| Column WIP Labels | Per-column "WIP: 0/2" | None | **Remove** |
| Header WIP | Not prominent | "WIP: 4/5" in header | **Keep current** |
| Agent on Cards | Missing | Avatar + name on active cards | **Add** |
| Dependency Icons | Missing | Chain icon with count (⟐1) | **Verify present** |
| Rejection Badges | Missing | Warning icon with count (⚠️1) | **Verify present** |
| Card Modal | Missing | Detailed view on click | **Add** |
| Agent Status States | IDLE only | WATCHING, ACTIVE, IDLE | **Add** |
| Human Input Tab | No indicator | Notification dot when pending | **Add** |

---

## Required Changes

### 1. Dark Mode Implementation

**Priority:** High

The entire application must use the dark color scheme from the original design.

**Color Palette:**
```
Background (primary):    #1a1a1a or similar dark gray
Background (cards):      #2a2a2a with subtle border
Background (columns):    #242424
Text (primary):          #ffffff
Text (secondary):        #a0a0a0
Accent (success):        #22c55e (green)
Accent (warning):        #f59e0b (amber)
Accent (active):         #ef4444 (red dot for active agents)
Accent (idle):           #6b7280 (gray dot for idle)
Tags - implementation:   #22c55e background
Tags - integration:      #3b82f6 background  
Tags - interface:        #8b5cf6 background
Tags - test:             #eab308 background
```

### 2. Remove Per-Column WIP Labels

**Priority:** High

**Current:** Each column header shows "WIP: 0/2" beneath the column name.

**Required:** Remove these labels entirely. The global WIP indicator in the header is sufficient.

**Before:**
```
TESTING
WIP: 0/2
```

**After:**
```
TESTING        2
```
(Just column name and item count)

### 3. Add Agent Assignment to Cards

**Priority:** High

Cards that are actively being worked on must display the assigned agent.

**Card Footer Layout:**
```
┌─────────────────────────────┐
│ 007                         │
│ Auth Service Implementation │
│ ┌──────────────┐            │
│ │implementation│     ⟐1    │
│ └──────────────┘            │
│ ● 👤 B.A.                   │
└─────────────────────────────┘
```

**Display Rules:**
- Show agent only when card is in TESTING, IMPLEMENTING, or REVIEW columns
- Show colored status dot (green = active on this card, red = blocked)
- Show agent avatar placeholder + name
- Right-align dependency count if present

### 4. Implement Card Detail Modal

**Priority:** High

Clicking any card opens a detail modal with full work item information.

**Modal Structure:**
```
┌──────────────────────────────────────────────────┐
│ 025   [test]   Testing                       [X] │
├──────────────────────────────────────────────────┤
│ Login Form Validation Tests                      │
│                                                  │
│ 👤 Murdock ●   ⚠️ 1 rejection                    │
│──────────────────────────────────────────────────│
│ Objective                                        │
│ Test all validation scenarios for the login      │
│ form component.                                  │
│                                                  │
│ Test Coverage Required                           │
│ [ ] Empty email field                            │
│ [ ] Invalid email format                         │
│ [ ] Empty password field                         │
│ [ ] Password too short                           │
│ [ ] Form submission with validation errors       │
│ [ ] Successful form submission                   │
│                                                  │
│ Rejection History                                │
│ ┌────┬─────────────────────────────────┬───────┐ │
│ │ #  │ Reason                          │ Agent │ │
│ ├────┼─────────────────────────────────┼───────┤ │
│ │ 1  │ Missing test for special chars  │ Lynch │ │
│ └────┴─────────────────────────────────┴───────┘ │
│                                                  │
│ Current Status                                   │
│ Agent: Murdock (QA)                              │
│ Progress: Addressing rejection feedback...       │
└──────────────────────────────────────────────────┘
```

**Modal Content Sections:**

1. **Header Row**
   - Work item ID (025)
   - Type tag (test, implementation, interface, integration)
   - Current column/status
   - Close button (X)

2. **Title Bar**
   - Work item title (large)
   - Assigned agent with status dot
   - Rejection count badge (if any)

3. **Objective**
   - The goal/description of the work item

4. **Acceptance Criteria / Test Coverage**
   - Checklist of requirements
   - Checkboxes should reflect completion state

5. **Rejection History** (if rejections > 0)
   - Table showing rejection number, reason, reviewing agent

6. **Current Status**
   - Assigned agent and role
   - Progress description (from agent's last update)

**Interaction:**
- Click outside modal or X to close
- ESC key closes modal
- Modal should not block live feed updates

### 5. Agent Status States

**Priority:** Medium

The agent status bar must show three distinct states.

**States:**
| State | Dot Color | Meaning |
|-------|-----------|---------|
| ACTIVE | Green (pulsing) | Agent is currently executing a task |
| WATCHING | Amber | Hannibal monitoring, ready to dispatch |
| IDLE | Gray | Agent waiting for work |

**Implementation:**
```tsx
type AgentStatus = 'ACTIVE' | 'WATCHING' | 'IDLE';

const statusColors = {
  ACTIVE: 'bg-green-500 animate-pulse',
  WATCHING: 'bg-amber-500',
  IDLE: 'bg-gray-500'
};
```

### 6. Human Input Tab Notification

**Priority:** Medium

When items are blocked awaiting human input, show a notification indicator on the Human Input tab.

**Implementation:**
- Small colored dot (amber or red) on the tab
- Dot appears when `blockedItems.length > 0`
- Include count badge if multiple items blocked

**Visual:**
```
Live Feed    Human Input●    Git    + New Mission
```

---

## Out of Scope

The following elements from the current implementation should be **retained** (they're acceptable variations):

1. Header progress bar style
2. Timer format
3. Tab positioning (right side is fine)
4. Column order

---

## Acceptance Criteria

- [x] Application renders in dark mode by default
- [x] No per-column WIP labels visible
- [x] Cards in active columns show assigned agent with status dot
- [x] Clicking any card opens detail modal
- [x] Modal displays all sections: objective, criteria, rejection history, status
- [x] Modal closes on X click, outside click, or ESC
- [x] Agent bar shows ACTIVE/WATCHING/IDLE states correctly
- [x] Human Input tab shows notification dot when items are blocked
- [x] All text remains readable against dark backgrounds
- [x] Color contrast meets accessibility standards (WCAG AA)

---

## Technical Notes

**Recommended Approach:**

1. Start with dark mode CSS/Tailwind config change
2. Remove WIP labels from column headers (simple deletion)
3. Add agent footer to WorkItemCard component
4. Create WorkItemModal component
5. Update AgentStatusBar to support three states
6. Add notification dot to tab component

**Estimated Effort:** 4-6 hours

---

## Reference

**Original Design Screenshots:**
- Dashboard overview with active mission
- Card detail modal expanded view

**Design System:**
- Dark theme with green/amber accents
- Monospace font for technical elements (item IDs, logs)
- Sans-serif for headings and body text

---

## Implementation Summary

### Files Created

| File | Purpose |
|------|---------|
| `src/components/work-item-modal.tsx` | Detail modal for work items |
| `src/components/notification-dot.tsx` | Reusable notification indicator |

### Files Modified

| File | Changes |
|------|---------|
| `src/app/layout.tsx` | Added `dark` class for dark mode |
| `src/app/page.tsx` | Modal integration, blocked items notification |
| `src/components/board-column.tsx` | Removed per-column WIP labels |
| `src/components/work-item-card.tsx` | Stage-based agent visibility, status dot colors |
| `src/components/agent-status-bar.tsx` | Status-based colors with pulse animation |
| `src/types/index.ts` | Theme colors, modal types, notification types |

### Test Coverage

- **614 tests passing**
- Theme types: 22 tests
- Dark mode CSS: 16 tests
- Board column: 27 tests
- Work item card: 33 tests
- Agent status bar: 24 tests
- Work item modal: 41 tests
- Notification dot: 22 tests

### Work Items Delivered

| Group | Items | Description |
|-------|-------|-------------|
| dark-mode | 110 → 111 → 112 | Theme types, CSS tests, implementation |
| column-wip | 120 → 121 | WIP removal tests, implementation |
| agent-cards | 130 → 131 | Card display tests, implementation |
| work-item-modal | 140 → 141 → 142 → 143 | Types, tests, implementation, integration |
| agent-status | 150 → 151 | Animation tests, implementation |
| tab-notification | 160 → 161 → 162 → 163 | Types, tests, implementation, integration |
