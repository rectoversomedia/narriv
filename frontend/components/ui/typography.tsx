"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Standard Typography Scale for Narriv
 *
 * Usage:
 *   <H1>Page Title</H1>
 *   <H2>Section Title</H2>
 *   <H3>Card Title</H3>
 *   <P>Body text</P>
 *   <Caption>Small text</Caption>
 */

interface TypographyProps {
  children: ReactNode;
  className?: string;
}

export function H1({ children, className }: TypographyProps) {
  return (
    <h1 className={cn(
      "text-[32px] font-black tracking-[-0.04em] leading-tight",
      "bg-clip-text text-transparent bg-linear-to-r from-slate-950 via-slate-900 to-slate-800",
      className
    )}>
      {children}
    </h1>
  );
}

export function H2({ children, className }: TypographyProps) {
  return (
    <h2 className={cn(
      "text-[24px] font-bold tracking-[-0.03em] leading-tight text-slate-900",
      className
    )}>
      {children}
    </h2>
  );
}

export function H3({ children, className }: TypographyProps) {
  return (
    <h3 className={cn(
      "text-[20px] font-bold tracking-[-0.02em] leading-snug text-slate-900",
      className
    )}>
      {children}
    </h3>
  );
}

export function H4({ children, className }: TypographyProps) {
  return (
    <h4 className={cn(
      "text-[16px] font-bold tracking-[-0.01em] leading-snug text-slate-800",
      className
    )}>
      {children}
    </h4>
  );
}

export function P({ children, className }: TypographyProps) {
  return (
    <p className={cn(
      "text-[15px] font-medium leading-relaxed text-slate-600",
      className
    )}>
      {children}
    </p>
  );
}

export function Caption({ children, className }: TypographyProps) {
  return (
    <p className={cn(
      "text-[12px] font-medium text-slate-500",
      className
    )}>
      {children}
    </p>
  );
}

export function Label({ children, className }: TypographyProps) {
  return (
    <span className={cn(
      "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400",
      className
    )}>
      {children}
    </span>
  );
}

/**
 * Page Header Component - Standard header pattern for all pages
 */
interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn(
      "flex flex-col gap-4 mb-8",
      "md:flex-row md:items-start md:justify-between",
      className
    )}>
      <div>
        {typeof title === "string" ? <H1>{title}</H1> : title}
        {description && <P className="mt-2">{description}</P>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

/**
 * Section Title Component - For card/section headers
 */
interface SectionTitleProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  label?: string;
  className?: string;
}

export function SectionTitle({ title, description, action, label, className }: SectionTitleProps) {
  return (
    <div className={cn("mb-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          {label && <Label className="mb-1 block">{label}</Label>}
          {typeof title === "string" ? <H3>{title}</H3> : title}
          {description && <Caption className="mt-1">{description}</Caption>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}

/**
 * Breadcrumb Component - Standard navigation breadcrumbs
 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-2 text-sm", className)}>
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-2">
          {index > 0 && (
            <svg className="h-4 w-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
          {item.href ? (
            <a href={item.href} className="text-slate-500 hover:text-slate-700 transition-colors">
              {item.label}
            </a>
          ) : (
            <span className="font-medium text-slate-900">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
