import { useAuthStore } from "@/store/useAuthStore";

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== "undefined" ? useAuthStore.getState().token : null;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  // If endpoint doesn't start with a slash, add one
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  const headers = new Headers(options.headers);
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = null;
    }
    
    interface ApiError extends Error {
      status?: number;
      info?: unknown;
    }
    
    const error: ApiError = new Error(errorData?.error || errorData?.message || `Failed to fetch (Status: ${response.status})`);
    error.status = response.status;
    error.info = errorData;
    throw error;
  }

  return response.json();
}
