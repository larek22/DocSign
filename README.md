# PyMuPDF Workbench + Vite Frontend

Минимальное веб‑приложение для загрузки, просмотра и штамповки PDF: FastAPI + PyMuPDF/pdfplumber на сервере и Vite/React (TypeScript) на клиенте.

## Быстрый старт

### 1. Один шаг через Docker Compose (рекомендуется)
```bash
docker compose up --build
```
Откройте `http://127.0.0.1:8000` — FastAPI отдаёт собранный Vite фронтенд, загрузки сохраняются в `data/docs` (примонтирован в контейнер).

### 2. Локально без Docker
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cd frontend
npm install
npm run dev # SPA на 5173, бекенд на 8000
```
В другом окне терминала запустите API:
```bash
uvicorn app.main:app --reload
```
Откройте `http://127.0.0.1:5173` (dev) или выполните сборку `cd frontend && npm run build`, после чего `uvicorn` отдаст готовый бандл по `http://127.0.0.1:8000`.

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
