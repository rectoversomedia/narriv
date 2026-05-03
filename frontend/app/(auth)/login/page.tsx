"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Loader2, Mail, ShieldCheck } from "lucide-react";
import * as z from "zod";
import { createGoogleDemoSession, createPasswordDemoSession, DEMO_TOKEN } from "@/lib/demo-auth";
import { useAuthStore } from "@/store/useAuthStore";

const loginSchema = z.object({
  email: z.email({ message: "Enter a valid work email" }),
  password: z.string().min(1, { message: "Password is required" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "demo@narriv.ai", password: "demo" },
  });

  const finishLogin = (user = createGoogleDemoSession()) => {
    setSession(DEMO_TOKEN, user);
    router.push("/");
  };

  const onSubmit = async (data: LoginFormValues) => {
    finishLogin(createPasswordDemoSession(data.email));
  };

  return (
    <main className="min-h-screen bg-[#F9FAFB] text-[#101828]">
      <div className="grid min-h-screen lg:grid-cols-[1fr_520px]">
        <section className="hidden border-r border-[#E4E7EC] bg-white px-12 py-10 lg:flex lg:flex-col lg:justify-between">
          <Image src="/narriv-logo-light.png" alt="Narriv" width={142} height={40} priority />
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#465FFF]">Stakeholder preview</p>
            <h1 className="mt-5 text-5xl font-semibold leading-tight tracking-[-0.04em]">
              Narrative intelligence from signal to action.
            </h1>
            <p className="mt-5 text-lg leading-8 text-[#667085]">
              Demo workspace with dummy data, localStorage auth, GEO visibility, predictive alerts, and structured action recommendations.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            {[
              ["82", "AI Visibility"],
              ["18", "Narratives"],
              ["74%", "Actions Accepted"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-[#E4E7EC] bg-[#F9FAFB] p-4">
                <p className="text-2xl font-semibold">{value}</p>
                <p className="mt-1 text-[#667085]">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-10">
          <div className="w-full max-w-md rounded-3xl border border-[#E4E7EC] bg-white p-8 shadow-[0_24px_80px_rgba(16,24,40,0.08)]">
            <div className="mb-8 lg:hidden">
              <Image src="/narriv-logo-light.png" alt="Narriv" width={128} height={36} priority />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#465FFF]">Welcome back</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Sign in to Narriv</h2>
              <p className="mt-2 text-sm text-[#667085]">Use demo credentials or continue with Google Workspace.</p>
            </div>

            <button
              type="button"
              onClick={() => finishLogin()}
              className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-[#D0D5DD] bg-white px-4 py-3 text-sm font-semibold text-[#344054] transition hover:bg-[#F9FAFB]"
            >
              <Building2 size={18} className="text-[#465FFF]" />
              Continue with Google Workspace
            </button>

            <div className="my-6 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-[#98A2B3]">
              <span className="h-px flex-1 bg-[#E4E7EC]" />
              Demo email
              <span className="h-px flex-1 bg-[#E4E7EC]" />
            </div>

            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
              <label className="block text-sm font-medium text-[#344054]">
                Email address
                <span className="relative mt-2 block">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#98A2B3]" />
                  <input
                    {...register("email")}
                    type="email"
                    className="w-full rounded-xl border border-[#D0D5DD] bg-white py-3 pl-10 pr-3 text-sm outline-none transition focus:border-[#465FFF] focus:ring-4 focus:ring-[#465FFF]/10"
                  />
                </span>
                {errors.email ? <span className="mt-1 block text-xs text-[#D92D20]">{errors.email.message}</span> : null}
              </label>

              <label className="block text-sm font-medium text-[#344054]">
                Password
                <input
                  {...register("password")}
                  type="password"
                  className="mt-2 w-full rounded-xl border border-[#D0D5DD] bg-white px-3 py-3 text-sm outline-none transition focus:border-[#465FFF] focus:ring-4 focus:ring-[#465FFF]/10"
                />
                {errors.password ? <span className="mt-1 block text-xs text-[#D92D20]">{errors.password.message}</span> : null}
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center rounded-xl bg-[#465FFF] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#364CE5] disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Sign in to demo"}
              </button>
            </form>

            <div className="mt-6 rounded-2xl border border-[#E4E7EC] bg-[#F9FAFB] p-4 text-sm text-[#667085]">
              <div className="flex items-center gap-2 font-semibold text-[#344054]"><ShieldCheck size={16} className="text-[#12B76A]" />Vercel-safe demo auth</div>
              <p className="mt-1">No backend or secrets required. Session persists locally for preview refreshes.</p>
            </div>

            <p className="mt-6 text-center text-sm text-[#667085]">
              Need access? <Link href="/signup" className="font-semibold text-[#465FFF]">Create demo workspace</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
