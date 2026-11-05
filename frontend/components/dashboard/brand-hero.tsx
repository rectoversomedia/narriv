"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { resolveBackendAssetUrl } from "@/lib/asset-url";
import { cn } from "@/lib/utils";

/** The workspace's logo on a white tile, or its initials when no logo was uploaded (or it fails to load). */
export function BrandMark({ name, logoUrl, small = false, className }: { name: string; logoUrl?: string | null; small?: boolean; className?: string }) {
  const [failed, setFailed] = useState(false);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "N";
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden bg-white",
        small ? "size-10 rounded-[12px]" : "size-[72px] rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.25)] ring-4 ring-white/10",
        className,
      )}
    >
      {logoUrl && !failed ? (
        // Uploaded logos live on the API host, so a plain img rather than next/image.
        <img src={resolveBackendAssetUrl(logoUrl)} alt={name} className={cn("size-full object-contain", small ? "p-1.5" : "p-2.5")} onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden="true" className={cn("bg-gradient-to-br from-[#465FFF] to-[#8B5CFF] bg-clip-text font-black tracking-[-0.02em] text-transparent", small ? "text-[15px]" : "text-[26px]")}>{initials}</span>
      )}
    </span>
  );
}

export type HeroPill = { icon: LucideIcon; value?: ReactNode; label: ReactNode };

/**
 * The navy brand header used wherever the monitored brand is introduced: logo centred, brand name under it,
 * the key facts as pills, then whatever the page puts below (the keyword cards).
 */
export function BrandHero({
  eyebrow,
  brandName,
  logoUrl,
  pills,
  action,
  children,
  label,
  className,
}: {
  eyebrow: string;
  brandName: string;
  logoUrl?: string | null;
  pills: HeroPill[];
  action?: ReactNode;
  children?: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <section aria-label={label ?? eyebrow} className={cn("relative overflow-hidden rounded-[18px] bg-gradient-to-br from-[#101334] via-[#18206B] to-[#2B2F9E] px-5 pb-5 pt-7 text-white shadow-[0_12px_32px_rgba(16,19,52,0.22)] sm:px-6", className)}>
      {/* Soft light behind the logo so the centre reads as the focus. */}
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-[220px] w-[520px] -translate-x-1/2 rounded-full bg-[#6D7CFF] opacity-30 blur-[90px]" />
      {action ? <div className="relative mb-4 flex justify-end sm:absolute sm:right-5 sm:top-5 sm:mb-0">{action}</div> : null}
      <div className="relative flex flex-col items-center text-center">
        <BrandMark name={brandName} logoUrl={logoUrl} />
        <p className="mt-4 text-[11px] font-black uppercase tracking-[0.16em] text-white/60">{eyebrow}</p>
        <h2 className="mt-1 max-w-full truncate text-[26px] font-black leading-tight tracking-[-0.02em] sm:text-[34px]">{brandName}</h2>
        <ul className="mt-3 flex flex-wrap justify-center gap-1.5 sm:gap-2">
          {pills.map((pill, i) => {
            const Icon = pill.icon;
            return (
              <li key={i} className="flex items-center gap-1.5 rounded-full bg-white/[0.12] px-2.5 py-1 text-[12px] font-semibold text-white/85 backdrop-blur-sm sm:px-3.5 sm:py-1.5 sm:text-[13px]">
                <Icon size={14} strokeWidth={2.4} aria-hidden="true" className="text-[#A5B4FF]" />
                {pill.value !== undefined ? <b className="font-black text-white">{pill.value}</b> : null}
                {pill.label}
              </li>
            );
          })}
        </ul>
      </div>
      {children ? <div className="relative mt-6">{children}</div> : null}
    </section>
  );
}
