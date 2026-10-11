// Boots the real backend app (it listens on PORT itself) against the sandbox DB.
// Refuse to start if anything looks like a real deployment configuration.
if (process.env.VERCEL || /supabase\.co/.test(process.env.SUPABASE_URL || "") || process.env.NODE_ENV === "production") {
  console.error("sandbox: refusing to start with production-like environment");
  process.exit(1);
}
await import("../../backend/src/index.js");
