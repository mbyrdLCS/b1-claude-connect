# Connect B1 (ChurchApps) to the Claude desktop app on Windows.
# Usage (PowerShell):  powershell -ExecutionPolicy Bypass -File .\install-windows.ps1
# Needs Node.js (https://nodejs.org) for the small "mcp-remote" bridge the Claude app uses.
$ErrorActionPreference = "Stop"
$B1Url  = "https://api.churchapps.org/mcp"
$Config = Join-Path $env:APPDATA "Claude\claude_desktop_config.json"

# 1. Find npx
$npx = (Get-Command npx.cmd -ErrorAction SilentlyContinue).Source
if (-not $npx) { Write-Host "Node.js is required. Install the LTS version from https://nodejs.org, then run this again."; exit 1 }

# 2. Ask for the key (hidden)
Write-Host "Create an API key in B1Admin (logged in as yourself), then paste it here."
$secure = Read-Host "B1 API key" -AsSecureString
$key = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)).Trim()
if (-not $key) { Write-Host "No key entered."; exit 1 }

# 3. Check the key and show which church it belongs to
try {
  $resp = Invoke-RestMethod -Uri "https://api.churchapps.org/membership/churches" -Headers @{ Authorization = "Bearer $key"; Accept = "application/json" }
} catch { Write-Host "That key didn't work with B1. Check it and try again."; exit 1 }
$c = @($resp) | ForEach-Object { if ($_.church) { $_.church } else { $_ } } | Where-Object { $_.name } | Select-Object -First 1
if (-not $c) { Write-Host "That key didn't work with B1. Check it and try again."; exit 1 }
$ok = Read-Host "This key belongs to: $($c.name), $($c.city) $($c.state). Connect it to Claude? [y/N]"
if ($ok -notmatch '^[Yy]') { Write-Host "Cancelled."; exit 0 }

# 4. Add B1 to the Claude app settings (keeps everything else; makes a backup)
New-Item -ItemType Directory -Force -Path (Split-Path $Config) | Out-Null
if (Test-Path $Config) {
  Copy-Item $Config "$Config.bak-$(Get-Date -Format yyyyMMddHHmmss)"
  $d = Get-Content $Config -Raw | ConvertFrom-Json
} else { $d = [pscustomobject]@{} }
if (-not $d.PSObject.Properties["mcpServers"]) { $d | Add-Member -NotePropertyName mcpServers -NotePropertyValue ([pscustomobject]@{}) }
$entry = [pscustomobject]@{
  command = $npx
  args    = @("-y", "mcp-remote", $B1Url, "--header", 'Authorization:${B1_AUTH}')
  env     = [pscustomobject]@{ B1_AUTH = "Bearer $key" }
}
$d.mcpServers | Add-Member -NotePropertyName b1 -NotePropertyValue $entry -Force
$d | ConvertTo-Json -Depth 20 | Set-Content -Path $Config -Encoding UTF8
Remove-Variable key

Write-Host "Done. Quit the Claude app completely (system tray > Quit) and open it again; B1 will show up in its connectors."
