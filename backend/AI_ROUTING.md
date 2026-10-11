# AI routing (multi-model engine)

All routed AI work goes through `src/lib/ai-gateway.js` (`runAiTask` for named
tasks, `runAiTier` for `POST /api/ai/complete`). Every call is workspace-scoped:
workspace budget check, premium monthly cap for Opus-class models, bounded max
tokens, provider timeout and retries, token and cost recording with the
serving model, latency, refusal and malformed-JSON handling.

## Profiles (`AI_ROUTING_PROFILE`)

| Tier | `openai` (default) | `claude` | Typical tasks |
|---|---|---|---|
| simple | gpt-4o-mini | claude-haiku-5-5 | classification, extraction, tagging |
| balanced | gpt-4o-mini | claude-sonnet-5-5 | narrative analysis, summarization |
| complex | gpt-4o-mini | claude-sonnet-5-5 | Ask Narriv, contextual reasoning |
| premium | off | claude-opus-5-5 | executive synthesis/briefing, risk reasoning, investigations |

Per-tier overrides always win: `AI_MODEL_SIMPLE|BALANCED|COMPLEX|PREMIUM` and
`AI_PROVIDER_<TIER>`. `AI_PREMIUM_MAX_TOKENS` (default 4096) and
`AI_PREMIUM_MONTHLY_BUDGET_USD` (default 10, per workspace) bound premium use.
Model ids were checked against the Anthropic models API; prices live in
`src/lib/model-pricing.js`.

## Fallbacks

- Premium with no model, or with an unconfigured provider, runs on the complex tier.
- Any tier whose provider is not configured (for example the `claude` profile
  without `ANTHROPIC_API_KEY`) runs on the economical OpenAI model for that tier.
- The result and `GET /api/ai/providers` (`effective`) report the fallback reason.

## Turning Claude on

1. Set `ANTHROPIC_API_KEY` on the backend. Routing does not change by itself.
2. Optional, premium only: `AI_MODEL_PREMIUM=claude-opus-5-5` (strategic tasks use Opus;
   everything else stays on the default profile).
3. Full Claude routing: `AI_ROUTING_PROFILE=claude`.
4. Check `GET /api/ai/providers` → `profile` and `effective` before relying on it,
   and compare quality with `eval/run-model-eval.mjs` on human-labelled data.

Note: today only Ask Narriv and `/ai/complete` call the gateway. Signal analysis
and action-plan generation still call OpenAI directly; moving them onto
`runAiTask` is the next step before Haiku/Sonnet carry the main volume.
