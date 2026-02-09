import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBoardEvents } from "../hooks/use-board-events";
import type { ConnectionStatus } from "../types";

// Mock EventSource
class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readyState: number = 0;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  close() {
    this.readyState = 2;
  }

  // Helper to simulate open event
  simulateOpen() {
    this.readyState = 1;
    if (this.onopen) {
      this.onopen(new Event("open"));
    }
  }

  // Helper to simulate error event
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event("error"));
    }
  }
}

// Replace global EventSource
const originalEventSource = global.EventSource;
beforeEach(() => {
  MockEventSource.instances = [];
  (global as unknown as { EventSource: typeof MockEventSource }).EventSource = MockEventSource;
  vi.useFakeTimers();
});

afterEach(() => {
  (global as unknown as { EventSource: typeof EventSource }).EventSource = originalEventSource;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useBoardEvents - connectionState", () => {
  describe("initial state", () => {
    it("should have connectionState as 'connecting' on mount when enabled", () => {
      const { result } = renderHook(() => useBoardEvents({ projectId: 'kanban-viewer' }));

      // Before onopen fires, state should be 'connecting'
      expect(result.current.connectionState).toBe("connecting");
    });

    it("should have connectionState as 'disconnected' when enabled is false", () => {
      const { result } = renderHook(() => useBoardEvents({ projectId: 'kanban-viewer', enabled: false }));

      expect(result.current.connectionState).toBe("disconnected");
    });
  });

  describe("connected state", () => {
    it("should have connectionState as 'connected' after onopen fires", () => {
      const { result } = renderHook(() => useBoardEvents({ projectId: 'kanban-viewer' }));

      expect(result.current.connectionState).toBe("connecting");

      act(() => {
        MockEventSource.instances[0].simulateOpen();
      });

      expect(result.current.connectionState).toBe("connected");
    });

    it("should clear connectionError when transitioning to connected", () => {
      const { result } = renderHook(() => useBoardEvents({ projectId: 'kanban-viewer' }));

      // Simulate error then reconnect
      act(() => {
        MockEventSource.instances[0].simulateError();
      });

      // Fast-forward through reconnection delay
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // New connection opens successfully
      act(() => {
        MockEventSource.instances[1].simulateOpen();
      });

      expect(result.current.connectionState).toBe("connected");
      expect(result.current.connectionError).toBe(null);
    });
  });

  describe("connecting state during reconnection", () => {
    it("should have connectionState as 'connecting' during reconnection attempts", () => {
      const { result } = renderHook(() => useBoardEvents({ projectId: 'kanban-viewer' }));

      // Open connection
      act(() => {
        MockEventSource.instances[0].simulateOpen();
      });

      expect(result.current.connectionState).toBe("connected");

      // Connection drops
      act(() => {
        MockEventSource.instances[0].simulateError();
      });

      // During reconnection, state should be 'connecting' (not disconnected yet)
      expect(result.current.connectionState).toBe("connecting");
    });

    it("should remain 'connecting' while retries are available", () => {
      const { result } = renderHook(() => useBoardEvents({ projectId: 'kanban-viewer' }));

      // First error
      act(() => {
        MockEventSource.instances[0].simulateError();
      });

      expect(result.current.connectionState).toBe("connecting");

      // Wait for first reconnect
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Still connecting
      expect(result.current.connectionState).toBe("connecting");

      // Second error
      act(() => {
        MockEventSource.instances[1].simulateError();
      });

      // Still connecting (retries remain)
      expect(result.current.connectionState).toBe("connecting");
    });
  });

  describe("disconnected state", () => {
    it("should have connectionState as 'disconnected' only after max retries exceeded", () => {
      const { result } = renderHook(() => useBoardEvents({ projectId: 'kanban-viewer' }));

      // Delays for attempts 0-9: 1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000, 30000, 30000
      const delays = [1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000, 30000, 30000];

      // Simulate 11 failed connection attempts (need 11 to exhaust retries)
      for (let i = 0; i < 11; i++) {
        // Error on current instance
        act(() => {
          const currentInstance = MockEventSource.instances[MockEventSource.instances.length - 1];
          currentInstance.simulateError();
        });

        if (i < 10) {
          // During retries, should still be 'connecting'
          expect(result.current.connectionState).toBe("connecting");

          // Advance past the delay for next attempt
          act(() => {
            vi.advanceTimersByTime(delays[i]);
          });
        }
      }

      // After max retries, state should be 'error' (error takes precedence when connectionError is set)
      expect(result.current.connectionState).toBe("error");
    });

    it("should transition to 'disconnected' when enabled changes to false", () => {
      const { result, rerender } = renderHook(
        ({ enabled }) => useBoardEvents({ projectId: 'kanban-viewer', enabled }),
        { initialProps: { enabled: true } }
      );

      act(() => {
        MockEventSource.instances[0].simulateOpen();
      });

      expect(result.current.connectionState).toBe("connected");

      rerender({ enabled: false });

      expect(result.current.connectionState).toBe("disconnected");
    });
  });

  describe("error state", () => {
    it("should have connectionState as 'error' when connectionError is set", () => {
      const { result } = renderHook(() => useBoardEvents({ projectId: 'kanban-viewer' }));

      // Exhaust all retries to set connectionError
      const delays = [1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000, 30000, 30000];

      for (let i = 0; i < 11; i++) {
        act(() => {
          const currentInstance = MockEventSource.instances[MockEventSource.instances.length - 1];
          currentInstance.simulateError();
        });

        if (i < 10) {
          act(() => {
            vi.advanceTimersByTime(delays[i]);
          });
        }
      }

      // After max retries, connectionError should be set and state should be 'error'
      expect(result.current.connectionError).not.toBe(null);
      expect(result.current.connectionState).toBe("error");
    });

    it("should have error state take precedence over disconnected", () => {
      const { result } = renderHook(() => useBoardEvents({ projectId: 'kanban-viewer' }));

      // Exhaust all retries
      const delays = [1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000, 30000, 30000];

      for (let i = 0; i < 11; i++) {
        act(() => {
          const currentInstance = MockEventSource.instances[MockEventSource.instances.length - 1];
          currentInstance.simulateError();
        });

        if (i < 10) {
          act(() => {
            vi.advanceTimersByTime(delays[i]);
          });
        }
      }

      // With both error and disconnection conditions met, error should take precedence
      expect(result.current.connectionState).toBe("error");
      expect(result.current.connectionError?.message).toContain("maximum retries");
    });
  });

  describe("isConnected backward compatibility", () => {
    it("should have isConnected as false when connectionState is 'connecting'", () => {
      const { result } = renderHook(() => useBoardEvents({ projectId: 'kanban-viewer' }));

      expect(result.current.connectionState).toBe("connecting");
      expect(result.current.isConnected).toBe(false);
    });

    it("should have isConnected as true only when connectionState is 'connected'", () => {
      const { result } = renderHook(() => useBoardEvents({ projectId: 'kanban-viewer' }));

      expect(result.current.isConnected).toBe(false);

      act(() => {
        MockEventSource.instances[0].simulateOpen();
      });

      expect(result.current.connectionState).toBe("connected");
      expect(result.current.isConnected).toBe(true);
    });

    it("should have isConnected as false when connectionState is 'disconnected'", () => {
      const { result } = renderHook(() => useBoardEvents({ enabled: false }));

      expect(result.current.connectionState).toBe("disconnected");
      expect(result.current.isConnected).toBe(false);
    });

    it("should have isConnected as false when connectionState is 'error'", () => {
      const { result } = renderHook(() => useBoardEvents({ projectId: 'kanban-viewer' }));

      // Exhaust all retries to get to error state
      const delays = [1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000, 30000, 30000];

      for (let i = 0; i < 11; i++) {
        act(() => {
          const currentInstance = MockEventSource.instances[MockEventSource.instances.length - 1];
          currentInstance.simulateError();
        });

        if (i < 10) {
          act(() => {
            vi.advanceTimersByTime(delays[i]);
          });
        }
      }

      expect(result.current.connectionState).toBe("error");
      expect(result.current.isConnected).toBe(false);
    });

    it("should update isConnected correctly through connection lifecycle", () => {
      const { result } = renderHook(() => useBoardEvents({ projectId: 'kanban-viewer' }));

      // Initial: connecting
      expect(result.current.isConnected).toBe(false);
      expect(result.current.connectionState).toBe("connecting");

      // Open: connected
      act(() => {
        MockEventSource.instances[0].simulateOpen();
      });
      expect(result.current.isConnected).toBe(true);
      expect(result.current.connectionState).toBe("connected");

      // Error: connecting (reconnecting)
      act(() => {
        MockEventSource.instances[0].simulateError();
      });
      expect(result.current.isConnected).toBe(false);
      expect(result.current.connectionState).toBe("connecting");

      // Reconnect successful: connected
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      act(() => {
        MockEventSource.instances[1].simulateOpen();
      });
      expect(result.current.isConnected).toBe(true);
      expect(result.current.connectionState).toBe("connected");
    });
  });

  describe("state transitions", () => {
    it("should transition from connecting to connected on open", () => {
      const { result } = renderHook(() => useBoardEvents({ projectId: 'kanban-viewer' }));

      const states: ConnectionStatus[] = [];
      states.push(result.current.connectionState);

      act(() => {
        MockEventSource.instances[0].simulateOpen();
      });
      states.push(result.current.connectionState);

      expect(states).toEqual(["connecting", "connected"]);
    });

    it("should transition from connected to connecting on error (while retries remain)", () => {
      const { result } = renderHook(() => useBoardEvents({ projectId: 'kanban-viewer' }));

      act(() => {
        MockEventSource.instances[0].simulateOpen();
      });

      const connectedState = result.current.connectionState;

      act(() => {
        MockEventSource.instances[0].simulateError();
      });

      expect(connectedState).toBe("connected");
      expect(result.current.connectionState).toBe("connecting");
    });

    it("should transition to disconnected when re-enabled from disabled", () => {
      const { result, rerender } = renderHook(
        ({ enabled }) => useBoardEvents({ projectId: 'kanban-viewer', enabled }),
        { initialProps: { enabled: false } }
      );

      expect(result.current.connectionState).toBe("disconnected");

      rerender({ enabled: true });

      // Should immediately start connecting
      expect(result.current.connectionState).toBe("connecting");
    });
  });
});
