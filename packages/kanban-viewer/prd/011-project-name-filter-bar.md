# A(i)-Team Dashboard: Filter Bar & Project Name PRD

**Version:** 1.0  
**Date:** January 18, 2026  
**Status:** Ready for Development

---

## Overview

Two enhancements to improve navigation and board usability:
1. **Project Name Display** — Persistent project identifier in the header
2. **Filter Bar** — Filter cards by type, agent, or status

---

## 1. Project Name Display

The project name (e.g., "Pair HQ") should be persistently visible, separate from the mission name which represents the current epic/sprint.

**Hierarchy:**
- **Project** = The overall product or codebase (Pair HQ, BoxOps, Arcane Layers)
- **Mission** = A specific epic or PRD being worked (PRD 010: Smaller UI Tweaks)

### Source

The project name is derived from the filesystem — it's the **parent folder name** of the `mission/` directory.

```
/home/user/projects/PairHQ/          ← Project name: "PairHQ"
                    └── mission/
                        ├── board.json
                        └── items/
                            ├── 001-progress-bar.md
                            └── ...
```

**Formatting:**
- Read folder name as-is from filesystem
- Display with original casing (PairHQ, BoxOps, ArcaneOps)
- No transformation needed — folder name is the display name

**Backend:**
- Dashboard reads `process.cwd()` or mission path config
- Extracts parent directory name: `path.basename(path.dirname(missionPath))`
- Passes to frontend as `projectName` in initial state

### Layout

```
┌──────────────────┬─────────────────────────────────────────────────────────────────────┐
│                  │                                                                     │
│    PAIR HQ       │  ● MISSION ACTIVE   ✦ PRD 010: Smaller UI Tweaks    WIP: 0/13  ... │
│                  │                                                                     │
└──────────────────┴─────────────────────────────────────────────────────────────────────┘
     Project                                    Mission
```

### Specifications

**Project Name Container:**
| Property | Value |
|----------|-------|
| Width | 160px fixed |
| Height | Match header height (48px) |
| Background | #1a1a1a (same as page) |
| Border | 1px #374151 right border |
| Padding | 16px horizontal |
| Display | flex, align-items: center |

**Project Name Text:**
| Property | Value |
|----------|-------|
| Font | Inter |
| Size | 14px |
| Weight | 600 |
| Color | #ffffff |
| Text transform | uppercase |
| Letter spacing | 0.05em |

**Interactions:**
- Hover: Text color changes to #22c55e (green accent)
- Click: Navigate to project overview / mission list (future feature)
- Cursor: pointer

**Responsive Behavior:**
- Below 1024px viewport width: Hide project name, show only mission
- Project name area collapses, mission bar takes full width

---

## 2. Filter Bar

A horizontal filter bar below the header to filter visible cards on the board.

### Layout

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  PAIR HQ   │  ● MISSION ACTIVE   ✦ PRD 010: Smaller UI Tweaks                      ... │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  Filter by:   [All Types ▾]   [All Agents ▾]   [All Status ▾]         🔍 Search...     │
├────────┬────────┬─────────┬──────────────┬─────────┬──────────┬───────┬────────────────┤
│BRIEFINGS│ READY │ TESTING │ IMPLEMENTING │ REVIEW  │ PROBING  │ DONE  │ BLOCKED        │
```

### Filter Options

**Type Filter:**
| Option | Filters to |
|--------|------------|
| All Types | No filter (default) |
| implementation | type === 'implementation' |
| test | type === 'test' |
| interface | type === 'interface' |
| integration | type === 'integration' |
| feature | type === 'feature' |
| bug | type === 'bug' |
| enhancement | type === 'enhancement' |

**Agent Filter:**
| Option | Filters to |
|--------|------------|
| All Agents | No filter (default) |
| Hannibal | assignee === 'hannibal' |
| Face | assignee === 'face' |
| Murdock | assignee === 'murdock' |
| B.A. | assignee === 'ba' |
| Amy | assignee === 'amy' |
| Lynch | assignee === 'lynch' |
| Unassigned | assignee === null |

**Status Filter:**
| Option | Filters to |
|--------|------------|
| All Status | No filter (default) |
| Active | Cards in TESTING, IMPLEMENTING, REVIEW |
| Blocked | Cards in BLOCKED column |
| Has Rejections | rejectionCount > 0 |
| Has Dependencies | dependencies.length > 0 |
| Completed | Cards in DONE column |

### Specifications

**Filter Bar Container:**
| Property | Value |
|----------|-------|
| Height | 48px |
| Background | #1f2937 |
| Border | 1px #374151 bottom border |
| Padding | 0 16px |
| Display | flex |
| Align items | center |
| Gap | 16px |

**Filter Label ("Filter by:"):**
| Property | Value |
|----------|-------|
| Font | Inter |
| Size | 12px |
| Weight | 500 |
| Color | #6b7280 |

**Dropdown Selects:**
| Property | Value |
|----------|-------|
| Background | #374151 |
| Border | 1px #4b5563 |
| Border radius | 6px |
| Padding | 6px 12px |
| Font | Inter, 12px, 400 |
| Color | #ffffff |
| Min width | 120px |
| Icon | lucide-react `ChevronDown`, 14px, #6b7280 |

**Dropdown Hover:**
| Property | Value |
|----------|-------|
| Background | #4b5563 |
| Border color | #6b7280 |

**Dropdown Open State:**
| Property | Value |
|----------|-------|
| Menu background | #1f2937 |
| Menu border | 1px #374151 |
| Menu shadow | 0 10px 25px rgba(0, 0, 0, 0.3) |
| Option padding | 8px 12px |
| Option hover | #374151 background |
| Selected option | #22c55e text color, checkmark icon |

**Search Input:**
| Property | Value |
|----------|-------|
| Position | Right side, margin-left: auto |
| Width | 200px |
| Background | #374151 |
| Border | 1px #4b5563 |
| Border radius | 6px |
| Padding | 6px 12px 6px 32px |
| Font | Inter, 12px, 400 |
| Color | #ffffff |
| Placeholder | "Search..." in #6b7280 |
| Icon | lucide-react `Search`, 14px, #6b7280, positioned left inside input |

**Search Behavior:**
- Filters cards where title contains search string (case-insensitive)
- Debounce input by 300ms
- Clear button (X) appears when input has value

### Filter Logic

Filters are combined with AND logic:

```
visibleCards = cards.filter(card => 
  matchesType(card, typeFilter) &&
  matchesAgent(card, agentFilter) &&
  matchesStatus(card, statusFilter) &&
  matchesSearch(card, searchQuery)
)
```

### Active Filter Indicators

When filters are active (not default):

**Dropdown Badge:**
- Show count badge on dropdown: e.g., "Type (3)" if 3 cards match
- Dropdown background changes to #22c55e20 (green with 12% opacity)
- Dropdown border changes to #22c55e

**Clear All Button:**
- Appears after dropdowns when any filter is active
- Text: "Clear filters"
- Style: text button, #6b7280, hover #ffffff
- Icon: lucide-react `X`, 12px

### Empty State

When filters result in no visible cards:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                     No items match filters                      │
│                                                                 │
│               [Clear filters] to see all items                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

- Message: 14px, #6b7280, centered in board area
- Clear filters: text button, #22c55e

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `/` | Focus search input |
| `Escape` | Clear search input, close dropdowns |
| `Cmd/Ctrl + K` | Focus search input (alternative) |

---

## Icons (lucide-react)

| Use | Icon | Size |
|-----|------|------|
| Dropdown arrow | `ChevronDown` | 14px |
| Search | `Search` | 14px |
| Clear input | `X` | 12px |
| Selected option checkmark | `Check` | 14px |

---

## Acceptance Criteria

**Project Name:**
- [ ] Project name displays in 160px left container
- [ ] 1px #374151 right border separates from mission bar
- [ ] Text is uppercase, Inter 14px weight 600
- [ ] Hover changes text to #22c55e
- [ ] Click is wired up (can be no-op for now, ready for future navigation)
- [ ] Hides below 1024px viewport width

**Filter Bar:**
- [ ] Filter bar appears below header, above columns
- [ ] Three dropdowns: Type, Agent, Status
- [ ] Search input on right side
- [ ] Filters combine with AND logic
- [ ] Active filters show visual indicator (green tint)
- [ ] "Clear filters" appears when filters active
- [ ] Empty state displays when no cards match
- [ ] `/` keyboard shortcut focuses search
- [ ] Escape clears search and closes dropdowns

---

## Estimated Effort

| Area | Estimate |
|------|----------|
| Project name container | 30 min |
| Filter bar layout | 1 hour |
| Dropdown components | 1-2 hours |
| Filter logic | 1 hour |
| Search with debounce | 30 min |
| Active filter indicators | 30 min |
| Empty state | 15 min |
| Keyboard shortcuts | 30 min |
| Responsive behavior | 30 min |
| **Total** | **5-7 hours** |
