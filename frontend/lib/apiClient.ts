import { useAuthStore } from "@/store/useAuthStore";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3000";

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined" ? useAuthStore.getState().token : null;

  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  const headers = new Headers(options.headers);
  // Only attach bearer token if it's a real JWT (not the demo sentinel)
  if (token && token !== "demo-token" && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    // Ensure cookies are not sent cross-origin; JWT is header-based
    credentials: "omit",
  });

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
