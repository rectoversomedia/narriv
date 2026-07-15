#!/usr/bin/env node
/**
 * Narriv Environment Validation Script
 * Validates all required environment variables before deployment
 */

const requiredBackendVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_KEY',
    'JWT_SECRET',
];

const requiredFrontendVars = [
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

const optionalVars = [
    'ACCESS_TOKEN_TTL',
    'REFRESH_TOKEN_TTL_DAYS',
    'NODE_ENV',
    'REDIS_URL',
    'SENTRY_DSN',
    'CORS_ORIGINS',
];

// Colors
const red = (text) => `\x1b[31m${text}\x1b[0m`;
const green = (text) => `\x1b[32m${text}\x1b[0m`;
const yellow = (text) => `\x1b[33m${text}\x1b[0m`;
const cyan = (text) => `\x1b[36m${text}\x1b[0m`;

let hasErrors = false;
let hasWarnings = false;

console.log('\n==========================================');
console.log(cyan('Narriv Environment Validation'));
console.log('==========================================\n'));

// Detect environment
const env = process.env.NODE_ENV || 'development';
console.log(`Environment: ${env === 'production' ? green(env) : yellow(env)}\n`);

// Validate JWT_SECRET length
function validateJwtSecret(secret) {
    if (!secret) return { valid: false, error: 'JWT_SECRET is not set' };
    if (secret.length < 32) return { valid: false, error: 'JWT_SECRET must be at least 32 characters' };
    if (secret === 'your-super-secret-jwt-token-here') {
        return { valid: false, error: 'JWT_SECRET is using default value - CHANGE IT!' };
    }
    return { valid: true };
}

// Check backend variables
console.log(cyan('Backend Environment Variables:'));
console.log('-----------------------------------');

for (const varName of requiredBackendVars) {
    const value = process.env[varName];

    if (!value) {
        console.log(`  ${red('✗')} ${varName}: ${red('NOT SET')}`);
        hasErrors = true;
    } else if (varName === 'JWT_SECRET') {
        const validation = validateJwtSecret(value);
        if (validation.valid) {
            console.log(`  ${green('✓')} ${varName}: ${green('Set')} (${value.length} chars)`);
        } else {
            console.log(`  ${red('✗')} ${varName}: ${red(validation.error)}`);
            hasErrors = true;
        }
    } else if (varName === 'SUPABASE_ANON_KEY' || varName === 'SUPABASE_SERVICE_KEY') {
        if (process.env.SUPABASE_ANON_KEY === process.env.SUPABASE_SERVICE_KEY) {
            console.log(`  ${red('✗')} ${varName}: ${red('ANON_KEY cannot equal SERVICE_KEY!')}`);
            hasErrors = true;
        } else {
            console.log(`  ${green('✓')} ${varName}: ${green('Set')}`);
        }
    } else if (varName === 'EXPOSE_RESET_SECRETS') {
        if (value.toLowerCase() === 'true') {
            console.log(`  ${red('✗')} ${varName}: ${red('MUST NOT BE TRUE!')}`);
            hasErrors = true;
        } else {
            console.log(`  ${green('✓')} ${varName}: ${value || '(not set - CORRECT)'}`);
        }
    } else {
        console.log(`  ${green('✓')} ${varName}: ${green('Set')}`);
    }
}

// Check frontend variables
console.log('\n' + cyan('Frontend Environment Variables:'));
console.log('-----------------------------------');

for (const varName of requiredFrontendVars) {
    const value = process.env[varName];

    if (!value) {
        console.log(`  ${red('✗')} ${varName}: ${red('NOT SET')}`);
        hasErrors = true;
    } else if (varName.startsWith('NEXT_PUBLIC_') && value.includes('localhost')) {
        if (env === 'production') {
            console.log(`  ${red('✗')} ${varName}: ${red('Contains localhost - not allowed in production!')}`);
            hasErrors = true;
        } else {
            console.log(`  ${yellow('⚠')} ${varName}: ${yellow('Contains localhost')}`);
            hasWarnings = true;
        }
    } else {
        console.log(`  ${green('✓')} ${varName}: ${green('Set')}`);
    }
}

// Check optional variables
console.log('\n' + cyan('Optional Variables (recommendations):'));
console.log('-----------------------------------');

for (const varName of optionalVars) {
    const value = process.env[varName];

    if (!value) {
        console.log(`  ${yellow('○')} ${varName}: ${yellow('Not set (optional)')}`);
    } else {
        console.log(`  ${green('✓')} ${varName}: Set`);
    }
}

// Security checks
console.log('\n' + cyan('Security Checks:'));
console.log('-----------------------------------');

// Check for dangerous defaults
const dangerousDefaults = [
    { pattern: 'placeholder', file: 'supabase.js' },
    { pattern: 'your-project', file: 'environment' },
];

if (env === 'production') {
    if (!process.env.NODE_ENV) {
        console.log(`  ${red('✗')} NODE_ENV not set - defaults to development!`);
        hasErrors = true;
    } else {
        console.log(`  ${green('✓')} NODE_ENV: ${process.env.NODE_ENV}`);
    }

    // Check CORS origins
    if (!process.env.CORS_ORIGINS) {
        console.log(`  ${yellow('⚠')} CORS_ORIGINS not set - using defaults`);
        hasWarnings = true;
    } else if (process.env.CORS_ORIGINS.includes('vercel.app') && !process.env.ALLOW_VERCEL_PREVIEW) {
        console.log(`  ${yellow('⚠')} Vercel preview domains allowed - disable in production`);
        hasWarnings = true;
    }

    // Check rate limiter
    if (!process.env.REDIS_URL) {
        console.log(`  ${yellow('⚠')} REDIS_URL not set - using in-memory rate limiter`);
        hasWarnings = true;
    }
}

// Final summary
console.log('\n==========================================');
if (hasErrors) {
    console.log(red('VALIDATION FAILED - Fix errors before deployment'));
    console.log('==========================================\n');
    process.exit(1);
} else if (hasWarnings) {
    console.log(yellow('VALIDATION PASSED WITH WARNINGS'));
    console.log('==========================================\n');
    console.log(yellow('Review warnings above before proceeding.\n'));
    process.exit(0);
} else {
    console.log(green('VALIDATION PASSED'));
    console.log('==========================================\n');
    console.log(green('All environment variables are correctly configured!\n'));
    process.exit(0);
}
