import { Sparkles } from "lucide-react";

// One banner for every page in a demo session. Signals and narratives in the
// demo workspace come from live monitoring; sample panels carry their own
// "Illustrative" or "Demo" label.
export function DemoBanner() {
  return (
    <div role="note" className="flex items-center justify-center gap-2 rounded-[10px] border border-[#8B5CFF]/20 bg-[#8B5CFF]/10 px-4 py-3 text-center">
      <Sparkles size={16} className="shrink-0 text-[#6E44E8]" aria-hidden="true" />
      <p className="text-[13px] font-bold text-[#6E44E8]">
        Demo workspace — live monitoring data; panels marked Illustrative or Demo show example content
      </p>
    </div>
  );
}
