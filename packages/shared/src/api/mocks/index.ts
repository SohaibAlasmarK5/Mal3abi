import { getResponse, HttpResponse } from "msw";
import { handlers } from "./handlers";

export { handlers, getMockRole, setMockRole, mockCsrfToken } from "./handlers";
export { mockRoles, type MockRole } from "./data";

/**
 * Answers a request from the mock handlers, without a service worker, so it works in any
 * browser and in React Native. Requests no handler knows get a 404, never the real network.
 */
export async function mockFetch(request: Request): Promise<Response> {
  const response = await getResponse(handlers, request);
  return (
    response ??
    HttpResponse.json(
      { status: 404, code: "not_found", detail: `No mock for ${request.method} ${request.url}` },
      { status: 404 },
    )
  );
}
