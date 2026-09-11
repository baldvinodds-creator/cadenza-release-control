import { createRequire } from "node:module"; const require = createRequire(import.meta.url);

// infrastructure/release-custody/owner-gate/vercel-prebuilt.mjs
import { mkdtemp, mkdir, cp, writeFile, rm } from "node:fs/promises";
import { join as join2, isAbsolute } from "node:path";
import { tmpdir } from "node:os";
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
var requireThat = (condition, message) => {
  if (!condition) throw new Error(message);
};
var hex = (value, size) => typeof value === "string" && new RegExp(`^[a-f0-9]{${size}}$`).test(value);
var fields = ["version", "mode", "repository", "releaseSha", "projectId", "teamId", "environment", "baselineSha", "baselineDeploymentId", "ledgerSha256", "manifestSha256", "ciRunId", "policyVersion", "issuedAt", "expiresAt", "nonce"];
function parseBundle(raw, policy, now) {
  requireThat(typeof raw === "string" && Buffer.byteLength(raw) <= 16384, "Invalid bundle size");
  const bundle = JSON.parse(raw);
  const wireFields = bundle?.version === 2 ? [...fields, "artifactSha256"] : fields;
  requireThat(bundle && Object.keys(bundle).sort().join(",") === [...wireFields].sort().join(","), "Unexpected bundle fields");
  requireThat(JSON.stringify(Object.fromEntries(wireFields.map((key) => [key, bundle[key]]))) === raw, "Noncanonical bundle");
  requireThat([1, 2].includes(bundle.version) && bundle.mode === (policy.governanceModel === "AUTOMATED_OWNER_POLICY" ? "AUTOMATED_MIGRATION_FREE" : "OWNER_APPROVED_MIGRATION_FREE"), "Unsupported authorization mode");
  if (bundle.version === 2) requireThat(hex(bundle.artifactSha256, 64), "Exact prebuilt artifact digest required");
  for (const key of ["repository", "projectId", "teamId", "environment", "policyVersion"]) {
    requireThat(bundle[key] === policy[key], `Wrong ${key}`);
  }
  requireThat(bundle.environment === "production", "Production target required");
  requireThat(hex(bundle.releaseSha, 40) && hex(bundle.baselineSha, 40), "Exact source SHA required");
  requireThat(hex(bundle.ledgerSha256, 64) && hex(bundle.manifestSha256, 64), "Migration digests required");
  requireThat(typeof bundle.baselineDeploymentId === "string" && /^dpl_[a-zA-Z0-9]+$/.test(bundle.baselineDeploymentId), "Baseline deployment required");
  requireThat(Number.isSafeInteger(bundle.ciRunId) && bundle.ciRunId > 0, "CI run required");
  requireThat(hex(bundle.nonce, 64), "Release nonce required");
  const issued = Date.parse(bundle.issuedAt), expires = Date.parse(bundle.expiresAt);
  requireThat(Number.isFinite(issued) && Number.isFinite(expires) && new Date(issued).toISOString() === bundle.issuedAt && new Date(expires).toISOString() === bundle.expiresAt, "Canonical timestamps required");
  requireThat(issued <= now && now < expires && expires - issued > 0 && expires - issued <= 15 * 6e4, "Approval expired or invalid window");
  return Object.freeze(bundle);
}

// infrastructure/release-custody/owner-gate/prebuilt-artifact.mjs
import { lstat, readdir, open, realpath, readFile } from "node:fs/promises";
import { join, relative, basename } from "node:path";
import { constants } from "node:fs";
import { createHash as createHash2 } from "node:crypto";
var requireThat2 = (value, message) => {
  if (!value) throw new Error(message);
};
async function inspectPrebuiltArtifact({ outputRoot, releaseSha }) {
  requireThat2(/^[a-f0-9]{40}$/.test(releaseSha), "Exact artifact source required");
  const rootStat = await lstat(outputRoot);
  requireThat2(rootStat.isDirectory() && !rootStat.isSymbolicLink(), "Materialized artifact root required");
  const root = await realpath(outputRoot), files = [];
  let totalBytes = 0;
  async function visit(directory) {
    for (const name of await readdir(directory)) {
      const path = join(directory, name), stat = await lstat(path);
      const key = relative(root, path).split("\\").join("/");
      requireThat2(!stat.isSymbolicLink(), `Artifact symlink refused: ${key}`);
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
        const hash = createHash2("sha256");
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
  const manifest = { version: 1, releaseSha, target: "production", files };
  return { manifest, artifactSha256: digest(JSON.stringify(manifest)), fileCount: files.length, totalBytes };
}
async function verifyApprovedPrebuiltArtifact({ outputRoot, bundle }) {
  requireThat2(bundle?.version === 2 && /^[a-f0-9]{64}$/.test(bundle.artifactSha256), "Artifact-bound approval required; legacy bundle refused");
  const result = await inspectPrebuiltArtifact({ outputRoot, releaseSha: bundle.releaseSha });
  requireThat2(result.artifactSha256 === bundle.artifactSha256, "Prebuilt artifact differs from approved bundle");
  return result;
}

// scripts/lib/production-deployment-verification.mjs
var ProductionDeploymentVerificationError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "ProductionDeploymentVerificationError";
  }
};
function fail(message) {
  throw new ProductionDeploymentVerificationError(message);
}
function parseJson(raw, context) {
  if (typeof raw !== "string" || raw.length === 0) fail(`${context} must be exact JSON`);
  try {
    return JSON.parse(raw);
  } catch {
    fail(`${context} must be exact JSON`);
  }
}
function parseVercelDeployJson(raw) {
  const parsed = parseJson(raw, "Vercel deploy --format=json output");
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    fail("Vercel deploy --format=json output is not a pinned v50.38.2 deployment object");
  }
  const isWrapper = parsed.deployment !== void 0 || parsed.status !== void 0;
  if (isWrapper && (parsed.status !== "ok" || !parsed.deployment || typeof parsed.deployment !== "object" || Array.isArray(parsed.deployment))) {
    fail("Vercel deploy --format=json output is not the pinned v50.38.2 success wrapper");
  }
  const deployment = isWrapper ? parsed.deployment : parsed;
  if (deployment.error !== void 0) fail("Vercel deploy --format=json output reports a deployment error");
  if (deployment.readyState !== void 0 && !/^(READY|QUEUED|BUILDING|INITIALIZING)$/.test(String(deployment.readyState))) {
    fail("Vercel deploy --format=json output reports a non-success ready state");
  }
  const { id, url, deploymentApiUrl } = deployment;
  if (typeof id !== "string" || !/^dpl_[A-Za-z0-9]+$/.test(id)) fail("Vercel deploy output deployment ID is invalid");
  let immutable;
  let api;
  try {
    immutable = new URL(url);
    api = new URL(deploymentApiUrl);
  } catch {
    fail("Vercel deploy output URLs are invalid");
  }
  if (immutable.protocol !== "https:" || immutable.username || immutable.password || immutable.port || immutable.pathname !== "/" || immutable.search || immutable.hash || !immutable.hostname.endsWith(".vercel.app")) fail("Vercel deploy output immutable URL is invalid");
  if (api.origin !== "https://api.vercel.com" || api.username || api.password || api.port || api.pathname !== `/v13/deployments/${id}` || api.search || api.hash) {
    fail("Vercel deploy output trusted deployment API URL is invalid");
  }
  return Object.freeze({ deploymentId: id, deploymentUrl: immutable.hostname, deploymentApiUrl: api.href });
}

// infrastructure/release-custody/owner-gate/vercel-prebuilt.mjs
var requireThat3 = (value, message) => {
  if (!value) throw new Error(message);
};
var execute = promisify(execFile);
function createPrebuiltCliRunner({ cliPath, readToken }) {
  requireThat3(isAbsolute(cliPath), "Absolute reviewed CLI path required");
  return async ({ cwd, home, args, beforeStart }) => {
    const token = await readToken();
    requireThat3(typeof token === "string" && token.length > 0, "Protected deployment credential missing");
    requireThat3(typeof beforeStart === "function", "Immediate approval-expiry check required");
    await beforeStart();
    const authPath = join2(home, "auth.json");
    await writeFile(authPath, JSON.stringify({ token }), { flag: "wx", mode: 384 });
    try {
      const { stdout } = await execute(process.execPath, [cliPath, ...args, "--global-config", home], {
        cwd,
        timeout: 6e5,
        maxBuffer: 1024 * 1024,
        env: {
          PATH: "/usr/local/bin:/usr/bin:/bin",
          HOME: home,
          TMPDIR: home,
          CI: "1",
          NO_COLOR: "1",
          VERCEL_TELEMETRY_DISABLED: "1"
        }
      });
      return stdout;
    } catch (error) {
      const output = typeof error?.stderr === "string" ? error.stderr : "";
      const classes = [
        ["NO_CREDENTIALS", /No existing credentials found/i],
        ["INVALID_TOKEN", /specified token is not valid/i],
        ["FILE_LIMIT", /too many files|15,000|15000|files.{0,50}limit/i],
        ["FUNCTION_SIZE", /function.{0,80}(size|exceed)|uncompressed.{0,50}limit/i],
        ["PREBUILT_CONFIGURATION", /prebuilt.{0,120}(environment|target|configuration)|node.{0,40}version/i],
        ["PERMISSION", /forbidden|not authorized|permission denied/i]
      ];
      console.error(`Prebuilt CLI failure class: ${error?.killed ? "TIMEOUT" : classes.find(([, pattern]) => pattern.test(output))?.[0] ?? "UNCLASSIFIED"}`);
      const diagnostic = output.split(/\r?\n/).map((line) => line.replace(/\x1b\[[0-9;]*m/g, "")).find((line) => line.startsWith("Error:"));
      if (diagnostic) console.error(`Prebuilt CLI diagnostic: ${diagnostic.split(token).join("[credential redacted]").replace(/https?:\/\/\S+/g, "[provider link]").replace(/["'`][^"'`]*["'`]/g, "[quoted value]").slice(0, 800)}`);
      throw new Error("Prebuilt upload failed or outcome is uncertain; inspect provider, do not retry approval");
    } finally {
      await rm(authPath, { force: true });
    }
  };
}
function createVercelPrebuiltDeployer({ policy: sourcePolicy, outputRoot, verifyProvenance, runCli, baseline, now = Date.now }) {
  const policy = structuredClone(sourcePolicy);
  requireThat3(/^prj_[A-Za-z0-9]+$/.test(policy.projectId) && /^team_[A-Za-z0-9]+$/.test(policy.teamId), "Pinned provider target required");
  requireThat3(typeof verifyProvenance === "function" && typeof runCli === "function", "Trusted provenance and upload adapters required");
  return {
    async deploy({ bundle, approval, beforePromotion }) {
      const raw = JSON.stringify(bundle);
      parseBundle(raw, policy, now());
      requireThat3(bundle.version === 2 && approval?.bundleSha256 === digest(raw) && approval.releaseSha === bundle.releaseSha && typeof beforePromotion === "function", "Exact consumed artifact approval required");
      const provenance = await verifyProvenance(bundle);
      requireThat3(provenance?.releaseSha === bundle.releaseSha && provenance.artifactSha256 === bundle.artifactSha256 && provenance.verified === true, "Trusted artifact provenance missing");
      await verifyApprovedPrebuiltArtifact({ outputRoot, bundle });
      const workspace = await mkdtemp(join2(tmpdir(), "cadenza-protected-upload-"));
      try {
        const cwd = join2(workspace, "project"), home = join2(workspace, "home");
        await mkdir(join2(cwd, ".vercel"), { recursive: true, mode: 448 });
        await mkdir(home, { mode: 448 });
        await cp(outputRoot, join2(cwd, ".vercel/output"), { recursive: true, dereference: false, errorOnExist: true, force: false });
        await verifyApprovedPrebuiltArtifact({ outputRoot: join2(cwd, ".vercel/output"), bundle });
        await writeFile(join2(cwd, ".vercel/project.json"), JSON.stringify({ orgId: policy.teamId, projectId: policy.projectId }), { flag: "wx", mode: 384 });
        await beforePromotion();
        await baseline(bundle);
        parseBundle(raw, policy, now());
        const args = [
          "deploy",
          "--prebuilt",
          "--archive=tgz",
          "--no-wait",
          "--prod",
          "--yes",
          "--format=json",
          "--scope",
          policy.teamId,
          "--meta",
          `githubCommitSha=${bundle.releaseSha}`,
          "--meta",
          `cadenzaArtifactSha256=${bundle.artifactSha256}`,
          "--meta",
          `cadenzaBundleSha256=${approval.bundleSha256}`
        ];
        const result = parseVercelDeployJson(await runCli({ cwd, home, args, beforeStart: () => parseBundle(raw, policy, now()) }));
        requireThat3(result.deploymentId !== bundle.baselineDeploymentId, "Provider returned baseline deployment");
        return { ...result, artifactSha256: bundle.artifactSha256 };
      } finally {
        await rm(workspace, { recursive: true, force: true });
      }
    }
  };
}
export {
  createPrebuiltCliRunner,
  createVercelPrebuiltDeployer
};
