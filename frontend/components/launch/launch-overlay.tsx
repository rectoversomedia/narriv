"use client";

import { useEffect, useRef, useState } from "react";
import { DASHBOARD_READY, LAUNCH_CLASS, LAUNCH_KEY, LAUNCH_START, launchStartedAt } from "@/lib/launch";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { isDemoSession, useAuthStore } from "@/store/useAuthStore";

// The screen between "signed in" and "dashboard": a three-second welcome. The Narriv orb grows and glows over a dark
// field, "Welcome to Narriv" (with the person's first name once it is known) rises in, and a bar fills while the
// dashboard loads; then the screen lifts away (fade and slight zoom) and the page rises in beneath it.
// Visibility on first paint comes from the html class set by the boot script; this component runs the exit.

const MIN_SHOW_MS = 3000;
const MAX_WAIT_MS = 6500;
const EXIT_MS = 900;

export function LaunchOverlay() {
  const L = useL();
  const user = useAuthStore((s) => s.user);
  const [leaving, setLeaving] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    const root = document.documentElement;
    let fallback = 0;
    let exitTimer = 0;
    let cleanupTimer = 0;

    const finish = () => {
      // Every dashboard load says it is ready; only a launch in progress has anything to lift.
      if (!root.classList.contains(LAUNCH_CLASS)) return;
      window.clearTimeout(fallback);
      const wait = Math.max(0, MIN_SHOW_MS - (Date.now() - shownAt.current));
      window.clearTimeout(exitTimer);
      exitTimer = window.setTimeout(() => {
        setLeaving(true);
        root.classList.add("narriv-revealing");
        cleanupTimer = window.setTimeout(() => {
          root.classList.remove(LAUNCH_CLASS, "narriv-revealing");
          setLeaving(false);
          try { sessionStorage.removeItem(LAUNCH_KEY); } catch { /* nothing to clear */ }
        }, EXIT_MS);
      }, wait);
    };
    const start = () => {
      shownAt.current = launchStartedAt();
      setLeaving(false);
      window.clearTimeout(fallback);
      // Never strand anyone behind the screen if the ready signal does not come (e.g. a redirect to onboarding).
      fallback = window.setTimeout(finish, Math.max(MIN_SHOW_MS, MAX_WAIT_MS - (Date.now() - shownAt.current)));
    };

    if (root.classList.contains(LAUNCH_CLASS)) start();
    window.addEventListener(LAUNCH_START, start);
    window.addEventListener(DASHBOARD_READY, finish);
    return () => {
      window.removeEventListener(LAUNCH_START, start);
      window.removeEventListener(DASHBOARD_READY, finish);
      window.clearTimeout(fallback);
      window.clearTimeout(exitTimer);
      window.clearTimeout(cleanupTimer);
    };
  }, []);

  const firstName = user && !isDemoSession(user) ? user.name?.trim().split(/\s+/)[0] : "";

  return (
    <div
      id="narriv-launch"
      aria-hidden="true"
      className={cn("narriv-launch", leaving && "is-leaving")}
    >
      <div className="narriv-launch__stage">
        <div className="narriv-launch__glow" />
        <div className="narriv-launch__ring" />
        <div className="narriv-launch__ring narriv-launch__ring--late" />
        <img src="/brand/logo-bulat.webp" alt="" width={168} height={168} className="narriv-launch__orb" />
      </div>
      <p className="narriv-launch__title">
        {L("Welcome to ", "Selamat Datang di ")}
        <span>Narriv</span>
      </p>
      <p className="narriv-launch__text">
        {firstName
          ? L(`Hi ${firstName}, we are preparing your dashboard`, `Halo ${firstName}, dashboard Anda sedang disiapkan`)
          : L("Preparing your dashboard", "Menyiapkan dashboard Anda")}
      </p>
      <div className="narriv-launch__bar"><span /></div>
    </div>
  );
}
