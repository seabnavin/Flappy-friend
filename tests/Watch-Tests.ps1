<#
.SYNOPSIS
  Watches game.js and the tests/ folder, re-running the test suite on every save.

.DESCRIPTION
  Runs the tests immediately on startup, then re-runs them automatically
  whenever game.js or any file inside tests/ changes.
  Press Ctrl+C to stop.
#>

$ErrorActionPreference = 'SilentlyContinue'

$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
$RunnerScript = Join-Path $ScriptDir 'Run-Tests.ps1'

function Run-Suite {
    Write-Host ''
    Write-Host "  [$(Get-Date -Format 'HH:mm:ss')]  Running tests..." -ForegroundColor DarkCyan
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $RunnerScript
}

# ── Initial run ────────────────────────────────────────────────────────────────
Run-Suite

# ── File system watcher ────────────────────────────────────────────────────────
Write-Host '  Watching for changes (Ctrl+C to stop)...' -ForegroundColor DarkGray
Write-Host ''

$watcher                     = [System.IO.FileSystemWatcher]::new($ProjectDir)
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true
$watcher.NotifyFilter        = [System.IO.NotifyFilters]::LastWrite

# Debounce: ignore events fired within 800 ms of each other
$script:lastRun = [DateTime]::MinValue

$handler = {
    $path = $Event.SourceEventArgs.FullPath

    # Only care about .js and .html files; ignore node_modules / temp folders
    if ($path -notmatch '\.(js|html)$')   { return }
    if ($path -match 'node_modules|~|\.tmp') { return }

    $now = [DateTime]::Now
    if (($now - $script:lastRun).TotalMilliseconds -lt 800) { return }
    $script:lastRun = $now

    $rel = $path.Substring($ProjectDir.Length).TrimStart('\')
    Write-Host "  Changed: $rel" -ForegroundColor Yellow
    Run-Suite
}

$changedSub = Register-ObjectEvent $watcher Changed -Action $handler
$createdSub = Register-ObjectEvent $watcher Created -Action $handler

try {
    while ($true) { Start-Sleep -Seconds 1 }
} finally {
    Unregister-Event -SubscriptionId $changedSub.Id -ErrorAction SilentlyContinue
    Unregister-Event -SubscriptionId $createdSub.Id -ErrorAction SilentlyContinue
    $watcher.Dispose()
}
