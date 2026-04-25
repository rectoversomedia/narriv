import React from "react";
import { Cpu } from "lucide-react";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Cpu className="text-zinc-600 w-8 h-8" />
          <div className="h-8 bg-zinc-800 rounded w-48"></div>
        </h1>
        <div className="h-4 bg-zinc-800 rounded w-96 mt-4"></div>
      </div>

      {/* KPI Cards Skeleton Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm h-32 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4">
              <div className="h-4 bg-zinc-800 rounded w-24"></div>
              <div className="w-4 h-4 bg-zinc-800 rounded-full"></div>
            </div>
            <div>
              <div className="h-8 bg-zinc-800 rounded w-16 mb-2"></div>
              <div className="h-3 bg-zinc-800 rounded w-20"></div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Trends Chart Skeleton */}
      <div className="w-full">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm w-full h-[350px]">
          <div className="h-5 bg-zinc-800 rounded w-40 mb-6"></div>
          <div className="w-full h-[250px] bg-zinc-800/50 rounded-lg"></div>
        </div>
      </div>

      {/* Distribution & Latest Signals Skeleton Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm w-full h-[350px] flex flex-col">
               <div className="h-5 bg-zinc-800 rounded w-40 mb-6"></div>
               <div className="flex-1 flex items-center justify-center">
                  <div className="w-40 h-40 bg-zinc-800 rounded-full"></div>
               </div>
            </div>
          ))}
        </div>
        <div className="lg:col-span-2">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-sm w-full h-[350px] flex flex-col">
            <div className="p-5 border-b border-zinc-800 flex justify-between items-center">
               <div className="h-5 bg-zinc-800 rounded w-32"></div>
            </div>
            <div className="p-5 space-y-4">
               {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-8 bg-zinc-800 rounded w-full"></div>
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
