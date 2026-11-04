"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Trash2, Webhook } from "lucide-react";
import { GoogleChat, MicrosoftTeams, Slack, WhatsApp } from "@ridemountainpig/svgl-react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { DashboardEmptyState, DashboardErrorState, TableSkeleton } from "@/components/dashboard/dashboard-states";
import { useToast } from "@/components/ui/toast";
import { createIntegration, deleteIntegration, getIntegrations, updateIntegration, testIntegration, type IntegrationRecord } from "@/lib/api-service";
import { isDemoSession as isDemoUser, useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";
import { intlLocale } from "@/store/useUiStore";
import { DemoBanner } from "@/components/ui/demo-banner";
import { pickL } from "@/lib/use-l";
const emptyIntegrations: IntegrationRecord[] = [];

function platformLabel(platform: string, options: { value: string; label: string }[]) {
  return options.find((option) => option.value === platform)?.label || platform;
}

// Status in words, with the colour that says whether alerts get through.
const STATUS_LOOK: Record<string, { label: [string, string]; cls: string }> = {
  active: { label: ["Sending", "Mengirim"], cls: "bg-[#E5F6EE] text-[#047857]" },
  inactive: { label: ["Paused", "Dijeda"], cls: "bg-[#EEF1F6] text-[#5A6478]" },
  error: { label: ["Failing", "Gagal"], cls: "bg-[#FDECEC] text-[#C81E1E]" },
};

const CHANNELS = [
  { value: "slack", name: "Slack", Icon: Slack, rgb: "74,21,75", placeholder: "https://hooks.slack.com/services/…", steps: [["Open Slack → Apps → Incoming Webhooks", "Buka Slack → Apps → Incoming Webhooks"], ["Add it to the channel for alerts", "Tambahkan ke channel untuk peringatan"], ["Copy the URL and paste it here", "Salin URL-nya, tempel di sini"]] as Array<[string, string]> },
  { value: "teams", name: "Microsoft Teams", Icon: MicrosoftTeams, rgb: "80,89,201", placeholder: "https://….webhook.office.com/…", steps: [["Open the channel ⋯ → Workflows", "Buka ⋯ pada channel → Workflows"], ["Choose Incoming Webhook", "Pilih Incoming Webhook"], ["Copy the URL and paste it here", "Salin URL-nya, tempel di sini"]] as Array<[string, string]> },
  { value: "google_chat", name: "Google Chat", Icon: GoogleChat, rgb: "0,172,71", placeholder: "https://chat.googleapis.com/v1/spaces/…", steps: [["Open the space → Apps & integrations", "Buka space → Apps & integrations"], ["Add webhooks, name it Narriv", "Tambah webhook, beri nama Narriv"], ["Copy the URL and paste it here", "Salin URL-nya, tempel di sini"]] as Array<[string, string]> },
  { value: "whatsapp", name: "WhatsApp", Icon: WhatsApp, rgb: "37,211,102", placeholder: "", steps: [["Open Meta for Developers → WhatsApp → API Setup", "Buka Meta for Developers → WhatsApp → API Setup"], ["Copy the Phone Number ID and a permanent access token", "Salin Phone Number ID dan access token permanen"], ["Enter who should receive alerts", "Isi nomor yang menerima peringatan"]] as Array<[string, string]> },
  { value: "webhook", name: "Webhook", Icon: Webhook, rgb: "70,95,255", placeholder: "https://", steps: [["Prepare an https address on your system", "Siapkan alamat https di sistem Anda"], ["Narriv POSTs JSON for every alert", "Narriv mengirim JSON untuk tiap peringatan"], ["Paste the address here", "Tempel alamatnya di sini"]] as Array<[string, string]> },
];
const MAIN_CHANNELS = CHANNELS.filter((c) => c.value !== "webhook");

function formatDateTime(value: string | null, neverSyncedLabel: string) {
  if (!value) return neverSyncedLabel;
  return new Intl.DateTimeFormat(intlLocale(), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}


export default function IntegrationsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const platformFilter = "";
  const statusFilter = "";
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("slack");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [recipients, setRecipients] = useState("");
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<IntegrationRecord | null>(null);

  const user = useAuthStore((state) => state.user);
  const isDemoSession = isDemoUser(user);

  const t = useTranslations("Workspace.integrations");

  const platformOptions = useMemo(() => [
    { value: "slack", label: "Slack" },
    { value: "teams", label: "Microsoft Teams" },
    { value: "google_chat", label: "Google Chat" },
    { value: "whatsapp", label: "WhatsApp" },
    { value: "webhook", label: t("platforms.webhook") },
    // Only these three deliver alerts; email and WhatsApp are set in Settings → Notifications.
  ], [t]);


  const integrationsQuery = useQuery({
    queryKey: ["integrations", { platform: platformFilter, status: statusFilter }],
    queryFn: async () => {
      return await getIntegrations({
        platform: platformFilter || undefined,
        status: statusFilter || undefined,
      });
    },
    staleTime: 30 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (input: { name: string; platform: string; config: Record<string, unknown> }) => createIntegration(input),
    onSuccess: async (result) => {
      if (!result) {
        toast.error(t("toast.createFailed"));
        return;
      }

      setName("");
      setPlatform("slack");
      setWebhookUrl("");
      setPhoneNumberId("");
      setAccessToken("");
      setRecipients("");
      setFormError("");
      await queryClient.invalidateQueries({ queryKey: ["integrations"] });
      toast.success(t("toast.createSuccess"));
    },
    onError: () => toast.error(t("toast.createFailed")),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateIntegration(id, { status }),
    onSuccess: async (result) => {
      if (!result) {
        toast.error(t("toast.updateFailed"));
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["integrations"] });
      toast.success(t("toast.updateSuccess"));
    },
    onError: () => toast.error(t("toast.updateFailed")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteIntegration(id),
    onSuccess: async (result) => {
      if (!result) {
        toast.error(t("toast.deleteFailed"));
        return;
      }

      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["integrations"] });
      toast.success(t("toast.deleteSuccess"));
    },
    onError: () => toast.error(t("toast.deleteFailed")),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => testIntegration(id),
    onSuccess: (res) => {
      toast.success(res?.message || pickL("Test message sent.", "Pesan uji terkirim."));
    },
    onError: (err: Error) => {
      toast.error(err.message || pickL("The test message could not be sent.", "Pesan uji gagal terkirim."));
    },
  });

  const integrations = integrationsQuery.data?.data || emptyIntegrations;
  const activeCount = integrations.filter((i) => i.status === "active").length;
  const failing = integrations.filter((i) => i.status === "error").length;
  const channel = CHANNELS.find((c) => c.value === platform) ?? CHANNELS[0];

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setFormError(pickL("Give the connection a name.", "Beri nama koneksinya."));
      return;
    }
    if (platform === "whatsapp") {
      if (!phoneNumberId.trim() || !accessToken.trim() || !recipients.trim()) {
        setFormError(pickL("Fill in the Phone Number ID, the access token and at least one number.", "Isi Phone Number ID, access token, dan minimal satu nomor."));
        return;
      }
      createMutation.mutate({ name: name.trim(), platform, config: { phoneNumberId: phoneNumberId.trim(), accessToken: accessToken.trim(), to: recipients.trim() } });
      return;
    }
    if (!/^https:\/\/\S+$/.test(webhookUrl.trim())) {
      setFormError(pickL("Enter the webhook URL (it starts with https://).", "Isi URL webhook (diawali https://)."));
      return;
    }
    if (platform === "google_chat" && !webhookUrl.trim().startsWith("https://chat.googleapis.com/")) {
      setFormError(pickL("A Google Chat webhook starts with https://chat.googleapis.com/", "Webhook Google Chat diawali https://chat.googleapis.com/"));
      return;
    }
    createMutation.mutate({ name: name.trim(), platform, config: { webhookUrl: webhookUrl.trim() } });
  };

  const banner = failing
    ? { bg: "linear-gradient(135deg,#7F1D1D,#C81E1E)", title: pickL(`${failing} connection(s) failing`, `${failing} koneksi gagal mengirim`), sub: pickL("Alerts may not reach your team. Test or reconnect below.", "Peringatan bisa tidak sampai ke tim. Uji atau hubungkan ulang di bawah.") }
    : activeCount
      ? { bg: "linear-gradient(135deg,#065F46,#12A66A)", title: pickL(`Alerts go to ${activeCount} channel(s)`, `Peringatan terkirim ke ${activeCount} saluran`), sub: pickL("New alerts are posted automatically as they are raised.", "Setiap peringatan baru langsung dikirim otomatis.") }
      : { bg: "linear-gradient(135deg,#7C2D12,#E8590C)", title: pickL("Alerts are not sent anywhere yet", "Peringatan belum dikirim ke mana pun"), sub: pickL("Connect Slack, Teams, Google Chat or WhatsApp so your team hears about a crisis in minutes.", "Hubungkan Slack, Teams, Google Chat, atau WhatsApp agar tim tahu krisis dalam hitungan menit.") };

  return (
    <div className="space-y-5 pb-6">
      {isDemoSession ? <DemoBanner /> : null}

      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <h1 className="text-[28px] font-black leading-tight tracking-[-0.02em] text-[#101334]">{t("title")}</h1>
        <Link href="/workspace/settings#notifications" className="text-[12px] font-black text-[#3B52F5] hover:underline">{pickL("Email alerts are in Settings →", "Peringatan email ada di Pengaturan →")}</Link>
      </header>

      <section className="rounded-[16px] p-5 text-white shadow-[0_12px_32px_rgba(16,19,52,0.16)]" style={{ background: banner.bg }}>
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/70">{pickL("Alert delivery", "Pengiriman peringatan")}</p>
        <p className="mt-1 text-[24px] font-black leading-tight">{banner.title}</p>
        <p className="mt-1 text-[13px] font-bold text-white/85">{banner.sub}</p>
      </section>

      {/* One card per channel: how many are connected, and the button that starts connecting one. */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {MAIN_CHANNELS.map((c) => {
          const connected = integrations.filter((i) => i.platform === c.value);
          const live = connected.filter((i) => i.status === "active").length;
          const selected = platform === c.value;
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => { setPlatform(c.value); setFormError(""); document.getElementById("integration-name")?.focus(); }}
              className={cn("rounded-[14px] bg-white p-4 text-left shadow-[0_2px_12px_rgba(16,24,40,0.05)] transition", selected ? "ring-2 ring-[#465FFF]" : "hover:shadow-[0_6px_20px_rgba(16,24,40,0.08)]")}
              style={{ backgroundImage: `linear-gradient(160deg, rgba(${c.rgb},0.10), rgba(${c.rgb},0.02) 60%)` }}
            >
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-[10px] bg-white shadow-sm"><c.Icon className="size-6 text-[#3B52F5]" /></span>
                <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-black", live ? "bg-[#12A66A] text-white" : "bg-white text-[#5A6478]")}>{live ? pickL(`${live} connected`, `${live} terhubung`) : pickL("Not connected", "Belum terhubung")}</span>
              </div>
              <p className="mt-3 text-[16px] font-black text-[#101334]">{c.name}</p>
              <p className="mt-0.5 text-[12px] font-black text-[#3B52F5]">{selected ? pickL("Fill in the form below ↓", "Isi form di bawah ↓") : pickL("Connect →", "Hubungkan →")}</p>
            </button>
          );
        })}
      </section>
      <button type="button" onClick={() => { setPlatform("webhook"); setFormError(""); document.getElementById("integration-name")?.focus(); }} className={cn("-mt-2 self-start text-[12px] font-black hover:underline", platform === "webhook" ? "text-[#101334]" : "text-[#3B52F5]")}>
        {pickL("Using another system? Connect a webhook →", "Pakai sistem lain? Hubungkan lewat webhook →")}
        {integrations.some((i) => i.platform === "webhook") ? pickL(` (${integrations.filter((i) => i.platform === "webhook").length} connected)`, ` (${integrations.filter((i) => i.platform === "webhook").length} terhubung)`) : ""}
      </button>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.3fr)]">
        <section className="rounded-[16px] bg-white p-5 shadow-[0_2px_12px_rgba(16,24,40,0.05)]">
          <h2 className="text-[16px] font-black tracking-[-0.02em] text-[#101334]">{pickL(`Connect ${channel.name}`, `Hubungkan ${channel.name}`)}</h2>
          <ol className="mt-3 space-y-2">
            {channel.steps.map((step, i) => (
              <li key={i} className="flex items-center gap-2.5 text-[12px] font-bold text-[#31406B]">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#101334] text-[11px] font-black text-white">{i + 1}</span>
                {pickL(...step)}
              </li>
            ))}
          </ol>
          <form onSubmit={handleCreate} className="mt-4 space-y-3">
            <label className="grid gap-1.5">
              <span className="text-[12px] font-black text-[#101334]">{pickL("Name", "Nama")}</span>
              <input id="integration-name" value={name} onChange={(e) => { setName(e.target.value); setFormError(""); }} placeholder={platform === "whatsapp" ? pickL("e.g. Crisis team", "mis. Tim krisis") : pickL("e.g. #crisis-room", "mis. #ruang-krisis")} className="h-10 rounded-[10px] bg-[#F4F6FC] px-3 text-[13px] font-bold text-[#101334] outline-none placeholder:text-[#A8B0C7] focus:ring-2 focus:ring-[#465FFF]/30" />
            </label>
            {platform === "whatsapp" ? (
              <>
                <label className="grid gap-1.5">
                  <span className="text-[12px] font-black text-[#101334]">Phone Number ID</span>
                  <input value={phoneNumberId} onChange={(e) => { setPhoneNumberId(e.target.value); setFormError(""); }} inputMode="numeric" placeholder="mis. 109876543210987" className="h-10 rounded-[10px] bg-[#F4F6FC] px-3 text-[13px] font-bold text-[#101334] outline-none placeholder:text-[#A8B0C7] focus:ring-2 focus:ring-[#465FFF]/30" />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-[12px] font-black text-[#101334]">Access token</span>
                  <input type="password" autoComplete="off" value={accessToken} onChange={(e) => { setAccessToken(e.target.value); setFormError(""); }} placeholder="EAAG…" className="h-10 rounded-[10px] bg-[#F4F6FC] px-3 text-[13px] font-bold text-[#101334] outline-none placeholder:text-[#A8B0C7] focus:ring-2 focus:ring-[#465FFF]/30" />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-[12px] font-black text-[#101334]">{pickL("Recipient numbers", "Nomor penerima")}</span>
                  <input value={recipients} onChange={(e) => { setRecipients(e.target.value); setFormError(""); }} placeholder="0812xxxx, 0813xxxx" className="h-10 rounded-[10px] bg-[#F4F6FC] px-3 text-[13px] font-bold text-[#101334] outline-none placeholder:text-[#A8B0C7] focus:ring-2 focus:ring-[#465FFF]/30" />
                  <span className="text-[11px] font-semibold leading-snug text-[#5A6478]">{pickL("Separate numbers with commas. WhatsApp only delivers free text to people who messaged your business number in the last 24 hours.", "Pisahkan dengan koma. WhatsApp hanya mengirim pesan bebas ke nomor yang mengirim pesan ke nomor bisnis Anda dalam 24 jam terakhir.")}</span>
                </label>
              </>
            ) : (
              <label className="grid gap-1.5">
                <span className="text-[12px] font-black text-[#101334]">{pickL("Webhook URL", "URL webhook")}</span>
                <input type="url" value={webhookUrl} onChange={(e) => { setWebhookUrl(e.target.value); setFormError(""); }} placeholder={channel.placeholder} className="h-10 rounded-[10px] bg-[#F4F6FC] px-3 text-[13px] font-bold text-[#101334] outline-none placeholder:text-[#A8B0C7] focus:ring-2 focus:ring-[#465FFF]/30" />
              </label>
            )}
            {formError ? <p className="rounded-[10px] bg-[#FDECEC] px-3 py-2 text-[12px] font-bold text-[#C81E1E]">{formError}</p> : null}
            <button type="submit" disabled={createMutation.isPending} className="h-10 w-full rounded-[10px] bg-[#465FFF] text-[13px] font-black text-white transition hover:bg-[#3B52F5] disabled:opacity-60">
              {createMutation.isPending ? t("form.connecting") : pickL(`Connect ${channel.name}`, `Hubungkan ${channel.name}`)}
            </button>
          </form>
        </section>

        <section className="rounded-[16px] bg-white shadow-[0_2px_12px_rgba(16,24,40,0.05)]">
          <div className="flex items-baseline justify-between gap-3 px-5 pt-5">
            <h2 className="text-[16px] font-black tracking-[-0.02em] text-[#101334]">{pickL("Connected channels", "Saluran terhubung")}</h2>
            {integrations.length ? <span className="text-[12px] font-bold text-[#5A6478]">{pickL(`${activeCount} of ${integrations.length} sending`, `${activeCount} dari ${integrations.length} mengirim`)}</span> : null}
          </div>
          {integrationsQuery.isError || integrationsQuery.data === null ? (
            <div className="p-5"><DashboardErrorState title={pickL("Connections could not be loaded", "Koneksi gagal dimuat")} description={pickL("Refresh the page or try again in a moment.", "Muat ulang halaman atau coba lagi sebentar.")} onRetry={() => integrationsQuery.refetch()} /></div>
          ) : integrationsQuery.isPending ? (
            <div className="p-5"><TableSkeleton rows={4} columns={3} /></div>
          ) : integrations.length === 0 ? (
            <div className="p-5"><DashboardEmptyState title={pickL("No channel connected yet", "Belum ada saluran terhubung")} description={pickL("Pick Slack, Teams, Google Chat or WhatsApp above; it takes about a minute.", "Pilih Slack, Teams, Google Chat, atau WhatsApp di atas; cukup sekitar satu menit.")} icon="inbox" minHeight="min-h-[220px]" /></div>
          ) : (
            <ul className="mt-3 divide-y divide-[#F0F2F8]">
              {integrations.map((item) => {
                const ch = CHANNELS.find((c) => c.value === item.platform);
                const look = STATUS_LOOK[item.status] ?? STATUS_LOOK.inactive;
                const Icon = ch?.Icon ?? Webhook;
                return (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#F4F6FC]"><Icon className="size-5 text-[#3B52F5]" /></span>
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-black text-[#101334]">{item.name}</p>
                        <p className="text-[11px] font-bold text-[#5A6478]">{platformLabel(item.platform, platformOptions)} · {pickL("last sent", "terakhir kirim")} {formatDateTime(item.lastSyncAt, pickL("never", "belum pernah"))}</p>
                        {item.errorMessage ? <p className="mt-0.5 text-[11px] font-bold text-[#C81E1E]">{item.errorMessage}</p> : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-black", look.cls)}>{pickL(...look.label)}</span>
                      <button type="button" onClick={() => testMutation.mutate(item.id)} disabled={testMutation.isPending} className="h-8 rounded-[8px] bg-[#EEF1FF] px-3 text-[12px] font-black text-[#3B52F5] transition hover:bg-[#E1E6FF] disabled:opacity-50">{pickL("Send test", "Kirim uji")}</button>
                      <button type="button" onClick={() => updateStatusMutation.mutate({ id: item.id, status: item.status === "active" ? "inactive" : "active" })} disabled={updateStatusMutation.isPending} className="h-8 rounded-[8px] bg-[#F4F6FC] px-3 text-[12px] font-black text-[#31406B] transition hover:bg-[#EBEEF7] disabled:opacity-50">{item.status === "active" ? pickL("Pause", "Jeda") : pickL("Resume", "Aktifkan")}</button>
                      <button type="button" onClick={() => setDeleteTarget(item)} aria-label={pickL(`Disconnect ${item.name}`, `Putuskan ${item.name}`)} className="flex size-8 items-center justify-center rounded-[8px] text-[#8A93AD] transition hover:bg-[#FDECEC] hover:text-[#C81E1E]"><Trash2 size={15} /></button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title={t("delete.title")}
        description={deleteTarget ? t("delete.description", { name: deleteTarget.name }) : t("delete.cancel")}
        confirmLabel={t("delete.confirm")}
        cancelLabel={t("delete.cancel")}
        tone="danger"
      />
    </div>
  );
}
