"use client";

import { IndonesiaSignalMap } from "@/components/dashboard/indonesia-signal-map";
import { useL } from "@/lib/use-l";

// Peta Sebaran (menu Isu): where in Indonesia the conversation is, with the strongest accounts and sources per province.
export default function MapPage() {
  const L = useL();
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[26px] font-black leading-tight tracking-[-0.02em] text-navy sm:text-[28px]">{L("Signal Map", "Peta Sebaran")}</h1>
        <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-[#5F6B94]">{L("Every province where your brand is discussed, who carries the conversation there, and what they say.", "Setiap provinsi tempat brand Anda dibicarakan, siapa yang paling kuat membawa percakapan di sana, dan apa isinya.")}</p>
      </div>
      <IndonesiaSignalMap hideTitle />
    </div>
  );
}
