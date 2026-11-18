/**
 * Stored and AI-written text sometimes joins two thoughts with a semicolon ("…dalam 36 jam; mayoritas negatif").
 * On screen that reads as one long sentence, so show it as two: "…dalam 36 jam. Mayoritas negatif."
 * Only a semicolon followed by a lowercase word is split; lists and code are left alone.
 */
export function tidyText(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/([\p{L}\p{N})])\s*;\s+(\p{Ll})/gu, (_m, before: string, after: string) => `${before}. ${after.toUpperCase()}`);
}

/** A "Label: rest" title (older alerts and reports) read as a plain phrase: "rest" leads, the label follows in lower case. */
export function tidyTitle(title: string | null | undefined): string {
  if (!title) return "";
  const m = /^([^:]{3,40}):\s+(.+)$/.exec(title.trim());
  if (!m) return title;
  const [, label, rest] = m;
  return `${label} ${rest}`.replace(/\s+/g, " ");
}
