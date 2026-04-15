Set-Location E:\zuri
$out = "E:\zuri\scripts\debug2.log"

"=== node ===" | Out-File $out
& node --version 2>&1 | Out-File -Append $out

"=== doppler ===" | Out-File -Append $out
& doppler --version 2>&1 | Out-File -Append $out

"=== SOURCE_DATABASE_URL ===" | Out-File -Append $out
& doppler run --project vschool-crm --config dev -- node -e "console.log('SOURCE_DB:', process.env.SOURCE_DATABASE_URL ? 'SET' : 'NOT SET'); console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');" 2>&1 | Out-File -Append $out

"DONE" | Out-File -Append $out
