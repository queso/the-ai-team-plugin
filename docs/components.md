# Components

Documentation for all React components in the Kanban Board Viewer.

## Layout Components

### ResponsiveBoard

Main layout wrapper that handles responsive design across screen sizes.

```tsx
import { ResponsiveBoard } from '@/components/responsive-board';

<ResponsiveBoard
  header={<HeaderBar {...props} />}
  columns={columns}
  sidePanel={<LiveFeedPanel {...props} />}
  footer={<AgentStatusBar {...props} />}
/>
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| header | ReactNode | Header bar component |
| columns | ReactNode[] | Array of board columns |
| sidePanel | ReactNode | Right side panel (hidden on mobile) |
| footer | ReactNode | Bottom agent status bar |

**Responsive Behavior**

- **Desktop (1280px+)**: Full layout with side panel
- **Tablet (768px-1279px)**: Horizontal scroll for columns, panel hidden
- **Mobile (<768px)**: Stacked columns, swipe navigation

---

## Header Components

### HeaderBar

Top navigation bar with mission info and controls.

```tsx
import { HeaderBar } from '@/components/header-bar';

<HeaderBar
  missionName="Kanban Board UI"
  status="active"
  startedAt="2026-01-15T18:10:00Z"
  progress={75}
/>
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| missionName | string | Display name of the mission |
| status | MissionStatus | Current mission status |
| startedAt | string | ISO timestamp of mission start |
| progress | number | Completion percentage (0-100) |

**Test IDs**

- `status-indicator` - Status badge
- `timer-display` - Mission timer

---

### MissionTimer

Displays elapsed time since mission start, updating every second. Supports freezing on mission completion and resuming when reopened.

```tsx
import { MissionTimer } from '@/components/mission-timer';

<MissionTimer
  startedAt="2026-01-15T18:10:00Z"
  completedAt="2026-01-15T20:30:00Z"  // Optional: freezes timer
/>
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| startedAt | string | ISO timestamp of mission start |
| completedAt | string? | ISO timestamp of completion (freezes timer) |

**Display Format**: `HH:MM:SS`

**Behavior**
- Updates every second when mission is active
- Freezes at completion time when `completedAt` is set
- Resumes from frozen time if `completedAt` is cleared (mission reopened)

---

### ConnectionStatusIndicator

Displays the current SSE connection status with color-coded indicator.

```tsx
import { ConnectionStatusIndicator } from '@/components/connection-status-indicator';

<ConnectionStatusIndicator
  status="connected"
  error={null}
/>
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| status | ConnectionStatus | connected, connecting, disconnected, or error |
| error | Error \| null | Error details if status is error |

**Status Colors**

| Status | Indicator |
|--------|-----------|
| connected | Green dot |
| connecting | Yellow pulsing dot |
| disconnected | Gray dot |
| error | Red dot |

**Test IDs**
- `connection-status-indicator` - Indicator container

---

### ProgressBar

Visual progress indicator for mission completion.

```tsx
import { ProgressBar } from '@/components/progress-bar';

<ProgressBar value={75} />
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| value | number | Percentage complete (0-100) |

---

## Board Components

### BoardColumn

A single kanban column with header and card list.

```tsx
import { BoardColumn } from '@/components/board-column';

<BoardColumn
  stage="implementing"
  items={items}
  wipLimit={3}
  onCardClick={handleCardClick}
/>
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| stage | Stage | Column stage identifier |
| items | WorkItem[] | Items to display in column |
| wipLimit | number? | Optional WIP limit for column |
| onCardClick | (item: WorkItem) => void | Card click handler |

**Test IDs**

- `board-column` - Column container
- `item-count` - Item count badge
- `wip-indicator` - WIP limit indicator (when applicable)

---

### WorkItemCard

Compact card representing a single work item with optional animations.

```tsx
import { WorkItemCard } from '@/components/work-item-card';

<WorkItemCard
  item={workItem}
  onClick={() => setSelectedItem(workItem)}
  animationState="entering"  // Optional animation
/>
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| item | WorkItem | Work item data |
| onClick | () => void | Click handler |
| animationState | CardAnimationState? | entering, exiting, or idle |

**Animation States**

| State | Effect |
|-------|--------|
| entering | Fade in + scale up animation |
| exiting | Fade out + scale down animation |
| idle | No animation (default) |

**Hover Effects**
- Scale up slightly on hover
- Enhanced shadow on hover
- Smooth transition (150ms)

**Test IDs**

- `work-item-card` - Card container

---

### TypeBadge

Color-coded badge indicating work item type.

```tsx
import { TypeBadge } from '@/components/type-badge';

<TypeBadge type="feature" />
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| type | WorkItemType | feature, bug, enhancement, or task |

**Colors**

| Type | Color |
|------|-------|
| feature | Blue |
| bug | Red |
| enhancement | Green |
| task | Gray |

---

### DependencyIndicator

Shows dependency relationships for a work item.

```tsx
import { DependencyIndicator } from '@/components/dependency-indicator';

<DependencyIndicator
  dependencies={['001', '002']}
  isBlocked={true}
/>
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| dependencies | string[] | IDs of items this depends on |
| isBlocked | boolean | Whether item is blocked by dependencies |

---

### RejectionBadge

Displays rejection count with icon.

```tsx
import { RejectionBadge } from '@/components/rejection-badge';

<RejectionBadge count={2} />
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| count | number | Number of rejections |

**Behavior**: Only renders if count > 0.

---

## Agent Components

### AgentStatusBar

Fixed bottom bar showing all agent statuses.

```tsx
import { AgentStatusBar } from '@/components/agent-status-bar';

<AgentStatusBar agents={agents} />
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| agents | Record<string, Agent> | Agent name to status mapping |

**Test IDs**

- `agent-status-bar` - Bar container
- `agent-badge-{name}` - Individual agent badge

---

### AgentBadge

Individual agent status indicator.

```tsx
import { AgentBadge } from '@/components/agent-badge';

<AgentBadge
  name="Hannibal"
  status="working"
  currentItem="004"
/>
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| name | string | Agent display name |
| status | AgentStatus | idle, working, or blocked |
| currentItem | string? | ID of item being worked on |

**Status Colors**

| Status | Color |
|--------|-------|
| idle | Gray |
| working | Green |
| blocked | Red |

---

## Panel Components

### LiveFeedPanel

Right side panel with activity feed and input tabs.

```tsx
import { LiveFeedPanel } from '@/components/live-feed-panel';

<LiveFeedPanel activities={activities} />
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| activities | ActivityEntry[] | Activity log entries |

**Test IDs**

- `live-feed-panel` - Panel container

**Tabs**

- **Live Feed**: Real-time activity stream
- **Human Input**: Input/command interface (placeholder)

---

### WorkItemModal

Full-featured modal dialog for viewing work item details, including acceptance criteria and rejection history.

```tsx
import { WorkItemModal } from '@/components/work-item-modal';

<WorkItemModal
  item={selectedItem}
  open={isOpen}
  onClose={() => setIsOpen(false)}
  agentName="B.A."
/>
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| item | WorkItem \| null | Item to display |
| open | boolean | Whether modal is visible |
| onClose | () => void | Close handler |
| agentName | string? | Currently assigned agent |

**Sections**
- Header: ID, type badge, status, close button
- Title bar: Item title, agent badge, rejection count
- Objective: Full description from markdown body
- Acceptance criteria: Parsed checklist from markdown
- Rejection history: Table of past rejections (if any)
- Current status: Stage and assignment info

**Keyboard Support**
- ESC: Close modal
- Click outside: Close modal

---

### NotificationDot

Pulsing notification indicator for tabs or buttons.

```tsx
import { NotificationDot } from '@/components/notification-dot';

<NotificationDot count={3} />
```

**Props**

| Prop | Type | Description |
|------|------|-------------|
| count | number? | Optional count to display |

**Behavior**
- Renders amber pulsing dot
- Shows count badge if count > 1
- Used on Human Input tab when items are blocked

---

## Base UI Components (shadcn/ui)

These components are from shadcn/ui and provide the foundation:

| Component | Usage |
|-----------|-------|
| `Card` | Container for work items |
| `Badge` | Status and type indicators |
| `Tabs` | Panel tab navigation |
| `Tooltip` | Hover information |
| `ScrollArea` | Scrollable containers |
| `Button` | Interactive buttons |
| `Separator` | Visual dividers |
| `Dialog` | Modal dialogs |
| `Progress` | Progress bars |

---

## Hooks

### useBoardData

Fetches and manages board state.

```tsx
import { useBoardData } from '@/hooks/use-board-data';

const { metadata, items, loading, error, refetch } = useBoardData();
```

**Returns**

| Property | Type | Description |
|----------|------|-------------|
| metadata | BoardMetadata | null | Board configuration and stats |
| items | WorkItem[] | All work items |
| loading | boolean | Loading state |
| error | Error | null | Error if fetch failed |
| refetch | () => void | Trigger data refetch |

---

### useBoardEvents

Manages SSE connection for real-time updates with granular connection state tracking.

```tsx
import { useBoardEvents } from '@/hooks/use-board-events';

const { isConnected, connectionState, connectionError } = useBoardEvents({
  onItemAdded: (item) => addItem(item),
  onItemMoved: (id, from, to) => moveItem(id, from, to),
  onItemUpdated: (item) => updateItem(item),
  onItemDeleted: (id) => deleteItem(id),
  onBoardUpdated: (board) => setBoard(board),
  onActivityEntry: (entry) => appendEntry(entry),
  enabled: true,
});
```

**Options**

| Option | Type | Description |
|--------|------|-------------|
| onItemAdded | (item: WorkItem) => void | New item created |
| onItemMoved | (id, from, to) => void | Item moved between stages |
| onItemUpdated | (item: WorkItem) => void | Item content changed |
| onItemDeleted | (id: string) => void | Item deleted |
| onBoardUpdated | (board: BoardMetadata) => void | Board metadata changed |
| onActivityEntry | (entry: LogEntry) => void | New activity log entry |
| enabled | boolean | Whether to connect (default: true) |

**Returns**

| Property | Type | Description |
|----------|------|-------------|
| isConnected | boolean | True if connectionState is 'connected' |
| connectionState | ConnectionStatus | 'connecting' \| 'connected' \| 'disconnected' \| 'error' |
| connectionError | Error \| null | Error details if connection failed |

**Connection Lifecycle**
1. Hook mounts → state: `connecting`
2. Connection established → state: `connected`
3. Connection lost → state: `connecting` (with retry)
4. Max retries exceeded → state: `error` (with connectionError)
5. `enabled: false` → state: `disconnected`

---

## Testing

All components have corresponding test files in `src/__tests__/`. Tests use:

- **Vitest** as the test runner
- **React Testing Library** for component testing
- **jsdom** as the DOM environment

Run tests with:

```bash
npm test
```
