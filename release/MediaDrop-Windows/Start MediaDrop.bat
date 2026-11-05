@echo off
setlocal enabledelayedexpansion
title MediaDrop Launcher
cd /d "%~dp0"

echo ============================================================
echo                 MediaDrop Launcher
echo ============================================================
echo.

:: 1. Check Python installation
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python was not found on your system PATH.
    echo.
    echo MediaDrop requires Python 3.10 or higher.
    echo Please install Python from https://www.python.org/downloads/
    echo IMPORTANT: Make sure to check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)

:: 2. Check virtual environment
set "VENV_PYTHON="
if exist ".venv\Scripts\python.exe" (
    set "VENV_PYTHON=.venv\Scripts\python.exe"
) else if exist "backend\.venv\Scripts\python.exe" (
    set "VENV_PYTHON=backend\.venv\Scripts\python.exe"
) else (
    echo [INFO] First time setup detected. Initializing environment...
    call "Setup MediaDrop.bat"
    if exist ".venv\Scripts\python.exe" (
        set "VENV_PYTHON=.venv\Scripts\python.exe"
    ) else if exist "backend\.venv\Scripts\python.exe" (
        set "VENV_PYTHON=backend\.venv\Scripts\python.exe"
    ) else (
        echo [ERROR] Environment setup did not complete successfully.
        pause
        exit /b 1
    )
)

:: 3. Terminate any previous lingering instances on 8000 / 3000
"!VENV_PYTHON!" manage_servers.py stop >nul 2>&1

:: 4. Start Backend Server
echo [INFO] Starting MediaDrop Backend (FastAPI)...
start "MediaDrop-Backend" /min "!VENV_PYTHON!" backend_server.py

:: 5. Start Frontend Server
echo [INFO] Starting MediaDrop Frontend (Next.js Static SPA)...
start "MediaDrop-Frontend" /min "!VENV_PYTHON!" serve_frontend.py

:: 6. Wait for Backend Health Check
"!VENV_PYTHON!" manage_servers.py wait-health
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Backend did not respond within 25s, but servers are launched.
)

:: 7. Launch Browser
echo [INFO] Opening MediaDrop in your default browser...
start http://localhost:3000

echo.
echo ============================================================
echo              MediaDrop is Successfully Running!
echo ============================================================
echo.
echo   Application URL: http://localhost:3000
echo   API Docs:        http://127.0.0.1:8000/api/docs
echo   API Health:      http://127.0.0.1:8000/api/health
echo.
echo ------------------------------------------------------------
echo Keep this window open while using MediaDrop.
echo Press any key or close this window to STOP all services.
echo (You can also run "Stop MediaDrop.bat" at any time)
echo ------------------------------------------------------------
echo.
pause >nul

echo [INFO] Shutting down MediaDrop...
"!VENV_PYTHON!" manage_servers.py stop >nul 2>&1
echo [OK] All services stopped. Goodbye!
timeout /t 2 >nul
exit /b 0
