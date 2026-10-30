<#
TradieFlow production missed-call recovery smoke test

Runs the production proof sequence for:
  missed call -> SMS text-back -> lead -> dashboard activity -> STOP suppression

Usage:
  # Step 0: verify deploy readiness and workspace Twilio config
  .\scripts\production-missed-call-smoke-test.ps1 -PreflightOnly

  # Step 1: after placing a real missed call, collect evidence by CallSid
  .\scripts\production-missed-call-smoke-test.ps1 -CallSid CAxxxxxxxx -CallerPhone 0412345678

  # Step 2: after texting STOP from the caller phone, verify suppression
  .\scripts\production-missed-call-smoke-test.ps1 -CallerPhone 0412345678 -VerifyStop

  # Step 3: after replying with a normal SMS, verify activity feed events
  .\scripts\production-missed-call-smoke-test.ps1 -CallerPhone 0412345678 -VerifyReply

  # Check whether any production missed-call rows exist yet
  .\scripts\production-missed-call-smoke-test.ps1 -ListRecent

Environment:
  Loads .env.production.local by default. Never commit evidence output; it may contain PII.
#>

param(
    [string]$EnvFile = ".env.production.local",
    [string]$AppBaseUrl = "",
    [string]$CallSid = "",
    [string]$CallerPhone = "",
    [switch]$PreflightOnly,
    [switch]$VerifyStop,
    [switch]$VerifyReply,
    [switch]$ListRecent,
    [string]$EvidenceRoot = "docs/production-evidence"
)

$ErrorActionPreference = "Stop"

function Write-Phase {
    param([string]$Title)
    Write-Host ""
    Write-Host "=== $Title ===" -ForegroundColor Cyan
}

function Write-Step {
    param(
        [string]$Status,
        [string]$Message
    )

    $color = switch ($Status) {
        "PASS" { "Green" }
        "FAIL" { "Red" }
        "WARN" { "Yellow" }
        "INFO" { "Gray" }
        "MANUAL" { "Magenta" }
        default { "White" }
    }

    Write-Host "[$Status] $Message" -ForegroundColor $color
}

function Load-EnvFile {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "$Path not found. Copy .env.production.local.example and fill production values first."
    }

    Get-Content -LiteralPath $Path | ForEach-Object {
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

        $value = $value.Trim()
        Set-Item -Path "Env:$key" -Value $value
    }
}

function Get-EnvValue {
    param([string]$Name)
    $value = (Get-Item -Path "Env:$Name" -ErrorAction SilentlyContinue).Value
    if ($null -eq $value) {
        return $null
    }

    return $value.Trim().Trim('"').Trim("'")
}

function Get-LinkedSupabaseProjectRef {
    $repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
    $projectRefPath = Join-Path $repoRoot "supabase\.temp\project-ref"
    if (-not (Test-Path -LiteralPath $projectRefPath)) {
        return $null
    }

    $projectRef = (Get-Content -LiteralPath $projectRefPath -Raw).Trim()
    if ([string]::IsNullOrWhiteSpace($projectRef)) {
        return $null
    }

    return $projectRef
}

function Get-SupabaseBaseUrl {
    $candidates = @()

    $envUrl = Get-EnvValue "NEXT_PUBLIC_SUPABASE_URL"
    if ($envUrl) {
        $candidates += $envUrl
    }

    $projectRef = Get-LinkedSupabaseProjectRef
    if ($projectRef) {
        $candidates += "https://$projectRef.supabase.co"
    }

    foreach ($candidate in ($candidates | Select-Object -Unique)) {
        $parsed = $null
        if ([System.Uri]::TryCreate($candidate, [System.UriKind]::Absolute, [ref]$parsed)) {
            if ($candidate -ne $envUrl -and $envUrl) {
                Write-Step -Status "WARN" -Message "NEXT_PUBLIC_SUPABASE_URL is invalid; using linked Supabase project URL instead."
            }
            return $parsed.AbsoluteUri.TrimEnd("/")
        }
    }

    throw "Could not resolve a valid Supabase URL from $EnvFile or supabase/.temp/project-ref."
}

function Ensure-Array {
    param($Value)

    if ($null -eq $Value) {
        return @()
    }

    if ($Value -is [System.Array]) {
        return @($Value)
    }

    if ($Value.PSObject.Properties.Name -contains "Count" -and $Value.PSObject.Properties.Name -contains "value") {
        return @($Value.value)
    }

    return @($Value)
}

function Get-PhoneDigits {
    param([string]$Value)
    return ($Value -replace "\D+", "")
}

function Get-PhoneSearchSuffixes {
    param([string]$Value)

    $digits = Get-PhoneDigits -Value $Value
    $suffixes = @()

    if ($digits.Length -ge 8) {
        $suffixes += $digits
        if ($digits.Length -ge 10) {
            $suffixes += $digits.Substring($digits.Length - 10)
        }
        if ($digits.Length -ge 9) {
            $suffixes += $digits.Substring($digits.Length - 9)
        }
    }

    return ($suffixes | Select-Object -Unique)
}

function Get-SupabaseHeaders {
    $serviceRole = Get-EnvValue "SUPABASE_SERVICE_ROLE_KEY"
    $anonKey = Get-EnvValue "NEXT_PUBLIC_SUPABASE_ANON_KEY"

    if (-not $serviceRole -or -not $anonKey) {
        throw "Supabase keys are missing from $EnvFile."
    }

    return @{
        apikey = $anonKey
        Authorization = "Bearer $serviceRole"
        Accept = "application/json"
        Prefer = "return=representation"
    }
}

function Invoke-SupabaseRest {
    param(
        [string]$Path,
        [string]$Query = ""
    )

    $baseUrl = Get-SupabaseBaseUrl
    $builder = [System.UriBuilder]::new("$baseUrl/rest/v1/$Path")
    if ($Query) {
        $builder.Query = $Query
    }

    return Ensure-Array (Invoke-RestMethod -Uri $builder.Uri.AbsoluteUri -Headers (Get-SupabaseHeaders) -Method Get)
}

function Save-Evidence {
    param(
        [string]$RunId,
        [string]$Name,
        $Payload
    )

    $dir = Join-Path $EvidenceRoot $RunId
    if (-not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    $filePath = Join-Path $dir "$Name.json"
    $Payload | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $filePath -Encoding UTF8
    return $filePath
}

function Test-AppHealth {
    param([string]$BaseUrl)

    $checks = @(
        @{ Path = "/login"; Label = "Login page" },
        @{ Path = "/dashboard"; Label = "Dashboard auth gate" }
    )

    $results = @()
    foreach ($check in $checks) {
        $url = "$BaseUrl$($check.Path)"
        try {
            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -Method GET -TimeoutSec 20 -MaximumRedirection 0 -ErrorAction Stop
            $results += [pscustomobject]@{
                label = $check.Label
                url = $url
                status = [int]$response.StatusCode
                ok = $true
            }
            Write-Step -Status "PASS" -Message "$($check.Label) responded HTTP $($response.StatusCode)"
        } catch {
            $status = $null
            if ($_.Exception.Response) {
                $status = [int]$_.Exception.Response.StatusCode
            }

            $ok = $status -in @(200, 301, 302, 307, 308)
            $results += [pscustomobject]@{
                label = $check.Label
                url = $url
                status = $status
                ok = $ok
                error = $_.Exception.Message
            }

            if ($ok) {
                Write-Step -Status "PASS" -Message "$($check.Label) responded HTTP $status"
            } else {
                Write-Step -Status "FAIL" -Message "$($check.Label) failed: $($_.Exception.Message)"
            }
        }
    }

    return $results
}

function Get-BusinessProfiles {
    $select = "id,business_name,booking_url_slug,twilio_phone_number,missed_call_forwarding_number,missed_call_text_enabled,user_id"
    return Invoke-SupabaseRest -Path "business_profile" -Query "select=$select&order=created_at.desc&limit=20"
}

function Get-ProfileSubscription {
    param([string]$UserId)

    $select = "user_id,subscription_plan_key,subscription_status,subscription_tier"
    return Invoke-SupabaseRest -Path "profiles" -Query "select=$select&user_id=eq.$UserId&limit=1"
}

function Find-LeadByPhone {
    param([string]$Phone)

    $suffixes = Get-PhoneSearchSuffixes -Value $Phone
    if ($suffixes.Count -eq 0) {
        return @()
    }

    $filters = ($suffixes | ForEach-Object { "phone.ilike.*$($_)*" }) -join ","
    $select = "id,business_id,name,phone,source,status,lead_urgency,sms_do_not_contact,sms_do_not_contact_reason,sms_last_inbound_message,sms_last_inbound_sid,first_responded_at,created_at,updated_at"
    return Invoke-SupabaseRest -Path "leads" -Query "select=$select&or=($filters)&order=created_at.desc&limit=10"
}

function Get-TextbackByCallSid {
    param([string]$Sid)

    $select = "call_sid,lead_id,business_id,from_number,to_number,dial_status,status,twilio_message_sid,last_error,sent_at,created_at,updated_at"
    return Invoke-SupabaseRest -Path "twilio_missed_call_textbacks" -Query "select=$select&call_sid=eq.$Sid&limit=5"
}

function Get-RecentTextbacks {
    param([int]$Limit = 5)

    $select = "call_sid,lead_id,business_id,from_number,to_number,dial_status,status,twilio_message_sid,sent_at,created_at"
    return Invoke-SupabaseRest -Path "twilio_missed_call_textbacks" -Query "select=$select&order=created_at.desc&limit=$Limit"
}

function Get-LeadEvents {
    param([string]$LeadId)

    $select = "id,lead_id,event_type,meta,created_at"
    return Invoke-SupabaseRest -Path "lead_events" -Query "select=$select&lead_id=eq.$LeadId&order=created_at.asc"
}

function New-RunId {
    return (Get-Date -Format "yyyyMMdd-HHmmss")
}

function Test-TwilioWebhooks {
    param([string]$BaseUrl)

    $accountSid = Get-EnvValue "TWILIO_ACCOUNT_SID"
    $authToken = Get-EnvValue "TWILIO_AUTH_TOKEN"
    if (-not $accountSid -or -not $authToken) {
        Write-Step -Status "WARN" -Message "Twilio credentials missing; skipping webhook verification."
        return @()
    }

    $expectedVoice = "$BaseUrl/api/twilio/voice"
    $expectedSms = "$BaseUrl/api/twilio/webhook"
    $uri = "https://api.twilio.com/2010-04-01/Accounts/$accountSid/IncomingPhoneNumbers.json?PageSize=20"
    $pair = "${accountSid}:${authToken}"
    $bytes = [System.Text.Encoding]::ASCII.GetBytes($pair)
    $basic = [Convert]::ToBase64String($bytes)
    $headers = @{ Authorization = "Basic $basic" }

    try {
        $response = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
    } catch {
        $status = $null
        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
        }

        if ($status -eq 401) {
            Write-Step -Status "FAIL" -Message "Twilio API rejected local credentials (HTTP 401). Until TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN match the account that owns +61485042397 on both the app host and Twilio Console, inbound webhooks will fail signature validation and no missed-call rows will be created."
        } else {
            Write-Step -Status "WARN" -Message "Could not verify Twilio webhooks via API. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in $EnvFile, then confirm webhooks manually in Twilio Console."
        }
        return @()
    }

    $results = @()

    foreach ($number in @($response.incoming_phone_numbers)) {
        $voiceOk = $number.voice_url -eq $expectedVoice
        $smsOk = $number.sms_url -eq $expectedSms
        $results += [pscustomobject]@{
            phone = $number.phone_number
            voice_url = $number.voice_url
            sms_url = $number.sms_url
            expected_voice = $expectedVoice
            expected_sms = $expectedSms
            voice_ok = $voiceOk
            sms_ok = $smsOk
        }

        if ($voiceOk -and $smsOk) {
            Write-Step -Status "PASS" -Message "Twilio $($number.phone_number) webhooks point at production routes."
        } else {
            Write-Step -Status "FAIL" -Message "Twilio $($number.phone_number) webhook mismatch. Voice=$($number.voice_url) SMS=$($number.sms_url)"
        }
    }

    return $results
}

function Write-ManualRunbook {
    param(
        [string]$BaseUrl,
        [string]$TwilioNumber
    )

    Write-Phase "Manual production proof sequence"
    Write-Step -Status "MANUAL" -Message "1. Deploy latest main to the app host if not already live."
    Write-Step -Status "MANUAL" -Message "2. Confirm Supabase migrations are applied: npx supabase migration list"
    Write-Step -Status "MANUAL" -Message "3. Confirm Edge Functions are deployed: npx supabase functions list"
    Write-Step -Status "MANUAL" -Message "4. In Twilio Console > Account Dashboard, copy the live Account SID and Auth Token into the app host env vars and .env.production.local."
    Write-Step -Status "MANUAL" -Message "5. Run: npm run probe:twilio:production (must PASS before placing a live missed call)."
    Write-Step -Status "MANUAL" -Message "6. Run: npm run probe:twilio:production:voice (must return Dial TwiML)."
    Write-Step -Status "MANUAL" -Message "7. In Twilio Console, set Voice webhook to POST $BaseUrl/api/twilio/voice"
    Write-Step -Status "MANUAL" -Message "8. In Twilio Console, set SMS webhook to POST $BaseUrl/api/twilio/webhook"
    Write-Step -Status "MANUAL" -Message "9. In /dashboard/settings, save Twilio number $TwilioNumber and a forwarding number that will NOT answer."
    Write-Step -Status "MANUAL" -Message "10. Ensure workspace subscription is Baseline or Apex and missed-call text-back is enabled."
    Write-Step -Status "MANUAL" -Message "11. From a separate mobile, call the Twilio number and let it ring out (~15s)."
    Write-Step -Status "MANUAL" -Message "12. Confirm the caller receives exactly one text-back SMS."
    Write-Step -Status "MANUAL" -Message "13. Copy the Twilio Call SID from Twilio Console > Monitor > Calls."
    Write-Step -Status "MANUAL" -Message "14. Re-run this script with -CallSid and -CallerPhone to collect evidence."
    Write-Step -Status "MANUAL" -Message "15. Open /dashboard/leads and screenshot the new lead plus activity feed."
    Write-Step -Status "MANUAL" -Message "16. Reply to the text from the caller phone; re-run with -VerifyReply."
    Write-Step -Status "MANUAL" -Message "17. Text STOP from the caller phone; re-run with -VerifyStop."
    Write-Step -Status "MANUAL" -Message "18. Place another missed call and confirm no automated SMS is sent."
}

Load-EnvFile -Path $EnvFile

$appUrl = if ($AppBaseUrl) { $AppBaseUrl.TrimEnd("/") } else { (Get-EnvValue "NEXT_PUBLIC_APP_URL").TrimEnd("/") }
if (-not $appUrl) {
    throw "NEXT_PUBLIC_APP_URL is missing."
}

$required = @(
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN"
)

foreach ($name in $required) {
    if (-not (Get-EnvValue $name)) {
        throw "$name is missing from $EnvFile."
    }
}

$runId = New-RunId
Write-Phase "TradieFlow production missed-call smoke test"
Write-Step -Status "INFO" -Message "Run ID: $runId"
Write-Step -Status "INFO" -Message "App URL: $appUrl"
Write-Step -Status "INFO" -Message "Evidence root: $EvidenceRoot\$runId"

Write-Phase "Deploy readiness"
$health = Test-AppHealth -BaseUrl $appUrl
Save-Evidence -RunId $runId -Name "app-health" -Payload $health | Out-Null

Write-Phase "Workspace Twilio configuration"
$profiles = @(Get-BusinessProfiles)
Save-Evidence -RunId $runId -Name "business-profiles" -Payload $profiles | Out-Null

if ($profiles.Count -eq 0) {
    Write-Step -Status "FAIL" -Message "No business_profile rows found."
    exit 1
}

$configured = @($profiles | Where-Object { $_.twilio_phone_number -and $_.missed_call_forwarding_number -and $_.missed_call_text_enabled })
if ($configured.Count -eq 0) {
    Write-Step -Status "FAIL" -Message "No workspace has twilio_phone_number + missed_call_forwarding_number + missed_call_text_enabled."
    foreach ($profile in $profiles) {
        Write-Step -Status "WARN" -Message "$($profile.business_name): twilio=$($profile.twilio_phone_number) forwarding=$($profile.missed_call_forwarding_number) enabled=$($profile.missed_call_text_enabled)"
    }
} else {
    foreach ($profile in $configured) {
        $subscription = @(Get-ProfileSubscription -UserId $profile.user_id)
        $plan = if ($subscription.Count -gt 0) { $subscription[0].subscription_plan_key } else { "unknown" }
        Write-Step -Status "PASS" -Message "$($profile.business_name) ready: Twilio $($profile.twilio_phone_number), plan=$plan, slug=$($profile.booking_url_slug)"
    }
}

$primary = if ($configured.Count -gt 0) { $configured[0] } else { $profiles[0] }

Write-Phase "Twilio webhook configuration"
$twilioChecks = @(Test-TwilioWebhooks -BaseUrl $appUrl)
Save-Evidence -RunId $runId -Name "twilio-webhooks" -Payload $twilioChecks | Out-Null

Write-ManualRunbook -BaseUrl $appUrl -TwilioNumber ($primary.twilio_phone_number)

if ($PreflightOnly) {
    Write-Phase "Preflight complete"
    Write-Step -Status "INFO" -Message "Evidence saved under $EvidenceRoot\$runId"
    if (-not $ListRecent) {
        exit 0
    }
}

if ($ListRecent) {
    Write-Phase "Recent missed-call activity"
    $recentTextbacks = Ensure-Array (Get-RecentTextbacks -Limit 10)
    Save-Evidence -RunId $runId -Name "recent-textbacks" -Payload $recentTextbacks | Out-Null

    if ($recentTextbacks.Count -eq 0) {
        Write-Step -Status "WARN" -Message "No rows in twilio_missed_call_textbacks yet. The live missed-call test has not completed successfully."
    } else {
        foreach ($row in $recentTextbacks) {
            if (-not $row.call_sid) { continue }
            Write-Step -Status "INFO" -Message "CallSid $($row.call_sid) status=$($row.status) from=$($row.from_number) sent_at=$($row.sent_at)"
        }
    }

    $recentLeads = Ensure-Array (Invoke-SupabaseRest -Path "leads" -Query "select=id,name,phone,source,status,created_at&source=eq.missed_call_text_back&order=created_at.desc&limit=10")
    Save-Evidence -RunId $runId -Name "recent-missed-call-leads" -Payload $recentLeads | Out-Null

    if ($recentLeads.Count -eq 0) {
        Write-Step -Status "WARN" -Message "No missed_call_text_back leads yet."
    } else {
        foreach ($lead in $recentLeads) {
            if (-not $lead.id) { continue }
            Write-Step -Status "INFO" -Message "Lead $($lead.id) phone=$($lead.phone) status=$($lead.status) created_at=$($lead.created_at)"
        }
    }

    Write-Step -Status "INFO" -Message "Evidence saved under $EvidenceRoot\$runId"
    exit 0
}

if (-not $CallerPhone -and -not $CallSid) {
    Write-Step -Status "WARN" -Message "No -CallerPhone or -CallSid supplied. Preflight evidence saved; run again after the missed call."
    exit 0
}

Write-Phase "Collecting missed-call evidence"

$textbacks = @()
if ($CallSid) {
    $textbacks = @(Get-TextbackByCallSid -Sid $CallSid)
} else {
    $textbacks = @(Get-RecentTextbacks -Limit 5)
}

Save-Evidence -RunId $runId -Name "textbacks" -Payload $textbacks | Out-Null

if ($CallSid) {
    if ($textbacks.Count -eq 0) {
        Write-Step -Status "FAIL" -Message "No twilio_missed_call_textbacks row for CallSid $CallSid."
    } elseif ($textbacks.Count -eq 1) {
        Write-Step -Status "PASS" -Message "Exactly one text-back claim row exists for CallSid $CallSid (duplicate-safe)."
        $row = $textbacks[0]
        Write-Step -Status "INFO" -Message "Text-back status=$($row.status) message_sid=$($row.twilio_message_sid) sent_at=$($row.sent_at)"
        if ($row.status -ne "sent") {
            Write-Step -Status "FAIL" -Message "Expected text-back status 'sent', got '$($row.status)'."
        } else {
            Write-Step -Status "PASS" -Message "Text-back marked sent in database."
        }
    } else {
        Write-Step -Status "FAIL" -Message "Multiple text-back rows found for one CallSid. Investigate dedupe claim."
    }
} else {
    Write-Step -Status "WARN" -Message "No CallSid supplied; saved latest text-back rows only."
}

$leads = @()
if ($CallerPhone) {
    $leads = @(Find-LeadByPhone -Phone $CallerPhone)
    Save-Evidence -RunId $runId -Name "leads" -Payload $leads | Out-Null

    if ($leads.Count -eq 0) {
        Write-Step -Status "FAIL" -Message "No lead matched caller phone $CallerPhone."
    } else {
        $lead = $leads[0]
        Write-Step -Status "PASS" -Message "Lead $($lead.id) found for caller phone (source=$($lead.source), status=$($lead.status))."
        $events = @(Get-LeadEvents -LeadId $lead.id)
        Save-Evidence -RunId $runId -Name "lead-events" -Payload $events | Out-Null

        $sentEvent = @($events | Where-Object { $_.event_type -eq "missed_call_text_back_sent" })
        if ($sentEvent.Count -ge 1) {
            Write-Step -Status "PASS" -Message "Activity feed source event missed_call_text_back_sent is present."
        } else {
            Write-Step -Status "FAIL" -Message "missed_call_text_back_sent event not found for lead $($lead.id)."
        }

        if ($VerifyReply) {
            $replyEvent = @($events | Where-Object { $_.event_type -eq "sms_received" })
            if ($replyEvent.Count -ge 1) {
                Write-Step -Status "PASS" -Message "Inbound reply logged as sms_received."
            } else {
                Write-Step -Status "FAIL" -Message "Expected sms_received after caller reply."
            }
        }

        if ($VerifyStop) {
            if ($lead.sms_do_not_contact -eq $true) {
                Write-Step -Status "PASS" -Message "Lead sms_do_not_contact=true after STOP."
            } else {
                Write-Step -Status "FAIL" -Message "Lead sms_do_not_contact is not true after STOP."
            }

            $stopEvent = @($events | Where-Object { $_.event_type -eq "sms_opt_out" })
            if ($stopEvent.Count -ge 1) {
                Write-Step -Status "PASS" -Message "STOP logged as sms_opt_out in lead_events."
            } else {
                Write-Step -Status "FAIL" -Message "Expected sms_opt_out event after STOP."
            }
        }
    }
}

$summary = [pscustomobject]@{
    run_id = $runId
    captured_at = (Get-Date).ToUniversalTime().ToString("o")
    app_url = $appUrl
    call_sid = $CallSid
    caller_phone = $CallerPhone
    verify_stop = [bool]$VerifyStop
    verify_reply = [bool]$VerifyReply
    evidence_dir = (Join-Path $EvidenceRoot $runId)
    next_steps = @(
        "Save Twilio Console call + message logs screenshots into the evidence folder.",
        "Save /dashboard/leads/[id] screenshots showing the lead and activity feed.",
        "If STOP verification passed, place one more missed call and confirm no SMS is sent."
    )
}

$summaryPath = Save-Evidence -RunId $runId -Name "summary" -Payload $summary
Write-Phase "Evidence package"
Write-Step -Status "PASS" -Message "Saved summary to $summaryPath"
Write-Step -Status "INFO" -Message "Add manual screenshots and Twilio log exports to $(Join-Path $EvidenceRoot $runId)"
