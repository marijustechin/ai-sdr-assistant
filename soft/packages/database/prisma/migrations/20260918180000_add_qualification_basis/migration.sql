-- Bounded loophole fix: remember the basis (evidence/claim) an agent
-- qualification rested on, so that a later material provenance change makes the
-- prior qualification stale instead of silently re-validating it when a lead is
-- re-submitted with a replacement claim.
--
-- Additive and reversible. Owner: `lead-discoverer`.
-- Rollback:
--   ALTER TABLE "opportunity_companies"
--     DROP COLUMN "agent_qualification_claim_id",
--     DROP COLUMN "agent_qualification_evidence_id";

ALTER TABLE "opportunity_companies"
  ADD COLUMN "agent_qualification_evidence_id" UUID,
  ADD COLUMN "agent_qualification_claim_id" UUID;
