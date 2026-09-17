# Research Toolchain (Manager Operating Context)

**Status:** Canonical operating context for the root manager's research
capability. Records installed tools, authentication, selection rules, limits and
known limitations. It contains **no** live business state and **no** secrets.
**Companion:** `docs/benchmarks/2026-09-14-research-coverage-capability-test.md`
(non-canonical capability evidence), `docs/system/project-state.md`.

This documents the **manager's own** research tooling (the agent environment).
It does not describe or authorize application-module integrations; the
`market-researcher` / `lead-discoverer` modules remain unimplemented and would
obtain providers through implementation work under `soft/AGENTS.md`.

---

## 1. Environment

| Item | Value |
|---|---|
| OS | Windows 11 Pro (10.0.26200) |
| Shell | Windows PowerShell 5.1 (`npx.ps1` blocked by execution policy) |
| OpenCode | 1.18.30 desktop (`OPENCODE_CLIENT=desktop`), binary at `%LOCALAPPDATA%\Programs\@opencode-aidesktop\OpenCode.exe` |
| Node | v24.19.0 |
| Config | global `~/.config/opencode/opencode.jsonc` (project has none) |
| Providers | DeepSeek API auth only (`~/.local/share/opencode/auth.json`) |
| Pre-existing MCP | none |
| Key env | `OPENCODE_ENABLE_EXA=1` (enables built-in `websearch`) |

No provider, permission, or MCP setting that pre-existed was removed or weakened.

---

## 2. Installed tools

### 2.1 Exa websearch (built-in)

- Discovery engine; enabled by `OPENCODE_ENABLE_EXA=1`.
- Tool: `websearch`. Free MCP tier is rate-limited; retry once on the
  rate-limit notice.

### 2.2 webfetch (built-in)

- Retrieval tool for a specific URL. Returns page content as Markdown.
- Preferred first retrieval tool; may return incomplete content on JS-heavy or
  cookie-gated sites.

### 2.3 Firecrawl MCP (official, keyless)

- **Implementation:** official `firecrawl/firecrawl-mcp-server` (npm
  `firecrawl-mcp`); this configuration uses the **hosted keyless** endpoint.
- **URL:** `https://mcp.firecrawl.dev/v2/mcp` (`type: remote`, no credential).
- **Tools exposed keyless:** `firecrawl_search`, `firecrawl_scrape`,
  `firecrawl_parse`.
- **Verified in-session (2026-09-14):** the MCP tools (`firecrawl_search`,
  `firecrawl_scrape`, `firecrawl_parse`) are exposed to the agent inside the
  running OpenCode session. Real in-session calls: three `firecrawl_search`
  queries (UK/DE/FR); `firecrawl_scrape` of a JS/cookie-gated retailer (returned
  full product content where `webfetch` was incomplete) and of a 2-page PDF fiche
  technique (`parsers:["pdf"]`); plus two JSON-schema extractions. An earlier
  direct JSON-RPC probe returned `firecrawl-fastmcp 3.24.1`.
- **Auth upgrade (optional):** add `Authorization: Bearer {env:FIRECRAWL_API_KEY}`
  on the same URL for the full tool surface and higher limits. Not configured;
  no paid plan enabled.

### 2.4 Gemini Google Search MCP

- **Implementation:** `@houtini/gemini-mcp` (repo `houtini-ai/gemini-mcp`,
  Apache-2.0, Node 18+, npm v2.6.2, last pushed 2026-08-17).
- **Why this one:** it performs Google Search **grounding** (`google_search`
  tool) on by default via `gemini_chat` and `gemini_deep_research`, is actively
  maintained, runs on Node (already present), and works over stdio. The search
  request carries `GEMINI_DEFAULT_GROUNDING=true`.
- **Auth:** Google AI Studio API key in `GEMINI_API_KEY`. The server validates
  the key at startup and exits if it is missing/invalid.
- **Model:** pinned to `GEMINI_DEFAULT_MODEL=gemini-3.1-flash-lite` (a current,
  low-cost model; the package default `gemini-3.1-pro-preview` is heavier).
- **Launch:** `cmd /c npx -y @houtini/gemini-mcp` (the `cmd /c` wrapper is
  required on this host because the PowerShell `npx.ps1` shim is blocked).
- **Status (2026-09-14, final):** **grounding VERIFIED at the server level.** After
  the human enabled billing, the configured MCP server (`gemini-mcp 2.6.2`)
  returned successful Google Search-grounded answers for all six shared-set
  queries, with `vertexaisearch.cloud.google.com/grounding-api-redirect` citation
  URLs. Provenance: configured/requested model `gemini-3.1-flash-lite`;
  **response-reported model unknown** (the tool does not return it). History: plain
  generation worked (HTTP 200) while grounding returned `429 RESOURCE_EXHAUSTED`
  until billing was enabled — a **Google Search grounding entitlement** gap.
- **Key handling:** `GEMINI_API_KEY` is **not** listed in `environment`; the local
  server inherits it from the OpenCode process environment. This avoids the
  `{env:...}` placeholder, which is **not** interpolated on the dynamic-add path
  (it produced `server unavailable key=gemini status=failed`).
- **Native in-session verification (2026-09-14, final):** the Gemini MCP tools
  are now present in the **agent's own toolset**, and `gemini_gemini_chat` was
  invoked **natively** (in-session, not via a shell/diagnostic client) with
  Google Search grounding enabled on the shared UK-1 benchmark query. It returned
  a synthesised answer plus grounding citations of the form
  `vertexaisearch.cloud.google.com/grounding-api-redirect` — Google Search
  grounding **verified natively**. Provenance: configured/requested model
  `gemini-3.1-flash-lite` (the MCP default; no model was passed explicitly);
  **response-reported model: not returned** by the tool. The tool also does not
  report token usage/cost.
- **History:** native availability required a **full OpenCode restart** — MCP
  servers spawn only at launch, a closed/killed child is not auto-respawned, and
  config is not hot-reloaded. Before the restart the `gemini_*` tools were absent
  from the agent toolset; after it they appear alongside `firecrawl_*`.

### 2.5 Alternatives considered (recorded for traceability)

| Implementation | Repo / package | Verdict |
|---|---|---|
| `yukukotani/mcp-gemini-google-search` | npm 0.1.1 (2025-06), 83★ | Most adopted, single `google_search` tool, but **unmaintained** (~14 months) |
| `zchee/mcp-gemini-search` | Python/`uvx`, Apache-2.0, pushed 2026-09 | Maintained and focused, but needs Python 3.13 + `uv` + a pre-release MCP SDK |
| `cwest/gemini-search-mcp` | Go, Apache-2.0, pushed 2026-07 | Maintained, single `web_search`, but **no Windows release asset** |
| `Sophomoresty/gemini-search-mcp` | Python/CDP | High stars but drives a real Chrome session (scraping, not official grounding) |

### 2.6 DeepSeek provider (native model transport) — server-side web search not accepted as verified

- **What OpenCode uses:** the built-in `deepseek` provider is defined in the
  OpenCode model cache as npm **`@ai-sdk/openai-compatible`** with base URL
  `https://api.deepseek.com` — i.e. the OpenAI-compatible **Chat Completions**
  surface (`/chat/completions`), **not** the Responses API. The global config
  adds no provider override, so this is the effective transport.
- **Observation (2026-09-14):** server-side web search was not observed in the
  tested account/model/endpoint configuration on 2026-09-14. Both requests
  completed without `web_search_call` items or source annotations. This path is
  not accepted as a verified research tool. The model's plausible supplier list
  is **model prior knowledge, not search output** — an unverified hypothesis, not
  evidence.
- **Documentation used in the latest diagnosis:**
  - `https://api-docs.deepseek.com/guides/responses_api/` — Tools table wording:
    "`web_search` / `file_search` / `code_interpreter` / `computer_use` / `mcp` /
    other built-in tools" — **Ignored**; "`function`" — **Supported**.
  - `https://api-docs.deepseek.com/api/create-response/` — "Built-in tool types
    are ignored."; output item types listed as `message`, `reasoning`,
    `function_call` (no `web_search_call`).
  - `https://api-docs.deepseek.com/api/create-chat-completion` — `tools` support
    only the `function` type.
- **Recorded documentation conflict (no explanation asserted):** the same
  official Responses guide, in its "Input Items" note, states that
  `web_search_call` items passed back in `input` "are still restored and
  concatenated into the context", citing "search results produced by an earlier
  request with an older model". That wording implies `web_search` support at some
  point, which **conflicts** with the "Ignored" Tools-table classification. The
  conflict is recorded as observed; no cause is invented and no further API test
  was run.
- **Auth:** `~/.local/share/opencode/auth.json` provider `deepseek`, `type: api`
  (key inherited by OpenCode). Never printed, never passed as a CLI argument,
  never written to a tracked file.
- **Smallest integration option (documented, not implemented):** no DeepSeek
  server-side search path is accepted as verified today, so there is nothing to
  expose. If DeepSeek later ships server-side search, the smallest change would
  be a provider override selecting a Responses-capable AI SDK provider plus the
  `web_search` tool. Until then, discovery stays with Exa / Gemini / Firecrawl.
  No provider, permission, or billing setting was changed.

---

## 3. Configuration

Global `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "firecrawl": {
      "type": "remote",
      "url": "https://mcp.firecrawl.dev/v2/mcp",
      "enabled": true
    },
    "gemini": {
      "type": "local",
      "command": ["cmd", "/c", "npx", "-y", "@houtini/gemini-mcp"],
      "enabled": true,
      "timeout": 30000,
      "environment": {
        "GEMINI_DEFAULT_MODEL": "gemini-3.1-flash-lite",
        "GEMINI_DEFAULT_GROUNDING": "true"
      }
    }
  }
}
```

No secret is stored in this file. `GEMINI_API_KEY` is omitted from `environment`
on purpose: the local server **inherits** it from the OpenCode process
environment (set at User scope). Do not put the `{env:...}` placeholder here — it
is not interpolated for dynamically added servers and causes `server unavailable`.

**Versions — tested vs. actually pinned (important):**

- **Tested on 2026-09-14:** `@houtini/gemini-mcp` **2.6.2** and the Firecrawl
  keyless server handshake `firecrawl-fastmcp` **3.24.1**.
- **Actually pinned in configuration:** only the **model**
  (`GEMINI_DEFAULT_MODEL=gemini-3.1-flash-lite`). The Gemini MCP package is
  **not** version-pinned: `npx -y @houtini/gemini-mcp` resolves the latest
  published version at each start, so a later run may use a newer version than
  the one tested. Firecrawl is a **remote** endpoint, not a pinned local package;
  its version is reported by the server handshake. Pin a version explicitly
  (e.g. `@houtini/gemini-mcp@2.6.2`) if exact reproducibility is required.

---

## 4. Reproduce on Windows (exact steps)

### 4.0 Required Node.js runtime via nvm-windows (do this first)

The project requires Node **24.20.0** (`soft/.nvmrc`) and pnpm **11.26.0**
(`soft/package.json` `engines` + `packageManager`). On Windows, use
**nvm-windows** (the Go port); **not** the Linux `nvm` and **not** WSL.

**Why this is a short manual step.** Removing the existing standalone Node and
installing nvm-windows requires **administrator/UAC** (the standalone Node is a
machine MSI and its PATH entry is machine-scoped), and the standalone
`C:\Program Files\nodejs\node.exe` is **locked while OpenCode runs** (its
Node-based MCP children, e.g. the Gemini MCP, run from that node). The swap
therefore must run with **OpenCode quit** in a single **admin** PowerShell. Do
not kill OpenCode/MCP child processes.

```powershell
# ADMIN PowerShell, with OpenCode QUIT (no node.exe from Program Files running)

# Recovery first (only if the migration is aborted): restore the previous Node
# winget install --id OpenJS.NodeJS.22 --version 24.19.0 --accept-package-agreements --accept-source-agreements

# 1) Uninstall the standalone Node (machine MSI; removes C:\Program Files\nodejs)
winget uninstall --id OpenJS.NodeJS.22 --silent --accept-source-agreements
#   fallback: msiexec /x {89850E15-F7D6-476D-972E-F8F5215E4498} /qn /norestart

# 2) Install nvm-windows 1.2.2 (official installer; it asks for the nvm root and
#    the Node symlink and adds %NVM_HOME%/%NVM_SYMLINK% to PATH).
#    On this machine the chosen paths were:
#      NVM_HOME    = C:\Users\msmig\AppData\Local\nvm
#      NVM_SYMLINK = C:\nvm4w\nodejs
$nvmSetup = "$env:LOCALAPPDATA\Temp\opencode\nvm-setup-1.2.2.exe"
# if missing: https://github.com/coreybutler/nvm-windows/releases/download/1.2.2/nvm-setup.exe
& $nvmSetup /S
```

Then open a **new** PowerShell (normal user) and run:

```powershell
nvm install 24.20.0
nvm use 24.20.0
node --version          # v24.20.0
corepack enable
corepack prepare pnpm@11.26.0 --activate
pnpm.cmd --version      # 11.26.0
```

Notes:
- **Installed and verified on this machine (2026-09-17):** nvm-windows 1.2.2
  (`nvm root` = `C:\Users\msmig\AppData\Local\nvm`), Node **24.20.0** selected,
  `node`/`npm`/`npx` resolving from `C:\nvm4w\nodejs` (`NVM_SYMLINK`), and
  **pnpm 11.26.0** via corepack. No temporary PATH overrides are used; the
  previous staged Node is not on PATH.
- nvm-windows provides `node`/`npm`/`npx` via the `NVM_SYMLINK`
  (`C:\nvm4w\nodejs`); changing versions with `nvm use` may need an elevated
  shell.
- `corepack` (bundled with Node) provides `pnpm.cmd`, matching `packageManager`.
- Remove the obsolete user PATH entry `%APPDATA%\npm` only after `pnpm.cmd`
  resolves through corepack (the standalone Node's only global tool was
  `pnpm@11.26.0`; nothing else is lost).
- **Restart OpenCode afterwards** so MCP servers and shells inherit the updated
  environment (MCP servers are spawned only at OpenCode launch). This was done:
  the running `dev:api` process resolves to `C:\nvm4w\nodejs\node.exe`.
- Recovery (abort): `winget install --id OpenJS.NodeJS.22 --version 24.19.0
  --accept-package-agreements --accept-source-agreements`.

### 4.1 Exa (built-in discovery)

1. Set the enable flag at **User** scope so the desktop app inherits it, then
   restart (step 4.4):
   ```powershell
   [Environment]::SetEnvironmentVariable("OPENCODE_ENABLE_EXA", "1", "User")
   ```
   A value set only in one shell (`set` / `$env:`) is **not** inherited by the
   desktop app. This exposes the built-in `websearch` (Exa) tool.

### 4.2 Firecrawl MCP (official, keyless)

- Add the `firecrawl` entry from §3 to the global
  `~/.config/opencode/opencode.jsonc`. The keyless hosted endpoint needs **no**
  credential. Restart (step 4.4) to load it.

### 4.3 Gemini Google Search MCP

1. Create/reuse a Google AI Studio key: <https://aistudio.google.com/apikey>.
   **Do not paste the key into chat.**
2. Set it as a persistent **User** environment variable (PowerShell):
   ```powershell
   [Environment]::SetEnvironmentVariable("GEMINI_API_KEY", "<key>", "User")
   ```
   A key set only in one shell (`set` / `$env:`) is **not** inherited by the
   desktop app.
3. Add the `gemini` entry from §3: command
   `cmd /c npx -y @houtini/gemini-mcp` (the `cmd /c` wrapper is required because
   the PowerShell `npx.ps1` shim is blocked), `GEMINI_DEFAULT_MODEL` =
   `gemini-3.1-flash-lite`, `GEMINI_DEFAULT_GROUNDING` = `true`,
   `timeout` = `30000`. Do **not** add `GEMINI_API_KEY` to `environment`; the
   local server inherits it from the OpenCode process environment.
4. Grounding requires the Google project behind the key to have **Grounding with
   Google Search** entitlement; if it is missing, grounded calls return
   `429 RESOURCE_EXHAUSTED` while plain generation succeeds.

### 4.4 Restart and native-tool verification

1. Fully quit OpenCode (all windows; confirm no `OpenCode.exe` in Task Manager)
   and relaunch from an Explorer/Start shortcut so it inherits the User
   environment. OpenCode loads config and spawns MCP servers **only at startup**
   and does not hot-reload.
2. Open a fresh agent session. Confirm the tools are present in the **agent's own
   toolset**: `websearch`, `firecrawl_*`, and `gemini_*`.
3. Verify **natively** (in-session, not via a shell client):
   - **Gemini:** call `gemini_gemini_chat` with grounding on; success returns an
     answer plus `vertexaisearch.cloud.google.com/grounding-api-redirect`
     citation URLs.
   - **Firecrawl:** call `firecrawl_search`; success returns result items.
   If Gemini fails, the log reports
   `"server unavailable" key=gemini ... status=failed` or `MCP connection closed`.

**Operational cautions (observed on OpenCode 1.18.30 desktop / Windows 11):**

- An MCP server whose process is killed is **not** auto-respawned; the connection
  shows `MCP connection closed` and a restart is required.
- **Process cleanup: exact PIDs only.** Never `Stop-Process`/`taskkill` on broad
  name or command-line filters (`node`, `npx`, `houtini`, `gemini-mcp`); they can
  kill OpenCode's own MCP child and drop the agent's tools.
- **Never print full resolved config or environment objects.** `GET /config` on
  the local server returns the interpolated **key value**; use an explicit
  allowlist of non-secret fields (`GET /mcp` status is safe).
- `timeout: 30000` is set because a cold `npx` start can exceed the 5 s default.
- These are observed behaviors of this version, not asserted for other OpenCode
  versions.

---

## 5. Tool-selection rules

**Verified operating toolchain (2026-09-14):**

- **Exa** (`websearch`) — discovery.
- **Gemini Google Search** (`gemini_gemini_chat`, grounding on) — native
  in-session grounded discovery.
- **webfetch / Firecrawl** (`firecrawl_search` / `firecrawl_scrape` /
  `firecrawl_parse`) — source retrieval and verification.

Rules:

1. **Discovery** (you have a question, not a URL) → `websearch` (Exa) first;
   cross-check with `firecrawl_search` on local-language queries.
2. **Retrieval** (you have a URL) → `webfetch` first.
3. **Fallback retrieval** → `firecrawl_scrape` when `webfetch` returns
   incomplete/JS-gated content, and for PDFs (`parsers:["pdf"]`).
4. **Google-grounded answers with source links** → the Gemini MCP
   (`gemini_gemini_chat` with grounding on); use it to corroborate or extend
   Exa/Firecrawl leads, never as the only evidence for a substantive claim.
5. A snippet or search summary is **discovery**; a substantive claim needs the
   fetched page (or PDF) as its source. Two engines returning the same URL is not
   independent corroboration.
6. **DeepSeek is not an accepted search path.** The native DeepSeek model runs
   over Chat Completions and its server-side web search is not accepted as
   verified (see §2.6); do not use it for discovery. Treat any company or URL it
   produces from model knowledge as an **unverified hypothesis**, not a finding or
   a source.

## 6. Retry limits and quota discipline

- Exa: one immediate retry on the free-MCP rate-limit notice; then stop that
  query.
- Firecrawl: short inter-call delay; no aggressive retry loop; keyless is
  rate-limited by design.
- Prefer existing free quotas; **do not** purchase plans or enable paid overages.
- On quota exhaustion, preserve collected evidence and record the gap rather
  than retrying indefinitely.

## 7. Known limitations

- Gemini grounding is **verified at the server level and natively in-session**
  (2026-09-14): `gemini_gemini_chat` is callable from the agent's own toolset and
  returns grounding citations. Residual limits: the tool does not report the model
  or token usage, and its grounding citations are redirect URLs without publisher
  domains, so confirm a cited company on its own site before treating it as a
  substantive claim.
- **DeepSeek server-side web search is not accepted as verified.** In the tested
  account/model/endpoint configuration on 2026-09-14, both requests completed
  without `web_search_call` items or source annotations, so it contributes no
  discovery or source URLs; see §2.6.
- Firecrawl keyless exposes only Search, Scrape and Parse; it cannot access every
  blocked or JS-gated website, and paywalls/consent walls may defeat it.
- Exa `websearch` free tier is rate-limited and does not expose usage/cost.
- `npx` through PowerShell is blocked by execution policy; always wrap with
  `cmd /c`.
- MCP servers are started only at OpenCode launch; a newly added server and a
  closed/killed server connection are both resolved by a restart, not by config
  hot-reload.

## 8. Text encoding when persisting via the API (observed defect)

Non-ASCII research text (Lithuanian/Finnish, e.g. `ė š ū`) persisted by the
manager's PowerShell HTTP calls was observed **double-encoded** in the database
(UTF-8 bytes reinterpreted as CP1252, then re-encoded) — the API and web path
are correct (an API integration test round-trips non-ASCII exactly); the defect
is in the manager write path. Two known causes:

1. **BOM-less `.ps1` scripts.** Windows PowerShell 5.1 reads a script without a
   byte-order mark as ANSI/CP1252, so non-ASCII literals are already mangled
   before any request. Save scripts as **UTF-8 with BOM** (or keep literals
   ASCII-only).
2. **String request bodies.** Send the JSON as **UTF-8 bytes**, not as a .NET
   string:

   ```powershell
   $json  = $body | ConvertTo-Json -Depth 8
   $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
   Invoke-RestMethod -Uri $uri -Method Post -Headers $h -Body $bytes `
     -ContentType 'application/json; charset=utf-8'
   ```

   (`Invoke-RestMethod -Body $json` with a string body can encode non-ASCII as
   Latin-1 and corrupt it.)

Do not blindly transcode stored records. A single CP1252 round-trip is
recoverable (`convert_from(convert_to(text,'WIN1252'),'UTF8')`); report affected
rows and repair only with explicit human approval.
