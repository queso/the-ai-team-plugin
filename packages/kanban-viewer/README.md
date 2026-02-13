# Kanban Board Viewer

A real-time kanban board application built with Next.js 16, React 19, and Server-Sent Events (SSE). Displays work items organized by stage with live updates, agent status tracking, and responsive design.

## Features

- **8-Column Board Layout**: Briefings, Ready, Probing, Testing, Implementing, Review, Done, Blocked
- **Real-Time Updates**: Server-Sent Events for live board state synchronization
- **Multi-Project Support**: Isolate work items, missions, and activity logs per project
- **Filter Bar**: Filter by Type, Agent, Status with search input and keyboard shortcuts
- **Project Selector**: Dropdown to switch between projects with auto-creation on first use
- **Work Item Cards**: Type badges, dependency indicators, rejection counts, hover animations
- **Work Item Modal**: Click any card for full details, acceptance criteria, rejection history
- **Agent Status Bar**: Real-time status for 7 agents (Hannibal, Face, Murdock, B.A., Amy, Lynch, Tawnia)
- **Mission Completion Flow**: Final review, post-checks (lint/typecheck/test/build), documentation phase
- **Mission Timer**: Elapsed time with freeze on completion and resume on reopen
- **Live Feed Panel**: Real-time activity log streaming and human input tabs
- **Dark Mode**: Native dark theme with carefully tuned color palette
- **Typography**: Inter for UI, JetBrains Mono for code/logs
- **Responsive Design**: Desktop, tablet, and mobile layouts
- **Editable WIP Limits**: Click-to-edit column limits with color states (yellow at limit, red over limit)
- **Connection Status**: Visual indicator showing SSE connection health
- **Animations**: Smooth card entrance/exit animations and column transitions
- **Keyboard Shortcuts**: `/` or `Cmd+K` to focus search, `Escape` to clear
- **Output File Tracking**: Track generated test, implementation, and types files for each item

## Tech Stack

- **Framework**: Next.js 16.1.2 (App Router, Turbopack)
- **UI**: React 19.2.3, Tailwind CSS 4, shadcn/ui components
- **Database**: SQLite with Prisma ORM (10 models with multi-project support)
- **Testing**: Vitest (2600+ unit tests), Playwright (27 e2e tests)
- **Data**: YAML frontmatter parsing with gray-matter (legacy), Prisma (API)
- **Error Handling**: Standardized error factories with typed error codes

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
npm install
npx prisma generate
npx prisma db push
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the board.

### Testing

```bash
# Unit tests
npm test

# E2E tests
npx playwright test
```

### Build

```bash
npm run build
npm start
```

## Multi-Project Support

All API requests must include the `X-Project-ID` header. Projects are automatically created on first use:

```bash
curl -H "X-Project-ID: my-project" http://localhost:3000/api/board
```

The UI includes a project selector dropdown. URL format:

```
http://localhost:3000/?projectId=my-project
```

Project IDs:
- Alphanumeric characters, hyphens, underscores only
- Max 100 characters
- Case-insensitive (normalized to lowercase)

Each project isolates:
- Work items and their dependencies
- Missions and their history
- Activity logs
- Agent claims

### Docker

The easiest way to run is with Docker Compose:

```bash
# Start (uses existing image or builds if needed)
docker compose up -d

# Rebuild after code changes
docker compose up -d --build

# Stop
docker compose down
```

Or manually:

```bash
# Build the image
docker build -t kanban-viewer .

# Run with database persistence (bind mount to local prisma/data)
docker run -d --name kanban-viewer -p 3000:3000 \
  -v "$(pwd)/prisma/data:/app/prisma/data" \
  kanban-viewer
```

**Important**: Use a bind mount (`-v $(pwd)/prisma/data:/app/prisma/data`) to persist database changes. A named volume may use stale data from previous builds.

## Project Structure

```
src/
├── app/
│   ├── api/board/           # API routes
│   │   ├── metadata/        # Board metadata endpoint
│   │   ├── items/           # All work items endpoint
│   │   ├── activity/        # Activity log endpoint
│   │   ├── events/          # SSE streaming endpoint
│   │   ├── stage/[stage]/   # Items by stage endpoint
│   │   └── item/[id]/       # Single item endpoint
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Main board page
├── components/
│   ├── ui/                  # shadcn/ui base components
│   ├── agent-badge.tsx      # Individual agent status
│   ├── agent-status-bar.tsx # Bottom status bar
│   ├── board-column.tsx     # Kanban column with animations
│   ├── connection-status-indicator.tsx # SSE connection status
│   ├── dependency-indicator.tsx
│   ├── filter-bar.tsx       # Filter dropdowns and search
│   ├── header-bar.tsx       # Top navigation bar with timer
│   ├── live-feed-panel.tsx  # Right side panel
│   ├── mission-completion-panel.tsx # Mission completion flow UI
│   ├── mission-timer.tsx    # Elapsed time display
│   ├── notification-dot.tsx # Tab notification indicator
│   ├── progress-bar.tsx     # Mission progress
│   ├── rejection-badge.tsx  # Rejection count
│   ├── responsive-board.tsx # Layout wrapper
│   ├── type-badge.tsx       # Work item type
│   ├── work-item-card.tsx   # Card with hover animations
│   └── work-item-modal.tsx  # Full item detail modal
├── hooks/
│   ├── use-board-data.ts    # Data fetching hook
│   ├── use-board-events.ts  # SSE connection hook
│   └── use-filter-state.ts  # Filter state management
├── lib/
│   ├── activity-log.ts      # Activity parsing
│   ├── db.ts                # Prisma client singleton
│   ├── dependency-utils.ts  # Dependency graph
│   ├── errors.ts            # API error classes
│   ├── filter-utils.ts      # Filter matching functions
│   ├── parser.ts            # YAML frontmatter parser
│   ├── sse-utils.ts         # SSE helpers
│   ├── stage-utils.ts       # Stage utilities
│   ├── stats.ts             # Statistics calculation
│   ├── utils.ts             # General utilities
│   └── validation.ts        # Transition and WIP validation
├── services/
│   ├── board-service.ts     # File system data layer (legacy)
│   └── prisma-board-service.ts  # Prisma-based data layer
├── types/
│   ├── index.ts             # Re-exports all types
│   ├── agent.ts             # Agent types
│   ├── api.ts               # API request/response types
│   ├── board.ts             # Board state types
│   ├── item.ts              # Item types
│   └── mission.ts           # Mission types
└── __tests__/               # Unit tests
```

## API Endpoints

### Board Operations
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/board` | GET | Full board state with stages, items, stats |
| `/api/board/move` | POST | Move item between stages |
| `/api/board/claim` | POST | Claim item for agent |
| `/api/board/release` | POST | Release agent claim |
| `/api/board/events` | GET | SSE stream for real-time updates |

### Stage Operations
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stages/[id]` | PATCH | Update stage WIP limit |

### Item Operations
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/items` | GET | List all items |
| `/api/items` | POST | Create new item |
| `/api/items/[id]` | GET | Get item with relations |
| `/api/items/[id]` | PATCH | Update item fields |
| `/api/items/[id]` | DELETE | Soft delete item |
| `/api/items/[id]/reject` | POST | Reject item with reason |
| `/api/items/[id]/render` | GET | Render item as markdown |

### Agent Operations
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agents/start` | POST | Start work (claim + move + log) |
| `/api/agents/stop` | POST | Stop work with outcome |

### Mission Operations
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/missions` | GET | List all missions |
| `/api/missions` | POST | Create new mission |
| `/api/missions/current` | GET | Get active mission |
| `/api/missions/precheck` | POST | Validate mission readiness |
| `/api/missions/postcheck` | POST | Validate mission completion |
| `/api/missions/archive` | POST | Archive mission and items |

### Project Operations
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/projects` | GET | List all projects |
| `/api/projects` | POST | Create new project |

### Utility Operations
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/deps/check` | GET | Validate dependency graph |
| `/api/activity` | GET | Get activity log entries |
| `/api/activity` | POST | Log activity entry |

### Legacy Endpoints (Dashboard)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/board/metadata` | GET | Board config, agents, stats |
| `/api/board/items` | GET | All work items |
| `/api/board/activity` | GET | Activity log entries |
| `/api/board/stage/[stage]` | GET | Items in specific stage |
| `/api/board/item/[id]` | GET | Single item by ID |

## Data Format

Work items are stored as markdown files with YAML frontmatter:

```yaml
---
id: "001"
title: "Define TypeScript interfaces"
type: feature
priority: high
assignee: Hannibal
dependencies: []
rejections: 0
---

## Description
Implementation details here...
```

## Documentation

See the [docs/](./docs) folder for detailed documentation:

- [Architecture](./docs/architecture.md) - System design and data flow
- [API Reference](./docs/api.md) - Endpoint specifications
- [Components](./docs/components.md) - UI component guide

## License

MIT
