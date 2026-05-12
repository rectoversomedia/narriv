# Graph Report - C:\MyProject\narriv\frontend  (2026-05-06)

## Corpus Check
- 43 files · ~26,311 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 111 nodes · 88 edges · 35 communities detected
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]

## God Nodes (most connected - your core abstractions)
1. `fetchData()` - 6 edges
2. `onSubmit()` - 4 edges
3. `getCopy()` - 4 edges
4. `finishLogin()` - 3 edges
5. `DashboardPage()` - 3 edges
6. `createPasswordDemoSession()` - 3 edges
7. `ParticleCanvas()` - 2 edges
8. `handleGoogleSSO()` - 2 edges
9. `handleStatusChange()` - 2 edges
10. `IntelligencePage()` - 2 edges

## Surprising Connections (you probably didn't know these)
- `fetchData()` --calls--> `getActionPlans()`  [INFERRED]
  C:\MyProject\narriv\frontend\app\(dashboard)\visibility\page.tsx → C:\MyProject\narriv\frontend\lib\api-service.ts
- `fetchData()` --calls--> `getReports()`  [INFERRED]
  C:\MyProject\narriv\frontend\app\(dashboard)\visibility\page.tsx → C:\MyProject\narriv\frontend\lib\api-service.ts
- `fetchData()` --calls--> `getVisibility()`  [INFERRED]
  C:\MyProject\narriv\frontend\app\(dashboard)\visibility\page.tsx → C:\MyProject\narriv\frontend\lib\api-service.ts
- `onSubmit()` --calls--> `createPasswordDemoSession()`  [INFERRED]
  C:\MyProject\narriv\frontend\app\(auth)\signup\page.tsx → C:\MyProject\narriv\frontend\lib\demo-auth.ts
- `DashboardPage()` --calls--> `getCopy()`  [INFERRED]
  C:\MyProject\narriv\frontend\app\(dashboard)\page.tsx → C:\MyProject\narriv\frontend\lib\i18n.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.13
Nodes (4): getActionPlans(), getReports(), getVisibility(), fetchData()

### Community 1 - "Community 1"
Cohesion: 0.25
Nodes (6): createPasswordDemoSession(), nameFromEmail(), finishLogin(), handleGoogleSSO(), onSubmit(), ParticleCanvas()

### Community 2 - "Community 2"
Cohesion: 0.18
Nodes (2): getSignalById(), openSignalDetail()

### Community 3 - "Community 3"
Cohesion: 0.18
Nodes (5): createSource(), runSourceIngestion(), formatDate(), handleCreateSource(), handleRunIngestion()

### Community 4 - "Community 4"
Cohesion: 0.2
Nodes (5): buildDashboardMetrics(), getCopy(), DashboardPage(), IntelligencePage(), Sidebar()

### Community 5 - "Community 5"
Cohesion: 0.4
Nodes (0): 

### Community 6 - "Community 6"
Cohesion: 0.67
Nodes (0): 

### Community 7 - "Community 7"
Cohesion: 0.67
Nodes (2): updateAlertStatus(), handleStatusChange()

### Community 8 - "Community 8"
Cohesion: 1.0
Nodes (0): 

### Community 9 - "Community 9"
Cohesion: 1.0
Nodes (0): 

### Community 10 - "Community 10"
Cohesion: 1.0
Nodes (0): 

### Community 11 - "Community 11"
Cohesion: 1.0
Nodes (0): 

### Community 12 - "Community 12"
Cohesion: 1.0
Nodes (0): 

### Community 13 - "Community 13"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "Community 14"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Community 15"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Community 16"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Community 18"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Community 8`** (2 nodes): `layout.tsx`, `RootLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 9`** (2 nodes): `error.tsx`, `DashboardError()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 10`** (2 nodes): `layout.tsx`, `DashboardLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 11`** (2 nodes): `page.tsx`, `ActivityPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (2 nodes): `page.tsx`, `CasesPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (2 nodes): `page.tsx`, `SettingsPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (2 nodes): `KpiCard.tsx`, `KpiCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (2 nodes): `LatestSignalsTable.tsx`, `getSentimentColor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (2 nodes): `intl-provider.tsx`, `IntlProvider()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (2 nodes): `react-query-provider.tsx`, `ReactQueryProvider()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (2 nodes): `Skeleton.tsx`, `Skeleton()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (2 nodes): `apiClient()`, `apiClient.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (2 nodes): `routes.ts`, `getRouteName()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (1 nodes): `eslint.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (1 nodes): `next-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (1 nodes): `next.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (1 nodes): `postcss.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (1 nodes): `DashboardSkeleton.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (1 nodes): `DistributionChart.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (1 nodes): `PlatformBarChart.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (1 nodes): `TrendChart.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `EmptyState.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (1 nodes): `mock-data.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (1 nodes): `useAuthStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (1 nodes): `useUiStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `buildDashboardMetrics()` connect `Community 4` to `Community 0`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `getSignalById()` connect `Community 2` to `Community 0`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `fetchData()` (e.g. with `getActionPlans()` and `getReports()`) actually correct?**
  _`fetchData()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `getCopy()` (e.g. with `DashboardPage()` and `IntelligencePage()`) actually correct?**
  _`getCopy()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `DashboardPage()` (e.g. with `getCopy()` and `buildDashboardMetrics()`) actually correct?**
  _`DashboardPage()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._