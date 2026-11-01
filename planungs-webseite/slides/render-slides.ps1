# Rendert die Slides eines oder mehrerer Posts als JPG (1080 x 1350) nach medien/post-folien/.
# Aufruf (aus beliebigem Ordner):
#   powershell -ExecutionPolicy Bypass -File planungs-webseite\slides\render-slides.ps1 26-08-platin-weissgold 26-08-goldfarben
# Ohne Argument werden alle *.html-Posts in diesem Ordner (außer index.html) gerendert.
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Posts)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$slidesDir = $PSScriptRoot
$outDir    = Join-Path (Split-Path $slidesDir -Parent) 'medien\post-folien'
$tmpDir    = Join-Path $env:TEMP 'herr-ringoo-slides'
New-Item -ItemType Directory -Force $tmpDir | Out-Null

$edge = @(
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { throw 'Weder Edge noch Chrome gefunden.' }

if (-not $Posts) {
  $Posts = Get-ChildItem $slidesDir -Filter *.html | Where-Object Name -ne 'index.html' | ForEach-Object BaseName
}

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
$encParams = New-Object System.Drawing.Imaging.EncoderParameters 1
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 92L

foreach ($post in $Posts) {
  $html = Join-Path $slidesDir "$post.html"
  if (-not (Test-Path $html)) { Write-Warning "Nicht gefunden: $html"; continue }
  $count = ([regex]::Matches((Get-Content $html -Raw -Encoding UTF8), 'class="frame"')).Count
  $url = 'file:///' + ($html -replace '\\', '/')

  for ($i = 1; $i -le $count; $i++) {
    $png = Join-Path $tmpDir "$post-$i.png"
    $jpg = Join-Path $outDir "$post-$i.jpg"
    if (Test-Path $png) { Remove-Item $png }
    # Edge schreibt harmlose Warnungen auf stderr -> über Start-Process isolieren
    $edgeArgs = @('--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
      '--virtual-time-budget=6000', '--window-size=1080,1350', "--screenshot=`"$png`"", "`"$url`?slide=$i`"")
    Start-Process -FilePath $edge -ArgumentList $edgeArgs -Wait -WindowStyle Hidden `
      -RedirectStandardError (Join-Path $tmpDir 'edge-stderr.txt') -RedirectStandardOutput (Join-Path $tmpDir 'edge-stdout.txt')
    $t = 0; while (-not (Test-Path $png) -and $t -lt 50) { Start-Sleep -Milliseconds 200; $t++ }
    if (-not (Test-Path $png)) { throw "Screenshot fehlgeschlagen: $post Folie $i" }

    $img = [System.Drawing.Image]::FromFile($png)
    try {
      if ($img.Width -ne 1080 -or $img.Height -ne 1350) { throw "Falsche Größe ($($img.Width)x$($img.Height)) bei $post Folie $i" }
      $img.Save($jpg, $jpegCodec, $encParams)
    } finally { $img.Dispose() }
    Write-Host "OK  $jpg"
  }
}
