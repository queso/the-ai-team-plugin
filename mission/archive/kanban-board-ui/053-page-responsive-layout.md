---
id: "053"
title: "Responsive layout implementation"
type: "feature"
status: "pending"
dependencies: ["050"]
parallel_group: "page-assembly"
rejection_count: 0
outputs:
  types: "src/components/responsive-board.tsx"
  test: "src/__tests__/responsive-board.test.tsx"
  impl: "src/components/responsive-board.tsx"
---

## Objective

Implement responsive behavior for the board layout across desktop, tablet, and mobile viewports.

## Acceptance Criteria

- [ ] Desktop (1024px+): Full board with all columns and right panel visible
- [ ] Tablet (768px-1023px): Horizontal scrollable board, collapsible right panel
- [ ] Mobile (<768px): Single column view with stage selector/tabs
- [ ] Smooth transitions between layouts
- [ ] Panel toggle button visible on tablet
- [ ] Stage tabs on mobile allow switching between columns
- [ ] Uses Tailwind responsive breakpoints

## Context

Responsive behavior from PRD:
- Desktop: Full board view with all columns + right panel visible
- Tablet: Scrollable horizontal board, collapsible right panel
- Mobile: Single column view with stage selector/tabs

Implementation approach:
1. Use CSS media queries via Tailwind (md:, lg:, xl:)
2. Mobile stage selector using shadcn/ui Tabs or Select
3. Right panel toggle using useState and conditional rendering
4. Use useMediaQuery hook for JS-based responsive logic if needed

Tailwind breakpoints:
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px

Mobile layout:
```
+------------------+
| [Stage Selector] |
+------------------+
| [Cards for stage]|
+------------------+
| [Live Feed]      |  <- Bottom sheet or collapsible
+------------------+
```
