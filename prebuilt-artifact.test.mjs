import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,writeFile,mkdir,symlink,rm,chmod} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {inspectPrebuiltArtifact,verifyApprovedPrebuiltArtifact} from './gate/prebuilt-artifact.mjs';
async function fixture(fn){const root=await mkdtemp(join(tmpdir(),'owner-artifact-test-'));try{await writeFile(join(root,'config.json'),'{"version":3}');await mkdir(join(root,'static'));await writeFile(join(root,'static/index.html'),'fixture');await fn(root);}finally{await rm(root,{recursive:true,force:true});}}
const releaseSha='a'.repeat(40);
test('stable manifest binds source, paths, executable bits and content',()=>fixture(async root=>{const a=await inspectPrebuiltArtifact({outputRoot:root,releaseSha});const b=await inspectPrebuiltArtifact({outputRoot:root,releaseSha});assert.equal(a.artifactSha256,b.artifactSha256);assert.equal(a.fileCount,2);await verifyApprovedPrebuiltArtifact({outputRoot:root,bundle:{version:2,releaseSha,artifactSha256:a.artifactSha256}});}));
for(const [name,mutate]of[
 ['changed bytes',root=>writeFile(join(root,'static/index.html'),'changed')],['added file',root=>writeFile(join(root,'static/new.html'),'added')],['deleted file',root=>rm(join(root,'static/index.html'))],['execute permission',root=>chmod(join(root,'static/index.html'),0o755)],
])test(`rejects ${name} after approval`,()=>fixture(async root=>{const r=await inspectPrebuiltArtifact({outputRoot:root,releaseSha});await mutate(root);await assert.rejects(verifyApprovedPrebuiltArtifact({outputRoot:root,bundle:{version:2,releaseSha,artifactSha256:r.artifactSha256}}),/differs/);}));
test('refuses external symlink',()=>fixture(async root=>{await symlink('/etc/passwd',join(root,'static/link'));await assert.rejects(inspectPrebuiltArtifact({outputRoot:root,releaseSha}),/symlink/);}));
test('refuses environment files',()=>fixture(async root=>{await writeFile(join(root,'.env.production'),'fixture');await assert.rejects(inspectPrebuiltArtifact({outputRoot:root,releaseSha}),/Environment/);}));
test('refuses legacy approval without an artifact digest',()=>fixture(async root=>{await assert.rejects(verifyApprovedPrebuiltArtifact({outputRoot:root,bundle:{version:1,releaseSha}}),/legacy/);}));

test('binds internal function alias targets and rejects retargeting',()=>fixture(async root=>{
  for(const group of ['one','two']) {await mkdir(join(root,`functions/${group}.func`),{recursive:true});await writeFile(join(root,`functions/${group}.func/.vc-config.json`),'{}');}
  const alias=join(root,'functions/route.func');await symlink('one.func',alias);
  const before=await inspectPrebuiltArtifact({outputRoot:root,releaseSha});
  await rm(alias);await symlink('two.func',alias);
  await assert.rejects(verifyApprovedPrebuiltArtifact({outputRoot:root,bundle:{version:2,releaseSha,artifactSha256:before.artifactSha256}}),/differs/);
}));
test('refuses function alias chains and escaped function targets',()=>fixture(async root=>{
 await mkdir(join(root,'functions'));
 await symlink('two.func',join(root,'functions/one.func'));
 await symlink('../../../outside.func',join(root,'functions/two.func'));
 await assert.rejects(inspectPrebuiltArtifact({outputRoot:root,releaseSha}));
}));
