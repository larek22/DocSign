import { useEffect, useMemo, useState } from 'react';
import { download, fetchPagePng, fetchTables, fetchText, listDocuments, stamp, uploadPdf } from './api';
import type { DocumentMeta } from './types';

const cropPresets = [
  { label: 'Без обрезки', value: { left: 0, right: 0, top: 0, bottom: 0 } },
  { label: 'Узкие поля (32px)', value: { left: 32, right: 32, top: 32, bottom: 32 } },
  { label: 'Широкие поля (64px)', value: { left: 64, right: 64, top: 64, bottom: 64 } },
];

function prettyBytes(size: number) {
  if (!size) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(size) / Math.log(1024)));
  return `${(size / 1024 ** i).toFixed(1)} ${units[i]}`;
}

export default function App() {
  const [docs, setDocs] = useState<DocumentMeta[]>([]);
  const [current, setCurrent] = useState<DocumentMeta | null>(null);
  const [text, setText] = useState('');
  const [tables, setTables] = useState<string[][][]>([]);
  const [pagePreview, setPagePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [stampText, setStampText] = useState('CONFIDENTIAL');
  const [stampPage, setStampPage] = useState(0);
  const [cropIdx, setCropIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const crop = useMemo(() => cropPresets[cropIdx]?.value ?? cropPresets[0].value, [cropIdx]);

  useEffect(() => {
    listDocuments().then(setDocs).catch(() => setDocs([]));
  }, []);

  useEffect(() => {
    if (!current) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    Promise.all([
      fetchText(current.id, crop).catch((err) => {
        setError(err.message);
        return '';
      }),
      fetchTables(current.id).catch(() => []),
      fetchPagePng(current.id, 0).catch(() => '')
    ])
      .then(([t, tbl, png]) => {
        setText(t);
        setTables(tbl);
        setPagePreview(png);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [current, crop]);

  const onUpload = async (file?: File | null) => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const meta = await uploadPdf(file);
      setDocs((prev) => [meta, ...prev]);
      setCurrent(meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки файла');
    } finally {
      setLoading(false);
    }
  };

  const onStamp = async () => {
    if (!current || !stampText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await stamp(current.id, { text: stampText, page: stampPage, x: 72, y: 96, color: '#bf1f24', size: 12 });
      const png = await fetchPagePng(current.id, stampPage);
      setPagePreview(png);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка штампа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0 }}>DocSign PDF Workbench</h1>
          <p style={{ margin: 0, color: '#475569' }}>Backend: FastAPI + PyMuPDF/pdfplumber. Frontend: Vite + React.</p>
        </div>
        <div className="badge">API health → <span id="health-dot" style={{ width: 10, height: 10, borderRadius: '9999px', background: '#16a34a' }}></span></div>
      </header>

      <section className="grid">
        <div className="card">
          <h3>Загрузка PDF</h3>
          <p style={{ color: '#475569', marginTop: 4 }}>Файлы уходят на сервер, где их обрабатывает PyMuPDF/pdfplumber.</p>
          <input type="file" accept="application/pdf" onChange={(e) => onUpload(e.target.files?.[0])} />
          {error && <p style={{ color: '#b91c1c', marginTop: 12 }}>{error}</p>}
          {loading && <div className="loader" style={{ marginTop: 12 }} aria-label="loading" />}
        </div>

        <div className="card">
          <h3>Документы</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {docs.length === 0 && <li style={{ color: '#94a3b8' }}>Нет загруженных документов.</li>}
            {docs.map((doc) => (
              <li key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 10, background: current?.id === doc.id ? '#f8fafc' : 'white' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{doc.filename}</div>
                  <div style={{ fontSize: 13, color: '#475569' }}>{doc.pages} стр • {prettyBytes(doc.size)}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="button secondary" onClick={() => setCurrent(doc)}>Открыть</button>
                  <button className="button secondary" onClick={() => download(doc.id)}>Скачать</button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h3>Штамп</h3>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Текст</label>
          <input value={stampText} onChange={(e) => setStampText(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 10 }} />
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Страница</label>
          <input type="number" min={0} value={stampPage} onChange={(e) => setStampPage(Number(e.target.value))} style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 12 }} />
          <button className="button primary" disabled={!current || !stampText.trim()} onClick={onStamp}>Поставить штамп</button>
        </div>

        <div className="card">
          <h3>Обрезка полей</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {cropPresets.map((preset, idx) => (
              <button key={preset.label} className="button secondary" style={{ borderColor: idx === cropIdx ? '#0f172a' : '#e2e8f0' }} onClick={() => setCropIdx(idx)}>
                {preset.label}
              </button>
            ))}
          </div>
          <p style={{ marginTop: 10, color: '#475569' }}>Применяется к извлечению текста (отрезает номера строк и колонтитулы по координатам).</p>
        </div>
      </section>

      <section style={{ marginTop: 24 }} className="grid">
        <div className="card" style={{ minHeight: 320 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Текст</h3>
            <span style={{ color: '#94a3b8', fontSize: 13 }}>{current ? current.filename : 'Нет документа'}</span>
          </div>
          <pre style={{ background: '#0f172a', color: '#e2e8f0', borderRadius: 12, padding: 12, maxHeight: 360, overflow: 'auto', whiteSpace: 'pre-wrap', margin: 0 }}>
            {loading ? 'Загрузка…' : text || 'Нет данных'}
          </pre>
        </div>

        <div className="card" style={{ minHeight: 320 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Страница 1 (PNG)</h3>
            {current && <span style={{ fontSize: 13, color: '#475569' }}>{current.pages} стр</span>}
          </div>
          {pagePreview ? <img src={pagePreview} alt="page preview" style={{ width: '100%', borderRadius: 12, border: '1px solid #e2e8f0' }} /> : <p style={{ color: '#94a3b8' }}>Нет превью.</p>}
        </div>

        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Таблицы</h3>
            <span style={{ fontSize: 13, color: '#475569' }}>{tables.length} найдено</span>
          </div>
          {tables.length === 0 && <p style={{ color: '#94a3b8' }}>Таблицы не найдены.</p>}
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
            {tables.map((table, idx) => (
              <div key={idx} style={{ overflowX: 'auto' }}>
                <table>
                  <tbody>
                    {table.map((row, ridx) => (
                      <tr key={ridx}>
                        {row.map((cell, cidx) => (
                          <td key={cidx}>{cell ?? ''}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
