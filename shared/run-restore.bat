@echo off
echo ========================================
echo    Firebase Restore Script
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
echo Available restore options:
echo.
echo 1. Restore latest backup (safe - won't overwrite existing data)
echo 2. Restore latest backup with overwrite (DANGEROUS - will replace existing data)
echo 3. Dry run (test without making changes)
echo 4. List available backups
echo 5. Restore specific backup
echo.

set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" (
    echo Running safe restore from latest backup...
    npm run restore
) else if "%choice%"=="2" (
    echo WARNING: This will OVERWRITE existing data!
    set /p confirm="Type 'YES' to confirm: "
    if /i "%confirm%"=="YES" (
        echo Running restore with overwrite...
        npm run restore:overwrite
    ) else (
        echo Restore cancelled.
    )
) else if "%choice%"=="3" (
    echo Running dry run (no changes will be made)...
    npm run restore:dry-run
) else if "%choice%"=="4" (
    echo Listing available backups...
    npm run restore:list
) else if "%choice%"=="5" (
    set /p timestamp="Enter backup timestamp (e.g., 2025-08-16T18-08-42-582Z): "
    if not "%timestamp%"=="" (
        echo Restoring from backup: %timestamp%
        node restore-script.js --timestamp %timestamp%
    ) else (
        echo No timestamp provided.
    )
) else (
    echo Invalid choice. Please run the script again.
)

echo.
echo Restore process completed!
pause
