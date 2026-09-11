// Installed only with reviewed gate bundles in the separate control repository.
import { readFile, mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createControlReleaseRuntime } from './gate/control-runtime.mjs';
import { createGithubApprovalReader } from './gate/github-approval.mjs';
import { createArtifactProvenanceVerifier, createGhAttestationRunner } from './gate/artifact-provenance.mjs';
import { prepareArtifactForAttestation } from './gate/prepare-artifact.mjs';
import { createPrebuiltCliRunner } from './gate/vercel-prebuilt.mjs';
import { assertOwnerControlledPolicy } from './gate/github-permissions.mjs';
import { connectProtectedLedger } from './gate/ledger-connection.mjs';
import { digest, parseBundle } from './gate/core.mjs';
const execute = promisify(execFile);
const requireThat = (value, message) => { if (!value) throw Error(message); };
let ledger;
try {
  const config = JSON.parse(await readFile(new URL('./enrollment.json', import.meta.url), 'utf8'));
  const mode = process.argv[2];
  requireThat(['rehearsal', 'deploy'].includes(mode) && config.runtimePolicy, 'Runtime enrollment missing');
  // Pin is outside Git: embedding a commit's own hash inside it is circular.
  // This owner-environment variable must be covered by live mutation denials.
  const policy = { ...config.runtimePolicy, gateSha: process.env.OWNER_GATE_SHA };
  requireThat(/^[a-f0-9]{40}$/.test(policy.gateSha ?? '') && process.env.GITHUB_SHA === policy.gateSha && process.env.GITHUB_REPOSITORY === policy.controlRepository && process.env.GITHUB_REF === 'refs/heads/main' && process.env.GITHUB_RUN_ATTEMPT === '1', 'Wrong protected runner identity');
  const rawBundle = process.env.RELEASE_BUNDLE;
  requireThat(typeof rawBundle === 'string' && rawBundle.length <= 8192 && digest(rawBundle) === process.env.RELEASE_BUNDLE_SHA256, 'Modified release request');
  const bundle = parseBundle(rawBundle, policy, Date.now());
  requireThat(bundle.version === 2 && bundle.releaseSha === process.env.RELEASE_SHA, 'Artifact-bound source required');
  const runId = Number(process.env.GITHUB_RUN_ID), expectedBundleSha256 = digest(rawBundle);
  const api = (repository, token) => async path => {
    requireThat(token && path.startsWith(`/repos/${repository}/`), 'Missing scoped reader or invalid API target');
    const response = await fetch(`https://api.github.com${path}`, { redirect: 'error', signal: AbortSignal.timeout(30000), headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' } });
    requireThat(response.ok, 'Read-only provider evidence unavailable'); return response.json();
  };
  const readControlJson = api(policy.controlRepository, process.env.GITHUB_TOKEN);
  const readSourceJson = api(policy.repository, process.env.GH_SOURCE_READ_TOKEN);
  const approval = await createGithubApprovalReader({ policy, readJson: readControlJson })({ rawBundle, runId, expectedBundleSha256 });
  const workRoot = await mkdtemp(join(process.env.RUNNER_TEMP, 'approved-artifact-'));
  const prepared = await prepareArtifactForAttestation({
    policy: { repository: policy.repository, builderWorkflow: '.github/workflows/owner-prebuilt-build.yml', builderWorkflowSha256: config.reviewedBuilderWorkflowSha256, toolchainLockSha256: config.reviewedToolchainLockSha256 },
    request: { releaseSha: bundle.releaseSha, buildRunId: Number(process.env.BUILD_RUN_ID), artifactId: Number(process.env.ARTIFACT_ID) },
    workRoot, readJson: readSourceJson, readToken: async () => process.env.GH_SOURCE_READ_TOKEN,
  });
  requireThat(prepared.artifactSha256 === bundle.artifactSha256, 'Approved artifact differs from private build');
  await execute('/usr/bin/gh', ['attestation', 'download', prepared.manifestPath, '--repo', policy.controlRepository], {
    cwd: workRoot, timeout: 60000, maxBuffer: 1024 * 1024,
    env: { PATH: '/usr/bin:/bin', HOME: workRoot, GH_CONFIG_DIR: workRoot, GH_TOKEN: process.env.GITHUB_TOKEN, GH_PROMPT_DISABLED: '1' },
  });
  const attestationPath = join(workRoot, `sha256:${bundle.artifactSha256}.jsonl`);
  const runAttestationVerifier = createGhAttestationRunner({ ghPath: '/usr/bin/gh', home: workRoot });
  const verifiedArtifact = await createArtifactProvenanceVerifier({ policy, manifestPath: prepared.manifestPath, attestationPath, runVerifier: runAttestationVerifier })(bundle);
  parseBundle(rawBundle, policy, Date.now());
  if (mode === 'rehearsal') {
    requireThat(!process.env.VERCEL_RELEASE_TOKEN && !process.env.RELEASE_LEDGER_URL && !process.env.CENSUS_DATABASE_URL, 'Rehearsal received production credentials');
    const rechecked = await createGithubApprovalReader({ policy, readJson: readControlJson })({ rawBundle, runId, expectedBundleSha256 });
    requireThat(JSON.stringify(rechecked) === JSON.stringify(approval), 'Approval changed during rehearsal');
    const receipt = { mode: 'OWNER_APPROVAL_AND_ARTIFACT_REHEARSAL', ...approval, artifactSha256: verifiedArtifact.artifactSha256, deploymentPerformed: false };
    await writeFile(join(process.env.RUNNER_TEMP, 'owner-release-receipt.json'), JSON.stringify(receipt), { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify(receipt));
  } else {
    requireThat(config.enabled === true && config.deploymentCredentialsAttached === true, 'Production enrollment disabled');
    assertOwnerControlledPolicy(policy);
    const productionPolicyRaw = process.env.PRODUCTION_OBSERVER_POLICY;
    requireThat(typeof productionPolicyRaw === 'string' && digest(productionPolicyRaw) === config.productionPolicySha256, 'Production observer policy is not enrolled');
    requireThat(process.env.VERCEL_RELEASE_TOKEN && process.env.RELEASE_LEDGER_URL && process.env.CENSUS_DATABASE_URL, 'Protected production credentials missing');
    ledger = await connectProtectedLedger({ connectionString: process.env.RELEASE_LEDGER_URL, policy: config.ledgerPolicy });
    const runtime = createControlReleaseRuntime({ policy: { ...policy, enabled: true, deploymentCredentialsAttached: true },
      productionPolicy: JSON.parse(productionPolicyRaw), readSourceJson, readControlJson,
      readProductionConnection: async () => process.env.CENSUS_DATABASE_URL, readVercelObserverToken: async () => process.env.VERCEL_RELEASE_TOKEN,
      ledgerQuery: ledger.query, outputRoot: prepared.outputRoot, manifestPath: prepared.manifestPath, attestationPath, runAttestationVerifier,
      runPrebuiltCli: createPrebuiltCliRunner({ cliPath: join(process.cwd(), 'toolchain/node_modules/vercel/dist/index.js'), readToken: async () => process.env.VERCEL_RELEASE_TOKEN }),
    });
    const receipt = await runtime({ rawBundle, runId, expectedBundleSha256 });
    await writeFile(join(process.env.RUNNER_TEMP, 'owner-release-receipt.json'), JSON.stringify(receipt), { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify(receipt));
  }
} catch {
  // Never echo child/provider errors containing signed URLs, env or credentials.
  console.error('Protected release refused or outcome uncertain. Preserve evidence; do not automatically retry.');
  process.exitCode = 1;
} finally { await ledger?.close(); }
