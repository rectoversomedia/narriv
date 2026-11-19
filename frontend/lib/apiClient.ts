import ky from "ky";
import { isDemoSession, useAuthStore } from "@/store/useAuthStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { timingOptions, toClientError } from "@/lib/http-timeout";
import { useUiStore } from "@/store/useUiStore";
import { reportDemoBlocked } from "@/lib/demo-blocked";
export type { ClientError } from "@/lib/http-timeout";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3000";

// SECURITY & QUALITY FIX: Fail-fast if API URL is not configured in production
// Allow build to succeed with fallback; runtime will use the fallback
if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_API_URL) {
  console.warn("WARNING: NEXT_PUBLIC_API_URL not configured — using fallback. Set it in Vercel project settings.");
}

// Default timeout in milliseconds (30 seconds)
const DEFAULT_TIMEOUT = 30 * 1000;


const client = ky.create({
  prefix: BASE_URL,
  credentials: "omit",
  retry: 0,
  // Every response depends on the bearer token and workspace, so never revalidate from the browser cache: a
  // cross-origin 304 reached the browser without CORS headers and failed (workspace list "could not be loaded").
  cache: "no-store",
});

type ApiClientOptions = RequestInit & {
  auth?: boolean;
  refreshOnUnauthorized?: boolean;
  timeout?: number; // Custom timeout per request
};

// One refresh at a time: the backend rotates refresh tokens, so several requests refreshing at once (a page opened
// after the access token expired) would spend the same token twice and sign the user out. They share one call.
let refreshing: Promise<string | null> | null = null;

async function refreshSession(refreshToken: string, timeout: number): Promise<string | null> {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await client("auth/refresh", { method: "POST", json: { refreshToken }, ...timingOptions(timeout) });
        if (!res.ok) {
          // The session really ended (refresh token expired or revoked): sign out and go to the login page once.
          if (res.status === 400 || res.status === 401 || res.status === 403) {
            useAuthStore.getState().logout();
            if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
              window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
            }
          }
          return null;
        }
        const data = await res.json() as { token: string; refreshToken?: string };
        const store = useAuthStore.getState();
        store.setToken(data.token);
        if (data.refreshToken) store.setRefreshToken(data.refreshToken);
        return data.token;
      } catch {
        return null;
      } finally {
        setTimeout(() => { refreshing = null; }, 0);
      }
    })();
  }
  return refreshing;
}

export async function apiClient<T>(
  endpoint: string,
  options: ApiClientOptions = {}
): Promise<T> {
  const { auth = true, refreshOnUnauthorized = true, timeout = DEFAULT_TIMEOUT, ...requestOptions } = options;
  const authState = typeof window !== "undefined" ? useAuthStore.getState() : null;
  const token = authState?.token ?? null;

  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const kyPath = path.replace(/^\//, "");

  const buildHeaders = (accessToken: string | null) => {
    const headers = new Headers(requestOptions.headers);
    if (auth && accessToken && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
    // Generated text (recommendations, briefs, risk explanations) follows the UI language.
    if (!headers.has("Accept-Language")) headers.set("Accept-Language", useUiStore.getState().language === "id" ? "id" : "en");
    if (!headers.has("Content-Type") && !(requestOptions.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    // Scope every call to the selected workspace (demo sessions are pinned server-side).
    const selectedWorkspaceId = typeof window !== "undefined" ? useWorkspaceStore.getState().selectedWorkspaceId : null;
    if (auth && selectedWorkspaceId && !isDemoSession(authState?.user) && !headers.has("X-Workspace-Id")) {
      headers.set("X-Workspace-Id", selectedWorkspaceId);
    }
    return headers;
  };

  // ky applies its own timeout (10 s by default) unless one is passed per
  // request, so the per-call `timeout` must go to ky itself. Without this every
  // call longer than 10 s failed in the browser while the server finished it.
  const send = (accessToken: string | null) => client(kyPath, {
    ...requestOptions,
    headers: buildHeaders(accessToken),
    ...timingOptions(timeout),
  });

  let response: Response;
  try {
    response = await send(token);
  } catch (err) {
    throw toClientError(err, timeout);
  }

  if (refreshOnUnauthorized && response.status === 401 && authState?.refreshToken) {
    const refreshed = await refreshSession(authState.refreshToken, timeout);
    if (refreshed) {
      response = await client(kyPath, {
        ...requestOptions,
        headers: buildHeaders(refreshed),
        ...timingOptions(timeout),
      }).catch((err) => { throw toClientError(err, timeout); });
    }
  }

  if (!response.ok) {
    let errorData: { error?: string; errorId?: string; message?: string; code?: string } | null = null;
    try {
      errorData = await response.json();
    } catch {
      // Ignore JSON parse errors on error responses
    }

    // The backend may send an Indonesian copy of a user-facing message next to the English one.
    const message =
      (useUiStore.getState().language === "id" ? errorData?.errorId : undefined) ||
      errorData?.error ||
      errorData?.message ||
      `Request failed (${response.status})`;

    if (response.status === 403 && errorData?.code === "DEMO_READ_ONLY") reportDemoBlocked();

    const error = new Error(message) as Error & { status?: number; info?: unknown };
    error.status = response.status;
    error.info = errorData;
    throw error;
  }

  return response.json() as Promise<T>;
}

// Export timeout constant for use in specific API calls
export const API_TIMEOUT = DEFAULT_TIMEOUT;
