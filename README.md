# Protected prebuilt release configuration

This directory prepares the separate control-repository integration. It is not an active release workflow. `enrollment.pending.json` deliberately has `enabled: false`, no deployment credentials, and null unestablished identities/evidence. Never fill those entries with the existing coding owner's identity merely to make validation pass.

## Execution boundaries

1. **Build:** immutable reviewed source and locked dependencies in an isolated job. No owner, attestation, release-ledger, production database or deployment credentials. Use `vercel build --prod --standalone`; preserve route-count and both Prisma-client engine verification. Materialize all referenced files and hash the complete output. Keep private application artifacts in private storage.
2. **Attest:** a different fresh managed runner, using reviewed control code only. Independently verify source workflow/run identity and exact commit, then verify the materialized output/manifest. Only this job receives GitHub OIDC attestation capability. Never execute, source or import candidate build output in this job. Public attestation may expose artifact digests and public gate identity, not private application contents.
3. **Prepare approval:** freeze the bundle, artifact digest, source SHA, current healthy baseline, migration hashes, target, nonce and 15-minute expiration. Display exact SHA and bundle hash in the native release-run title. Bot dispatch only; the owner approves through the native environment review UI.
4. **Execute:** protected environment on the reviewed main branch, sole approval-only owner, self-review prevention and administrator bypass disabled. Verify provider review, managed artifact attestation and fresh technical evidence; atomically consume approval and production lease; upload a private verified standalone artifact copy. No build/install commands or inherited development login. Verify live deployment, artifact metadata, alias, health and migration state before committing the receipt.
5. **Uncertain outcome:** hold the lease, inspect actual provider state, and reconcile. Never automatically retry a consumed approval or silently substitute a rebuilt artifact. Application rollback is limited to the recorded healthy deployment with identical model schemas and unchanged migration ledger. A different rollback target or changed schema needs a new reviewed authorization.

## Account cutover

A separate reviewer account is insufficient while engineering remains administrator of control code, policies or deployment credentials. The selected identity arrangement must remove that administration from normal coding credentials before activation. The current bootstrap owner still has that administration; live enforcement is not proven.

A new approval account may own the control repository without having any Cadenza application development role. Alternatively, the current human account can become approval-only if all coding access is replaced by a separately scoped automation identity and its owner credentials are revoked from the coding boundary. Do not enroll either arrangement until actual provider denial tests pass. Do not ask the owner for a token, password, private key or command.

Before choosing a second free personal GitHub account, check account eligibility: GitHub's current account terms allow one free personal account per person plus an exclusively automated machine account. Do not label a human approval identity a machine account. Current account plan was not returned by the available API, so no free second-personal-account entitlement is established. This does not require AWS or another human.

## Enabling evidence

- Separate actual actor IDs and strong owner authentication; owner login/recovery unavailable to coding.
- Coding cannot approve as owner, change protected control policies, or reach deployment secrets.
- Coding connectors exclude control administration; source-repository deployment secrets and direct provider bypass credentials are retired.
- Missing, wrong-SHA, modified, expired and replayed approvals fail; old signer identities fail.
- Real owner approves one safe exact-artifact rehearsal, and exactly one operation succeeds.
- Full Cadenza standalone packaging passes; live trusted provenance is verified; recovery baseline and ledger checks pass.

The `github-permissions.mjs` probe uses the tested engineering credentials and a dedicated empty probe environment, never attempts to weaken the actual production environment. A success response to the probe is a failed security test. Fixture tests are not live permission evidence.

Sources: [GitHub account terms](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service#3-account-requirements), [GitHub attestation verification](https://cli.github.com/manual/gh_attestation_verify), [Vercel build](https://vercel.com/docs/cli/build).

## Prepared distribution and rehearsal

`package-control.mjs` writes only an explicit allowlist of reviewed bundled gate modules, locked upload tooling, three workflow templates and disabled enrollment to a new review directory. It does not install workflows or change repository protection. Its distribution manifest records every copied file digest. The source packaging CI also executes the distributed entry point and requires an unenrolled denial.

`request-release.yml` dispatches as GitHub's managed automation identity. `owner-release.yml` waits for native owner approval of the exact SHA/bundle title. Rehearsal downloads and verifies the actual private artifact and managed attestation without deployment, database or ledger credentials. Its receipt explicitly claims only owner-approval/artifact rehearsal. Actual production permission tests and durable replay enforcement remain required before enabling deployment.

`OWNER_GATE_SHA` is an external protected-environment pin: a commit cannot contain its own hash. Changing that pin is a control-policy change and must be inaccessible to engineering. A reviewed enrollment must also pin the builder workflow, upload-toolchain lockfile, production observer policy and dedicated ledger endpoint/runtime role. Null entries are deliberate denials, never defaults to the coding identity.
