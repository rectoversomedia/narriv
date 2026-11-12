"use client";

import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Motion for the public pages: sections that rise in as they scroll into view, numbers that count up, and the
// moving backdrop of the dark sections. Everything holds still for visitors who ask for reduced motion.

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** True once the element has scrolled into view; stays true. */
export function useInView<T extends Element>(margin = "0px 0px -12% 0px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return [ref, inView] as const;
}

/** Fades and lifts its content in when it scrolls into view. `delay` in ms staggers siblings. */
export function Reveal({ children, delay = 0, className, as: Tag = "div" }: { children: ReactNode; delay?: number; className?: string; as?: "div" | "li" | "section" }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <Tag ref={ref as never} className={cn("mk-reveal", inView && "is-in", className)} style={{ "--mk-delay": `${delay}ms` } as CSSProperties}>
      {children}
    </Tag>
  );
}

/** Counts from zero to `to` once visible. The server renders the final number, so it reads right without script. */
export function CountUp({ to, duration = 1400, suffix = "", className }: { to: number; duration?: number; suffix?: string; className?: string }) {
  const [ref, inView] = useInView<HTMLSpanElement>("0px");
  const [value, setValue] = useState(to);
  useEffect(() => {
    if (!inView || reducedMotion()) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);
  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {value}
      {suffix}
    </span>
  );
}

/**
 * The backdrop of the dark sections: slow drifting light, and a faint web of points and lines that echoes the
 * Narriv orb, conversations linking up. Drawn on a canvas, paused while off screen.
 */
export function NarrativeField({ className, density = 1 }: { className?: string; density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const still = reducedMotion();
    let w = 0;
    let h = 0;
    let raf = 0;
    let visible = true;
    type P = { x: number; y: number; vx: number; vy: number; r: number };
    let pts: P[] = [];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(90, Math.round(((w * h) / 16000) * density));
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.4 + 0.6,
      }));
      draw();
    };

    const link = 130;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < link) {
            ctx.strokeStyle = `rgba(150,140,255,${0.16 * (1 - d / link)})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      for (const p of pts) {
        ctx.fillStyle = "rgba(205,195,255,0.7)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const step = () => {
      for (const p of pts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
      }
      draw();
      if (visible) raf = requestAnimationFrame(step);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible && !still) raf = requestAnimationFrame(step);
    });
    io.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [density]);

  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="mk-aurora mk-aurora-a" />
      <div className="mk-aurora mk-aurora-b" />
      <div className="mk-aurora mk-aurora-c" />
      <canvas ref={canvasRef} className="absolute inset-0 size-full [mask-image:radial-gradient(ellipse_75%_70%_at_50%_40%,#000_40%,transparent_100%)]" />
    </div>
  );
}

/** `mark` styles only the typed part, for a highlight that should grow with the text rather than show up empty. */
export type TypeSegment = { text: string; className?: string; mark?: string };

/**
 * Types its text out once it scrolls into view, with a blinking caret. The untyped rest is laid out but invisible,
 * so nothing shifts while it types; screen readers get the whole text at once. Segments keep their own styling
 * (an accent line, a highlight); `block` puts a segment on its own line.
 */
export function Typewriter({ segments, speed = 32, delay = 0, className, onDone }: { segments: (TypeSegment & { block?: boolean; breakBefore?: boolean })[]; speed?: number; delay?: number; className?: string; onDone?: () => void }) {
  const [ref, inView] = useInView<HTMLSpanElement>("0px 0px -8% 0px");
  const total = segments.reduce((n, s) => n + s.text.length, 0);
  const [count, setCount] = useState(0);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (!inView) return;
    if (reducedMotion()) {
      setCount(total);
      doneRef.current?.();
      return;
    }
    let n = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      n += 1;
      setCount(n);
      if (n < total) timer = setTimeout(tick, speed);
      else doneRef.current?.();
    };
    timer = setTimeout(tick, delay);
    return () => clearTimeout(timer);
  }, [inView, total, speed, delay]);

  // Segments join as written; a segment that starts a new line gets a space so the words do not run together.
  const label = segments
    .map((seg, i) => (i > 0 && (seg.block || seg.breakBefore || segments[i - 1].block) ? ` ${seg.text}` : seg.text))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  const typing = inView && count < total;
  let start = 0;
  return (
    <span ref={ref} className={className} aria-label={label}>
      {segments.map((seg, i) => {
        const shown = Math.max(0, Math.min(seg.text.length, count - start));
        // The caret sits in the segment being typed: from its first letter until the next segment begins.
        const caretHere = typing && count >= start && count < start + seg.text.length;
        start += seg.text.length;
        return (
          <Fragment key={i}>
          {seg.breakBefore ? <br /> : null}
          <span aria-hidden="true" className={cn(seg.className, seg.block && "block")}>
            {seg.mark && shown > 0 ? <span className={seg.mark}>{seg.text.slice(0, shown)}</span> : seg.text.slice(0, shown)}
            {/* The caret floats over the gap so it never adds a line-break point mid-word. */}
            {caretHere ? <span className="relative"><span className="mk-caret" /></span> : null}
            <span className="invisible">{seg.text.slice(shown)}</span>
          </span>
          </Fragment>
        );
      })}
    </span>
  );
}

/**
 * "Narrative Intelligence", Narriv's category, set apart wherever it appears: bold white words on a painted brush
 * stroke (.mk-brush in globals.css), on one unbreakable line. `NI_MARK` paints only the typed part, so in a
 * Typewriter the stroke grows with the words; `NarrativeIntelligence` is the plain inline version.
 */
export const NI_TEXT = "Narrative Intelligence";
// On narrow phones the phrase shrinks a little (7.8vw) rather than break or run off the screen.
export const NI_CLASS = "whitespace-nowrap text-[min(1em,7.8vw)] font-black text-white [&_.mk-caret]:bg-[#9B4DDB]";
export const NI_MARK = "mk-brush";

export function NarrativeIntelligence({ className }: { className?: string }) {
  return <span className={cn(NI_CLASS, NI_MARK, className)}>{NI_TEXT}</span>;
}
