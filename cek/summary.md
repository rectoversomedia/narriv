NARRIV — FULL PRODUCT BUILD BRIEF
Version: Master Development Plan
Product Type: Omnichannel Narrative Intelligence Platform|
Core Engines: Apify + OpenAI
rontend: Next.js
Backend: NodeJS
Database: PostgreSQL + Prisma

1. Product Vision
Narriv adalah platform yang:
menarik data dari website, news, social media, video, dan podcast
mengubah semua data itu menjadi signals
menganalisisnya dengan AI menjadi:
sentiment
narrative
stakeholder
impact
recommendations
lalu memberi output:
dashboard
alerts
intelligence clusters
action plan
generated execution assets
Narriv bukan cuma monitoring tool.
Narriv harus jadi:
Signal → Intelligence → Recommendation → Action → Execution

2. Product Goals
MVP goal
data masuk dari Apify
signals tersimpan
AI classify signals
dashboard hidup
alerts hidup
signals page hidup
Growth goal
intelligence clusters
visibility/GEO
action engine
reporting/export
Full product goal
team workflow
role management
case management
AI-generated execution assets
production-ready SaaS

3. Technology Stack
Frontend
Next.js
TypeScript
Tailwind CSS
Recharts atau ApexCharts
TanStack Table
React Hook Form
Zod
Backend
NodeJS
TypeScript
REST API
BullMQ
Redis
Socket.io later
Database
PostgreSQL
Prisma ORM
AI
OpenAI API
Data Engine
Apify API
Apify Actors / Tasks / Schedules
Infra
Frontend: Vercel
Backend: Railway / Render / VPS
DB: Managed PostgreSQL
Redis: Upstash / Redis Cloud

4. API Keys / Tokens / Credentials Needed
Ini harus disiapkan dari awal.
Required
APIFY_API_TOKEN : 
OPENAI_API_KEY : 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
DATABASE_URL
JWT_SECRET
Optional later
REDIS_URL
SMTP_HOST
SMTP_USER
SMTP_PASS
S3_BUCKET_KEY kalau nanti pakai storage
PUSHER_KEY / realtime vendor kalau tidak pakai socket internal
.env structure

5. Teams / Divisions & Responsibility
Product
finalisasi scope
taxonomy
alert logic
recommendation logic
output logic per feature
UI/UX
mapping Figma ke komponen
states:
default
loading
empty
error
responsive priority desktop first
Frontend
build pages
tables
filters
charts
auth screens
app shell
action engine UI
Backend
auth
APIs
ingestion
queue
dashboard aggregation
alerts
reports
permissions
AI/Data
Apify ingestion strategy
normalization logic
OpenAI prompts
classification logic
clustering logic
recommendation outputs
QA
data validity
duplicate detection
classification sanity
UI QA
auth & permissions
pagination/filter correctness
6. Repo Structure
Recommendation: monorepoBranching
main = production
dev = staging
feature/... = per task
Contoh:
feature/auth
feature/dashboard
feature/apify-ingestion
feature/ai-classification


7. Core Data Model
Main entities
User
Workspace
WorkspaceMember
Source
IngestionJob
RawDocument
Signal
SignalAnalysis
Alert
NarrativeCluster
Report
ActionPlan
GeneratedAsset

8. Database Tables (V1)
users
id
name
email
password_hash
created_at
updated_at
workspaces
id
name
slug
created_at
updated_at


workspace_members
id
user_id
workspace_id
role (admin, analyst, viewer)
created_at
sources
id
workspace_id
name
type (news, web, forum, social, video, podcast)
actor_id
input_config JSON
is_active
created_at
ingestion_jobs
id
workspace_id
source_id
run_id
status
started_at
finished_at
error_message
raw_documents
id
workspace_id
source_id
external_id
title
content
url
author
source_name
source_type
platform
published_at
captured_at
metadata JSON
signals
id
workspace_id
raw_document_id
title
content
source_name
source_type
platform
url
published_at
captured_at
region
language
dedupe_hash
signal_analysis
id
signal_id
sentiment
narrative_type
stakeholder
impact
summary
recommended_action
confidence_score
created_at
alerts
id
workspace_id
type (risk, opportunity, positioning)
severity (low, medium, high, critical)
title
what_happened
why_it_matters
what_to_do
status (open, acknowledged, in_progress, resolved)
created_at
narrative_clusters
id
workspace_id
title
summary
trend_direction
sentiment_bias
created_at
reports
id
workspace_id
title
period_start
period_end
summary
export_url
created_at

action_plans
id
workspace_id
alert_id
cluster_id
title
option_1
option_2
option_3
created_at
generated_assets
id
workspace_id
action_plan_id
type (press_release, influencer_brief, holding_statement, faq, internal_memo, campaign_brief)
title
content
created_at

9. Narrative Taxonomy
Ini wajib dipakai. Jangan pakai taxonomy lama yang terlalu app/product oriented.
Sentiment
positive
neutral
negative
mixed

Narrative Type
campaign_response
corporate_reputation
customer_experience
service_issue
trust_issue
misinformation
policy_regulation
leadership_mention
media_escalation
competitor_comparison
viral_momentum
public_sentiment
community_reaction
influencer_amplification
crisis_event
product_perception
value_perception
brand_positioning
Stakeholder
customer
public
media
regulator
employee
investor
influencer
partner
Impact
low
medium
high
critical

10. Omnichannel Data Coverage via Apify
Narriv harus ingest dari sebanyak mungkin public source yang legal/accessible via Apify.
Channel categories
Web / News
media portals
blogs
press releases
newsroom
company statements
Social / Public web surfaces
public post pages
public account pages
public comments if accessible
public discussion threads
Forums / Community
review sites
community forums
public boards
niche conversation spaces
Video
title
description
tags
captions/transcript if available
comments metadata if available

Podcast
show title
episode title
episode description
show notes
transcript if available

11. End-to-End Flow
Full flow
user creates workspace
user adds sources / keywords / entities
Apify actor runs
backend fetches dataset output
raw data saved
normalized into signals
deduplication runs
OpenAI analyzes signals
signal_analysis saved
dashboard aggregates update
alert engine runs
clusters update
action engine becomes available
reports can be generated


12. Phase-by-Phase Work Plan

PHASE 1 — FOUNDATION
Goal: project skeleton jalan, framework tidak diubah
Product
lock scope MVP
lock naming
lock taxonomy draft
lock page list
UI
finalisasi desktop shell:
login
signup
command center
signals
define reusable components


Frontend
setup Next.js
setup Tailwind
app shell
sidebar
topbar
route skeleton
Backend
setup NodeJS
auth module
users module
workspace module
signals module placeholder
dashboard module placeholder
Database
setup Prisma
create initial migrations
connect PostgreSQL
DevOps
repo setup
env setup
deploy baseline
Deliverable
login works
signup works
protected empty dashboard

PHASE 2 — APIFY INGESTION ENGINE
Goal: semua data publik bisa masuk ke Narriv
Product
define source priority list
define per-source config requirements
define raw-to-signal schema
UI
create simple source management screen later-ready
no heavy UI priority here
Backend
create apify.module
create apify.service
create ingestion.module
actor runner
dataset fetcher
normalization service
deduplication service
raw_document save
signal creation
AI/Data
define source mapping per channel
define metadata extraction rules
DB
sources
ingestion_jobs
raw_documents
signals
Deliverable
at least 1–3 source types ingest successfully
data stored in DB as signals

PHASE 3 — SIGNALS PAGE CORE
Goal: monitoring page usable
Product
define filters
define sort logic
define detail view requirements
UI
build signals table
build filters
build search
build detail drawer/page
loading / empty states
Frontend
signals list page
pagination
filtering
search
signal detail UI
Backend
GET /signals
GET /signals/:id
query filters
pagination
Deliverable
usable signals feed with real ingested data

PHASE 4 — AI INTELLIGENCE ENGINE
Goal: signal jadi insight
Product
finalize sentiment taxonomy
finalize narrative taxonomy
finalize stakeholder + impact logic
define summary output format
define recommendation output format
AI/Data
create OpenAI prompts
strict JSON output contract
signal classification pipeline
confidence scoring
failure fallback
Backend
create ai.module
create ai.service
enqueue signal for AI analysis
save to signal_analysis
DB
signal_analysis table
Deliverable
every signal has:
sentiment
narrative_type
stakeholder
impact
summary
recommendation



PHASE 5 — COMMAND CENTER DASHBOARD
Goal: dashboard real data + AI-backed
Product
define KPI formula
define chart time windows
define top cards hierarchy

UI
command center final widgets
loading skeletons
chart legends
drilldown links
Frontend
connect real APIs
KPI cards
trend charts
signal breakdown
map/distribution
latest signals table
Backend
summary aggregation
trend aggregation
breakdown aggregation
latest signals API
Deliverable
dashboard siap demo ke client

PHASE 6 — ALERT ENGINE
Goal: system bisa deteksi issue otomatis
Product
define alert categories
define thresholds
define severity mapping
define status flow


AI/Data
rule logic
optional AI-assisted alert summary
Backend
scheduled jobs
alert generation
alert status updates
alert APIs
Frontend
alerts page
alert cards
alert detail
Deliverable
risk, opportunity, positioning alerts hidup

PHASE 7 — INTELLIGENCE / NARRATIVE CLUSTERS
Goal: naik dari monitoring ke intelligence
Product
define cluster logic
define top narrative rules
define narrative shift logic
AI/Data
semantic grouping
cluster naming
cluster summary

Backend
create cluster jobs
cluster APIs
Frontend
intelligence page
cluster cards
trend cluster
driver analysis
Deliverable
narrative intelligence layer usable

PHASE 8 — VISIBILITY / GEO
Goal: strategic differentiation
Product
define tracked queries
define visibility score logic
define recommendation format
Backend
visibility module
query tracking
score generation
Frontend
visibility page
query list
score cards
recommendations
Deliverable
visibility/GEO page hidup

PHASE 9 — REPORTING & EXPORT
Goal: client-ready reporting
Product
define report template
define executive summary sections
Backend
report generation
CSV export
PDF export optional
Frontend
reports page
saved reports
export actions
AI/Data
AI-generated executive summary
Deliverable
management-ready reports


PHASE 10 — ACTION ENGINE
Goal: Narriv bukan cuma kasih insight, tapi juga kasih aksi dan langsung bantu eksekusinya
Product
define recommendation options format:
option 1
option 2
option 3
define asset output types
define use case per alert type
AI/Data
prompt design for strategy generation
prompt design for execution assets
Backend
action_plan module
generated_assets module
asset generation APIs
Frontend
action plan UI
option chooser
generated asset preview
copy/export buttons
AI Outputs
Dari 1 alert / cluster, AI harus bisa menghasilkan:
Strategic options
Option 1: Press release
Option 2: Influencer/KOL support
Option 3: Social clarification / monitoring only

Execution generation
Kalau pilih Press Release
draft press release
recommended headline
tone
timing suggestion
channel suggestion
Kalau pilih Influencer/KOL
campaign brief
campaign objective
target audience
key message
deliverables
creator profile recommendation
Kalau pilih Social Response
caption/script
FAQ
holding statement
community response template
Kalau pilih Internal/Corp Comm
internal memo
spokesperson points
Q&A prep
Deliverable
Narriv jadi decision + execution platform


PHASE 11 — TEAM WORKFLOW / SCALE
Goal: SaaS siap dipakai banyak user dan tim
Product
define roles
define case workflow
define note/activity model
Backend
role management
case management
activity logs
notifications
audit logs
security hardening
Frontend
workspace settings
activity timeline
case management page
role assignment UI
Deliverable
production-ready team workflow

13. API Module List
Backend modules
auth
users
workspaces
sources
apify
ingestion
signals
ai
dashboard
alerts
intelligence
visibility
reports
action-plans
generated-assets
notifications
activity-log

14. Key API Endpoints
Auth
POST /auth/register
POST /auth/login
POST /auth/logout
GET /auth/me
Workspace
GET /workspaces/current
PATCH /workspaces/current
Sources
GET /sources
POST /sources
PATCH /sources/:id
DELETE /sources/:id

Ingestion
POST /ingestion/run/:sourceId
GET /ingestion/jobs
GET /ingestion/jobs/:id
Signals
GET /signals
GET /signals/:id
Dashboard
GET /dashboard/summary
GET /dashboard/signal-volume
GET /dashboard/narrative-trend
GET /dashboard/distribution
GET /dashboard/latest-signals
Alerts
GET /alerts
GET /alerts/:id
PATCH /alerts/:id/status
Intelligence
GET /intelligence/clusters
GET /intelligence/clusters/:id
Visibility
GET /visibility/summary
GET /visibility/queries
Reports
GET /reports
POST /reports/generate
GET /reports/:id/export
Action Plans
POST /action-plans/generate
GET /action-plans/:id
POST /generated-assets/generate

15. UI Pages Final List
Auth
Login
Signup
Product
Command Center
Signals
Intelligence
Alerts
Visibility
Reports
Action Plans
Workspace
Data Sources
Integrations
Activity Timeline
Case Management
Workspace Settings


16. Priority Order for Sakti
Priority 1
Phase 1 foundation
Phase 2 Apify ingestion
Phase 3 signals page
Priority 2
Phase 4 AI intelligence
Phase 5 dashboard
Priority 3
Phase 6 alerts
Phase 7 intelligence clusters
Priority 4
Phase 8 visibility
Phase 9 reporting
Priority 5
Phase 10 action engine
Phase 11 team workflow

“Narriv bukan dashboard biasa. Ada dua core engine di backend:
Apify buat narik semua data omnichannel: website, news, social, video, podcast.
OpenAI buat ubah data itu jadi intelligence: sentiment, narrative, stakeholder, impact, summary, recommendation.
Frontend cuma layer visual dan workflow. Priority awal kita: foundation, ingestion, signals, AI analysis, dashboard, lalu alerts. Setelah itu baru intelligence cluster, visibility, reports, dan action engine.”

18. Final Recommendation
Ini secara product udah powerful banget.
Yang bikin Narriv beda nanti bukan cuma karena:
data banyak
dashboard bagus
Tapi karena:
semua channel masuk
AI paham narasi
alert langsung actionable
bahkan bisa generate execution asset
Itu yang bikin Narriv bukan monitoring tool, tapi narrative intelligence operating system.

