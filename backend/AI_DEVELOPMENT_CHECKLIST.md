# Backend AI Development Checklist

This checklist is generated from the Narriv knowledge graph and project structure. As an AI Agent working on this repository, you should check off these items (`- [x]`) when you have completed them.

## About Narriv (Application Overview)
Narriv is a **Narrative Intelligence & GEO (Generative Engine Optimization) Platform** designed to monitor, analyze, and act upon omnichannel data. It tracks brand presence and narratives across news, social media, videos, and podcasts. 

Core capabilities include:
1. **Omnichannel Ingestion:** Pulling multi-source data (via Apify) into a core data model.
2. **AI Intelligence Engine:** Processing signals to extract sentiment, detect themes, and cluster data into dominant narratives.
3. **Predictive Alerts:** Identifying emerging risks and opportunities with response window tracking.
4. **GEO AI Visibility:** Monitoring brand presence and competitor mentions specifically on AI search engines (e.g., ChatGPT, Perplexity).
5. **Action Engine:** Generating structured, actionable recommendations (e.g., PR responses, content strategies).
6. **AI Learning Loop:** Continuously improving the system based on user feedback (Accept/Edit/Reject) on generated actions.

## Phase 2: Data Ingestion & Integration (Apify)
- [ ] Complete `sources.controller.js` to handle `createSource` and manage Apify task integration.
- [ ] Ensure end-to-end data flow from sources to the core data model.

## Phase 4: AI Intelligence Engine
- [ ] Implement and verify `analyzeSignal()` logic (extracting entities, sentiments, and intent).
- [ ] Implement and verify `validateAIOutput()` and `analyzeWithRetry()`.
- [ ] Ensure robust prompt templates: `buildSignalSystemPrompt()`, `buildSignalUserMessage()`.

## Phase 6: Alert Engine
- [ ] Implement `detectAlerts()` to generate predictive alerts from intelligence clusters.
- [ ] Implement `enhanceAlert()` logic: `buildAlertEnhancementSystemPrompt()` and `buildAlertEnhancementUserMessage()`.
- [ ] Integrate alerts with `alert.worker.js` and test queueing (`queue.js / addAnalysisJob`).

## Phase 7: Intelligence / Narrative Clusters
- [ ] Implement clustering logic to group individual signals into dominant narratives (Feedback Narrative Intelligence Layer).
- [ ] Create or verify `narratives` DB tables and relations via Prisma schema.

## Phase 8: Visibility / GEO (AI Search Engine Presence)
- [ ] Build backend module for GEO AI Visibility Layer.
- [ ] Implement `ai_visibility_results` table handling.
- [ ] Expose AI Visibility Score, Brand Presence Rate, and Competitor Mention Rate endpoints.

## Phase 9: Reporting & Export
- [ ] Implement automated report generation logic and endpoints.

## Phase 10: Action Engine & Learning Loop
- [ ] Implement Structured Action Recommendation Engine (PR Response, Content Strategy, Influencer Strategy, Crisis Handling).
- [ ] Build the AI Learning Loop: Process `Accept`, `Edit`, `Reject` feedback to improve prompt scoring (`Feedback Infrastruktur Narriv`).

## Phase 11: Team Workflow / Scale & Finalization
- [ ] Review `prisma.js`, `check-db.js`, `check-queue.js`, and `redis.js` for stability and scaling.
- [ ] Finalize API Endpoints Spec for the 17 identified backend API modules.
- [ ] Verify test scripts: `test-platforms.js`, `test-sources.js`, `test-titles.js`, `test-trends.js`.
