import io
import uuid
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Dict, List, Optional

import fitz  # PyMuPDF
import pdfplumber
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

DATA_DIR = Path("data/docs")
DATA_DIR.mkdir(parents=True, exist_ok=True)

DIST_DIR = Path(__file__).parent.parent / "frontend" / "dist"

app = FastAPI(title="PyMuPDF Workbench", version="1.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if (Path(__file__).parent / "static").exists():
    app.mount("/static", StaticFiles(directory=Path(__file__).parent / "static"), name="static")
if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="frontend-assets")


@dataclass
class DocumentMeta:
    id: str
    filename: str
    path: str
    pages: int
    size: int


documents: Dict[str, DocumentMeta] = {}


def register_document(filepath: Path, filename: str, pages: int) -> DocumentMeta:
    doc_id = uuid.uuid4().hex
    meta = DocumentMeta(id=doc_id, filename=filename, path=str(filepath), pages=pages, size=filepath.stat().st_size)
    documents[doc_id] = meta
    return meta


def get_document(doc_id: str) -> DocumentMeta:
    meta = documents.get(doc_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Document not found")
    if not Path(meta.path).exists():
        raise HTTPException(status_code=410, detail="Document removed from storage")
    return meta


def extract_text(meta: DocumentMeta, crop: Optional[Dict[str, float]] = None) -> str:
    crop = crop or {"left": 0, "right": 0, "top": 0, "bottom": 0}
    buffer: List[str] = []
    path = Path(meta.path)
    with fitz.open(path) as doc:
        for page in doc:
            rect = page.rect
            clip = fitz.Rect(
                rect.x0 + crop.get("left", 0),
                rect.y0 + crop.get("top", 0),
                rect.x1 - crop.get("right", 0),
                rect.y1 - crop.get("bottom", 0),
            )
            blocks = page.get_text("blocks", clip=clip)
            for block in blocks:
                if len(block) >= 5:
                    text = block[4].strip()
                    if text:
                        buffer.append(text)
    return "\n".join(buffer)


def extract_tables(meta: DocumentMeta) -> List[List[List[str]]]:
    tables: List[List[List[str]]] = []
    with pdfplumber.open(meta.path) as pdf:
        for page in pdf.pages:
            page_tables = page.extract_tables()
            if page_tables:
                tables.extend(page_tables)
    return tables


@app.get("/")
async def spa_entry(_: Request):
    if DIST_DIR.exists():
        return FileResponse(DIST_DIR / "index.html")
    return {"message": "Frontend build not found. Run npm install && npm run build in /frontend."}


@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    raw = await file.read()
    try:
        doc = fitz.open(stream=raw, filetype="pdf")
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=422, detail=f"Failed to open PDF: {exc}") from exc
    pages = doc.page_count
    filename = file.filename
    dest = DATA_DIR / f"{uuid.uuid4().hex}.pdf"
    dest.write_bytes(raw)
    meta = register_document(dest, filename, pages)
    return {"document": asdict(meta)}


@app.get("/api/docs")
async def list_docs():
    return {"documents": [asdict(doc) for doc in documents.values()]}


@app.get("/api/docs/{doc_id}")
async def get_meta(doc_id: str):
    meta = get_document(doc_id)
    return {"document": asdict(meta)}


@app.get("/api/docs/{doc_id}/text")
async def get_text(doc_id: str, left: float = 0, right: float = 0, top: float = 0, bottom: float = 0):
    meta = get_document(doc_id)
    text = extract_text(meta, {"left": left, "right": right, "top": top, "bottom": bottom})
    return {"text": text}


@app.get("/api/docs/{doc_id}/tables")
async def get_tables(doc_id: str):
    meta = get_document(doc_id)
    return {"tables": extract_tables(meta)}


@app.get("/api/docs/{doc_id}/page/{page}/png")
async def page_png(doc_id: str, page: int, dpi: int = 144):
    meta = get_document(doc_id)
    path = Path(meta.path)
    with fitz.open(path) as doc:
        if page < 0 or page >= doc.page_count:
            raise HTTPException(status_code=404, detail="Page not found")
        pg = doc.load_page(page)
        zoom = dpi / 72
        mat = fitz.Matrix(zoom, zoom)
        pix = pg.get_pixmap(matrix=mat, alpha=False)
        return StreamingResponse(io.BytesIO(pix.tobytes("png")), media_type="image/png")


@app.post("/api/docs/{doc_id}/stamp")
async def stamp(doc_id: str, payload: dict):
    meta = get_document(doc_id)
    text = payload.get("text")
    page_index = int(payload.get("page", 0))
    x = float(payload.get("x", 72))
    y = float(payload.get("y", 72))
    color = payload.get("color", "#bf1f24")
    size = float(payload.get("size", 12))
    if not text:
        raise HTTPException(status_code=400, detail="Stamp text is required")

    path = Path(meta.path)
    with fitz.open(path) as doc:
        if page_index < 0 or page_index >= doc.page_count:
            raise HTTPException(status_code=404, detail="Page not found")
        page = doc.load_page(page_index)
        rect = fitz.Rect(x, y, x + 200, y + 40)
        shape = page.new_shape()
        shape.draw_rect(rect)
        shape.finish(color=fitz.utils.getColor(color), width=1)
        shape.insert_text(rect.tl + (8, 12), text, fontsize=size, color=fitz.utils.getColor(color), overlay=True)
        shape.commit()
        doc.save(str(path))
    meta.size = Path(meta.path).stat().st_size
    return {"document": asdict(meta)}


@app.get("/api/docs/{doc_id}/download")
async def download(doc_id: str):
    meta = get_document(doc_id)
    path = Path(meta.path)
    filename = f"{Path(meta.filename).stem}-edited.pdf"
    return StreamingResponse(
        path.open("rb"),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@app.delete("/api/docs/{doc_id}")
async def delete(doc_id: str):
    meta = get_document(doc_id)
    Path(meta.path).unlink(missing_ok=True)
    documents.pop(doc_id, None)
    return {"status": "deleted"}


@app.get("/health")
async def health():
    return {"status": "ok"}
