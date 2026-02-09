# Design Reference

Source: https://v0.app/chat/ai-agent-dashboard-pz81WQMPY3L

## Color Palette (OKLch)

```css
/* Background layers */
--background: oklch(0.13 0.005 250);      /* Dark blue-black */
--secondary: oklch(0.22 0.005 250);        /* Muted dark panels */

/* Accent colors */
--primary: oklch(0.65 0.15 145);           /* Green accent */
--warning: oklch(0.75 0.15 85);            /* Amber warning */

/* Type badge colors */
--type-implementation: #06b6d4;            /* Teal/Cyan */
--type-interface: #3b82f6;                 /* Blue */
--type-integration: #8b5cf6;               /* Purple */
--type-test: #22c55e;                      /* Green */

/* Agent colors */
--agent-hannibal: #3b82f6;                 /* Blue */
--agent-face: #22c55e;                     /* Green */
--agent-murdock: #eab308;                  /* Yellow */
--agent-ba: #f97316;                       /* Orange */
--agent-lynch: #8b5cf6;                    /* Purple */
```

## Typography

- **Monospace**: "Geist Mono" - terminal aesthetic for code/data
- **Sans-serif**: "Geist" - body text and labels
- Base radius: `0.375rem` (6px)

## Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER: Mission stats, timer, WIP, progress                 │
├─────────────────────────────────────────┬───────────────────┤
│                                         │ RIGHT PANEL       │
│  KANBAN BOARD                           │ (400px fixed)     │
│  (flex-1)                               │                   │
│                                         │ Tabs:             │
│  Columns: min-w-[220px] w-[220px]       │ - Live Feed       │
│                                         │ - Human Input     │
│                                         │ - Git             │
│                                         │ - New Mission     │
├─────────────────────────────────────────┴───────────────────┤
│ FOOTER: Agent status bar                                    │
└─────────────────────────────────────────────────────────────┘
```

## Interactive States

### Cards
- Rejection badge: amber at 1-2 rejections, warning at 3+
- Dependency indicator with hover tooltip
- Agent assignment with animated pulse when active
- Status icons: checkmark (done), alert (blocked)

### Header
- Live timer incrementing every second
- WIP counter with conditional warning color at limit
- Progress bar with smooth CSS transitions

### Tabs
- Active tab: bottom border highlight
- Human Input tab: pulse animation when blocked items exist

### Agent Footer
- Colored avatar badges matching agent identity
- Animated pulse for active status
- Static indicator for idle/error

## Key Patterns

### Timer Hook
```typescript
const [elapsedTime, setElapsedTime] = useState(initialElapsedTime)
useEffect(() => {
  const interval = setInterval(() => {
    setElapsedTime(prev => prev + 1)
  }, 1000)
  return () => clearInterval(interval)
}, [])
```

### Column Filtering
```typescript
const getColumnItems = (columnId: string) =>
  items.filter(item => item.column === columnId)
```

### Conditional Badge Rendering
```typescript
const hasRejections = (item.rejectionCount ?? 0) > 0
const hasDependencies = (item.dependencies?.length ?? 0) > 0
```
