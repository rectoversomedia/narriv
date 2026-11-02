#!/usr/bin/env bash
# release.sh — the ONLY way Narriv reaches Vercel now (git pushes no longer deploy: vercel.json git.deploymentEnabled=false).
# Runs the local gates first, then deploys backend (narriv-api) and frontend to production and checks /health.
#   npm run release            # gates + deploy both
#   npm run release -- --skip-gates
set -euo pipefail
cd "$(dirname "$0")/.."
V=node_modules/.bin/vercel
ORG=team_foB6dX8df6bz7yGUBafyrlcO
API_PROJECT=prj_DThmrfSXajOs9ynI5tcoe6K0xUAJ   # narriv-api  (root: backend)
WEB_PROJECT=prj_b8bqgEPqryI3Sg7TuXa4nSpznnRL   # frontend    (root: frontend); the repo-root .vercel is the stale "narriv"

if [[ "${1:-}" != "--skip-gates" ]]; then
  echo "== gates: backend tests, frontend unit tests, lint + typecheck + build"
  npm run test:backend
  npm run test:frontend-unit
  npm run check:frontend
fi

echo "== deploy backend (narriv-api)"
(cd backend && VERCEL_ORG_ID=$ORG VERCEL_PROJECT_ID=$API_PROJECT ../$V deploy --prod --yes)
echo "== deploy frontend"
VERCEL_ORG_ID=$ORG VERCEL_PROJECT_ID=$WEB_PROJECT $V deploy --prod --yes || echo "(an 'Not authorized' line after a successful deploy is the apex alias; check below)"

echo "== verify"
curl -fsS https://narriv-api.vercel.app/health && echo
curl -fsS -o /dev/null -w "www.narriv.digital/login → %{http_code}\n" https://www.narriv.digital/login
