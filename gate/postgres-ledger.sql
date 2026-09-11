-- Install only in the protected release-control database, never the app DB.
-- The installer owns this schema. The runtime gets EXECUTE only (grants are
-- separate enrollment configuration); it must not own these objects/role.
CREATE SCHEMA release_gate;
REVOKE ALL ON SCHEMA release_gate FROM PUBLIC;

CREATE TABLE release_gate.claims (
  claim_key text PRIMARY KEY,
  target text NOT NULL,
  release_sha text NOT NULL CHECK (release_sha ~ '^[a-f0-9]{40}$'),
  bundle_hash text NOT NULL CHECK (bundle_hash ~ '^[a-f0-9]{64}$'),
  nonce text NOT NULL UNIQUE CHECK (nonce ~ '^[a-f0-9]{64}$'),
  evidence_hash text NOT NULL CHECK (evidence_hash ~ '^[a-f0-9]{64}$'),
  approval_hash text NOT NULL CHECK (approval_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  status text NOT NULL DEFAULT 'CONSUMED' CHECK (status IN ('CONSUMED','DEPLOYED'))
);
CREATE TABLE release_gate.leases (
  target text PRIMARY KEY,
  claim_key text NOT NULL UNIQUE REFERENCES release_gate.claims(claim_key)
);
CREATE TABLE release_gate.audit (
  claim_key text NOT NULL REFERENCES release_gate.claims(claim_key),
  event text NOT NULL CHECK (event IN ('CONSUMED','DEPLOYED')),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  detail jsonb NOT NULL,
  PRIMARY KEY (claim_key, event)
);

CREATE FUNCTION release_gate.consume(
  p_key text, p_target text, p_sha text, p_bundle text, p_nonce text,
  p_evidence text, p_approval text, p_issued timestamptz, p_expires timestamptz
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, release_gate AS $$
BEGIN
  IF p_issued IS NULL OR p_expires IS NULL OR p_issued > clock_timestamp()
     OR p_expires <= clock_timestamp() OR p_expires <= p_issued
     OR p_expires - p_issued > interval '15 minutes' THEN
    RETURN false;
  END IF;
  INSERT INTO release_gate.claims(claim_key,target,release_sha,bundle_hash,nonce,evidence_hash,approval_hash,expires_at)
    VALUES(p_key,p_target,p_sha,p_bundle,p_nonce,p_evidence,p_approval,p_expires);
  -- No TTL and no automatic takeover. Uncertain deployments retain the lease.
  INSERT INTO release_gate.leases(target,claim_key) VALUES(p_target,p_key);
  INSERT INTO release_gate.audit(claim_key,event,detail)
    VALUES(p_key,'CONSUMED',jsonb_build_object('bundleSha256',p_bundle,'evidenceSha256',p_evidence,'approvalSha256',p_approval));
  RETURN true;
EXCEPTION WHEN unique_violation THEN
  -- PL/pgSQL exception block rolls back ALL inserts, including the claim.
  RETURN false;
END;
$$;

CREATE FUNCTION release_gate.finish(p_key text, p_target text, p_sha text, p_receipt jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, release_gate AS $$
BEGIN
  IF p_receipt IS NULL OR p_receipt->>'releaseSha' IS DISTINCT FROM p_sha
    OR p_receipt->>'environment' IS DISTINCT FROM 'production'
    OR COALESCE(p_receipt->>'deploymentId','') !~ '^dpl_[A-Za-z0-9]+$' THEN
    RETURN false;
  END IF;
  PERFORM 1 FROM release_gate.leases WHERE target=p_target AND claim_key=p_key FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE release_gate.claims SET status='DEPLOYED'
    WHERE claim_key=p_key AND target=p_target AND release_sha=p_sha AND status='CONSUMED';
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO release_gate.audit(claim_key,event,detail) VALUES(p_key,'DEPLOYED',p_receipt);
  DELETE FROM release_gate.leases WHERE target=p_target AND claim_key=p_key;
  RETURN true;
END;
$$;

REVOKE ALL ON ALL TABLES IN SCHEMA release_gate FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA release_gate FROM PUBLIC;
