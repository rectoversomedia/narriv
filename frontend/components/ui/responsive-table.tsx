"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
  hideOnMobile?: boolean;
  stickyLeft?: boolean;
}

interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  className?: string;
  tableClassName?: string;
  onRowClick?: (item: T) => void;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  selectionKey?: keyof T;
  emptyMessage?: string;
  isLoading?: boolean;
  loadingRows?: number;
}

function LoadingRow({ columns, rows = 5 }: { columns: Column<unknown>[]; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="border-b border-slate-100">
          {columns.map((col) => (
            <td key={col.key} className={cn("px-4 py-4", col.className)}>
              <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function ResponsiveTable<T>({
  columns,
  data,
  keyExtractor,
  className,
  tableClassName,
  onRowClick,
  selectable = false,
  selectedIds,
  onSelectionChange,
  selectionKey,
  emptyMessage = "No data available",
  isLoading = false,
  loadingRows = 5,
}: ResponsiveTableProps<T>) {
  const visibleColumns = columns.filter((col) => !col.hideOnMobile);
  const primaryColumn = columns[1]; // Usually the main content column
  const hasSelectable = selectable && selectionKey;

  const handleSelectAll = () => {
    if (!hasSelectable || !onSelectionChange) return;
    const allSelected = data.every((item) => selectedIds?.has(String(item[selectionKey])));
    if (allSelected) {
      const newIds = new Set(selectedIds);
      data.forEach((item) => newIds.delete(String(item[selectionKey])));
      onSelectionChange(newIds);
    } else {
      const newIds = new Set(selectedIds);
      data.forEach((item) => newIds.add(String(item[selectionKey])));
      onSelectionChange(newIds);
    }
  };

  const handleSelectRow = (item: T) => {
    if (!hasSelectable || !onSelectionChange) return;
    const id = String(item[selectionKey]);
    const newIds = new Set(selectedIds);
    if (newIds.has(id)) {
      newIds.delete(id);
    } else {
      newIds.add(id);
    }
    onSelectionChange(newIds);
  };

  const allSelected = hasSelectable && selectedIds && data.length > 0 && data.every((item) => selectedIds.has(String(item[selectionKey])));
  const someSelected = hasSelectable && selectedIds && data.some((item) => selectedIds.has(String(item[selectionKey])));

  return (
    <div className={cn("w-full overflow-hidden rounded-xl border border-slate-200 bg-white", className)}>
      {/* Mobile Card View */}
      <div className="flex flex-col lg:hidden">
        {isLoading ? (
          Array.from({ length: loadingRows }).map((_, index) => (
            <div key={index} className="border-b border-slate-100 p-4 space-y-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
              <div className="flex gap-2">
                <div className="h-6 w-16 animate-pulse rounded bg-slate-200" />
                <div className="h-6 w-16 animate-pulse rounded bg-slate-200" />
              </div>
            </div>
          ))
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg className="h-12 w-12 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-slate-500 font-medium">{emptyMessage}</p>
          </div>
        ) : (
          data.map((item) => {
            const itemKey = keyExtractor(item);
            const isSelected = hasSelectable && selectedIds?.has(String(item[selectionKey]));
            return (
              <div
                key={itemKey}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  "border-b border-slate-100 p-4 transition-colors",
                  isSelected ? "bg-blue-50" : "hover:bg-slate-50",
                  onRowClick && "cursor-pointer"
                )}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  {hasSelectable && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectRow(item);
                      }}
                      className={cn(
                        "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition",
                        isSelected
                          ? "border-blue-500 bg-blue-500 text-white"
                          : "border-slate-300 bg-white hover:border-blue-500"
                      )}
                    >
                      {isSelected && (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    {primaryColumn?.render && primaryColumn.render(item, 0)}
                  </div>
                </div>
                {/* Secondary columns as grid */}
                <div className="grid grid-cols-2 gap-3 ml-8 text-sm">
                  {columns
                    .filter((col) => col.key !== primaryColumn?.key && col.key !== (hasSelectable ? selectionKey : undefined))
                    .map((col) => (
                      <div key={col.key} className="space-y-1">
                        <p className="text-xs font-medium text-slate-400">{col.header}</p>
                        <div className="text-slate-700">
                          {col.render ? col.render(item, 0) : String((item as Record<string, unknown>)[col.key] ?? "-")}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className={cn("w-full border-collapse", tableClassName)}>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left">
              {hasSelectable && (
                <th className="w-12 px-4 py-3">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded border transition",
                      allSelected
                        ? "border-blue-500 bg-blue-500 text-white"
                        : someSelected
                        ? "border-blue-500 bg-blue-500/20"
                        : "border-slate-300 bg-white hover:border-blue-500"
                    )}
                  >
                    {allSelected || someSelected ? (
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : null}
                  </button>
                </th>
              )}
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500",
                    col.headerClassName
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <LoadingRow columns={(hasSelectable ? [{ key: "select" }, ...visibleColumns] : visibleColumns) as Column<unknown>[]} rows={loadingRows} />
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + (hasSelectable ? 1 : 0)} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <svg className="h-12 w-12 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="text-slate-500 font-medium">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item, index) => {
                const itemKey = keyExtractor(item);
                const isSelected = hasSelectable && selectedIds?.has(String(item[selectionKey]));
                return (
                  <tr
                    key={itemKey}
                    onClick={() => onRowClick?.(item)}
                    className={cn(
                      "transition-colors",
                      isSelected ? "bg-blue-50" : "hover:bg-slate-50",
                      onRowClick && "cursor-pointer"
                    )}
                  >
                    {hasSelectable && (
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectRow(item);
                          }}
                          className={cn(
                            "flex h-5 w-5 items-center justify-center rounded border transition",
                            isSelected
                              ? "border-blue-500 bg-blue-500 text-white"
                              : "border-slate-300 bg-white hover:border-blue-500"
                          )}
                        >
                          {isSelected && (
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      </td>
                    )}
                    {visibleColumns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-4 py-4 text-sm text-slate-700",
                          col.className,
                          col.stickyLeft && "sticky left-0 bg-white"
                        )}
                      >
                        {col.render ? col.render(item, index) : String((item as Record<string, unknown>)[col.key] ?? "-")}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
