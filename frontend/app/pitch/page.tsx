// /pitch: the Narriv pitch deck (16:9) for presenting to prospects. Slides render on the server; Deck (client) only
// handles navigation, language and printing. Not for search results.
import type { Metadata } from "next";
import Deck from "./deck";
import { deck } from "./slides";

export const metadata: Metadata = {
  title: "Narriv Pitch Deck",
  description: "Narriv: media monitoring and narrative intelligence for brands in Indonesia.",
  robots: { index: false, follow: false },
};

export default function PitchPage() {
  return <Deck id={deck(false)} en={deck(true)} />;
}
