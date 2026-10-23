# Waits for build_dataset_v3.py to finish, re-runs it once to fill any failed rows,
# then compares v2 vs v3 and trains + installs v3 (v2 stays active in the app).
# Usage (from the repo root):  powershell -ExecutionPolicy Bypass -File ai-module\v3\run_after_build.ps1
$ErrorActionPreference = 'Continue'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location $root
$log = 'ai-module\v3\pipeline_log.txt'
"[$(Get-Date)] waiting for the dataset build to finish..." | Out-File $log -Encoding utf8

while (Get-CimInstance Win32_Process -Filter "Name like 'python%'" | Where-Object { $_.CommandLine -match 'build_dataset_v3' }) {
    Start-Sleep -Seconds 60
}

"[$(Get-Date)] build finished; second pass for any failed rows" | Out-File $log -Append -Encoding utf8
py -3.11 -W ignore ai-module\v3\build_dataset_v3.py 2>&1 | Out-File $log -Append -Encoding utf8

"[$(Get-Date)] comparing v2 and v3" | Out-File $log -Append -Encoding utf8
Push-Location ai-module\v3
py -3.11 -W ignore evaluate_v2_vs_v3.py 2>&1 | Out-File "..\..\$log" -Append -Encoding utf8
"[$(Get-Date)] training and installing v3" | Out-File "..\..\$log" -Append -Encoding utf8
py -3.11 -W ignore train_xgboost_v3.py 2>&1 | Out-File "..\..\$log" -Append -Encoding utf8
Pop-Location
"[$(Get-Date)] ALL DONE - see ai-module\v3\REPORT.md; restart the backend to load v3" | Out-File $log -Append -Encoding utf8
