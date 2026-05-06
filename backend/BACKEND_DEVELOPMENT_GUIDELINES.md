# Narriv Backend Development Guidelines

This document serves as the implementation guide for the Narriv backend architecture. It is synthesized from the system's knowledge graph and the Full Development Checklist PDF, outlining the phased approach to building the core intelligence platform.

## About Narriv (Application Overview)
Narriv is a **Narrative Intelligence & GEO (Generative Engine Optimization) Platform** designed to monitor, analyze, and act upon omnichannel data. It tracks brand presence and narratives across news, social media, videos, and podcasts. 

Core capabilities include:
1. **Omnichannel Ingestion:** Pulling multi-source data (via Apify) into a core data model.
2. **AI Intelligence Engine:** Processing signals to extract sentiment, detect themes, and cluster data into dominant narratives.
3. **Predictive Alerts:** Identifying emerging risks and opportunities with response window tracking.
4. **GEO AI Visibility:** Monitoring brand presence and competitor mentions specifically on AI search engines (e.g., ChatGPT, Perplexity).
5. **Action Engine:** Generating structured, actionable recommendations (e.g., PR responses, content strategies).
6. **AI Learning Loop:** Continuously improving the system based on user feedback (Accept/Edit/Reject) on generated actions.

---

## Core Architecture & Modules

### 1. Data Ingestion Pipeline (Phase 2)
The data pipeline relies on omnichannel ingestion through Apify.
- **Sources Management:** `sources.controller.js` manages external tasks and data sources (News, Social Media, YouTube, Podcasts).
- **Core Operations:** Triggering Apify actors, fetching datasets, and storing raw signals into the database.
- **Reference:** End-to-End Data Flow, `login()`, `register()`, and `createSource` flows.

### 2. AI Intelligence Engine (Phase 4)
This is the core analysis layer. Every ingested signal is processed through AI models (e.g., OpenAI).
- **Signal Analysis (`analyzeSignal()`)**: Extracts intent, sentiment, and key entities from raw data.
- **Validation & Retries (`validateAIOutput()`, `analyzeWithRetry()`)**: Ensures AI responses conform to expected JSON schemas.
- **Prompt Engineering**: Uses structured prompt builders like `buildSignalSystemPrompt()` and `buildSignalUserMessage()`.

### 3. Alert Engine (Phase 6)
Monitors processed signals to detect critical shifts and anomalies.
- **Detection (`detectAlerts()`)**: Scans intelligence clusters for anomalies and generates predictive alerts.
- **Enhancement (`enhanceAlert()`)**: Adds context and explainable drivers to alerts (using `buildAlertEnhancementSystemPrompt()`).
- **Background Processing**: Jobs are queued and managed via Redis and `queue.js` (e.g., `addAnalysisJob()`, `alert.worker.js`).

### 4. Intelligence & Narrative Clusters (Phase 7)
Transforms noisy signals into high-level narratives.
- **Clustering**: Groups related issues and themes into distinct narratives (Feedback Narrative Intelligence Layer).
- **Database Tracking**: Relies on `narratives` tables to track velocity, sentiment, and evidence count over time.

### 5. GEO AI Visibility Layer (Phase 8)
Generates metrics for Generative Engine Optimization (AI Search Engines).
- **Metrics**: AI Visibility Score, Brand Presence Rate, Competitor Mention Rate.
- **Tables**: `ai_visibility_results`.
- **Integration**: Feeds directly into the GEO Action Engine.

### 6. Action Engine & Learning Loop (Phase 10)
Translates intelligence into proactive tasks.
- **Structured Outputs**: Generates PR Responses, Content Strategies, Influencer Strategies, and Crisis Handling Steps.
- **AI Learning Loop**: Captures user feedback on recommendations (Accept, Edit, Reject) to improve prompt scoring (`Feedback Infrastruktur Narriv`).

---

## API Endpoints Spec
There are 17 identified backend API modules that need to be fully implemented. Focus on:
- Auth APIs (integrated with middleware like `verifyToken`).
- Ingestion Routes (`ingestion.routes.js`).
- Analysis and Alert endpoints.
- Visibility and Reporting endpoints.

## Infrastructure & Testing
- **Database**: Prisma ORM (`prisma.js`, `prisma.config.ts`, `check-db.js`).
- **Queue/Cache**: Redis (`redis.js`, `check-queue.js`, `enqueue-test.js`).
- **Tests**: Verify end-to-end functionality using standalone test scripts (`test-platforms.js`, `test-sources.js`, `test-titles.js`, `test-trends.js`).

## Next Steps for AI Agents
1. Ensure the core data model in Prisma matches the Database Tables V1 specification.
2. Complete the Apify ingestion integration (`sources.controller.js`).
3. Build out and test the AI Analysis Pipeline (`analyzeSignal()`).
4. Establish the background queue workers for reliable processing.
5. Refer to `AI_DEVELOPMENT_CHECKLIST.md` for actionable tracking.
