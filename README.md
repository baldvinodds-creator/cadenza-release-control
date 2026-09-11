# Protected prebuilt release configuration

This directory prepares the separate control-repository integration. It is not an active release workflow. `enrollment.pending.json` deliberately has `enabled: false`, no deployment credentials, and null unestablished identities/evidence. Never fill those entries with the existing coding owner's identity merely to make validation pass.

## Execution boundaries

1. **Build:** immutable reviewed source and locked dependencies in an isolated job. No owner, attestation, release-ledger, production database or deployment credentials. Use `vercel build --prod --standalone`; preserve route-count and both Prisma-client engine verification. Materialize all referenced files and hash the complete output. Keep private application artifacts in private storage.
2. **Attest:** a different fresh managed runner, using reviewed control code only. Independently verify source workflow/run identity and exact commit, then verify the materialized output/manifest. Only this job receives GitHub OIDC attestation capability. Never execute, source or import candidate build output in this job. Public attestation may expose artifact digests and public gate identity, not private application contents.
3. **Prepare approval:** freeze the bundle, artifact digest, source SHA, current healthy baseline, migration hashes, target, nonce and 15-minute expiration. Display exact SHA and bundle hash in the native release-run title. Bot dispatch only; the owner approves through the native environment review UI.
4. **Execute:** protected environment on the reviewed main branch, sole approval-only owner, self-review prevention and administrator bypass disabled. Verify provider review, managed artifact attestation and fresh technical evidence; atomically consume approval and production lease; upload a private verified standalone artifact copy. No build/install commands or inherited development login. Verify live deployment, artifact metadata, alias, health and migration state before committing the receipt.
5. **Uncertain outcome:** hold the lease, inspect actual provider state, and reconcile. Never automatically retry a consumed approval or silently substitute a rebuilt artifact. Application rollback is limited to the recorded healthy deployment with identical model schemas and unchanged migration ledger. A different rollback target or changed schema needs a new reviewed authorization.

## Automated owner-controlled governance

The existing account `baldvinodds-creator` remains the sole owner/admin authority. Under the owner's explicit standing policy, routine migration-free releases require no separate human review, second account or release ceremony. This does not retroactively validate the historical dual-custody incident.

Every automated request must identify an enrolled owner or GitHub automation actor, the exact protected control commit, source SHA, artifact digest, target, policy version, nonce and expiration. The gate verifies current main CI/build success, production migration/schema/runtime integrity, managed build attestation, unchanged artifact bytes and a healthy exact rollback baseline. Atomic ledger consumption prevents replay and concurrent production mutation. New audit records explicitly state `AUTOMATED_OWNER_POLICY` and `humanReleaseReview: false`; they never invent an owner signature or manual approval.

Required CI status checks, protected control branches and disabled administrator bypass remain. Old signing identities remain rejected. Ordinary owner/admin authority is accepted and documented. Destructive data changes do not fit this migration-free path and require separate assessment and any specific owner confirmation warranted by the action.

No alternate deployment workflow is enabled by this configuration. Existing deployment holds remain until automated integration, artifact and provider verification pass. Production credentials are attached only to the protected executor environment; the isolated application build never receives them.

## Prepared distribution and rehearsal

`package-control.mjs` writes only an explicit allowlist of reviewed bundled gate modules, locked upload tooling, three workflow templates and disabled enrollment to a new review directory. It does not install workflows or change repository protection. Its distribution manifest records every copied file digest. The source packaging CI also executes the distributed entry point and requires an unenrolled denial.

`request-release.yml` dispatches as GitHub's managed automation identity. `owner-release.yml` waits for automated authorization of the exact SHA/bundle title. Rehearsal downloads and verifies the actual private artifact and managed attestation without deployment, database or ledger credentials. Its receipt explicitly claims only automated authorization/artifact rehearsal. Actual automated authorization denial tests and durable replay enforcement remain required before enabling deployment.

`OWNER_GATE_SHA` is an external protected-environment pin: a commit cannot contain its own hash. Changing that pin is a control-policy change and requires an explicit owner-controlled policy change. A reviewed enrollment must also pin the builder workflow, upload-toolchain lockfile, production observer policy and dedicated ledger endpoint/runtime role. Null entries are deliberate denials, never inferred release approvals.
