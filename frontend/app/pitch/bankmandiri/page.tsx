// /pitch/bankmandiri: the Narriv deck for a Bank Mandiri meeting, with Narriv's real 30-day monitoring of public
// news and YouTube about the bank. Same presenter as /pitch; no ready PDF for this one (P prints it). Not indexed.
import type { Metadata } from "next";
import Deck from "../deck";
import { mandiriDeck } from "./slides";

export const metadata: Metadata = {
  title: "Narriv untuk Bank Mandiri",
  description: "Hasil pemantauan Narriv atas percakapan publik tentang Bank Mandiri, 30 hari terakhir.",
  robots: { index: false, follow: false },
};

export default function MandiriPitchPage() {
  return <Deck id={mandiriDeck(false)} en={mandiriDeck(true)} pdf={null} defaultLang="id" />;
}
