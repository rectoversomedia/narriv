"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

function Tabs({ defaultValue, value, onValueChange, className, ...props }: React.ComponentProps<"div"> & { defaultValue: string; value?: string; onValueChange?: (value: string) => void }) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const currentValue = value ?? internalValue;
  const setValue = React.useCallback((nextValue: string) => {
    setInternalValue(nextValue);
    onValueChange?.(nextValue);
  }, [onValueChange]);

  return (
    <TabsContext.Provider value={{ value: currentValue, setValue }}>
      <div data-slot="tabs" className={cn("space-y-4", className)} {...props} />
    </TabsContext.Provider>
  );
}

function TabsList({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="tabs-list" className={cn("inline-flex rounded-[10px] border border-white/5 bg-white/2 p-1 backdrop-blur-md", className)} {...props} />;
}

function TabsTrigger({ value, className, ...props }: React.ComponentProps<"button"> & { value: string }) {
  const context = React.useContext(TabsContext);
  const active = context?.value === value;
  return (
    <button
      data-slot="tabs-trigger"
      type="button"
      onClick={() => context?.setValue(value)}
      className={cn(
        "rounded-[8px] px-3.5 py-2 text-sm font-semibold text-slate-950 transition-all hover:text-[#465FFF] cursor-pointer",
        active && "bg-[#465FFF] text-white shadow-[0_0_12px_rgba(70,95,255,0.35)]",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ value, className, ...props }: React.ComponentProps<"div"> & { value: string }) {
  const context = React.useContext(TabsContext);
  if (context?.value !== value) return null;
  return <div data-slot="tabs-content" className={cn("outline-none", className)} {...props} />;
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
