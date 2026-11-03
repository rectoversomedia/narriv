"use client";

import { Newspaper } from "lucide-react";
import { Facebook, Instagram, Reddit, ThreadsLight, TikTokDark, XLight, YouTube } from "@ridemountainpig/svgl-react";
import { cn } from "@/lib/utils";

const LOGOS: Record<string, (props: { className?: string }) => React.ReactNode> = {
  instagram: Instagram,
  facebook: Facebook,
  tiktok: TikTokDark,
  youtube: YouTube,
  twitter: XLight,
  x: XLight,
  threads: ThreadsLight,
  reddit: Reddit,
};

const NAMES: Record<string, string> = {
  instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube", twitter: "X", x: "X", threads: "Threads", reddit: "Reddit", news: "News",
};

/** The platform's official logo (news, which has none, gets a newspaper mark). The name is the accessible label. */
export function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  const key = String(platform || "").toLowerCase();
  const Logo = LOGOS[key];
  return (
    <span role="img" aria-label={NAMES[key] ?? platform} title={NAMES[key] ?? platform} className={cn("inline-flex size-5 shrink-0 items-center justify-center", className)}>
      {Logo ? <Logo className="size-full" /> : <Newspaper className="size-[85%] text-[#465170]" strokeWidth={2.2} />}
    </span>
  );
}
