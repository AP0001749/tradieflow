<#
TradieFlow production preflight

Checks the environment and repo shape needed for the HVAC/Apex rollout without
calling live cron routes, sending SMS, or creating records.

Usage:
  .\scripts\production-preflight.ps1
  .\scripts\production-preflight.ps1 -EnvFile .env.production.local -Strict
#>

param(
    [string]$EnvFile = ".env.local",
    [switch]$Strict
)

$script:Issues = @()
$script:Warnings = @()

function Write-Check {
    param(
        [string]$Status,
        [string]$Message
    )

    $color = switch ($Status) {
        "OK" { "Green" }
        "WARN" { "Yellow" }
        "FAIL" { "Red" }
        default { "Gray" }
    }

    Write-Host "[$Status] $Message" -ForegroundColor $color
}

function Add-Issue {
    param([string]$Message)
    $script:Issues += $Message
    Write-Check -Status "FAIL" -Message $Message
}

function Add-Warning {
    param([string]$Message)
    $script:Warnings += $Message
    Write-Check -Status "WARN" -Message $Message
}

function Load-EnvFile {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        Add-Issue "$Path not found."
        return
    }

    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith("#")) {
            return
        }

        $parts = $line -split "=", 2
        if ($parts.Length -ne 2) {
            return
        }

        $key = $parts[0].Trim()
        $value = $parts[1].Trim()

        if (
            ($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'"))
        ) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        Set-Item -Path "Env:$key" -Value $value
    }

    Write-Check -Status "OK" -Message "Loaded $Path"
}

function Get-EnvValue {
    param([string]$Name)
    return (Get-Item -Path "Env:$Name" -ErrorAction SilentlyContinue).Value
}

function Test-LooksLikePlaceholder {
    param([string]$Value)

    if (-not $Value) {
        return $false
    }

    $trimmedValue = $Value.Trim()
    return (
        $trimmedValue -eq "http://localhost:3000" -or
        $trimmedValue -match "(^|[:/@])your[-_]" -or
        $trimmedValue -match "^(price|sk_test|sk_live|pk_test|pk_live|whsec)_your" -or
        $trimmedValue -match "\.example($|/)"
    )
}

function Test-EnvVar {
    param(
        [string]$Name,
        [switch]$AllowPlaceholder
    )

    $value = Get-EnvValue -Name $Name
    if (-not $value) {
        Add-Issue "$Name is missing."
        return $false
    }

    if (-not $AllowPlaceholder -and (Test-LooksLikePlaceholder -Value $value)) {
        Add-Warning "$Name still looks like a local placeholder."
        return $false
    }

    Write-Check -Status "OK" -Message "$Name is present."
    return $true
}

function Test-AnyEnvVar {
    param(
        [string[]]$Names,
        [string]$Label
    )

    foreach ($name in $Names) {
        $value = Get-EnvValue -Name $name
        if ($value) {
            if (Test-LooksLikePlaceholder -Value $value) {
                Add-Warning "$Label is present via $name but still looks like a placeholder."
                return $false
            }

            Write-Check -Status "OK" -Message "$Label is present via $name."
            return $true
        }
    }

    Add-Issue "$Label is missing. Expected one of: $($Names -join ', ')"
    return $false
}

function Test-FileExists {
    param(
        [string]$Path,
        [string]$Label
    )

    if (Test-Path -LiteralPath $Path) {
        Write-Check -Status "OK" -Message "$Label exists."
        return
    }

    Add-Issue "$Label missing: $Path"
}

Write-Host "TradieFlow production preflight" -ForegroundColor Cyan
Write-Host "Env file: $EnvFile"

Load-EnvFile -Path $EnvFile

Write-Host "`nCore app env" -ForegroundColor Cyan
Test-EnvVar "NEXT_PUBLIC_APP_URL" | Out-Null
Test-EnvVar "NEXT_PUBLIC_SUPABASE_URL" | Out-Null
Test-EnvVar "NEXT_PUBLIC_SUPABASE_ANON_KEY" | Out-Null
Test-EnvVar "SUPABASE_SERVICE_ROLE_KEY" | Out-Null
Test-EnvVar "UPSTASH_REDIS_REST_URL" | Out-Null
Test-EnvVar "UPSTASH_REDIS_REST_TOKEN" | Out-Null

Write-Host "`nEmail and automation env" -ForegroundColor Cyan
Test-EnvVar "RESEND_API_KEY" | Out-Null
Test-AnyEnvVar -Names @("RESEND_SENDER_EMAIL", "RESEND_FROM_EMAIL") -Label "Resend sender identity" | Out-Null
Test-AnyEnvVar -Names @("LEAD_FOLLOWUP_SECRET", "CRON_SECRET") -Label "Cron auth secret" | Out-Null
if ((Get-EnvValue "CRON_SECRET") -and -not (Get-EnvValue "LEAD_FOLLOWUP_SECRET")) {
    Add-Warning "Only CRON_SECRET is present. Prefer LEAD_FOLLOWUP_SECRET and keep CRON_SECRET as a temporary alias."
}

Write-Host "`nStripe env" -ForegroundColor Cyan
Test-EnvVar "STRIPE_SECRET_KEY" | Out-Null
Test-EnvVar "STRIPE_WEBHOOK_SECRET" | Out-Null
Test-EnvVar "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" | Out-Null
Test-EnvVar "NEXT_PUBLIC_STRIPE_BASELINE_PRICE_ID" | Out-Null
Test-EnvVar "NEXT_PUBLIC_STRIPE_APEX_PRICE_ID" | Out-Null
if (-not (Get-EnvValue "NEXT_PUBLIC_STRIPE_PRO_PRICE_ID")) {
    Add-Warning "NEXT_PUBLIC_STRIPE_PRO_PRICE_ID is absent. That is fine after Baseline is configured, but legacy cutover fallbacks will not work."
}

Write-Host "`nTwilio env" -ForegroundColor Cyan
Test-EnvVar "TWILIO_ACCOUNT_SID" | Out-Null
Test-EnvVar "TWILIO_AUTH_TOKEN" | Out-Null
$twilioSkipValidation = Get-EnvValue "TWILIO_SKIP_SIGNATURE_VALIDATION"
if ($twilioSkipValidation -eq "true") {
    Add-Issue "TWILIO_SKIP_SIGNATURE_VALIDATION=true. Disable this in production."
} elseif ($twilioSkipValidation) {
    Write-Check -Status "OK" -Message "TWILIO_SKIP_SIGNATURE_VALIDATION is not enabled."
} else {
    Add-Warning "TWILIO_SKIP_SIGNATURE_VALIDATION is not set. Set it to false explicitly in production."
}

Write-Host "`nCritical migrations" -ForegroundColor Cyan
$criticalMigrations = @(
    "supabase/migrations/20260403110000_add_trade_job_metadata.sql",
    "supabase/migrations/20260404083000_add_lead_sms_tracking.sql",
    "supabase/migrations/20260407090000_add_zero_leak_dispatch_claims.sql",
    "supabase/migrations/20260407103000_add_missed_call_text_back_routing.sql",
    "supabase/migrations/20260408100000_add_missed_call_textback_claims.sql",
    "supabase/migrations/20260408113000_add_dispatch_profile_fields.sql",
    "supabase/migrations/20260408124500_expand_create_job_with_trade_fields.sql",
    "supabase/migrations/20260409091500_expand_zero_leak_sms_channels.sql",
    "supabase/migrations/20260409103000_add_job_dispatch_fields.sql",
    "supabase/migrations/20260409114500_add_dispatch_roster_to_business_profile.sql",
    "supabase/migrations/20260410083000_expand_public_booking_profile_job_types.sql",
    "supabase/migrations/20260410101500_add_primary_trade_focus_to_business_profile.sql",
    "supabase/migrations/20260410114500_add_job_dispatch_sequence.sql",
    "supabase/migrations/20260410131500_add_job_dispatch_check_in_fields.sql",
    "supabase/migrations/20260411100000_add_field_check_in_links_to_jobs.sql",
    "supabase/migrations/20260411113000_add_job_dispatch_events.sql",
    "supabase/migrations/20260411124500_add_lead_emergency_triage.sql",
    "supabase/migrations/20260411133000_add_lead_first_response_at.sql",
    "supabase/migrations/20260411143000_add_business_lead_response_slas.sql",
    "supabase/migrations/20260411153000_update_zero_leak_emergency_trade_templates.sql",
    "supabase/migrations/20260411160000_add_sms_opt_out_to_zero_leak_templates.sql",
    "supabase/migrations/20260411163000_gate_zero_leak_apex_automations.sql",
    "supabase/migrations/20260411164500_gate_missed_call_baseline_automation.sql",
    "supabase/migrations/20260429103000_enable_rls_for_twilio_missed_call_textbacks.sql"
)

foreach ($migration in $criticalMigrations) {
    Test-FileExists -Path $migration -Label $migration
}

Write-Host "`nCritical app routes and modules" -ForegroundColor Cyan
$criticalAppFiles = @(
    "src/app/api/cron/zero-leak/route.ts",
    "src/app/api/twilio/voice/route.ts",
    "src/app/api/twilio/missed-call/route.ts",
    "src/app/api/twilio/webhook/route.ts",
    "src/app/api/field/check-in/route.ts",
    "src/app/book/[slug]/page.tsx",
    "src/app/field/[token]/page.tsx",
    "src/app/dashboard/dispatch/page.tsx",
    "src/app/dashboard/leads/[id]/page.tsx",
    "src/app/dashboard/outreach/page.tsx",
    "src/components/dashboard/emergency-lead-queue.tsx",
    "src/components/dashboard/lead-activity-feed.tsx",
    "src/components/dashboard/lead-response-actions.tsx",
    "src/components/dashboard/zero-leak-queue.tsx",
    "src/components/dashboard/zero-leak-readiness.tsx",
    "src/components/marketing/capital-extraction-simulator.tsx",
    "src/lib/dispatch-check-in.ts",
    "src/lib/dispatch-geo.ts",
    "src/lib/lead-triage.ts",
    "src/lib/outreach-kit.ts",
    "src/lib/pricing.ts",
    "src/lib/zero-leak.ts"
)

foreach ($appFile in $criticalAppFiles) {
    Test-FileExists -Path $appFile -Label $appFile
}

Write-Host "`nProduction checklist docs" -ForegroundColor Cyan
Test-FileExists -Path ".env.production.local.example" -Label "Production env example"
Test-FileExists -Path "DEPLOYMENT_CHECKLIST.md" -Label "Deployment checklist"
Test-FileExists -Path "LEAD_AUTOMATION_SETUP.md" -Label "Lead automation setup"
Test-FileExists -Path "scripts/pivot-regression-audit.ps1" -Label "Pivot regression audit script"
Test-FileExists -Path "scripts/release-gate.ps1" -Label "Release gate script"
Test-FileExists -Path "scripts/smoke-test.ps1" -Label "Smoke test script"
Test-FileExists -Path ".github/workflows/release-gate.yml" -Label "Release gate GitHub Actions workflow"

Write-Host "`nSummary" -ForegroundColor Cyan
Write-Host "Issues: $($script:Issues.Count)"
Write-Host "Warnings: $($script:Warnings.Count)"

if ($script:Issues.Count -gt 0) {
    Write-Host "`nBlocking issues:" -ForegroundColor Red
    $script:Issues | ForEach-Object { Write-Host "- $_" -ForegroundColor Red }
}

if ($script:Warnings.Count -gt 0) {
    Write-Host "`nWarnings:" -ForegroundColor Yellow
    $script:Warnings | ForEach-Object { Write-Host "- $_" -ForegroundColor Yellow }
}

if ($Strict -and ($script:Issues.Count -gt 0 -or $script:Warnings.Count -gt 0)) {
    exit 1
}

if ($script:Issues.Count -gt 0) {
    exit 1
}

Write-Check -Status "OK" -Message "Preflight completed without blocking issues."
