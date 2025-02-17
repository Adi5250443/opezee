@echo off
echo ======================================================
echo Packaging Fullstack App into a Single EXE...
echo ======================================================

:: Step 1: Navigate to Backend Directory
cd /d "%~dp0\backend"

:: Step 2: Install Backend Dependencies
echo Installing backend dependencies...
npm install

:: Step 3: Ensure Frontend Build Exists
IF EXIST "dist" (
    echo Frontend build found, proceeding...
) ELSE (
    echo ERROR: Frontend build (dist) not found! Please build it first.
    exit /b 1
)

:: Step 4: Package Backend + Frontend into a Single EXE
echo Packaging fullstack app...
npx pkg server.js --output fullstack-app.exe --targets win-x64

:: Step 5: Restart Backend Server (If Running)
echo Restarting the server...
taskkill /F /IM fullstack-app.exe >nul 2>&1
start cmd /k "fullstack-app.exe"

echo ======================================================
echo Build Completed Successfully!
echo Windows EXE: backend\fullstack-app.exe
echo ======================================================

pause
