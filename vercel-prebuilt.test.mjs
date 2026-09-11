import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, symlink, readlink, lstat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { digest } from './gate/core.mjs';
import { inspectPrebuiltArtifact } from './gate/prebuilt-artifact.mjs';
import { createVercelPrebuiltDeployer } from './gate/vercel-prebuilt.mjs';
async function fixture(fn) {
  const root = await mkdtemp(join(tmpdir(), 'prebuilt-deployer-test-'));
  await writeFile(join(root, 'config.json'), '{"version":3}');
  await mkdir(join(root, 'functions/group.func'), { recursive: true });
  await writeFile(join(root, 'functions/group.func/.vc-config.json'), '{}');
  await symlink('group.func', join(root, 'functions/alias.func'));
  const s = { clock: Date.parse('2026-09-11T10:00:00.000Z'), uploads: 0, events: [], provenance: true };
  const policy = { repository: 'example/app', projectId: 'prj_test', teamId: 'team_test', environment: 'production', policyVersion: 'v1' };
  const artifact = await inspectPrebuiltArtifact({ outputRoot: root, releaseSha: 'a'.repeat(40) });
  const bundle = { version: 2, mode: 'OWNER_APPROVED_MIGRATION_FREE', repository: policy.repository, releaseSha: 'a'.repeat(40), projectId: policy.projectId, teamId: policy.teamId, environment: 'production', baselineSha: 'b'.repeat(40), baselineDeploymentId: 'dpl_old', ledgerSha256: 'c'.repeat(64), manifestSha256: 'd'.repeat(64), ciRunId: 1, policyVersion: 'v1', issuedAt: new Date(s.clock).toISOString(), expiresAt: new Date(s.clock + 60000).toISOString(), nonce: 'e'.repeat(64), artifactSha256: artifact.artifactSha256 };
  const approval = { bundleSha256: digest(JSON.stringify(bundle)), releaseSha: bundle.releaseSha };
  const deployer = createVercelPrebuiltDeployer({ policy, outputRoot: root, now: () => s.clock,
    verifyProvenance: async () => ({ verified: s.provenance, releaseSha: s.source ?? bundle.releaseSha, artifactSha256: bundle.artifactSha256 }),
    baseline: async () => { s.events.push('baseline'); if (s.moved) throw Error('baseline moved'); },
    runCli: async ({ cwd, args, home }) => {
      s.uploads++; s.events.push('upload');
      assert.ok((await lstat(join(cwd, '.vercel/output/functions/alias.func'))).isSymbolicLink());
      assert.equal(await readlink(join(cwd, '.vercel/output/functions/alias.func')), 'group.func');
      assert.deepEqual(await readdir(cwd), ['.vercel']);
      assert.deepEqual(await readdir(home), []);
      assert.deepEqual(JSON.parse(await readFile(join(cwd, '.vercel/project.json'))), { orgId: 'team_test', projectId: 'prj_test' });
      assert.ok(args.includes('--prebuilt')); assert.ok(args.includes('--prod'));
      assert.ok(args.includes(`cadenzaArtifactSha256=${bundle.artifactSha256}`));
      assert.ok(args.includes('--archive=tgz')); assert.ok(args.includes('--no-wait'));
      assert.ok(!args.includes('--token')); assert.ok(!args.includes('--force'));
      if (s.ambiguous) throw Error('network uncertain');
      return JSON.stringify({ id: 'dpl_new', url: 'https://fixture.vercel.app', deploymentApiUrl: 'https://api.vercel.com/v13/deployments/dpl_new', readyState: 'READY' });
    },
  });
  const run = () => deployer.deploy({ bundle, approval, beforePromotion: async () => { s.events.push('approval'); if (s.denied) throw Error('approval denied'); if (s.expire) s.clock += 60001; } });
  try { await fn({ s, root, bundle, approval, run }); } finally { await rm(root, { recursive: true, force: true }); }
}
test('only uploads private verified prebuilt copy after fresh approval and baseline checks', () => fixture(async ({ s, run }) => {
  assert.equal((await run()).deploymentId, 'dpl_new');
  assert.deepEqual(s.events, ['approval', 'baseline', 'upload']); assert.equal(s.uploads, 1);
}));
for (const [name, mutate] of [
  ['missing provenance', h => { h.s.provenance = false; }],
  ['wrong provenance SHA', h => { h.s.source = '9'.repeat(40); }],
  ['changed output', h => writeFile(join(h.root, 'config.json'), '{"version":3,"changed":true}')],
  ['wrong approval', h => { h.approval.bundleSha256 = '9'.repeat(64); }],
  ['revoked approval', h => { h.s.denied = true; }],
  ['expired approval', h => { h.s.expire = true; }],
  ['moved baseline', h => { h.s.moved = true; }],
]) test(`denies ${name} before upload`, () => fixture(async h => {
  await mutate(h); await assert.rejects(h.run()); assert.equal(h.s.uploads, 0);
}));
test('uncertain upload is attempted once only', () => fixture(async ({ s, run }) => {
  s.ambiguous = true; await assert.rejects(run(), /uncertain/); assert.equal(s.uploads, 1);
}));
