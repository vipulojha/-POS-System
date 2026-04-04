@echo off
setlocal

cd /d "%~dp0"
title Backend Auto-Restart (Port 5001)

echo ==========================================
echo Backend auto-restart runner
echo Folder: %cd%
echo Press Ctrl+C to stop.
echo ==========================================

:run
echo.
echo [%date% %time%] Starting backend...
npm.cmd start
echo [%date% %time%] Backend stopped or crashed. Restarting in 2 seconds...
timeout /t 2 /nobreak >nul
goto run
