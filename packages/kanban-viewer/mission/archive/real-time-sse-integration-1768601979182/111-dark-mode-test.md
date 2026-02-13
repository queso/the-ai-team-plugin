---
id: "111"
title: "Dark Mode CSS Tests"
type: "test"
status: "pending"
dependencies: ["110"]
parallel_group: "dark-mode"
rejection_count: 0
outputs:
  test: "src/__tests__/dark-mode.test.tsx"
  impl: "src/app/layout.tsx"
---

## Objective

Create tests to verify that dark mode is applied correctly across all components and that color contrast meets accessibility standards.

## Acceptance Criteria

- [ ] Test that html element receives 'dark' class by default
- [ ] Test that body has dark background color applied
- [ ] Test that text is readable (light on dark)
- [ ] Test card components use dark background (#2a2a2a equivalent)
- [ ] Test column backgrounds use appropriate dark shade
- [ ] Test color contrast ratios meet WCAG AA standards (4.5:1 for normal text)
- [ ] Test that all component backgrounds are dark-themed

## Context

- Use vitest with @testing-library/react
- May need to mock CSS custom properties or check computed styles
- Consider using jest-axe for accessibility testing
- The layout.tsx currently does not add 'dark' class to html element
