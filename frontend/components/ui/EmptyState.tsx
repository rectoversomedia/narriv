import { AlertCircle, FileSearch, Inbox } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: "inbox" | "search" | "alert";
}

export function EmptyState({ title, description, icon = "inbox" }: EmptyStateProps) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-(--border) bg-(--card)/50 p-8 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#465FFF]/10 text-[#465FFF]">
        {icon === "inbox" && <Inbox size={28} />}
        {icon === "search" && <FileSearch size={28} />}
        {icon === "alert" && <AlertCircle size={28} />}
      </div>
      <h3 className="theme-text text-lg font-semibold">{title}</h3>
      <p className="theme-muted mt-2 max-w-[400px] text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
}
