@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

where docker >nul 2>&1
if errorlevel 1 (
  echo Docker не найден. Установите Docker Desktop и повторите попытку.
  exit /b 1
)

docker compose version >nul 2>&1
if not errorlevel 1 (
  docker compose up --build
  exit /b %errorlevel%
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
  echo Не найден docker compose. Убедитесь, что Docker Desktop установлен с поддержкой Compose.
  exit /b 1
)

docker-compose up --build
