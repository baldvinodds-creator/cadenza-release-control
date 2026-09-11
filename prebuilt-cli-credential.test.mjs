import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,access,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createPrebuiltCliRunner} from './gate/vercel-prebuilt.mjs';
for(const fail of [false,true]) test(`isolated CLI credential is private and removed after ${fail?'failure':'success'}`,async()=>{
 const root=await mkdtemp(join(tmpdir(),'prebuilt-auth-test-'));const home=join(root,'home'),cli=join(root,'cli.mjs');await mkdir(home);
 try{
  await writeFile(cli,`import {readFile,stat} from 'node:fs/promises';import {join} from 'node:path';
const home=process.argv[process.argv.indexOf('--global-config')+1];const path=join(home,'auth.json');
if(JSON.parse(await readFile(path)).token!=='nonsecret-fixture'||((await stat(path)).mode&0o777)!==0o600||process.env.VERCEL_TOKEN||process.argv.includes('nonsecret-fixture'))process.exit(42);
process.exitCode=${fail?1:0};if(!process.exitCode)process.stdout.write('verified');`);
  const run=createPrebuiltCliRunner({cliPath:cli,readToken:async()=> 'nonsecret-fixture'});
  const action=()=>run({cwd:root,home,args:['whoami'],beforeStart:async()=>{}});
  if(fail)await assert.rejects(action,/Prebuilt upload failed/);else assert.equal(await action(),'verified');
  await assert.rejects(access(join(home,'auth.json')));
 }finally{await rm(root,{recursive:true,force:true});}
});
test('provider diagnostic never emits its credential, URLs or quoted metadata',async()=>{
 const root=await mkdtemp(join(tmpdir(),'prebuilt-redaction-test-')),home=join(root,'home'),cli=join(root,'cli.mjs');await mkdir(home);
 const messages=[],original=console.error;
 try{
  await writeFile(cli,`process.stderr.write('Error: Upload nonsecret-fixture https://provider.invalid/?secret=hidden "private metadata" failed\\n');process.exitCode=1;`);
  console.error=(...args)=>messages.push(args.join(' '));
  const run=createPrebuiltCliRunner({cliPath:cli,readToken:async()=> 'nonsecret-fixture'});
  await assert.rejects(()=>run({cwd:root,home,args:[],beforeStart:async()=>{}}));
  assert.match(messages.join('\n'),/Prebuilt CLI diagnostic/);
  for(const value of ['nonsecret-fixture','secret=hidden','private metadata'])assert.equal(messages.join('\n').includes(value),false);
 }finally{console.error=original;await rm(root,{recursive:true,force:true});}
});
