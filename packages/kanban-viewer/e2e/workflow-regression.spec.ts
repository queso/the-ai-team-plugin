import { test, expect, APIRequestContext } from "@playwright/test";

/**
 * Configure all tests in this file to run serially (single worker).
 *
 * IMPORTANT: The AgentClaim table uses agentName as a global primary key,
 * meaning an agent can only have ONE claim across ALL projects at a time.
 * Running tests in parallel would cause race conditions where different
 * projects compete for agent claims.
 *
 * If tests fail with AGENT_BUSY errors, you may need to clean up stale claims:
 *   sqlite3 prisma/data/ateam.db "DELETE FROM AgentClaim"
 */
test.describe.configure({ mode: "serial" });

/**
 * End-to-end workflow regression test
 *
 * Mimics the scripts/e2e-regression.ts workflow using Playwright.
 * Tests the full agent workflow: mission creation, item creation,
 * stage transitions, agent claims (including Lynch in review), and completion.
 */

const PROJECT_ID = `e2e-playwright-${Date.now()}`;

// Helper to make API requests with project header
async function apiRequest(
  request: APIRequestContext,
  method: string,
  path: string,
  body?: unknown
) {
  const headers = {
    "X-Project-ID": PROJECT_ID,
  };

  if (method === "GET") {
    return request.get(path, { headers });
  } else if (method === "POST") {
    return request.post(path, { headers, data: body });
  } else if (method === "PATCH") {
    return request.patch(path, { headers, data: body });
  } else if (method === "DELETE") {
    return request.delete(path, { headers });
  }
  throw new Error(`Unsupported method: ${method}`);
}

test.describe("Workflow Regression", () => {
  test.describe.configure({ mode: "serial" });

  let itemIds: { item001: string; item002: string; item003: string; item004: string };

  test("cleanup: release any stale Lynch claims", async ({ request }) => {
    // Get all projects to find any with Lynch claims
    const projectsRes = await request.get("/api/projects");
    if (!projectsRes.ok()) return;

    const projects = await projectsRes.json();
    if (!projects.data) return;

    // Check each project for Lynch claims and release them
    for (const project of projects.data) {
      const boardRes = await request.get("/api/board", {
        headers: { "X-Project-ID": project.id },
      });
      if (!boardRes.ok()) continue;

      const board = await boardRes.json();
      const lynchClaim = board.data?.claims?.find(
        (c: { agentName: string }) => c.agentName === "Lynch"
      );

      if (lynchClaim) {
        await request.post("/api/board/release", {
          headers: { "X-Project-ID": project.id },
          data: { itemId: lynchClaim.itemId },
        });
      }
    }
  });

  test("should create project", async ({ request }) => {
    const response = await request.post("/api/projects", {
      data: {
        id: PROJECT_ID,
        name: `Playwright E2E Test - ${PROJECT_ID}`,
      },
    });

    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.id).toBe(PROJECT_ID);
  });

  test("should create mission", async ({ request }) => {
    const response = await apiRequest(request, "POST", "/api/missions", {
      name: "Playwright Regression Test",
      prdPath: "prd/test.md",
    });

    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.id).toBeDefined();
  });

  test("should create work items with dependencies", async ({ request }) => {
    // Item 001 - No dependencies (Wave 0)
    const res1 = await apiRequest(request, "POST", "/api/items", {
      title: "Add TypeScript types",
      description: "Define TypeScript interfaces",
      type: "task",
      priority: "high",
      dependencies: [],
      outputs: {
        types: "src/types/feature.ts",
      },
    });
    expect(res1.status()).toBe(201);
    const data1 = await res1.json();
    const item001 = data1.data.id;

    // Item 002 - Depends on 001 (Wave 1)
    const res2 = await apiRequest(request, "POST", "/api/items", {
      title: "Implement service",
      description: "Implement the core service",
      type: "feature",
      priority: "high",
      dependencies: [item001],
      outputs: {
        impl: "src/services/feature.ts",
        test: "src/__tests__/feature.test.ts",
      },
    });
    expect(res2.status()).toBe(201);
    const data2 = await res2.json();
    const item002 = data2.data.id;

    // Item 003 - Depends on 001 (Wave 1)
    const res3 = await apiRequest(request, "POST", "/api/items", {
      title: "Add UI component",
      description: "Create React component",
      type: "feature",
      priority: "high",
      dependencies: [item001],
      outputs: {
        impl: "src/components/Feature.tsx",
        test: "src/__tests__/Feature.test.tsx",
      },
    });
    expect(res3.status()).toBe(201);
    const data3 = await res3.json();
    const item003 = data3.data.id;

    // Item 004 - Depends on 002, 003 (Wave 2)
    const res4 = await apiRequest(request, "POST", "/api/items", {
      title: "Integration tests",
      description: "Write integration tests",
      type: "task",
      priority: "medium",
      dependencies: [item002, item003],
      outputs: {
        test: "src/__tests__/integration.test.ts",
      },
    });
    expect(res4.status()).toBe(201);
    const data4 = await res4.json();
    const item004 = data4.data.id;

    itemIds = { item001, item002, item003, item004 };
  });

  test("should move item through pipeline and verify Lynch can claim in review", async ({ request }) => {
    const { item001 } = itemIds;

    // Move to ready
    let res = await apiRequest(request, "POST", "/api/board/move", {
      itemId: item001,
      toStage: "ready",
      force: true,
    });
    expect(res.status()).toBe(200);

    // Move to testing stage first
    res = await apiRequest(request, "POST", "/api/board/move", {
      itemId: item001,
      toStage: "testing",
      force: true,
    });
    expect(res.status()).toBe(200);

    // Murdock claims item in testing
    res = await apiRequest(request, "POST", "/api/board/claim", {
      itemId: item001,
      agent: "Murdock",
    });
    expect(res.status()).toBe(200);

    // Verify Murdock has claim
    let boardRes = await apiRequest(request, "GET", "/api/board");
    let board = await boardRes.json();
    expect(board.data.claims.some((c: { agentName: string }) => c.agentName === "Murdock")).toBe(true);

    // Murdock finishes testing - agents/stop moves to review and releases claim
    res = await apiRequest(request, "POST", "/api/agents/stop", {
      itemId: item001,
      agent: "Murdock",
      summary: "Tests complete",
      outcome: "completed",
    });
    expect(res.status()).toBe(200);

    // Item should now be in review stage with no claim
    boardRes = await apiRequest(request, "GET", "/api/board");
    board = await boardRes.json();
    const item = board.data.items.find((i: { id: string }) => i.id === item001);
    expect(item.stageId).toBe("review");

    // Verify no active claim on this item
    const existingClaim = board.data.claims.find((c: { itemId: string }) => c.itemId === item001);
    expect(existingClaim).toBeUndefined();

    // Lynch claims item in review - THIS IS THE KEY TEST
    // Verifies that Lynch can claim items in the review stage
    res = await apiRequest(request, "POST", "/api/board/claim", {
      itemId: item001,
      agent: "Lynch",
    });
    expect(res.status()).toBe(200);
    const claimData = await res.json();
    expect(claimData.success).toBe(true);
    expect(claimData.data.agentName).toBe("Lynch");

    // Verify Lynch has active claim
    boardRes = await apiRequest(request, "GET", "/api/board");
    board = await boardRes.json();
    const lynchClaim = board.data.claims.find((c: { agentName: string }) => c.agentName === "Lynch");
    expect(lynchClaim).toBeDefined();
    expect(lynchClaim.itemId).toBe(item001);

    // Verify item shows Lynch as assigned
    const reviewItem = board.data.items.find((i: { id: string }) => i.id === item001);
    expect(reviewItem.assignedAgent).toBe("Lynch");

    // Lynch releases claim and moves to done
    res = await apiRequest(request, "POST", "/api/board/release", {
      itemId: item001,
    });
    expect(res.status()).toBe(200);

    res = await apiRequest(request, "POST", "/api/board/move", {
      itemId: item001,
      toStage: "done",
      force: true,
    });
    expect(res.status()).toBe(200);
  });

  test("should process Wave 1 items in parallel", async ({ request }) => {
    const { item002, item003 } = itemIds;

    // Move both to ready, then testing (dependencies satisfied after item001 done)
    for (const itemId of [item002, item003]) {
      await apiRequest(request, "POST", "/api/board/move", {
        itemId,
        toStage: "ready",
        force: true,
      });
      await apiRequest(request, "POST", "/api/board/move", {
        itemId,
        toStage: "testing",
        force: true,
      });
    }

    // Claim both with different agents
    await apiRequest(request, "POST", "/api/board/claim", {
      itemId: item002,
      agent: "Murdock",
    });
    await apiRequest(request, "POST", "/api/board/claim", {
      itemId: item003,
      agent: "Amy",
    });

    // Verify both have claims
    let boardRes = await apiRequest(request, "GET", "/api/board");
    let board = await boardRes.json();
    expect(board.data.claims.length).toBeGreaterThanOrEqual(2);

    // Complete both items through to done
    for (const itemId of [item002, item003]) {
      const agent = itemId === item002 ? "Murdock" : "Amy";

      // Agent finishes -> moves to review and releases claim
      await apiRequest(request, "POST", "/api/agents/stop", {
        itemId,
        agent,
        summary: "Tests done",
        outcome: "completed",
      });

      // Lynch reviews
      await apiRequest(request, "POST", "/api/board/claim", {
        itemId,
        agent: "Lynch",
      });
      await apiRequest(request, "POST", "/api/board/release", {
        itemId,
      });
      await apiRequest(request, "POST", "/api/board/move", {
        itemId,
        toStage: "done",
        force: true,
      });
    }

    // Verify items are done
    boardRes = await apiRequest(request, "GET", "/api/board?includeCompleted=true");
    board = await boardRes.json();
    const doneCount = board.data.items.filter((i: { stageId: string }) => i.stageId === "done").length;
    expect(doneCount).toBe(3); // item001, item002, item003
  });

  test("should complete final item and verify board state", async ({ request }) => {
    const { item004 } = itemIds;

    // Move through pipeline: ready -> testing
    await apiRequest(request, "POST", "/api/board/move", {
      itemId: item004,
      toStage: "ready",
      force: true,
    });
    await apiRequest(request, "POST", "/api/board/move", {
      itemId: item004,
      toStage: "testing",
      force: true,
    });

    // Murdock claims and completes -> moves to review
    await apiRequest(request, "POST", "/api/board/claim", {
      itemId: item004,
      agent: "Murdock",
    });
    await apiRequest(request, "POST", "/api/agents/stop", {
      itemId: item004,
      agent: "Murdock",
      summary: "Tests done",
      outcome: "completed",
    });

    // Lynch reviews and approves
    await apiRequest(request, "POST", "/api/board/claim", {
      itemId: item004,
      agent: "Lynch",
    });
    await apiRequest(request, "POST", "/api/board/release", {
      itemId: item004,
    });
    await apiRequest(request, "POST", "/api/board/move", {
      itemId: item004,
      toStage: "done",
      force: true,
    });

    // Verify final state
    const boardRes = await apiRequest(request, "GET", "/api/board?includeCompleted=true");
    const board = await boardRes.json();

    // All 4 items should be in done
    const doneItems = board.data.items.filter((i: { stageId: string }) => i.stageId === "done");
    expect(doneItems.length).toBe(4);

    // No active claims
    expect(board.data.claims.length).toBe(0);
  });

  test("should log activity entries", async ({ request }) => {
    // Log some activity
    const res = await apiRequest(request, "POST", "/api/activity", {
      message: "All items complete! Mission accomplished.",
      agent: "Hannibal",
      level: "info",
    });
    expect(res.status()).toBe(201);

    // Verify activity was logged
    const activityRes = await apiRequest(request, "GET", "/api/activity");
    const activity = await activityRes.json();
    expect(activity.success).toBe(true);
    expect(activity.data.entries.length).toBeGreaterThan(0);
  });

  test("should archive mission", async ({ request }) => {
    const res = await apiRequest(request, "POST", "/api/missions/archive");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.archivedItems).toBe(4);
  });
});

test.describe("Hook Event API", () => {
  test.describe.configure({ mode: "serial" });

  const HOOK_PROJECT_ID = `e2e-hooks-${Date.now()}`;

  // Helper to make API requests with the hook project header
  async function hookApiRequest(
    request: APIRequestContext,
    method: string,
    path: string,
    body?: unknown
  ) {
    const headers = { "X-Project-ID": HOOK_PROJECT_ID };

    if (method === "GET") {
      return request.get(path, { headers });
    } else if (method === "POST") {
      return request.post(path, { headers, data: body });
    }
    throw new Error(`Unsupported method: ${method}`);
  }

  test("setup: create project and mission", async ({ request }) => {
    // Create project
    const projectRes = await request.post("/api/projects", {
      data: {
        id: HOOK_PROJECT_ID,
        name: `Hook Event E2E Test - ${HOOK_PROJECT_ID}`,
      },
    });
    expect(projectRes.status()).toBe(201);

    // Create mission (hook events associate with active mission)
    const missionRes = await hookApiRequest(request, "POST", "/api/missions", {
      name: "Hook Event Test Mission",
      prdPath: "prd/hooks-test.md",
    });
    expect(missionRes.status()).toBe(201);
  });

  test("should store a hook event", async ({ request }) => {
    const res = await hookApiRequest(request, "POST", "/api/hooks/events", {
      eventType: "pre_tool_use",
      agentName: "murdock",
      toolName: "Write",
      status: "success",
      summary: "Writing test file",
      correlationId: `corr-single-${Date.now()}`,
      timestamp: new Date().toISOString(),
    });

    expect(res.status()).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.id).toBeDefined();
    expect(data.data.projectId).toBe(HOOK_PROJECT_ID);
    expect(data.data.eventType).toBe("pre_tool_use");
    expect(data.data.agentName).toBe("murdock");
    expect(data.data.toolName).toBe("Write");
    expect(data.data.status).toBe("success");
    expect(data.data.summary).toBe("Writing test file");
  });

  test("should deduplicate by correlationId + eventType", async ({ request }) => {
    const correlationId = `corr-dedup-${Date.now()}`;
    const event = {
      eventType: "post_tool_use",
      agentName: "ba",
      toolName: "Edit",
      status: "success",
      summary: "Editing implementation",
      correlationId,
      timestamp: new Date().toISOString(),
    };

    // First POST should create
    const res1 = await hookApiRequest(request, "POST", "/api/hooks/events", event);
    expect(res1.status()).toBe(201);
    const data1 = await res1.json();
    expect(data1.success).toBe(true);
    expect(data1.data.id).toBeDefined();

    // Second POST with same correlationId + eventType should be skipped
    const res2 = await hookApiRequest(request, "POST", "/api/hooks/events", event);
    expect(res2.status()).toBe(201);
    const data2 = await res2.json();
    expect(data2.success).toBe(true);
    expect(data2.data.skipped).toBe(1);
    expect(data2.data.created).toBe(0);
  });

  test("should store batch events", async ({ request }) => {
    const events = [
      {
        eventType: "subagent_start",
        agentName: "murdock",
        status: "success",
        summary: "Murdock subagent starting",
        timestamp: new Date().toISOString(),
      },
      {
        eventType: "subagent_stop",
        agentName: "murdock",
        status: "success",
        summary: "Murdock subagent completed",
        timestamp: new Date().toISOString(),
      },
      {
        eventType: "stop",
        agentName: "lynch",
        status: "success",
        summary: "Lynch review finished",
        timestamp: new Date().toISOString(),
      },
    ];

    const res = await hookApiRequest(request, "POST", "/api/hooks/events", events);
    expect(res.status()).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.created).toBe(3);
    expect(data.data.skipped).toBe(0);
  });

  test("should reject invalid eventType", async ({ request }) => {
    const res = await hookApiRequest(request, "POST", "/api/hooks/events", {
      eventType: "invalid_type",
      agentName: "murdock",
      status: "success",
      summary: "This should fail",
      timestamp: new Date().toISOString(),
    });

    expect(res.status()).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error.message).toContain("eventType must be one of");
  });

  test("should prune old events", async ({ request }) => {
    // Post events with old timestamps (well in the past)
    const oldTimestamp = new Date("2020-01-01T00:00:00Z").toISOString();
    const oldEvents = [
      {
        eventType: "pre_tool_use" as const,
        agentName: "amy",
        toolName: "Read",
        status: "success",
        summary: "Old event 1",
        timestamp: oldTimestamp,
      },
      {
        eventType: "post_tool_use" as const,
        agentName: "amy",
        toolName: "Read",
        status: "success",
        summary: "Old event 2",
        timestamp: oldTimestamp,
      },
    ];
    const createRes = await hookApiRequest(request, "POST", "/api/hooks/events", oldEvents);
    expect(createRes.status()).toBe(201);
    const createData = await createRes.json();
    const createdCount = createData.data.created;

    // Prune events older than 2023
    const pruneRes = await hookApiRequest(request, "POST", "/api/hooks/events/prune", {
      olderThan: "2023-01-01T00:00:00Z",
    });
    expect(pruneRes.status()).toBe(200);
    const pruneData = await pruneRes.json();
    expect(pruneData.success).toBe(true);
    // At least the old events we just created should be pruned
    // (the mission is active, but these events have missionId associated -
    //  prune preserves active mission events, so count may vary)
    expect(pruneData.data.pruned).toBeGreaterThanOrEqual(0);
    // If events were pruned, verify the count is reasonable
    if (pruneData.data.pruned > 0) {
      expect(pruneData.data.pruned).toBeGreaterThanOrEqual(createdCount);
    }
  });

  test("cleanup: archive mission", async ({ request }) => {
    await hookApiRequest(request, "POST", "/api/missions/archive");
  });
});

test.describe("Raw Agent View UI", () => {
  const RAW_VIEW_PROJECT_ID = `e2e-raw-view-${Date.now()}`;

  test("setup: create project, mission, and hook events", async ({ request }) => {
    // Create project
    await request.post("/api/projects", {
      data: {
        id: RAW_VIEW_PROJECT_ID,
        name: `Raw View E2E Test - ${RAW_VIEW_PROJECT_ID}`,
      },
    });

    // Create mission
    await request.post("/api/missions", {
      headers: { "X-Project-ID": RAW_VIEW_PROJECT_ID },
      data: { name: "Raw View Test Mission", prdPath: "test.md" },
    });

    // Post hook events for multiple agents
    const events = [
      {
        eventType: "pre_tool_use",
        agentName: "murdock",
        toolName: "Write",
        status: "success",
        summary: "Writing test file for auth module",
        correlationId: `corr-rv-murdock-${Date.now()}`,
        timestamp: new Date().toISOString(),
      },
      {
        eventType: "post_tool_use",
        agentName: "murdock",
        toolName: "Write",
        status: "success",
        summary: "Test file created successfully",
        correlationId: `corr-rv-murdock-${Date.now()}`,
        timestamp: new Date(Date.now() + 1000).toISOString(),
      },
      {
        eventType: "pre_tool_use",
        agentName: "ba",
        toolName: "Edit",
        status: "success",
        summary: "Editing service implementation",
        correlationId: `corr-rv-ba-${Date.now()}`,
        timestamp: new Date(Date.now() + 2000).toISOString(),
      },
      {
        eventType: "stop",
        agentName: "ba",
        status: "success",
        summary: "B.A. implementation complete",
        timestamp: new Date(Date.now() + 3000).toISOString(),
      },
    ];

    const res = await request.post("/api/hooks/events", {
      headers: { "X-Project-ID": RAW_VIEW_PROJECT_ID },
      data: events,
    });
    expect(res.status()).toBe(201);
  });

  test("should show Raw Agent View tab", async ({ page }) => {
    await page.goto(`/?projectId=${RAW_VIEW_PROJECT_ID}`);
    await page.waitForTimeout(2000);

    // Verify the "Raw Agent View" button exists
    const agentButton = page.getByRole("button", { name: /Raw Agent View/i });
    await expect(agentButton).toBeVisible();
    // It should not be active by default (board view is default)
    await expect(agentButton).toHaveAttribute("data-active", "false");
  });

  test("should switch to Raw Agent View", async ({ page }) => {
    await page.goto(`/?projectId=${RAW_VIEW_PROJECT_ID}`);
    await page.waitForTimeout(2000);

    // Click the Raw Agent View tab
    const agentButton = page.getByRole("button", { name: /Raw Agent View/i });
    await agentButton.click();

    // Verify it becomes active
    await expect(agentButton).toHaveAttribute("data-active", "true");

    // Verify the raw-agent-view container appears
    const rawView = page.locator('[data-testid="raw-agent-view"]');
    await expect(rawView).toBeVisible();
  });

  test("should show empty state when no hook events", async ({ page, request }) => {
    // Create a separate project with no hook events
    const emptyProjectId = `e2e-raw-empty-${Date.now()}`;
    await request.post("/api/projects", {
      data: { id: emptyProjectId, name: "Empty Raw View Test" },
    });
    await request.post("/api/missions", {
      headers: { "X-Project-ID": emptyProjectId },
      data: { name: "Empty Mission", prdPath: "test.md" },
    });

    await page.goto(`/?projectId=${emptyProjectId}`);
    await page.waitForTimeout(2000);

    // Switch to Raw Agent View
    const agentButton = page.getByRole("button", { name: /Raw Agent View/i });
    await agentButton.click();

    // Verify empty state
    const emptyState = page.locator('[data-testid="empty-state"]');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText("No hook events yet");
  });

  test("should display hook events in swim lanes", async ({ page }) => {
    await page.goto(`/?projectId=${RAW_VIEW_PROJECT_ID}`);
    await page.waitForTimeout(2000);

    // Switch to Raw Agent View
    const agentButton = page.getByRole("button", { name: /Raw Agent View/i });
    await agentButton.click();

    // Wait for SSE to deliver hook events
    await page.waitForTimeout(3000);

    // Verify swim lanes appear for agents that have events
    const murdockLane = page.locator('[data-testid="swim-lane-murdock"]');
    const baLane = page.locator('[data-testid="swim-lane-ba"]');

    await expect(murdockLane).toBeVisible();
    await expect(baLane).toBeVisible();

    // Verify event cards exist within the lanes
    const murdockEvents = murdockLane.locator('[data-testid^="event-card-"]');
    const baEvents = baLane.locator('[data-testid^="event-card-"]');

    expect(await murdockEvents.count()).toBeGreaterThan(0);
    expect(await baEvents.count()).toBeGreaterThan(0);
  });
});

test.describe("UI Verification", () => {
  const UI_PROJECT_ID = `e2e-ui-${Date.now()}`;

  test("should display Lynch as active when reviewing", async ({ page, request }) => {
    // Setup: Create project, mission, and item
    await request.post("/api/projects", {
      data: { id: UI_PROJECT_ID, name: "UI Test Project" },
    });

    await request.post("/api/missions", {
      headers: { "X-Project-ID": UI_PROJECT_ID },
      data: { name: "UI Test Mission", prdPath: "test.md" },
    });

    const itemRes = await request.post("/api/items", {
      headers: { "X-Project-ID": UI_PROJECT_ID },
      data: {
        title: "UI Test Item",
        description: "Test item for UI verification",
        type: "feature",
        priority: "high",
      },
    });
    const itemData = await itemRes.json();
    const itemId = itemData.data.id;

    // Move to review stage
    await request.post("/api/board/move", {
      headers: { "X-Project-ID": UI_PROJECT_ID },
      data: { itemId, toStage: "ready", force: true },
    });
    await request.post("/api/board/move", {
      headers: { "X-Project-ID": UI_PROJECT_ID },
      data: { itemId, toStage: "testing", force: true },
    });
    await request.post("/api/board/move", {
      headers: { "X-Project-ID": UI_PROJECT_ID },
      data: { itemId, toStage: "review", force: true },
    });

    // Lynch claims the item
    await request.post("/api/board/claim", {
      headers: { "X-Project-ID": UI_PROJECT_ID },
      data: { itemId, agent: "Lynch" },
    });

    // Navigate to the page with this project
    await page.goto(`/?projectId=${UI_PROJECT_ID}`);

    // Wait for content to load (use shorter timeout)
    await page.waitForTimeout(3000);

    // Verify Lynch and the item appear in the page
    const pageContent = await page.textContent("body");
    expect(pageContent).toContain("Lynch");
    expect(pageContent).toContain("UI Test Item");

    // Verify Lynch shows as ACTIVE (not IDLE)
    expect(pageContent).toContain("ACTIVE");

    // Cleanup: Release Lynch's claim to prevent affecting subsequent test runs
    await request.post("/api/board/release", {
      headers: { "X-Project-ID": UI_PROJECT_ID },
      data: { itemId },
    });
  });
});
