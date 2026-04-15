Set-Location E:\zuri
$env:DRY_RUN = "true"
doppler run --project vschool-crm --config dev -- node scripts/migrate-zuri-to-co.js *>&1 | Tee-Object -FilePath "E:\zuri\scripts\migrate-dry.log"
