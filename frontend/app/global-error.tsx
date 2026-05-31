"use client";

import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const message = error.message || "Aplikasi belum bisa dimuat.";

  return (
    <html lang="id">
      <body>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#F8FAFC", padding: 16, color: "#101334", fontFamily: "Arial, sans-serif" }}>
          <section style={{ width: "100%", maxWidth: 560, border: "1px solid #E6EAF2", borderRadius: 20, background: "#FFFFFF", padding: 28, textAlign: "center", boxShadow: "0 22px 70px rgba(15, 23, 42, 0.10)" }}>
            <div style={{ width: 56, height: 56, margin: "0 auto", display: "grid", placeItems: "center", borderRadius: 16, border: "1px solid rgba(239, 68, 68, 0.2)", background: "rgba(239, 68, 68, 0.1)", color: "#EF4444" }}>
              <AlertTriangle size={26} />
            </div>
            <h1 style={{ marginTop: 24, marginBottom: 0, fontSize: 26, lineHeight: 1.2, fontWeight: 900, letterSpacing: "-0.03em" }}>Aplikasi belum bisa dibuka</h1>
            <p style={{ marginTop: 12, marginBottom: 0, color: "#68739F", fontSize: 14, lineHeight: 1.7, fontWeight: 600 }}>
              {message} Coba muat ulang. Jika masih gagal, tunggu sebentar lalu buka kembali.
            </p>
            {error.digest ? <p style={{ marginTop: 8, color: "#8A94B8", fontSize: 12, fontWeight: 600 }}>Kode masalah: {error.digest}</p> : null}
            <button
              type="button"
              onClick={reset}
              style={{ marginTop: 24, display: "inline-flex", height: 44, alignItems: "center", justifyContent: "center", gap: 8, border: 0, borderRadius: 10, background: "#465FFF", padding: "0 20px", color: "#FFFFFF", fontSize: 14, fontWeight: 900, cursor: "pointer" }}
            >
              <RefreshCcw size={16} />
              Coba lagi
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
