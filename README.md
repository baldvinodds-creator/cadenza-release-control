# Automated Cadenza production release gate

Governance: **one owner/admin authority plus automated fail-closed release safety**. There is no independent human authorization, second custodian, separate approval account, manual PR-review prerequisite, or recurring owner release ceremony. The existing owner account remains the ultimate administrator and can administer this repository. GitHub automation and environment isolation are technical controls, not independent human custody.

## Release path

1. The private source repository builds the exact intended main SHA with locked dependencies, isolated test configuration and public production build settings. Application build code receives no production credentials. Required source CI includes typecheck, unit/integration tests, production build, browser smoke and migration drift checks.
2. A fresh managed control runner verifies the pinned source builder, successful first-attempt build, private archive digest, complete prebuilt manifest and source SHA. It executes no candidate application code. GitHub-managed OIDC provenance signs the manifest; no release private key is created or handled locally.
3. A canonical request binds source SHA, artifact hash, healthy baseline deployment, exact migration ledger/checksum manifest, CI run, target, nonce and a 15-minute expiration. The workflow run title binds the exact SHA and bundle hash. The dispatcher records an automated request, not a human approval.
4. The protected executor verifies the exact control SHA, protected main environment, artifact provenance, fresh source CI, production target, schema/migrations/runtime privileges and recovery baseline. A restricted PostgreSQL ledger atomically consumes the release request and target lease. Missing, stale, replayed, changed or mismatched evidence is denied.
5. Only verified prebuilt output is uploaded. The gate checks the actual deployment, source/artifact metadata, production alias, health and migration state and records the resulting receipt. An uncertain outcome is never automatically replayed or unlocked.

Production credentials are stored only in the protected `owner-release` environment. That name is historical: it has no required human reviewers. The source-read credential is an existing owner OAuth credential used by allowlisted read-only clients; it is not a separate or provider-enforced read-only identity. The deployment credential is the existing Cadenza GitHub deployment secret, transferred encrypted directly to this environment. These permissions operate under the explicitly accepted single-admin model.

## Evidence and operation

- Credential-free managed rehearsal: run **34602816783**, artifact **10265380407**, source **d43169090f80055ea8cc4b07e244a30d0367e76b**, artifact manifest **9f6a80b91d6afb2d3ab8cae043aef8599e3372781f4e65f8e618860c749c51d0**. Receipt states `humanReleaseReview: false` and `deploymentPerformed: false`.
- 214 local gate tests pass. Live CLI verification accepts the real managed attestation and denies wrong control/source SHA and modified artifact hash. Live restricted-ledger tests deny direct writes, schema creation, replay, expiry and mismatched receipts; their transaction was rolled back.
- Credential relocation: private source workflow **34603205907** verifies the existing token against the exact Cadenza project, seals it with this environment's GitHub public key, and emits only ciphertext. No build or deployment is performed.
- `OWNER_GATE_SHA` pins the exact control commit externally, avoiding a self-referential commit hash. It must match the managed attester and protected executor. Configuration and gate changes go through required automated control CI. `distribution-manifest.json` detects changes to packaged components.

Audit records distinguish workflow-run approval, code-review approval, automated gate success and actual deployment. Neither a green CI run nor a rehearsal is a production deployment receipt.

## Historical custody and recovery

The former dual-custodian design was bypassed. Its two known affected September 2/10 releases remain inventoried in the source incident record. Old signer identities are permanently rejected; original evidence is not rewritten. The working historical production deployment is preserved until the automated path verifies its replacement.

This gate permits migration-free application releases only. Schema/data mutations require their own integrity and preservation assessment, including a specific owner confirmation if unusually destructive or irreversible. Rollback uses a verified known deployment and schema-compatible baseline through the same technical controls; an uncertain lease or outcome requires investigation before another request. Rotation replaces provider-managed credentials through supported secret-management APIs, updates the reviewed public/configuration pins where applicable, and retains historical receipts. The owner never handles release private keys.
