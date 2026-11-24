import { mergeSimilarIssues } from "../src/modules/clustering/clustering.service.js";
import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const apply = process.argv[2] === "apply";
const { data: ws } = await s.from("workspaces").select("id,name").in("id", ["f8a8be65-a102-4331-bfe9-da10a6759afc","40add10d-48cd-4a4d-8cd2-d8758500dac3","64d2aa3b-39d8-49b9-bf89-48e31be848e9"]);
for (const w of ws) { const r = await mergeSimilarIssues(w.id, { days: 30, apply }); console.log("\n##", w.name, r.merged, r.skipped||""); for (const g of r.groups) console.log(" KEEP", g.keep, "\n   <-", g.merge.join(" | ")); }
