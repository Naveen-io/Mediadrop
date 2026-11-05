@echo off
setlocal enabledelayedexpansion
title MediaDrop Setup

echo ============================================================
echo               MediaDrop Environment Setup
echo ============================================================
echo.

:: 1. Detect Python
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

for /f "tokens=*" %%v in ('python --version 2^>^&1') do set PYTHON_VERSION=%%v
echo [OK] Found %PYTHON_VERSION%

:: 2. Check for FFmpeg
where ffmpeg >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Found FFmpeg on system PATH.
) else (
    if exist "bin\ffmpeg.exe" (
        echo [OK] Found local FFmpeg in bin\ folder.
    ) else (
        echo [NOTICE] FFmpeg was not detected on system PATH.
        echo MediaDrop can still download basic public media, but FFmpeg is
        echo required for audio format extraction (MP3/WAV) and video trimming.
        echo.
        echo To install FFmpeg automatically, open PowerShell and run:
        echo    winget install Gyan.FFmpeg.Essentials
        echo.
        echo Or extract ffmpeg.exe and ffprobe.exe into the "bin" folder.
        echo.
    )
)

:: 3. Setup Virtual Environment
set "TARGET_VENV=.venv"
if exist "backend\.venv\Scripts\python.exe" (
    set "TARGET_VENV=backend\.venv"
) else if not exist ".venv\Scripts\python.exe" (
    echo [INFO] Creating Python virtual environment in .venv ...
    python -m venv .venv
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
)

:: 4. Install Dependencies
echo [INFO] Installing required Python dependencies...
"%TARGET_VENV%\Scripts\python.exe" -m pip install --upgrade pip --quiet
"%TARGET_VENV%\Scripts\python.exe" -m pip install -r backend\requirements.txt --quiet
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install Python dependencies.
    pause
    exit /b 1
)
echo [OK] Dependencies installed successfully.

echo.
echo ============================================================
echo               MediaDrop Setup Complete!
echo ============================================================
echo You can now double-click "Start MediaDrop.bat" to launch.
echo.
pause
