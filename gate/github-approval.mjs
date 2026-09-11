import { createRequire } from "node:module"; const require = createRequire(import.meta.url);

// infrastructure/release-custody/owner-gate/core.mjs
import { createHash } from "node:crypto";

// scripts/lib/release-custody-revocations.mjs
var RETIRED_RELEASE_SIGNERS = Object.freeze([
  "4c35b68005859dfaf5fe4d6d490210bfa4932448caf5513481dc0f53ff480e15",
  "4d27c948719d3a9c439a86f0728ce441374e148bb7ee2c1373546ecf2e004775"
]);

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

// infrastructure/release-custody/owner-gate/github-approval.mjs
var requireThat2 = (value, message) => {
  if (!value) throw new Error(message);
};
function createGithubReleaseRunReader({ policy: sourcePolicy, readJson, now = Date.now }) {
  const policy = structuredClone(sourcePolicy);
  requireThat2(/^[\w.-]+\/[\w.-]+$/.test(policy.controlRepository) && policy.controlRepository !== policy.repository, "Separate control repository required");
  requireThat2(/^[a-f0-9]{40}$/.test(policy.gateSha), "Reviewed gate SHA required");
  requireThat2(Number.isSafeInteger(policy.ownerId) && policy.ownerId > 0 && Number.isSafeInteger(policy.operatorId) && policy.operatorId > 0 && policy.operatorId !== policy.ownerId, "Distinct owner and automation identities required");
  requireThat2(Number.isSafeInteger(policy.environmentId) && policy.environmentId > 0 && /^[\w-]+$/.test(policy.approvalEnvironment), "Pinned approval environment required");
  requireThat2(policy.workflowPath === ".github/workflows/owner-release.yml", "Pinned control workflow required");
  const automated = policy.governanceModel === "AUTOMATED_OWNER_POLICY";
  const root = `/repos/${policy.controlRepository}`;
  return async ({ runId, rawBundle, expectedBundleSha256 }) => {
    requireThat2(Number.isSafeInteger(runId) && runId > 0, "Exact run required");
    const bundle = parseBundle(rawBundle, policy, now());
    requireThat2(!automated || bundle.version === 2, "Automated release requires exact artifact binding");
    requireThat2(digest(rawBundle) === expectedBundleSha256, "Modified bundle");
    const [run, environment, reviews] = await Promise.all([
      readJson(`${root}/actions/runs/${runId}`),
      readJson(`${root}/environments/${policy.approvalEnvironment}`),
      automated ? Promise.resolve([]) : readJson(`${root}/actions/runs/${runId}/approvals`)
    ]);
    const checkRun = (value) => {
      requireThat2(value?.id === runId && value.run_attempt === 1, "Rerun/replay forbidden");
      requireThat2(value.repository?.full_name === policy.controlRepository && value.head_repository?.full_name === policy.controlRepository && value.head_sha === policy.gateSha && value.head_branch === "main" && value.path === policy.workflowPath, "Wrong control source");
      requireThat2(value.event === "workflow_dispatch" && value.status === "in_progress" && value.conclusion === null, "Invalid release execution");
      const actorAllowed = value.actor?.id === policy.operatorId && value.actor.type === "Bot" || automated && value.actor?.id === policy.ownerId && value.actor.type === "User";
      requireThat2(actorAllowed && value.triggering_actor?.id === value.actor.id && value.triggering_actor?.type === value.actor.type, "Unapproved execution identity");
      const created = Date.parse(value.created_at);
      requireThat2(Number.isFinite(created) && created + 1e3 > Date.parse(bundle.issuedAt) && created < Date.parse(bundle.expiresAt) && created <= now() + 5e3, "Run approval window invalid");
      requireThat2(value.display_title === `Release ${bundle.releaseSha} / ${expectedBundleSha256}`, "Approval display is not bound to bundle");
    };
    checkRun(run);
    requireThat2(environment?.id === policy.environmentId && environment.name === policy.approvalEnvironment && environment.can_admins_bypass === false, "Environment bypass/policy mismatch");
    requireThat2(environment.deployment_branch_policy?.protected_branches === true && environment.deployment_branch_policy.custom_branch_policies === false, "Protected control branch required");
    const rules = environment.protection_rules?.filter((rule) => rule.type === "required_reviewers");
    if (automated) {
      requireThat2(rules?.length === 0, "Automated environment policy differs from enrollment");
    } else {
      requireThat2(rules?.length === 1 && rules[0].prevent_self_review === true && rules[0].reviewers?.length === 1 && rules[0].reviewers[0].type === "User" && rules[0].reviewers[0].reviewer?.id === policy.ownerId, "Sole owner review required");
      requireThat2(Array.isArray(reviews) && reviews.length === 1, "Exactly one owner decision required");
      const review = reviews[0];
      requireThat2(review.state === "approved" && review.user?.id === policy.ownerId && review.user.type === "User" && review.environments?.length === 1 && review.environments[0].id === policy.environmentId && review.environments[0].name === policy.approvalEnvironment, "Owner approval absent or wrong target");
    }
    checkRun(await readJson(`${root}/actions/runs/${runId}`));
    parseBundle(rawBundle, policy, now());
    return Object.freeze({ ...automated ? { authorizationKind: "AUTOMATED_OWNER_POLICY", policyVersion: policy.policyVersion, humanReleaseReview: false } : {}, provider: "github", controlRepository: policy.controlRepository, gateSha: policy.gateSha, runId, runAttempt: 1, ownerId: policy.ownerId, environmentId: policy.environmentId, releaseSha: bundle.releaseSha, bundleSha256: expectedBundleSha256, expiresAt: bundle.expiresAt, consumptionKey: `${policy.controlRepository}:${runId}:1` });
  };
}
var createGithubApprovalReader = createGithubReleaseRunReader;
export {
  createGithubApprovalReader,
  createGithubReleaseRunReader
};
