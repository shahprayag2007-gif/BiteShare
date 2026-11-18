@echo off
title KindPlates Web Server (FastAPI + PostgreSQL 18)
color 0A
cls
echo ============================================================================
echo      KINDPLATES: INTER-UNIVERSITY SURPLUS FOOD REDISTRIBUTION SYSTEM
echo ============================================================================
echo.
echo   Database Engine : PostgreSQL 18 (campus_food_db via pgAdmin 4)
echo   Backend Service : FastAPI REST Engine (Python ASGI)
echo   Local Address   : http://127.0.0.1:8000
echo.
echo ============================================================================
echo.

:: Change directory to backend folder
cd /d "%~dp0backend"

:: Verify Python is available in PATH
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] Python was not found in your system PATH!
    echo Please install Python 3.10+ and check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)

echo [1/3] Checking environment & dependencies...
echo [2/3] Launching web browser in 3 seconds...

:: Launch browser in background after short delay to give Uvicorn time to bind
start /b cmd /c "timeout /t 3 /nobreak >nul && start http://127.0.0.1:8000"

echo [3/3] Starting FastAPI Uvicorn Server on http://127.0.0.1:8000 ...
echo.
echo ============================================================================
echo   IMPORTANT: KEEP THIS COMMAND PROMPT WINDOW OPEN!
echo   Closing this window will stop the web server and disconnect the website.
echo ============================================================================
echo.

python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload

echo.
echo Server has stopped.
pause
