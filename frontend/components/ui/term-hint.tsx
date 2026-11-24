"use client";

import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { glossaryTerm } from "@/lib/glossary";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";

/** A small "?" next to a term: click for what it means, with a link to the full entry in the Glossary. */
export function TermHint({ id, className, tone = "light" }: { id: string; className?: string; tone?: "light" | "dark" }) {
  const L = useL();
  const t = glossaryTerm(id);
  if (!t) return null;
  return (
    <Popover>
      <PopoverTrigger
        aria-label={L(`What is ${t.term.en}?`, `Apa itu ${t.term.id}?`)}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "inline-flex h-4 w-4 shrink-0 translate-y-[-1px] items-center justify-center rounded-full align-middle transition",
          tone === "dark" ? "text-white/55 hover:text-white" : "text-[#8A93B8] hover:text-[#3247D9] dark:text-[#8D96C4] dark:hover:text-white",
          className,
        )}
      >
        <HelpCircle className="h-[14px] w-[14px]" />
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-[300px] rounded-[14px] border border-[#E1E5F5] bg-white p-4 text-left shadow-xl dark:border-[#2B3470] dark:bg-[#161B3D]">
        <p className="text-[14px] font-black text-[var(--narriv-ink,#101334)]">{L(t.term.en, t.term.id)}</p>
        <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-[#4A5280] dark:text-[#B9C0E4]">{L(t.short.en, t.short.id)}</p>
        <Link href={`/glossary#${t.id}`} className="mt-3 inline-block text-[12.5px] font-bold text-[#3247D9] hover:underline dark:text-[#A9B4FF]">
          {L("More in the Glossary →", "Selengkapnya di Glosarium →")}
        </Link>
      </PopoverContent>
    </Popover>
  );
}
