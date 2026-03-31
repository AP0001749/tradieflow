param(
    [switch]$WithAuth
)

function Load-EnvFile {
    param(
        [string]$Path = ".env.local"
    )

    if (-not (Test-Path $Path)) {
        Write-Error "$Path not found."
        exit 1
    }

    Get-Content $Path | ForEach-Object {
        if ([string]::IsNullOrWhiteSpace($_) -or $_.TrimStart().StartsWith('#')) {
            return
        }

        $parts = $_ -split '=', 2
        if ($parts.Length -eq 2) {
            Set-Item -Path ("Env:" + $parts[0].Trim()) -Value $parts[1]
        }
    }
}

Load-EnvFile

$appUrl = $env:NEXT_PUBLIC_APP_URL
if (-not $appUrl) {
    Write-Error "NEXT_PUBLIC_APP_URL is missing from .env.local."
    exit 1
}

$uri = ($appUrl.TrimEnd('/') + "/api/cron/leads-followup")
$headers = @{}

if ($WithAuth) {
    $secret = if ($env:LEAD_FOLLOWUP_SECRET) { $env:LEAD_FOLLOWUP_SECRET } else { $env:CRON_SECRET }
    if (-not $secret) {
        Write-Error "No LEAD_FOLLOWUP_SECRET or CRON_SECRET found in .env.local."
        exit 1
    }

    $headers["Authorization"] = "Bearer $secret"
    $headers["x-cron-secret"] = $secret
}

try {
    $response = Invoke-WebRequest -Uri $uri -Method Post -Headers $headers -UseBasicParsing
    $body = $response.Content
} catch {
    if (-not $_.Exception.Response) {
        throw
    }

    $response = $_.Exception.Response
    $bodyReader = New-Object IO.StreamReader($response.GetResponseStream())
    $body = $bodyReader.ReadToEnd()
}
$output = [pscustomobject]@{
    uri = $uri
    withAuth = [bool]$WithAuth
    status = [int]$response.StatusCode
    route = $response.Headers["X-Tradieflow-Followup-Route"]
    auth = $response.Headers["X-Tradieflow-Followup-Auth"]
    secretCount = $response.Headers["X-Tradieflow-Followup-Secret-Count"]
    secretSources = $response.Headers["X-Tradieflow-Followup-Secret-Sources"]
    body = $body
}

$output | ConvertTo-Json -Depth 4
