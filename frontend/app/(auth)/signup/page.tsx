"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ShieldCheck } from "lucide-react";
import * as z from "zod";
import { DEMO_TOKEN } from "@/lib/demo-auth";
import { useAuthStore } from "@/store/useAuthStore";

const signupSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.email({ message: "Enter a valid work email" }),
  password: z.string().min(6, { message: "Use at least 6 characters" }),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({ resolver: zodResolver(signupSchema) });

  const onSubmit = async (data: SignupFormValues) => {
    setSession(DEMO_TOKEN, {
      name: data.name,
      email: data.email,
      provider: "password",
      workspace: "Narriv Demo Workspace",
    });
    router.push("/");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-5 py-10 text-[#101828]">
      <div className="w-full max-w-md rounded-3xl border border-[#E4E7EC] bg-white p-8 shadow-[0_24px_80px_rgba(16,24,40,0.08)]">
        <Image src="/narriv-logo-light.png" alt="Narriv" width={128} height={36} priority />
        <div className="mt-8">
          <p className="text-sm font-semibold text-[#465FFF]">Request preview access</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Create demo workspace</h1>
          <p className="mt-2 text-sm leading-6 text-[#667085]">This creates a local preview session only. Real workspace provisioning will connect later.</p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <label className="block text-sm font-medium text-[#344054]">
            Full name
            <input {...register("name")} className="mt-2 w-full rounded-xl border border-[#D0D5DD] px-3 py-3 text-sm outline-none transition focus:border-[#465FFF] focus:ring-4 focus:ring-[#465FFF]/10" />
            {errors.name ? <span className="mt-1 block text-xs text-[#D92D20]">{errors.name.message}</span> : null}
          </label>
          <label className="block text-sm font-medium text-[#344054]">
            Work email
            <input {...register("email")} type="email" className="mt-2 w-full rounded-xl border border-[#D0D5DD] px-3 py-3 text-sm outline-none transition focus:border-[#465FFF] focus:ring-4 focus:ring-[#465FFF]/10" />
            {errors.email ? <span className="mt-1 block text-xs text-[#D92D20]">{errors.email.message}</span> : null}
          </label>
          <label className="block text-sm font-medium text-[#344054]">
            Password
            <input {...register("password")} type="password" className="mt-2 w-full rounded-xl border border-[#D0D5DD] px-3 py-3 text-sm outline-none transition focus:border-[#465FFF] focus:ring-4 focus:ring-[#465FFF]/10" />
            {errors.password ? <span className="mt-1 block text-xs text-[#D92D20]">{errors.password.message}</span> : null}
          </label>
          <button type="submit" disabled={isSubmitting} className="flex w-full items-center justify-center rounded-xl bg-[#465FFF] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#364CE5] disabled:opacity-60">
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Create demo session"}
          </button>
        </form>

        <div className="mt-6 flex gap-3 rounded-2xl border border-[#E4E7EC] bg-[#F9FAFB] p-4 text-sm text-[#667085]">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#12B76A]" />
          <p>Signup does not write to a database yet. It only prepares the Vercel stakeholder preview.</p>
        </div>

        <p className="mt-6 text-center text-sm text-[#667085]">
          Already have access? <Link href="/login" className="font-semibold text-[#465FFF]">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
