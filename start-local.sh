#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 не найден. Установите Python 3.10+ и повторите попытку." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js не найден. Установите Node.js 18+ и повторите попытку." >&2
  exit 1
fi

if [ ! -d .venv ]; then
  python3 -m venv .venv
fi

source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

pushd frontend >/dev/null
npm install
npm run build
popd >/dev/null

uvicorn app.main:app --reload
