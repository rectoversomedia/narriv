"use client";

import { useEffect, useCallback } from "react";

/**
 * Keyboard shortcuts configuration
 */
interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
  category: string;
}

/**
 * Default keyboard shortcuts
 */
export const DEFAULT_SHORTCUTS: Shortcut[] = [
  // Global
  {
    key: "?",
    shift: true,
    action: () => {},
    description: "Show keyboard shortcuts",
    category: "Global",
  },
  {
    key: "Escape",
    action: () => {
      // Close modals/dropdowns
      document.body.click();
    },
    description: "Close modal or dropdown",
    category: "Global",
  },

  // Navigation
  {
    key: "1",
    ctrl: true,
    action: () => (window.location.href = "/"),
    description: "Go to Dashboard",
    category: "Navigation",
  },
  {
    key: "2",
    ctrl: true,
    action: () => (window.location.href = "/signals"),
    description: "Go to Signals",
    category: "Navigation",
  },
  {
    key: "3",
    ctrl: true,
    action: () => (window.location.href = "/alerts"),
    description: "Go to Alerts",
    category: "Navigation",
  },
  {
    key: "4",
    ctrl: true,
    action: () => (window.location.href = "/reports"),
    description: "Go to Reports",
    category: "Navigation",
  },
  {
    key: "5",
    ctrl: true,
    action: () => (window.location.href = "/action-plans"),
    description: "Go to Action Plans",
    category: "Navigation",
  },

  // Actions
  {
    key: "n",
    ctrl: true,
    action: () => {
      // Trigger new item creation (context-dependent)
      const createBtn = document.querySelector('[data-action="create"]') as HTMLButtonElement;
      createBtn?.click();
    },
    description: "Create new item",
    category: "Actions",
  },
  {
    key: "s",
    ctrl: true,
    action: () => {
      // Trigger search
      const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
      searchInput?.focus();
    },
    description: "Focus search",
    category: "Actions",
  },
  {
    key: "r",
    ctrl: true,
    action: () => {
      // Refresh current page
      window.location.reload();
    },
    description: "Refresh page",
    category: "Actions",
  },

  // Tables
  {
    key: "ArrowDown",
    alt: true,
    action: () => {
      // Next row
      const focused = document.querySelector(":focus") as HTMLElement;
      const next = focused?.closest("tr")?.nextElementSibling;
      (next as HTMLElement)?.focus();
    },
    description: "Next table row",
    category: "Tables",
  },
  {
    key: "ArrowUp",
    alt: true,
    action: () => {
      // Previous row
      const focused = document.querySelector(":focus") as HTMLElement;
      const prev = focused?.closest("tr")?.previousElementSibling;
      (prev as HTMLElement)?.focus();
    },
    description: "Previous table row",
    category: "Tables",
  },
];

/**
 * Check if keyboard event matches shortcut
 */
function matchesShortcut(event: KeyboardEvent, shortcut: Shortcut): boolean {
  const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
  const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
  const altMatch = shortcut.alt ? event.altKey : !event.altKey;
  const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

  return ctrlMatch && shiftMatch && altMatch && keyMatch;
}

/**
 * Hook for keyboard shortcuts
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[] = DEFAULT_SHORTCUTS) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      // Allow some shortcuts even in inputs
      const allowedInInput = ["Escape"];

      if (isInput && !allowedInInput.includes(event.key)) {
        return;
      }

      // Check each shortcut
      for (const shortcut of shortcuts) {
        if (matchesShortcut(event, shortcut)) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);
}

/**
 * Keyboard shortcuts help modal component
 */
export function KeyboardShortcutsHelp({
  shortcuts,
  onClose,
}: {
  shortcuts?: Shortcut[];
  onClose: () => void;
}) {
  const allShortcuts = shortcuts || DEFAULT_SHORTCUTS;

  // Group shortcuts by category
  const grouped = allShortcuts.reduce(
    (acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = [];
      }
      acc[shortcut.category].push(shortcut);
      return acc;
    },
    {} as Record<string, Shortcut[]>
  );

  // Format key combination for display
  const formatKey = (shortcut: Shortcut) => {
    const keys: string[] = [];
    if (shortcut.ctrl) keys.push("⌘");
    if (shortcut.alt) keys.push("⌥");
    if (shortcut.shift) keys.push("⇧");
    keys.push(shortcut.key.toUpperCase());
    return keys.join("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Keyboard Shortcuts
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs">?</kbd> to toggle
          </p>
        </div>

        <div className="p-6 space-y-6">
          {Object.entries(grouped).map(([category, categoryShortcuts]) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div
                    key={`${category}-${index}`}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-slate-700 dark:text-slate-300">
                      {shortcut.description}
                    </span>
                    <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-sm font-mono">
                      {formatKey(shortcut)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            Press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs">ESC</kbd> to close
          </button>
        </div>
      </div>
    </div>
  );
}
