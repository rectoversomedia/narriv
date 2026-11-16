import type { MetadataRoute } from "next";

// Lets Narriv be installed from the browser ("Add to Home Screen") and open full screen like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Narriv",
    short_name: "Narriv",
    description: "Pantau isu brand Anda dari berita, YouTube, dan media sosial setiap jam.",
    lang: "id",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // Browsers that know display_override try these first; all of them open without the browser's bars.
    display_override: ["standalone", "minimal-ui"],
    categories: ["business", "productivity"],
    background_color: "#F8FAFC",
    theme_color: "#F8FAFC",
    icons: [
      // Round orb with transparent corners; launchers that mask icons use the full-bleed maskable one below.
      { src: "/brand/app-orb-round-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/app-orb-round-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/app-orb-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Long-press the home-screen icon to jump straight to these.
    shortcuts: [
      { name: "Hari Ini", short_name: "Hari Ini", description: "Ringkasan hari ini", url: "/", icons: [{ src: "/brand/app-orb-round-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Isu", short_name: "Isu", description: "Peta isu dan narasi", url: "/intelligence", icons: [{ src: "/brand/app-orb-round-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Peringatan", short_name: "Peringatan", description: "Peringatan yang perlu ditindaklanjuti", url: "/alerts", icons: [{ src: "/brand/app-orb-round-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Laporan", short_name: "Laporan", description: "Laporan brand", url: "/reports", icons: [{ src: "/brand/app-orb-round-192.png", sizes: "192x192", type: "image/png" }] },
    ],
    prefer_related_applications: false,
  };
}
