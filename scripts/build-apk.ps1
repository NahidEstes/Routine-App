param(
  [string]$JavaHome = $env:JAVA_HOME,
  [string]$AndroidSdk = $env:ANDROID_HOME
)
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if (-not $JavaHome) {
  $bundledJdk = Get-ChildItem -LiteralPath (Join-Path $projectRoot 'artifacts\toolchain\jdk17') -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($bundledJdk) { $JavaHome = $bundledJdk.FullName }
}
if (-not $AndroidSdk) { $AndroidSdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
if (-not $JavaHome -or -not (Test-Path -LiteralPath (Join-Path $JavaHome 'bin\java.exe'))) { throw 'Set JAVA_HOME to a JDK 17 installation or pass -JavaHome.' }
if (-not (Test-Path -LiteralPath $AndroidSdk)) { throw 'Set ANDROID_HOME to an Android SDK installation or pass -AndroidSdk.' }
$javaVersion = (& (Join-Path $JavaHome 'bin\java.exe') --version) -join ' '
if ($javaVersion -notmatch '(openjdk|java) 17\.') { throw 'Use JDK 17 for this validated Android build; newer JDKs can fail native CMake tasks.' }
$env:JAVA_HOME = $JavaHome
$env:ANDROID_HOME = $AndroidSdk
$env:NODE_ENV = 'production'
$env:EXPO_NO_TELEMETRY = '1'
$env:ROUTINE_OFFLINE_BUILD = '1'
$env:CMAKE_BUILD_PARALLEL_LEVEL = '2'
Remove-Item Env:EXPO_PUBLIC_STORAGE_CHECK -ErrorAction SilentlyContinue
Push-Location $projectRoot
try {
  & npx expo prebuild --platform android --no-install
  if ($LASTEXITCODE -ne 0) { throw 'Expo prebuild failed.' }
  Push-Location (Join-Path $projectRoot 'android')
  try {
    $aapt2Path = Join-Path $AndroidSdk 'build-tools\36.0.0\aapt2.exe'
    if (-not (Test-Path -LiteralPath $aapt2Path)) { throw 'Install Android SDK Build-Tools 36.0.0 first.' }
    & .\gradlew.bat :app:assembleRelease '-PreactNativeArchitectures=arm64-v8a,x86_64' "-Pandroid.aapt2FromMavenOverride=$aapt2Path" --max-workers 2 --console plain
    if ($LASTEXITCODE -ne 0) { throw 'Android APK build failed.' }
  } finally { Pop-Location }
  $output = Join-Path $projectRoot 'artifacts\android'
  New-Item -ItemType Directory -Path $output -Force | Out-Null
  $appVersion = (Get-Content -LiteralPath (Join-Path $projectRoot 'app.json') -Raw | ConvertFrom-Json).expo.version
  $apk = Join-Path $output "routine-app-$appVersion-preview.apk"
  Copy-Item -LiteralPath (Join-Path $projectRoot 'android\app\build\outputs\apk\release\app-release.apk') -Destination $apk -Force
  Get-FileHash -LiteralPath $apk -Algorithm SHA256
  Write-Output "Installable preview APK: $apk"
  Write-Output 'Personal testing build: release variant signed with the Expo template debug certificate. Not a store release.'
} finally { Pop-Location }
