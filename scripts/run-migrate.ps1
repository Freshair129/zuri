# Migration runner — uses Start-Process to capture output on Windows
# Usage:
#   .\run-migrate.ps1          # real run
#   .\run-migrate.ps1 -DryRun  # dry run (no DB writes)

param([switch]$DryRun)

Set-Location E:\zuri

$stdout = "E:\zuri\scripts\migrate-stdout.log"
$stderr = "E:\zuri\scripts\migrate-stderr.log"

if ($DryRun) { $env:DRY_RUN = "true" } else { Remove-Item Env:\DRY_RUN -ErrorAction SilentlyContinue }

Write-Host "Starting migration... (DRY_RUN=$DryRun)"
Write-Host "Logs: $stdout"

$proc = Start-Process -FilePath "doppler" `
  -ArgumentList "run --project vschool-crm --config dev -- E:\nodejs\node.exe scripts/migrate-zuri-to-co.js" `
  -RedirectStandardOutput $stdout `
  -RedirectStandardError  $stderr `
  -Wait -NoNewWindow -WorkingDirectory "E:\zuri" -PassThru

Write-Host ""
Write-Host "=== STDOUT ===" 
if (Test-Path $stdout) { Get-Content $stdout }

$errText = if (Test-Path $stderr) { (Get-Content $stderr -Raw).Trim() } else { "" }
if ($errText) {
  Write-Host "=== STDERR ==="
  Write-Host $errText
}

Write-Host ""
Write-Host "Exit code: $($proc.ExitCode)"
