import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Long text, laid out to read easily: blank lines become paragraphs, a long paragraph is broken after every two
 * sentences, "**bold**" is bold, a line that is only "**Heading**" is a small heading, and "- item" lines are a list.
 */
const SENTENCE = /(?<=[.!?])\s+(?=[A-Z0-9"“(À-ɏ])/u;

export function splitLong(paragraph: string, maxChars = 260): string[] {
  if (paragraph.length <= maxChars) return [paragraph];
  const sentences = paragraph.split(SENTENCE);
  if (sentences.length < 3) return [paragraph];
  const out: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) out.push(sentences.slice(i, i + 2).join(" "));
  return out;
}

function inline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => (p.startsWith("**") && p.endsWith("**") && p.length > 4 ? <strong key={i} className="font-bold text-[#101334]">{p.slice(2, -2)}</strong> : <Fragment key={i}>{p}</Fragment>));
}

export function RichText({ text, className, pClassName }: { text?: string | null; className?: string; pClassName?: string }) {
  if (!text) return null;
  const blocks = String(text).replace(/\r/g, "").split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const out: ReactNode[] = [];
  blocks.forEach((block, bi) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    let list: string[] = [];
    const flush = (key: string) => {
      if (!list.length) return;
      out.push(
        <ul key={key} className="grid gap-1.5">
          {list.map((li, i) => (
            <li key={i} className="flex gap-2.5"><span className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-[#465FFF]" aria-hidden="true" /><span>{inline(li)}</span></li>
          ))}
        </ul>,
      );
      list = [];
    };
    lines.forEach((line, li) => {
      const key = `${bi}-${li}`;
      if (/^[-•*]\s+/.test(line)) { list.push(line.replace(/^[-•*]\s+/, "")); return; }
      flush(`${key}-l`);
      const heading = line.match(/^\*\*([^*]+)\*\*:?$/) || line.match(/^#{1,4}\s+(.+)$/);
      if (heading) { out.push(<p key={key} className="pt-1 text-[0.95em] font-black text-[#101334]">{heading[1]}</p>); return; }
      splitLong(line).forEach((para, pi) => out.push(<p key={`${key}-${pi}`} className={pClassName}>{inline(para)}</p>));
    });
    flush(`${bi}-end`);
  });
  return <div className={cn("grid gap-3", className)}>{out}</div>;
}
