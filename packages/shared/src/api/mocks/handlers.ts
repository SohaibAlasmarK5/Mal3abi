/**
 * MSW handlers that stand in for Mal3abi.BE during development. They follow the contract
 * (typed with the generated types) and reproduce the backend's rules and errors:
 * 401 when signed out, 403 email_not_verified, 409 slot_taken, 422 booking_limit_reached,
 * and 400 csrf_invalid when the CSRF header is missing.
 */
import { delay, http, HttpResponse } from "msw";
import type {
  Booking,
  CourtPage,
  CreateBookingRequest,
  ErrorCode,
  Problem,
} from "../generated/model";
import {
  availabilityFor,
  cities,
  courts,
  mockAccount,
  myBookings,
  sports,
  type MockRole,
} from "./data";

export const mockCsrfToken = "mock-csrf-token";
const roleKey = "mal3abi-mock-role";

export function getMockRole(): MockRole {
  try {
    return (globalThis.localStorage?.getItem(roleKey) as MockRole | null) ?? "anonymous";
  } catch {
    return "anonymous";
  }
}

export function setMockRole(role: MockRole) {
  try {
    globalThis.localStorage?.setItem(roleKey, role);
  } catch {
    // Storage blocked: the role resets on the next page load.
  }
}

function problem(status: number, code: ErrorCode, detail: string) {
  const body: Problem = { status, code, detail };
  return HttpResponse.json(body, {
    status,
    headers: { "Content-Type": "application/problem+json" },
  });
}

function requireCsrf(request: Request) {
  return request.headers.get("X-CSRF-TOKEN") === mockCsrfToken
    ? null
    : problem(400, "csrf_invalid", "Refresh the page and try again.");
}

const maxUpcomingBookings = 2;
let bookings: Booking[] = structuredClone(myBookings);
const now = () => new Date("2026-11-12T12:00:00+03:00");

export const handlers = [
  http.get("*/api/auth/me", async () => {
    await delay(200);
    const role = getMockRole();
    if (role === "anonymous") return problem(401, "unauthorized", "Not signed in.");
    return HttpResponse.json(mockAccount(role));
  }),

  http.get("*/api/auth/csrf", () => HttpResponse.json({ token: mockCsrfToken })),

  http.post("*/api/auth/logout", ({ request }) => {
    const csrf = requireCsrf(request);
    if (csrf) return csrf;
    setMockRole("anonymous");
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("*/api/sports", async () => {
    await delay(200);
    return HttpResponse.json(sports);
  }),

  http.get("*/api/locations", async () => {
    await delay(200);
    return HttpResponse.json(cities);
  }),

  http.get("*/api/courts", async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const sportId = url.searchParams.get("sportId");
    const cityId = url.searchParams.get("cityId");
    const areaId = url.searchParams.get("areaId");
    const maxPrice = Number(url.searchParams.get("maxPrice") ?? Infinity);
    const page = Number(url.searchParams.get("page") ?? 1);
    const pageSize = Number(url.searchParams.get("pageSize") ?? 12);

    const matches = courts.filter(
      (court) =>
        (!sportId || court.sportIds.includes(sportId)) &&
        (!cityId || court.cityId === cityId) &&
        (!areaId || court.areaId === areaId) &&
        court.priceFrom <= maxPrice,
    );
    // Featured courts first, as the premium plan promises.
    matches.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
    const body: CourtPage = {
      items: matches.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      total: matches.length,
    };
    return HttpResponse.json(body);
  }),

  http.get("*/api/courts/:courtId", async ({ params }) => {
    await delay(250);
    const court = courts.find((c) => c.id === params.courtId);
    return court ? HttpResponse.json(court) : problem(404, "not_found", "Court not found.");
  }),

  http.get("*/api/courts/:courtId/availability", async ({ params, request }) => {
    await delay(250);
    const court = courts.find((c) => c.id === params.courtId);
    if (!court) return problem(404, "not_found", "Court not found.");
    const url = new URL(request.url);
    const date = url.searchParams.get("date") ?? "2026-11-14";
    return HttpResponse.json(
      availabilityFor(court, date, url.searchParams.get("pitchId") ?? undefined),
    );
  }),

  http.get("*/api/bookings/my", async () => {
    await delay(250);
    if (getMockRole() === "anonymous") return problem(401, "unauthorized", "Not signed in.");
    return HttpResponse.json(bookings);
  }),

  http.post("*/api/bookings", async ({ request }) => {
    await delay(400);
    const role = getMockRole();
    if (role === "anonymous") return problem(401, "unauthorized", "Not signed in.");
    const csrf = requireCsrf(request);
    if (csrf) return csrf;
    if (role === "playerUnverified") {
      return problem(403, "email_not_verified", "Confirm your email before booking a court.");
    }

    const body = (await request.json()) as CreateBookingRequest;
    const court = courts.find((c) => c.pitches.some((p) => p.id === body.pitchId));
    const pitch = court?.pitches.find((p) => p.id === body.pitchId);
    if (!court || !pitch) return problem(404, "not_found", "Pitch not found.");

    const date = body.start.slice(0, 10);
    const taken = availabilityFor(court, date, pitch.id).some(
      (slot) => slot.start === body.start && slot.status !== "available",
    );
    if (taken) return problem(409, "slot_taken", "This slot was just booked.");

    const upcoming = bookings.filter(
      (b) => (b.status === "confirmed" || b.status === "pending") && new Date(b.start) > now(),
    );
    if (upcoming.length >= maxUpcomingBookings) {
      return problem(422, "booking_limit_reached", "You already have two upcoming bookings.");
    }

    const start = new Date(body.start);
    const end = new Date(start.getTime() + body.durationMinutes * 60_000);
    const amount = (court.priceFrom * body.durationMinutes) / 60;
    const booking: Booking = {
      id: `b-${Date.now()}`,
      courtId: court.id,
      courtName: court.name,
      pitchId: pitch.id,
      pitchName: pitch.name,
      start: body.start,
      end: end.toISOString(),
      status: court.needsApproval ? "pending" : "confirmed",
      totalPrice: amount,
      priceBreakdown: [{ start: body.start, end: end.toISOString(), amount }],
      isOpenMatch: Boolean(body.missingPlayers),
      missingPlayers: body.missingPlayers ?? null,
    };
    bookings = [booking, ...bookings];
    return HttpResponse.json(booking, { status: 201 });
  }),

  http.post("*/api/bookings/:bookingId/cancel", async ({ params, request }) => {
    await delay(300);
    if (getMockRole() === "anonymous") return problem(401, "unauthorized", "Not signed in.");
    const csrf = requireCsrf(request);
    if (csrf) return csrf;
    const booking = bookings.find((b) => b.id === params.bookingId);
    if (!booking) return problem(404, "not_found", "Booking not found.");
    booking.status = "cancelled";
    return HttpResponse.json(booking);
  }),
];
