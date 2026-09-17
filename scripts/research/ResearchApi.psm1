# ResearchApi.psm1 -- canonical client for research writes over the internal API.
#
# WHY THIS EXISTS (O-016): Windows PowerShell 5.1 `Invoke-RestMethod -Body <string>`
# encodes the body through [Text.Encoding]::Default (Windows-1252) with .NET
# best-fit fallback, silently destroying non-CP1252 characters (e.g. Lithuanian
# `e-dot` U+0117 was sent as ASCII `e`). A BOM-less .ps1 is also read as CP1252.
# This module always sends UTF-8 *bytes* with an explicit `charset=utf-8`, and
# reads responses as UTF-8 bytes, so non-ASCII survives end to end.
#
# This file is intentionally ASCII-only so it is correct regardless of whether
# it is saved with a BOM. Non-ASCII body text is supplied by the caller as a
# .NET string (built from code points or read from a UTF-8 file) and serialized
# to UTF-8 bytes here.
#
# Requires Windows PowerShell 5.1 (or PowerShell 7). Execution policy on this
# host is Restricted; invoke with `-ExecutionPolicy Bypass` (see README.md).

Set-StrictMode -Version Latest

function Invoke-ResearchApi {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)][string]$Uri,
        [Parameter(Mandatory = $true)][ValidateSet('GET', 'POST', 'PATCH', 'PUT')][string]$Method,
        [Parameter(Mandatory = $true)][string]$ApiKey
    )

    $request = [System.Net.HttpWebRequest]::Create($Uri)
    $request.Method = $Method
    $request.Accept = 'application/json'
    $request.Headers.Add('x-internal-api-key', $ApiKey)

    if ($Method -ne 'GET') {
        # $script:BodyBytes is set by the caller; never a .NET string body.
        $bytes = $script:BodyBytes
        if ($null -eq $bytes) { throw 'Internal error: request body bytes were not set.' }
        $request.ContentType = 'application/json; charset=utf-8'
        $request.ContentLength = $bytes.Length
        $stream = $request.GetRequestStream()
        try { $stream.Write($bytes, 0, $bytes.Length) } finally { $stream.Close() }
    }

    try {
        $response = $request.GetResponse()
    }
    catch [System.Net.WebException] {
        $response = $_.Exception.Response
        if ($null -eq $response) { throw }
    }

    $status = [int]$response.StatusCode
    $memory = New-Object System.IO.MemoryStream
    try {
        $response.GetResponseStream().CopyTo($memory)
    }
    finally {
        $response.Close()
    }

    # Decode strictly as UTF-8: the server replies with charset=utf-8.
    $text = [System.Text.Encoding]::UTF8.GetString($memory.ToArray())

    if ($status -ge 400) {
        throw "HTTP $status for $Method $Uri : $text"
    }
    if ([string]::IsNullOrWhiteSpace($text)) { return $null }
    return ($text | ConvertFrom-Json)
}

function Write-ResearchJson {
    [CmdletBinding(DefaultParameterSetName = 'Object')]
    param(
        [Parameter(Mandatory = $true)][string]$Uri,
        [Parameter(Mandatory = $true)][string]$ApiKey,
        [ValidateSet('POST', 'PATCH', 'PUT')][string]$Method = 'POST',
        [Parameter(Mandatory = $true, ParameterSetName = 'Object')][object]$Body,
        [Parameter(Mandatory = $true, ParameterSetName = 'File')][string]$BodyFile
    )

    if ($PSCmdlet.ParameterSetName -eq 'File') {
        if (-not (Test-Path -LiteralPath $BodyFile)) { throw "Body file not found: $BodyFile" }
        # Read as UTF-8 explicitly, whether or not the file carries a BOM.
        $json = [System.IO.File]::ReadAllText($BodyFile, (New-Object System.Text.UTF8Encoding($false)))
    }
    else {
        $json = $Body | ConvertTo-Json -Depth 20 -Compress
    }

    # THE FIX: bytes + explicit charset, never a string body.
    $script:BodyBytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    try {
        return (Invoke-ResearchApi -Uri $Uri -Method $Method -ApiKey $ApiKey)
    }
    finally {
        $script:BodyBytes = $null
    }
}

function Get-ResearchJson {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)][string]$Uri,
        [Parameter(Mandatory = $true)][string]$ApiKey
    )
    return (Invoke-ResearchApi -Uri $Uri -Method 'GET' -ApiKey $ApiKey)
}

Export-ModuleMember -Function Write-ResearchJson, Get-ResearchJson
