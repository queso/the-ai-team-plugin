---
id: '012'
title: Style rejection badge with AlertTriangle icon and background
type: feature
status: pending
rejection_count: 0
outputs:
  test: src/__tests__/work-item-card.test.tsx
  impl: src/components/work-item-card.tsx
dependencies:
  - '007'
---
## Objective

Update the rejection badge styling to match PRD specifications with proper icon, background, and sizing.

## Acceptance Criteria

- [ ] Use lucide-react AlertTriangle icon (14px)
- [ ] Icon color is #eab308 (amber)
- [ ] Badge has #eab308 background color
- [ ] Badge padding: 4px 8px
- [ ] Badge border-radius: 4px
- [ ] Text shows rejection count

## Current Implementation

```tsx
<div className="flex items-center gap-1 text-amber-500">
  <AlertTriangle className="h-3 w-3" />
  <span className="text-xs font-medium">{item.rejection_count}</span>
</div>
```

## Needed Changes

Add background color and adjust sizing:
```tsx
<div className="flex items-center gap-1 bg-[#eab308] text-black px-2 py-1 rounded">
  <AlertTriangle className="h-3.5 w-3.5" />
  <span className="text-xs font-medium">{item.rejection_count}</span>
</div>
```

## Context

PRD specifies rejection badge should have a background color, not just text color. Current implementation only has text styling.
