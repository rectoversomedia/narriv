// Root-level build script for Vercel monorepo deployment
// This script builds the backend only (frontend is served separately by Next.js)
import * as esbuild from "esbuild";
import { rmSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
// __dirname is now the backend/ directory (where this file lives)
const outDir = join(__dirname, "dist");

// Clean output directory
if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true });
}
mkdirSync(outDir);

// Cache-busting: include build timestamp in bundle to invalidate Vercel's server-side cache
const BUILD_TS = Date.now();

// Bundle the backend - use CJS for better compatibility
await esbuild.build({
  entryPoints: [join(__dirname, "src", "index.js")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: join(outDir, "index.cjs"),
  external: [
    "express",
    "cors",
    "compression",
    "dotenv",
    "ioredis",
    "bullmq",
    "@supabase/supabase-js",
    "openai",
    "bcrypt",
    "jsonwebtoken",
    "zod",
    "apify-client",
    "proxy-agent",
    "resend",
  ],
  sourcemap: false,
  minify: false,
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "production"),
    // Invalidate Vercel server-side build cache
    "BUNDLE_BUILD_TS": JSON.stringify(BUILD_TS),
  },
});

console.log("Backend bundled successfully to", outDir, "at", new Date(BUILD_TS).toISOString());
