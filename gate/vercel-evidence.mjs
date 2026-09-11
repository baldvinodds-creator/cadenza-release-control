import { createRequire } from "node:module"; const require = createRequire(import.meta.url);

// scripts/lib/production-deployment-verification.mjs
var ProductionDeploymentVerificationError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "ProductionDeploymentVerificationError";
  }
};
function fail(message) {
  throw new ProductionDeploymentVerificationError(message);
}
function parseJson(raw, context) {
  if (typeof raw !== "string" || raw.length === 0) fail(`${context} must be exact JSON`);
  try {
    return JSON.parse(raw);
  } catch {
    fail(`${context} must be exact JSON`);
  }
}
function parseTrustedVercelApiJson(raw, context = "Vercel deployment API response") {
  const value = parseJson(raw, context);
  deploymentId(value, context);
  if (value.projectId === void 0 || value.teamId === void 0 && value.team?.id === void 0 || value.gitSource?.sha === void 0 && value.meta?.githubCommitSha === void 0) {
    fail(`${context} omits project, team, or release SHA and is not trusted deployment metadata`);
  }
  return value;
}
function requiredString(value, context) {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim()) {
    fail(`${context} must be a non-empty exact string`);
  }
  return value;
}
function deploymentId(deployment, context) {
  if (!deployment || typeof deployment !== "object" || Array.isArray(deployment)) {
    fail(`${context} must be trusted Vercel deployment metadata`);
  }
  if (deployment.id !== void 0 && deployment.uid !== void 0 && deployment.id !== deployment.uid) {
    fail(`${context} contains conflicting deployment IDs`);
  }
  const id = deployment.id ?? deployment.uid;
  if (typeof id !== "string" || !/^dpl_[A-Za-z0-9]+$/.test(id)) {
    fail(`${context} deployment ID is invalid`);
  }
  return id;
}
function deploymentUrl(deployment, context) {
  const url = deployment?.url;
  if (typeof url !== "string" || url.length === 0 || url !== url.trim()) {
    fail(`${context} immutable deployment URL is invalid`);
  }
  let parsed;
  try {
    parsed = new URL(`https://${url}`);
  } catch {
    fail(`${context} immutable deployment URL is invalid`);
  }
  if (parsed.hostname !== url || parsed.protocol !== "https:" || !parsed.hostname.endsWith(".vercel.app")) {
    fail(`${context} immutable deployment URL must be an exact Vercel hostname without a scheme, path, query, or fragment`);
  }
  return url;
}
function deploymentTeamId(deployment, context) {
  const nestedTeamId = deployment?.team?.id;
  if (deployment?.teamId !== void 0 && nestedTeamId !== void 0 && deployment.teamId !== nestedTeamId) {
    fail(`${context} contains conflicting team IDs`);
  }
  return deployment?.teamId ?? nestedTeamId;
}
function deploymentSha(deployment, context) {
  const gitSourceSha = deployment?.gitSource?.sha;
  const metadataSha = deployment?.meta?.githubCommitSha;
  if (gitSourceSha !== void 0 && metadataSha !== void 0 && gitSourceSha !== metadataSha) {
    fail(`${context} contains conflicting release SHAs`);
  }
  return gitSourceSha ?? metadataSha;
}
function verifyExactDeployment({
  deployment,
  context,
  expectedDeploymentId,
  expectedDeploymentUrl,
  expectedProjectId,
  expectedTeamId,
  expectedReleaseSha
}) {
  const id = deploymentId(deployment, context);
  const url = deploymentUrl(deployment, context);
  if (id !== expectedDeploymentId || url !== expectedDeploymentUrl) {
    fail(`${context} does not match the expected immutable deployment identity`);
  }
  if (deployment.readyState !== "READY" || deployment.target !== "production") {
    fail(`${context} is not a READY production deployment`);
  }
  if (deployment.projectId !== expectedProjectId || deploymentTeamId(deployment, context) !== expectedTeamId) {
    fail(`${context} does not match the exact Vercel project and team`);
  }
  if (deploymentSha(deployment, context) !== expectedReleaseSha) {
    fail(`${context} does not match the exact release SHA`);
  }
  return { id, url };
}
function verifyInputs({
  expectedDeploymentId,
  expectedDeploymentUrl,
  expectedProjectId,
  expectedTeamId,
  expectedReleaseSha
}) {
  if (!/^dpl_[A-Za-z0-9]+$/.test(requiredString(expectedDeploymentId, "expected deployment ID"))) {
    fail("expected deployment ID is invalid");
  }
  deploymentUrl({ url: requiredString(expectedDeploymentUrl, "expected deployment URL") }, "expected");
  requiredString(expectedProjectId, "expected project ID");
  requiredString(expectedTeamId, "expected team ID");
  if (!/^[a-f0-9]{40}$/.test(requiredString(expectedReleaseSha, "expected release SHA"))) {
    fail("expected release SHA must be a full lowercase Git commit SHA");
  }
}
function verifyDeploymentAndAlias(input, label) {
  verifyInputs(input);
  const expected = {
    expectedDeploymentId: input.expectedDeploymentId,
    expectedDeploymentUrl: input.expectedDeploymentUrl,
    expectedProjectId: input.expectedProjectId,
    expectedTeamId: input.expectedTeamId,
    expectedReleaseSha: input.expectedReleaseSha
  };
  const direct = verifyExactDeployment({ deployment: input.deployment, context: `${label} deployment`, ...expected });
  const alias = verifyExactDeployment({ deployment: input.aliasDeployment, context: `${label} production alias`, ...expected });
  if (alias.id !== direct.id) fail(`${label} production alias does not resolve to the exact deployment ID`);
  return Object.freeze({
    deploymentId: direct.id,
    deploymentUrl: direct.url,
    releaseSha: input.expectedReleaseSha,
    projectId: input.expectedProjectId,
    teamId: input.expectedTeamId,
    readyState: "READY",
    target: "production"
  });
}
function verifyNewProductionDeployment(input) {
  const previousDeploymentId = requiredString(input?.previousDeploymentId, "previous deployment ID");
  const previousDeploymentUrl = requiredString(input?.previousDeploymentUrl, "previous deployment URL");
  deploymentId({ id: previousDeploymentId }, "previous");
  deploymentUrl({ url: previousDeploymentUrl }, "previous");
  if (input?.expectedDeploymentId === previousDeploymentId || input?.expectedDeploymentUrl === previousDeploymentUrl) {
    fail("new production deployment must have a new immutable deployment ID and URL");
  }
  return verifyDeploymentAndAlias(input, "new");
}
function verifyProductionRollback(input) {
  const verified = verifyDeploymentAndAlias(input, "rollback");
  return Object.freeze({ ...verified, aliasDeploymentId: verified.deploymentId });
}

// infrastructure/release-custody/owner-gate/vercel-evidence.mjs
var requireThat = (value, message) => {
  if (!value) throw new Error(message);
};
function createVercelEvidenceReader({ projectId, teamId, productionHost, readToken, fetchImpl = fetch, now = Date.now, wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), completionTimeoutMs = 45 * 6e4, pollIntervalMs = 15e3 }) {
  requireThat(/^prj_[a-zA-Z0-9]+$/.test(projectId) && /^team_[a-zA-Z0-9]+$/.test(teamId), "Pinned Vercel target required");
  requireThat(/^[a-z0-9]+(?:[.-][a-z0-9]+)*\.[a-z]{2,}$/.test(productionHost), "Pinned production hostname required");
  requireThat(Number.isInteger(completionTimeoutMs) && completionTimeoutMs > 0 && completionTimeoutMs <= 45 * 6e4 && Number.isInteger(pollIntervalMs) && pollIntervalMs > 0 && pollIntervalMs <= 6e4, "Bounded provider observation required");
  async function deployment(id) {
    requireThat(id === productionHost || /^dpl_[a-zA-Z0-9]+$/.test(id), "Invalid deployment lookup");
    const token = await readToken();
    requireThat(typeof token === "string" && token.length > 0, "Vercel reader credential unavailable");
    const result = await fetchImpl(`https://api.vercel.com/v13/deployments/${encodeURIComponent(id)}?teamId=${encodeURIComponent(teamId)}`, { method: "GET", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(3e4), headers: { authorization: `Bearer ${token}`, accept: "application/json" } });
    requireThat(result.ok, "Vercel deployment lookup failed");
    return parseTrustedVercelApiJson(await result.text());
  }
  async function health() {
    const result = await fetchImpl(`https://${productionHost}/api/health`, { method: "GET", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(1e4), headers: { accept: "application/json" } });
    requireThat(result.status === 200, "Production health failed");
    const body = await result.json(), timestamp = Date.parse(body.time);
    requireThat(body.ok === true && body.status === "ok" && body.services?.database === "ok" && Number.isFinite(timestamp) && timestamp <= now() + 5e3 && now() - timestamp < 3e4, "Fresh database health required");
    return "healthy";
  }
  function target(bundle) {
    requireThat(bundle.projectId === projectId && bundle.teamId === teamId && bundle.environment === "production", "Wrong production target");
  }
  return {
    async baseline(bundle) {
      target(bundle);
      const observedAt = now();
      const [direct, healthy] = await Promise.all([deployment(bundle.baselineDeploymentId), health()]);
      const alias = await deployment(productionHost);
      const verified = verifyProductionRollback({ deployment: direct, aliasDeployment: alias, expectedDeploymentId: bundle.baselineDeploymentId, expectedDeploymentUrl: direct.url, expectedProjectId: projectId, expectedTeamId: teamId, expectedReleaseSha: bundle.baselineSha });
      return { observedAt, projectId, teamId, environment: "production", baselineDeploymentId: verified.deploymentId, baselineSha: verified.releaseSha, baselineUrl: verified.deploymentUrl, health: healthy };
    },
    async verifyNew(bundle, deploymentId2, previousDeploymentUrl) {
      target(bundle);
      requireThat(deploymentId2 !== bundle.baselineDeploymentId, "Expected a new immutable deployment");
      const deadline = now() + completionTimeoutMs;
      let verified;
      for (let attempt = 0; ; attempt++) {
        const direct = await deployment(deploymentId2);
        requireThat((direct.id ?? direct.uid) === deploymentId2 && direct.projectId === projectId && (direct.teamId ?? direct.team?.id) === teamId && (direct.teamId === void 0 || direct.team?.id === void 0 || direct.teamId === direct.team.id) && direct.target === "production", "Pending deployment target mismatch");
        requireThat((direct.gitSource?.sha ?? direct.meta?.githubCommitSha) === bundle.releaseSha && (direct.gitSource?.sha === void 0 || direct.meta?.githubCommitSha === void 0 || direct.gitSource.sha === direct.meta.githubCommitSha), "Pending deployment source mismatch");
        if (bundle.version === 2) requireThat(direct.meta?.cadenzaArtifactSha256 === bundle.artifactSha256, "Production artifact digest mismatch");
        requireThat(["QUEUED", "INITIALIZING", "BUILDING", "READY"].includes(direct.readyState), "Provider deployment failed or has an unknown state");
        if (direct.readyState === "READY") {
          const alias = await deployment(productionHost);
          if ((alias.id ?? alias.uid) === deploymentId2) {
            verified = verifyNewProductionDeployment({ deployment: direct, aliasDeployment: alias, expectedDeploymentId: deploymentId2, expectedDeploymentUrl: direct.url, expectedProjectId: projectId, expectedTeamId: teamId, expectedReleaseSha: bundle.releaseSha, previousDeploymentId: bundle.baselineDeploymentId, previousDeploymentUrl });
            if (bundle.version === 2) requireThat(alias.meta?.cadenzaArtifactSha256 === bundle.artifactSha256, "Production alias artifact digest mismatch");
            await health();
            break;
          }
          verifyProductionRollback({ deployment: alias, aliasDeployment: alias, expectedDeploymentId: bundle.baselineDeploymentId, expectedDeploymentUrl: previousDeploymentUrl, expectedProjectId: projectId, expectedTeamId: teamId, expectedReleaseSha: bundle.baselineSha });
        }
        requireThat(now() < deadline && attempt < Math.ceil(completionTimeoutMs / pollIntervalMs), "Provider completion timed out; retain claim and reconcile existing deployment");
        await wait(Math.min(pollIntervalMs, deadline - now()));
      }
      return { deploymentId: verified.deploymentId, releaseSha: verified.releaseSha, projectId, teamId, environment: "production", ...bundle.version === 2 ? { artifactSha256: bundle.artifactSha256 } : {} };
    }
  };
}
export {
  createVercelEvidenceReader
};
