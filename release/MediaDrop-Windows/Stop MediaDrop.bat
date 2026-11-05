@echo off
setlocal
title Stop MediaDrop
cd /d "%~dp0"

echo ============================================================
echo                  Stopping MediaDrop
echo ============================================================
echo.

if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" manage_servers.py stop
) else if exist "backend\.venv\Scripts\python.exe" (
    "backend\.venv\Scripts\python.exe" manage_servers.py stop
) else (
    python manage_servers.py stop 2>nul || (
        for %%P in (8000 3000) do (
            for /f "tokens=5" %%A in ('netstat -aon ^| findstr /r /c:":%%P "') do (
                if "%%A" NEQ "0" taskkill /F /PID %%A >nul 2>&1
            )
        )
    )
)

echo.
echo [OK] All MediaDrop server processes have been stopped.
echo.
timeout /t 2 >nul
