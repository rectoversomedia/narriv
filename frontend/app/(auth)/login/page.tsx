"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { BrainCircuit, Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setToken = useAuthStore((state) => state.setToken);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Login failed");
      }

      setToken(result.token);
      router.push("/");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-zinc-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center">
           <BrainCircuit className="h-12 w-12 text-red-500" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight">
          Sign in to <span className="text-transparent bg-clip-text bg-linear-to-r from-red-500 to-orange-500">Narriv</span>
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-400">
          Or{" "}
          <Link href="/signup" className="font-medium text-red-500 hover:text-red-400 transition-colors">
            create a new workspace account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-zinc-900 border border-zinc-800 py-8 px-4 shadow-xl sm:rounded-xl sm:px-10 relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/20 blur-3xl rounded-full point-events-none"></div>

          <form className="space-y-6 relative z-10" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg flex items-center justify-center">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-300">
                Email address
              </label>
              <div className="mt-1">
                <input
                  {...register("email")}
                  type="email"
                  className="appearance-none block w-full px-3 py-2 border border-zinc-700 rounded-lg shadow-sm placeholder-zinc-500 bg-zinc-950 text-white focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 sm:text-sm transition-colors"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300">
                Password
              </label>
              <div className="mt-1">
                <input
                  {...register("password")}
                  type="password"
                  className="appearance-none block w-full px-3 py-2 border border-zinc-700 rounded-lg shadow-sm placeholder-zinc-500 bg-zinc-950 text-white focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 sm:text-sm transition-colors"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : "Sign in"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
