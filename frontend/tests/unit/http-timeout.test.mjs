import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import ky from "ky";
import { timingOptions, toClientError } from "../../lib/http-timeout.ts";

// Regression: "Run monitoring now" takes ~20-40 s. ky defaults to a 10 s
// timeout unless one is passed per request, so the browser reported
// "Request timed out" while the server completed the run.
function slowServer(delayMs) {
  const server = http.createServer((_req, res) => {
    setTimeout(() => { res.writeHead(200, { "content-type": "application/json" }); res.end('{"status":"completed"}'); }, delayMs);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

test("a request slower than ky's 10 s default succeeds with the caller's timeout", { timeout: 30000 }, async () => {
  const server = await slowServer(11000);
  const url = `http://127.0.0.1:${server.address().port}/`;
  try {
    // Before the fix: no per-request timeout -> ky's default cuts it off at 10 s.
    await assert.rejects(ky.create({ retry: 0 })(url, { throwHttpErrors: false }), (err) => err.name === "TimeoutError");
    // After the fix: the timeout is passed to ky and the response arrives.
    const res = await ky.create({ retry: 0 })(url, timingOptions(30000));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: "completed" });
  } finally {
    server.close();
  }
});

test("a timeout becomes CLIENT_TIMEOUT and other failures NETWORK_ERROR", { timeout: 10000 }, async () => {
  const server = await slowServer(3000);
  const url = `http://127.0.0.1:${server.address().port}/`;
  try {
    const err = await ky.create({ retry: 0 })(url, timingOptions(500)).then(() => null, (e) => toClientError(e, 500));
    assert.equal(err.code, "CLIENT_TIMEOUT");
    assert.equal(err.status, 0);
    assert.match(err.message, /within 1 seconds|within 0 seconds/);
  } finally {
    server.close();
  }
  assert.equal(toClientError(new TypeError("fetch failed"), 1000).code, "NETWORK_ERROR");
});
