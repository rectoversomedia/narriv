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
    background_color: "#F8FAFC",
    theme_color: "#F8FAFC",
    icons: [
      // Round orb with transparent corners; launchers that mask icons use the full-bleed maskable one below.
      { src: "/brand/app-orb-round-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/app-orb-round-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/app-orb-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
