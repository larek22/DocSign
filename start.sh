#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if command -v docker >/dev/null 2>&1; then
  if docker compose version >/dev/null 2>&1; then
    docker compose up --build
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose up --build
  else
    echo "Не найден docker compose. Установите Docker Desktop или docker-compose." >&2
    exit 1
  fi
else
  echo "Docker не установлен. Установите Docker Desktop/Engine и повторите попытку." >&2
  exit 1
fi
