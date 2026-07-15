import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * SECURITY: Basic HTML sanitizer to prevent XSS attacks.
 * Removes script tags, event handlers, and javascript: URLs.
 * For production, consider using DOMPurify or isomorphic-dompurify.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";

  return html
    // Remove script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Remove event handlers (onclick, onerror, onload, etc.)
    .replace(/\s*on\w+\s*=\s*(['"])[^'"]*\1/gi, "")
    // Remove javascript: URLs
    .replace(/javascript:/gi, "")
    // Remove data: URLs (can be used for base64 encoded payloads)
    .replace(/data:/gi, "")
    // Remove style attributes with expressions (IE)
    .replace(/\s*style\s*=\s*(['"])[^'"]*expression\([^)]*\)[^'"]*\1/gi, "")
    // Remove vbscript URLs
    .replace(/vbscript:/gi, "");
}
