# Copies apiDocCursor static files into shopify-theme/assets/flits-api-docs/
# Run from project root:  .\scripts\prepare-shopify-assets.ps1

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$dest = Join-Path $root "shopify-theme\assets\flits-api-docs"

if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }

Copy-Item (Join-Path $root "css") (Join-Path $dest "css") -Recurse -Force
Copy-Item (Join-Path $root "js") (Join-Path $dest "js") -Recurse -Force

New-Item -ItemType Directory -Path (Join-Path $dest "data") -Force | Out-Null
Copy-Item (Join-Path $root "data\Flits App.postman_collection.json") `
  (Join-Path $dest "data\flits-app.postman_collection.json") -Force

Write-Host "Shopify assets ready at:"
Write-Host "  $dest"
