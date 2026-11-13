// Marketing measurement (Google Analytics 4 and Google Ads conversions). Off unless the IDs are set as Vercel env
// vars, and even then nothing is stored until the visitor accepts (Consent Mode starts as "denied").

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID?.trim() || "";
export const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim() || "";
export const ANALYTICS_ENABLED = Boolean(GA_ID || ADS_ID);

// Google Ads conversion labels ("AW-123/abcDEF"), one per event that counts as a conversion.
const ADS_CONVERSIONS: Record<string, string | undefined> = {
  sign_up: process.env.NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL,
  start_demo: process.env.NEXT_PUBLIC_GOOGLE_ADS_DEMO_LABEL,
  contact: process.env.NEXT_PUBLIC_GOOGLE_ADS_CONTACT_LABEL,
};

export type TrackEvent = "sign_up" | "begin_sign_up" | "start_demo" | "contact" | "view_sample_report";

type Gtag = (...args: unknown[]) => void;

/** Records an event (and its Ads conversion, when one is configured). Does nothing when measurement is off. */
export function track(event: TrackEvent, params: Record<string, string | number> = {}) {
  if (!ANALYTICS_ENABLED || typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (!gtag) return;
  gtag("event", event, params);
  const label = ADS_CONVERSIONS[event]?.trim();
  if (ADS_ID && label) gtag("event", "conversion", { send_to: label.includes("/") ? label : `${ADS_ID}/${label}` });
}

export const CONSENT_KEY = "narriv-consent";
