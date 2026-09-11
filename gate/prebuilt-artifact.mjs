import { createRequire } from "node:module"; const require = createRequire(import.meta.url);

// infrastructure/release-custody/owner-gate/prebuilt-artifact.mjs
import { lstat, readdir, open, realpath, readFile, readlink } from "node:fs/promises";
import { join, relative, basename, resolve, dirname, isAbsolute } from "node:path";
import { constants } from "node:fs";
import { createHash as createHash2 } from "node:crypto";

// infrastructure/release-custody/owner-gate/core.mjs
import { createHash } from "node:crypto";

// scripts/lib/release-custody-revocations.mjs
var RETIRED_RELEASE_SIGNERS = Object.freeze([
  "4c35b68005859dfaf5fe4d6d490210bfa4932448caf5513481dc0f53ff480e15",
  "4d27c948719d3a9c439a86f0728ce441374e148bb7ee2c1373546ecf2e004775"
]);

// infrastructure/release-custody/owner-gate/core.mjs
var digest = (value) => createHash("sha256").update(value).digest("hex");

// infrastructure/release-custody/owner-gate/prebuilt-artifact.mjs
var requireThat = (value, message) => {
  if (!value) throw new Error(message);
};
async function inspectPrebuiltArtifact({ outputRoot, releaseSha }) {
  requireThat(/^[a-f0-9]{40}$/.test(releaseSha), "Exact artifact source required");
  const rootStat = await lstat(outputRoot);
  requireThat(rootStat.isDirectory() && !rootStat.isSymbolicLink(), "Materialized artifact root required");
  const root = await realpath(outputRoot), files = [], aliases = [];
  let totalBytes = 0;
  async function visit(directory) {
    for (const name of await readdir(directory)) {
      const path = join(directory, name), stat = await lstat(path);
      const key = relative(root, path).split("\\").join("/");
      if (stat.isSymbolicLink()) {
        const link = await readlink(path);
        const target = resolve(dirname(path), link), targetKey = relative(root, target).split("\\").join("/");
        requireThat(/^functions\/.+\.func$/.test(key) && /^functions\/.+\.func$/.test(targetKey) && !isAbsolute(link) && !link.includes("\\") && !/[\u0000-\u001f\u007f]/.test(link) && !targetKey.split("/").includes(".."), "Artifact symlink must be an internal function alias");
        const targetStat = await lstat(target);
        requireThat(targetStat.isDirectory() && !targetStat.isSymbolicLink() && await realpath(target) === target, "Artifact symlink target must be canonical, not chained");
        requireThat((await lstat(join(target, ".vc-config.json"))).isFile(), "Function alias configuration missing");
        requireThat(aliases.length < 1e5, "Too many function aliases");
        aliases.push({ path: key, link });
        continue;
      }
      requireThat(!key.startsWith("../") && !/[\u0000-\u001f\u007f]/.test(key) && !name.includes("\\"), "Invalid artifact path");
      requireThat(!/^\.env(?:\.|$)/i.test(basename(path)), "Environment file in artifact");
      if (stat.isDirectory()) {
        await visit(path);
        continue;
      }
      requireThat(stat.isFile() && stat.nlink === 1, "Regular non-shared artifact file required");
      requireThat(files.length < 1e5 && (totalBytes += stat.size) <= 8 * 1024 ** 3, "Artifact resource limit exceeded");
      const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
      try {
        const before = await handle.stat();
        requireThat(before.ino === stat.ino && before.dev === stat.dev && before.size === stat.size, "Artifact changed while opening");
        const hash = createHash2("sha256");
        for await (const bytes of handle.createReadStream({ autoClose: false })) hash.update(bytes);
        const after = await handle.stat();
        requireThat(after.size === before.size && after.mtimeMs === before.mtimeMs && after.ctimeMs === before.ctimeMs, "Artifact changed while hashing");
        files.push({ path: key, size: before.size, sha256: hash.digest("hex"), executable: (before.mode & 73) !== 0 });
      } finally {
        await handle.close();
      }
    }
  }
  await visit(root);
  files.sort((a, b) => Buffer.compare(Buffer.from(a.path), Buffer.from(b.path)));
  requireThat(files.length > 0 && files.some((file) => file.path === "config.json"), "Build Output API configuration missing");
  const filePaths = new Set(files.map((file) => file.path));
  for (const file of files.filter((item) => basename(item.path) === ".vc-config.json")) {
    const functionConfig = JSON.parse(await readFile(join(root, file.path), "utf8"));
    if (functionConfig.filePathMap === void 0) continue;
    requireThat(functionConfig.filePathMap !== null && typeof functionConfig.filePathMap === "object" && !Array.isArray(functionConfig.filePathMap), "Invalid function dependency map");
    for (const dependency of Object.values(functionConfig.filePathMap)) {
      requireThat(typeof dependency === "string" && dependency.startsWith(".vercel/output/") && !dependency.includes("\\") && !dependency.split("/").includes(".."), "Function dependency outside standalone output; build with --standalone");
      const key = dependency.slice(".vercel/output/".length);
      requireThat(filePaths.has(key), "Function dependency missing from artifact");
    }
  }
  aliases.sort((a, b) => Buffer.compare(Buffer.from(a.path), Buffer.from(b.path)));
  const manifest = { version: aliases.length ? 2 : 1, releaseSha, target: "production", files, ...aliases.length ? { aliases } : {} };
  return { manifest, artifactSha256: digest(JSON.stringify(manifest)), fileCount: files.length, totalBytes };
}
async function verifyApprovedPrebuiltArtifact({ outputRoot, bundle }) {
  requireThat(bundle?.version === 2 && /^[a-f0-9]{64}$/.test(bundle.artifactSha256), "Artifact-bound approval required; legacy bundle refused");
  const result = await inspectPrebuiltArtifact({ outputRoot, releaseSha: bundle.releaseSha });
  requireThat(result.artifactSha256 === bundle.artifactSha256, "Prebuilt artifact differs from approved bundle");
  return result;
}
export {
  inspectPrebuiltArtifact,
  verifyApprovedPrebuiltArtifact
};
