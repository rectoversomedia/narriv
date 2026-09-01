/**
 * Workspace runtime values — extracted from workspace.d.ts for Node.js compatibility
 */

const WorkspacePlan = {
  PILOT: "pilot",
  INTELLIGENCE: "intelligence",
  DECISION: "decision",
  COMMAND: "command",
};

const WorkspaceMemberRole = {
  OWNER: "owner",
  ADMIN: "admin",
  EDITOR: "editor",
  VIEWER: "viewer",
};

const PLAN_LIMITS = {
  [WorkspacePlan.PILOT]: {
    plan: WorkspacePlan.PILOT,
    name: "PILOT",
    tagline: "Validate the value",
    priceIdr: 5000000,
    maxMembers: 1,
    maxTopics: 5,
    maxSignalsPerMonth: 10000,
    maxAlertsPerMonth: 100,
    maxReportsPerMonth: 10,
    maxAiAnalysesPerMonth: 500,
    dataRetentionDays: 30,
    features: ["signals_monitoring", "alerts", "email_notifications"],
  },
  [WorkspacePlan.INTELLIGENCE]: {
    plan: WorkspacePlan.INTELLIGENCE,
    name: "INTELLIGENCE",
    tagline: "Understand what matters",
    priceIdr: 25000000,
    maxMembers: 10,
    maxTopics: 50,
    maxSignalsPerMonth: 100000,
    maxAlertsPerMonth: 1000,
    maxReportsPerMonth: 100,
    maxAiAnalysesPerMonth: 5000,
    dataRetentionDays: 365,
    features: [
      "signals_monitoring",
      "alerts",
      "email_notifications",
      "intelligence",
      "ai_visibility",
      "whatsapp_notifications",
      "monthly_report",
    ],
  },
  [WorkspacePlan.DECISION]: {
    plan: WorkspacePlan.DECISION,
    name: "DECISION",
    tagline: "Turn intelligence into action",
    priceIdr: 50000000,
    maxMembers: 50,
    maxTopics: 200,
    maxSignalsPerMonth: 500000,
    maxAlertsPerMonth: 5000,
    maxReportsPerMonth: 500,
    maxAiAnalysesPerMonth: 20000,
    dataRetentionDays: 365,
    features: [
      "signals_monitoring",
      "alerts",
      "email_notifications",
      "intelligence",
      "ai_visibility",
      "whatsapp_notifications",
      "monthly_report",
      "action_center",
      "escalation_workflow",
      "slack_integration",
      "teams_integration",
      "weekly_report",
    ],
  },
  [WorkspacePlan.COMMAND]: {
    plan: WorkspacePlan.COMMAND,
    name: "COMMAND",
    tagline: "Operationalize intelligence",
    priceIdr: 100000000,
    maxMembers: -1, // Unlimited
    maxTopics: -1, // Unlimited
    maxSignalsPerMonth: -1, // Unlimited
    maxAlertsPerMonth: -1, // Unlimited
    maxReportsPerMonth: -1, // Unlimited
    maxAiAnalysesPerMonth: -1, // Unlimited
    dataRetentionDays: -1, // Unlimited
    features: [
      "signals_monitoring",
      "alerts",
      "email_notifications",
      "intelligence",
      "ai_visibility",
      "whatsapp_notifications",
      "monthly_report",
      "action_center",
      "escalation_workflow",
      "slack_integration",
      "teams_integration",
      "weekly_report",
      "custom_ai_models",
      "api_access",
      "dedicated_infrastructure",
      "enterprise_sla",
      "dedicated_success_manager",
      "quarterly_review",
    ],
  },
};

export { WorkspacePlan, WorkspaceMemberRole, PLAN_LIMITS };
