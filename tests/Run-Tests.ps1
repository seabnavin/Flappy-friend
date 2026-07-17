<#
.SYNOPSIS
  Runs the Flappy Friend test suite headlessly using Edge + CDP.
.NOTES
  No npm, Python, .NET SDK, or web server required.
  Requires: Edge (Chromium-based), PowerShell 5.1+
#>
[CmdletBinding()]
param([int]$TimeoutSeconds = 60)
$ErrorActionPreference = 'Stop'

$EdgeExe   = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$DebugPort = 9223
$TempDir   = "$env:TEMP\FlappyTests_$PID"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$HtmlPath  = Join-Path $ScriptDir 'browser-tests.html'
$FileUrl   = 'file:///' + ($HtmlPath -replace '\\', '/' -replace ' ', '%20')

function Stop-Everything {
    if ($script:ws -and $script:ws.State -ne 'Closed') { try { $script:ws.Dispose() } catch {} }
    if ($script:edgeProc -and -not $script:edgeProc.HasExited) {
        try { $script:edgeProc | Stop-Process -Force -ErrorAction SilentlyContinue } catch {}
    }
    Remove-Item $TempDir -Recurse -Force -ErrorAction SilentlyContinue
}
trap { Stop-Everything }

Write-Host ''
Write-Host '  Flappy Friend - Test Runner' -ForegroundColor Cyan
Write-Host '  -----------------------------------------------' -ForegroundColor DarkGray

if (-not (Test-Path $EdgeExe)) { Write-Host 'ERROR: Edge not found.' -ForegroundColor Red; exit 1 }

Write-Host '  Starting Edge...' -ForegroundColor DarkGray
$script:edgeProc = Start-Process $EdgeExe -PassThru -ArgumentList @(
    '--headless=new', '--disable-gpu', '--no-sandbox',
    '--disable-extensions', '--mute-audio',
    '--no-first-run',           # suppress sync / welcome dialogs
    '--disable-sync',
    '--disable-default-apps',
    '--no-default-browser-check',
    "--remote-debugging-port=$DebugPort",
    "--user-data-dir=$TempDir"
    # No URL here: we navigate via CDP to guarantee the right page loads
)

$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 500
    try { $null = Invoke-RestMethod "http://localhost:$DebugPort/json/version" -ErrorAction Stop; $ready = $true; break } catch {}
}
if (-not $ready) { Write-Host 'ERROR: Edge debug port not available.' -ForegroundColor Red; Stop-Everything; exit 1 }

Start-Sleep -Milliseconds 800

$targets    = Invoke-RestMethod "http://localhost:$DebugPort/json/list"
$pageTarget = $targets | Where-Object { $_.type -eq 'page' } | Select-Object -First 1
if (-not $pageTarget) {
    # No page target yet — create one
    $null = Invoke-RestMethod "http://localhost:$DebugPort/json/new" -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
    $targets    = Invoke-RestMethod "http://localhost:$DebugPort/json/list"
    $pageTarget = $targets | Where-Object { $_.type -eq 'page' } | Select-Object -First 1
}
if (-not $pageTarget) { Write-Host 'ERROR: No page target.' -ForegroundColor Red; Stop-Everything; exit 1 }

$script:ws = [System.Net.WebSockets.ClientWebSocket]::new()
$script:ws.ConnectAsync([Uri]$pageTarget.webSocketDebuggerUrl, [System.Threading.CancellationToken]::None).Wait()
$script:cdpId = 0

function Read-WSMessage {
    $ms  = [System.IO.MemoryStream]::new()
    $buf = [byte[]]::new(65536)
    do {
        $cts = [System.Threading.CancellationTokenSource]::new(15000)
        $rcv = $script:ws.ReceiveAsync([System.ArraySegment[byte]]::new($buf), $cts.Token).GetAwaiter().GetResult()
        if ($rcv.Count -gt 0) { $ms.Write($buf, 0, $rcv.Count) }
    } while (-not $rcv.EndOfMessage)
    return [System.Text.Encoding]::UTF8.GetString($ms.ToArray()) | ConvertFrom-Json
}

function Invoke-CDP([string]$Method, [hashtable]$Params = @{}) {
    $script:cdpId++
    $id  = $script:cdpId
    $pay = [System.Text.Encoding]::UTF8.GetBytes(
        (@{ id = $id; method = $Method; params = $Params } | ConvertTo-Json -Compress -Depth 10))
    $script:ws.SendAsync([System.ArraySegment[byte]]::new($pay),
        [System.Net.WebSockets.WebSocketMessageType]::Text, $true,
        [System.Threading.CancellationToken]::None).Wait()
    while ($true) {
        $j = Read-WSMessage
        if ($null -ne $j -and $null -ne $j.id -and $j.id -eq $id) { return $j }
    }
}

$null = Invoke-CDP 'Runtime.enable'
$null = Invoke-CDP 'Page.enable'

# Navigate to the test page and wait for it to fully load
Write-Host '  Loading test page...' -ForegroundColor DarkGray
$null = Invoke-CDP 'Page.navigate' @{ url = $FileUrl }

# Wait for Page.loadEventFired (more reliable than polling readyState)
$loaded = $false
$buf    = [byte[]]::new(65536)
$ms2    = [System.IO.MemoryStream]::new()
$deadline = [DateTime]::Now.AddSeconds(30)
while (-not $loaded -and [DateTime]::Now -lt $deadline) {
    $cts = [System.Threading.CancellationTokenSource]::new(5000)
    try {
        $rcv = $script:ws.ReceiveAsync([System.ArraySegment[byte]]::new($buf), $cts.Token).GetAwaiter().GetResult()
        if ($rcv.Count -gt 0) { $ms2.Write($buf, 0, $rcv.Count) }
        if ($rcv.EndOfMessage) {
            $msg = [System.Text.Encoding]::UTF8.GetString($ms2.ToArray()) | ConvertFrom-Json
            $ms2.SetLength(0)
            if ($msg.method -eq 'Page.loadEventFired') { $loaded = $true }
        }
    } catch { }
}

if (-not $loaded) { Write-Host '  Timed out waiting for page load.' -ForegroundColor Yellow }

# Brief pause for any post-load scripts to finish
Start-Sleep -Milliseconds 500

Write-Host '  Running tests...' -ForegroundColor DarkGray

$pollMax  = [Math]::Ceiling($TimeoutSeconds / 0.5)
$qunitRaw = $null
for ($p = 0; $p -lt $pollMax; $p++) {
    Start-Sleep -Milliseconds 500
    $resp = Invoke-CDP 'Runtime.evaluate' @{
        expression    = "window.qunitDone === true ? JSON.stringify({ results: window.qunitResults, details: window.qunitTestDetails }) : null"
        returnByValue = $true
    }
    $val = $resp.result.result.value
    if ($val -and $val -ne 'null') { $qunitRaw = $val | ConvertFrom-Json; break }
}

$script:ws.Dispose()
Stop-Everything

if (-not $qunitRaw) {
    Write-Host "  ERROR: Tests did not complete within $TimeoutSeconds seconds." -ForegroundColor Red
    exit 1
}

$r       = $qunitRaw.results
$details = $qunitRaw.details
$runtime = if ($r.runtime -gt 999) { "$([Math]::Round($r.runtime/1000,1))s" } else { "$($r.runtime)ms" }

Write-Host ''
Write-Host "  Passed : $($r.passed) / $($r.total)" -ForegroundColor $(if ($r.failed -eq 0) {'Green'} else {'Yellow'})
Write-Host "  Failed : $($r.failed)"                -ForegroundColor $(if ($r.failed -gt 0) {'Red'}   else {'DarkGray'})
Write-Host "  Time   : $runtime"

if ($r.failed -gt 0) {
    Write-Host ''
    Write-Host '  -- Failures -----------------------------------------' -ForegroundColor Red
    foreach ($test in $details) {
        if ($test.failed -gt 0) {
            Write-Host "  FAIL  [$($test.module)] $($test.name)" -ForegroundColor Red
            foreach ($a in $test.assertions) {
                if (-not $a.result) {
                    Write-Host "        $(if ($a.message) {$a.message} else {'Assertion failed'})" -ForegroundColor DarkRed
                    Write-Host "        Expected : $($a.expected)" -ForegroundColor DarkYellow
                    Write-Host "        Actual   : $($a.actual)"   -ForegroundColor DarkYellow
                }
            }
        }
    }
}

Write-Host ''
if ($r.failed -eq 0) { Write-Host '  ALL TESTS PASSED' -ForegroundColor Green; Write-Host ''; exit 0 }
else                  { Write-Host "  $($r.failed) TEST(S) FAILED" -ForegroundColor Red; Write-Host ''; exit 1 }