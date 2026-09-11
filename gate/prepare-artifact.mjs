import { createRequire } from "node:module"; const require = createRequire(import.meta.url);

// infrastructure/release-custody/owner-gate/prepare-artifact.mjs
import { open as open2, readFile as readFile2 } from "node:fs/promises";
import { createHash as createHash4 } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { join as join2, isAbsolute as isAbsolute2 } from "node:path";

// infrastructure/release-custody/owner-gate/github-artifact.mjs
import { createHash } from "node:crypto";
var requireThat = (value, message) => {
  if (!value) throw new Error(message);
};
function createGithubArtifactReader({ policy: sourcePolicy, readJson }) {
  const policy = structuredClone(sourcePolicy);
  requireThat(/^[\w.-]+\/[\w.-]+$/.test(policy.repository) && policy.builderWorkflow === ".github/workflows/owner-prebuilt-build.yml" && /^[a-f0-9]{64}$/.test(policy.builderWorkflowSha256) && /^[a-f0-9]{64}$/.test(policy.toolchainLockSha256), "Reviewed builder policy required");
  const base = `/repos/${policy.repository}`;
  return async ({ releaseSha, buildRunId, artifactId }) => {
    requireThat(/^[a-f0-9]{40}$/.test(releaseSha) && Number.isSafeInteger(buildRunId) && buildRunId > 0 && Number.isSafeInteger(artifactId) && artifactId > 0, "Exact build and artifact IDs required");
    const [main, run, artifact, workflow, toolchain] = await Promise.all([
      readJson(`${base}/git/ref/heads/main`),
      readJson(`${base}/actions/runs/${buildRunId}`),
      readJson(`${base}/actions/artifacts/${artifactId}`),
      readJson(`${base}/contents/${policy.builderWorkflow}?ref=${releaseSha}`),
      readJson(`${base}/contents/infrastructure/release-custody/toolchain/package-lock.json?ref=${releaseSha}`)
    ]);
    const assertRun = (item) => requireThat(item.id === buildRunId && item.head_sha === releaseSha && item.head_branch === "main" && item.run_attempt === 1 && item.event === "workflow_dispatch" && item.status === "completed" && item.conclusion === "success" && item.path === policy.builderWorkflow && item.repository?.full_name === policy.repository && item.head_repository?.full_name === policy.repository, "Wrong or unsuccessful builder execution");
    assertRun(run);
    requireThat(main.object?.type === "commit" && main.object.sha === releaseSha, "Main moved before artifact verification");
    requireThat(workflow.type === "file" && workflow.encoding === "base64" && workflow.path === policy.builderWorkflow && typeof workflow.content === "string", "Builder source unavailable");
    const bytes = Buffer.from(workflow.content.replace(/\s/g, ""), "base64");
    requireThat(bytes.length === workflow.size && createHash("sha256").update(bytes).digest("hex") === policy.builderWorkflowSha256, "Builder workflow differs from reviewed policy");
    requireThat(toolchain.type === "file" && toolchain.encoding === "base64" && toolchain.path === "infrastructure/release-custody/toolchain/package-lock.json" && typeof toolchain.content === "string", "Builder toolchain source unavailable");
    const lockBytes = Buffer.from(toolchain.content.replace(/\s/g, ""), "base64");
    requireThat(lockBytes.length === toolchain.size && createHash("sha256").update(lockBytes).digest("hex") === policy.toolchainLockSha256, "Builder toolchain differs from reviewed policy");
    requireThat(artifact.id === artifactId && artifact.name === `owner-prebuilt-${releaseSha}` && artifact.expired === false && Number.isSafeInteger(artifact.size_in_bytes) && artifact.size_in_bytes > 0 && artifact.size_in_bytes <= 8 * 1024 ** 3 && /^sha256:[a-f0-9]{64}$/.test(artifact.digest), "Artifact identity/digest unavailable");
    requireThat(artifact.workflow_run?.id === buildRunId && artifact.workflow_run.head_sha === releaseSha && artifact.workflow_run.head_branch === "main", "Artifact came from another source/run");
    assertRun(await readJson(`${base}/actions/runs/${buildRunId}`));
    return {
      repository: policy.repository,
      releaseSha,
      buildRunId,
      artifactId,
      archiveSha256: artifact.digest.slice(7),
      size: artifact.size_in_bytes,
      downloadPath: `${base}/actions/artifacts/${artifactId}/zip`,
      builderWorkflowSha256: policy.builderWorkflowSha256
    };
  };
}

// infrastructure/release-custody/owner-gate/prebuilt-artifact.mjs
import { lstat, readdir, open, realpath, readFile, readlink } from "node:fs/promises";
import { join, relative, basename, resolve, dirname, isAbsolute } from "node:path";
import { constants } from "node:fs";
import { createHash as createHash3 } from "node:crypto";

// infrastructure/release-custody/owner-gate/core.mjs
import { createHash as createHash2 } from "node:crypto";

// scripts/lib/release-custody-revocations.mjs
var RETIRED_RELEASE_SIGNERS = Object.freeze([
  "4c35b68005859dfaf5fe4d6d490210bfa4932448caf5513481dc0f53ff480e15",
  "4d27c948719d3a9c439a86f0728ce441374e148bb7ee2c1373546ecf2e004775"
]);

// infrastructure/release-custody/owner-gate/core.mjs
var digest = (value) => createHash2("sha256").update(value).digest("hex");

// infrastructure/release-custody/owner-gate/prebuilt-artifact.mjs
var requireThat2 = (value, message) => {
  if (!value) throw new Error(message);
};
async function inspectPrebuiltArtifact({ outputRoot, releaseSha }) {
  requireThat2(/^[a-f0-9]{40}$/.test(releaseSha), "Exact artifact source required");
  const rootStat = await lstat(outputRoot);
  requireThat2(rootStat.isDirectory() && !rootStat.isSymbolicLink(), "Materialized artifact root required");
  const root = await realpath(outputRoot), files = [], aliases = [];
  let totalBytes = 0;
  async function visit(directory) {
    for (const name of await readdir(directory)) {
      const path = join(directory, name), stat = await lstat(path);
      const key = relative(root, path).split("\\").join("/");
      if (stat.isSymbolicLink()) {
        const link = await readlink(path);
        const target = resolve(dirname(path), link), targetKey = relative(root, target).split("\\").join("/");
        requireThat2(/^functions\/.+\.func$/.test(key) && /^functions\/.+\.func$/.test(targetKey) && !isAbsolute(link) && !link.includes("\\") && !/[\u0000-\u001f\u007f]/.test(link) && !targetKey.split("/").includes(".."), "Artifact symlink must be an internal function alias");
        const targetStat = await lstat(target);
        requireThat2(targetStat.isDirectory() && !targetStat.isSymbolicLink() && await realpath(target) === target, "Artifact symlink target must be canonical, not chained");
        requireThat2((await lstat(join(target, ".vc-config.json"))).isFile(), "Function alias configuration missing");
        requireThat2(aliases.length < 1e5, "Too many function aliases");
        aliases.push({ path: key, link });
        continue;
      }
      requireThat2(!key.startsWith("../") && !/[\u0000-\u001f\u007f]/.test(key) && !name.includes("\\"), "Invalid artifact path");
      requireThat2(!/^\.env(?:\.|$)/i.test(basename(path)), "Environment file in artifact");
      if (stat.isDirectory()) {
        await visit(path);
        continue;
      }
      requireThat2(stat.isFile() && stat.nlink === 1, "Regular non-shared artifact file required");
      requireThat2(files.length < 1e5 && (totalBytes += stat.size) <= 8 * 1024 ** 3, "Artifact resource limit exceeded");
      const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
      try {
        const before = await handle.stat();
        requireThat2(before.ino === stat.ino && before.dev === stat.dev && before.size === stat.size, "Artifact changed while opening");
        const hash = createHash3("sha256");
        for await (const bytes of handle.createReadStream({ autoClose: false })) hash.update(bytes);
        const after = await handle.stat();
        requireThat2(after.size === before.size && after.mtimeMs === before.mtimeMs && after.ctimeMs === before.ctimeMs, "Artifact changed while hashing");
        files.push({ path: key, size: before.size, sha256: hash.digest("hex"), executable: (before.mode & 73) !== 0 });
      } finally {
        await handle.close();
      }
    }
  }
  await visit(root);
  files.sort((a, b) => Buffer.compare(Buffer.from(a.path), Buffer.from(b.path)));
  requireThat2(files.length > 0 && files.some((file) => file.path === "config.json"), "Build Output API configuration missing");
  const filePaths = new Set(files.map((file) => file.path));
  for (const file of files.filter((item) => basename(item.path) === ".vc-config.json")) {
    const functionConfig = JSON.parse(await readFile(join(root, file.path), "utf8"));
    if (functionConfig.filePathMap === void 0) continue;
    requireThat2(functionConfig.filePathMap !== null && typeof functionConfig.filePathMap === "object" && !Array.isArray(functionConfig.filePathMap), "Invalid function dependency map");
    for (const dependency of Object.values(functionConfig.filePathMap)) {
      requireThat2(typeof dependency === "string" && dependency.startsWith(".vercel/output/") && !dependency.includes("\\") && !dependency.split("/").includes(".."), "Function dependency outside standalone output; build with --standalone");
      const key = dependency.slice(".vercel/output/".length);
      requireThat2(filePaths.has(key), "Function dependency missing from artifact");
    }
  }
  aliases.sort((a, b) => Buffer.compare(Buffer.from(a.path), Buffer.from(b.path)));
  const manifest = { version: aliases.length ? 2 : 1, releaseSha, target: "production", files, ...aliases.length ? { aliases } : {} };
  return { manifest, artifactSha256: digest(JSON.stringify(manifest)), fileCount: files.length, totalBytes };
}

// infrastructure/release-custody/owner-gate/prepare-artifact.mjs
var execute = promisify(execFile);
var requireThat3 = (value, message) => {
  if (!value) throw new Error(message);
};
async function downloadGithubArtifact({ evidence, destination, readToken, fetchImpl = fetch }) {
  requireThat3(/^\/repos\/[\w.-]+\/[\w.-]+\/actions\/artifacts\/[1-9][0-9]*\/zip$/.test(evidence.downloadPath) && /^[a-f0-9]{64}$/.test(evidence.archiveSha256), "Verified provider artifact locator required");
  const token = await readToken();
  requireThat3(typeof token === "string" && token.length > 0, "Private source read credential missing");
  let response = await fetchImpl(`https://api.github.com${evidence.downloadPath}`, { redirect: "manual", signal: AbortSignal.timeout(3e4), headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json" } });
  for (let redirects = 0; [301, 302, 303, 307, 308].includes(response.status); redirects++) {
    requireThat3(redirects < 4, "Too many artifact redirects");
    const location = new URL(response.headers.get("location"));
    requireThat3(location.protocol === "https:" && !location.username && !location.password && !location.port && [".blob.core.windows.net", ".actions.githubusercontent.com", ".githubusercontent.com"].some((suffix) => location.hostname.endsWith(suffix)), "Untrusted artifact storage redirect");
    response = await fetchImpl(location.href, { redirect: "manual", signal: AbortSignal.timeout(3e5), headers: { accept: "application/octet-stream" } });
  }
  requireThat3(response.status === 200 && response.body, "Artifact download failed");
  const limit = 8 * 1024 ** 3;
  requireThat3(Number(response.headers.get("content-length") ?? 0) <= limit, "Artifact exceeds resource limit");
  const file = await open2(destination, "wx", 384), hash = createHash4("sha256");
  let bytes = 0;
  try {
    for await (const chunk of response.body) {
      requireThat3((bytes += chunk.length) <= limit, "Artifact exceeds resource limit");
      hash.update(chunk);
      await file.writeFile(chunk);
    }
  } finally {
    await file.close();
  }
  requireThat3(bytes > 0 && hash.digest("hex") === evidence.archiveSha256, "Provider archive digest mismatch");
  return destination;
}
async function prepareArtifactForAttestation({ policy, request, workRoot, readJson, readToken, fetchImpl, pythonPath = "/usr/bin/python3" }) {
  requireThat3(isAbsolute2(workRoot) && isAbsolute2(pythonPath), "Trusted absolute preparer paths required");
  const evidence = await createGithubArtifactReader({ policy, readJson })(request);
  const archive = join2(workRoot, "provider-artifact.zip"), unpacked = join2(workRoot, "unpacked");
  await downloadGithubArtifact({ evidence, destination: archive, readToken, fetchImpl });
  const extractor = fileURLToPath(new URL("./unpack-prebuilt.py", import.meta.url));
  try {
    await execute(pythonPath, [extractor, archive, unpacked, evidence.archiveSha256], { timeout: 3e5, maxBuffer: 1024 * 1024, env: { PATH: "/usr/bin:/bin", HOME: workRoot } });
  } catch {
    throw new Error("Private artifact extraction refused");
  }
  const manifestPath = join2(unpacked, "manifest.json"), raw = await readFile2(manifestPath, "utf8");
  const actual = await inspectPrebuiltArtifact({ outputRoot: join2(unpacked, "output"), releaseSha: evidence.releaseSha });
  requireThat3(raw === JSON.stringify(actual.manifest), "Build manifest differs from verified complete output");
  return { ...evidence, manifestPath, outputRoot: join2(unpacked, "output"), artifactSha256: digest(raw) };
}
export {
  downloadGithubArtifact,
  prepareArtifactForAttestation
};
