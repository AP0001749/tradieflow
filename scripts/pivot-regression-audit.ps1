<#
TradieFlow HVAC/Apex pivot regression audit

Checks that the repo still presents TradieFlow as an emergency-trades Zero-Leak
platform, not a cleaner-market convenience tool or unsafe outbound system.

This script only reads local files. It does not scrape, send SMS, submit forms, or
call live services.

Usage:
  .\scripts\pivot-regression-audit.ps1
#>

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

function Get-TextFiles {
    param([string[]]$Roots)

    $files = @()
    foreach ($root in $Roots) {
        if (-not (Test-Path -LiteralPath $root)) {
            Add-Warning "Scan root missing: $root"
            continue
        }

        $item = Get-Item -LiteralPath $root
        if (-not $item.PSIsContainer) {
            $files += $item.FullName
            continue
        }

        $files += Get-ChildItem -LiteralPath $root -Recurse -File |
            Where-Object {
                $_.FullName -notmatch "\\node_modules\\" -and
                $_.FullName -notmatch "\\.next\\" -and
                $_.FullName -notmatch "\\.git\\" -and
                $_.Name -ne "pivot-regression-audit.ps1" -and
                $_.Extension -in @(
                    ".ts",
                    ".tsx",
                    ".js",
                    ".jsx",
                    ".md",
                    ".ps1",
                    ".sql",
                    ".example",
                    ".json"
                )
            } |
            Select-Object -ExpandProperty FullName
    }

    return $files | Sort-Object -Unique
}

function Test-FileContains {
    param(
        [string]$Path,
        [string]$Pattern,
        [string]$Label
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        Add-Issue "$Label missing: $Path"
        return
    }

    $content = Get-Content -LiteralPath $Path -Raw
    if ($content -match $Pattern) {
        Write-Check -Status "OK" -Message $Label
        return
    }

    Add-Issue "$Label not found in $Path"
}

function Test-ForbiddenPatterns {
    param(
        [string[]]$Files,
        [string[]]$Patterns,
        [string]$Label,
        [scriptblock]$AllowLine
    )

    $hits = @()
    foreach ($file in $Files) {
        $relativePath = Resolve-Path -LiteralPath $file -Relative
        $lines = Get-Content -LiteralPath $file
        for ($index = 0; $index -lt $lines.Length; $index++) {
            $line = $lines[$index]
            foreach ($pattern in $Patterns) {
                if ($line -match $pattern) {
                    if ($AllowLine -and (& $AllowLine $relativePath $line)) {
                        continue
                    }

                    $hits += "${relativePath}:$($index + 1): $line"
                }
            }
        }
    }

    if ($hits.Count -eq 0) {
        Write-Check -Status "OK" -Message $Label
        return
    }

    Add-Issue "$Label found $($hits.Count) regression marker(s)."
    $hits | Select-Object -First 20 | ForEach-Object {
        Write-Host "  $_" -ForegroundColor Red
    }
}

Write-Host "TradieFlow HVAC/Apex pivot regression audit" -ForegroundColor Cyan

$scanFiles = Get-TextFiles -Roots @(
    "src",
    "scripts",
    "supabase/migrations",
    "supabase/functions",
    "README.md",
    "DEPLOYMENT_CHECKLIST.md",
    "LEAD_AUTOMATION_SETUP.md",
    ".env.local.example",
    ".env.production.local.example",
    "package.json"
)

Write-Host "`nCleaner-market residue" -ForegroundColor Cyan
Test-ForbiddenPatterns `
    -Files $scanFiles `
    -Label "No cleaner-market positioning remains" `
    -Patterns @(
        '\bcleaners?\b',
        '\bcleaning business(?:es)?\b',
        '\bmaid\b',
        '\bhousekeep(?:ing|er|ers)?\b',
        '\bend of lease\b',
        '\bbond clean(?:ing)?\b',
        '\bcarpet clean(?:ing)?\b',
        '\bwindow clean(?:ing)?\b'
    )

Write-Host "`nLow-tier SaaS residue" -ForegroundColor Cyan
Test-ForbiddenPatterns `
    -Files $scanFiles `
    -Label "No low-tier pricing or generic convenience positioning remains" `
    -Patterns @(
        '\$99',
        '\b99/month\b',
        '\bbooking software\b',
        '\bcustomer tipping\b',
        '\brecurring schedule\b'
    )

Write-Host "`nUnsafe acquisition residue" -ForegroundColor Cyan
Test-ForbiddenPatterns `
    -Files $scanFiles `
    -Label "No unsafe scraping/bulk-outreach implementation language remains" `
    -Patterns @(
        '\blocust\b',
        '\bmobile numbers only\b',
        '\bwebsite form injection\b',
        '\bform injection\b',
        '\bscrape Google My Business\b',
        '\bbulk SMS\b',
        '\bbulk-submit website forms\b'
    ) `
    -AllowLine {
        param($Path, $Line)
        return (
            $Line -match "\bDo not\b" -or
            $Line -match "\bwithout\b" -or
            $Line -match "\banti-spam\b" -or
            $Line -match "\bnot\b"
        )
    }

Write-Host "`nRequired HVAC/Apex markers" -ForegroundColor Cyan
Test-FileContains -Path "src/app/page.tsx" -Pattern "Zero-Leak Funnel" -Label "Homepage presents the Zero-Leak Funnel"
Test-FileContains -Path "src/app/page.tsx" -Pattern "HVAC, plumbing, and electrical" -Label "Homepage targets emergency trades"
Test-FileContains -Path "src/lib/pricing.ts" -Pattern "priceAud:\s*299" -Label "Baseline plan is priced at 299 AUD"
Test-FileContains -Path "src/lib/pricing.ts" -Pattern "priceAud:\s*499" -Label "Apex plan is priced at 499 AUD"
Test-FileContains -Path "src/lib/pricing.ts" -Pattern "hasBaselineAutomationAccess" -Label "Baseline automation gate exists"
Test-FileContains -Path "src/lib/pricing.ts" -Pattern "hasApexAutomationAccess" -Label "Apex automation gate exists"
Test-FileContains -Path "src/lib/zero-leak.ts" -Pattern "Reply STOP to opt out" -Label "Zero-Leak SMS templates include opt-out copy"
Test-FileContains -Path "src/app/api/twilio/missed-call/route.ts" -Pattern "missed-call text backs" -Label "Missed-call text-back route is present"
Test-FileContains -Path "src/app/api/cron/zero-leak/route.ts" -Pattern "Apex plan required for quote nurture automation" -Label "Quote nurture is Apex gated"
Test-FileContains -Path "src/app/api/cron/zero-leak/route.ts" -Pattern "Apex plan required for review extraction automation" -Label "Review extraction is Apex gated"
Test-FileContains -Path "src/app/dashboard/outreach/page.tsx" -Pattern "Compliant acquisition" -Label "Outreach page is framed as compliant acquisition"
Test-FileContains -Path "src/app/dashboard/outreach/page.tsx" -Pattern "Do not scrape mobile numbers" -Label "Outreach guardrail blocks scraping"
Test-FileContains -Path ".env.production.local.example" -Pattern "NEXT_PUBLIC_STRIPE_BASELINE_PRICE_ID" -Label "Production env example includes Baseline price ID"
Test-FileContains -Path ".env.production.local.example" -Pattern "NEXT_PUBLIC_STRIPE_APEX_PRICE_ID" -Label "Production env example includes Apex price ID"
Test-FileContains -Path "scripts/production-preflight.ps1" -Pattern "Critical app routes and modules" -Label "Production preflight checks critical app files"

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

if ($script:Issues.Count -gt 0) {
    exit 1
}

Write-Check -Status "OK" -Message "Pivot regression audit completed without blocking issues."
