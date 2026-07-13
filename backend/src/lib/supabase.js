import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { logStructured } from "./logger.js";

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

// Connection pool configuration
const POOL_CONFIG = {
    // Connection pool settings
    poolMin: parseInt(process.env.DB_POOL_MIN || "2", 10),
    poolMax: parseInt(process.env.DB_POOL_MAX || "20", 10),
    poolIdleTimeout: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || "30000", 10),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || "10000", 10),
    // Enable prepared statement caching
    preparedStatements: process.env.DB_PREPARED_STATEMENTS !== "false",
};

// Connection metrics
const connectionMetrics = {
    active: 0,
    idle: 0,
    total: 0,
    errors: 0,
    lastError: null,
};

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

// Create Supabase clients with connection pool settings
const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
        headers: {
            "x-pool-config": JSON.stringify(POOL_CONFIG),
        },
    },
});

const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: true, persistSession: true },
    global: {
        headers: {
            "x-pool-config": JSON.stringify(POOL_CONFIG),
        },
    },
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

// Connection pool metrics export
export function getPoolMetrics() {
    return {
        ...connectionMetrics,
        config: POOL_CONFIG,
        timestamp: new Date().toISOString(),
    };
}

// Connection pool configuration export
export function getPoolConfig() {
    return { ...POOL_CONFIG };
}

// Helper to check connection
export async function checkConnection() {
    const startTime = Date.now();
    try {
        const { data, error } = await baseSupabaseAdmin.from('User').select('id').limit(1);
        const latency = Date.now() - startTime;

        connectionMetrics.total++;
        connectionMetrics.active++;

        if (error && error.code !== 'PGRST116' && !error.message?.includes('JWT')) {
            connectionMetrics.errors++;
            connectionMetrics.lastError = error.message;
            logStructured("error", "supabase_connection_failed", {
                latency,
                error: error.message
            });
            return false;
        }

        logStructured("info", "supabase_connection_success", {
            latency,
            totalConnections: connectionMetrics.total
        });

        connectionMetrics.active--;
        return true;
    } catch (err) {
        connectionMetrics.errors++;
        connectionMetrics.lastError = err.message;
        connectionMetrics.active--;
        logStructured("error", "supabase_connection_error", {
            latency: Date.now() - startTime,
            error: err.message
        });
        return false;
    }
}

// Cleanup idle connections periodically (for long-running processes)
let cleanupInterval = null;

export function startConnectionCleanup(intervalMs = 60000) {
    if (cleanupInterval) return;

    cleanupInterval = setInterval(() => {
        const metrics = getPoolMetrics();
        if (metrics.active === 0) {
            logStructured("info", "supabase_idle_cleanup", {
                idleTime: intervalMs,
                totalConnections: metrics.total
            });
        }
    }, intervalMs);

    if (cleanupInterval.unref) {
        cleanupInterval.unref();
    }
}

export function stopConnectionCleanup() {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
    }
}

export default supabaseAdmin;
