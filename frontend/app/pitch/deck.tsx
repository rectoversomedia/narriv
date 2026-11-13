"use client";
// Presents 1920×1080 slides scaled to the screen: arrows / space / PageUp-Down, click the left third to go back and
// elsewhere to go on, swipe on phones, F for full screen, P to print. The PDF button downloads a ready 16:9 file
// (public/pitch/Narriv-Pitch-{ID,EN}.pdf, printed from this page's print layout; re-make it after editing slides).
// Same presenter as the Tugasisten and CuanPintar decks, in Narriv's colours.
// Every slide enters with its own transition and its heading/cards build in. ID | EN on the cover (top right) switches
// the whole deck; ?lang=en in the link wins, then the presenter's last choice. The slide number lives in the hash (#3).
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Maximize2, Minimize2 } from "lucide-react";

type Lang = "id" | "en";
const LANG_KEY = "narriv_pitch_lang";
const TX = ["fade", "slide-left", "rise", "zoom", "slide-right", "blur", "flip", "drop"];

export default function Deck({ id, en }: { id: React.ReactNode[]; en: React.ReactNode[] }) {
  const [lang, setLang] = useState<Lang>("en");
  const slides = lang === "en" ? en : id;
  const n = slides.length;
  const [i, setI] = useState(0);
  const [scale, setScale] = useState(0);
  const [full, setFull] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("lang");
    let saved: string | null = null;
    try { saved = localStorage.getItem(LANG_KEY); } catch { /* storage blocked */ }
    const pick = q === "en" || q === "id" ? q : saved;
    // restore the presenter's language after hydration
    if (pick === "en" || pick === "id") setLang(pick);
  }, []);
  const switchLang = (l: Lang) => {
    setLang(l);
    try { localStorage.setItem(LANG_KEY, l); } catch { /* storage blocked */ }
  };
  useEffect(() => { document.documentElement.setAttribute("lang", lang); }, [lang]);

  const go = useCallback((k: number) => setI(Math.max(0, Math.min(n - 1, k))), [n]);
  const next = useCallback(() => setI((c) => Math.min(n - 1, c + 1)), [n]);
  const prev = useCallback(() => setI((c) => Math.max(0, c - 1)), []);
  const toggleFull = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    const fit = () => { const el = box.current; if (el) setScale(Math.min(el.clientWidth / 1920, el.clientHeight / 1080)); };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [full]);

  useEffect(() => {
    const k = parseInt(window.location.hash.slice(1), 10);
    // open the slide named in the link (#7) after hydration
    if (k >= 1 && k <= n) go(k - 1);
  }, [go, n]);
  useEffect(() => { history.replaceState(null, "", `${window.location.search}#${i + 1}`); }, [i]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(e.key)) { e.preventDefault(); next(); }
      else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(e.key)) { e.preventDefault(); prev(); }
      else if (e.key === "Home") go(0);
      else if (e.key === "End") go(n - 1);
      else if (e.key === "f" || e.key === "F") toggleFull();
      else if (e.key === "p" || e.key === "P") window.print();
    };
    const onFs = () => setFull(!!document.fullscreenElement);
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);
    return () => { window.removeEventListener("keydown", onKey); document.removeEventListener("fullscreenchange", onFs); };
  }, [go, next, prev, toggleFull, n]);

  const onClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a,button")) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (e.clientX - r.left < r.width / 3) prev(); else next();
  };

  return (
    <div className="pitch-root fixed inset-0 flex flex-col bg-[#070A1F] text-white">
      <style>{CSS}</style>
      <div ref={box} className="pitch-stage relative flex-1 overflow-hidden" onClick={onClick}
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
          touchX.current = null;
        }}>
        {scale > 0 && (
          <div className="pitch-canvas absolute left-1/2 top-1/2" style={{ width: 1920, height: 1080, transform: `translate(-50%, -50%) scale(${scale})` }}>
            {/* before the slides so the last slide stays :last-child (print page breaks) */}
            {i === 0 && (
              <div className="pitch-lang pitch-ui" role="group" aria-label="Bahasa / Language" onClick={(e) => e.stopPropagation()}>
                {(["id", "en"] as const).map((l) => (
                  <button key={l} type="button" aria-pressed={lang === l} onClick={() => switchLang(l)}>{l.toUpperCase()}</button>
                ))}
              </div>
            )}
            {slides.map((s, k) => (
              <div key={`${lang}-${k}`} className="pitch-slide" data-active={k === i} data-tx={TX[k % TX.length]} aria-hidden={k !== i}>{s}</div>
            ))}
          </div>
        )}
      </div>
      {full ? (
        <button type="button" onClick={toggleFull} className="pitch-ui absolute right-3 top-3 rounded-lg bg-black/30 p-2 opacity-0 transition-opacity hover:opacity-100" aria-label="Keluar layar penuh"><Minimize2 className="size-5" /></button>
      ) : (
        <div className="pitch-ui flex items-center justify-center gap-3 px-4 py-3 text-sm">
          <button type="button" onClick={prev} disabled={i === 0} className="rounded-lg p-2 hover:bg-white/10 disabled:opacity-30" aria-label="Slide sebelumnya"><ChevronLeft className="size-5" /></button>
          <div className="hidden gap-1.5 md:flex">
            {slides.map((_, k) => (
              <button key={k} type="button" onClick={() => go(k)} aria-label={`Slide ${k + 1}`}
                className={`h-2 rounded-full transition-all ${k === i ? "w-6 bg-[#465FFF]" : "w-2 bg-white/30 hover:bg-white/60"}`} />
            ))}
          </div>
          <span className="w-16 text-center font-bold tabular-nums text-white/70">{i + 1}/{n}</span>
          <button type="button" onClick={next} disabled={i === n - 1} className="rounded-lg p-2 hover:bg-white/10 disabled:opacity-30" aria-label="Slide berikutnya"><ChevronRight className="size-5" /></button>
          <button type="button" onClick={toggleFull} className="ml-1 rounded-lg p-2 hover:bg-white/10" aria-label="Layar penuh"><Maximize2 className="size-5" /></button>
          <a href={`/pitch/Narriv-Pitch-${lang.toUpperCase()}.pdf`} download={`Narriv-Pitch-${lang.toUpperCase()}.pdf`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-semibold hover:bg-white/10" aria-label="Unduh PDF 16:9"><Download className="size-4" /> PDF</a>
        </div>
      )}
    </div>
  );
}

const CSS = `
.pitch-slide { position: absolute; inset: 0; visibility: hidden; }
.pitch-slide[data-active="true"] { visibility: visible; animation: tx-fade .7s cubic-bezier(.2,.7,.2,1) both; }
.pitch-slide[data-active="true"][data-tx="slide-left"] { animation-name: tx-left; }
.pitch-slide[data-active="true"][data-tx="slide-right"] { animation-name: tx-right; }
.pitch-slide[data-active="true"][data-tx="rise"] { animation-name: tx-rise; }
.pitch-slide[data-active="true"][data-tx="zoom"] { animation-name: tx-zoom; }
.pitch-slide[data-active="true"][data-tx="blur"] { animation-name: tx-blur; }
.pitch-slide[data-active="true"][data-tx="flip"] { animation-name: tx-flip; transform-origin: 50% 50%; }
.pitch-slide[data-active="true"][data-tx="drop"] { animation-name: tx-drop; }
@keyframes tx-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes tx-left { from { opacity: 0; transform: translateX(160px) } to { opacity: 1; transform: none } }
@keyframes tx-right { from { opacity: 0; transform: translateX(-160px) } to { opacity: 1; transform: none } }
@keyframes tx-rise { from { opacity: 0; transform: translateY(120px) } to { opacity: 1; transform: none } }
@keyframes tx-zoom { from { opacity: 0; transform: scale(1.08) } to { opacity: 1; transform: none } }
@keyframes tx-blur { from { opacity: 0; filter: blur(18px) } to { opacity: 1; filter: none } }
@keyframes tx-flip { from { opacity: 0; transform: perspective(2400px) rotateY(-14deg) scale(.96) } to { opacity: 1; transform: none } }
@keyframes tx-drop { from { opacity: 0; transform: translateY(-110px) } to { opacity: 1; transform: none } }
/* build-in: heading first, then cards/points one after another */
.pitch-slide[data-active="true"] .ph { animation: b-in .7s .12s cubic-bezier(.2,.7,.2,1) both; }
.pitch-slide[data-active="true"] .pc { animation: b-in .6s cubic-bezier(.2,.7,.2,1) both; animation-delay: .3s; }
.pitch-slide[data-active="true"] .pc:nth-child(2) { animation-delay: .4s; }
.pitch-slide[data-active="true"] .pc:nth-child(3) { animation-delay: .5s; }
.pitch-slide[data-active="true"] .pc:nth-child(4) { animation-delay: .6s; }
.pitch-slide[data-active="true"] .pc:nth-child(5) { animation-delay: .7s; }
.pitch-slide[data-active="true"] .pc:nth-child(6) { animation-delay: .8s; }
.pitch-slide[data-active="true"] .pitch-orb { animation-name: orb-drift; animation-timing-function: ease-in-out; animation-iteration-count: infinite; animation-direction: alternate; }
@keyframes orb-drift { 0% { transform: translate(0, 0) scale(1) } 50% { transform: translate(70px, -50px) scale(1.08) } 100% { transform: translate(-60px, 40px) scale(.95) } }
@keyframes b-in { from { opacity: 0; transform: translateY(34px) } to { opacity: 1; transform: none } }
.pitch-lang { position: absolute; right: 96px; top: 58px; display: flex; gap: 6px; padding: 7px; border-radius: 18px; background: rgba(255,255,255,.08); border: 2px solid rgba(255,255,255,.28); z-index: 10; }
.pitch-lang button { min-width: 84px; padding: 12px 22px; border-radius: 12px; font: 700 24px/1 var(--font-mono), monospace; letter-spacing: .12em; color: #fff; cursor: pointer; }
.pitch-lang button[aria-pressed="true"] { background: #fff; color: #101334; box-shadow: 0 5px 0 #465FFF; }
@media (prefers-reduced-motion: reduce) { .pitch-slide[data-active="true"], .pitch-slide[data-active="true"] .ph, .pitch-slide[data-active="true"] .pc, .pitch-slide .pitch-orb { animation: none !important; } }
@media print {
  @page { size: 1920px 1080px; margin: 0; }
  html, body { background: #fff !important; height: auto !important; min-height: 0 !important; overflow: visible !important; display: block !important; }
  .pitch-root { position: static !important; display: block !important; background: #fff !important; }
  .pitch-ui { display: none !important; }
  .pitch-root [aria-hidden="true"] { display: revert !important; } /* the site-wide print rule hides these; slides and accents need them */
  .pitch-stage { overflow: visible !important; }
  .pitch-canvas { position: static !important; transform: none !important; width: 1920px !important; height: auto !important; }
  .pitch-slide { position: relative !important; visibility: visible !important; width: 1920px; height: 1080px; break-after: page; page-break-after: always; overflow: hidden; animation: none !important; }
  .pitch-slide .ph, .pitch-slide .pc { animation: none !important; }
  .pitch-slide:last-child { break-after: auto; page-break-after: auto; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
}`;
