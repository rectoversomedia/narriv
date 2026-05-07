import { useTranslations } from "next-intl";
import { Settings, ShieldCheck } from "lucide-react";
import {
  SectionHeader,
  StatusBadge,
  SurfaceCard,
} from "@/components/ui/demo-primitives";

export default function SettingsPage() {
  const t = useTranslations("Workspace.settings");
  const readinessItems = [
    t("readinessItems.item1"),
    t("readinessItems.item2"),
    t("readinessItems.item3"),
    t("readinessItems.item4"),
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <SurfaceCard className="p-6">
          <h2 className="theme-text flex items-center gap-2 text-xl font-semibold">
            <Settings className="theme-accent" /> {t("workspaceProfile")}
          </h2>
          <div className="mt-5 space-y-4 text-sm">
            <div className="theme-border flex justify-between border-b pb-3">
              <span className="theme-muted">{t("workspace")}</span>
              <span className="theme-text">Narriv Demo Workspace</span>
            </div>
            <div className="theme-border flex justify-between border-b pb-3">
              <span className="theme-muted">{t("mode")}</span>
              <StatusBadge tone="blue">{t("demo")}</StatusBadge>
            </div>
            <div className="flex justify-between">
              <span className="theme-muted">{t("primaryColor")}</span>
              <span className="theme-text">#465FFF</span>
            </div>
          </div>
        </SurfaceCard>
        <SurfaceCard className="p-6">
          <h2 className="theme-text flex items-center gap-2 text-xl font-semibold">
            <ShieldCheck className="text-[#12B76A]" /> {t("vercelReadiness")}
          </h2>
          <ul className="theme-soft mt-5 space-y-3 text-sm">
            {readinessItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SurfaceCard>
      </div>
    </div>
  );
}
