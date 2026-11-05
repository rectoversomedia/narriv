import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata(
  "Pemantauan reputasi brand",
  "Narriv memantau berita, YouTube, dan media sosial setiap jam, menilai risikonya, dan memberi tahu siapa yang harus bertindak."
);

export default function WelcomeLayout({ children }: { children: ReactNode }) {
  return children;
}
