import { useTranslations } from "next-intl";
import { BriefcaseBusiness } from "lucide-react";
import { SectionHeader, StatusBadge, SurfaceCard } from "@/components/ui/demo-primitives";

export default function CasesPage() {
  const t = useTranslations("Workspace.cases");
  const cases = [
    [t("items.deliveryTitle"), t("items.deliveryStatus"), t("items.deliveryOwner")],
    [t("items.competitorTitle"), t("items.competitorStatus"), t("items.competitorOwner")],
    [t("items.trustTitle"), t("items.trustStatus"), t("items.trustOwner")],
  ];

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <SurfaceCard className="overflow-hidden">
        <div className="theme-border border-b p-6"><h2 className="theme-text flex items-center gap-2 text-xl font-semibold"><BriefcaseBusiness className="theme-accent" /> {t("queue")}</h2></div>
        <div className="divide-y divide-[var(--border)]">
          {cases.map(([title, status, owner]) => (
            <div key={title} className="grid gap-3 p-5 md:grid-cols-[1fr_140px_140px] md:items-center">
              <p className="theme-text font-semibold">{title}</p>
              <StatusBadge tone="slate">{status}</StatusBadge>
              <p className="theme-muted text-sm">{t("owner")}: {owner}</p>
            </div>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}
