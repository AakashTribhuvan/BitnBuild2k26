$ErrorActionPreference = "Stop"
$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$runId = [guid]::NewGuid().ToString()
$resultsDirectory = Join-Path $PSScriptRoot "results"
$tokenPath = Join-Path $resultsDirectory "$runId-tokens.json"
$summaryPath = Join-Path $resultsDirectory "$runId-k6-summary.json"
$eventId = ""
$fixtureProvisioned = $false
$k6ExitCode = 1
$durationSeconds = 0
$summary = $null

Push-Location $repositoryRoot
try {
    $backendStatus = docker inspect --format '{{.State.Health.Status}}' fairdrop-backend 2>$null
    if ($LASTEXITCODE -ne 0 -or $backendStatus.Trim() -ne "healthy") {
        throw "The local FairDrop API container must be healthy before running simulations."
    }

    docker image inspect grafana/k6:latest *> $null
    if ($LASTEXITCODE -ne 0) {
        docker pull grafana/k6:latest
        if ($LASTEXITCODE -ne 0) { throw "Could not download the k6 runner image." }
    }

    New-Item -ItemType Directory -Force -Path $resultsDirectory | Out-Null
    $fixtureJson = & docker exec -e "SIMULATION_RUN_ID=$runId" fairdrop-backend node dist/db/simulationCohorts.js provision
    if ($LASTEXITCODE -ne 0) { throw "Could not prepare isolated synthetic accounts and event." }
    $fixture = ($fixtureJson -join "`n") | ConvertFrom-Json
    $eventId = $fixture.eventId
    if (!$eventId) { throw "The simulation fixture did not return an event ID." }
    $fixtureProvisioned = $true
    ($fixtureJson -join "`n") | Set-Content -Path $tokenPath -NoNewline -Encoding ascii

    $mount = "type=bind,source=$((Join-Path $repositoryRoot 'tests')),target=/workspace/tests"
    $backendMount = "type=bind,source=$((Join-Path $repositoryRoot 'backend')),target=/workspace/backend,readonly"
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    & docker run --rm --mount $mount --mount $backendMount --workdir /workspace `
        -e "BASE_URL=http://host.docker.internal:4000" `
        -e "EVENT_ID=$eventId" `
        -e "TOKENS_PATH=/workspace/tests/load/results/$runId-tokens.json" `
        -e "SUMMARY_PATH=/workspace/tests/load/results/$runId-k6-summary.json" `
        grafana/k6:latest run /workspace/backend/load/cohort-simulation.js
    $k6ExitCode = $LASTEXITCODE
    $stopwatch.Stop()
    $durationSeconds = [Math]::Max(1, [Math]::Ceiling($stopwatch.Elapsed.TotalSeconds))

    if (Test-Path $summaryPath) {
        $summary = Get-Content -Raw -Path $summaryPath | ConvertFrom-Json
    }
}
finally {
    $finalizeError = ""
    if ($fixtureProvisioned) {
        $requestCount = 0
        $requestErrors = 0
        if ($summary -and $summary.metrics) {
            if ($summary.metrics.http_reqs) {
                $requestCount = [int]$summary.metrics.http_reqs.values.count
            }
            foreach ($metricName in @("human_errors", "bot_errors")) {
                $metric = $summary.metrics.$metricName
                if ($metric) { $requestErrors += [int]$metric.values.count }
            }
        }
        $success = $k6ExitCode -eq 0
        try {
            $finalResult = & docker exec `
                -e "SIMULATION_RUN_ID=$runId" `
                -e "SIMULATION_SUCCESS=$($success.ToString().ToLowerInvariant())" `
                -e "SIMULATION_REQUEST_COUNT=$requestCount" `
                -e "SIMULATION_REQUEST_ERRORS=$requestErrors" `
                -e "SIMULATION_DURATION_SECONDS=$durationSeconds" `
                fairdrop-backend node dist/db/simulationCohorts.js finalize
            if ($LASTEXITCODE -ne 0) {
                throw "The isolated fixture cleanup/report could not be completed."
            }
            $finalResult | Write-Output
        }
        catch {
            $finalizeError = $_.Exception.Message
        }
    }
    try {
        foreach ($path in @($tokenPath, $summaryPath)) {
            if (Test-Path -LiteralPath $path) {
                Remove-Item -LiteralPath $path -Force
            }
        }
    }
    finally {
        Pop-Location
    }
    if ($finalizeError) {
        throw "The simulation fixture cleanup/report failed: $finalizeError"
    }
}

if ($k6ExitCode -ne 0) {
    throw "k6 returned exit code $k6ExitCode. The simulation record, if any, is marked incomplete."
}
