@echo off
REM Network Management System - Setup Verification Script
REM This script checks if all prerequisites are installed

echo.
echo ====================================
echo NMS - Setup Verification
echo ====================================
echo.

setlocal enabledelayedexpansion

REM Check Python
echo [1/5] Checking Python installation...
python --version >nul 2>&1
if !errorlevel! equ 0 (
    echo     ✓ Python installed
    for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
    echo     Version: !PYTHON_VERSION!
) else (
    echo     ✗ Python not found - Please install Python 3.8+
    exit /b 1
)

REM Check Node.js
echo [2/5] Checking Node.js installation...
node --version >nul 2>&1
if !errorlevel! equ 0 (
    echo     ✓ Node.js installed
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo     Version: !NODE_VERSION!
) else (
    echo     ✗ Node.js not found - Please install Node.js 16+
    exit /b 1
)

REM Check npm
echo [3/5] Checking npm installation...
npm --version >nul 2>&1
if !errorlevel! equ 0 (
    echo     ✓ npm installed
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo     Version: !NPM_VERSION!
) else (
    echo     ✗ npm not found
    exit /b 1
)

REM Check backend requirements.txt
echo [4/5] Checking backend dependencies...
if exist "backend\requirements.txt" (
    echo     ✓ requirements.txt found
) else (
    echo     ✗ requirements.txt not found
    exit /b 1
)

REM Check frontend package.json
echo [5/5] Checking frontend dependencies...
if exist "frontend\package.json" (
    echo     ✓ package.json found
) else (
    echo     ✗ package.json not found
    exit /b 1
)

echo.
echo ====================================
echo ✓ All prerequisites verified!
echo ====================================
echo.
echo Next steps:
echo 1. cd backend
echo 2. python -m venv venv
echo 3. .\venv\Scripts\Activate.ps1
echo 4. pip install -r requirements.txt
echo 5. python app.py
echo.
echo And in another terminal:
echo 1. cd frontend
echo 2. npm install
echo 3. npm run dev
echo.
echo Then open: http://localhost:3000
echo.
