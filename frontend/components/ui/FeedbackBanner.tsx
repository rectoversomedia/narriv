import { AlertCircle, CheckCircle2, Info } from "lucide-react";

type FeedbackTone = "success" | "error" | "info";

const toneStyles: Record<FeedbackTone, string> = {
  success: "border-[#12B76A]/25 bg-[#12B76A]/10 text-[#027A48] dark:text-[#6CE9A6]",
  error: "border-[#F04438]/25 bg-[#F04438]/10 text-[#B42318] dark:text-[#FDA29B]",
  info: "border-[#465FFF]/25 bg-[#465FFF]/10 text-[#465FFF]",
};

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export interface FeedbackMessage {
  tone: FeedbackTone;
  title: string;
  description?: string;
}

export function FeedbackBanner({ message }: { message: FeedbackMessage | null }) {
  if (!message) return null;

  const Icon = icons[message.tone];

  return (
    <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${toneStyles[message.tone]}`} role="status" aria-live="polite">
      <Icon className="mt-0.5 shrink-0" size={17} />
      <div className="min-w-0">
        <p className="text-sm font-semibold">{message.title}</p>
        {message.description ? <p className="mt-1 text-xs leading-5 opacity-85">{message.description}</p> : null}
      </div>
    </div>
  );
}
