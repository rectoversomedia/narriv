const fs = require('fs');
const file = 'C:\\\\MyProject\\\\narriv\\\\backend\\\\src\\\\index.js';
let content = fs.readFileSync(file, 'utf8');

// Replace everything between "// Import Routes" and "import { globalErrorHandler"
const newImports = `
import authRoutes from "./modules/auth/auth.routes.js";
import signalsRoutes from "./modules/signals/signals.routes.js";
import sourcesRoutes from "./modules/sources/sources.routes.js";
import ingestionRoutes from "./modules/ingestion/ingestion.routes.js";
import aiRoutes from "./modules/ai/ai.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import alertsRoutes from "./modules/alerts/alerts.routes.js";
import narrativesRoutes from "./modules/narratives/narratives.routes.js";
import geoRoutes from "./modules/geo/geo.routes.js";
import reportsRoutes from "./modules/reports/reports.routes.js";
import actionsRoutes from "./modules/actions/actions.routes.js";
import actionPlansRoutes from "./modules/action-plans/action-plans.routes.js";
import feedbackRoutes from "./modules/feedback/feedback.routes.js";
import workspaceSettingsRoutes from "./modules/workspace-settings/workspace-settings.routes.js";
import activityRoutes from "./modules/activity/activity.routes.js";
import onboardingRoutes from "./modules/onboarding/onboarding.routes.js";
import casesRoutes from "./modules/cases/cases.routes.js";
import integrationsRoutes from "./modules/integrations/integrations.routes.js";
import appNotificationsRoutes from "./modules/app-notifications/app-notifications.routes.js";
`;

content = content.replace(/import signalsRoutes[\s\S]*?import appNotificationsRoutes[^\n]*/, newImports.trim());

fs.writeFileSync(file, content);
console.log('Fixed imports');