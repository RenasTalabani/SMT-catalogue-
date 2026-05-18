# SMT Pro Catalog - Backend Startup Script
# Run this script to start MongoDB + Backend whenever you reboot your PC
# Right-click → "Run with PowerShell"

Write-Host "Starting SMT Pro Catalog Backend..." -ForegroundColor Cyan

# Start MongoDB on port 27018  (data stored permanently at C:\mongodb-data)
$mongoDataPath = "C:\mongodb-data"
New-Item -ItemType Directory -Force -Path $mongoDataPath | Out-Null
$mongod = "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe"
Start-Process -FilePath $mongod -ArgumentList "--dbpath `"$mongoDataPath`" --port 27018" -WindowStyle Minimized
Write-Host "MongoDB started on port 27018 (data: $mongoDataPath)" -ForegroundColor Green
Start-Sleep -Seconds 3

# Start Node.js backend
$env:NODE_ENV = 'development'
$env:PORT = '5000'
$env:MONGODB_URI = 'mongodb://127.0.0.1:27018/smt-catalog'
$env:CLIENT_URL = '*'
$env:LOG_LEVEL = 'info'
Start-Process -FilePath "C:\Program Files\nodejs\node.exe" `
    -ArgumentList "server.js" `
    -WorkingDirectory "C:\Users\Karwan Store\Documents\smt-pro-catalog\backend" `
    -WindowStyle Minimized
Write-Host "Backend started on port 5000" -ForegroundColor Green

Write-Host ""
Write-Host "All services running!" -ForegroundColor Cyan
Write-Host "Backend API: http://192.168.0.104:5000" -ForegroundColor Yellow
Write-Host "Press any key to close this window..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
