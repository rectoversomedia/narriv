import * as esbuild from "esbuild";
import { rmSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "vercel_dist");

// Clean output directory
if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true });
}
mkdirSync(outDir);

// Bundle the backend - use CJS for better compatibility
await esbuild.build({
  entryPoints: [join(__dirname, "src/index.js")],
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
  banner: {
    js: `"use strict";`,
  },
});

console.log("✅ Backend bundled successfully to vercel_dist/");
