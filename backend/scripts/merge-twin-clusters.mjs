import { createClient } from "@supabase/supabase-js";
import { normalizeTitle } from "../src/modules/clustering/clustering.service.js";
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const apply = process.argv[2] === "apply";
const { data } = await s.from("narrative_clusters").select("id,workspace_id,title,created_at,signal_count").order("created_at");
const groups = {};
for (const c of data) (groups[c.workspace_id + "|" + normalizeTitle(c.title)] ||= []).push(c);
let n = 0;
for (const [k, g] of Object.entries(groups)) {
  if (g.length < 2) continue;
  const [keep, ...rest] = g;
  console.log(k, "keep", keep.id.slice(0,8), "merge", rest.length);
  if (!apply) { n += rest.length; continue; }
  for (const r of rest) {
    const { data: links } = await s.from("narrative_cluster_signals").select("signal_id").eq("cluster_id", r.id);
    if (links?.length) await s.from("narrative_cluster_signals").upsert(links.map(l => ({ cluster_id: keep.id, signal_id: l.signal_id })), { onConflict: "cluster_id,signal_id" });
    await s.from("narrative_cluster_signals").delete().eq("cluster_id", r.id);
    const { error } = await s.from("narrative_clusters").delete().eq("id", r.id);
    if (error) console.log("ERR", error.message); else n++;
  }
  const { count } = await s.from("narrative_cluster_signals").select("*", { count: "exact", head: true }).eq("cluster_id", keep.id);
  await s.from("narrative_clusters").update({ signal_count: count }).eq("id", keep.id);
}
console.log(apply ? "merged" : "would merge", n);
