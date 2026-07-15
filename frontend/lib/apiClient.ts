import ky from "ky";
import { useAuthStore } from "@/store/useAuthStore";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3000";

// SECURITY & QUALITY FIX: Fail-fast if API URL is not configured in production
if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_API_URL) {
  throw new Error("CRITICAL: NEXT_PUBLIC_API_URL is not configured in production");
}

// Default timeout in milliseconds (30 seconds)
const DEFAULT_TIMEOUT = 30 * 1000;

// Create timeout abort controller helper
function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

const client = ky.create({
  prefix: BASE_URL,
  credentials: "omit",
  retry: 0,
});

type ApiClientOptions = RequestInit & {
  auth?: boolean;
  refreshOnUnauthorized?: boolean;
  timeout?: number; // Custom timeout per request
};

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
    if (!headers.has("Content-Type") && !(requestOptions.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    return headers;
  };

  // Create timeout signal for this request
  const timeoutSignal = createTimeoutSignal(timeout);

  const send = (accessToken: string | null) => client(kyPath, {
    ...requestOptions,
    headers: buildHeaders(accessToken),
    throwHttpErrors: false,
    signal: timeoutSignal,
  });

  let response = await send(token);

  if (refreshOnUnauthorized && response.status === 401 && authState?.refreshToken) {
    // Create new timeout for refresh request
    const refreshTimeoutSignal = createTimeoutSignal(timeout);
    const refreshResponse = await client("auth/refresh", {
      method: "POST",
      json: { refreshToken: authState.refreshToken },
      throwHttpErrors: false,
      signal: refreshTimeoutSignal,
    });

    if (refreshResponse.ok) {
      const refreshed = await refreshResponse.json() as { token: string; refreshToken?: string };
      const store = useAuthStore.getState();
      store.setToken(refreshed.token);
      if (refreshed.refreshToken) store.setRefreshToken(refreshed.refreshToken);

      // Create new timeout for retry request
      const retryTimeoutSignal = createTimeoutSignal(timeout);
      response = await client(kyPath, {
        ...requestOptions,
        headers: buildHeaders(refreshed.token),
        throwHttpErrors: false,
        signal: retryTimeoutSignal,
      });
    }
  }

  if (!response.ok) {
    let errorData: { error?: string; message?: string } | null = null;
    try {
      errorData = await response.json();
    } catch {
      // Ignore JSON parse errors on error responses
    }

    const message =
      errorData?.error ||
      errorData?.message ||
      `Request failed (${response.status})`;

    const error = new Error(message) as Error & { status?: number; info?: unknown };
    error.status = response.status;
    error.info = errorData;
    throw error;
  }

  return response.json() as Promise<T>;
}

// Export timeout constant for use in specific API calls
export const API_TIMEOUT = DEFAULT_TIMEOUT;
