// The look shared by the public pages, as plain class strings so server components can use them too (constants
// exported from a "use client" module reach server code as client references, not strings).

/** The accent words in a headline: same typeface, heaviest weight, coloured by the caller (no italics). */
export const SERIF = "font-black tracking-[-0.035em]";
/** The ink background of dark sections. */
export const INK = "bg-[#070A1F]";
/** A soft light from the top of dark sections; no pattern. */
export const GRID = "bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(120,135,255,0.16),transparent_70%)]";
/** Warm paper for light sections, and the hairline colour on it. */
export const PAPER = "nv-paper";
export const RULE = "border-[#DDDAD0]";
