Set-Location E:\zuri
$stdout = "E:\zuri\scripts\npm-stdout.log"
$stderr = "E:\zuri\scripts\npm-stderr.log"

# Find npm
$npmPath = Get-Command npm -ErrorAction SilentlyContinue
if ($npmPath) {
  "Found npm at: $($npmPath.Source)" | Out-File "E:\zuri\scripts\npm-find.log" -Encoding UTF8
} else {
  "npm not found in PATH" | Out-File "E:\zuri\scripts\npm-find.log" -Encoding UTF8
}

# Try node npm directly
$npmScriptPath = "E:\nodejs\node_modules\npm\bin\npm-cli.js"
if (Test-Path $npmScriptPath) {
  "npm-cli.js found" | Out-File -Append "E:\zuri\scripts\npm-find.log" -Encoding UTF8
  Start-Process -FilePath "E:\nodejs\node.exe" `
    -ArgumentList "$npmScriptPath install pg --save-dev" `
    -RedirectStandardOutput $stdout `
    -RedirectStandardError  $stderr `
    -Wait -NoNewWindow -WorkingDirectory "E:\zuri"
} else {
  "npm-cli.js not found at $npmScriptPath" | Out-File -Append "E:\zuri\scripts\npm-find.log" -Encoding UTF8
  # Try npm.cmd
  Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c npm install pg --save-dev" `
    -RedirectStandardOutput $stdout `
    -RedirectStandardError  $stderr `
    -Wait -NoNewWindow -WorkingDirectory "E:\zuri"
}
"DONE" | Out-File -Append "E:\zuri\scripts\npm-find.log" -Encoding UTF8
