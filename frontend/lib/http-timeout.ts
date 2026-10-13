// Request timing for the ky client, kept free of app imports so it can be
// unit-tested against a real server.
//
// ky applies its own timeout (10 s by default) unless `timeout` is passed per
// request. Narriv once passed only an AbortSignal, so every call longer than
// 10 s (e.g. "Run monitoring now", ~20-40 s) failed in the browser while the
// server completed it.

export type ClientError = Error & { status?: number; code?: "CLIENT_TIMEOUT" | "NETWORK_ERROR"; info?: unknown };

/** ky options that carry the caller's timeout (milliseconds). */
export function timingOptions(timeoutMs: number): { timeout: number; throwHttpErrors: false } {
  return { timeout: timeoutMs, throwHttpErrors: false };
}

/**
 * A network-level failure (no HTTP response) as an Error the UI can act on.
 * CLIENT_TIMEOUT means the browser stopped waiting, not that the server
 * failed: the server may still finish the request.
 */
export function toClientError(err: unknown, timeoutMs: number): ClientError {
  const name = (err as { name?: string })?.name;
  if (name === "TimeoutError") {
    const e = new Error(`No response from the server within ${Math.round(timeoutMs / 1000)} seconds.`) as ClientError;
    e.code = "CLIENT_TIMEOUT";
    e.status = 0;
    return e;
  }
  const e = new Error("The server could not be reached. Check your connection and try again.") as ClientError;
  e.code = "NETWORK_ERROR";
  e.status = 0;
  return e;
}
