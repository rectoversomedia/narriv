#!/usr/bin/env bash
set -e

echo "========================================================"
echo " macOS QA & Browser Automation Migration Setup"
echo " Target Architecture: $(uname -m)"
echo "========================================================"

# 1. Check Node & npm
echo ""
echo "--> Checking Node.js and npm..."
node_ver=$(node -v 2>/dev/null || echo "not found")
npm_ver=$(npm -v 2>/dev/null || echo "not found")
echo "    Node: $node_ver"
echo "    npm:  $npm_ver"

if [ "$node_ver" = "not found" ]; then
  echo "Error: Node.js is required. Please install Node.js."
  exit 1
fi

# 2. Check Google Chrome
echo ""
echo "--> Checking Google Chrome on macOS..."
if [ -d "/Applications/Google Chrome.app" ]; then
  echo "    Google Chrome detected at /Applications/Google Chrome.app"
else
  echo "    Warning: Google Chrome not found in /Applications."
  echo "    You can install it via: brew install --cask google-chrome"
fi

# 3. Install Playwright native browsers (Chromium & WebKit Safari)
echo ""
echo "--> Installing Playwright native browsers for Mac (Chromium & WebKit)..."
npx playwright install --with-deps chromium webkit

echo ""
echo "========================================================"
echo " Setup complete! Your Mac QA Environment is ready."
echo " Available commands:"
echo "   npm run test:e2e          # Run Playwright E2E"
echo "   npm run test:e2e:headed   # Run Playwright with visible browser"
echo "   npm run test:e2e:ui       # Open Playwright UI runner"
echo "   npm run test:e2e:debug    # Step-by-step debugger"
echo "   npm run test:e2e:report   # Show HTML report"
echo "   npm run test:watch        # Watch unit tests"
echo "   npm run audit             # Run Google Lighthouse CI"
echo "   node scripts/cdp-audit.mjs # Run Chrome DevTools Protocol Profiling"
echo "========================================================"
