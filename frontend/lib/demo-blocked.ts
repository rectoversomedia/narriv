// The demo workspace is read-only: the API answers every change with 403 code DEMO_READ_ONLY. apiClient reports it
// here so the app shows one clear "this is the demo" notice instead of each save button's own failure toast.
const EVENT = "narriv:demo-blocked";
let lastBlockedAt = 0;

export function reportDemoBlocked() {
  lastBlockedAt = Date.now();
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

/** True right after a demo change was refused, so failure toasts for that same action are skipped. */
export function recentlyDemoBlocked(windowMs = 2500) {
  return Date.now() - lastBlockedAt < windowMs;
}

export function onDemoBlocked(listener: () => void) {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
