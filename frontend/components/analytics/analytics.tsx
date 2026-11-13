"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { ADS_ID, ANALYTICS_ENABLED, CONSENT_KEY, GA_ID, track } from "@/lib/analytics";
import { useL } from "@/lib/use-l";

// Loads Google Analytics / Google Ads only when their IDs are configured, with Consent Mode defaulting to "denied",
// asks once for consent, and counts clicks that matter for campaigns (sign-up, contact, sample report).

const CONSENT_DEFAULT = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});
try{if(localStorage.getItem('${CONSENT_KEY}')==='granted'){gtag('consent','update',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted'});}}catch(e){}
gtag('js',new Date());${GA_ID ? `gtag('config','${GA_ID}');` : ""}${ADS_ID ? `gtag('config','${ADS_ID}');` : ""}`;

function setConsent(granted: boolean) {
  try { localStorage.setItem(CONSENT_KEY, granted ? "granted" : "denied"); } catch { /* the choice is asked again next visit */ }
  const value = granted ? "granted" : "denied";
  (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.("consent", "update", { ad_storage: value, ad_user_data: value, ad_personalization: value, analytics_storage: value });
}

function ConsentBanner() {
  const L = useL();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let stored: string | null = null;
    try { stored = localStorage.getItem(CONSENT_KEY); } catch { /* treat as not asked */ }
    const id = window.setTimeout(() => setOpen(!stored), 0);
    return () => window.clearTimeout(id);
  }, []);
  if (!open) return null;
  const choose = (granted: boolean) => { setConsent(granted); setOpen(false); };
  return (
    <div role="dialog" aria-live="polite" aria-label={L("Cookie preferences", "Preferensi cookie")} className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-xl rounded-[18px] border-[1.5px] border-[#101334] bg-white p-4 text-[#101334] shadow-[0_4px_0_#101334] sm:bottom-5 sm:p-5">
      <p className="text-[14px] font-semibold leading-6">
        {L(
          "We use cookies to measure visits and the results of our ads. You can accept or decline; the site works the same either way.",
          "Kami memakai cookie untuk mengukur kunjungan dan hasil iklan kami. Anda bisa menerima atau menolak; situs tetap berfungsi sama.",
        )}
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={() => choose(false)} className="h-9 rounded-full px-4 text-[13px] font-bold text-[#4A5578] hover:bg-[#F3F5FA]">{L("Decline", "Tolak")}</button>
        <button type="button" onClick={() => choose(true)} className="h-9 rounded-full bg-[#101334] px-4 text-[13px] font-bold text-white hover:bg-[#1B2155]">{L("Accept", "Terima")}</button>
      </div>
    </div>
  );
}

export function Analytics() {
  useEffect(() => {
    if (!ANALYTICS_ENABLED) return;
    // One listener for the links campaigns are judged on, wherever they appear.
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.("a");
      const href = link?.getAttribute("href") || "";
      if (!href) return;
      if (/wa\.me|whatsapp|^mailto:|#contact$/.test(href)) track("contact", { link: href });
      else if (/\/signup/.test(href)) track("begin_sign_up", { link: href });
      else if (/contoh-laporan/.test(href)) track("view_sample_report", { link: href });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  if (!ANALYTICS_ENABLED) return null;
  return (
    <>
      <Script id="gtag-consent" strategy="afterInteractive">{CONSENT_DEFAULT}</Script>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID || ADS_ID}`} strategy="afterInteractive" />
      <ConsentBanner />
    </>
  );
}
