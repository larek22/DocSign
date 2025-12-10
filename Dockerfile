# Multi-stage build: frontend (Vite) then backend (FastAPI + PyMuPDF)
FROM node:18-slim AS frontend
WORKDIR /app

# Install frontend deps and build Vite bundle
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci
COPY frontend ./frontend
RUN cd frontend && npm run build

# Backend image
FROM python:3.11-slim AS backend
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app

# System deps (fonts for PDF rendering, cleanup tools)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        poppler-utils \
        fonts-dejavu-core \
        libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Application code
COPY app ./app
COPY --from=frontend /app/frontend/dist ./frontend/dist

# Create data directory for uploads
RUN mkdir -p /app/data/docs

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
