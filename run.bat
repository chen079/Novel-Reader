@echo off
chcp 65001 >nul
title Novel-Reader

echo [Novel-Reader] Starting backend...
cd /d "%~dp0backend"
start /b cmd /c "venv\Scripts\python.exe run.py 2>&1 | findstr /v /c:"^$""

echo [Novel-Reader] Starting frontend...
cd /d "%~dp0frontend"
start /b cmd /c "npx vite --host 2>&1"

echo.
echo ========================================
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo   API Docs: http://localhost:8000/docs
echo ========================================
echo   Press Ctrl+C to stop all services
echo ========================================
echo.

:wait
timeout /t 3600 /nobreak >nul
goto wait
