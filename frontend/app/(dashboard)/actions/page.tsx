import { permanentRedirect } from "next/navigation";

export default function ActionsRedirectPage() {
  permanentRedirect("/action-plans");
}
