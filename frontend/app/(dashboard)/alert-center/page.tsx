import { permanentRedirect } from "next/navigation";

// Superseded by /alerts; the old page was unlinked, crashed on live data and
// rendered untranslated keys.
export default function AlertCenterRedirectPage() {
  permanentRedirect("/alerts");
}
