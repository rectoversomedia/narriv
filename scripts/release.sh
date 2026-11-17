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

# Both projects are built on this machine and only the finished output is uploaded (--prebuilt), so a release uses
# none of Vercel's paid build minutes. Both set their Root Directory (backend / frontend) in Vercel, so both build
# from the repo root; each pull refreshes .vercel/ with that project's settings and production env first.
ship() {
  VERCEL_ORG_ID=$ORG VERCEL_PROJECT_ID=$1 $V pull --yes --environment=production
  # Sensitive variables come down as the literal text "[SENSITIVE]". Left in, that placeholder overrides the real
  # public values in frontend/.env.production at build time (NEXT_PUBLIC_API_URL became "[SENSITIVE]" and sign-in
  # posted to the app's own domain). Drop them: secrets are read at runtime on Vercel, never from this file.
  sed -i '' '/="\[SENSITIVE\]"/d' .vercel/.env.production.local
  if grep -q '\[SENSITIVE\]' .vercel/.env.production.local; then echo "sensitive placeholders left in .vercel/.env.production.local" >&2; exit 1; fi
  VERCEL_ORG_ID=$ORG VERCEL_PROJECT_ID=$1 $V build --prod
  # The frontend must call the API by its real address; refuse to ship a build that does not.
  if [[ "$1" == "$WEB_PROJECT" ]] && ! grep -rqs "narriv-api.vercel.app" .vercel/output/static; then
    echo "frontend build does not contain the API address; not deploying" >&2; exit 1
  fi
  VERCEL_ORG_ID=$ORG VERCEL_PROJECT_ID=$1 $V deploy --prebuilt --prod --yes
}

echo "== deploy backend (narriv-api)"
ship $API_PROJECT
echo "== deploy frontend"
ship $WEB_PROJECT || echo "(an 'Not authorized' line after a successful deploy is the apex alias; check below)"

echo "== verify"
curl -fsS https://narriv-api.vercel.app/health && echo
curl -fsS -o /dev/null -w "www.narriv.digital/login → %{http_code}\n" https://www.narriv.digital/login
