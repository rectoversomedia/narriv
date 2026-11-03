"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useL } from "@/lib/use-l";

export default function NotFound() {
  const L = useL();
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--app-bg)]">
      <div className="max-w-md w-full px-6 text-center">
        {/* 404 Illustration */}
        <div className="mb-8">
          </div>

        {/* Error Code */}
        <h1 className="text-6xl font-bold text-slate-900 dark:text-slate-100 mb-4">
          404
        </h1>

        {/* Error Message */}
        <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
          {L("Page not found", "Halaman tidak ditemukan")}
        </h2>
        <p className="text-[#5A6478] dark:text-[#5A6478] mb-8">
          {L("Sorry, the page you're looking for doesn't exist or has been moved.", "Maaf, halaman yang Anda cari tidak ada atau sudah dipindahkan.")}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/">
            <Button variant="default" size="lg" className="w-full sm:w-auto">
              {L("Back to dashboard", "Kembali ke dashboard")}
            </Button>
          </Link>

          <Link href="/signals">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              {L("View signals", "Lihat sinyal")}
            </Button>
          </Link>
        </div>

        {/* Help Text */}
        <p className="mt-12 text-sm text-[#5A6478]">
          If you think this is an error, please contact support.
        </p>
      </div>
    </div>
  );
}
