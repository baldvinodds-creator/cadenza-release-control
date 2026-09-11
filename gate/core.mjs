import { createRequire } from "node:module"; const require = createRequire(import.meta.url);

// infrastructure/release-custody/owner-gate/core.mjs
import { createHash } from "node:crypto";

// scripts/lib/release-custody-revocations.mjs
var RETIRED_RELEASE_SIGNERS = Object.freeze([
  "4c35b68005859dfaf5fe4d6d490210bfa4932448caf5513481dc0f53ff480e15",
  "4d27c948719d3a9c439a86f0728ce441374e148bb7ee2c1373546ecf2e004775"
]);
function assertReleaseSignerNotRetired(fingerprint) {
  if (RETIRED_RELEASE_SIGNERS.includes(fingerprint)) {
    throw new Error("Release signer retired after custody incident; independently protected replacement enrollment is required");
  }
}

// infrastructure/release-custody/owner-gate/core.mjs
var digest = (value) => createHash("sha256").update(value).digest("hex");
var requireThat = (condition, message) => {
  if (!condition) throw new Error(message);
};
var hex = (value, size) => typeof value === "string" && new RegExp(`^[a-f0-9]{${size}}$`).test(value);
var fields = ["version", "mode", "repository", "releaseSha", "projectId", "teamId", "environment", "baselineSha", "baselineDeploymentId", "ledgerSha256", "manifestSha256", "ciRunId", "policyVersion", "issuedAt", "expiresAt", "nonce"];
function parseBundle(raw, policy, now) {
  requireThat(typeof raw === "string" && Buffer.byteLength(raw) <= 16384, "Invalid bundle size");
  const bundle = JSON.parse(raw);
  const wireFields = bundle?.version === 2 ? [...fields, "artifactSha256"] : fields;
  requireThat(bundle && Object.keys(bundle).sort().join(",") === [...wireFields].sort().join(","), "Unexpected bundle fields");
  requireThat(JSON.stringify(Object.fromEntries(wireFields.map((key) => [key, bundle[key]]))) === raw, "Noncanonical bundle");
  requireThat([1, 2].includes(bundle.version) && bundle.mode === (policy.governanceModel === "AUTOMATED_OWNER_POLICY" ? "AUTOMATED_MIGRATION_FREE" : "OWNER_APPROVED_MIGRATION_FREE"), "Unsupported authorization mode");
  if (bundle.version === 2) requireThat(hex(bundle.artifactSha256, 64), "Exact prebuilt artifact digest required");
  for (const key of ["repository", "projectId", "teamId", "environment", "policyVersion"]) {
    requireThat(bundle[key] === policy[key], `Wrong ${key}`);
  }
  requireThat(bundle.environment === "production", "Production target required");
  requireThat(hex(bundle.releaseSha, 40) && hex(bundle.baselineSha, 40), "Exact source SHA required");
  requireThat(hex(bundle.ledgerSha256, 64) && hex(bundle.manifestSha256, 64), "Migration digests required");
  requireThat(typeof bundle.baselineDeploymentId === "string" && /^dpl_[a-zA-Z0-9]+$/.test(bundle.baselineDeploymentId), "Baseline deployment required");
  requireThat(Number.isSafeInteger(bundle.ciRunId) && bundle.ciRunId > 0, "CI run required");
  requireThat(hex(bundle.nonce, 64), "Release nonce required");
  const issued = Date.parse(bundle.issuedAt), expires = Date.parse(bundle.expiresAt);
  requireThat(Number.isFinite(issued) && Number.isFinite(expires) && new Date(issued).toISOString() === bundle.issuedAt && new Date(expires).toISOString() === bundle.expiresAt, "Canonical timestamps required");
  requireThat(issued <= now && now < expires && expires - issued > 0 && expires - issued <= 15 * 6e4, "Approval expired or invalid window");
  return Object.freeze(bundle);
}
function assertReleaseTechnicalChecks(bundle, evidence, policy, now) {
  requireThat(evidence && Number.isFinite(evidence.observedAt) && evidence.observedAt <= now && now - evidence.observedAt <= 3e4, "Fresh independent evidence required");
  for (const field of ["releaseSha", "projectId", "teamId", "environment", "baselineSha", "baselineDeploymentId", "ledgerSha256", "manifestSha256", "ciRunId"]) {
    requireThat(evidence[field] === bundle[field], `Technical evidence mismatch: ${field}`);
  }
  requireThat(evidence.mainSha === bundle.releaseSha, "Candidate is not current intended main");
  requireThat(evidence.ciConclusion === "success" && evidence.ciEvent === "push" && evidence.ciBranch === "main", "Exact-main CI must pass");
  requireThat(evidence.workflowSha256 === policy.workflowSha256, "Unreviewed CI workflow");
  requireThat(Array.isArray(evidence.checks) && policy.requiredChecks.every((name) => evidence.checks.filter((check) => check.name === name).length === 1 && evidence.checks.find((check) => check.name === name).conclusion === "success"), "Required tests must pass");
  requireThat(evidence.pendingMigrations === 0 && evidence.failedMigrations === 0 && evidence.schemaMatches === true && evidence.runtimePermissionsValid === true, "Migration/runtime integrity failed");
  requireThat(evidence.health === "healthy" && evidence.recoveryEvidenceValid === true, "Health or recovery evidence failed");
}
function assertTechnicalEvidence(bundle, evidence, policy, now) {
  assertReleaseTechnicalChecks(bundle, evidence, policy, now);
  requireThat(hex(evidence.technicalSignerFingerprint, 64), "Technical identity required");
  assertReleaseSignerNotRetired(evidence.technicalSignerFingerprint);
  requireThat(evidence.technicalSignerFingerprint === policy.technicalSignerFingerprint, "Unenrolled technical identity");
}
export {
  assertReleaseTechnicalChecks,
  assertTechnicalEvidence,
  digest,
  parseBundle
};
