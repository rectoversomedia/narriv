import { useAuthStore } from "@/store/useAuthStore";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3000";

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const authState = typeof window !== "undefined" ? useAuthStore.getState() : null;
  const token = authState?.token ?? null;

  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  const buildHeaders = (accessToken: string | null) => {
    const headers = new Headers(options.headers);
    if (accessToken && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
    if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    return headers;
  };

  const send = (accessToken: string | null) => fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: buildHeaders(accessToken),
    // Ensure cookies are not sent cross-origin; JWT is header-based
    credentials: "omit",
  });

  let response = await send(token);

  if (response.status === 401 && authState?.refreshToken) {
    const refreshResponse = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: authState.refreshToken }),
      credentials: "omit",
    });

    if (refreshResponse.ok) {
      const refreshed = await refreshResponse.json() as { token: string; refreshToken?: string };
      const store = useAuthStore.getState();
      store.setToken(refreshed.token);
      if (refreshed.refreshToken) store.setRefreshToken(refreshed.refreshToken);
      response = await send(refreshed.token);
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
