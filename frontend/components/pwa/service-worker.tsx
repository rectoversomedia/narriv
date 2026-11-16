"use client";

import { useEffect } from "react";

/**
 * Registers public/sw.js so browsers treat Narriv as an installable app: "Add to Home Screen" then installs it and
 * the icon opens full screen, without the browser's address bar and toolbar. Production only, so local development
 * never runs a stale worker.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Not fatal: the site works the same without it, it just cannot be installed as an app.
    });
  }, []);
  return null;
}
