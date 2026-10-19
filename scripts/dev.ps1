<#
Start and stop the whole local stack on Windows: infrastructure (Postgres, Redis, MinIO,
Mailpit), the API and the web app. Works in Windows PowerShell 5.1 and PowerShell 7.

  scripts\dev.cmd start [-DockerApi | -LocalApi]   start everything (default: local API if JDK 25+, else Docker)
  scripts\dev.cmd stop [-KeepInfra] [-Force]       stop everything (-Force also frees ports 8080/4200)
  scripts\dev.cmd restart                          stop, then start
  scripts\dev.cmd status                           what is running
  scripts\dev.cmd logs [api|web]                   follow a log (default: api)

Logs and process ids live in .dev\ (git-ignored). Docker volumes are kept: data survives a stop.
#>
param(
  [Parameter(Position = 0)][ValidateSet('start', 'stop', 'restart', 'status', 'logs', 'help')]
  [string]$Command = 'help',
  [Parameter(Position = 1)][string]$Target = 'api',
  [switch]$DockerApi,
  [switch]$LocalApi,
  [switch]$KeepInfra,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$State = Join-Path $Root '.dev'
$ComposeFile = Join-Path $Root 'docker-compose.dev.yml'
$ApiPort = if ($env:SERVER_PORT) { [int]$env:SERVER_PORT } else { 8080 }
$WebPort = 4200
$ApiUrl = "http://localhost:$ApiPort/api/actuator/health"
$WebUrl = "http://localhost:$WebPort"

New-Item -ItemType Directory -Force -Path $State | Out-Null

function Info($Text) { Write-Host "> $Text" -ForegroundColor Cyan }
function Ok($Text) { Write-Host "OK $Text" -ForegroundColor Green }
function Warn($Text) { Write-Host "! $Text" -ForegroundColor Yellow }
function Fail($Text) { Write-Host "X $Text" -ForegroundColor Red; exit 1 }

# Runs docker compose through cmd so its progress lines (on stderr) print as plain text instead of
# PowerShell errors; returns only the exit code.
function Compose {
  $line = "docker compose -f `"$ComposeFile`" $($args -join ' ') 2>&1"
  & cmd.exe /d /c $line | Out-Host
  return $LASTEXITCODE
}

function Test-Tool($Name) { return [bool](Get-Command $Name -ErrorAction SilentlyContinue) }

function Test-Docker {
  if (-not (Test-Tool 'docker')) { return $false }
  $previous = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  & docker info *> $null
  $up = ($LASTEXITCODE -eq 0)
  $ErrorActionPreference = $previous
  return $up
}

function Get-JavaMajor {
  if (-not (Test-Tool 'java')) { return 0 }
  $previous = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $line = (& java -version 2>&1 | Select-Object -First 1 | Out-String)
  $ErrorActionPreference = $previous
  if ($line -match '"(\d+)(\.(\d+))?') {
    if ($Matches[1] -eq '1') { return [int]$Matches[3] } else { return [int]$Matches[1] }
  }
  return 0
}

function Test-Port($Port) {
  return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

# Any HTTP answer counts (a 401 still means the server is up).
function Test-Http($Url) {
  try {
    Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3 | Out-Null
    return $true
  }
  catch [System.Net.WebException] {
    return [bool]$_.Exception.Response
  }
  catch {
    return [bool]($_.Exception.PSObject.Properties['Response'] -and $_.Exception.Response)
  }
}

function Get-SavedProcess($Name) {
  $file = Join-Path $State "$Name.pid"
  if (-not (Test-Path $file)) { return $null }
  $id = [int](Get-Content $file -Raw)
  return Get-Process -Id $id -ErrorAction SilentlyContinue
}

function Wait-For($Name, $Url, $Seconds, $ProcessName) {
  Info "Waiting for $Name ($Url)..."
  $deadline = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-Http $Url) { Ok "$Name is up"; return }
    if ($ProcessName -and -not (Get-SavedProcess $ProcessName)) {
      Fail "$Name stopped while starting, see $State\$ProcessName.log"
    }
    Start-Sleep -Seconds 3
  }
  Warn "$Name did not answer within $Seconds s, see the log: scripts\dev.cmd logs"
}

# Detached and hidden; the whole tree (cmd > mvnw/npm > java/node) is ended by Stop-Tree.
function Start-Detached($Name, $Directory, $CommandLine) {
  $log = Join-Path $State "$Name.log"
  $process = Start-Process -FilePath 'cmd.exe' `
    -ArgumentList '/d', '/c', "$CommandLine > `"$log`" 2>&1" `
    -WorkingDirectory $Directory -WindowStyle Hidden -PassThru
  Set-Content -Path (Join-Path $State "$Name.pid") -Value $process.Id
}

function Stop-Tree($Name) {
  $file = Join-Path $State "$Name.pid"
  $process = Get-SavedProcess $Name
  if ($process) {
    Info "Stopping $Name (pid $($process.Id))..."
    & taskkill.exe /PID $process.Id /T /F *> $null
    Ok "$Name stopped"
  }
  if (Test-Path $file) { Remove-Item $file -Force }
}

function Clear-Port($Port) {
  $owners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($id in $owners) {
    if ($id -gt 4) {
      Warn "Killing what still listens on port $Port (pid $id)"
      & taskkill.exe /PID $id /T /F *> $null
    }
  }
}

function Start-Stack {
  if ($DockerApi -and $LocalApi) { Fail 'Choose -DockerApi or -LocalApi, not both.' }
  if (-not (Test-Tool 'docker')) { Fail 'docker is required (Docker Desktop).' }
  if (-not (Test-Tool 'npm')) { Fail 'npm is required (Node 24).' }
  if (-not (Test-Docker)) { Fail 'Docker is not running: start Docker Desktop first.' }

  $envFile = Join-Path $Root '.env'
  $example = Join-Path $Root '.env.example'
  if (-not (Test-Path $envFile) -and (Test-Path $example)) {
    Copy-Item $example $envFile
    Info 'Created .env from .env.example'
  }

  $javaMajor = Get-JavaMajor
  $mode = if ($DockerApi) { 'docker' } elseif ($LocalApi) { 'local' } elseif ($javaMajor -ge 25) { 'local' } else { 'docker' }
  if ($mode -eq 'local' -and $javaMajor -lt 25) { Fail "-LocalApi needs JDK 25+ (found $javaMajor). Use -DockerApi." }

  Info 'Starting infrastructure (Postgres, Redis, MinIO, Mailpit)...'
  if ((Compose up -d --wait database redis minio smtp) -ne 0) { Fail 'The containers did not start.' }

  if ($mode -eq 'docker') {
    Info 'Building and starting the API container (first build takes a few minutes)...'
    if ((Compose --profile app up -d --build api) -ne 0) { Fail 'The API container did not start.' }
    Set-Content -Path (Join-Path $State 'api.mode') -Value 'docker'
    Wait-For 'API' $ApiUrl 300 $null
  }
  else {
    Compose --profile app stop api *> $null | Out-Null
    if (Get-SavedProcess 'api') {
      Ok 'API already running'
    }
    else {
      if (Test-Port $ApiPort) { Fail "Port $ApiPort is already used. Run: scripts\dev.cmd stop -Force" }
      Info 'Starting the API with Maven (log: .dev\api.log)...'
      Start-Detached 'api' (Join-Path $Root 'backend') 'mvnw.cmd -q spring-boot:run'
      Set-Content -Path (Join-Path $State 'api.mode') -Value 'local'
      Wait-For 'API' $ApiUrl 300 'api'
    }
  }

  if (Get-SavedProcess 'web') {
    Ok 'Web app already running'
  }
  else {
    if (Test-Port $WebPort) { Fail "Port $WebPort is already used. Run: scripts\dev.cmd stop -Force" }
    $frontend = Join-Path $Root 'frontend'
    if (-not (Test-Path (Join-Path $frontend 'node_modules'))) {
      Info 'Installing frontend dependencies...'
      Push-Location $frontend
      try { & npm install; if ($LASTEXITCODE -ne 0) { Fail 'npm install failed.' } } finally { Pop-Location }
    }
    Info 'Starting the web app (log: .dev\web.log)...'
    Start-Detached 'web' $frontend 'npm start'
    Wait-For 'Web app' $WebUrl 180 'web'
  }

  Write-Host ''
  Ok 'AutoCare is running'
  Write-Host "  Web       $WebUrl"
  Write-Host "  API       http://localhost:$ApiPort/api   (Swagger: /api/docs)"
  Write-Host '  Mailpit   http://localhost:8025'
  Write-Host '  MinIO     http://localhost:9001'
  Write-Host '  Stop with scripts\dev.cmd stop'
}

function Stop-Stack {
  Stop-Tree 'web'
  Stop-Tree 'api'
  if ($Force) {
    Clear-Port $WebPort
    Clear-Port $ApiPort
  }
  $modeFile = Join-Path $State 'api.mode'
  if (Test-Path $modeFile) { Remove-Item $modeFile -Force }
  if (Test-Docker) {
    if ($KeepInfra) {
      Compose --profile app stop api *> $null | Out-Null
      Ok 'API container stopped, infrastructure kept'
    }
    else {
      Info 'Stopping the containers (data volumes are kept)...'
      Compose --profile app down | Out-Null
      Ok 'Containers stopped'
    }
  }
  else {
    Warn 'Docker is not running: containers left as they are'
  }
}

function Show-Status {
  foreach ($name in 'api', 'web') {
    $process = Get-SavedProcess $name
    if ($process) { Ok "$name process running (pid $($process.Id))" }
  }
  if (Test-Http $ApiUrl) { Ok "API answers on :$ApiPort" } else { Warn "API not answering on :$ApiPort" }
  if (Test-Http $WebUrl) { Ok "Web app answers on :$WebPort" } else { Warn "Web app not answering on :$WebPort" }
  if (Test-Docker) { Compose --profile app ps | Out-Null } else { Warn 'Docker is not running' }
}

function Show-Logs {
  switch ($Target) {
    'api' {
      $modeFile = Join-Path $State 'api.mode'
      if ((Test-Path $modeFile) -and ((Get-Content $modeFile -Raw).Trim() -eq 'docker')) {
        Compose --profile app logs -f api | Out-Null
      }
      else {
        Get-Content (Join-Path $State 'api.log') -Tail 200 -Wait
      }
    }
    'web' { Get-Content (Join-Path $State 'web.log') -Tail 200 -Wait }
    default { Fail 'logs takes api or web' }
  }
}

switch ($Command) {
  'start' { Start-Stack }
  'stop' { Stop-Stack }
  'restart' { Stop-Stack; Start-Stack }
  'status' { Show-Status }
  'logs' { Show-Logs }
  default { Get-Content $PSCommandPath -TotalCount 12 | Select-Object -Skip 1 | ForEach-Object { Write-Host $_ } }
}
