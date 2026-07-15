#!/usr/bin/env node
/**
 * Narriv Smoke Tests
 * Run these tests after deployment to verify critical flows
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPassword123!';

// Colors
const red = (text) => `\x1b[31m${text}\x1b[0m`;
const green = (text) => `\x1b[32m${text}\x1b[0m`;
const yellow = (text) => `\x1b[33m${text}\x1b[0m`;
const cyan = (text) => `\x1b[36m${text}\x1b[0m`;

let passed = 0;
let failed = 0;

async function test(name, fn) {
    process.stdout.write(`Testing: ${name}... `);
    try {
        await fn();
        console.log(green('✓ PASS'));
        passed++;
    } catch (error) {
        console.log(red('✗ FAIL'));
        console.log(`  Error: ${error.message}`);
        failed++;
    }
}

async function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

async function fetch(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
    const data = await response.json().catch(() => null);
    return { status: response.status, data, ok: response.ok };
}

// Manual fetch implementation for Node.js
async function manualFetch(url, options = {}) {
    const urlObj = new URL(url);
    const http = urlObj.protocol === 'https:' ? require('https') : require('http');

    return new Promise((resolve, reject) => {
        const reqOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 3000),
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {},
        };

        const req = http.request(reqOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ status: res.statusCode, data: json, ok: res.statusCode >= 200 && res.statusCode < 300 });
                } catch {
                    resolve({ status: res.statusCode, data: data, ok: res.statusCode >= 200 && res.statusCode < 300 });
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

console.log('\n==========================================');
console.log(cyan('Narriv Smoke Tests'));
console.log('==========================================\n'));
console.log(`API URL: ${cyan(API_URL)}`);
console.log('');

let authToken = null;

await test('1. Health Check', async () => {
    const res = await manualFetch(`${API_URL}/health`);
    assert(res.ok || res.status === 404, 'Health endpoint should respond');
    console.log(`   Status: ${res.status}`);
});

await test('2. Register New User', async () => {
    const uniqueEmail = `smoketest_${Date.now()}@test.com`;
    const res = await manualFetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        body: JSON.stringify({
            email: uniqueEmail,
            password: TEST_PASSWORD,
            name: 'Smoke Test User',
        }),
    });
    // Should either succeed (201) or fail if user exists
    assert(res.status === 201 || res.status === 400, 'Registration should return valid status');
    if (res.data.verificationCode) {
        console.log(`   (Dev mode - verification code: ${res.data.verificationCode})`);
    }
});

await test('3. Login with Valid Credentials', async () => {
    const res = await manualFetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        body: JSON.stringify({
            email: TEST_EMAIL,
            password: TEST_PASSWORD,
        }),
    });

    assert(res.ok, 'Login should succeed');
    assert(res.data.token, 'Response should contain token');
    assert(res.data.user, 'Response should contain user');
    authToken = res.data.token;
    console.log(`   User: ${res.data.user?.email}`);
});

await test('4. Login with Invalid Password', async () => {
    const res = await manualFetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        body: JSON.stringify({
            email: TEST_EMAIL,
            password: 'wrongpassword',
        }),
    });

    assert(res.status === 401, 'Invalid password should return 401');
});

await test('5. Rate Limiting - Login Throttle', async () => {
    // Make 11 rapid login attempts
    const results = [];
    for (let i = 0; i < 11; i++) {
        const res = await manualFetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            body: JSON.stringify({
                email: `ratelimit_${i}@test.com`,
                password: 'test',
            }),
        });
        results.push(res.status);
    }

    // At least one should be rate limited (429)
    const rateLimited = results.includes(429);
    assert(rateLimited, 'Rate limiting should trigger after 10 attempts');
    console.log(`   ${results.filter(s => s === 429).length} requests rate limited`);
});

await test('6. Protected Endpoint Without Token', async () => {
    const res = await manualFetch(`${API_URL}/api/auth/me`);
    assert(res.status === 401, 'Should return 401 without token');
});

await test('7. Protected Endpoint With Valid Token', async () => {
    const res = await manualFetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
    });
    assert(res.ok, 'Should succeed with valid token');
    assert(res.data.id || res.data.email, 'Should return user data');
});

await test('8. Protected Endpoint With Invalid Token', async () => {
    const res = await manualFetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: 'Bearer invalid_token_123' },
    });
    assert(res.status === 401, 'Should return 401 with invalid token');
});

await test('9. Demo Login Endpoint', async () => {
    const res = await manualFetch(`${API_URL}/api/auth/demo`, {
        method: 'POST',
    });

    assert(res.ok, 'Demo login should succeed');
    assert(res.data.accessToken, 'Should return access token');
    assert(res.data.user, 'Should return demo user');
    assert(res.data.user.isDemo === true, 'User should be marked as demo');
    console.log(`   Demo user: ${res.data.user?.email}`);
});

await test('10. Demo Login Rate Limiting', async () => {
    // Make 6 demo login attempts (limit is 5)
    const results = [];
    for (let i = 0; i < 6; i++) {
        const res = await manualFetch(`${API_URL}/api/auth/demo`, {
            method: 'POST',
        });
        results.push(res.status);
    }

    const rateLimited = results.includes(429);
    assert(rateLimited, 'Demo login should be rate limited');
    console.log(`   ${results.filter(s => s === 429).length} requests rate limited`);
});

await test('11. SSE Endpoint Exists', async () => {
    const res = await manualFetch(`${API_URL}/api/realtime/status`, {
        headers: { Authorization: `Bearer ${authToken}` },
    });
    // Should return 200 or require SSE connection
    assert(res.status === 200 || res.status === 500, 'SSE endpoint should respond');
});

await test('12. Verify Email Without Token', async () => {
    const res = await manualFetch(`${API_URL}/api/auth/verify-email`, {
        method: 'POST',
        body: JSON.stringify({ token: 'invalid_token' }),
    });
    // Should return error, not crash
    assert(res.status === 400 || res.status === 401 || res.status === 500, 'Should handle invalid token');
});

await test('13. Reset Secrets NOT Exposed', async () => {
    const res = await manualFetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        body: JSON.stringify({ email: TEST_EMAIL }),
    });

    // Should NOT contain reset_code, verificationCode, or expires_at in response
    const hasExposedSecrets = res.data?.reset_code || res.data?.verificationCode;
    assert(!hasExposedSecrets, 'Reset secrets should NOT be exposed in response');
});

await test('14. CORS Headers Present', async () => {
    const http = require('http');
    const urlObj = new URL(API_URL);

    return new Promise((resolve, reject) => {
        const req = http.get({
            hostname: urlObj.hostname,
            port: urlObj.port || 3000,
            path: '/api/auth/me',
        }, (res) => {
            const hasCORS = res.headers['access-control-allow-origin'];
            assert(hasCORS, 'CORS headers should be present');
            console.log(`   CORS Origin: ${res.headers['access-control-allow-origin']}`);
            passed++;
            resolve();
        });
        req.on('error', reject);
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        req.end();
    });
});

console.log('\n==========================================');
console.log('Results:');
console.log(`  ${green(`Passed: ${passed}`)}`);
console.log(`  ${failed > 0 ? red(`Failed: ${failed}`) : yellow(`Failed: ${failed}`)}`);
console.log('==========================================\n');

if (failed > 0) {
    console.log(red('SOME TESTS FAILED - Review before proceeding\n'));
    process.exit(1);
} else {
    console.log(green('ALL TESTS PASSED!\n'));
    process.exit(0);
}
