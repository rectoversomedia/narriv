// Narriv service worker. Its job is to make Narriv installable as an app (the home-screen icon opens full screen,
// without the browser's bars) and to show a branded page instead of the browser's error when the phone is offline.
//
// It deliberately caches nothing from the product: pages and API answers carry a client's data, which should not
// be stored on the device, and a stale copy of a monitoring screen would mislead. Everything goes to the network.
const VERSION = "narriv-sw-2";

const OFFLINE_HTML = `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#101334"><title>Narriv: Offline</title>
<style>
  html,body{margin:0;height:100%;background:#101334;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
  main{min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 24px;text-align:center;box-sizing:border-box;
    background:radial-gradient(ellipse 80% 50% at 50% 0%,rgba(70,95,255,.35),transparent 70%)}
  .mark{font-weight:900;font-size:30px;letter-spacing:-.03em}.mark span{color:#EC4899}
  .k{margin-top:28px;font:700 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;color:#A5B4FF}
  h1{margin:12px 0 0;font-size:24px;line-height:1.25;font-weight:900;letter-spacing:-.02em;max-width:340px}
  p{margin:10px 0 0;font-size:15px;line-height:1.6;color:rgba(255,255,255,.7);max-width:340px}
  button{margin-top:26px;height:48px;padding:0 26px;border:1.5px solid #fff;border-radius:14px;background:#465FFF;color:#fff;font-weight:800;font-size:15px;box-shadow:0 3px 0 #fff}
  .bar{position:fixed;left:0;right:0;bottom:0;height:4px;background:linear-gradient(90deg,#465FFF,#8B5CF6 55%,#EC4899)}
</style></head>
<body><main>
  <div class="mark">Narriv<span>.</span></div>
  <div class="k">Offline · Tidak Ada Koneksi</div>
  <h1>Narriv butuh internet untuk menampilkan data terbaru</h1>
  <p>Periksa koneksi Anda, lalu coba lagi. Peringatan penting tetap dikirim lewat email dan WhatsApp.</p>
  <button onclick="location.reload()">Coba Lagi</button>
</main><div class="bar"></div></body></html>`;

self.addEventListener("install", () => self.skipWaiting());

// Remove every cache an older version made (v1 cached pages, which is no longer wanted).
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Page loads go to the network; only when that fails is the offline page shown. Other requests are untouched.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.mode !== "navigate") return;
  event.respondWith(
    fetch(request).catch(() => new Response(OFFLINE_HTML, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "X-Narriv-SW": VERSION } })),
  );
});
