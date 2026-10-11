// OpenAI-compatible stub for the sandbox ONLY. It stands in for the external
// model so Narriv's own grounding, citation filtering, budgets, persistence and
// UI can be exercised end to end. Behaviour:
//  - Ask prompts: cites the first signal id found in the prompt AND a foreign id
//    (which Narriv must drop). Questions containing FAIL_PROVIDER get HTTP 503.
//  - Action-plan prompts: returns a minimal strategy JSON.
import http from "node:http";
const PORT = Number(process.env.STUB_PORT || 4199);
http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    if (req.url === "/health") { res.writeHead(200).end("ok"); return; }
    if (!req.url.endsWith("/chat/completions")) { res.writeHead(404).end(); return; }
    const payload = JSON.parse(body || "{}");
    const text = (payload.messages || []).map((m) => m.content).join("\n");
    if (text.includes("FAIL_PROVIDER")) { res.writeHead(503, { "content-type": "application/json" }).end(JSON.stringify({ error: { message: "stub provider unavailable" } })); return; }
    let content;
    if (text.includes("QUESTION:")) {
      const firstSignal = (text.match(/Recent signals[^\n]*\n\s*([0-9a-f-]{36})/) || [])[1];
      content = JSON.stringify({ answer: "Stubbed answer: coverage is dominated by an outage report.", grounded: true, sources: [{ id: firstSignal, kind: "signal" }, { id: "00000000-0000-4000-8000-0000000007c1", kind: "signal" }] });
    } else {
      content = JSON.stringify({ title: "Holding statement", executive_summary: "Acknowledge the outage and commit to an update.", key_messages: ["We are aware"], talking_points: ["Restore service"], media_channels: ["Website"], timeline: "Within 24 hours", risk_considerations: "Monitor complaints" });
    }
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ id: "stub", object: "chat.completion", model: "stub-model", usage: { prompt_tokens: 100, completion_tokens: 40 }, choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content } }] }));
  });
}).listen(PORT, () => console.log(`stub-openai listening on ${PORT}`));
