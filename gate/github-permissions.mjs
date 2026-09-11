import { createRequire } from "node:module"; const require = createRequire(import.meta.url);

// infrastructure/release-custody/owner-gate/github-permissions.mjs
var requireThat = (value, message) => {
  if (!value) throw new Error(message);
};
function createEngineeringPermissionProbe({ policy: sourcePolicy, readJson, attemptProbeEnvironment }) {
  const policy = structuredClone(sourcePolicy);
  requireThat(/^[\w.-]+\/[\w.-]+$/.test(policy.controlRepository) && Number.isSafeInteger(policy.ownerId) && Number.isSafeInteger(policy.engineeringId) && policy.ownerId !== policy.engineeringId, "Separate pinned account identities required");
  return async () => {
    const actor = await readJson("/user");
    requireThat(actor.id === policy.engineeringId && actor.id !== policy.ownerId, "Wrong probe credential identity");
    const repo = await readJson(`/repos/${policy.controlRepository}`);
    requireThat(repo.full_name === policy.controlRepository && repo.private === false && repo.owner?.id === policy.ownerId, "Control administration is not held by separate owner identity");
    const permissions = repo.permissions;
    requireThat(permissions && permissions.admin === false && permissions.maintain === false && permissions.push === false, "Engineering still has control-repository write/admin access");
    const probe = await attemptProbeEnvironment("coding-access-denial-probe");
    requireThat(probe.status === 403, "Live environment-policy mutation was not denied");
    return { actorId: actor.id, ownerId: policy.ownerId, controlRepository: policy.controlRepository, repositoryWriteDenied: true, environmentMutationDenied: true };
  };
}
function assertEnrollmentPermissionEvidence(evidence) {
  const required = [
    "codingCannotApprove",
    "codingCannotAdministerControl",
    "codingCannotDeployDirectly",
    "sourceDeploymentSecretsRemoved",
    "codingConnectorsExcludeControl",
    "ownerCredentialsAbsentFromCoding",
    "approvalOnlyAccountStrongAuth",
    "positiveOwnerRehearsal",
    "oldIdentitiesRejected"
  ];
  requireThat(evidence?.scope === "LIVE_PROVIDER_TESTS" && required.every((key) => evidence[key] === true), "Live permission cutover incomplete; do not attach deployment credentials");
  requireThat(Number.isSafeInteger(evidence.ownerId) && Number.isSafeInteger(evidence.engineeringId) && evidence.ownerId !== evidence.engineeringId, "Owner/engineering identities overlap");
  return true;
}
function assertOwnerControlledPolicy(policy) {
  requireThat(policy?.governanceModel === "SINGLE_OWNER_CONTROLLED", "Owner-controlled governance is not enrolled");
  requireThat(Number.isSafeInteger(policy.ownerId) && policy.ownerId > 0, "Explicit release owner required");
  requireThat(policy.controlRepository !== policy.repository && policy.approvalEnvironment === "owner-release", "Protected release boundary required");
  return true;
}
export {
  assertEnrollmentPermissionEvidence,
  assertOwnerControlledPolicy,
  createEngineeringPermissionProbe
};
