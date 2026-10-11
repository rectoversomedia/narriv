import { createRequire } from "node:module";
const require = createRequire(new URL("../../backend/package.json", import.meta.url));
const jwt = require("jsonwebtoken");
export const SANDBOX_JWT_SECRET = "sandbox-only-secret";
export const tokenFor = (id) => jwt.sign({ id, email: `${id}@sandbox.test` }, SANDBOX_JWT_SECRET, { expiresIn: "2h" });
