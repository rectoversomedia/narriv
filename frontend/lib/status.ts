/**
 * One status, three words, on every page: Safe / Watch / Needs Action (Aman / Waspada / Perlu Tindakan).
 * Overview, Daily Brief, Analysis and Reports used to show four different verdicts (Needs Attention, Risk Low,
 * Elevated, Balanced) for the same data; each page now maps its own numbers onto these same three words.
 */
export type Status = "action" | "watch" | "safe";

export const STATUS_WORD: Record<Status, [string, string]> = {
  action: ["Needs Action", "Perlu Tindakan"],
  watch: ["Watch", "Waspada"],
  safe: ["Safe", "Aman"],
};

export const STATUS_COLOR: Record<Status, { text: string; bar: string; chip: string }> = {
  action: { text: "#C81E1E", bar: "#E5484D", chip: "bg-[#FDECEC] text-[#B42318]" },
  watch: { text: "#A04606", bar: "#F59E0B", chip: "bg-[#FFF4E5] text-[#A04606]" },
  safe: { text: "#047857", bar: "#12A66A", chip: "bg-[#E5F6EE] text-[#047857]" },
};

/** From the conversation numbers: share of negative mentions and the alerts still open. */
export function statusFromMentions({ negativeShare, worstShare = 0, criticalAlerts = 0, openAlerts = 0 }: { negativeShare: number; worstShare?: number; criticalAlerts?: number; openAlerts?: number }): Status {
  if (criticalAlerts > 0 || negativeShare >= 40 || worstShare >= 60) return "action";
  if (negativeShare >= 25 || openAlerts > 0) return "watch";
  return "safe";
}

/** From the 0-100 risk score (Daily Brief, Analysis): the same thresholds as its Low / Moderate / High bands. */
export function statusFromRisk(score: number): Status {
  if (score >= 50) return "action";
  if (score >= 30) return "watch";
  return "safe";
}
