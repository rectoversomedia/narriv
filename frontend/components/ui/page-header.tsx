import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Narriv page header standard. Every dashboard page uses these title and
 * description styles so headings read as one product; pages with bespoke
 * header markup import the class constants instead of the component.
 */
export const pageTitleClass = "text-[26px] font-black leading-tight tracking-[-0.02em] text-navy sm:text-[28px]";
export const pageDescriptionClass = "mt-1.5 max-w-2xl text-[14px] font-medium leading-6 text-body";
export const pageEyebrowClass = "mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#3B52F5]";

export function PageHeader({ eyebrow, title, description, actions, className }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <header className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className={pageEyebrowClass}>{eyebrow}</p> : null}
        <h1 className={pageTitleClass}>{title}</h1>
        {description ? <p className={pageDescriptionClass}>{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 md:justify-end">{actions}</div> : null}
    </header>
  );
}
