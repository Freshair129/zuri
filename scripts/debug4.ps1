$out = "E:\zuri\scripts\debug4.log"
"start" | Out-File $out -Encoding UTF8

# Try Start-Process with redirect
Start-Process -FilePath "E:\nodejs\node.exe" `
  -ArgumentList "--version" `
  -RedirectStandardOutput "E:\zuri\scripts\node_ver.txt" `
  -RedirectStandardError "E:\zuri\scripts\node_err.txt" `
  -Wait -NoNewWindow

"after node" | Out-File -Append $out -Encoding UTF8
if (Test-Path "E:\zuri\scripts\node_ver.txt") {
  Get-Content "E:\zuri\scripts\node_ver.txt" | Out-File -Append $out -Encoding UTF8
} else {
  "node_ver.txt not created" | Out-File -Append $out -Encoding UTF8
}

"done" | Out-File -Append $out -Encoding UTF8
