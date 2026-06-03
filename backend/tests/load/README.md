# Backend Load Tests

These k6 scripts exercise live backend HTTP endpoints. They require the backend server to be running.

## Install k6

Windows:

```powershell
winget install k6
```

## Run

From `backend/`:

```powershell
npm run load:smoke
```

The npm scripts use `tests/load/run-k6.js`, which looks for `k6` in `PATH`, `K6_BIN`, and common Windows install locations such as `C:\Program Files\k6\k6.exe`.

If needed, set the binary path explicitly:

```powershell
$env:K6_BIN="C:\Program Files\k6\k6.exe"; npm run load:smoke
```

For protected endpoints, provide either an access token or test login credentials:

```powershell
$env:ACCESS_TOKEN="<jwt>"; npm run load:baseline
```

```powershell
$env:LOAD_TEST_EMAIL="test@example.com"; $env:LOAD_TEST_PASSWORD="Password123!"; npm run load:baseline
```

Optional variables:

- `BASE_URL`, default `http://localhost:3000`
- `WORKSPACE_ID`, scopes workspace-aware reads
- `PROFILE`, one of `smoke`, `baseline`, `stress`

## Profiles

- `load:smoke`: quick 30s reachability and threshold check
- `load:baseline`: 20 VUs for steady protected-read baseline
- `load:stress`: ramps to 150 VUs to expose saturation/failure behavior

Do not run `load:stress` against shared production infrastructure without approval.
