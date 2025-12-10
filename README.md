# PyMuPDF Workbench

Минимальный web‑приложение на FastAPI для загрузки, извлечения текста и таблиц из PDF, предпросмотра страниц и простых штампов. Основано на PyMuPDF и pdfplumber. Все клиентские конвертеры удалены — импорт/обработка выполняется на сервере.

## Быстрый старт
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
Зайдите на http://127.0.0.1:8000 и загрузите PDF.

## Возможности
- Загрузка PDF и хранение на диске с метаданными.
- Извлечение текста с обрезкой полей (left/right/top/bottom) через PyMuPDF.
- Вывод таблиц через pdfplumber.
- Рендер страницы в PNG с нужным DPI.
- Простая маркировка/штампы текстом на странице.
- Скачать отредактированный PDF.

## API
- `POST /api/upload` – загрузка PDF.
- `GET /api/docs/{id}` – метаданные.
- `GET /api/docs/{id}/text?left=40&top=30&bottom=30` – текст без полей.
- `GET /api/docs/{id}/tables` – таблицы.
- `GET /api/docs/{id}/page/{page}/png?dpi=150` – PNG страницы.
- `POST /api/docs/{id}/stamp` – добавить штамп (`{"text":"CONFIDENTIAL","page":0,"x":72,"y":72}`).
- `GET /api/docs/{id}/download` – скачать PDF.
- `DELETE /api/docs/{id}` – удалить.

## Почему PyMuPDF + pdfplumber
- **PyMuPDF**: быстрые bbox и шрифты для точной очистки юридических PDF, рендер страниц и вставка штампов.
- **pdfplumber**: извлечение таблиц поверх PyMuPDF.

## Заметки по продакшену
- Храните файлы в S3/MinIO, а не на локальном диске.
- Включите очистку временных файлов и лимиты размера запроса.
- Поддержку DOCX/ODT/Markdown реализуйте через серверный конвертер (Pandoc) с загрузкой ассетов.
