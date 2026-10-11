// Sandbox end-to-end tests: real frontend + real backend code, in-memory data,
// stubbed external LLM. Nothing here reads or writes production.
import { defineConfig, devices } from "@playwright/test";

const FRONTEND_PORT = Number(process.env.SANDBOX_FRONTEND_PORT || 3101);
const BACKEND_PORT = Number(process.env.SANDBOX_BACKEND_PORT || 4100);
const STUB_PORT = Number(process.env.SANDBOX_STUB_PORT || 4199);
const clean = { PATH: process.env.PATH, HOME: process.env.HOME };

export default defineConfig({
  testDir: "./tests",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1, // one shared in-memory database
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${FRONTEND_PORT}`, trace: "retain-on-failure", ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } },
  webServer: [
    {
      command: `node server/stub-openai.mjs`,
      url: `http://localhost:${STUB_PORT}/health`,
      reuseExistingServer: false,
      timeout: 30_000,
      env: { ...clean, STUB_PORT: String(STUB_PORT) },
    },
    {
      // cwd is server/ so dotenv finds no .env file; env holds sandbox values only.
      command: `node --import ./register.mjs serve.mjs`,
      cwd: "./server",
      url: `http://localhost:${BACKEND_PORT}/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        ...clean,
        NODE_ENV: "development",
        PORT: String(BACKEND_PORT),
        JWT_SECRET: "sandbox-only-secret",
        JWT_REFRESH_SECRET: "sandbox-only-refresh",
        CORS_ORIGINS: `http://localhost:${FRONTEND_PORT}`,
        SUPABASE_URL: "http://127.0.0.1:9",
        SUPABASE_SERVICE_KEY: "sandbox",
        SUPABASE_ANON_KEY: "sandbox",
        OPENAI_API_KEY: "sandbox-stub-key",
        OPENAI_BASE_URL: `http://localhost:${STUB_PORT}/v1`,
        ADMIN_SECRET: "sandbox-admin-secret", // so admin routes answer 401 (not "disabled") to workspace users
      },
    },
    {
      command: `../node_modules/.bin/next dev -p ${FRONTEND_PORT}`,
      cwd: "../frontend",
      url: `http://localhost:${FRONTEND_PORT}/login`,
      reuseExistingServer: false,
      timeout: 180_000,
      env: { ...clean, NEXT_PUBLIC_API_URL: `http://localhost:${BACKEND_PORT}`, JWT_SECRET: "sandbox-only-secret", NEXT_TELEMETRY_DISABLED: "1" },
    },
  ],
});
