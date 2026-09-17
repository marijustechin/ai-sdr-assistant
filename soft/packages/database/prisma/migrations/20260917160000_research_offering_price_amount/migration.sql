-- Minimal structured support for price extrema in the research Summary.
--
-- `research_offerings.priceText` preserves the source's verbatim wording and is
-- never parsed. This optional numeric amount is recorded only when the source
-- states a number on the same basis (currency/unit/VAT already captured by the
-- existing enums). Null means "not recorded numerically".
--
-- Additive and reversible: existing rows keep `price_amount_numeric = NULL`.
-- Ownership stays with `evidence`.

ALTER TABLE "research_offerings" ADD COLUMN "price_amount_numeric" DECIMAL(18, 6);
