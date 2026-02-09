---
id: "035"
title: "TypeBadge component"
type: "feature"
status: "pending"
dependencies: ["001"]
parallel_group: "ui-components"
rejection_count: 0
outputs:
  types: "src/components/type-badge.tsx"
  test: "src/__tests__/type-badge.test.tsx"
  impl: "src/components/type-badge.tsx"
---

## Objective

Create a small React component for displaying the work item type as a colored pill badge.

## Acceptance Criteria

- [ ] Accepts type prop: implementation, interface, integration, test
- [ ] Correct background color for each type
- [ ] White text on colored background
- [ ] Rounded pill shape (rounded-full)
- [ ] Consistent padding and font size
- [ ] Handles unknown type gracefully (gray fallback)

## Context

Type badge colors from PRD:
```
[implementation]  <- Teal/Cyan (#06b6d4 / bg-cyan-500)
[interface]       <- Blue (#3b82f6 / bg-blue-500)
[integration]     <- Purple (#8b5cf6 / bg-violet-500)
[test]            <- Green (#22c55e / bg-green-500)
```

Badge styling:
- Small text (text-xs)
- Rounded pill (rounded-full)
- Horizontal padding (px-2)
- Vertical padding (py-0.5)
- White text (text-white)
- Lowercase text

Example:
```tsx
<TypeBadge type="implementation" />
// Renders: <span className="px-2 py-0.5 rounded-full text-xs text-white bg-cyan-500">implementation</span>
```
