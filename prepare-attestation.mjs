// Install with the reviewed bundled gate modules in the separate control repo.
// This entry point is never sourced from the candidate application checkout.
import { readFile, mkdtemp, appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { prepareArtifactForAttestation } from './gate/prepare-artifact.mjs';
try {
  const config = JSON.parse(await readFile(new URL('./enrollment.json', import.meta.url), 'utf8'));
  const { RELEASE_SHA, BUILD_RUN_ID, ARTIFACT_ID, RUNNER_TEMP, GITHUB_OUTPUT, GH_SOURCE_READ_TOKEN } = process.env;
  if (!/^[a-f0-9]{40}$/.test(RELEASE_SHA ?? '') || !/^[1-9][0-9]*$/.test(BUILD_RUN_ID ?? '') || !/^[1-9][0-9]*$/.test(ARTIFACT_ID ?? '') || !GH_SOURCE_READ_TOKEN || !RUNNER_TEMP || !GITHUB_OUTPUT) throw Error('Missing protected preparation context');
  const readJson = async path => {
    if (!path.startsWith(`/repos/${config.sourceRepository}/`)) throw Error('Unexpected source API path');
    const response = await fetch(`https://api.github.com${path}`, { redirect: 'error', signal: AbortSignal.timeout(30000), headers: { authorization: `Bearer ${GH_SOURCE_READ_TOKEN}`, accept: 'application/vnd.github+json' } });
    if (!response.ok) throw Error('Private source evidence unavailable');
    return response.json();
  };
  const workRoot = await mkdtemp(join(RUNNER_TEMP, 'cadenza-attester-'));
  const result = await prepareArtifactForAttestation({ policy: { repository: config.sourceRepository,
    builderWorkflow: '.github/workflows/owner-prebuilt-build.yml', builderWorkflowSha256: config.reviewedBuilderWorkflowSha256, toolchainLockSha256: config.reviewedToolchainLockSha256 },
    request: { releaseSha: RELEASE_SHA, buildRunId: Number(BUILD_RUN_ID), artifactId: Number(ARTIFACT_ID) },
    workRoot, readJson, readToken: async () => GH_SOURCE_READ_TOKEN });
  await appendFile(GITHUB_OUTPUT, `manifest_path=${result.manifestPath}\nartifact_sha256=${result.artifactSha256}\n`);
  console.log(JSON.stringify({ releaseSha: result.releaseSha, buildRunId: result.buildRunId, artifactId: result.artifactId, artifactSha256: result.artifactSha256 }));
} catch {
  console.error('Artifact preparation refused; no attestation produced.');
  process.exitCode = 1;
}
