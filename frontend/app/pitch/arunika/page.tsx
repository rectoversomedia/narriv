// /pitch/arunika: the monthly-review deck on a fictional client (Bank Arunika) with full sample data, so every
// capability shows complete. Links open the "Coba Demo" brand workspace. Same presenter as /pitch. Not indexed.
import type { Metadata } from "next";
import Deck from "../deck";
import { arunikaDeck } from "./slides";

export const metadata: Metadata = {
  title: "Narriv · Monthly Review Bank Arunika",
  description: "Contoh review bulanan Narriv untuk klien fiktif Bank Arunika, dengan data contoh lengkap.",
  robots: { index: false, follow: false },
};

export default function ArunikaPitchPage() {
  return <Deck id={arunikaDeck(false)} en={arunikaDeck(true)} pdf={null} defaultLang="id" />;
}
