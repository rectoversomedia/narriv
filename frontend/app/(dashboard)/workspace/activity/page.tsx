import { useTranslations } from "next-intl";
import { Activity, CheckCircle2 } from "lucide-react";
import { SectionHeader, SurfaceCard } from "@/components/ui/demo-primitives";

export default function ActivityPage() {
  const t = useTranslations("Workspace.activity");
  const items = [t("items.item1"), t("items.item2"), t("items.item3"), t("items.item4")];

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <SurfaceCard className="p-6">
        <h2 className="theme-text flex items-center gap-2 text-xl font-semibold"><Activity className="theme-accent" /> {t("recentActivity")}</h2>
        <div className="mt-6 space-y-4">
          {items.map((item) => (
            <div key={item} className="theme-panel flex gap-3 rounded-xl border p-4 text-sm">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#465FFF]" />
              <span className="theme-soft">{item}</span>
            </div>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}
