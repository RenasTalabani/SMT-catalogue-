$ErrorActionPreference = 'Stop'

$env:FLUTTER_ROOT = 'C:\Users\KARWAN~1\flutter'
$env:PATH = "$env:FLUTTER_ROOT\bin;$env:PATH"

Set-Location 'C:\Users\Karwan Store\Documents\smt-pro-catalog\flutter_app'
Write-Host "Using FLUTTER_ROOT: $env:FLUTTER_ROOT"
Write-Host "Building from: $(Get-Location)"

flutter build apk --release
