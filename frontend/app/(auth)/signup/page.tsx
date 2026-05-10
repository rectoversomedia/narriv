"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import * as z from "zod";
import { useAuthStore } from "@/store/useAuthStore";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3000";

const signupSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.email({ message: "Enter a valid work email" }),
  password: z.string()
    .min(10, { message: "Use at least 10 characters" })
    .regex(/[A-Z]/, { message: "Add at least one uppercase letter" })
    .regex(/[a-z]/, { message: "Add at least one lowercase letter" })
    .regex(/[0-9]/, { message: "Add at least one number" })
    .regex(/[^A-Za-z0-9]/, { message: "Add at least one symbol" }),
});

type SignupFormValues = z.infer<typeof signupSchema>;

// ── Particle canvas ───────────────────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);

    const dots = Array.from({ length: 40 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.4 + 0.15,
    }));

    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(107,127,255,${(1 - dist / 120) * 0.12})`;
            ctx.lineWidth = 0.8;
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.stroke();
          }
        }
      }
      dots.forEach((d) => {
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(70,95,255,${d.alpha})`;
        ctx.fill();
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0 || d.x > canvas.width) d.vx *= -1;
        if (d.y < 0 || d.y > canvas.height) d.vy *= -1;
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}

// ── Streaming headline ────────────────────────────────────────────────────────
const HEADLINE_PART1 = "Intelligence that ";
const HEADLINE_PART2 = "acts, not just alerts.";
const FULL_HEADLINE = HEADLINE_PART1 + HEADLINE_PART2;

function StreamingHeadline() {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(FULL_HEADLINE.slice(0, i));
      if (i >= FULL_HEADLINE.length) { clearInterval(id); setDone(true); }
    }, 28);
    return () => clearInterval(id);
  }, []);

  return (
    <h1 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.03em] text-[#0F172A] lg:text-[44px]">
      {displayed}
      {!done && <span className="ml-0.5 inline-block h-8 w-0.5 animate-pulse bg-[#465FFF]" />}
    </h1>
  );
}

// ── Password strength ─────────────────────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    password.length >= 10,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const colors = ["#F97066", "#FDB022", "#6CE9A6", "#12B76A"];
  const labels = ["Weak", "Fair", "Good", "Strong"];
  return (
    <div className="mt-2">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ background: i < score ? colors[score - 1] : "#E2E8F0" }} />
        ))}
      </div>
      {score > 0 && (
        <p className="mt-1.5 text-[11px] font-medium" style={{ color: colors[score - 1] }}>
          {labels[score - 1]} password
        </p>
      )}
    </div>
  );
}

// ── Floating-label input ──────────────────────────────────────────────────────
interface FloatInputProps {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  error?: string;
  registration: UseFormRegisterReturn;
  onValueChange?: (v: string) => void;
}

function FloatInput({ id, label, type = "text", autoComplete, error, registration, onValueChange }: FloatInputProps) {
  const [focused, setFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const isPwd = type === "password";
  const inputType = isPwd ? (showPwd ? "text" : "password") : type;
  const lifted = focused || hasValue;

  return (
    <div>
      <div className={`relative h-[60px] w-full rounded-[14px] border transition-all duration-200 ${
        error
          ? "border-[#F97066] bg-[#F9706608]"
          : focused
            ? "border-[#465FFF] bg-white shadow-[0_0_0_4px_rgba(70,95,255,0.1)]"
            : "border-[#E2E8F0] bg-[#F9FAFB] hover:border-[#CBD5E1]"
      }`}>
        <label
          htmlFor={id}
          className={`pointer-events-none absolute left-4 transition-all duration-200 ${
            lifted ? "top-2 text-[11px] font-semibold tracking-[0.05em]" : "top-1/2 -translate-y-1/2 text-[14px]"
          } ${error ? "text-[#F97066]" : lifted ? "text-[#465FFF]" : "text-[#475569]"}`}
        >
          {label}
        </label>
        <input
          id={id}
          type={inputType}
          autoComplete={autoComplete}
          {...registration}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            setFocused(false);
            setHasValue(e.target.value.length > 0);
            void registration.onBlur(e);
          }}
          onChange={(e) => {
            setHasValue(e.target.value.length > 0);
            void registration.onChange(e);
            onValueChange?.(e.target.value);
          }}
          className="absolute inset-0 w-full bg-transparent px-4 pb-2 pt-6 text-[14px] font-medium text-[#0F172A] outline-none placeholder-transparent"
          placeholder={label}
        />
        {isPwd && (
          <button type="button" tabIndex={-1} onClick={() => setShowPwd((v) => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-[#475569] transition-colors hover:text-[#94A3B8]"
            aria-label={showPwd ? "Hide password" : "Show password"}>
            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-[12px] font-medium text-[#F97066]">{error}</p>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SignupPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [apiError, setApiError] = useState<string | null>(null);
  const [password, setPassword] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({ resolver: zodResolver(signupSchema) });

  const onSubmit = async (data: SignupFormValues) => {
    setApiError(null);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, email: data.email, password: data.password }),
        credentials: "omit",
      });

      if (res.ok) {
        const json = await res.json() as { token: string; refreshToken?: string; user: { name: string; email: string } };
        setSession(json.token, { name: json.user.name, email: json.user.email, provider: "password", workspace: "Narriv" }, json.refreshToken);
        router.push("/");
        return;
      }

      const errJson = await res.json().catch(() => ({})) as { error?: string };
      if (res.status === 409) {
        setApiError("This email is already registered. Sign in instead.");
        return;
      }
      setApiError(errJson.error ?? "Registration failed. Please try again.");
    } catch {
      setApiError("Unable to reach the backend API. Please check the API URL and try again.");
    }
  };

  const handleGoogleSSO = () => {
    setApiError("Google sign-up is not configured for this production build yet.");
  };

  const features = [
    "Real-time narrative signal monitoring",
    "Predictive alert engine with 91% accuracy",
    "AI-powered action recommendations",
    "GEO visibility across AI search engines",
  ];

  return (
    <main
      data-theme="light"
      className="flex min-h-screen"
      style={{
        background: "linear-gradient(135deg, #F8FAFC 0%, #EEF4FF 54%, #FFFFFF 100%)",
        fontFamily: "Outfit, sans-serif",
      }}
    >

      {/* ── LEFT ── */}
      <div
        className="relative hidden flex-1 flex-col overflow-hidden lg:flex"
        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(238,244,255,0.78) 100%)" }}
      >
        <ParticleCanvas />
        <div className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ width: 560, height: 560, background: "radial-gradient(circle, rgba(70,95,255,0.10) 0%, transparent 70%)" }} />

        <div className="relative z-10 flex flex-1 flex-col p-12">
          <Image src="/narriv-logo-light.png" alt="Narriv" width={160} height={40} priority style={{ height: "auto" }} className="w-[160px]" />

          <div className="my-auto max-w-[500px]">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#465FFF33] bg-[#465FFF14] px-4 py-2">
              <Sparkles size={13} className="text-[#6B7FFF]" />
              <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#6B7FFF]">Early Access</span>
            </div>

            <StreamingHeadline />

            <p className="mt-5 text-[16px] leading-[1.6] text-[#64748B]">
              Join teams that use Narriv to stay ahead of narratives shaping their brand — before they become headlines.
            </p>

            <ul className="mt-8 space-y-3">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                    style={{ background: "#465FFF1A", border: "1px solid #465FFF33" }}>
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="#6B7FFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-[14px] text-[#64748B]">{f}</span>
                </li>
              ))}
            </ul>

          </div>

          <div className="flex items-center gap-2 text-[12px] text-[#334155]">
            <ShieldCheck size={14} className="text-[#465FFF]" />
            SOC 2 Type II · GDPR Compliant · Zero data retention on free tier
          </div>
        </div>
      </div>

      {/* ── RIGHT ── */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-[540px] lg:px-12"
        style={{ background: "rgba(255,255,255,0.72)", borderLeft: "1px solid #E2E8F0" }}>
        <div className="mb-8 lg:hidden">
          <Image src="/narriv-logo-light.png" alt="Narriv" width={140} height={36} priority style={{ height: "auto" }} className="w-[140px]" />
        </div>

        <div className="w-full max-w-[424px] rounded-[28px] border border-[#E2E8F0] bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
          <div className="mb-8">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[12px]"
              style={{ background: "#465FFF0D", border: "1px solid #465FFF20" }}>
              <Sparkles size={20} className="text-[#465FFF]" />
            </div>
            <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-[#0F172A]">Create your account</h2>
            <p className="mt-1.5 text-[14px] leading-normal text-[#64748B]">
              Start monitoring narratives in under 2 minutes.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-3">
              <FloatInput id="name" label="Full name" autoComplete="name"
                error={errors.name?.message} registration={register("name")} />
              <FloatInput id="email" label="Work email" type="email" autoComplete="email"
                error={errors.email?.message} registration={register("email")} />
              <div>
                <FloatInput id="password" label="Password" type="password" autoComplete="new-password"
                  error={errors.password?.message} registration={register("password")}
                  onValueChange={setPassword} />
                <PasswordStrength password={password} />
              </div>
            </div>

            {apiError && (
              <div className="mt-3 rounded-[10px] border border-[#F9706633] bg-[#F9706610] px-4 py-3">
                <p className="text-[13px] font-medium text-[#F97066]">{apiError}</p>
              </div>
            )}

            <p className="mt-4 text-[12px] leading-normal text-[#334155]">
              By creating an account, you agree to our{" "}
              <button type="button" className="cursor-pointer text-[#465FFF] hover:underline">Terms</button>{" "}
              and{" "}
              <button type="button" className="cursor-pointer text-[#465FFF] hover:underline">Privacy Policy</button>.
            </p>

            <button type="submit" disabled={isSubmitting}
              className="mt-5 flex h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] text-[15px] font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: isSubmitting ? "#2D3A8C" : "linear-gradient(135deg, #465FFF 0%, #6B7FFF 100%)",
                boxShadow: isSubmitting ? "none" : "0 4px 24px rgba(70,95,255,0.35)",
              }}>
              {isSubmitting ? <><Loader2 className="animate-spin" size={17} /> Creating account…</> : "Create free account"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1" style={{ background: "#E2E8F0" }} />
            <span className="text-[12px] font-medium text-[#64748B]">or sign up with</span>
            <div className="h-px flex-1" style={{ background: "#E2E8F0" }} />
          </div>

          <button type="button"
            onClick={handleGoogleSSO}
            className="flex h-[52px] w-full cursor-pointer items-center justify-center gap-3 rounded-[14px] border text-[14px] font-semibold text-[#475569] transition-all duration-200 hover:border-[#CBD5E1] hover:bg-[#F9FAFB]"
            style={{ borderColor: "#E2E8F0", background: "#FFFFFF" }}>
            <svg width="18" height="18" viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#4285F4"/>
              <path d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#EA4335"/>
              <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#34A853"/>
              <path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.801 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#FBBC05"/>
            </svg>
            Continue with Google Workspace
          </button>

          <div className="mt-5 flex items-center gap-2.5 rounded-[12px] border px-4 py-3"
            style={{ borderColor: "#465FFF1A", background: "#465FFF08" }}>
            <ShieldCheck size={15} className="shrink-0 text-[#465FFF]" />
            <p className="text-[12px] text-[#475569]">No credit card required. Free during early access.</p>
          </div>

          <p className="mt-6 text-center text-[13px] text-[#334155]">
            Already have access?{" "}
            <Link href="/login" className="cursor-pointer font-semibold text-[#465FFF] hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
