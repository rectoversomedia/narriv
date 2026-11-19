// /pitch: the Narriv pitch deck (16:9) for presenting to prospects. Slides render on the server; Deck (client) only
// handles navigation, language and printing. Not for search results.
import type { Metadata } from "next";
import Deck from "./deck";
import { deck } from "./slides";
import { ArunikaReport, Coordination, DefaultFlow, Escalation, FourLayers, Influencers, Network, RiskAndClaims } from "./arunika/slides";
import { Reports } from "./slides";

export const metadata: Metadata = {
  title: "Narriv Pitch Deck",
  description: "Narriv: media monitoring and narrative intelligence for brands in Indonesia.",
  robots: { index: false, follow: false },
};

/** The main deck plus the newer capabilities (conversation network, coordination signs, the automatic flow), shown
 *  on the Bank Arunika sample data, right after the alerts slide. */
function fullDeck(en: boolean) {
  const slides = deck(en);
  const at = slides.findIndex((s) => s.key === "alerts") + 1 || slides.length;
  const sol = slides.findIndex((s) => s.key === "solution") + 1;
  return [
    ...slides.slice(0, sol),
    <FourLayers key="layers" en={en} />,
    <Escalation key="escalation" en={en} />,
    ...slides.slice(sol, at),
    <RiskAndClaims key="risk" en={en} />,
    <DefaultFlow key="flow" en={en} />,
    <Network key="network" en={en} />,
    <Influencers key="influencers" en={en} />,
    <Coordination key="coord" en={en} />,
    // The report sample uses the same Bank Arunika numbers as the slides around it.
    ...slides.slice(at).map((s) => (s.key === "reports" ? <Reports key="reports" en={en} preview={<ArunikaReport en={en} />} /> : s)),
  ];
}

export default function PitchPage() {
  return <Deck id={fullDeck(false)} en={fullDeck(true)} />;
}
