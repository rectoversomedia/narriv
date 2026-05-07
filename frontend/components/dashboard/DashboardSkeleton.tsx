import React from "react";
import { Cpu } from "lucide-react";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse pb-10">
      <div>
        <h1 className="theme-text text-3xl font-bold tracking-tight flex items-center gap-2">
          <Cpu className="theme-muted w-8 h-8" />
          <div className="theme-subtle h-8 rounded w-48"></div>
        </h1>
        <div className="theme-subtle h-4 rounded w-96 mt-4"></div>
      </div>

      {/* KPI Cards Skeleton Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="theme-card rounded-xl border p-5 shadow-sm h-32 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4">
              <div className="theme-subtle h-4 rounded w-24"></div>
              <div className="theme-subtle w-4 h-4 rounded-full"></div>
            </div>
            <div>
              <div className="theme-subtle h-8 rounded w-16 mb-2"></div>
              <div className="theme-subtle h-3 rounded w-20"></div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Trends Chart Skeleton */}
      <div className="w-full">
        <div className="theme-card rounded-xl border p-5 shadow-sm w-full h-[350px]">
          <div className="theme-subtle h-5 rounded w-40 mb-6"></div>
          <div className="theme-subtle w-full h-[250px] rounded-lg"></div>
        </div>
      </div>

      {/* Distribution & Latest Signals Skeleton Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="theme-card rounded-xl border p-5 shadow-sm w-full h-[350px] flex flex-col">
               <div className="theme-subtle h-5 rounded w-40 mb-6"></div>
               <div className="flex-1 flex items-center justify-center">
                  <div className="theme-subtle w-40 h-40 rounded-full"></div>
               </div>
            </div>
          ))}
        </div>
        <div className="lg:col-span-2">
          <div className="theme-card rounded-xl border shadow-sm w-full h-[350px] flex flex-col">
            <div className="theme-border p-5 border-b flex justify-between items-center">
               <div className="theme-subtle h-5 rounded w-32"></div>
            </div>
            <div className="p-5 space-y-4">
               {[...Array(5)].map((_, i) => (
                   <div key={i} className="theme-subtle h-8 rounded w-full"></div>
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
