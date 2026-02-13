---
id: "024"
title: "SSE endpoint for real-time board updates"
type: "feature"
status: "pending"
dependencies: ["001", "005", "010"]
parallel_group: "api-layer"
rejection_count: 0
outputs:
  types: "src/app/api/board/events/route.ts"
  test: "src/__tests__/api-board-events.test.ts"
  impl: "src/app/api/board/events/route.ts"
---

## Objective

Create Next.js API route that returns a Server-Sent Events stream for real-time board updates using fs.watch() to monitor the mission directory.

## Acceptance Criteria

- [ ] GET /api/board/events returns text/event-stream response
- [ ] Uses fs.watch() with recursive option to monitor mission folder
- [ ] Emits item-added event when new .md file created in stage folder
- [ ] Emits item-moved event when .md file moves between folders
- [ ] Emits item-updated event when .md file content changes
- [ ] Emits item-deleted event when .md file removed
- [ ] Emits board-updated event when board.json changes
- [ ] Debounces rapid changes (100ms)
- [ ] Sends heartbeat every 30 seconds
- [ ] Properly cleans up watcher on connection close

## Context

This is the real-time update mechanism. The client connects on page load and receives push updates.

Next.js App Router SSE pattern:
```typescript
export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      // Set up fs.watch()
      // Send events via controller.enqueue()
    },
    cancel() {
      // Clean up watcher
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

Event format:
```
data: {"type":"item-moved","timestamp":"...","data":{...}}

```
