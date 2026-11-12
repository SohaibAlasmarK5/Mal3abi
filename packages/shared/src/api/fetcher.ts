/**
 * The one place that talks to Mal3abi.BE. Every generated API function calls `apiFetch`;
 * nothing else in the apps may call `fetch` for backend data.
 *
 * Platform details (base URL, CSRF source, redirects) are injected with `configureApi`,
 * so the same client works on the website and in the mobile app.
 */
import type { ErrorCode, Problem } from "./generated/model";

export type ApiConfig = {
  /** "" on the website (same origin, proxied to the backend); absolute URL on mobile. */
  baseUrl: string;
  /** Active UI language, sent as Accept-Language so the backend can localize messages. */
  getLocale?: () => string;
  /** Returns the CSRF token for requests that change data (POST, PUT, PATCH, DELETE). */
  getCsrfToken?: (options?: { refresh?: boolean }) => Promise<string | null>;
  /** Called for every ApiError before it is thrown (redirect to sign-in, verify email, ...). */
  onError?: (error: ApiError, request: { url: string; method: string }) => void;
  /** Replaces the network, for example to answer from the mock handlers in development. */
  fetch?: (request: Request) => Promise<Response>;
};

let config: ApiConfig = { baseUrl: "" };

export function configureApi(next: ApiConfig) {
  config = next;
}

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** A failed API call. `code` is stable and machine-readable; never show `detail` to users as-is. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode | "network_error" | "unknown";
  readonly problem?: Problem;

  constructor(status: number, code: ApiError["code"], problem?: Problem) {
    super(problem?.detail ?? problem?.title ?? code);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.problem = problem;
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

function codeFromStatus(status: number): ApiError["code"] {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 400 || status === 422) return "validation_failed";
  if (status >= 500) return "server_error";
  return "unknown";
}

async function readProblem(response: Response): Promise<Problem | undefined> {
  try {
    const body = (await response.json()) as Partial<Problem> & { message?: string };
    // The current backend sometimes answers { code, message } instead of problem+json.
    return {
      status: body.status ?? response.status,
      code: body.code ?? codeFromStatus(response.status),
      title: body.title,
      detail: body.detail ?? body.message,
      errors: body.errors,
    } as Problem;
  } catch {
    return undefined;
  }
}

async function send(url: string, init: RequestInit, refreshCsrf: boolean): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  const locale = config.getLocale?.();
  if (locale) headers.set("Accept-Language", locale);
  if (unsafeMethods.has(method)) {
    const token = await config.getCsrfToken?.({ refresh: refreshCsrf });
    if (token) headers.set("X-CSRF-TOKEN", token);
  }
  const request = new Request(`${config.baseUrl}${url}`, {
    ...init,
    method,
    headers,
    credentials: "include",
  });
  return config.fetch ? config.fetch(request) : fetch(request);
}

/** The orval mutator. Returns the parsed body, or throws an ApiError. */
export async function apiFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  let response: Response;
  try {
    response = await send(url, init, false);
    if (response.status === 400 && unsafeMethods.has(method)) {
      // An expired CSRF token: get a new one and try once more.
      const problem = await readProblem(response.clone());
      if (problem?.code === "csrf_invalid") response = await send(url, init, true);
    }
  } catch {
    const error = new ApiError(0, "network_error");
    config.onError?.(error, { url, method });
    throw error;
  }

  if (!response.ok) {
    const problem = await readProblem(response);
    const error = new ApiError(
      response.status,
      problem?.code ?? codeFromStatus(response.status),
      problem,
    );
    config.onError?.(error, { url, method });
    throw error;
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export default apiFetch;

/** Error type used by the generated hooks (orval reads this export). */
export type ErrorType<_Error> = ApiError;
