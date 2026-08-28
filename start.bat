@echo off
setlocal enabledelayedexpansion
title TOTS Screen

echo =======================================================
echo  TOTS Screen - 1-Click Launcher
echo =======================================================

cd /d "%~dp0"

:: Check for Bun or Node.js
where bun >nul 2>nul
if %errorlevel% equ 0 (
    set RUNTIME=bun
    goto runtime_found
)

where node >nul 2>nul
if %errorlevel% equ 0 (
    set RUNTIME=node
    goto runtime_found
)

echo [ERROR] Neither Node.js nor Bun was found on your computer.
echo.
echo Please install one of the following to use Screen Share Hub:
echo  1. Bun: https://bun.sh
echo  2. Node.js: https://nodejs.org
echo.
pause
exit /b 1

:runtime_found
echo [OK] Detected runtime: %RUNTIME%

:: Check if node_modules folder exists
if not exist "node_modules\" (
    echo [INFO] First time launch: Installing dependencies...
    if "%RUNTIME%"=="bun" (
        call bun install
    ) else (
        call npm install
    )
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed successfully!
)

echo.
echo Starting Screen Share Hub and opening browser...
echo.

if "%RUNTIME%"=="bun" (
    bun bin\screenshare.js --open %*
) else (
    node bin\screenshare.js --open %*
)

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Server exited with an error.
    pause
)
