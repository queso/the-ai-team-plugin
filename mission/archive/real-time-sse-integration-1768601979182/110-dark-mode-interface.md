---
id: "110"
title: "Dark Mode Theme Interface"
type: "interface"
status: "pending"
dependencies: []
parallel_group: "dark-mode"
rejection_count: 0
outputs:
  types: "src/types/theme.ts"
  test: "src/__tests__/theme-types.test.ts"
  impl: "src/types/theme.ts"
---

## Objective

Define TypeScript types for the dark mode theme color palette to ensure type safety when referencing theme colors throughout the application.

## Acceptance Criteria

- [ ] Create ThemeColors interface with all required color keys
- [ ] Define color palette constants matching PRD specification:
  - Background (primary): #1a1a1a
  - Background (cards): #2a2a2a
  - Background (columns): #242424
  - Text (primary): #ffffff
  - Text (secondary): #a0a0a0
  - Accent (success): #22c55e (green)
  - Accent (warning): #f59e0b (amber)
  - Accent (active): #ef4444 (red)
  - Accent (idle): #6b7280 (gray)
- [ ] Export type for work item type badge colors
- [ ] Types should be importable from @/types

## Context

- The existing globals.css has a `.dark` class with CSS custom properties
- Tailwind uses these properties via the theme configuration
- Types ensure consistency when components reference colors programmatically
