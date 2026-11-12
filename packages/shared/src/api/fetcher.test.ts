import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch, configureApi } from "./fetcher";
import { createBooking, getMe, listSports } from "./generated";
import { handlers, mockCsrfToken, setMockRole } from "./mocks";

const base = "http://api.test";
const server = setupServer(...handlers);
const onError = vi.fn();
let csrfCalls: Array<{ refresh?: boolean }> = [];

// The mock session reads the role from localStorage.
const store = new Map<string, string>();
globalThis.localStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, value),
  removeItem: (key: string) => void store.delete(key),
  clear: () => store.clear(),
  key: () => null,
  length: 0,
} as Storage;

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  onError.mockReset();
  csrfCalls = [];
  setMockRole("player");
  configureApi({
    baseUrl: base,
    getLocale: () => "ar",
    getCsrfToken: async (options) => {
      csrfCalls.push(options ?? {});
      return mockCsrfToken;
    },
    onError,
  });
});

const booking = {
  pitchId: "elite-1",
  start: "2026-11-14T08:00:00+03:00",
  durationMinutes: 60,
} as const;

describe("apiFetch", () => {
  it("returns typed data from the generated functions", async () => {
    const sports = await listSports();
    expect(sports.map((s) => s.id)).toEqual(["football", "padel"]);
  });

  it("sends Accept-Language and the session cookie", async () => {
    let seen: Request | undefined;
    server.use(
      http.get(`${base}/api/sports`, ({ request }) => {
        seen = request;
        return HttpResponse.json([]);
      }),
    );
    await listSports();
    expect(seen?.headers.get("Accept-Language")).toBe("ar");
    expect(seen?.credentials).toBe("include");
  });

  it("does not send a CSRF token on GET, and sends it on POST", async () => {
    await listSports();
    expect(csrfCalls).toHaveLength(0);
    await createBooking({ ...booking, start: "2026-11-14T09:00:00+03:00" }).catch(() => undefined);
    expect(csrfCalls).toEqual([{ refresh: false }]);
  });

  it("refreshes the CSRF token once when the backend rejects it", async () => {
    let attempts = 0;
    server.use(
      http.post(`${base}/api/bookings`, ({ request }) => {
        attempts += 1;
        if (attempts === 1) {
          return HttpResponse.json({ status: 400, code: "csrf_invalid" }, { status: 400 });
        }
        expect(request.headers.get("X-CSRF-TOKEN")).toBe(mockCsrfToken);
        return HttpResponse.json({ id: "ok" }, { status: 201 });
      }),
    );
    await createBooking(booking);
    expect(attempts).toBe(2);
    expect(csrfCalls).toEqual([{ refresh: false }, { refresh: true }]);
  });

  it("throws an ApiError with the backend code and reports it", async () => {
    setMockRole("playerUnverified");
    const error = await createBooking(booking).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 403, code: "email_not_verified" });
    expect(onError).toHaveBeenCalledWith(error, { url: "/api/bookings", method: "POST" });
  });

  it("maps 401 to unauthorized when signed out", async () => {
    setMockRole("anonymous");
    await expect(getMe()).rejects.toMatchObject({ status: 401, code: "unauthorized" });
  });

  it("reports a booked slot as slot_taken", async () => {
    // 09:00 is a booked slot for elite-1 in the mock pattern.
    await expect(
      createBooking({ ...booking, start: "2026-11-14T09:00:00+03:00" }),
    ).rejects.toMatchObject({
      status: 409,
      code: "slot_taken",
    });
  });

  it("falls back to a code from the status when the body is not a problem", async () => {
    server.use(http.get(`${base}/api/sports`, () => new HttpResponse("oops", { status: 503 })));
    await expect(listSports()).rejects.toMatchObject({ status: 503, code: "server_error" });
  });

  it("turns network failures into network_error", async () => {
    server.use(http.get(`${base}/api/sports`, () => HttpResponse.error()));
    await expect(listSports()).rejects.toMatchObject({ status: 0, code: "network_error" });
  });

  it("can answer from the mock handlers without any network or service worker", async () => {
    server.close();
    try {
      const { mockFetch } = await import("./mocks");
      configureApi({ baseUrl: base, getCsrfToken: async () => mockCsrfToken, fetch: mockFetch });
      await expect(listSports()).resolves.toHaveLength(2);
      await expect(apiFetch("/api/unknown")).rejects.toMatchObject({
        status: 404,
        code: "not_found",
      });
    } finally {
      server.listen({ onUnhandledRequest: "error" });
    }
  });

  it("returns undefined for 204 No Content", async () => {
    await expect(apiFetch("/api/auth/logout", { method: "POST" })).resolves.toBeUndefined();
  });
});
