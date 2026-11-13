// narriv.digital is the website; app.narriv.digital is the product (sign-in, onboarding, dashboard). Only these
// hosts are routed; localhost and preview deployments keep serving everything from one origin.
export const APP_HOST = "app.narriv.digital";
export const APP_ORIGIN = `https://${APP_HOST}`;
export const MARKETING_HOSTS = ["www.narriv.digital", "narriv.digital"];
export const MARKETING_ORIGIN = "https://www.narriv.digital";

// The website sends product pages to the app once app.narriv.digital serves this project. Until then the website
// keeps serving them, so turning the split on is one deploy after the domain is live.
export const SPLIT_LIVE = true;

/** Pages that belong to the website, not the product. */
export const MARKETING_PATHS = ["/welcome", "/pricing", "/help", "/terms", "/privacy", "/blog", "/id", "/pitch"];

export function isMarketingPath(pathname: string) {
  return MARKETING_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** True in a browser on the website host while the split is live: product actions must open on the app. */
export function onMarketingHost() {
  return SPLIT_LIVE && typeof window !== "undefined" && MARKETING_HOSTS.includes(window.location.host);
}
