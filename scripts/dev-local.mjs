#!/usr/bin/env node
// dev-local.mjs — run Narriv on this machine: backend (src/index.js, the same entry production serves) on :4100 with
// auto-restart, frontend (next dev) on :4101 with hot reload. No Vercel builds; changes show up in the browser in
// a second or two.   npm run dev:local
//
// Local env lives in backend/.env and frontend/.env.local (both gitignored): PORT=4100, FRONTEND_URL/CORS_ORIGINS=
// http://localhost:4101, NEXT_PUBLIC_API_URL=http://localhost:4100, and the frontend's JWT_SECRET equal to the
// backend's (proxy.ts verifies the login cookie with it). The database is the production Supabase (pre-launch).
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = 4100, WEB = 4101;
const color = { api: "\x1b[36m", web: "\x1b[35m", off: "\x1b[0m" };

function run(name, cmd, args, cwd) {
  const p = spawn(cmd, args, { cwd, env: { ...process.env, FORCE_COLOR: "1" }, stdio: ["ignore", "pipe", "pipe"] });
  const tag = `${color[name]}[${name}]${color.off} `;
  const pipe = (s) => s.on("data", (d) => String(d).split("\n").filter(Boolean).forEach((l) => process.stdout.write(tag + l + "\n")));
  pipe(p.stdout); pipe(p.stderr);
  p.on("exit", (code) => { console.log(`${tag}exited (${code})`); shutdown(code ?? 1); });
  return p;
}

const procs = [
  run("api", process.execPath, ["--env-file=.env", "--watch", "src/index.js"], path.join(root, "backend")),   // --env-file: src/index.js calls dotenv.config() after its imports, which already read env
  run("web", path.join(root, "node_modules/.bin/next"), ["dev", "-p", String(WEB)], path.join(root, "frontend")),
];
let down = false;
function shutdown(code = 0) {
  if (down) return; down = true;
  procs.forEach((p) => p.kill("SIGTERM"));
  setTimeout(() => process.exit(code), 500);
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

// say where to look once both answer
(async () => {
  const up = async (url) => { try { const r = await fetch(url); return r.status < 500; } catch { return false; } };
  for (let i = 0; i < 120; i++) {
    if ((await up(`http://localhost:${API}/health`)) && (await up(`http://localhost:${WEB}/login`))) {
      console.log(`\n  Narriv lokal siap:\n    app  http://localhost:${WEB}\n    api  http://localhost:${API}/health\n  (Ctrl+C untuk berhenti)\n`);
      return;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.log("  (belum siap setelah 2 menit — cek log di atas)");
})();
