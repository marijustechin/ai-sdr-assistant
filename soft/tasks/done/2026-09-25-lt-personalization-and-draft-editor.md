# Task: Lithuanian personalization + human draft editor

**Status:** READY_FOR_HUMAN_REVIEW
**Completed:** 2026-09-25
**Owner:** implementation agent (`soft/AGENTS.md`)

## Objective

Make Lithuanian (an initial live market) first-contact copy evidence-personalized
with a bounded deterministic renderer (not a generic fallback, no machine
translation), and add a compact human review/edit UI for the materialized draft
(subject + canonical body only; signature read-only; new append-only version;
no sending).

## Completion record

### LT observation renderer (`domain/content.ts`)

- `naturalizeObservation(observed, language)` now supports a **bounded** English
  and **Lithuanian** set: `sells`→"prekiaujate", `offers`→"siūlote",
  `supplies`→"tiekiate", `manufactures`/`produces`/`makes`/`fabricates`→"gaminate/
  gaminote", `builds`→"statote", `distributes`→"platinate", `imports`/`exports`,
  `installs`→"montuojate", `designs`→"projektuojate", `provides`→"teikiate",
  `sources`→"tiekiate", `uses`→"naudojate", `works with`→"dirbate su",
  `deals in`→"prekiaujate", `… is a/an …`→"esate …". Anything outside the set
  returns null. No unrestricted machine translation.
- English unchanged ("you sell …"); unsupported languages (lv/et) still fall back.
- **LT fallback** stays neutral ("Radau jūsų įmonę ir norėčiau pasiteirauti dėl
  bendradarbiavimo.") so the LT market never gets a generic-only opener when the
  pattern is supported, and never gets raw/unsafe phrasing otherwise.
- **Names vs categories:** official offer/product names are kept verbatim; the
  internal (often English) product category is surfaced only by the English
  scaffold and only when it adds information — it is never injected into
  Lithuanian prose.
- LT wording reviewed for natural business Lithuanian.

### Human draft editor

- New `features/manage-outreach-draft/` (api + actions + payload + client editor
  + server review section). The lead page renders `OutreachDraftReview`.
- Edit **subject + canonical body** only; `body`/`htmlBody` are never
  independently editable. The structured signature is shown read-only (with a
  note that the closing phrase is generated per language). The current version +
  ready-for-review badge are shown; save calls the revision endpoint and appends
  a new version (previous versions preserved). **No send action.**

### Tests / verification

- Contracts **78** (revision schema accepts subject/canonical body; rejects
  empty and rejects `body`/`htmlBody` fields).
- API **219** (LT naturalization + LT fallback + official-name preservation +
  no category leak; plus all prior first-contact + canonical/derived tests).
- Web **176** (`buildRevisionPayload` sends only subject+canonicalBody and trims;
  never body/htmlBody).
- Database **17**; contracts/API/web typecheck clean; API/web lint clean; web
  build exit 0; `verify-docs` 37/0; `verify.sh` 61/0; `git diff --check` exit 0.

### Known limitations

- The LT renderer rewrites the verb frame only; the observation's object wording
  is kept as stored (no translation), so a mostly-English observation yields a
  mixed-language clause — acceptable and preferred over unsafe translation.
- lv/et still use the neutral fallback (no renderer yet).
