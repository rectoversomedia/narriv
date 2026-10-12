// Tone colours (#10B981, #F59E0B, ...) suit icons, fills and chart marks, but
// as small text on white or tinted cards they fall below WCAG AA (4.5:1).
// Use this for text set via `style={{ color }}`; it keeps the hue, only darker.
const TEXT_SAFE: Record<string, string> = {
  "#10B981": "#047857",
  "#059669": "#047857",
  "#22C55E": "#15803D",
  "#F59E0B": "#A04606",
  "#D97706": "#A04606",
  "#F97316": "#C2410C",
  "#EF4444": "#C81E1E",
  "#DC2626": "#C81E1E",
  "#465FFF": "#3B52F5",
  "#3B82F6": "#1D4ED8",
  "#8B5CFF": "#6E44E8",
  "#64748B": "#5A6478",
  "#94A3B8": "#5A6478",
};

export function readableTone(color: string): string {
  return TEXT_SAFE[color.toUpperCase()] ?? color;
}
