#!/usr/bin/env node
/**
 * Narriv Security Verification Script
 * Verifies all security fixes are in place
 */

const fs = require('fs');
const path = require('path');

const red = (text) => `\x1b[31m${text}\x1b[0m`;
const green = (text) => `\x1b[32m${text}\x1b[0m`;
const yellow = (text) => `\x1b[33m${text}\x1b[0m`;
const cyan = (text) => `\x1b[36m${text}\x1b[0m`;

let passed = 0;
let failed = 0;
let warnings = 0;

function check(name, condition, fix = null) {
    process.stdout.write(`Checking: ${name}... `);
    if (condition) {
        console.log(green('✓ PASS'));
        passed++;
    } else {
        console.log(red('✗ FAIL'));
        if (fix) {
            console.log(`   ${yellow('Fix:')} ${fix}`);
        }
        failed++;
    }
}

function checkFile(filePath, searchString, shouldExist = true) {
    const exists = fs.existsSync(filePath);
    if (!exists) {
        console.log(`  ${red('✗')} File not found: ${filePath}`);
        failed++;
        return false;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const found = content.includes(searchString);

    if (shouldExist === found) {
        return true;
    }
    return !shouldExist;
}

function checkPattern(filePath, pattern, description) {
    const exists = fs.existsSync(filePath);
    if (!exists) {
        console.log(`  ${red('✗')} File not found: ${filePath}`);
        failed++;
        return false;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const found = content.match(pattern);

    if (found) {
        console.log(`  ${yellow('⚠')} Found: ${description}`);
        warnings++;
        return true;
    }
    return true;
}

console.log('\n==========================================');
console.log(cyan('Narriv Security Verification'));
console.log('==========================================\n');

// Go up from scripts/ to project root
const projectRoot = path.join(__dirname, '..');
const backendDir = path.join(projectRoot, 'backend');
const frontendDir = path.join(projectRoot, 'frontend');
const migrationsDir = path.join(projectRoot, 'supabase', 'migrations');

console.log(cyan('Project Root:'), projectRoot);
console.log('');

console.log(cyan('1. Backend Security Checks'));
console.log('-----------------------------------');

// Check email verification bypass removed
const authControllerPath = path.join(backendDir, 'src/modules/auth/auth.controller.js');
if (fs.existsSync(authControllerPath)) {
    const authContent = fs.readFileSync(authControllerPath, 'utf-8');

    check(
        'Email verification bypass removed',
        !authContent.includes('isDev') || authContent.includes('SECURITY FIX'),
        'Remove dev bypass for email verification'
    );

    check(
        'Reset secrets not exposed',
        authContent.includes('return false') && authContent.includes('shouldExposeResetSecrets'),
        'shouldExposeResetSecrets() should always return false'
    );
}

// Check Supabase config
const supabasePath = path.join(backendDir, 'src/lib/supabase.js');
if (fs.existsSync(supabasePath)) {
    const supabaseContent = fs.readFileSync(supabasePath, 'utf-8');

    check(
        'Supabase anon key fail-fast',
        supabaseContent.includes('throw new Error') && supabaseContent.includes('SUPABASE_ANON_KEY'),
        'Throw error if SUPABASE_ANON_KEY is not set'
    );

    check(
        'No fallback to service key',
        !supabaseContent.includes('supabaseAnonKey || supabaseServiceKey'),
        'Remove fallback from anon key to service key'
    );
}

// Check rate limiter
const rateLimitPath = path.join(backendDir, 'src/middlewares/rate-limit.js');
if (fs.existsSync(rateLimitPath)) {
    const rateLimitContent = fs.readFileSync(rateLimitPath, 'utf-8');

    check(
        'Rate limiter fails closed',
        rateLimitContent.includes('503') || rateLimitContent.includes('fail closed') || rateLimitContent.includes('RATE_LIMIT_SERVICE_UNAVAILABLE'),
        'Rate limiter should return 503 when unavailable'
    );

    check(
        'No fail-open comment',
        !rateLimitContent.includes('Fail open') || rateLimitContent.includes('SECURITY'),
        'Remove fail-open behavior'
    );
}

// Check auth middleware
const authMiddlewarePath = path.join(backendDir, 'src/middlewares/auth.middleware.js');
if (fs.existsSync(authMiddlewarePath)) {
    const authMiddlewareContent = fs.readFileSync(authMiddlewarePath, 'utf-8');

    check(
        'Query string tokens rejected',
        authMiddlewareContent.includes('query_token_rejected') || authMiddlewareContent.includes('SECURITY FIX'),
        'Remove query string token support'
    );
}

console.log('\n' + cyan('2. Frontend Security Checks'));
console.log('-----------------------------------');

// Check Topbar for SSE token
const topbarPath = path.join(frontendDir, 'components/layout/Topbar.tsx');
if (fs.existsSync(topbarPath)) {
    const topbarContent = fs.readFileSync(topbarPath, 'utf-8');

    check(
        'SSE no token in URL',
        !topbarContent.includes('token=') || topbarContent.includes('withCredentials'),
        'SSE should use cookie auth instead of URL token'
    );
}

// Check demo login
const authShellPath = path.join(frontendDir, 'components/auth/auth-shell.tsx');
if (fs.existsSync(authShellPath)) {
    const authShellContent = fs.readFileSync(authShellPath, 'utf-8');

    check(
        'Demo login requires server auth',
        authShellContent.includes('/api/auth/demo') && authShellContent.includes('fetch'),
        'Demo should call backend endpoint'
    );
}

// Check HTML sanitization
const utilsPath = path.join(frontendDir, 'lib/utils.ts');
if (fs.existsSync(utilsPath)) {
    const utilsContent = fs.readFileSync(utilsPath, 'utf-8');

    check(
        'HTML sanitization exists',
        utilsContent.includes('sanitizeHtml') && utilsContent.includes('replace'),
        'Add sanitizeHtml function'
    );
}

// Check help page uses sanitization
const helpPagePath = path.join(frontendDir, 'app/help/page.tsx');
if (fs.existsSync(helpPagePath)) {
    const helpContent = fs.readFileSync(helpPagePath, 'utf-8');

    check(
        'Help page uses HTML sanitization',
        helpContent.includes('sanitizeHtml') || helpContent.includes('DOMPurify'),
        'Sanitize HTML content before rendering'
    );
}

// Check CSP headers
const nextConfigPath = path.join(frontendDir, 'next.config.ts');
if (fs.existsSync(nextConfigPath)) {
    const nextConfigContent = fs.readFileSync(nextConfigPath, 'utf-8');

    check(
        'CSP header configured',
        nextConfigContent.includes('Content-Security-Policy'),
        'Add Content-Security-Policy header'
    );
}

// Check API client timeout
const apiClientPath = path.join(frontendDir, 'lib/apiClient.ts');
if (fs.existsSync(apiClientPath)) {
    const apiClientContent = fs.readFileSync(apiClientPath, 'utf-8');

    check(
        'API client has timeout',
        apiClientContent.includes('AbortController') || apiClientContent.includes('timeout'),
        'Add request timeout to API client'
    );
}

console.log('\n' + cyan('3. Database Security Checks'));
console.log('-----------------------------------');

// Check RLS migration
const rlsFixPath = path.join(migrationsDir, '003_rls_fix_users_table.sql');
check(
    'RLS fix migration exists',
    fs.existsSync(rlsFixPath),
    'Create migration to fix RLS policies'
);

if (fs.existsSync(rlsFixPath)) {
    const rlsContent = fs.readFileSync(rlsFixPath, 'utf-8');

    check(
        'RLS migration references user_profiles',
        rlsContent.includes('user_profiles') && rlsContent.includes('ENABLE ROW LEVEL SECURITY'),
        'RLS policies should use user_profiles table'
    );
}

// Check indexes migrations
const alertsIndexesPath = path.join(migrationsDir, '007_alerts_performance_indexes.sql');
const coreIndexesPath = path.join(migrationsDir, '009_core_performance_indexes.sql');

check(
    'Alerts performance indexes migration exists',
    fs.existsSync(alertsIndexesPath),
    'Create migration for alerts indexes'
);

check(
    'Core performance indexes migration exists',
    fs.existsSync(coreIndexesPath),
    'Create migration for core table indexes'
);

console.log('\n' + cyan('4. SSE Security Checks'));
console.log('-----------------------------------');

// Check SSE cleanup
const ssePath = path.join(backendDir, 'src/lib/sse.js');
if (fs.existsSync(ssePath)) {
    const sseContent = fs.readFileSync(ssePath, 'utf-8');

    check(
        'SSE cleanup interval exists',
        sseContent.includes('cleanupStaleConnections') && sseContent.includes('setInterval'),
        'Add SSE connection cleanup'
    );

    check(
        'SSE memory stats logging',
        sseContent.includes('sse_memory_stats') || sseContent.includes('totalConnections'),
        'Add memory stats logging'
    );
}

// Check SSE realtime routes
const realtimeRoutesPath = path.join(backendDir, 'src/modules/realtime/realtime.routes.js');
if (fs.existsSync(realtimeRoutesPath)) {
    const realtimeContent = fs.readFileSync(realtimeRoutesPath, 'utf-8');

    check(
        'SSE requires authentication',
        realtimeContent.includes('verifyToken'),
        'SSE endpoint should require authentication'
    );
}

console.log('\n' + cyan('5. Demo Login Security'));
console.log('-----------------------------------');

// Check demo endpoint exists
const authRoutesPath = path.join(backendDir, 'src/modules/auth/auth.routes.js');
if (fs.existsSync(authRoutesPath)) {
    const authRoutesContent = fs.readFileSync(authRoutesPath, 'utf-8');

    check(
        'Demo endpoint registered',
        authRoutesContent.includes('/demo') && authRoutesContent.includes('demo'),
        'Add /api/auth/demo route'
    );
}

if (fs.existsSync(authControllerPath)) {
    const authContent = fs.readFileSync(authControllerPath, 'utf-8');

    check(
        'Demo endpoint has rate limiting',
        authContent.includes('demo') && authContent.includes('rateKey'),
        'Demo endpoint should be rate limited'
    );
}

console.log('\n==========================================');
console.log('Results:');
console.log(`  ${green(`Passed: ${passed}`)}`);
if (warnings > 0) {
    console.log(`  ${yellow(`Warnings: ${warnings}`)}`);
}
if (failed > 0) {
    console.log(`  ${red(`Failed: ${failed}`)}`);
}
console.log('==========================================\n');

if (failed > 0) {
    console.log(red('SECURITY VERIFICATION FAILED'));
    console.log('Review and fix the failed checks before deployment.\n');
    process.exit(1);
} else {
    console.log(green('SECURITY VERIFICATION PASSED'));
    if (warnings > 0) {
        console.log(yellow('Review warnings before proceeding.\n'));
    } else {
        console.log('\n');
    }
    process.exit(0);
}
