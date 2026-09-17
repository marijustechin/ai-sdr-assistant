# Test-ResearchWriteEncoding.ps1 -- end-to-end proof that Lithuanian/Finnish text
# survives the researcher's write path: PowerShell input -> request -> API ->
# database -> API read.
#
# It exercises the canonical helper (ResearchApi.psm1), NOT supertest, so the
# previously faulty PowerShell input/serialization path is included. Run it
# against an ISOLATED API backed by a test database (e.g. ai_sdr_test_api), never
# the real research run.
#
# Requires Windows PowerShell 5.1; execution policy on this host is Restricted:
#   powershell -NoProfile -ExecutionPolicy Bypass -File Test-ResearchWriteEncoding.ps1 `
#     -BaseUrl http://localhost:3004 -ApiKey <key>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$ApiKey,
    [string]$BaseUrl = 'http://localhost:3004',
    [string]$Fixture
)

$ErrorActionPreference = 'Stop'

# Resolved in the body (not a param default): $PSScriptRoot is not reliably set
# while a -File script's parameter defaults are evaluated on Windows PowerShell.
if (-not $Fixture) {
    $Fixture = Join-Path $PSScriptRoot 'fixtures/research-write-encoding.json'
}

if ($BaseUrl -match ':3003(\D|$)') {
    throw 'Refusing to run against :3003 (the real research database). Use an isolated API/database.'
}

Import-Module (Join-Path $PSScriptRoot 'ResearchApi.psm1') -Force

function Format-Escaped([string]$value) {
    return [regex]::Replace($value, '[^\x20-\x7e]', { param($m) '\u{' + ([int][char]$m.Value).ToString('x') + '}' })
}

function Assert-Exact([string]$label, [string]$expected, [string]$actual) {
    if (-not [string]::Equals($expected, $actual, [System.StringComparison]::Ordinal)) {
        throw ("MISMATCH {0}`n  expected: {1}`n  actual  : {2}" -f $label, (Format-Escaped $expected), (Format-Escaped $actual))
    }
    Write-Host ("  OK   {0}" -f $label)
}

function Assert-NoReplacement([string]$label, [string]$value) {
    if ($value.Contains([char]0xFFFD)) { throw ("U+FFFD present in {0}" -f $label) }
}

function Assert-Has([string]$label, [string]$value, [int[]]$codePoints) {
    foreach ($cp in $codePoints) {
        if (-not $value.Contains([char]$cp)) {
            throw ("{0} is missing U+{1:X4}" -f $label, $cp)
        }
    }
    Write-Host ("  OK   {0} contains {1}" -f $label, (($codePoints | ForEach-Object { 'U+{0:X4}' -f $_ }) -join ' '))
}

$lithuanianChecks = @(0x0117, 0x0161)                       # e-dot, s-caron
$edotChecks = @(0x0117)                                     # e-dot
$finnishChecks = @(0x00E4, 0x00F6)                          # a-umlaut, o-umlaut
$evidenceChecks = @(0x0117, 0x016B, 0x0161, 0x20AC, 0x2014, 0x00B2)  # e-dot, u-macron, s-caron, euro, em dash, superscript two

Write-Host ("Isolated write-path verification against {0}" -f $BaseUrl)
Write-Host ("Fixture: {0}" -f $Fixture)

try {
    # 1. INPUT: read the researcher's UTF-8 fixture as .NET strings.
    $fixturePath = (Resolve-Path -LiteralPath $Fixture).Path
    $raw = [System.IO.File]::ReadAllText($fixturePath, (New-Object System.Text.UTF8Encoding($false)))
    $data = $raw | ConvertFrom-Json

    Assert-Has 'input lithuanianQuery' $data.lithuanianQuery $lithuanianChecks
    Assert-Has 'input finnishQuery' $data.finnishQuery $finnishChecks
    Assert-Has 'input sourceTitle' $data.sourceTitle $edotChecks
    Assert-Has 'input sourcePublisher' $data.sourcePublisher $edotChecks
    Assert-Has 'input evidenceText' $data.evidenceText $evidenceChecks

    $base = $BaseUrl.TrimEnd('/')

    # 2. REQUEST: create the run envelope through the canonical helper.
    $product = Write-ResearchJson -Uri "$base/products" -ApiKey $ApiKey -Body @{ name = 'Encoding round-trip product' }
    $offer = Write-ResearchJson -Uri "$base/products/$($product.id)/offers" -ApiKey $ApiKey -Body @{ name = 'Thermo Abachi cladding' }
    $opportunity = Write-ResearchJson -Uri "$base/opportunities" -ApiKey $ApiKey -Body @{ offerId = $offer.id; name = 'Encoding round-trip opportunity' }
    $market = Write-ResearchJson -Uri "$base/target-markets" -ApiKey $ApiKey -Body @{ country = 'LT'; segment = 'sauna manufacturers' }
    Write-ResearchJson -Uri "$base/opportunities/$($opportunity.id)/target-markets" -ApiKey $ApiKey -Body @{ targetMarketId = $market.id } | Out-Null
    $run = Write-ResearchJson -Uri "$base/opportunities/$($opportunity.id)/research-runs" -ApiKey $ApiKey -Body @{}

    $writeBase = "$base/opportunities/$($opportunity.id)/research-runs/$($run.id)"

    # 3. WRITE: non-ASCII text into queries, a source title/publisher, and evidence.
    $q1 = Write-ResearchJson -Uri "$writeBase/queries" -ApiKey $ApiKey -Body @{ queryText = $data.lithuanianQuery; provider = 'exa'; status = 'SUCCEEDED' }
    $q2 = Write-ResearchJson -Uri "$writeBase/queries" -ApiKey $ApiKey -Body @{ queryText = $data.finnishQuery; provider = 'exa'; status = 'SUCCEEDED' }
    $source = Write-ResearchJson -Uri "$writeBase/sources" -ApiKey $ApiKey -Body @{ url = 'https://encoding.example.invalid/lt-fi'; title = $data.sourceTitle; publisher = $data.sourcePublisher }
    $evidence = Write-ResearchJson -Uri "$writeBase/evidence" -ApiKey $ApiKey -Body @{ url = 'https://encoding.example.invalid/lt-fi'; evidenceText = $data.evidenceText; verificationStatus = 'VERIFIED'; retrievedAt = '2026-09-15T08:05:00.000Z' }

    # 4. API READ: re-fetch from the database (not the write response).
    $queries = Get-ResearchJson -Uri "$writeBase/queries" -ApiKey $ApiKey
    $sources = Get-ResearchJson -Uri "$writeBase/sources" -ApiKey $ApiKey
    $evidenceRows = Get-ResearchJson -Uri "$writeBase/evidence" -ApiKey $ApiKey

    $readQ1 = $queries | Where-Object { $_.id -eq $q1.id }
    $readQ2 = $queries | Where-Object { $_.id -eq $q2.id }
    $readSource = $sources | Where-Object { $_.id -eq $source.id }
    $readEvidence = $evidenceRows | Where-Object { $_.id -eq $evidence.id }

    if (-not $readQ1 -or -not $readQ2 -or -not $readSource -or -not $readEvidence) {
        throw 'One or more written rows were not found on read-back.'
    }

    # 5. ASSERT exact byte-for-byte equality and no replacement characters.
    Assert-Exact 'query(LT) input -> API -> DB -> API read' $data.lithuanianQuery $readQ1.queryText
    Assert-Exact 'query(FI) input -> API -> DB -> API read' $data.finnishQuery $readQ2.queryText
    Assert-Exact 'source title' $data.sourceTitle $readSource.title
    Assert-Exact 'source publisher' $data.sourcePublisher $readSource.publisher
    Assert-Exact 'evidence text' $data.evidenceText $readEvidence.evidenceText

    Assert-NoReplacement 'read query(LT)' $readQ1.queryText
    Assert-NoReplacement 'read query(FI)' $readQ2.queryText
    Assert-NoReplacement 'read source title' $readSource.title
    Assert-NoReplacement 'read evidence' $readEvidence.evidenceText

    Write-Host 'PASS: Lithuanian and Finnish text survived the full PowerShell write path.' -ForegroundColor Green
    exit 0
}
catch {
    Write-Host ("FAIL: {0}" -f $_.Exception.Message) -ForegroundColor Red
    exit 1
}
