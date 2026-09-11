import { createRequire } from "node:module"; const require = createRequire(import.meta.url);

// infrastructure/release-custody/owner-gate/artifact-provenance.mjs
import { readFile } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

// infrastructure/release-custody/owner-gate/core.mjs
import { createHash } from "node:crypto";

// scripts/lib/release-custody-revocations.mjs
var RETIRED_RELEASE_SIGNERS = Object.freeze([
  "4c35b68005859dfaf5fe4d6d490210bfa4932448caf5513481dc0f53ff480e15",
  "4d27c948719d3a9c439a86f0728ce441374e148bb7ee2c1373546ecf2e004775"
]);

// infrastructure/release-custody/owner-gate/core.mjs
var digest = (value) => createHash("sha256").update(value).digest("hex");

// infrastructure/release-custody/owner-gate/artifact-provenance.mjs
var execute = promisify(execFile);
var requireThat = (value, message) => {
  if (!value) throw new Error(message);
};
function createArtifactProvenanceVerifier({ policy: sourcePolicy, manifestPath, attestationPath, runVerifier }) {
  const policy = structuredClone(sourcePolicy);
  requireThat(/^[\w.-]+\/[\w.-]+$/.test(policy.controlRepository) && /^[a-f0-9]{40}$/.test(policy.gateSha), "Reviewed attester identity required");
  requireThat(policy.attesterWorkflow === ".github/workflows/prebuilt-builder.yml", "Pinned attester workflow required");
  requireThat(isAbsolute(manifestPath) && isAbsolute(attestationPath), "Private absolute artifact paths required");
  return async (bundle) => {
    const raw = await readFile(manifestPath, "utf8");
    const manifest = JSON.parse(raw);
    requireThat(bundle.version === 2 && manifest.version === 1 && manifest.releaseSha === bundle.releaseSha && manifest.target === "production" && Array.isArray(manifest.files) && digest(raw) === bundle.artifactSha256, "Manifest differs from approved artifact");
    const args = [
      "attestation",
      "verify",
      manifestPath,
      "--bundle",
      attestationPath,
      "--repo",
      policy.controlRepository,
      "--signer-workflow",
      `${policy.controlRepository}/${policy.attesterWorkflow}`,
      "--signer-digest",
      policy.gateSha,
      "--source-digest",
      policy.gateSha,
      "--source-ref",
      "refs/heads/main",
      "--deny-self-hosted-runners",
      "--cert-oidc-issuer",
      "https://token.actions.githubusercontent.com",
      "--predicate-type",
      "https://slsa.dev/provenance/v1",
      "--format",
      "json"
    ];
    const verified = JSON.parse(await runVerifier(args));
    requireThat(Array.isArray(verified) && verified.length > 0, "No verified provider attestation");
    requireThat(verified.some((entry) => entry.verificationResult?.statement?.subject?.some((subject) => subject.digest?.sha256 === bundle.artifactSha256)), "Verified attestation does not cover approved manifest");
    return Object.freeze({ verified: true, releaseSha: bundle.releaseSha, artifactSha256: bundle.artifactSha256, attesterRepository: policy.controlRepository, attesterSha: policy.gateSha });
  };
}
function createGhAttestationRunner({ ghPath, home }) {
  requireThat(isAbsolute(ghPath) && isAbsolute(home), "Pinned verifier and isolated home required");
  return async (args) => {
    try {
      const { stdout } = await execute(ghPath, args, {
        timeout: 6e4,
        maxBuffer: 4 * 1024 * 1024,
        env: { PATH: "/usr/local/bin:/usr/bin:/bin", HOME: home, GH_CONFIG_DIR: home, GH_PROMPT_DISABLED: "1" }
      });
      return stdout;
    } catch {
      throw new Error("Provider attestation verification failed");
    }
  };
}
export {
  createArtifactProvenanceVerifier,
  createGhAttestationRunner
};
