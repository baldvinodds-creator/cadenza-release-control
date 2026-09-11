# Cadenza release control

Bootstrap status: disabled; no production deployment credentials installed.

This repository is reserved for reviewed release-control software. Cadenza's owner is the sole human release approver. Approval must bind the exact source version and release bundle, followed by independent CI, artifact, migration, target, expiry and replay checks.

Creating this repository does not establish permission isolation. Owner credentials available to development sessions must be removed or restricted before production release is enabled. The production application remains under its existing release hold.

No application source, customer data, private signing keys or private incident evidence belongs in this public repository. Historical retired signing identities cannot authorize new releases.
