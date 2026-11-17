param([int]$Port = 3000)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCommand) { $nodeExecutable = $nodeCommand.Source }
else { $nodeExecutable = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
if (-not (Test-Path -LiteralPath $nodeExecutable)) { throw 'Install Node.js 22 or newer, then run this script again.' }
$env:PATH = (Split-Path -Parent $nodeExecutable) + ';' + $env:PATH
$nextCli = Join-Path $PSScriptRoot 'node_modules\next\dist\bin\next'
if (-not (Test-Path -LiteralPath $nextCli)) { throw 'Install project dependencies with pnpm install first.' }
Write-Host "Pinflix will be available at http://localhost:$Port"
& $nodeExecutable $nextCli dev --hostname 127.0.0.1 --port $Port
