# PyMuPDF Workbench + Vite Frontend

Минимальное веб‑приложение для загрузки, просмотра и штамповки PDF: FastAPI + PyMuPDF/pdfplumber на сервере и Vite/React (TypeScript) на клиенте.

## Быстрый старт

### 1. Запуск в два клика на Docker (рекомендуется)
- **Windows**: дважды кликните `start.bat` (требуется Docker Desktop).
- **macOS/Linux**: `./start.sh` (предварительно `chmod +x start.sh`, требуется Docker).

Скрипты сами выбирают `docker compose` или `docker-compose` и собирают образ. После старта откройте `http://127.0.0.1:8000` — FastAPI отдаёт собранный Vite фронтенд, загрузки сохраняются в `data/docs` (примонтирован в контейнер).

### 2. Запуск в два клика без Docker
- **Windows**: дважды кликните `start-local.bat` (создаёт venv, ставит Python/Node зависимости, собирает фронтенд и запускает `uvicorn`).
- **macOS/Linux**: `./start-local.sh` (не забудьте `chmod +x start-local.sh` при первом запуске).

Скрипты проверят наличие `python`/`node`, создадут `.venv`, установят `requirements.txt`, соберут Vite (`npm install && npm run build`) и запустят API на `http://127.0.0.1:8000` с уже собранным фронтендом.

> **Важно для Windows/macOS с пробелами в пути.** Не запускайте `npm run build` из произвольной папки: используйте `start-local.bat`/`start-local.sh` или в консоли из корня проекта выполните `npm install` и `npm run build` — благодаря корневому `package.json` команды сами перейдут в `frontend/` и не упадут из‑за пробелов в пути.

### 3. Локальная разработка (Vite dev + API одним шагом)
- Из корня: `npm run dev` — автоматически установит фронтенд‑зависимости (hook `predev`), запустит `uvicorn app.main:app --reload` и Vite dev‑сервер с прокси на `http://127.0.0.1:8000`.
- Если в dev видите `proxy error ECONNREFUSED` — значит API не запущен. Используйте `npm run dev` или `start-local.*`, чтобы поднять бекенд и фронтенд одновременно.

## Ручной запуск (если нужен терминал)
- Установка фронтенда: `npm run install:frontend`
- Сборка фронтенда: `npm run build`
- Запуск API: `python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && uvicorn app.main:app --reload`

## Возможности
- Загрузка PDF на сервер (без клиентских конвертеров).
- Извлечение текста с обрезкой полей (left/right/top/bottom) через PyMuPDF.
- Извлечение таблиц через pdfplumber.
- Рендер страниц в PNG с DPI.
- Простой текстовый штамп (координаты/цвет/размер).
- Скачивание отредактированного PDF.
- SPA на Vite: загрузка файла, список документов, предпросмотр текста/таблиц/PNG, постановка штампа, выбор пресетов обрезки.

## API
- `GET /health` — проверка сервера.
- `POST /api/upload` – загрузка PDF.
- `GET /api/docs` – список метаданных.
- `GET /api/docs/{id}` – метаданные.
- `GET /api/docs/{id}/text?left=40&top=30&bottom=30` – текст без полей.
- `GET /api/docs/{id}/tables` – таблицы.
- `GET /api/docs/{id}/page/{page}/png?dpi=150` – PNG страницы.
- `POST /api/docs/{id}/stamp` – добавить штамп (`{"text":"CONFIDENTIAL","page":0,"x":72,"y":72}`).
- `GET /api/docs/{id}/download` – скачать PDF.
- `DELETE /api/docs/{id}` – удалить.

## Зачем PyMuPDF + pdfplumber
- **PyMuPDF**: быстрые bbox и шрифты для точной очистки юридических PDF, рендер страниц и вставка штампов.
- **pdfplumber**: извлечение таблиц поверх PyMuPDF.

## Заметки по продакшену
- Храните файлы в S3/MinIO, добавьте очистку временных файлов и лимиты размера запроса.
- Для импорта DOCX/ODT/Markdown используйте серверный конвертер (Pandoc/PyMuPDF pipeline) с загрузкой ассетов.
- Включите CORS-ограничения под нужные домены и храните секреты вне кода.
