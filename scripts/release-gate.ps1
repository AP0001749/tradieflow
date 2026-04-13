<#
TradieFlow release gate

Runs the local checks that can pass before live credentials exist, and optionally
runs strict production env preflight when `.env.production.local` has been filled.

This script only reads local files and runs local build/check commands. It does
not scrape, send SMS, submit forms, or call live services.

Usage:
  .\scripts\release-gate.ps1
  .\scripts\release-gate.ps1 -StrictProduction
  .\scripts\release-gate.ps1 -ProductionEnvFile .env.production.local -StrictProduction
#>

param(
    [string]$ProductionEnvFile = ".env.production.local",
    [switch]$StrictProduction
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

function Invoke-CheckedCommand {
    param(
        [string]$Label,
        [scriptblock]$Command
    )

    Write-Host "`n$Label" -ForegroundColor Cyan
    & $Command
    $exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { $LASTEXITCODE }

    if ($exitCode -ne 0) {
        Add-Issue "$Label failed with exit code $exitCode."
        return
    }

    Write-Check -Status "OK" -Message "$Label completed."
}

function Test-PowerShellScript {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        Add-Issue "PowerShell script missing: $Path"
        return
    }

    $tokens = $null
    $errors = $null
    $null = [System.Management.Automation.Language.Parser]::ParseFile(
        (Resolve-Path -LiteralPath $Path),
        [ref]$tokens,
        [ref]$errors
    )

    if ($errors.Count -gt 0) {
        Add-Issue "PowerShell parser failed for $Path"
        $errors | Select-Object -First 5 | ForEach-Object {
            Write-Host "  $_" -ForegroundColor Red
        }
        return
    }

    Write-Check -Status "OK" -Message "$Path parses."
}

Write-Host "TradieFlow release gate" -ForegroundColor Cyan

Write-Host "`nPowerShell parser checks" -ForegroundColor Cyan
$powerShellScripts = @(
    "scripts/check-followup-route.ps1",
    "scripts/pivot-regression-audit.ps1",
    "scripts/production-preflight.ps1",
    "scripts/release-gate.ps1",
    "scripts/smoke-test.ps1"
)

foreach ($scriptPath in $powerShellScripts) {
    Test-PowerShellScript -Path $scriptPath
}

if ($script:Issues.Count -eq 0) {
    Invoke-CheckedCommand -Label "Local verifier" -Command {
        npm run verify:local
    }
}

if ($script:Issues.Count -eq 0) {
    Invoke-CheckedCommand -Label "Whitespace diff check" -Command {
        git diff --check
    }
}

Write-Host "`nProduction env preflight" -ForegroundColor Cyan
if (Test-Path -LiteralPath $ProductionEnvFile) {
    Invoke-CheckedCommand -Label "Strict production preflight" -Command {
        .\scripts\production-preflight.ps1 -EnvFile $ProductionEnvFile -Strict
    }
} elseif ($StrictProduction) {
    Add-Issue "$ProductionEnvFile not found. Create it from .env.production.local.example and fill real hosted values."
} else {
    Add-Warning "$ProductionEnvFile not found. Skipping strict production preflight until real hosted values are available."
}

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

Write-Check -Status "OK" -Message "Release gate completed without blocking issues."
