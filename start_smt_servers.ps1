$pm2 = "$env:APPDATA\npm\pm2.cmd"
Start-Sleep -Seconds 10
& $pm2 resurrect
