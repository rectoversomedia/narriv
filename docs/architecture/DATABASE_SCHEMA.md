# Narriv Database Schema Reference
**Version:** 1.0.0  
**Last Updated:** 06-07-2026  
**Database:** Supabase (PostgreSQL)

---

## Table Overview

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `User` | User accounts | id, email, name, password_hash, email_verified |
| `Workspace` | Multi-tenant workspaces | id, name, slug, industry |
| `WorkspaceMember` | User-workspace roles | user_id, workspace_id, role |
| `WorkspaceSettings` | Workspace configuration | workspace_id, settings JSON |
| `WorkspaceNotificationSettings` | Alert channels | workspace_id, channels JSON |
| `Source` | Data collection sources | workspace_id, type, platform, keywords |
| `IngestionJob` | Collection job tracking | workspace_id, source_id, status |
| `RawDocument` | Raw collected data | workspace_id, source_id, metadata JSON |
| `Signal` | Processed intelligence | workspace_id, title, content, sentiment, source |
| `SignalAnalysis` | AI analysis results | signal_id, sentiment_score, impact_level |
| `Alert` | Predictive/risk alerts | workspace_id, title, severity, type, status |
| `EscalationMatrix` | Alert escalation levels | workspace_id, level, sla_minutes |
| `NarrativeCluster` | Topic clustering | workspace_id, title, priority, velocity |
| `NarrativeClusterSignal` | Cluster-signal join | cluster_id, signal_id |
| `Report` | Generated reports | workspace_id, title, type, status |
| `ReportExport` | Export job tracking | report_id, format, status |
| `ReportTemplate` | Report templates | workspace_id, name, type, sections JSON |
| `ReportSchedule` | Recurring schedules | workspace_id, template_id, cadence |
| `ActionPlan` | AI action plans | workspace_id, title, type, status |
| `GeneratedAsset` | AI content | workspace_id, plan_id, type |
| `AIFeedback` | User feedback | workspace_id, type, rating |
| `AIVisibilityResult` | AI visibility data | workspace_id, engine, metrics JSON |
| `PromptTestRun` | Prompt test results | visibility_result_id, prompt, result |
| `RefreshToken` | JWT refresh tokens | user_id, token, expires_at |
| `PasswordResetToken` | Password reset codes | user_id, token, expires_at |
| `EmailVerificationToken` | Email verification | user_id, token, expires_at |
| `OAuthAccount` | OAuth accounts | user_id, provider, provider_user_id |
| `AuditLog` | Security audit trail | user_id, workspace_id, event, metadata |
| `Case` | Investigation cases | workspace_id, signal_id, status |
| `Integration` | Third-party integrations | workspace_id, type, config JSON |
| `TokenUsage` | AI token tracking | workspace_id, tokens, cost |
| `AppNotification` | In-app notifications | workspace_id, user_id, type |

---

## Column Type Reference

### User
```
id              UUID (PK)
email           TEXT (UNIQUE, NOT NULL)
name            TEXT
password_hash   TEXT
email_verified  BOOLEAN DEFAULT false
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### Workspace
```
id              UUID (PK)
name            TEXT (NOT NULL)
slug            TEXT (UNIQUE)
industry        TEXT
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### WorkspaceMember
```
id              UUID (PK)
user_id         UUID (FK → User)
workspace_id    UUID (FK → Workspace)
role            TEXT ('admin', 'editor', 'viewer')
created_at      TIMESTAMPTZ
UNIQUE(user_id, workspace_id)
```

### Source
```
id              UUID (PK)
workspace_id    UUID (FK → Workspace)
name            TEXT (NOT NULL)
type            TEXT ('social', 'news', 'web')
platform        TEXT ('twitter', 'facebook', 'web')
keywords        TEXT[] (Postgres array)
enabled         BOOLEAN DEFAULT true
status          TEXT
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### Signal
```
id              UUID (PK)
workspace_id    UUID (FK → Workspace)
source_id       UUID (FK → Source, nullable)
title           TEXT
content         TEXT
sentiment       TEXT ('positive', 'negative', 'neutral')
source          TEXT
region          TEXT
language        TEXT
published_at    TIMESTAMPTZ
captured_at     TIMESTAMPTZ
status          TEXT
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### SignalAnalysis
```
id              UUID (PK)
signal_id       UUID (FK → Signal)
sentiment_score DECIMAL
impact_level    TEXT ('low', 'medium', 'high', 'critical')
summary         TEXT
entities        JSONB
confidence      DECIMAL
created_at      TIMESTAMPTZ
```

### Alert
```
id              UUID (PK)
workspace_id    UUID (FK → Workspace)
title           TEXT (NOT NULL)
description     TEXT
severity       TEXT ('low', 'medium', 'high', 'critical')
type           TEXT ('reputational', 'operational', 'security')
status         TEXT ('open', 'acknowledged', 'investigating', 'resolved')
signal_count   INTEGER
owner_id       UUID (FK → User)
deadline        TIMESTAMPTZ
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### NarrativeCluster
```
id              UUID (PK)
workspace_id    UUID (FK → Workspace)
title           TEXT (NOT NULL)
description     TEXT
priority        TEXT ('low', 'medium', 'high')
velocity        TEXT ('growing', 'stable', 'declining')
signal_count    INTEGER
sentiment       DECIMAL
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### Report
```
id              UUID (PK)
workspace_id    UUID (FK → Workspace)
title           TEXT
type            TEXT ('daily', 'weekly', 'monthly', 'custom')
status          TEXT ('draft', 'generating', 'ready')
content         JSONB
created_by      UUID (FK → User)
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### ActionPlan
```
id              UUID (PK)
workspace_id    UUID (FK → Workspace)
alert_id        UUID (FK → Alert, nullable)
title           TEXT
type            TEXT ('strategy', 'content', 'crisis')
status          TEXT ('pending', 'in_progress', 'completed')
priority        TEXT ('low', 'medium', 'high')
options         JSONB
created_by      UUID (FK → User)
assigned_to     UUID (FK → User)
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### AuditLog
```
id              UUID (PK)
user_id         UUID (FK → User, nullable)
workspace_id    UUID (FK → Workspace, nullable)
event           TEXT (NOT NULL)
metadata        JSONB
ip_address      TEXT
user_agent      TEXT
request_id      TEXT
created_at      TIMESTAMPTZ
```

### AppNotification
```
id              UUID (PK)
workspace_id    UUID (FK → Workspace)
user_id         UUID (FK → User)
type            TEXT
title           TEXT
message         TEXT
read            BOOLEAN DEFAULT false
data            JSONB
created_at      TIMESTAMPTZ
```

---

## Indexes

### Signal Indexes
```sql
CREATE INDEX idx_signal_workspace_id ON "Signal"(workspace_id);
CREATE INDEX idx_signal_captured_at ON "Signal"(captured_at);
CREATE INDEX idx_signal_sentiment ON "Signal"(sentiment);
CREATE INDEX idx_signal_source ON "Signal"(source);
CREATE INDEX idx_signal_region ON "Signal"(region);
CREATE INDEX idx_signal_language ON "Signal"(language);
```

### Alert Indexes
```sql
CREATE INDEX idx_alert_workspace_id ON "Alert"(workspace_id);
CREATE INDEX idx_alert_severity ON "Alert"(severity);
CREATE INDEX idx_alert_status ON "Alert"(status);
CREATE INDEX idx_alert_created_at ON "Alert"(created_at);
```

### Audit Log Indexes
```sql
CREATE INDEX idx_audit_workspace_id ON "AuditLog"(workspace_id);
CREATE INDEX idx_audit_user_id ON "AuditLog"(user_id);
CREATE INDEX idx_audit_event ON "AuditLog"(event);
CREATE INDEX idx_audit_created_at ON "AuditLog"(created_at);
```

---

## Row Level Security (RLS)

All tables have RLS enabled with policies based on workspace membership:

```sql
-- Example: Signal RLS
ALTER TABLE "Signal" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view signals in their workspaces"
ON "Signal" FOR SELECT
USING (
    workspace_id IN (
        SELECT workspace_id FROM "WorkspaceMember"
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert signals in their workspaces"
ON "Signal" FOR INSERT
WITH CHECK (
    workspace_id IN (
        SELECT workspace_id FROM "WorkspaceMember"
        WHERE user_id = auth.uid()
    )
);
```

---

## Supabase Auth Integration

The app uses Supabase Auth for:
- Email/password authentication
- JWT token management
- OAuth (Google)

Auth uid is linked to `User.id` in the application layer.

---

## Enum Types

```sql
-- Alert severity
CREATE TYPE alert_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- Alert status
CREATE TYPE alert_status AS ENUM ('open', 'acknowledged', 'investigating', 'resolved');

-- Workspace member role
CREATE TYPE member_role AS ENUM ('admin', 'editor', 'viewer');

-- Source type
CREATE TYPE source_type AS ENUM ('social', 'news', 'web', 'api');
```

---

**Document Version:** 1.0.0  
**Last Updated:** 06-07-2026
