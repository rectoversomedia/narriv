// The branded hand-off from sign-in or onboarding to the dashboard. The overlay covers the screen first, then the
// navigation runs; on a full reload the flag in sessionStorage keeps it up until the dashboard says it is ready.
export const LAUNCH_KEY = "narriv_launch";
export const LAUNCH_CLASS = "narriv-launching";
export const LAUNCH_START = "narriv:launch-start";
export const DASHBOARD_READY = "narriv:dashboard-ready";

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Puts the launch screen up without navigating (the OAuth callback shows it while the sign-in finishes). */
export function beginLaunch() {
  if (typeof window === "undefined") return;
  if (!document.documentElement.classList.contains(LAUNCH_CLASS)) {
    try {
      sessionStorage.setItem(LAUNCH_KEY, String(Date.now()));
    } catch {
      /* storage off: the overlay still plays for client-side navigation */
    }
    document.documentElement.classList.add(LAUNCH_CLASS);
  }
  window.dispatchEvent(new Event(LAUNCH_START));
}

/** Takes the launch screen down at once, e.g. when the sign-in failed and the person goes back to the login form. */
export function cancelLaunch() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(LAUNCH_KEY);
  } catch {
    /* nothing to clear */
  }
  document.documentElement.classList.remove(LAUNCH_CLASS);
}

/** When the current launch started (ms), so a full reload continues the same 3-second welcome instead of restarting it. */
export function launchStartedAt() {
  try {
    const t = Number(sessionStorage.getItem(LAUNCH_KEY));
    if (t && Date.now() - t < 15000) return t;
  } catch {
    /* storage off */
  }
  return Date.now();
}

/** Shows the launch screen, waits for it to cover the page, then navigates. */
export function launchDashboard(navigate: () => void) {
  if (typeof window === "undefined") return navigate();
  beginLaunch();
  window.setTimeout(navigate, reducedMotion() ? 0 : 650);
}

/** Called by the dashboard once it can render, so the launch screen can lift. */
export function signalDashboardReady() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(DASHBOARD_READY));
}

/** Runs in <head> before first paint: a reload that is part of a launch starts with the screen already covered. */
// The OAuth callback starts covered too, so the sign-in never shows an interim "authenticating" page.
export const LAUNCH_BOOT_SCRIPT = `try{var t=+sessionStorage.getItem("${LAUNCH_KEY}");if(location.pathname==="/oauth/callback"&&!(t&&Date.now()-t<15000)){t=Date.now();sessionStorage.setItem("${LAUNCH_KEY}",String(t))}if(t&&Date.now()-t<15000)document.documentElement.classList.add("${LAUNCH_CLASS}");else sessionStorage.removeItem("${LAUNCH_KEY}")}catch(e){}`;
