import { createRequire } from "node:module"; const require = createRequire(import.meta.url);

// infrastructure/release-custody/owner-gate/configuration.mjs
import { gunzipSync } from "node:zlib";

// infrastructure/release-custody/owner-gate/core.mjs
import { createHash } from "node:crypto";

// scripts/lib/release-custody-revocations.mjs
var RETIRED_RELEASE_SIGNERS = Object.freeze([
  "4c35b68005859dfaf5fe4d6d490210bfa4932448caf5513481dc0f53ff480e15",
  "4d27c948719d3a9c439a86f0728ce441374e148bb7ee2c1373546ecf2e004775"
]);

// infrastructure/release-custody/owner-gate/core.mjs
var digest = (value) => createHash("sha256").update(value).digest("hex");

// infrastructure/release-custody/owner-gate/configuration.mjs
function readObserverPolicy(encoded, expectedSha256) {
  if (typeof encoded !== "string" || encoded.length > 65536 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw Error("Invalid observer policy encoding");
  const raw = gunzipSync(Buffer.from(encoded, "base64"), { maxOutputLength: 262144 }).toString("utf8");
  if (digest(raw) !== expectedSha256) throw Error("Observer policy digest differs from enrollment");
  return JSON.parse(raw);
}
export {
  readObserverPolicy
};
