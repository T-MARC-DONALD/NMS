#!/bin/bash
# Network Management System - Setup Verification Script
# This script checks if all prerequisites are installed

echo ""
echo "===================================="
echo "NMS - Setup Verification"
echo "===================================="
echo ""

# Check Python
echo "[1/5] Checking Python installation..."
if command -v python3 &> /dev/null; then
    echo "    ✓ Python installed"
    python3 --version
else
    echo "    ✗ Python not found - Please install Python 3.8+"
    exit 1
fi

# Check Node.js
echo "[2/5] Checking Node.js installation..."
if command -v node &> /dev/null; then
    echo "    ✓ Node.js installed"
    node --version
else
    echo "    ✗ Node.js not found - Please install Node.js 16+"
    exit 1
fi

# Check npm
echo "[3/5] Checking npm installation..."
if command -v npm &> /dev/null; then
    echo "    ✓ npm installed"
    npm --version
else
    echo "    ✗ npm not found"
    exit 1
fi

# Check backend requirements.txt
echo "[4/5] Checking backend dependencies..."
if [ -f "backend/requirements.txt" ]; then
    echo "    ✓ requirements.txt found"
else
    echo "    ✗ requirements.txt not found"
    exit 1
fi

# Check frontend package.json
echo "[5/5] Checking frontend dependencies..."
if [ -f "frontend/package.json" ]; then
    echo "    ✓ package.json found"
else
    echo "    ✗ package.json not found"
    exit 1
fi

echo ""
echo "===================================="
echo "✓ All prerequisites verified!"
echo "===================================="
echo ""
echo "Next steps:"
echo "1. cd backend"
echo "2. python3 -m venv venv"
echo "3. source venv/bin/activate"
echo "4. pip install -r requirements.txt"
echo "5. python3 app.py"
echo ""
echo "And in another terminal:"
echo "1. cd frontend"
echo "2. npm install"
echo "3. npm run dev"
echo ""
echo "Then open: http://localhost:3000"
echo ""
