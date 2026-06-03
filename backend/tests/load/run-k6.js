import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const profile = process.argv[2] || process.env.PROFILE || 'smoke';
const scriptPath = 'tests/load/api.k6.js';

const candidates = [
  process.env.K6_BIN,
  'k6',
  'C:\\Program Files\\k6\\k6.exe',
  'C:\\Program Files\\GrafanaLabs\\k6\\k6.exe',
].filter(Boolean);

function canTry(candidate) {
  if (candidate === 'k6') return true;
  return existsSync(candidate);
}

for (const candidate of candidates) {
  if (!canTry(candidate)) continue;

  const result = spawnSync(
    candidate,
    ['run', '-e', `PROFILE=${profile}`, scriptPath],
    { stdio: 'inherit', shell: false }
  );

  if (result.error?.code === 'ENOENT') continue;
  if (result.error) {
    console.error(`Failed to run k6 via ${candidate}: ${result.error.message}`);
    process.exit(1);
  }

  process.exit(result.status ?? 0);
}

console.error('k6 executable was not found. Install k6 or set K6_BIN to the full k6.exe path.');
console.error('Example: $env:K6_BIN="C:\\Program Files\\k6\\k6.exe"; npm run load:smoke');
process.exit(1);
