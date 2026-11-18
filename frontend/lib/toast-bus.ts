/**
 * Lets code outside React (the React Query mutation cache) show a toast, and tells it whether a toast was already
 * shown for an action: every button that changes something gets a clear success or failure message, exactly once.
 */
export type BusToast = { description: string; title?: string; tone?: "success" | "error" | "info" };

let lastToastAt = 0;
let handler: ((t: BusToast) => void) | null = null;

export function markToastShown() { lastToastAt = Date.now(); }
export function toastShownSince(t: number) { return lastToastAt >= t; }
export function setToastHandler(h: ((t: BusToast) => void) | null) { handler = h; }
export function emitToast(t: BusToast) { handler?.(t); }
