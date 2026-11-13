# Waits for build_dataset_v3.py to finish, re-runs it once to fill any failed rows,
# then compares v2 vs v3, tunes v3 and trains + installs it (cut-offs are picked inside the training step).
# Stops at the FIRST failing step and says so - it never prints "ALL DONE" after a crash.
# Usage (from the repo root):  powershell -ExecutionPolicy Bypass -File ai-module\v3\run_after_build.ps1
$ErrorActionPreference = 'Continue'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location $root
$log = Join-Path $root 'ai-module\v3\pipeline_log.txt'
"[$(Get-Date)] waiting for the dataset build to finish..." | Out-File $log -Encoding utf8

while (Get-CimInstance Win32_Process -Filter "Name like 'python%'" | Where-Object { $_.CommandLine -match 'build_dataset_v3' }) {
    Start-Sleep -Seconds 60
}

# Runs one Python step; on failure writes FAILED to the log and stops the whole pipeline with that exit code.
# $LASTEXITCODE is the number a program returns when it ends: 0 = success, anything else = it failed.
function Step($title, $script) {
    "[$(Get-Date)] $title" | Out-File $log -Append -Encoding utf8
    py -3.11 -W ignore $script 2>&1 | Out-File $log -Append -Encoding utf8
    if ($LASTEXITCODE -ne 0) {
        "[$(Get-Date)] FAILED: $title (exit code $LASTEXITCODE) - pipeline stopped, see the error above" |
            Out-File $log -Append -Encoding utf8
        Write-Host "FAILED: $title - see $log"
        exit $LASTEXITCODE
    }
}

$env:PYTHONIOENCODING = 'utf-8'   # emoji in print() crashed every step on the Windows console code page
Step 'build finished; second pass for any failed rows' 'ai-module\v3\build_dataset_v3.py'
Push-Location ai-module\v3
Step 'comparing v2 and v3' 'evaluate_v2_vs_v3.py'
Step 'tuning v3 settings (nested spatial CV)' 'tune_v3.py'
Step 'training and installing v3 (+ picking cut-offs)' 'train_xgboost_v3.py'
Pop-Location
"[$(Get-Date)] ALL DONE - see ai-module\v3\REPORT.md; restart the backend to load v3" | Out-File $log -Append -Encoding utf8
