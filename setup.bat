@echo off
REM Setup script for Aura Platform Demo (Windows)

echo 🚀 Aura Platform - Setup Script
echo =================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js v18 or higher.
    pause
    exit /b 1
)

echo ✅ Node.js version: %node -v%
echo.

REM Create logs directory
if not exist logs mkdir logs

REM Install dependencies
echo 📦 Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo ✅ Installation complete!
echo.
echo 🎉 Ready to start the server!
echo.
echo To start the server, run:
echo    npm run dev
echo.
echo To test the API, run:
echo    node test/demo.js
echo.

pause