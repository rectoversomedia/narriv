import { useTranslations } from "next-intl";
import { PlugZap } from "lucide-react";
import { SectionHeader, StatusBadge, SurfaceCard } from "@/components/ui/demo-primitives";

export default function IntegrationsPage() {
  const t = useTranslations("Workspace.integrations");
  const integrations = [
    [t("items.googleNewsName"), t("status.connected"), t("items.googleNewsDesc"), true],
    [t("items.apifyName"), t("status.demo"), t("items.apifyDesc"), false],
    [t("items.benchmarksName"), t("status.connected"), t("items.benchmarksDesc"), true],
    [t("items.slackName"), t("status.mocked"), t("items.slackDesc"), false],
  ] as const;

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <div className="grid gap-4 lg:grid-cols-2">
        {integrations.map(([name, status, desc, connected]) => (
          <SurfaceCard key={name} className="p-6">
            <PlugZap className="theme-accent" />
            <div className="mt-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="theme-text text-xl font-semibold">{name}</h2>
                <p className="theme-muted mt-2 text-sm">{desc}</p>
              </div>
              <StatusBadge tone={connected ? "green" : "slate"}>{status}</StatusBadge>
            </div>
          </SurfaceCard>
        ))}
      </div>
    </div>
  );
}
