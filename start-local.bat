@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

where python >nul 2>&1
if errorlevel 1 (
  echo Python 3 не найден. Установите Python 3.10+ и повторите.
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js не найден. Установите Node.js 18+ и повторите.
  exit /b 1
)

if not exist .venv (
  python -m venv .venv
)

call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

pushd frontend
npm install
npm run build
popd

uvicorn app.main:app --reload
