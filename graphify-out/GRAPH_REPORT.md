# Graph Report - graphify-out/input  (2026-05-21)

## Corpus Check
- Corpus is ~1,215 words - fits in a single context window. You may not need a graph.

## Summary
- 92 nodes · 90 edges · 10 communities detected
- Extraction: 90% EXTRACTED · 9% INFERRED · 1% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Action Response Loop|Action Response Loop]]
- [[_COMMUNITY_Signals and Sources|Signals and Sources]]
- [[_COMMUNITY_Alerts and Escalation|Alerts and Escalation]]
- [[_COMMUNITY_Command Center Overview|Command Center Overview]]
- [[_COMMUNITY_Visual Design System|Visual Design System]]
- [[_COMMUNITY_AI Visibility GEO|AI Visibility GEO]]
- [[_COMMUNITY_Topbar User Controls|Topbar User Controls]]
- [[_COMMUNITY_Narrative Intelligence|Narrative Intelligence]]
- [[_COMMUNITY_Sidebar Navigation System|Sidebar Navigation System]]
- [[_COMMUNITY_Reports Center|Reports Center]]

## God Nodes (most connected - your core abstractions)
1. `Command Center Page` - 8 edges
2. `AI Visibility and GEO Dashboard` - 8 edges
3. `Predictive Alerts Page` - 7 edges
4. `Action Center and Learning Loop Page` - 7 edges
5. `Narrative Signals Page` - 6 edges
6. `Data Sources and Integration Page` - 6 edges
7. `Settings and Escalation Channels Page` - 6 edges
8. `High Contrast Color Scheme` - 5 edges
9. `Sidebar Navigator` - 5 edges
10. `Topbar` - 5 edges

## Surprising Connections (you probably didn't know these)
- `High Contrast Color Scheme` --references--> `Dark Navy Sidebar`  [EXTRACTED]
  graphify-out/input/FRONTEND_BLUEPRINT.md → graphify-out/input/FRONTEND_BLUEPRINT.md  _Bridges community 4 → community 8_
- `Sidebar Navigator` --references--> `User Profile Widget`  [EXTRACTED]
  graphify-out/input/FRONTEND_BLUEPRINT.md → graphify-out/input/FRONTEND_BLUEPRINT.md  _Bridges community 8 → community 6_
- `Command Center Page` --references--> `Signal Volume Line Chart`  [EXTRACTED]
  graphify-out/input/FRONTEND_BLUEPRINT.md → graphify-out/input/FRONTEND_BLUEPRINT.md  _Bridges community 3 → community 7_
- `AI Visibility and GEO Dashboard` --references--> `GEO Metric Cards`  [EXTRACTED]
  graphify-out/input/FRONTEND_BLUEPRINT.md → graphify-out/input/FRONTEND_BLUEPRINT.md  _Bridges community 5 → community 8_
- `Narrative Signals Page` --references--> `Filter and Triage Toolbar`  [EXTRACTED]
  graphify-out/input/FRONTEND_BLUEPRINT.md → graphify-out/input/FRONTEND_BLUEPRINT.md  _Bridges community 1 → community 2_

## Hyperedges (group relationships)
- **Navigation Shell** — frontend_blueprint_sidebar_navigator, frontend_blueprint_topbar, frontend_blueprint_page_title_indicator, frontend_blueprint_bilingual_switcher, frontend_blueprint_universal_search_bar [EXTRACTED 1.00]
- **Reputation Monitoring Flow** — frontend_blueprint_data_sources_integration_page, frontend_blueprint_narrative_signals_page, frontend_blueprint_narrative_intelligence_page, frontend_blueprint_predictive_alerts_page, frontend_blueprint_action_center_learning_loop_page [INFERRED 0.85]
- **AI Feedback Loop** — frontend_blueprint_ai_learning_loop_overlay, frontend_blueprint_accept_feedback_action, frontend_blueprint_edit_feedback_action, frontend_blueprint_reject_feedback_action, frontend_blueprint_action_preview_drawer [EXTRACTED 1.00]

## Communities

### Community 0 - "Action Response Loop"
Cohesion: 0.14
Nodes (14): Accept Feedback Action, Action Center and Learning Loop Page, Action Plan Kanban/List Board, Action Plans Route /action-plans, Action Preview Drawer, AI Learning Loop Overlay, Detail Alert View, Edit Feedback Action (+6 more)

### Community 1 - "Signals and Sources"
Cohesion: 0.15
Nodes (13): AI Classified Crawling Log, Connector Grid, Data Sources and Integration Page, Status Ingestion Toggle, Narrative Signals Page, Ping Source Health, Rationale: AI Classified Crawled Signal Log, Rationale: Connect Platform to External Data Sources (+5 more)

### Community 2 - "Alerts and Escalation"
Cohesion: 0.17
Nodes (13): AI Threshold Settings, Alert Detail Route /alerts/[id], Alert Disposition, Alert Status Dashboard, Alerts Route /alerts, Escalation Level Settings, Filter and Triage Toolbar, Predictive Alerts Page (+5 more)

### Community 3 - "Command Center Overview"
Cohesion: 0.22
Nodes (9): AI Platforms Donut Chart, Alerts and Quick Actions Widget, Command Center Page, Live Health Status, Metric Card Grid, Rationale: Overview of Brand Reputation and Operational Efficiency, React Bits Interactions, Root Route / (+1 more)

### Community 4 - "Visual Design System"
Cohesion: 0.22
Nodes (9): Enterprise SaaS Premium Design Style, High Contrast Color Scheme, Main Canvas Colors, Modern Sidebar Navigation, Narriv Dashboard, Primary Accent Blue Purple, Rationale: Premium Enterprise Dashboard Experience, Rich Data Visualization (+1 more)

### Community 5 - "AI Visibility GEO"
Cohesion: 0.25
Nodes (8): AI Search Sandbox, AI Visibility and GEO Dashboard, Competitor Mention Rate Detector, Content Optimization Suggestions, Generative Engine Optimization, Platform Comparison Table, Rationale: Monitor Brand Presence in AI Search Answers, Visibility Route /visibility

### Community 6 - "Topbar User Controls"
Cohesion: 0.29
Nodes (7): Bilingual Switcher, Default Language Preference, Notification Bell, Page Title Indicator, Topbar, Universal Search Bar, User Profile Widget

### Community 7 - "Narrative Intelligence"
Cohesion: 0.29
Nodes (7): Hierarchy Exploration, Intelligence Route /intelligence, Interactive Cluster Map, Narrative Intelligence Page, Narrative Velocity Table, Rationale: Map Relationships Between Issues, Signal Volume Line Chart

### Community 8 - "Sidebar Navigation System"
Cohesion: 0.33
Nodes (6): AI Visibility Score Card, Dark Navy Sidebar, GEO Metric Cards, Logo Area, Semantic Menu Groups, Sidebar Navigator

### Community 9 - "Reports Center"
Cohesion: 0.33
Nodes (6): Automated Report Scheduling, Document Vault Grid, Download and Share CTAs, Rationale: Management Level Reporting, Reports Center Page, Reports Route /reports

## Ambiguous Edges - Review These
- `User Profile Widget` → `Topbar`  [AMBIGUOUS]
  graphify-out/input/FRONTEND_BLUEPRINT.md · relation: conceptually_related_to

## Knowledge Gaps
- **60 isolated node(s):** `Modern Sidebar Navigation`, `Rich Data Visualization`, `Main Canvas Colors`, `Primary Accent Blue Purple`, `Semantic Status Colors` (+55 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `User Profile Widget` and `Topbar`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `Settings and Escalation Channels Page` connect `Alerts and Escalation` to `Topbar User Controls`?**
  _High betweenness centrality (0.313) - this node is a cross-community bridge._
- **Why does `Sidebar Navigator` connect `Sidebar Navigation System` to `Topbar User Controls`?**
  _High betweenness centrality (0.287) - this node is a cross-community bridge._
- **What connects `Modern Sidebar Navigation`, `Rich Data Visualization`, `Main Canvas Colors` to the rest of the system?**
  _60 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Action Response Loop` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._