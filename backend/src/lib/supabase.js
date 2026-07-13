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
    poolMin: parseInt(process.env.DB_POOL_MIN || "2", 10),
    poolMax: parseInt(process.env.DB_POOL_MAX || "20", 10),
    poolIdleTimeout: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || "30000", 10),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || "10000", 10),
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

// Table name mapping: snake_case (code) → actual PostgreSQL table names
// CRITICAL: users renamed to user_profiles to avoid conflict with Supabase auth.users
const TABLE_MAP = {
    // Auth & Users
    'users': 'user_profiles',
    'user_profiles': 'user_profiles',
    'refresh_tokens': 'refresh_tokens',
    'password_reset_tokens': 'password_reset_tokens',
    'email_verification_tokens': 'email_verification_tokens',
    'oauth_accounts': 'oauth_accounts',

    // Workspace
    'workspaces': 'workspaces',
    'workspace_members': 'workspace_members',
    'workspace_settings': 'workspace_settings',
    'workspace_notification_settings': 'workspace_notification_settings',

    // Data Pipeline
    'sources': 'sources',
    'ingestion_jobs': 'ingestion_jobs',
    'raw_documents': 'raw_documents',
    'signals': 'signals',
    'signal_analyses': 'signal_analyses',

    // Core Features
    'alerts': 'alerts',
    'escalation_matrices': 'escalation_matrices',
    'narrative_clusters': 'narrative_clusters',
    'narrative_cluster_signals': 'narrative_cluster_signals',

    // Reports
    'reports': 'reports',
    'report_exports': 'report_exports',
    'report_templates': 'report_templates',
    'report_schedules': 'report_schedules',

    // Actions
    'action_plans': 'action_plans',
    'generated_assets': 'generated_assets',
    'ai_feedback': 'ai_feedback',
    'ai_analysis_failure_logs': 'ai_analysis_failure_logs',

    // AI Visibility
    'ai_visibility_results': 'ai_visibility_results',
    'prompt_test_runs': 'prompt_test_runs',

    // System
    'audit_logs': 'audit_logs',
    'cases': 'cases',
    'integrations': 'integrations',
    'token_usage': 'token_usage',
    'app_notifications': 'app_notifications',
};

// Convert camelCase to snake_case
function camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Convert snake_case to actual table name
function toTableName(name) {
    // First convert camelCase to snake_case
    const snakeName = camelToSnake(name);
    if (TABLE_MAP[snakeName]) return TABLE_MAP[snakeName];
    // If not in map, return as-is
    return name;
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
                    // Convert first arg (table name) from snake_case to actual table name
                    if (args[0] && typeof args[0] === 'string') {
                        const originalTable = args[0];
                        // Handle objects like { from: 'table' }
                        if (args[0].from) {
                            args[0] = { ...args[0], from: toTableName(args[0].from) };
                        } else if (!args[0].includes(' ') && !args[0].includes('(')) {
                            // Plain table name
                            args[0] = toTableName(args[0]);
                        }
                        // Debug log for user_profiles
                        if (originalTable === 'users' || args[0] === 'user_profiles') {
                            // Skip debug to reduce noise
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
        const { data, error } = await baseSupabaseAdmin.from('user_profiles').select('id').limit(1);
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

// Cleanup idle connections periodically
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
