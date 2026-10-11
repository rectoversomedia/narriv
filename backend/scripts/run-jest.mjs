// Runs Jest from wherever npm installed it (backend/node_modules in CI's
// standalone install, or the hoisted root node_modules in the monorepo).
// jest's "exports" hide bin/, so resolve the package entry and walk to it.
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";
const require = createRequire(import.meta.url);
let dir = path.dirname(require.resolve("jest"));
while (!fs.existsSync(path.join(dir, "package.json"))) dir = path.dirname(dir);
await import(pathToFileURL(path.join(dir, "bin", "jest.js")).href);
