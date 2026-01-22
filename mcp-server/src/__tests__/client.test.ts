import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type {
  ClientConfig,
  ApiResponse,
  BoardState,
  BoardItem,
} from '../client/types.js';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Helper to create a mock Response
function createMockResponse(data: unknown, options: { status?: number; headers?: Record<string, string> } = {}) {
  const { status = 200, headers = {} } = options;
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Map(Object.entries(headers)),
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  };
}

describe('KanbanApiClient', () => {
  // We'll dynamically import the client to test it
  let createClient: (config: ClientConfig) => import('../client/types.js').KanbanApiClient;

  beforeEach(async () => {
    vi.resetModules();
    mockFetch.mockReset();
    // Dynamic import to get fresh module
    const clientModule = await import('../client/index.js');
    createClient = clientModule.createClient;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('HTTP Methods', () => {
    describe('GET requests', () => {
      it('should perform GET request successfully', async () => {
        const mockData: BoardState = {
          mission: 'test-mission',
          phases: ['ready', 'testing', 'implementing'],
          items: [],
          wip_limit: 3,
        };
        mockFetch.mockResolvedValueOnce(createMockResponse(mockData));

        const client = createClient({ baseUrl: 'http://localhost:3000' });
        const result = await client.get<BoardState>('/api/board');

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/board',
          expect.objectContaining({
            method: 'GET',
          })
        );
        expect(result.data).toEqual(mockData);
        expect(result.status).toBe(200);
      });

      it('should include authorization header when apiKey provided', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse({}));

        const client = createClient({
          baseUrl: 'http://localhost:3000',
          apiKey: 'secret-key-123',
        });
        await client.get('/api/board');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer secret-key-123',
            }),
          })
        );
      });
    });

    describe('POST requests', () => {
      it('should perform POST request with body', async () => {
        const requestBody = { title: 'New Item', type: 'feature' };
        const mockResponse: BoardItem = {
          id: '001',
          title: 'New Item',
          type: 'feature',
          status: 'pending',
        };
        mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse, { status: 201 }));

        const client = createClient({ baseUrl: 'http://localhost:3000' });
        const result = await client.post<BoardItem>('/api/items', requestBody);

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/items',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(requestBody),
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        );
        expect(result.data).toEqual(mockResponse);
        expect(result.status).toBe(201);
      });

      it('should handle POST without body', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }));

        const client = createClient({ baseUrl: 'http://localhost:3000' });
        await client.post('/api/trigger');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });

    describe('PUT requests', () => {
      it('should perform PUT request with body', async () => {
        const requestBody = { status: 'testing' };
        mockFetch.mockResolvedValueOnce(createMockResponse({ id: '001', status: 'testing' }));

        const client = createClient({ baseUrl: 'http://localhost:3000' });
        const result = await client.put<BoardItem>('/api/items/001', requestBody);

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/items/001',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify(requestBody),
          })
        );
        expect(result.status).toBe(200);
      });
    });

    describe('DELETE requests', () => {
      it('should perform DELETE request successfully', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse({ deleted: true }));

        const client = createClient({ baseUrl: 'http://localhost:3000' });
        const result = await client.delete('/api/items/001');

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/items/001',
          expect.objectContaining({
            method: 'DELETE',
          })
        );
        expect(result.data).toEqual({ deleted: true });
      });
    });
  });

  describe('Retry Logic with Exponential Backoff', () => {
    beforeEach(() => {
      // Speed up tests by mocking setTimeout
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should retry on 5xx errors with exponential backoff', async () => {
      // First two calls fail with 503, third succeeds
      mockFetch
        .mockResolvedValueOnce(createMockResponse({ error: 'Service unavailable' }, { status: 503 }))
        .mockResolvedValueOnce(createMockResponse({ error: 'Service unavailable' }, { status: 503 }))
        .mockResolvedValueOnce(createMockResponse({ success: true }));

      const client = createClient({ baseUrl: 'http://localhost:3000', retries: 3 });
      const requestPromise = client.get('/api/board');

      // Advance timer for first retry (1s)
      await vi.advanceTimersByTimeAsync(1000);
      // Advance timer for second retry (2s)
      await vi.advanceTimersByTimeAsync(2000);

      const result = await requestPromise;

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result.data).toEqual({ success: true });
    });

    it('should use 1s, 2s, 4s delays for exponential backoff', async () => {
      const delays: number[] = [];

      // Track actual delay values by spying on setTimeout
      // The spy intercepts calls, records delays >= 1000ms, then schedules with fake timers
      vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn: () => void, delay?: number) => {
        if (delay && delay >= 1000) {
          delays.push(delay);
        }
        // Execute immediately for test speed while still recording the delay
        queueMicrotask(() => fn());
        return 0 as unknown as ReturnType<typeof setTimeout>;
      });

      mockFetch
        .mockResolvedValueOnce(createMockResponse({ error: 'Error' }, { status: 500 }))
        .mockResolvedValueOnce(createMockResponse({ error: 'Error' }, { status: 500 }))
        .mockResolvedValueOnce(createMockResponse({ error: 'Error' }, { status: 500 }))
        .mockResolvedValueOnce(createMockResponse({ success: true }));

      const client = createClient({ baseUrl: 'http://localhost:3000', retries: 3 });
      await client.get('/api/board');

      // Expect delays of 1000ms, 2000ms, 4000ms (exponential backoff)
      expect(delays).toEqual([1000, 2000, 4000]);
    });

    it('should throw MaxRetriesExceededError when all retries exhausted', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ error: 'Server error' }, { status: 500 }));

      const client = createClient({ baseUrl: 'http://localhost:3000', retries: 3 });
      const requestPromise = client.get('/api/board');

      // Advance through all retry delays
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(4000);

      await expect(requestPromise).rejects.toThrow('Request failed after');
      expect(mockFetch).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });

    it('should not retry on 4xx client errors', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'Bad request' }, { status: 400 })
      );

      const client = createClient({ baseUrl: 'http://localhost:3000', retries: 3 });

      await expect(client.get('/api/board')).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(1); // No retries for client errors
    });

    it('should retry on network errors', async () => {
      const networkError = new Error('ECONNREFUSED');
      (networkError as any).code = 'ECONNREFUSED';

      mockFetch
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(createMockResponse({ success: true }));

      const client = createClient({ baseUrl: 'http://localhost:3000', retries: 3 });
      const requestPromise = client.get('/api/board');

      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);

      const result = await requestPromise;

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result.data).toEqual({ success: true });
    });
  });

  describe('Error Handling', () => {
    describe('HTTP 4xx errors', () => {
      it('should throw ApiRequestError for 400 Bad Request', async () => {
        mockFetch.mockResolvedValueOnce(
          createMockResponse({ message: 'Invalid request body' }, { status: 400 })
        );

        const client = createClient({ baseUrl: 'http://localhost:3000' });

        await expect(client.get('/api/board')).rejects.toMatchObject({
          name: 'ApiRequestError',
          status: 400,
          message: 'Invalid request body',
        });
      });

      it('should throw ApiRequestError for 401 Unauthorized', async () => {
        mockFetch.mockResolvedValueOnce(
          createMockResponse({ message: 'Invalid API key' }, { status: 401 })
        );

        const client = createClient({ baseUrl: 'http://localhost:3000' });

        await expect(client.get('/api/board')).rejects.toMatchObject({
          name: 'ApiRequestError',
          status: 401,
        });
      });

      it('should throw ApiRequestError for 404 Not Found', async () => {
        mockFetch.mockResolvedValueOnce(
          createMockResponse({ message: 'Item not found' }, { status: 404 })
        );

        const client = createClient({ baseUrl: 'http://localhost:3000' });

        await expect(client.get('/api/items/999')).rejects.toMatchObject({
          name: 'ApiRequestError',
          status: 404,
          message: 'Item not found',
        });
      });

      it('should throw ApiRequestError for 429 Rate Limited', async () => {
        mockFetch.mockResolvedValueOnce(
          createMockResponse({ message: 'Rate limit exceeded' }, { status: 429 })
        );

        const client = createClient({ baseUrl: 'http://localhost:3000' });

        await expect(client.get('/api/board')).rejects.toMatchObject({
          name: 'ApiRequestError',
          status: 429,
        });
      });
    });

    describe('HTTP 5xx errors (after retries exhausted)', () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('should throw MaxRetriesExceededError for persistent 500 errors', async () => {
        mockFetch.mockResolvedValue(
          createMockResponse({ message: 'Internal server error' }, { status: 500 })
        );

        const client = createClient({ baseUrl: 'http://localhost:3000', retries: 3 });
        const requestPromise = client.get('/api/board');

        await vi.advanceTimersByTimeAsync(7000); // 1s + 2s + 4s

        await expect(requestPromise).rejects.toMatchObject({
          name: 'MaxRetriesExceededError',
          attempts: 4, // 1 initial + 3 retries
        });
      });

      it('should throw MaxRetriesExceededError for persistent 503 errors', async () => {
        mockFetch.mockResolvedValue(
          createMockResponse({ message: 'Service unavailable' }, { status: 503 })
        );

        const client = createClient({ baseUrl: 'http://localhost:3000', retries: 3 });
        const requestPromise = client.get('/api/board');

        await vi.advanceTimersByTimeAsync(7000);

        await expect(requestPromise).rejects.toMatchObject({
          name: 'MaxRetriesExceededError',
        });
      });
    });

    describe('Network errors', () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('should throw NetworkError for connection refused', async () => {
        const connectionError = new Error('connect ECONNREFUSED 127.0.0.1:3000');
        (connectionError as any).code = 'ECONNREFUSED';

        mockFetch.mockRejectedValue(connectionError);

        const client = createClient({ baseUrl: 'http://localhost:3000', retries: 0 });

        await expect(client.get('/api/board')).rejects.toMatchObject({
          name: 'NetworkError',
          code: 'ECONNREFUSED',
        });
      });

      it('should throw NetworkError for DNS resolution failure', async () => {
        const dnsError = new Error('getaddrinfo ENOTFOUND api.example.com');
        (dnsError as any).code = 'ENOTFOUND';

        mockFetch.mockRejectedValue(dnsError);

        const client = createClient({ baseUrl: 'http://api.example.com', retries: 0 });

        await expect(client.get('/api/board')).rejects.toMatchObject({
          name: 'NetworkError',
          code: 'ENOTFOUND',
        });
      });

      it('should throw NetworkError for timeout', async () => {
        const abortError = new DOMException('The operation was aborted.', 'AbortError');

        mockFetch.mockRejectedValue(abortError);

        const client = createClient({ baseUrl: 'http://localhost:3000', timeout: 1000, retries: 0 });

        await expect(client.get('/api/board')).rejects.toMatchObject({
          name: 'NetworkError',
          code: 'TIMEOUT',
        });
      });

      it('should throw MaxRetriesExceededError for persistent network errors', async () => {
        const networkError = new Error('Network error');
        mockFetch.mockRejectedValue(networkError);

        const client = createClient({ baseUrl: 'http://localhost:3000', retries: 3 });
        const requestPromise = client.get('/api/board');

        await vi.advanceTimersByTimeAsync(7000);

        await expect(requestPromise).rejects.toMatchObject({
          name: 'MaxRetriesExceededError',
          attempts: 4,
        });
      });
    });
  });

  describe('Base URL Configuration', () => {
    it('should use configured base URL for all requests', async () => {
      mockFetch.mockResolvedValue(createMockResponse({}));

      const client = createClient({ baseUrl: 'https://api.example.com:8080' });
      await client.get('/api/board');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com:8080/api/board',
        expect.any(Object)
      );
    });

    it('should handle base URL with trailing slash', async () => {
      mockFetch.mockResolvedValue(createMockResponse({}));

      const client = createClient({ baseUrl: 'http://localhost:3000/' });
      await client.get('/api/board');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/board',
        expect.any(Object)
      );
    });

    it('should handle path without leading slash', async () => {
      mockFetch.mockResolvedValue(createMockResponse({}));

      const client = createClient({ baseUrl: 'http://localhost:3000' });
      await client.get('api/board');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/board',
        expect.any(Object)
      );
    });

    it('should handle both trailing and leading slashes', async () => {
      mockFetch.mockResolvedValue(createMockResponse({}));

      const client = createClient({ baseUrl: 'http://localhost:3000/' });
      await client.get('/api/board');

      // Should not result in double slashes
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/board',
        expect.any(Object)
      );
    });
  });

  describe('Request Headers', () => {
    it('should set Content-Type for requests with body', async () => {
      mockFetch.mockResolvedValue(createMockResponse({}));

      const client = createClient({ baseUrl: 'http://localhost:3000' });
      await client.post('/api/items', { title: 'Test' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should allow custom headers to be set', async () => {
      mockFetch.mockResolvedValue(createMockResponse({}));

      const client = createClient({ baseUrl: 'http://localhost:3000' });
      await client.get('/api/board', { headers: { 'X-Custom-Header': 'custom-value' } });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'custom-value',
          }),
        })
      );
    });

    it('should set Accept header to application/json', async () => {
      mockFetch.mockResolvedValue(createMockResponse({}));

      const client = createClient({ baseUrl: 'http://localhost:3000' });
      await client.get('/api/board');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: 'application/json',
          }),
        })
      );
    });
  });

  describe('Timeout Handling', () => {
    it('should use configured timeout', async () => {
      mockFetch.mockResolvedValue(createMockResponse({}));

      const client = createClient({ baseUrl: 'http://localhost:3000', timeout: 5000 });
      await client.get('/api/board');

      // Verify AbortSignal was passed with timeout
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });

    it('should allow per-request timeout override', async () => {
      mockFetch.mockResolvedValue(createMockResponse({}));

      const client = createClient({ baseUrl: 'http://localhost:3000', timeout: 5000 });
      await client.get('/api/board', { timeout: 1000 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });
  });

  describe('Type Safety', () => {
    it('should return typed response data', async () => {
      const mockBoard: BoardState = {
        mission: 'test',
        phases: ['ready'],
        items: [],
        wip_limit: 3,
      };
      mockFetch.mockResolvedValueOnce(createMockResponse(mockBoard));

      const client = createClient({ baseUrl: 'http://localhost:3000' });
      const result = await client.get<BoardState>('/api/board');

      // TypeScript should infer result.data as BoardState
      expect(result.data.mission).toBe('test');
      expect(result.data.phases).toEqual(['ready']);
      expect(result.data.wip_limit).toBe(3);
    });

    it('should accept typed request body', async () => {
      const newItem: Partial<BoardItem> = {
        title: 'New Feature',
        type: 'feature',
      };
      mockFetch.mockResolvedValueOnce(createMockResponse({ id: '001', ...newItem }));

      const client = createClient({ baseUrl: 'http://localhost:3000' });
      const result = await client.post<BoardItem, Partial<BoardItem>>('/api/items', newItem);

      expect(result.data.id).toBe('001');
      expect(result.data.title).toBe('New Feature');
    });
  });

  describe('Delay Function Timing Behavior', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should wait the full duration before resolving - not resolve immediately', async () => {
      // This test verifies that the delay function actually waits
      // Bug: microtasks resolve before setTimeout, causing immediate resolution
      const delayMs = 1000;
      let resolved = false;

      // Simulate a delay scenario by triggering a retryable failure then success
      mockFetch
        .mockResolvedValueOnce(createMockResponse({ error: 'Server error' }, { status: 500 }))
        .mockResolvedValueOnce(createMockResponse({ success: true }));

      const client = createClient({ baseUrl: 'http://localhost:3000', retries: 1 });
      const requestPromise = client.get('/api/board').then(() => {
        resolved = true;
      });

      // After first fetch fails, the client should be waiting for backoff delay
      // Advance time by 100ms (not enough for 1000ms delay)
      await vi.advanceTimersByTimeAsync(100);

      // At this point, if the delay is working correctly, we should NOT have resolved yet
      // The second fetch should not have been called
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Now advance past the delay threshold
      await vi.advanceTimersByTimeAsync(900);

      // Now the retry should have happened
      await requestPromise;
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(resolved).toBe(true);
    });

    it('should enforce minimum wait times between retry attempts', async () => {
      // Track timestamps of each fetch call relative to test start
      const fetchTimestamps: number[] = [];
      let testStartTime = 0;

      mockFetch.mockImplementation(() => {
        fetchTimestamps.push(Date.now() - testStartTime);
        return Promise.resolve(createMockResponse({ error: 'Server error' }, { status: 500 }));
      });

      const client = createClient({ baseUrl: 'http://localhost:3000', retries: 3 });
      testStartTime = Date.now();

      const requestPromise = client.get('/api/board');

      // Advance through all retry delays: 1s + 2s + 4s = 7s total
      await vi.advanceTimersByTimeAsync(1000); // First retry after 1s
      await vi.advanceTimersByTimeAsync(2000); // Second retry after 2s
      await vi.advanceTimersByTimeAsync(4000); // Third retry after 4s

      await expect(requestPromise).rejects.toThrow();

      // Should have 4 calls: initial + 3 retries
      expect(fetchTimestamps.length).toBe(4);

      // Verify minimum spacing between calls
      // First call at ~0ms
      // Second call at ~1000ms (after 1s delay)
      // Third call at ~3000ms (after additional 2s delay)
      // Fourth call at ~7000ms (after additional 4s delay)

      // The gap between call 1 and call 2 should be >= 1000ms
      expect(fetchTimestamps[1] - fetchTimestamps[0]).toBeGreaterThanOrEqual(1000);

      // The gap between call 2 and call 3 should be >= 2000ms
      expect(fetchTimestamps[2] - fetchTimestamps[1]).toBeGreaterThanOrEqual(2000);

      // The gap between call 3 and call 4 should be >= 4000ms
      expect(fetchTimestamps[3] - fetchTimestamps[2]).toBeGreaterThanOrEqual(4000);
    });

    it('should not resolve delay via microtask before setTimeout fires', async () => {
      // This directly tests the race condition bug
      // With the bug: microtask resolves immediately, setTimeout never gets a chance
      // Without the bug: setTimeout controls resolution

      mockFetch
        .mockResolvedValueOnce(createMockResponse({ error: 'Error' }, { status: 500 }))
        .mockResolvedValueOnce(createMockResponse({ success: true }));

      const client = createClient({ baseUrl: 'http://localhost:3000', retries: 1 });

      // Start the request - first call will fail, triggering retry with delay
      const requestPromise = client.get('/api/board');

      // Flush all pending microtasks without advancing timers
      // If the bug exists, this would resolve the delay immediately
      await vi.advanceTimersByTimeAsync(0);

      // With the bug: second fetch would have already been called
      // Without the bug: still waiting for setTimeout, so only 1 call
      const callCountAfterMicrotasks = mockFetch.mock.calls.length;

      // Now advance time to trigger the actual delay
      await vi.advanceTimersByTimeAsync(1000);

      await requestPromise;

      // The key assertion: after flushing microtasks (time=0),
      // only the first fetch should have been called
      expect(callCountAfterMicrotasks).toBe(1);
    });

    it('should accumulate proper total delay across multiple retries', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ error: 'Error' }, { status: 500 }));

      const client = createClient({ baseUrl: 'http://localhost:3000', retries: 3 });
      const startTime = Date.now();

      const requestPromise = client.get('/api/board');

      // Total backoff time for 3 retries: 1s + 2s + 4s = 7s
      // Advance time in small increments to verify proper timing

      // At 500ms, should only have made 1 call (initial)
      await vi.advanceTimersByTimeAsync(500);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // At 1000ms total, should have made 2 calls (initial + first retry)
      await vi.advanceTimersByTimeAsync(500);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // At 2000ms total (1000ms after first retry), should still be 2 calls
      await vi.advanceTimersByTimeAsync(1000);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // At 3000ms total, should have made 3 calls (second retry complete)
      await vi.advanceTimersByTimeAsync(1000);
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // At 5000ms total (2000ms after second retry), should still be 3 calls
      await vi.advanceTimersByTimeAsync(2000);
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // At 7000ms total, should have made 4 calls (third retry complete)
      await vi.advanceTimersByTimeAsync(2000);
      expect(mockFetch).toHaveBeenCalledTimes(4);

      await expect(requestPromise).rejects.toThrow();

      // Verify total elapsed time is approximately 7 seconds
      const elapsedTime = Date.now() - startTime;
      expect(elapsedTime).toBeGreaterThanOrEqual(7000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty response body', async () => {
      const response = {
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: new Map(),
        json: vi.fn().mockRejectedValue(new Error('No content')),
        text: vi.fn().mockResolvedValue(''),
      };
      mockFetch.mockResolvedValueOnce(response);

      const client = createClient({ baseUrl: 'http://localhost:3000' });
      const result = await client.delete('/api/items/001');

      expect(result.status).toBe(204);
    });

    it('should handle malformed JSON response', async () => {
      const response = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Map(),
        json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
        text: vi.fn().mockResolvedValue('Internal Server Error'),
      };
      mockFetch.mockResolvedValue(response);

      const client = createClient({ baseUrl: 'http://localhost:3000', retries: 0 });

      await expect(client.get('/api/board')).rejects.toThrow();
    });

    it('should handle request with query parameters in path', async () => {
      mockFetch.mockResolvedValue(createMockResponse([]));

      const client = createClient({ baseUrl: 'http://localhost:3000' });
      await client.get('/api/items?status=pending&type=feature');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/items?status=pending&type=feature',
        expect.any(Object)
      );
    });

    it('should handle null body explicitly', async () => {
      mockFetch.mockResolvedValue(createMockResponse({}));

      const client = createClient({ baseUrl: 'http://localhost:3000' });
      await client.post('/api/trigger', null);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });
});
