# Research API write tooling

Manager-environment tooling for writing research records to the internal API
**without corrupting non-ASCII text**. This is the canonical write path for the
market researcher (see `docs/system/research-harness/` and
`docs/system/research-toolchain.md` §8).

## Why

On Windows PowerShell 5.1, `Invoke-RestMethod -Body <string>` encodes the body
through `[Text.Encoding]::Default` (Windows-1252) using .NET **best-fit**
fallback, silently destroying non-CP1252 characters — reproduced 2026-09-17:
Lithuanian `ė` (U+0117) was transmitted as ASCII `e` (0x65), and a BOM-less
`.ps1` is read as CP1252 before it ever runs. `ResearchApi.psm1` always sends
UTF-8 **bytes** with an explicit `charset=utf-8` and decodes responses as UTF-8
bytes.

## Files

| File | Purpose |
|---|---|
| `ResearchApi.psm1` | The helper: `Write-ResearchJson` (POST/PATCH/PUT) and `Get-ResearchJson`. ASCII-only, so it is correct with or without a BOM. |
| `Test-ResearchWriteEncoding.ps1` | End-to-end verification: input -> request -> API -> database -> API read, for Lithuanian and Finnish text. |
| `fixtures/research-write-encoding.json` | UTF-8 fixture containing the LT/FI strings (including `ė š ū ä ö € — ²`). |

## Usage

Execution policy on this host is **Restricted**, so invoke scripts with
`-ExecutionPolicy Bypass` — a **process-scoped** override for that invocation
only. Never change the machine- or user-scope execution policy:

```powershell
# Interactive: import the helper once.
powershell -NoProfile -ExecutionPolicy Bypass -Command "Import-Module .\scripts\research\ResearchApi.psm1; Write-ResearchJson -Uri 'http://localhost:3004/products' -ApiKey $env:INTERNAL_API_KEY -Body @{ name = 'Abachi' }"
```

From another PowerShell script, follow the same pattern as the driver: keep the
script **ASCII-only**, read non-ASCII text from a UTF-8 file (or build it from
code points), and pass it as an object to `Write-ResearchJson` (or as a UTF-8
JSON file with `-BodyFile`).

### Load input as UTF-8 (required)

Sending bytes correctly **cannot repair an input string that was already
corrupted when it was read**. Always load non-ASCII input explicitly as UTF-8:

- `[System.IO.File]::ReadAllText($path, (New-Object System.Text.UTF8Encoding($false)))`,
- `Get-Content -Raw -Encoding UTF8`, or
- values built from code points (`[char]0x0117`).

Never rely on the default ANSI/CP1252 reading of non-ASCII literals in a
BOM-less `.ps1` (the module reads `-BodyFile` as UTF-8 for you). The verification
driver asserts the expected characters are present in the input *before* sending,
so a mis-loaded input fails loudly instead of being stored corrupted.

## Verification (isolated database only)

The driver refuses to run against `:3003` (the real research database).

```powershell
# 1. Truncate the isolated test database, e.g. ai_sdr_test_api.
# 2. Start an API instance pointed at it, e.g. PORT=3004 and
#    DATABASE_URL=postgresql://ai_sdr:ai_sdr_dev@localhost:54329/ai_sdr_test_api?schema=public
# 3. Run the driver:
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\research\Test-ResearchWriteEncoding.ps1 `
  -BaseUrl http://localhost:3004 -ApiKey $env:INTERNAL_API_KEY
```

A `PASS` line means the LT/FI strings round-tripped byte-exactly with no
`U+FFFD`. The test creates only the throwaway product/offer/opportunity/run it
needs, in the isolated database.
