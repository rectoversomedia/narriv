import { createClient } from "@supabase/supabase-js";
import { logStructured } from "./logger.js";

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
    throw new Error("CRITICAL: SUPABASE_URL environment variable is not set");
}
if (!supabaseServiceKey) {
    throw new Error("CRITICAL: SUPABASE_SERVICE_KEY environment variable is not set");
}
if (!supabaseAnonKey) {
    throw new Error("CRITICAL: SUPABASE_ANON_KEY environment variable is not set");
}
if (supabaseAnonKey === supabaseServiceKey) {
    throw new Error("CRITICAL: SUPABASE_ANON_KEY must be different from SUPABASE_SERVICE_KEY");
}

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

// Table name mapping: code usage → actual PostgreSQL table names
// The actual table is 'User' (PascalCase), not 'users' (lowercase)
const TABLE_MAP = {
    'users': 'User',
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

    // Subscriptions
    'subscription_plans': 'subscription_plans',
    'plan_limits': 'plan_limits',
    'plan_features': 'plan_features',
    'workspace_subscriptions': 'workspace_subscriptions',
    'workspace_usage': 'workspace_usage',
    'workspace_invoices': 'workspace_invoices',

    // Webhooks
    'webhooks': 'webhooks',
    'webhook_deliveries': 'webhook_deliveries',

    // Password History
    'password_history': 'password_history',
};

// Convert camelCase to snake_case
function camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Convert table name to actual PostgreSQL table name
function toTableName(name) {
    const snakeName = camelToSnake(name);
    if (TABLE_MAP[snakeName]) return TABLE_MAP[snakeName];
    return name;
}

// Create Supabase clients
const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});

const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: true, persistSession: true },
});

// Transform a single DB row: snake_case keys → camelCase
// and delete the snake_case originals to prevent duplicate keys.
// Also handles camelCase columns (from User table) → snake_case aliases.
function transformRow(row) {
    if (!row || typeof row !== 'object') return row;
    const mapped = {};
    for (const [key, val] of Object.entries(row)) {
        mapped[key] = val;
    }
    // snake_case → camelCase (for tables with snake_case columns)
    if ('email_verified' in row) {
        mapped.emailVerified = row.email_verified;
        delete mapped.email_verified;
    }
    if ('failed_login_attempts' in row) {
        mapped.failedLoginAttempts = row.failed_login_attempts;
        delete mapped.failed_login_attempts;
    }
    if ('locked_until' in row) {
        mapped.lockedUntil = row.locked_until;
        delete mapped.locked_until;
    }
    if ('created_at' in row && !('createdAt' in row)) {
        mapped.createdAt = row.created_at;
        delete mapped.created_at;
    }
    if ('updated_at' in row && !('updatedAt' in row)) {
        mapped.updatedAt = row.updated_at;
        delete mapped.updated_at;
    }
    // camelCase → snake_case aliases (for User table which uses camelCase columns)
    if ('emailVerified' in row && !('email_verified' in mapped)) {
        mapped.email_verified = row.emailVerified;
    }
    if ('failedLoginAttempts' in row && !('failed_login_attempts' in mapped)) {
        mapped.failed_login_attempts = row.failedLoginAttempts;
    }
    if ('lockedUntil' in row && !('locked_until' in mapped)) {
        mapped.locked_until = row.lockedUntil;
    }
    return mapped;
}

// Transform response data: handle null, array, or single object
function transformResponseData(data) {
    if (!data) return data;
    if (Array.isArray(data)) return data.map(transformRow);
    return transformRow(data);
}

// Transform an error's .details field (also snake_case from DB)
function transformErrorDetails(details) {
    if (!details) return details;
    if (Array.isArray(details)) return details.map(transformRow);
    if (typeof details === 'object') return transformRow(details);
    return details;
}

// Create wrapped Supabase client.
// Handles:
//   1. Table name mapping  (e.g. 'users' → 'User', 'User' stays 'User')
//   2. Response data transform  (snake_case from DB → camelCase for callers)
//   3. Error details transform  (snake_case → camelCase on rejection)
function createDbClient(base) {
    return new Proxy(base, {
        get(target, prop) {
            const value = target[prop];

            if (typeof value !== 'function') return value;

            return function(...args) {
                let tableName = null;

                // ── Table name mapping ─────────────────────────────────────
                if (args[0] !== undefined) {
                    const arg0 = args[0];
                    if (typeof arg0 === 'string') {
                        tableName = toTableName(arg0);
                        args[0] = tableName;
                    } else if (arg0 && typeof arg0 === 'object' && !arg0.from && !arg0.select) {
                        // Plain object { from: 'users' } or { user_id: '...' }
                        if (typeof arg0.from === 'string') {
                            tableName = toTableName(arg0.from);
                            args[0] = { ...arg0, from: tableName };
                        }
                    }
                }

                const result = value.apply(target, args);

                // ── Non-Promise results (builders, raw objects) ───────────
                // A query builder is thenable but NOT an instance of Promise.
                // It must NOT be awaited here — let the caller's .then() run.
                if (result && typeof result.then === 'function') {
                    const isRealPromise = result instanceof Promise;
                    if (isRealPromise) {
                        // Direct API call (e.g. supabase.auth.signInWithPassword())
                        // → transform resolved data
                        return result.then(response => {
                            if (response && typeof response === 'object' && 'data' in response) {
                                return { ...response, data: transformResponseData(response.data) };
                            }
                            return response;
                        }).catch(err => {
                            if (err && typeof err === 'object' && err.details) {
                                err.details = transformErrorDetails(err.details);
                            }
                            return Promise.reject(err);
                        });
                    }
                    // else: query builder (PostgrestFilterBuilder, etc.)
                    // → pass through unchanged so .then/.single() work natively
                }

                return result;
            };
        }
    });
}

// Export wrapped clients
export const supabaseAdmin = createDbClient(adminClient);
export const supabase = createDbClient(anonClient);

// Also export base (unwrapped) clients for direct use
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

export function getPoolConfig() {
    return { ...POOL_CONFIG };
}

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
            logStructured("error", "supabase_connection_failed", { latency, error: error.message });
            return false;
        }

        logStructured("info", "supabase_connection_success", { latency, totalConnections: connectionMetrics.total });

        connectionMetrics.active--;
        return true;
    } catch (err) {
        connectionMetrics.errors++;
        connectionMetrics.lastError = err.message;
        connectionMetrics.active--;
        logStructured("error", "supabase_connection_error", { latency: Date.now() - startTime, error: err.message });
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
            logStructured("info", "supabase_idle_cleanup", { idleTime: intervalMs, totalConnections: metrics.total });
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
