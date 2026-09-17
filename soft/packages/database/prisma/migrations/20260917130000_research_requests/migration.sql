-- Research request flow: persist validated operator request parameters on the
-- run and enforce idempotency so a double-click/retry cannot create duplicates.
--
-- Additive and reversible: existing runs keep `request_parameters = NULL` and
-- `request_key = NULL`; `research_runs` ownership stays with `market-researcher`.

ALTER TABLE "research_runs" ADD COLUMN "request_parameters" JSONB;
ALTER TABLE "research_runs" ADD COLUMN "request_key" VARCHAR(120);

CREATE UNIQUE INDEX "research_runs_request_key_key" ON "research_runs"("request_key");
