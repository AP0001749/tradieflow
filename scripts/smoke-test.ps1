<#
PowerShell Smoke Test for TradieFlow (local dev)

What it does:
1. Loads env vars from .env.local into the process environment
2. Validates the minimum env vars required for lead capture
3. Optionally starts `npm run dev` if nothing is listening on localhost:3000
4. Waits for the dev server to become healthy
5. Submits a test lead to /api/leads/create
6. Optionally calls a locally served Supabase Edge Function if LEAD_FOLLOWUP_EDGE_URL is set
7. Prints responses and exits

Usage:
- Open PowerShell in the repo root
- Run: .\scripts\smoke-test.ps1 -BookingUrlSlug your-booking-slug

Notes:
- This script assumes `.env.local` exists at the repo root
- If the lead creation fails, confirm a `business_profile` exists in Supabase and use a real `booking_url_slug`
#>

param(
    [string]$BookingUrlSlug = "smoke-test-business"
)

$requiredEnvVars = @(
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN"
)

function Load-EnvFile {
    param(
        [string]$Path = ".env.local"
    )

    if (-not (Test-Path $Path)) {
        Write-Error "$Path not found. Create .env.local with required env vars and try again."
        exit 1
    }

    $lines = Get-Content $Path | Where-Object { $_ -and $_ -notmatch '^#' }
    foreach ($line in $lines) {
        if ($line -match '=') {
            $parts = $line -split '=', 2
            $k = $parts[0].Trim()
            $v = $parts[1].Trim()

            if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Trim('"') }
            if ($v.StartsWith("'") -and $v.EndsWith("'")) { $v = $v.Trim("'") }

            Write-Host "Setting env var: $k"
            Set-Item -Path "Env:$k" -Value $v
        }
    }
}

function Test-RequiredEnvVars {
    param(
        [string[]]$Names
    )

    $missing = @()
    foreach ($name in $Names) {
        $value = (Get-Item -Path "Env:$name" -ErrorAction SilentlyContinue).Value
        if (-not $value) {
            $missing += $name
        }
    }

    if ($missing.Count -gt 0) {
        Write-Error "Missing required env vars: $($missing -join ', ')"
        exit 1
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
        [string]$Url = "http://localhost:3000",
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
        }
        Start-Sleep -Seconds 2
    }

    Write-Warning "Timed out waiting for $Url"
    return $false
}

Load-EnvFile
Test-RequiredEnvVars -Names $requiredEnvVars

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
    Write-Host "Port $port already in use - assuming dev server already running."
}

$createUrl = "http://localhost:$port/api/leads/create"
$payload = @{
    booking_url_slug = $BookingUrlSlug
    website = ""
    business_name = "Smoke Test Cleaning"
    your_name = "Smoke Test Lead"
    mobile = "0400000000"
    email = "smoketest+lead@example.com"
    service_area = "Melbourne"
    service_type = "end_of_lease"
    abn = ""
    notes = "Smoke test submission"
} | ConvertTo-Json

Write-Host "Submitting test lead to $createUrl"
try {
    $resp = Invoke-RestMethod -Uri $createUrl -Method Post -Body $payload -ContentType "application/json" -TimeoutSec 15
    Write-Host "Lead create response:`n$(ConvertTo-Json $resp -Depth 5)"
} catch {
    Write-Error "Lead creation failed: $($_.Exception.Message)"
    if (Test-Path "./dev.err") {
        Write-Host "--- Last lines of dev.err ---"
        Get-Content "./dev.err" -Tail 40 | ForEach-Object { Write-Host $_ }
    }
    exit 1
}

$edgeUrl = $env:LEAD_FOLLOWUP_EDGE_URL
$leadFollowupSecret = $env:LEAD_FOLLOWUP_SECRET
if (-not $leadFollowupSecret) {
    $leadFollowupSecret = $env:CRON_SECRET
    if ($leadFollowupSecret) {
        Write-Host "Using legacy CRON_SECRET for local Edge Function auth."
    }
}
if ($edgeUrl -and $leadFollowupSecret) {
    Write-Host "Triggering local Edge Function: $edgeUrl"
    try {
        $headers = @{ "x-cron-secret" = $leadFollowupSecret }
        $edgeResp = Invoke-RestMethod -Uri $edgeUrl -Method Post -Headers $headers -TimeoutSec 30
        Write-Host "Edge Function response:`n$(ConvertTo-Json $edgeResp -Depth 5)"
    } catch {
        Write-Error "Edge Function invocation failed: $($_.Exception.Message)"
        exit 1
    }
} else {
    Write-Host "Skipping Edge Function step. Set LEAD_FOLLOWUP_EDGE_URL and LEAD_FOLLOWUP_SECRET (or legacy CRON_SECRET) to test follow-up automation locally."
}

Write-Host "Smoke test completed successfully. Check Supabase leads and lead_events tables for records."
