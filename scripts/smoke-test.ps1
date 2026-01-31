<#
PowerShell Smoke Test for TradieFlow (local dev)

What it does:
1. Loads env vars from .env.local into the process environment
2. Optionally starts `npm run dev` (if nothing is listening on localhost:3000)
3. Waits for the dev server to become healthy
4. Submits a test lead to /api/leads/create
5. Calls the cron endpoint /api/cron/leads-followup with Authorization: Bearer $CRON_SECRET
6. Prints responses and exits

Usage:
- Open PowerShell in the repo root
- Run: .\scripts\smoke-test.ps1

Notes:
- This script assumes `.env.local` exists at the repo root
- If you prefer to start the dev server yourself, press Ctrl+C in the script when it attempts to start the server
- If the lead creation returns "Service not available yet", create a `business_profile` in Supabase (see README)
#>

function Load-EnvFile {
    param(
        [string]$Path = ".env.local"
    )
    if (-Not (Test-Path $Path)) {
        Write-Error "$Path not found. Create .env.local with required env vars and try again."
        exit 1
    }

    $lines = Get-Content $Path | Where-Object { $_ -and $_ -notmatch '^#' }
    foreach ($line in $lines) {
        if ($line -match '=') {
            $parts = $line -split '=', 2
            $k = $parts[0].Trim()
            $v = $parts[1].Trim()
            # Remove surrounding quotes if present
            if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Trim('"') }
            if ($v.StartsWith("'") -and $v.EndsWith("'")) { $v = $v.Trim("'") }
            # Set env var for this PowerShell session
            Write-Host "Setting env var: $k"
            Set-Item -Path "Env:$k" -Value $v
        }
    }
}

function Test-PortListening {
    param(
        [int]$Port = 3000
    )
    try {
        $tcp = Get-NetTCPConnection -LocalPort $Port -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

function Start-DevServer {
    # Start dev server in a new process redirected to log files
    Write-Host "Starting dev server (npm run dev) in background..."
    $out = Join-Path $PWD "dev.log"
    $err = Join-Path $PWD "dev.err"

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "cmd.exe"
    $psi.Arguments = "/c npm run dev"
    $psi.WorkingDirectory = $PWD
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true

    $p = New-Object System.Diagnostics.Process
    $p.StartInfo = $psi
    $p.Start() | Out-Null

    Start-Sleep -Seconds 1
    # As we redirected, write the streams to files in background
    $stdOut = $p.StandardOutput
    $stdErr = $p.StandardError

    Start-Job -ScriptBlock {
        param($s, $path)
        while (-not $s.EndOfStream) { $line = $s.ReadLine(); Add-Content -Path $path -Value $line }
    } -ArgumentList $stdOut, $out | Out-Null

    Start-Job -ScriptBlock {
        param($s, $path)
        while (-not $s.EndOfStream) { $line = $s.ReadLine(); Add-Content -Path $path -Value $line }
    } -ArgumentList $stdErr, $err | Out-Null

    return $p
}

function Wait-For-Url {
    param(
        [string]$Url = 'http://localhost:3000',
        [int]$TimeoutSeconds = 60
    )
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -Method GET -TimeoutSec 5 -ErrorAction Stop
            if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) {
                Write-Host "Server ready: $Url (HTTP $($r.StatusCode))"
                return $true
            }
        } catch {
            # ignore
        }
        Start-Sleep -Seconds 2
    }
    Write-Warning "Timed out waiting for $Url"
    return $false
}

# ---------- Script start ----------
Load-EnvFile

$CRON_SECRET = $env:CRON_SECRET
if (-not $CRON_SECRET) {
    Write-Error "CRON_SECRET not set in environment. Please add it to .env.local"
    exit 1
}

# If port 3000 not in use, start dev server
$port = 3000
if (-not (Test-PortListening -Port $port)) {
    $proc = Start-DevServer
    Write-Host "Dev server started (pid $($proc.Id)). Waiting for server to become ready..."
    $ready = Wait-For-Url -Url "http://localhost:$port" -TimeoutSeconds 120
    if (-not $ready) {
        Write-Warning "Dev server did not become ready. Check dev.log and dev.err in project root."
        Write-Host "You can also start the dev server manually: npm run dev"
        exit 1
    }
} else {
    Write-Host "Port $port already in use — assuming dev server already running."
}

# Submit test lead
$createUrl = "http://localhost:$port/api/leads/create"
$payload = @{
    name = "Smoke Test Lead"
    email = "smoketest+lead@example.com"
    phone = "0400000000"
    suburb = "Melbourne"
    postcode = "3000"
    job_type = "end_of_lease"
} | ConvertTo-Json

Write-Host "Submitting test lead to $createUrl"
try {
    $resp = Invoke-RestMethod -Uri $createUrl -Method Post -Body $payload -ContentType 'application/json' -TimeoutSec 15
    Write-Host "Lead create response:`n$(ConvertTo-Json $resp -Depth 5)"
} catch {
    Write-Error "Lead creation failed: $($_.Exception.Message)"
    # Dump last lines of dev log
    if (Test-Path './dev.err') {
        Write-Host "--- Last 200 chars of dev.err ---"
        Get-Content './dev.err' -Tail 40 | ForEach-Object { Write-Host $_ }
    }
    exit 1
}

# Trigger cron endpoint
$cronUrl = "http://localhost:$port/api/cron/leads-followup"
Write-Host "Triggering cron: $cronUrl"
try {
    $headers = @{ Authorization = "Bearer $CRON_SECRET" }
    $cronResp = Invoke-RestMethod -Uri $cronUrl -Method Get -Headers $headers -TimeoutSec 30
    Write-Host "Cron response:`n$(ConvertTo-Json $cronResp -Depth 5)"
} catch {
    Write-Error "Cron invocation failed: $($_.Exception.Message)"
    if (Test-Path './dev.err') {
        Write-Host "--- Last 200 chars of dev.err ---"
        Get-Content './dev.err' -Tail 40 | ForEach-Object { Write-Host $_ }
    }
    exit 1
}

Write-Host 'Smoke test completed successfully. Check Supabase leads and lead_events tables for records.'