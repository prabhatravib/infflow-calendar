@echo off
setlocal EnableExtensions

chcp 65001 >nul

set "SCRIPT_DIR=%~dp0"
set "FORCE_INSTALL=0"

if /I "%~1"=="--help" goto :help
if /I "%~1"=="--install" set "FORCE_INSTALL=1"
if /I "%~1"=="--fresh" set "FORCE_INSTALL=1"

set "CI=1"
set "NPM_CONFIG_AUDIT=false"
set "NPM_CONFIG_FUND=false"
set "NPM_CONFIG_PROGRESS=false"
set "BROWSERSLIST_IGNORE_OLD_DATA=1"

echo [deploy] Starting Infflow Calendar deployment...

pushd "%SCRIPT_DIR%" >nul
if errorlevel 1 (
    echo [deploy] Error: Failed to navigate to repository root.
    exit /b 1
)

pushd "calendar-worker\web" >nul
if errorlevel 1 (
    echo [deploy] Error: Failed to navigate to calendar-worker\web.
    popd
    exit /b 1
)

if not exist "node_modules" (
    echo [deploy] Web dependencies not found. Installing...
    call :install_deps
    if errorlevel 1 goto :frontend_error
) else (
    if "%FORCE_INSTALL%"=="1" (
        echo [deploy] Refreshing web dependencies...
        call :install_deps
        if errorlevel 1 goto :frontend_error
    ) else (
        echo [deploy] Reusing existing web dependencies. Use --install for a fresh install.
    )
)

echo [deploy] Building web app...
call npm run build:prod
if errorlevel 1 (
    echo [deploy] Error: Web build failed.
    goto :frontend_error
)

if not exist "dist\index.html" (
    echo [deploy] Error: Build output missing at calendar-worker\web\dist.
    goto :frontend_error
)

popd

pushd "calendar-worker" >nul
if errorlevel 1 (
    echo [deploy] Error: Failed to navigate to calendar-worker.
    popd
    exit /b 1
)

if "%FORCE_INSTALL%"=="1" (
    echo [deploy] Refreshing Worker dependencies...
    call :install_deps
    if errorlevel 1 goto :worker_error
) else (
    call npm ls --depth=0 >nul 2>&1
    if errorlevel 1 (
        echo [deploy] Worker dependencies missing or out of date. Installing...
        call :install_deps
        if errorlevel 1 goto :worker_error
    ) else (
        echo [deploy] Reusing existing Worker dependencies. Use --install for a fresh install.
    )
)

echo [deploy] Deploying to Cloudflare Workers...
where wrangler >nul 2>&1
if not errorlevel 1 (
    call wrangler deploy --config wrangler.jsonc
) else (
    call npx wrangler deploy --config wrangler.jsonc
)
if errorlevel 1 (
    echo [deploy] Error: Deployment failed.
    goto :worker_error
)

echo [deploy] Deployment completed on %date% %time%
popd
popd

call :play_success_sound
exit /b 0

:install_deps
if exist "package-lock.json" (
    call npm ci --no-audit --no-fund
) else (
    call npm install --no-audit --no-fund
)
exit /b %errorlevel%

:frontend_error
popd
popd
exit /b 1

:worker_error
popd
popd
exit /b 1

:play_success_sound
powershell -NoProfile -Command "try { [console]::beep(880,180); Start-Sleep -Milliseconds 80; [console]::beep(1175,260) } catch { try { [System.Media.SystemSounds]::Asterisk.Play() } catch {} }" >nul 2>&1
exit /b 0

:help
echo Usage: deploy.bat [--install^|--fresh]
echo.
echo   Default    Reuse valid dependencies, build calendar-worker\web and deploy the Worker.
echo   --install  Run fresh web and Worker dependency installs before deployment.
echo   --fresh    Alias for --install.
exit /b 0
