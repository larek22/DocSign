import type { DocumentMeta } from './types';

const json = async (res: Response) => {
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || res.statusText);
  }
  return res.json();
};

export async function listDocuments(): Promise<DocumentMeta[]> {
  const res = await fetch('/api/docs');
  const body = await json(res);
  return body.documents ?? [];
}

export async function uploadPdf(file: File): Promise<DocumentMeta> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: form });
  const body = await json(res);
  return body.document as DocumentMeta;
}

export async function fetchText(docId: string, crop?: { left?: number; right?: number; top?: number; bottom?: number; }): Promise<string> {
  const params = new URLSearchParams();
  if (crop) {
    Object.entries(crop).forEach(([k, v]) => {
      if (typeof v === 'number') params.append(k, String(v));
    });
  }
  const res = await fetch(`/api/docs/${docId}/text?${params.toString()}`);
  const body = await json(res);
  return body.text ?? '';
}

export async function fetchTables(docId: string): Promise<string[][][]> {
  const res = await fetch(`/api/docs/${docId}/tables`);
  const body = await json(res);
  return body.tables ?? [];
}

export async function fetchPagePng(docId: string, page: number): Promise<string> {
  const res = await fetch(`/api/docs/${docId}/page/${page}/png`);
  if (!res.ok) throw new Error('Не удалось получить PNG страницы');
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function stamp(docId: string, payload: { text: string; page?: number; x?: number; y?: number; color?: string; size?: number; }): Promise<DocumentMeta> {
  const res = await fetch(`/api/docs/${docId}/stamp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = await json(res);
  return body.document as DocumentMeta;
}

export async function download(docId: string): Promise<void> {
  const res = await fetch(`/api/docs/${docId}/download`);
  if (!res.ok) throw new Error('Не удалось скачать PDF');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${docId}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
