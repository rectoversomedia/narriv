/**
 * Older reports stored a field dump as their summary ("Intelligence Report: … Total Signals: 42 | Analyzed: 42.
 * Sentiment: …"). Turn that into the same plain sentence new reports get; anything else passes through.
 */
export function humanReportSummary(summary: string | null | undefined, id: boolean): string {
  const text = summary?.trim() ?? "";
  const total = /Total Signals:\s*(\d+)/i.exec(text);
  if (!total) return text;
  const n = (re: RegExp) => Number(re.exec(text)?.[1] ?? NaN);
  const signals = Number(total[1]);
  const positive = n(/(\d+)%\s*positive/i);
  const negative = n(/(\d+)%\s*negative/i);
  const alerts = n(/Alerts:\s*(\d+)/i);
  const serious = n(/\((\d+)\s*critical\/high\)/i);
  const clusters = n(/Narrative Clusters:\s*(\d+)/i);
  const parts: string[] = [];
  if (Number.isFinite(positive) && Number.isFinite(negative)) {
    const net = positive - negative;
    const tone = net <= -15 ? (id ? "cenderung negatif" : "leaning negative") : net >= 15 ? (id ? "cenderung positif" : "leaning positive") : id ? "seimbang" : "balanced";
    parts.push(id ? `${signals} sinyal, nada ${tone} (${negative}% negatif, ${positive}% positif).` : `${signals} records, ${tone} (${negative}% negative, ${positive}% positive).`);
  } else {
    parts.push(id ? `${signals} sinyal.` : `${signals} records.`);
  }
  if (Number.isFinite(alerts)) parts.push(id ? `${alerts} peringatan${Number.isFinite(serious) && serious ? `, ${serious} di antaranya kritis/tinggi` : ""}.` : `${alerts} alerts${Number.isFinite(serious) && serious ? `, ${serious} critical/high` : ""}.`);
  if (Number.isFinite(clusters)) parts.push(id ? `${clusters} isu terbentuk.` : `${clusters} issues formed.`);
  return parts.join(" ");
}
