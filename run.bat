@echo off
chcp 65001 >nul
title Novel-Reader

rem ========================= Configuration =========================
rem Edit these values or pass as arguments:
rem   run.bat --backend-port 8000 --frontend-port 8080
set BACKEND_PORT=3398
set FRONTEND_PORT=3399

rem ========================= Parse Arguments =======================
:parse_args
if "%~1"=="" goto start_services
if /i "%~1"=="--backend-port"  (set BACKEND_PORT=%~2& shift & shift & goto parse_args)
if /i "%~1"=="--frontend-port" (set FRONTEND_PORT=%~2& shift & shift & goto parse_args)
if /i "%~1"=="--port"          (set FRONTEND_PORT=%~2& shift & shift & goto parse_args)
echo [WARN] Unknown option: %~1
shift
goto parse_args

rem ========================= Start Services ========================
:start_services

echo [Novel-Reader] Starting backend on port %BACKEND_PORT%...
cd /d "%~dp0backend"
set BACKEND_PORT_ENV=%BACKEND_PORT%
start /b cmd /c "venv\Scripts\python.exe run.py 2>&1 | findstr /v /c:"^$""

echo [Novel-Reader] Starting frontend on port %FRONTEND_PORT%...
cd /d "%~dp0frontend"
start /b cmd /c "npx vite --host --port %FRONTEND_PORT% 2>&1"

echo.
echo ========================================
echo   Backend:  http://localhost:%BACKEND_PORT%
echo   Frontend: http://localhost:%FRONTEND_PORT%
echo   API Docs: http://localhost:%BACKEND_PORT%/docs
echo ========================================
echo   Press Ctrl+C to stop all services
echo ========================================
echo.

:wait
timeout /t 3600 /nobreak >nul
goto wait
