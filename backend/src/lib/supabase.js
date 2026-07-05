import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Load .env file if it exists
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, "../../.env");

if (existsSync(envPath)) {
    config({ path: envPath });
}

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || "placeholder-key";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || supabaseServiceKey;

// Table name mapping: snake_case (code) → PascalCase (Supabase)
const TABLE_MAP = {
    // Auth & Users
    'users': 'User',
    'refresh_tokens': 'RefreshToken',
    'password_reset_tokens': 'PasswordResetToken',
    'email_verification_tokens': 'EmailVerificationToken',
    'oauth_accounts': 'OAuthAccount',

    // Workspace
    'workspaces': 'Workspace',
    'workspace_members': 'WorkspaceMember',
    'workspace_settings': 'WorkspaceSettings',
    'workspace_notification_settings': 'WorkspaceNotificationSettings',

    // Data Pipeline
    'sources': 'Source',
    'ingestion_jobs': 'IngestionJob',
    'raw_documents': 'RawDocument',
    'signals': 'Signal',
    'signal_analyses': 'SignalAnalysis',

    // Core Features
    'alerts': 'Alert',
    'escalation_matrices': 'EscalationMatrix',
    'narrative_clusters': 'NarrativeCluster',
    'narrative_cluster_signals': 'NarrativeClusterSignal',

    // Reports
    'reports': 'Report',
    'report_exports': 'ReportExport',
    'report_templates': 'ReportTemplate',
    'report_schedules': 'ReportSchedule',

    // Actions
    'action_plans': 'ActionPlan',
    'generated_assets': 'GeneratedAsset',
    'ai_feedback': 'AIFeedback',
    'ai_analysis_failure_logs': 'AIAnalysisFailureLog',

    // AI Visibility
    'ai_visibility_results': 'AIVisibilityResult',
    'prompt_test_runs': 'PromptTestRun',

    // System
    'audit_logs': 'AuditLog',
    'cases': 'Case',
    'integrations': 'Integration',
    'token_usage': 'TokenUsage',
    'app_notifications': 'AppNotification',
};

// Convert snake_case to PascalCase for tables
function toPascalCase(name) {
    if (TABLE_MAP[name]) return TABLE_MAP[name];
    // Auto-convert: user_ids -> UserIds
    const parts = name.split('_');
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
}

// Create Supabase clients
const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});

const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: true, persistSession: true },
});

// Create wrapped client that auto-converts table names
function createDbClient(base) {
    return new Proxy(base, {
        get(target, prop) {
            const value = target[prop];
            if (typeof value === 'function') {
                return function(...args) {
                    // Convert first arg (table name) from snake_case to PascalCase
                    if (args[0] && typeof args[0] === 'string') {
                        // Handle objects like { from: 'table' }
                        if (args[0].from) {
                            args[0] = { ...args[0], from: toPascalCase(args[0].from) };
                        } else if (!args[0].includes(' ') && !args[0].includes('(')) {
                            // Plain table name
                            args[0] = toPascalCase(args[0]);
                        }
                    }
                    return value.apply(target, args);
                };
            }
            return value;
        }
    });
}

// Export wrapped clients
export const supabaseAdmin = createDbClient(adminClient);
export const supabase = createDbClient(anonClient);

// Also export base clients
export const baseSupabaseAdmin = adminClient;
export const baseSupabase = anonClient;

// Helper to check connection
export async function checkConnection() {
    try {
        const { data, error } = await baseSupabaseAdmin.from('User').select('id').limit(1);
        if (error && error.code !== 'PGRST116' && !error.message?.includes('JWT')) {
            console.error("[SUPABASE] Connection failed:", error.message);
            return false;
        }
        console.log("[SUPABASE] Connected successfully");
        return true;
    } catch (err) {
        console.error("[SUPABASE] Connection error:", err.message);
        return false;
    }
}

export default supabaseAdmin;
