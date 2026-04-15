$out = "E:\zuri\scripts\debug3.log"
"start" | Out-File $out
& "E:\nodejs\node.exe" --version 2>&1 | Out-File -Append $out
"after node" | Out-File -Append $out
& "E:\nodejs\node.exe" -e "console.log('hello from node')" 2>&1 | Out-File -Append $out
"after inline" | Out-File -Append $out
