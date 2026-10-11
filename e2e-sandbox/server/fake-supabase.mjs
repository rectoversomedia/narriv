// Replaces backend/src/lib/supabase.js inside the sandbox: in-memory DB only.
import { createMemoryDb } from "../../backend/tests/helpers/memory-db.js";
import { supabaseModuleFor } from "../../backend/tests/helpers/fake-supabase.js";
import { seedData } from "./seed.mjs";

const db = createMemoryDb(seedData());
const mod = supabaseModuleFor(db);
export default mod.default;
export const { supabase, supabaseAdmin, baseSupabase, baseSupabaseAdmin, getPoolMetrics, getPoolConfig, checkConnection, startConnectionCleanup, stopConnectionCleanup } = mod;
