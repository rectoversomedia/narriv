import { Activity, ShieldAlert, Cpu } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Cpu className="text-red-500 w-8 h-8" />
          Command Center
        </h1>
        <p className="text-zinc-400 mt-2">
          Welcome to Narriv. Monitor real-time omnichannel signals and AI intelligence here.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-zinc-400 font-medium text-sm">Active Alerts</h3>
               <ShieldAlert className="text-orange-500 w-4 h-4" />
            </div>
            <p className="text-3xl font-bold text-white mb-1">0</p>
            <p className="text-xs text-zinc-500">Awaiting new signals</p>
         </div>
         <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-zinc-400 font-medium text-sm">Total Signals</h3>
               <Activity className="text-red-500 w-4 h-4" />
            </div>
            <p className="text-3xl font-bold text-white mb-1">...</p>
            <p className="text-xs text-zinc-500">Live processing</p>
         </div>
      </div>
      
      <div className="w-full h-64 mt-8 rounded-xl border border-dashed border-zinc-800 flex items-center justify-center flex-col text-zinc-500">
         <Activity className="w-8 h-8 mb-3 opacity-50" />
         <p>Data visualization modules are preparing...</p>
      </div>
    </div>
  );
}
