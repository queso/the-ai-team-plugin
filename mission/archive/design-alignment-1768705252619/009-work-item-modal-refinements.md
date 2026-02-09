---
id: 009
title: Work Item Modal refinements
type: enhancement
status: pending
rejection_count: 0
dependencies:
  - '001'
---
## Objective

Verify and update the Work Item Detail Modal to match the PRD specification including container styling, header layout, section formatting, and table styling for rejection history.

## Acceptance Criteria

- [ ] Set modal background to #1f2937 with 1px #374151 border and 12px border-radius
- [ ] Set modal width to 500px max, centered horizontally with 24px padding
- [ ] Add box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5)
- [ ] Style item ID: 14px JetBrains Mono, #6b7280, top-left
- [ ] Style type badge same as card badges, inline after ID
- [ ] Style status text: 12px, #a0a0a0, after badge
- [ ] Add close button: lucide-react X icon, 20px, #6b7280, top-right, hover: #ffffff
- [ ] Style title: 20px, #ffffff, Inter font-weight 600, 8px top margin
- [ ] Style agent row: 24px avatar + 14px name + 8px status dot + rejection badge if applicable
- [ ] Style Outputs section: 12px #6b7280 uppercase header, JetBrains Mono 12px #a0a0a0 file paths, FileCode/TestTube2 icons
- [ ] Style Objective section: 14px #ffffff header font-weight 600, 14px #d1d5db body, line-height 1.5
- [ ] Style Acceptance Criteria: checkboxes 16px square, #374151 border, #22c55e fill when checked, 8px item spacing
- [ ] Style Rejection History table: collapse borders, 1px #374151 borders, #1f2937 header background, 8px 12px cell padding, 4px outer corner radius, hover #2a2a2a
- [ ] Implement modal close on click outside, ESC key, and X button click

## Context

Work Item Detail Modal specifications from PRD:
- Container: #1f2937 background, 12px radius, 500px max width
- Sections: Outputs, Objective, Acceptance Criteria, Rejection History
- Table has specific border styling and hover states
- Modal should not block Live Feed updates

This is a MEDIUM priority fix per PRD.
