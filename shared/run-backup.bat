@echo off
echo ========================================
echo    Firebase Backup Script
echo ========================================
echo.

cd /d "%~dp0"

echo Checking if Node.js is installed...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Checking if dependencies are installed...
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

echo.
echo Starting backup process...
echo.

if "%1"=="--upload" (
    echo Running backup with cloud storage upload...
    npm run backup:upload
) else if "%1"=="--cleanup" (
    echo Running backup with cleanup...
    npm run backup:cleanup
) else if "%1"=="--full" (
    echo Running full backup (upload + cleanup)...
    npm run backup:full
) else (
    echo Running standard backup...
    npm run backup
)

echo.
echo Backup process completed!
pause
