import { pickL } from "@/lib/use-l";

/** Teams an alert or case can be routed to. The stored value is the Indonesian name, shown in the UI language. */
export const TEAMS: Array<[string, string]> = [
  ["Communications & PR", "Komunikasi & PR"],
  ["Customer Service", "Layanan Pelanggan"],
  ["Legal & Compliance", "Legal & Kepatuhan"],
  ["Operations & IT", "Operasional & IT"],
  ["Marketing", "Pemasaran"],
  ["Management / BOD", "Manajemen / Direksi"],
];

export function teamOptions(current?: string | null) {
  const options = TEAMS.map(([en, id]) => ({ value: id, label: pickL(en, id) }));
  // Keep a value saved earlier (a custom team or an escalation role) selectable.
  if (current && !options.some((o) => o.value === current)) options.push({ value: current, label: current });
  return options;
}
