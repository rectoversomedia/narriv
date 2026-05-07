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

---

## Phase 1: Foundation & Auth (COMPLETED)
- [x] Auth module: `POST /auth/login`, `POST /auth/register`, `GET /auth/me`
- [x] Middleware: `verifyToken` for protected routes
- [x] Database: Prisma schema with User, Workspace, Signal, Alert models

---

## Phase 2: Data Ingestion & Sources (COMPLETED)
- [x] Sources module: `GET /sources`, `POST /sources`
- [x] Ingestion module: `POST /ingestion/run/:sourceId`, `GET /ingestion/status/:jobId`
- [x] Apify integration: `apify.service.js` for web scraping
- [x] End-to-end data flow from sources to signals

---

## Phase 3: Signals & AI Analysis (COMPLETED)
- [x] Signals module: `GET /signals`, `GET /signals/:id`
- [x] AI Analysis: `POST /signals/:id/analyze` with `analyzeSignal()`
- [x] SignalAnalysis table for storing AI results (sentiment, narrative type, stakeholder, impact, summary, confidence score)

---

## Phase 4: Dashboard & Alerts (COMPLETED)
- [x] Dashboard module: `GET /dashboard/summary` with KPI metrics
- [x] Alerts module: `GET /api/alerts`, `GET /api/alerts/:id`, `PATCH /api/alerts/:id/status`
- [x] Alert status workflow: open → acknowledged → resolved
- [x] Frontend connected: getAlerts(), updateAlertStatus()

---

## Phase 5: Visibility / GEO (TODO)
- [ ] Implement `GET /api/visibility` endpoint
- [ ] Build GEO module with:
  - AI Visibility Score calculation
  - Brand Presence Rate (mention count / prompt count)
  - Competitor Mention Rate
  - Prompt-level visibility results
- [ ] Database: `ai_visibility_results` table
- [ ] Frontend already connected: `getVisibility()` in `api-service.ts`

---

## Phase 6: Action Plans (TODO)
- [ ] Implement `GET /api/action-plans` endpoint
- [ ] Build Action Engine module with:
  - Primary action recommendation
  - Channel strategy (PR, content, influencer, crisis)
  - Impact/effort scoring
  - Execution plan with timeline (Today, 6h, 24h, 48h)
- [ ] Database: `action_plans` table
- [ ] Frontend already connected: `getActionPlans()` in `api-service.ts`

---

## Phase 7: Reports & Export (TODO)
- [ ] Implement `GET /api/reports` endpoint
- [ ] Build Reports module with:
  - Report templates (Weekly Brief, GEO Movement, Risk Review)
  - Readiness status tracking (ready, needs review, pending)
  - Section completion tracking
  - Export job queue
- [ ] Database: `reports` table, `report_exports` table
- [ ] Frontend already connected: `getReports()` in `api-service.ts`

---

## Phase 8: AI Intelligence Engine Enhancement
- [ ] Implement `detectAlerts()` - generate predictive alerts from intelligence clusters
- [ ] Implement `enhanceAlert()` - build alert enhancement prompts
- [ ] Prompt templates: `buildAlertEnhancementSystemPrompt()`, `buildAlertUserMessage()`
- [ ] Alert worker: queue integration for background processing

---

## Phase 9: Narrative Clustering
- [ ] Implement clustering logic to group signals into dominant narratives
- [ ] Build `GET /api/narratives` or `GET /api/clusters` endpoint
- [ ] Database: `narratives` table with relations to signals
- [ ] Frontend: Intelligence page already built, needs backend data

---

## Phase 10: Learning Loop & Feedback
- [ ] Build feedback processing: Accept/Edit/Reject actions
- [ ] Implement prompt scoring improvement from feedback
- [ ] Store feedback in `recommendation_feedback` table
- [ ] Connect to frontend Action Plans feedback buttons

---

## Phase 11: Finalization & Testing
- [ ] Verify all API endpoints with `verifyToken` where needed
- [ ] Test CORS for frontend connection (already allowed localhost:3001, *.vercel.app)
- [ ] Review Prisma schema for stability and scaling
- [ ] Test scripts: test-platforms.js, test-sources.js, test-titles.js, test-trends.js

---

## Frontend-Backend API Contract Summary

| Frontend Function | Backend Endpoint | Status |
|-------------------|------------------|--------|
| `getDashboardSummary()` | `GET /dashboard/summary` | ✅ Ready |
| `login()` | `POST /auth/login` | ✅ Ready |
| `signup()` | `POST /auth/register` | ✅ Ready |
| `getSignals()` | `GET /signals` | ✅ Ready |
| `getSignalById()` | `GET /signals/:id` | ✅ Ready |
| `getSources()` | `GET /sources` | ✅ Ready |
| `createSource()` | `POST /sources` | ✅ Ready |
| `runSourceIngestion()` | `POST /ingestion/run/:sourceId` | ✅ Ready |
| `getIngestionStatus()` | `GET /ingestion/status/:jobId` | ✅ Ready |
| `getAlerts()` | `GET /api/alerts` | ✅ Ready |
| `updateAlertStatus()` | `PATCH /api/alerts/:id/status` | ✅ Ready |
| `getVisibility()` | `GET /api/visibility` | 🔄 Needs implementation |
| `getActionPlans()` | `GET /api/action-plans` | 🔄 Needs implementation |
| `getReports()` | `GET /api/reports` | 🔄 Needs implementation |
| `getNarratives()` | `GET /api/narratives` | 🔄 Needs implementation |

---

## Database Schema (Prisma)

Key tables already in schema:
- User, Workspace
- Signal, SignalAnalysis
- Alert
- Source, IngestionJob

Tables to add:
- ActionPlan, ActionFeedback
- Report, ReportExport
- Narrative, NarrativeCluster
- AI_Visibility_Result, PromptTest