import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { existsSync } from "fs";
import { logStructured } from "./logger.js";

// Load .env file if it exists (try multiple locations)
const envPaths = [
  process.env.VERCEL ? "/var/task/.env" : undefined,
  process.cwd() + "/.env",
  __dirname + "/../../.env",
].filter(Boolean);

for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    config({ path: envPath });
    break;
  }
}

// Get environment variables
// SECURITY FIX: Required environment variables must be set - no fallback to dangerous defaults
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Validate required environment variables
if (!supabaseUrl) {
    throw new Error("CRITICAL: SUPABASE_URL environment variable is not set");
}
if (!supabaseServiceKey) {
    throw new Error("CRITICAL: SUPABASE_SERVICE_KEY environment variable is not set");
}
if (!supabaseAnonKey) {
    throw new Error("CRITICAL: SUPABASE_ANON_KEY environment variable is not set");
}

// SECURITY FIX: Never use service key as anon key fallback - this grants admin privileges to all users
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
    // Auth & Users
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

// Convert snake_case column names from DB to camelCase
// The database uses camelCase columns (emailVerified, failedLoginAttempts, lockedUntil)
// but Supabase REST API returns snake_case keys by default
function transformResponseData(data) {
    if (!data) return data;
    if (Array.isArray(data)) return data.map(transformRow);
    return transformRow(data);
}

// Alias used by wrapQueryBuilder's Promise response transformer
function transformResponseDataForTable(data, tableName) {
    return transformResponseData(data);
}

function transformRow(row) {
    if (!row || typeof row !== 'object') return row;
    const mapped = {};
    for (const [key, val] of Object.entries(row)) {
        mapped[key] = val;
    }
    // Map known snake_case → camelCase (response from DB)
    if ('email_verified' in row) mapped.emailVerified = row.email_verified;
    if ('failed_login_attempts' in row) mapped.failedLoginAttempts = row.failed_login_attempts;
    if ('locked_until' in row) mapped.lockedUntil = row.locked_until;
    if ('created_at' in row && !('createdAt' in row)) mapped.createdAt = row.created_at;
    if ('updated_at' in row && !('updatedAt' in row)) mapped.updatedAt = row.updated_at;
    return mapped;
}

// Convert camelCase in request body → snake_case for PostgreSQL
function transformRequestData(data, tableName) {
    if (!data || typeof data !== 'object') return data;
    if (Array.isArray(data)) return data.map(d => transformRequestData(d, tableName));

    // Only transform for User table (has camelCase columns in DB)
    if (tableName === 'User') {
        const mapped = {};
        for (const [key, val] of Object.entries(data)) {
            if (key === 'emailVerified') mapped['email_verified'] = val;
            else if (key === 'failedLoginAttempts') mapped['failed_login_attempts'] = val;
            else if (key === 'lockedUntil') mapped['locked_until'] = val;
            else mapped[key] = val;
        }
        return mapped;
    }
    return data;
}

// Convert column names in .select() calls to snake_case for the DB
// Also track the table so we can transform responses
function wrapQueryBuilder(builder, tableName) {
    // Mark the builder with its table name for downstream methods
    builder.__narrivTable = tableName;

    return new Proxy(builder, {
        get(target, prop) {
            const method = target[prop];

            // .select('*') or .select('id,email_verified,...')
            // → convert camelCase column names to snake_case
            if (prop === 'select') {
                return function(...selectArgs) {
                    const cols = selectArgs[0];
                    if (typeof cols === 'string' && cols !== '*') {
                        // Convert camelCase → snake_case for each column name
                        const converted = cols.split(',').map(c => {
                            c = c.trim();
                            if (c === 'emailVerified') return 'email_verified';
                            if (c === 'failedLoginAttempts') return 'failed_login_attempts';
                            if (c === 'lockedUntil') return 'locked_until';
                            return c;
                        }).join(',');
                        return wrapQueryBuilder(method.call(target, converted), tableName);
                    }
                    return wrapQueryBuilder(method.apply(target, selectArgs), tableName);
                };
            }

            // For non-function properties (including Promise's .then/.catch), pass through directly.
            // The outer createDbClient handles response transformation at the Promise level.
            if (typeof method !== 'function') {
                return method;
            }

            // If the target is itself a thenable (Promise-like), let Promise methods through.
            // This prevents wrapping .then() on an already-resolved value.
            if (target && typeof target.then === 'function') {
                return method;
            }

            // For query builder methods, pass through and wrap the result
            return function(...methodArgs) {
                const result = method.apply(target, methodArgs);
                // Wrap returned query builders to preserve column name transformation
                if (result && typeof result === 'object' && typeof result.then !== 'function' && typeof result.subscribe !== 'function') {
                    if (typeof result.select === 'function' || typeof result.eq === 'function') {
                        return wrapQueryBuilder(result, tableName);
                    }
                }
                // Don't transform the Promise itself here — createDbClient does that at the outer level
                return result;
            };
        }
    });
}

// WeakMap to track table name for request body transformation
const tableNameMap = new WeakMap();

// Create wrapped client that auto-converts table names and response keys
function createDbClient(base) {
    return new Proxy(base, {
        get(target, prop) {
            const value = target[prop];
            if (typeof value === 'function') {
                return function(...args) {
                    let currentTable = null;
                    // Convert first arg (table name) from snake_case to actual table name
                    if (args[0] && typeof args[0] === 'string') {
                        const originalTable = args[0];
                        const mapped = toTableName(originalTable);
                        if (args[0].from) {
                            args[0] = { ...args[0], from: mapped };
                        } else if (!args[0].includes(' ') && !args[0].includes('(')) {
                            args[0] = mapped;
                        }
                        currentTable = mapped;
                    } else if (args[0] && typeof args[0] === 'object' && args[0].from) {
                        // Handle { from: 'table' } object format
                        const mapped = toTableName(args[0].from);
                        args[0] = { ...args[0], from: mapped };
                        currentTable = mapped;
                    }

                    const result = value.apply(target, args);

                    // If this is .from('User') returning a query builder, wrap it
                    if (result && typeof result === 'object' && typeof result.then !== 'function') {
                        return wrapQueryBuilder(result, currentTable);
                    }

                    // For non-builder results (like direct calls), transform response
                    if (result && typeof result.then === 'function') {
                        return result.then(response => {
                            if (response && typeof response === 'object') {
                                return {
                                    ...response,
                                    data: transformResponseData(response.data),
                                };
                            }
                            return response;
                        }).catch(err => {
                            if (err?.details) {
                                const normalized = { ...err };
                                if (Array.isArray(err.details)) {
                                    normalized.details = err.details.map(transformRow);
                                } else if (typeof err.details === 'object') {
                                    normalized.details = transformRow(err.details);
                                }
                                return Promise.reject(normalized);
                            }
                            return Promise.reject(err);
                        });
                    }
                    return result;
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
