import test from 'node:test';
import assert from 'node:assert/strict';
import { createVercelEvidenceReader } from './gate/vercel-evidence.mjs';
const time = Date.parse('2026-09-11T01:00:00.000Z');
function setup(change = () => {}) {
  const bundle = { projectId: 'prj_test', teamId: 'team_test', environment: 'production', baselineDeploymentId: 'dpl_old', baselineSha: 'a'.repeat(40), releaseSha: 'b'.repeat(40) };
  const deployment = { id: 'dpl_old', url: 'old.vercel.app', projectId: bundle.projectId, teamId: bundle.teamId, target: 'production', readyState: 'READY', gitSource: { sha: bundle.baselineSha } };
  const alias = structuredClone(deployment), health = { ok: true, status: 'ok', time: new Date(time).toISOString(), services: { database: 'ok' } }, calls = [];
  change({ bundle, deployment, alias, health });
  const reader = createVercelEvidenceReader({ projectId: 'prj_test', teamId: 'team_test', productionHost: 'cadenza.example', readToken: async () => 'fixture-token', now: () => time, fetchImpl: async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify(url.endsWith('/api/health') ? health : url.includes('/deployments/cadenza.example') ? alias : deployment), { status: 200 });
  } });
  return { reader, bundle, calls };
}
test('reads exact baseline and alias without sending provider credentials to public site', async () => {
  const h = setup(), result = await h.reader.baseline(h.bundle);
  assert.equal(result.baselineDeploymentId, 'dpl_old');
  assert.equal(result.health, 'healthy');
  for (const call of h.calls) {
    assert.equal(call.options.method, 'GET');
    assert.equal(call.options.redirect, 'error');
    assert.equal(call.options.cache, 'no-store');
    assert.equal(Boolean(call.options.headers.authorization), new URL(call.url).hostname === 'api.vercel.com');
  }
});
for (const [name, change] of [
  ['wrong target', x => { x.bundle.teamId = 'team_other'; }],
  ['moved alias', x => { x.alias.id = 'dpl_other'; }],
  ['wrong SHA', x => { x.deployment.gitSource.sha = 'c'.repeat(40); }],
  ['conflicting source claims', x => { x.deployment.meta = { githubCommitSha: 'c'.repeat(40) }; }],
  ['preview deployment', x => { x.deployment.target = 'preview'; }],
  ['database unhealthy', x => { x.health.services.database = 'error'; }],
  ['stale health', x => { x.health.time = new Date(time - 31_000).toISOString(); }],
]) test(`rejects ${name}`, async () => { const h = setup(change); await assert.rejects(h.reader.baseline(h.bundle)); });
test('new-deployment verification rejects reuse of baseline', async () => {
  const h = setup();
  await assert.rejects(h.reader.verifyNew(h.bundle, 'dpl_old', 'old.vercel.app'), /new immutable/);
});
test('new deployment is accepted only when direct and alias match the intended source', async () => {
  const h = setup(x => {
    for (const item of [x.deployment, x.alias]) { item.id = 'dpl_new'; item.url = 'new.vercel.app'; item.gitSource.sha = x.bundle.releaseSha; }
  });
  assert.equal((await h.reader.verifyNew(h.bundle, 'dpl_new', 'old.vercel.app')).releaseSha, h.bundle.releaseSha);
});
for (const matches of [true, false]) test(`artifact-bound provider verification ${matches ? 'records exact artifact' : 'rejects wrong artifact'}`, async () => {
  const h = setup(x => {
    x.bundle.version = 2; x.bundle.artifactSha256 = '8'.repeat(64);
    for (const item of [x.deployment, x.alias]) {
      item.id = 'dpl_new'; item.url = 'new.vercel.app'; item.gitSource.sha = x.bundle.releaseSha;
      item.meta = { cadenzaArtifactSha256: (matches ? '8' : '9').repeat(64) };
    }
  });
  if (matches) assert.equal((await h.reader.verifyNew(h.bundle, 'dpl_new', 'old.vercel.app')).artifactSha256, h.bundle.artifactSha256);
  else await assert.rejects(h.reader.verifyNew(h.bundle, 'dpl_new', 'old.vercel.app'), /artifact digest mismatch/);
});

function pendingSetup({ states = ['BUILDING', 'READY'], aliasDelay = false, change = () => {} } = {}) {
  let clock = time, index = 0, sleeps = 0;
  const bundle = { version: 2, projectId: 'prj_test', teamId: 'team_test', environment: 'production', baselineDeploymentId: 'dpl_old', baselineSha: 'a'.repeat(40), releaseSha: 'b'.repeat(40), artifactSha256: '8'.repeat(64) };
  const direct = { id: 'dpl_new', url: 'new.vercel.app', projectId: bundle.projectId, teamId: bundle.teamId, target: 'production', gitSource: { sha: bundle.releaseSha }, meta: { cadenzaArtifactSha256: bundle.artifactSha256 } };
  const calls = [];
  const reader = createVercelEvidenceReader({ projectId: bundle.projectId, teamId: bundle.teamId, productionHost: 'cadenza.example', readToken: async () => 'fixture-token', now: () => clock, completionTimeoutMs: 30, pollIntervalMs: 10,
    wait: async ms => { clock += ms; sleeps++; }, fetchImpl: async (url, options) => {
      calls.push({ url, options });
      let data;
      if (url.endsWith('/api/health')) data = { ok: true, status: 'ok', services: { database: 'ok' }, time: new Date(clock).toISOString() };
      else if (url.includes('/deployments/cadenza.example')) data = aliasDelay && sleeps < 2 ? { ...direct, id: 'dpl_old', url: 'old.vercel.app', readyState: 'READY', gitSource: { sha: bundle.baselineSha } } : { ...direct, readyState: 'READY' };
      else { data = { ...direct, readyState: states[Math.min(index++, states.length - 1)] }; change(data); }
      return new Response(JSON.stringify(data));
    } });
  return { reader, bundle, calls, sleeps: () => sleeps };
}
test('observes pending deployment and delayed alias using only GET, then verifies health', async () => {
  const h = pendingSetup({ aliasDelay: true });
  const receipt = await h.reader.verifyNew(h.bundle, 'dpl_new', 'old.vercel.app');
  assert.equal(receipt.deploymentId, 'dpl_new'); assert.equal(h.sleeps(), 2);
  for (const { url, options } of h.calls) {
    assert.equal(options.method, 'GET');
    assert.equal(Boolean(options.headers.authorization), new URL(url).hostname === 'api.vercel.com');
  }
});
for (const [name, config] of [
  ['provider failure', { states: ['ERROR'] }],
  ['provider cancellation', { states: ['CANCELED'] }],
  ['wrong pending SHA', { change: d => { d.gitSource.sha = 'c'.repeat(40); } }],
  ['wrong pending target', { change: d => { d.target = 'preview'; } }],
  ['wrong pending identity', { change: d => { d.id = 'dpl_other'; } }],
  ['wrong pending artifact', { change: d => { d.meta = { cadenzaArtifactSha256: '9'.repeat(64) }; } }],
]) test(`immediately rejects ${name} without waiting or mutating`, async () => {
  const h = pendingSetup(config);
  await assert.rejects(h.reader.verifyNew(h.bundle, 'dpl_new', 'old.vercel.app'));
  assert.equal(h.sleeps(), 0); assert.equal(h.calls.length, 1);
});
test('bounded pending timeout leaves finalization to reconciliation, with no upload retry', async () => {
  const h = pendingSetup({ states: ['BUILDING'] });
  await assert.rejects(h.reader.verifyNew(h.bundle, 'dpl_new', 'old.vercel.app'), /retain claim/);
  assert.equal(h.sleeps(), 3);
  assert.ok(h.calls.every(c => c.options.method === 'GET'));
});
