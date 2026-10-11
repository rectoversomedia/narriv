// Redirect the backend's Supabase module to the in-memory sandbox DB.
import { registerHooks } from "node:module";
const FAKE = new URL("./fake-supabase.mjs", import.meta.url).href;
registerHooks({
  resolve(specifier, context, next) {
    const r = next(specifier, context);
    if (r.url.endsWith("/backend/src/lib/supabase.js")) return { url: FAKE, shortCircuit: true };
    return r;
  },
});
