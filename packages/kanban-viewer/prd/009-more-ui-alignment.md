# A(i)-Team Dashboard: Design Alignment PRD

**Version:** 1.0
**Date:** January 17, 2026
**Status:** Ready for Development

---

## Overview

The current dashboard implementation has visual inconsistencies with the original design. This PRD documents every deviation and specifies the required corrections to achieve alignment.

---

## Deviations by Area

### 1. System Log Panel

| Element | Current | Target | Action |
|---------|---------|--------|--------|
| Section header | None | ">_ SYSTEM LOG" with terminal prompt styling | **Add header** |
| Header styling | N/A | 12px, #6b7280, JetBrains Mono, uppercase, 8px bottom margin | **Style header** |
| Agent name format | `Face Created item...` | `[Face] Created item...` | **Add brackets** |
| Timestamp color | Same as agent | #6b7280 (muted gray) | **Dim timestamps** |
| Timestamp font | Unknown | JetBrains Mono, 12px | **Use monospace** |
| Agent name font | Unknown | Inter, 12px, font-weight 600 | **Set weight** |
| Message text | Unknown | Inter, 12px, #d1d5db | **Set color** |
| Line spacing | Tight | 24px line-height (1.6 at 12px + 4px padding) | **Increase spacing** |
| Wrap behavior | Unknown | Wrap at panel edge, indent continuation lines 8px | **Fix wrapping** |
| Auto-scroll | Unknown | Always pin to bottom, new entries appear at bottom | **Enable auto-scroll** |
| Scroll behavior | Unknown | Smooth scroll, user can scroll up to read history | **Smooth scroll** |
| Panel width | Unknown | 400px fixed width | **Set width** |
| Panel background | Unknown | #1a1a1a | **Set background** |
| Panel border | Unknown | 1px #374151 left border | **Add border** |

**Current Format:**
```
20:32:00 Face Created item 001: Add probing to Stage type definition
```

**Target Format:**
```
>_ SYSTEM LOG

10:42:15 [B.A.] Implementing JWT token refresh logic
10:42:12 [Face] Styling login form with design tokens
10:42:08 [Murdock] Running auth integration tests
```

**Auto-Scroll Behavior:**
- Live Feed is always pinned to the bottom by default
- New log entries appear at the bottom and view auto-scrolls to show them
- If user manually scrolls up to read history, auto-scroll pauses
- When user scrolls back to bottom (within 50px), auto-scroll resumes
- Optional: "Jump to bottom" button appears when user has scrolled up

**Log Agent Name Colors (match avatar colors from Agent Status Bar):**
| Agent | Color |
|-------|-------|
| Hannibal | #22c55e (green) |
| Face | #06b6d4 (cyan) |
| Murdock | #f59e0b (amber) |
| B.A. | #ef4444 (red) |
| Amy | #8b5cf6 (violet) |
| Lynch | #3b82f6 (blue) |

---

### 2. Agent Status Bar

| Element | Current | Target | Action |
|---------|---------|--------|--------|
| Label | "AGENTS" (left, partially cut off) | "AGENTS" visible, 12px, #6b7280, left-aligned with 16px left padding | **Fix positioning** |
| Agent layout | Left-aligned, cramped | Right-aligned, 80px between each agent | **Right-align agents** |
| Avatar circles | Letter in circle | 32px diameter, 14px font, centered letter, background per agent | **Set to 32px** |
| Status dot | Below name | 8px diameter, 4px below agent name, horizontally centered | **Position dot** |
| Status text | IDLE only | 10px, #a0a0a0, centered below dot | **Add status text** |
| Spacing | Inconsistent | 80px gap between agent groups | **Standardize spacing** |
| Bar height | Unknown | 64px total height | **Set height** |
| Bar background | Same as page | #1a1a1a with 1px #374151 top border | **Add border** |

**Agent Colors (avatar background):**
| Agent | Background | Text |
|-------|------------|------|
| Hannibal | #22c55e (green) | #ffffff |
| Face | #06b6d4 (cyan) | #ffffff |
| Murdock | #f59e0b (amber) | #000000 |
| B.A. | #ef4444 (red) | #ffffff |
| Amy | #8b5cf6 (violet) | #ffffff |
| Lynch | #3b82f6 (blue) | #ffffff |

**Status Dot Colors:**
| Status | Color | Animation |
|--------|-------|-----------|
| ACTIVE | #22c55e (green) | Pulse animation (opacity 0.5-1.0, 2s ease-in-out infinite) |
| WATCHING | #f59e0b (amber) | None |
| IDLE | #6b7280 (gray) | None |

**Target Layout:**
```
AGENTS                          [H]        [F]       [M]       [B]       [A]       [L]
                             Hannibal    Face    Murdock    B.A.      Amy      Lynch
                             ●WATCHING   ●IDLE   ●ACTIVE   ●ACTIVE   ●IDLE    ●IDLE
```

---

### 3. Column Headers

| Element | Current | Target | Action |
|---------|---------|--------|--------|
| Column name style | ALL CAPS | ALL CAPS, 14px, Inter font-weight 600, #ffffff | **Standardize** |
| Count | Right-aligned | Right-aligned, 14px, #6b7280 | ✅ Matches |
| Header height | Unknown | 40px | **Set height** |
| Header padding | Unknown | 12px horizontal | **Set padding** |
| PROBING column background | Purple/teal (#0d9488) | Match other columns: #242424, no special background | **Remove colored background** |
| Column background | Solid dark | #242424 | **Verify hex** |
| Header border | None | 1px #374151 bottom border | **Add border** |
| Column min-width | Unknown | 200px | **Set min-width** |
| Column gap | Unknown | 8px between columns | **Set gap** |

---

### 4. Work Item Cards

| Element | Current | Target | Action |
|---------|---------|--------|--------|
| Card background | #2a2a2a | #2a2a2a with 1px #374151 border | **Add border** |
| Card corners | Rounded | 8px border-radius | **Set to 8px** |
| Card padding | Unknown | 16px all sides | **Standardize** |
| Item ID | Top left | Top left, #6b7280 (muted gray), 12px font | **Style ID** |
| Title | Below ID | 14px, #ffffff, font-weight 500 | **Verify weight** |
| Type badge | Colored pill | 12px, 4px 8px padding, 4px border-radius | **Match sizing** |
| Dependency icon | None (code missing) | lucide-react `Link2` icon + count, #6b7280, right-aligned, 12px | **Implement dependency display** |
| Agent assignment | Bottom of card | 12px, avatar (20px circle) + 6px gap + name + 8px status dot | **Add to active cards** |
| Rejection badge | Warning triangle | lucide-react `AlertTriangle` (14px) + count, #eab308 background, 4px 8px padding, 4px radius | **Style badge** |
| Card hover state | None | Background lightens to #333333 | **Add hover** |
| Card spacing | Unknown | 8px gap between cards in column | **Standardize** |

**Badge Colors:**
| Type | Background | Text |
|------|------------|------|
| implementation | #22c55e | #ffffff |
| test | #eab308 | #000000 |
| interface | #8b5cf6 | #ffffff |
| integration | #3b82f6 | #ffffff |
| feature | #06b6d4 (cyan) | #ffffff |

**Icons (lucide-react):**
| Use | Icon | Size | Color |
|-----|------|------|-------|
| Dependency count | `Link2` | 14px | #6b7280 |
| Rejection warning | `AlertTriangle` | 14px | #eab308 |
| Close modal | `X` | 20px | #6b7280, hover #ffffff |
| Output file (impl) | `FileCode` | 14px | #6b7280 |
| Output file (test) | `TestTube2` | 14px | #6b7280 |

---

### 5. Work Item Detail Modal

The modal appears when clicking any work item card.

**Modal Container:**
- Background: #1f2937 (slightly lighter than page background)
- Border: 1px solid #374151
- Border-radius: 12px
- Width: 500px max, centered horizontally
- Padding: 24px
- Box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5)

**Modal Header:**
| Element | Specification |
|---------|---------------|
| Item ID | 14px JetBrains Mono, #6b7280, top-left |
| Type badge | Same styling as card badges, inline after ID |
| Status text | 12px, #a0a0a0, after badge (e.g., "Testing", "pending") |
| Close button | lucide-react `X` icon, 20px, #6b7280, top-right, hover: #ffffff |
| Title | 20px, #ffffff, Inter font-weight 600, below header row, 8px top margin |

**Agent & Rejection Row (below title):**
- Agent avatar: 24px circle with initial letter
- Agent name: 14px, #ffffff, 8px left of avatar
- Status dot: 8px circle, 4px left of name (green #22c55e if active)
- Rejection badge: lucide-react `AlertTriangle` icon (14px, #eab308) + count, #eab308 background, 4px 8px padding, 4px border-radius, 8px left margin

**Metadata Section (optional):**
| Field | Specification |
|-------|---------------|
| Status | Label #6b7280, value #ffffff, right-aligned |
| Created | Date in YYYY-MM-DD format |
| Updated | Date in YYYY-MM-DD format |
| Row height | 28px per row |
| Divider | 1px #374151 line below metadata |

**Outputs Section (when present):**
- Section header: "Outputs", 12px, #6b7280, uppercase, 16px top margin
- File entries: JetBrains Mono, 12px, #a0a0a0
- Icon prefix: lucide-react `FileCode` (14px, #6b7280) for impl, `TestTube2` (14px, #6b7280) for test
- File paths: full path shown, truncate with ellipsis if >50 chars

**Objective Section:**
- Section header: "Objective", 14px, #ffffff, font-weight 600, 16px top margin
- Body text: 14px, #d1d5db, 8px top margin, line-height 1.5

**Acceptance Criteria Section:**
- Section header: "Acceptance Criteria", 14px, #ffffff, font-weight 600, 16px top margin
- Checklist items: 14px, #d1d5db
- Checkbox: 16px square, #374151 border, #22c55e fill when checked
- Item spacing: 8px between items

**Rejection History Section (when rejections > 0):**
- Section header: "Rejection History", 14px, #ffffff, font-weight 600, 16px top margin
- Table headers: 12px, #6b7280, uppercase
- Table rows: 14px, #d1d5db
- Columns: # (40px), Reason (flex), Agent (80px)

**Table Styling:**
| Property | Value |
|----------|-------|
| Border collapse | collapse |
| Outer border | 1px solid #374151 |
| Header row background | #1f2937 |
| Header cell padding | 8px 12px |
| Header border bottom | 1px solid #374151 |
| Body row background | transparent |
| Body row hover | #2a2a2a |
| Body cell padding | 8px 12px |
| Cell border | 1px solid #374151 (right edge only, except last column) |
| Row border | 1px solid #374151 (bottom edge) |
| Border radius | 4px on outer corners of table |

**Context Section (when present):**
- Section header: "Context", 14px, #ffffff, font-weight 600, 16px top margin
- Body text: 14px, #a0a0a0 (dimmer than objective), line-height 1.5

**Current Status Section:**
- Section header: "Current Status", 14px, #ffffff, font-weight 600, 16px top margin
- Agent label: "Agent:" #6b7280, value #ffffff
- Progress label: "Progress:" #6b7280, value #d1d5db

**Modal Interactions:**
- Click outside modal: closes modal
- Press ESC: closes modal
- Click X button: closes modal
- Modal does not block Live Feed updates (feed continues scrolling behind)

---

### 6. Header Bar

| Element | Current | Target | Action |
|---------|---------|---------------|--------|
| Mission status dot | Red (completed) | Green (active) | ✅ Dynamic |
| Mission status text | "MISSION COMPLETED" | "MISSION ACTIVE" | ✅ Dynamic |
| Sparkle icon | Present | Present | ✅ Matches |
| Mission title | Present | Present | ✅ Matches |
| WIP indicator | "WIP: 0/13" | "WIP: 4/5" | ✅ Dynamic |
| Progress indicator | Gear icon + "16/16" | Gear icon + "12/26" | ✅ Dynamic |
| Progress bar | Thin line | Thin line with fill color | **Verify color** |
| Timer | "01:09:04" | "01:21:59" | ✅ Dynamic |
| Checkmark (completed) | Present (✓) | Not visible on active mission | ✅ Dynamic |

---

### 7. Typography

**Font Families:**
- Primary (body text): `Inter` from Google Fonts
- Monospace (IDs, timestamps, file paths): `JetBrains Mono` from Google Fonts

**Google Fonts Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
```

**Font Specifications:**
| Element | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| Mission title | Inter | 16px | 600 | #ffffff |
| Column headers | Inter | 14px | 600 | #ffffff |
| Card title | Inter | 14px | 500 | #ffffff |
| Card ID | JetBrains Mono | 12px | 400 | #6b7280 |
| Type badges | Inter | 12px | 500 | varies |
| Log timestamps | JetBrains Mono | 12px | 400 | #6b7280 |
| Log agent names | Inter | 12px | 600 | varies by agent |
| Log messages | Inter | 12px | 400 | #d1d5db |
| Agent status bar names | Inter | 12px | 500 | #ffffff |
| Agent status text | Inter | 10px | 400 | #a0a0a0 |
| Modal title | Inter | 20px | 600 | #ffffff |
| Modal section headers | Inter | 14px | 600 | #ffffff |
| Modal body text | Inter | 14px | 400 | #d1d5db |
| File paths | JetBrains Mono | 12px | 400 | #a0a0a0 |

**Line Heights:**
- Body text: 1.5
- Log entries: 1.6 (slightly more for readability)
- Headings: 1.2

---

### 8. Color Palette

| Use | Expected Hex | Verify In Current |
|-----|--------------|-------------------|
| Background (main) | #1a1a1a | ☐ Check |
| Background (cards) | #2a2a2a | ☐ Check |
| Background (columns) | #242424 | ☐ Check |
| Text (primary) | #ffffff | ☐ Check |
| Text (secondary) | #a0a0a0 | ☐ Check |
| Text (muted) | #6b7280 | ☐ Check |
| Accent (green/active) | #22c55e | ☐ Check |
| Accent (yellow/warning) | #eab308 | ☐ Check |
| Accent (red/blocked) | #ef4444 | ☐ Check |
| Accent (amber/watching) | #f59e0b | ☐ Check |
| Border (subtle) | #374151 | ☐ Check |

---

## Priority Order

1. **High: PROBING column** - Remove purple/teal background, match other column styling
2. **High: System Log formatting** - Brackets around agent names, SYSTEM LOG header, timestamp dimming, auto-scroll pinned to bottom
3. **High: Agent status bar** - Right-align, 80px spacing, all three status states with correct colors
4. **High: Dependency icon** - Implement missing dependency display using lucide-react `Link2` icon
5. **Medium: Work Item Modal refinements** - Verify modal matches specification (styling, spacing, table borders)
6. **Medium: Typography** - Import Inter + JetBrains Mono, apply font specs throughout
7. **Low: Color verification** - Spot check hex values against palette

---

## Acceptance Criteria

**System Log Panel:**
- [ ] Shows ">_ SYSTEM LOG" header in monospace
- [ ] Agent names wrapped in brackets: `[Agent]`
- [ ] Timestamps use JetBrains Mono, #6b7280
- [ ] Agent names use Inter font-weight 600
- [ ] Auto-scrolls to bottom, pauses when user scrolls up
- [ ] 400px fixed width with left border

**Agent Status Bar:**
- [ ] Right-aligned with 80px gap between agents
- [ ] Avatar circles are 32px diameter
- [ ] Status dots are 8px, positioned 4px below name
- [ ] WATCHING shows amber (#f59e0b), ACTIVE shows green with pulse, IDLE shows gray
- [ ] Amy included with violet (#8b5cf6) avatar

**Column Headers:**
- [ ] PROBING column has #242424 background (no purple/teal)
- [ ] All columns have 1px #374151 bottom border
- [ ] 14px Inter font-weight 600 for column names

**Work Item Cards:**
- [ ] 1px #374151 border on all cards
- [ ] 8px border-radius
- [ ] Hover state lightens to #333333
- [ ] Feature badge uses #06b6d4 (cyan)
- [ ] Dependency icon (lucide-react `Link2`) + count displayed when item has dependencies

**Work Item Modal:**
- [ ] Closes on X, ESC, or outside click
- [ ] Modal styling matches spec (background #1f2937, border #374151, 12px radius)
- [ ] Table borders render correctly (collapse, 1px #374151, 4px corner radius)
- [ ] Modal does not block Live Feed updates

**Typography:**
- [ ] Inter font loaded for body text
- [ ] JetBrains Mono loaded for IDs, timestamps, file paths
- [ ] Font weights match specification table

---

## Questions for Team

1. **Dependency icon** - Code for dependency display is missing. Recommend using `Link2` or `GitBranch` from lucide-react. Confirm preferred icon.

---

## Estimated Effort

| Area | Estimate |
|------|----------|
| PROBING column fix | 15 min |
| System Log formatting + auto-scroll | 2-3 hours |
| Agent status bar | 1-2 hours |
| Work Item Modal refinements | 1-2 hours |
| Dependency icon implementation | 30 min - 1 hour |
| Typography (font loading + application) | 1-2 hours |
| Color verification | 30 min |
| **Total** | **7-11 hours** |
