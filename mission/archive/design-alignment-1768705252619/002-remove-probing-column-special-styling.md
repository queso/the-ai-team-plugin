---
id: '002'
title: Remove PROBING column special styling
type: bug
status: pending
rejection_count: 0
dependencies: []
---
## Objective

Remove the purple/teal (#0d9488) background from the PROBING column header and body. The PROBING column should match the styling of all other columns with a #242424 background and no special color treatment.

## Acceptance Criteria

- [ ] Remove teal/purple background color from PROBING column header
- [ ] Set PROBING column background to #242424 (same as other columns)
- [ ] Remove any conditional styling that treats PROBING differently
- [ ] Verify PROBING column visually matches TESTING, IMPLEMENTING, and REVIEW columns

## Context

Current state: PROBING column has a distinctive purple/teal (#0d9488) background
Target state: PROBING column should have #242424 background matching other columns

This is a HIGH priority fix per PRD.
