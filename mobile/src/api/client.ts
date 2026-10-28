// Minimal JSON HTTP client. Sends the session token as a Bearer header and turns
// any non-2xx response into an ApiError carrying the backend's `{ error }` message.
import { config } from "../config";
import { tokenStore } from "../lib/storage";
import type { ApiErrorBody } from "../types/api";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Called when the backend answers 401, so the app can drop a stale session. */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

type Query = Record<string, string | number | boolean | undefined>;

async function request<T>(method: "GET" | "POST", path: string, body?: unknown, query?: Query): Promise<T> {
  if (!config.apiBaseUrl) {
    throw new ApiError(0, "The app has no backend address yet. Set expo.extra.apiBaseUrl in app.json.");
  }
  const qs = query
    ? Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== false)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v === true ? "1" : String(v))}`)
        .join("&")
    : "";
  const url = `${config.apiBaseUrl}${path}${qs ? `?${qs}` : ""}`;
  const token = await tokenStore.get();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, "Can't reach KushRewards. Check your connection and try again.");
  }

  const text = await res.text();
  const json = text ? safeParse(text) : null;
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized?.();
    const message = (json as ApiErrorBody | null)?.error || `Something went wrong (${res.status})`;
    throw new ApiError(res.status, message);
  }
  return json as T;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export const http = {
  get: <T>(path: string, query?: Query) => request<T>("GET", path, undefined, query),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
};
