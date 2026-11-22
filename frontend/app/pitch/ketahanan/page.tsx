// /pitch/ketahanan: the Ketahanan Informasi deck (hoaxes, propaganda and violent extremism) on the fictional
// "Simpul Damai" demo workspace. Links open that workspace. Same presenter as /pitch. Not indexed.
import type { Metadata } from "next";
import Deck from "../deck";
import { ketahananDeck } from "./slides";

export const metadata: Metadata = {
  title: "Narriv · Ketahanan Informasi",
  description: "Narriv untuk ketahanan informasi: hoaks, propaganda, dan ekstremisme kekerasan, dengan data contoh.",
  robots: { index: false, follow: false },
};

export default function KetahananPitchPage() {
  return <Deck id={ketahananDeck(false)} en={ketahananDeck(true)} pdf={null} defaultLang="id" />;
}
