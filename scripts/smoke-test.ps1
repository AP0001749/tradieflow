<#
PowerShell Smoke Test for TradieFlow (local dev)

What it does:
1. Loads env vars from .env.local into the process environment
2. Validates the minimum env vars required for lead capture
3. Optionally starts `npm run dev` if testing http://localhost:3000 and nothing is listening
4. Waits for the dev server to become healthy
5. Checks the public booking page for the supplied slug
6. Submits an emergency trade test lead to /api/leads/create
7. Optionally calls a locally served Supabase Edge Function if LEAD_FOLLOWUP_EDGE_URL is set
8. Optionally probes /api/cron/zero-leak when -RunZeroLeak is supplied
9. Prints responses and exits

Usage:
- Open PowerShell in the repo root
- Run: .\scripts\smoke-test.ps1 -BookingUrlSlug your-booking-slug
- Production-style probe: .\scripts\smoke-test.ps1 -AppBaseUrl https://your-app-host -BookingUrlSlug your-booking-slug -RunZeroLeak

Notes:
- This script assumes `.env.local` exists at the repo root
- If the lead creation fails, confirm a `business_profile` exists in Supabase and use a real `booking_url_slug`
#>

param(
    [string]$BookingUrlSlug = "smoke-test-business",
    [string]$AppBaseUrl = "http://localhost:3000",
    [switch]$RunZeroLeak
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

$appBaseUrl = $AppBaseUrl.TrimEnd('/')
$isLocalDefaultApp = $appBaseUrl -match '^https?://(localhost|127\.0\.0\.1):3000$'
$port = 3000

if ($isLocalDefaultApp -and -not (Test-PortListening -Port $port)) {
    $proc = Start-DevServer
    Write-Host "Dev server started (pid $($proc.Id)). Waiting for server to become ready..."
    $ready = Wait-For-Url -Url $appBaseUrl -TimeoutSeconds 120
    if (-not $ready) {
        Write-Warning "Dev server did not become ready. Check dev.log and dev.err in project root."
        Write-Host "You can also start the dev server manually: npm run dev"
        exit 1
    }
} elseif ($isLocalDefaultApp) {
    Write-Host "Port $port already in use - assuming dev server already running."
} else {
    Write-Host "Using configured app URL: $appBaseUrl"
    $ready = Wait-For-Url -Url $appBaseUrl -TimeoutSeconds 30
    if (-not $ready) {
        Write-Warning "App URL did not respond as expected: $appBaseUrl"
        exit 1
    }
}

$bookingPageUrl = "$appBaseUrl/book/$BookingUrlSlug"
Write-Host "Checking public booking page: $bookingPageUrl"
try {
    $bookingPage = Invoke-WebRequest -Uri $bookingPageUrl -UseBasicParsing -Method GET -TimeoutSec 15 -ErrorAction Stop
    Write-Host "Booking page response: HTTP $($bookingPage.StatusCode)"
} catch {
    Write-Error "Booking page check failed: $($_.Exception.Message)"
    exit 1
}

$stamp = Get-Date -Format "yyyyMMddHHmmss"
$createUrl = "$appBaseUrl/api/leads/create"
$payload = @{
    booking_url_slug = $BookingUrlSlug
    website = ""
    business_name = "Smoke Test Mechanical"
    your_name = "Smoke Test Lead $stamp"
    mobile = "0400000000"
    email = "smoketest+$stamp@example.com"
    service_area = "Melbourne"
    service_type = "Cooling Breakdown"
    lead_urgency = "emergency"
    triage_problem = "Smoke test cooling failure during peak demand"
    triage_site_risk = "Customer reports vulnerable occupant and limited access window"
    triage_safety_risk = $true
    team_size = "2-5 techs"
    after_hours_coverage = "Emergency after-hours callouts"
    dispatch_radius = "25km"
    abn = ""
    notes = "Smoke test HVAC dispatch-audit lead $stamp"
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

if ($RunZeroLeak) {
    if (-not $leadFollowupSecret) {
        Write-Error "Cannot run Zero-Leak probe without LEAD_FOLLOWUP_SECRET or CRON_SECRET."
        exit 1
    }

    $zeroLeakUrl = "$appBaseUrl/api/cron/zero-leak"
    Write-Host "Triggering Zero-Leak cron route: $zeroLeakUrl"
    try {
        $headers = @{
            "Authorization" = "Bearer $leadFollowupSecret"
            "x-cron-secret" = $leadFollowupSecret
        }
        $zeroLeakResp = Invoke-RestMethod -Uri $zeroLeakUrl -Method Post -Headers $headers -TimeoutSec 30
        Write-Host "Zero-Leak response:`n$(ConvertTo-Json $zeroLeakResp -Depth 6)"
    } catch {
        Write-Error "Zero-Leak route invocation failed: $($_.Exception.Message)"
        exit 1
    }
} else {
    Write-Host "Skipping Zero-Leak cron probe. Re-run with -RunZeroLeak after the dispatch claim migrations are live."
}

Write-Host "Smoke test completed successfully. Check Supabase leads and lead_events tables for records."
