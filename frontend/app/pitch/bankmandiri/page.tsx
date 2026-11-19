// The Bank Mandiri deck was replaced by the Bank Arunika sample deck (fictional client, complete sample data).
import { redirect } from "next/navigation";

export default function MandiriPitchPage() {
  redirect("/pitch/arunika");
}
