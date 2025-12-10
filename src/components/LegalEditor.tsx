import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  ListOrdered,
  Heading1,
  Heading2,
  Plus,
  Image,
  Table as TableIcon,
  MessageSquare,
  Share2,
  PenTool,
  Scissors,
  Signature,
  RotateCcw,
  RotateCw,
  Download,
  UploadCloud,
  GripHorizontal,
  X,
  Maximize2,
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import ImageExtension from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import DOMPurify from 'dompurify';
import mammoth from 'mammoth';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

type ToolbarButtonProps = {
  icon: React.ElementType;
  active?: boolean;
  onClick: () => void;
  label?: string;
  isMobile?: boolean;
};

type InsertMenuItemProps = {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
};

type SidebarItemProps = {
  type: 'change' | 'comment';
  author: string;
  text: string;
  date: string;
  active?: boolean;
};

export type SignatureStampData = {
  id: string;
  dataUrl: string;
  width: number;
  top: number;
  left: number;
  height?: number;
};

type SignatureStampProps = {
  stamp: SignatureStampData;
  isActive: boolean;
  onActivate: (id: string | null) => void;
  onDelete: (id: string) => void;
  onChange: (id: string, payload: Partial<SignatureStampData>) => void;
  boundsRef: React.RefObject<HTMLDivElement>;
};

type LegalEditorProps = {
  onRequestSignature: () => void;
  initialContent: string;
  signatureData: string | null;
  onSignatureApplied?: () => void;
};

declare global {
  interface Window {
    htmlDocx?: any;
  }
}

const sanitizeHtml = (html: string) => DOMPurify.sanitize(html, { ADD_ATTR: ['style', 'class'] });

const parseMarkdownToHtml = (text: string) => {
  const html = text
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/\n\n+/gim, '<br />');
  return `<div>${html}</div>`;
};

const extractPdfText = async (file: File) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise;

  const paragraphs: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const lines: Map<number, { x: number; value: string }[]> = new Map();

    textContent.items.forEach((item: any) => {
      if (!('str' in item) || !item.str) return;
      const yRaw = Array.isArray(item.transform) ? item.transform[5] : 0;
      const xRaw = Array.isArray(item.transform) ? item.transform[4] : 0;
      const y = Math.round(yRaw / 2) * 2;
      const bucket = lines.get(y) ?? [];
      bucket.push({ x: xRaw, value: item.str });
      lines.set(y, bucket);
    });

    if (!lines.size) continue;

    const sorted = Array.from(lines.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([, entries]) =>
        entries
          .sort((a, b) => a.x - b.x)
          .map((entry) => entry.value)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim(),
      )
      .filter(Boolean);

    if (sorted.length) {
      paragraphs.push(`<p>${sorted.join('<br>')}</p>`);
    }
  }

  return paragraphs.join('') || '<p>Не удалось извлечь текст из PDF (нет текстовых слоёв).</p>';
};

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ icon: Icon, active, onClick, label, isMobile }) => (
  <button
    onClick={onClick}
    className={`
      flex items-center justify-center rounded-md transition-colors
      ${isMobile ? 'p-3' : 'p-2 hover:bg-slate-100'}
      ${active ? 'bg-blue-100 text-blue-700' : 'text-slate-600'}
    `}
    title={label}
    type="button"
  >
    <Icon size={isMobile ? 24 : 18} />
    {!isMobile && label && <span className="ml-2 text-sm font-medium hidden xl:block">{label}</span>}
  </button>
);

const InsertMenuItem: React.FC<InsertMenuItemProps> = ({ icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
    type="button"
  >
    <Icon size={16} className="mr-3 text-slate-500" />
    {label}
  </button>
);

const SidebarItem: React.FC<SidebarItemProps> = ({ type, author, text, date, active }) => {
  const isChange = type === 'change';

  return (
    <div
      className={`
      p-4 mb-3 rounded-lg border text-sm transition-all cursor-pointer relative overflow-hidden
      ${active ? 'border-blue-400 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}
    `}
    >
      {isChange && <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-400" />}
      <div className="flex justify-between items-center mb-1 pl-2">
        <span className="font-bold text-slate-800 flex items-center gap-2">
          {isChange && <PenTool size={12} className="text-orange-500" />}
          {author}
        </span>
        <span className="text-xs text-slate-400">{date}</span>
      </div>
      <p className={`text-slate-600 leading-relaxed pl-2 ${isChange ? 'italic text-slate-500' : ''}`}>
        {text}
      </p>

      {isChange && active && (
        <div className="mt-2 flex gap-2 pl-2">
          <button className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 font-medium" type="button">
            Принять
          </button>
          <button className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 font-medium" type="button">
            Отклонить
          </button>
        </div>
      )}
    </div>
  );
};

const SignatureStamp: React.FC<SignatureStampProps> = ({ stamp, isActive, onActivate, onDelete, onChange, boundsRef }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const pendingRef = useRef<Partial<SignatureStampData> | null>(null);

  const applyVisualStyle = useCallback(
    (payload?: Partial<SignatureStampData>) => {
      const node = ref.current;
      if (!node) return;
      const left = payload?.left ?? stamp.left;
      const top = payload?.top ?? stamp.top;
      const width = payload?.width ?? stamp.width;
      node.style.left = `${left}px`;
      node.style.top = `${top}px`;
      node.style.width = `${width}px`;
    },
    [stamp.left, stamp.top, stamp.width],
  );

  useEffect(() => {
    applyVisualStyle();
  }, [applyVisualStyle]);

  const flushPending = useCallback(() => {
    if (frameRef.current || !pendingRef.current) return;
    frameRef.current = window.requestAnimationFrame(() => {
      const payload = pendingRef.current;
      pendingRef.current = null;
      frameRef.current = null;
      onChange(stamp.id, payload ?? {});
    });
  }, [onChange, stamp.id]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const height = rect.height;
    if (height && height !== stamp.height) {
      onChange(stamp.id, { height });
    }
  }, [onChange, stamp.height, stamp.id]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    onActivate(stamp.id);
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = stamp.left;
    const startTop = stamp.top;

    const move = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const bounds = boundsRef.current?.getBoundingClientRect();
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const nextLeft = Math.max(0, startLeft + deltaX);
      const nextTop = Math.max(0, startTop + deltaY);

      const stampHeight = stamp.height || ref.current?.getBoundingClientRect()?.height || 140;
      const clampedLeft = bounds ? Math.min(nextLeft, Math.max(0, bounds.width - stamp.width)) : nextLeft;
      const clampedTop = bounds ? Math.min(nextTop, Math.max(0, bounds.height - stampHeight)) : nextTop;

      const payload: Partial<SignatureStampData> = { left: clampedLeft, top: clampedTop };
      applyVisualStyle(payload);
      pendingRef.current = payload;
      flushPending();
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      if (pendingRef.current) {
        onChange(stamp.id, pendingRef.current);
        pendingRef.current = null;
      }
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const handleResize = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onActivate(stamp.id);
    const startX = e.clientX;
    const startWidth = stamp.width;

    const move = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const deltaX = moveEvent.clientX - startX;
      const nextWidth = Math.min(Math.max(120, startWidth + deltaX), 520);
      const payload: Partial<SignatureStampData> = { width: nextWidth };
      applyVisualStyle(payload);
      pendingRef.current = payload;
      flushPending();
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      if (pendingRef.current) {
        onChange(stamp.id, pendingRef.current);
        pendingRef.current = null;
      }
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div
      ref={ref}
      className={`absolute group border-2 rounded-xl transition-all ${isActive ? 'border-blue-500 shadow-lg' : 'border-transparent'}`}
      style={{
        left: `${stamp.left}px`,
        top: `${stamp.top}px`,
        width: `${stamp.width}px`,
        padding: '12px 10px 8px 10px',
        background: 'transparent',
        cursor: 'grab',
        userSelect: 'none',
        pointerEvents: 'auto',
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
    >
      <div className="text-[11px] text-slate-500 font-semibold mb-1 leading-none">Подписано:</div>
      <img
        src={stamp.dataUrl}
        alt="Подпись"
        style={{ width: '100%', height: 'auto', pointerEvents: 'none', filter: 'drop-shadow(0 4px 8px rgba(15,23,42,0.25))' }}
      />

      {isActive && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs rounded-full px-3 py-1 shadow-lg flex items-center gap-2">
          <GripHorizontal size={14} />
          <span>Перетаскивайте / тяните угол</span>
        </div>
      )}

      <button
        type="button"
        className="absolute -top-3 -right-3 bg-white border border-slate-200 rounded-full p-1 shadow-sm hover:bg-slate-100"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(stamp.id);
        }}
        aria-label="Удалить подпись"
      >
        <X size={14} className="text-slate-600" />
      </button>

      <button
        type="button"
        className="absolute -bottom-3 -right-3 bg-white border border-slate-200 rounded-full p-1 shadow-sm hover:bg-slate-100 cursor-se-resize"
        onPointerDown={handleResize}
        aria-label="Масштабировать подпись"
      >
        <Maximize2 size={14} className="text-slate-600" />
      </button>
    </div>
  );
};

export default function LegalEditor({ onRequestSignature, initialContent, signatureData, onSignatureApplied }: LegalEditorProps) {
  const [content, setContent] = useState<string>(initialContent);
  const [showSidebar, setShowSidebar] = useState<boolean>(true);
  const [showInsertMenu, setShowInsertMenu] = useState<boolean>(false);
  const [trackChangesMode, setTrackChangesMode] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [signatureStamps, setSignatureStamps] = useState<SignatureStampData[]>([]);
  const [activeStampId, setActiveStampId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const sanitizedInitial = useMemo(() => sanitizeHtml(initialContent), [initialContent]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        history: { depth: 800 },
      }),
      UnderlineExtension,
      ImageExtension.configure({ allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: sanitizedInitial,
    onUpdate: ({ editor: tiptapEditor }) => {
      setContent(tiptapEditor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'tiptap w-full h-full outline-none font-serif text-slate-900 leading-7 selection:bg-blue-100 selection:text-blue-900',
        style: 'font-family: "Merriweather", "Times New Roman", serif',
      },
    },
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (editor && sanitizedInitial) {
      editor.commands.setContent(sanitizedInitial, false);
    }
  }, [editor, sanitizedInitial]);

  const insertHtml = useCallback(
    (html: string) => {
      if (!editor) return;
      editor.commands.focus();
      editor.commands.insertContent(html);
    },
    [editor],
  );

  const handleInsert = useCallback(
    (type: string) => {
      setShowInsertMenu(false);
      if (!editor) return;

      if (type === 'Разрыв') {
        const pageBreakHtml =
          '<div class="page-break" style="margin: 40px 0; border-bottom: 2px dashed #cbd5e1; position: relative; text-align: center;">' +
          '<span style="background: #F5F7FA; padding: 0 10px; color: #64748b; font-size: 12px; position: relative; top: 10px;">Разрыв страницы</span>' +
          '</div><br>';
        insertHtml(pageBreakHtml);
      } else if (type === 'Подпись') {
        onRequestSignature();
      } else if (type === 'Таблица') {
        editor.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run();
      } else if (type === 'Изображение') {
        const url = window.prompt('Введите URL изображения');
        if (url) {
          editor.chain().focus().setImage({ src: url, alt: 'Вставленное изображение' }).run();
        }
      } else {
        alert(`В реальном приложении здесь откроется диалог вставки: ${type}`);
      }
    },
    [editor, insertHtml, onRequestSignature],
  );

  const extractHtmlBody = useCallback((htmlString: string) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, 'text/html');
      return doc.body?.innerHTML?.trim() || htmlString;
    } catch (err) {
      console.warn('Не удалось разобрать HTML, используем исходное содержимое', err);
      return htmlString;
    }
  }, []);

  const createStampId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()));

  useEffect(() => {
    if (!signatureData) return;
    const bounds = pageRef.current?.getBoundingClientRect();
    const newStamp: SignatureStampData = {
      id: createStampId(),
      dataUrl: signatureData,
      width: bounds ? Math.min(320, Math.max(220, bounds.width * 0.35)) : 240,
      top: bounds ? Math.max(24, bounds.height / 2 - 40) : 200,
      left: bounds ? Math.max(24, bounds.width / 2 - 120) : 120,
    };
    setSignatureStamps((prev) => [...prev, newStamp]);
    setActiveStampId(newStamp.id);
    onSignatureApplied?.();
  }, [signatureData, onSignatureApplied]);

  const handleStampChange = useCallback((id: string, payload: Partial<SignatureStampData>) => {
    setSignatureStamps((prev) => prev.map((stamp) => (stamp.id === id ? { ...stamp, ...payload } : stamp)));
  }, []);

  const handleDeleteStamp = useCallback(
    (id: string) => {
      setSignatureStamps((prev) => prev.filter((stamp) => stamp.id !== id));
      if (activeStampId === id) setActiveStampId(null);
    },
    [activeStampId],
  );

  const combinedHtml = useMemo(() => {
    const layerHtml = signatureStamps
      .map(
        (stamp) =>
          `<div style="position:absolute; left:${stamp.left}px; top:${stamp.top}px; width:${stamp.width}px; padding:12px 10px 8px 10px; background:transparent; border-radius:12px;">` +
          '<div style="font-size:11px; font-weight:600; color:#64748b; margin-bottom:4px;">Подписано:</div>' +
          `<img src="${stamp.dataUrl}" style="width:100%; height:auto; filter: drop-shadow(0 4px 8px rgba(15,23,42,0.25));" alt="Подпись" />` +
          '</div>',
      )
      .join('');
    return `<div style="position:relative; min-height:1000px;">${content}<div style="position:absolute; inset:0;">${layerHtml}</div></div>`;
  }, [content, signatureStamps]);

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      let nextContent = '';
      if (file.type === 'text/html') {
        const text = await file.text();
        nextContent = extractHtmlBody(text);
      } else if (file.type === 'text/markdown' || file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
        const text = await file.text();
        nextContent = parseMarkdownToHtml(text);
      } else if (file.type === 'text/plain') {
        const text = await file.text();
        nextContent = `<p>${text.replace(/\n/g, '<br>')}</p>`;
      } else if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const { value } = await mammoth.convertToHtml({ arrayBuffer });
        nextContent = extractHtmlBody(value);
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        nextContent = await extractPdfText(file);
      } else {
        alert('Поддерживаются форматы: .docx, .html, .txt, .md, .pdf');
        event.target.value = '';
        return;
      }

      const sanitized = sanitizeHtml(nextContent || '');
      editor?.commands.setContent(sanitized, false);
      setContent(sanitized);
      setSignatureStamps([]);
    } catch (err) {
      console.error(err);
      alert('Не удалось импортировать файл. Проверьте формат.');
    } finally {
      event.target.value = '';
    }
  };

  const exportHtml = () => {
    const blob = new Blob([combinedHtml], { type: 'text/html;charset=utf-8' });
    saveAs(blob, 'document.html');
  };

  const exportDocx = () => {
    const loadHtmlDocx = () =>
      new Promise((resolve, reject) => {
        if (window.htmlDocx) return resolve(window.htmlDocx);
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/html-docx-js/dist/html-docx.js';
        script.onload = () => resolve(window.htmlDocx);
        script.onerror = reject;
        document.body.appendChild(script);
      });

    loadHtmlDocx()
      .then((htmlDocx) => {
        const blob = htmlDocx.asBlob(combinedHtml);
        saveAs(blob, 'document.docx');
      })
      .catch(() => alert('Не удалось загрузить модуль экспорта DOCX.'));
  };

  const exportPdf = async () => {
    if (!pageRef.current) return;
    setIsExporting(true);
    const canvas = await html2canvas(pageRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'p', unit: 'px', format: [canvas.width, canvas.height] });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save('document.pdf');
    setIsExporting(false);
  };

  const handleExport = async (format: 'html' | 'docx' | 'pdf') => {
    if (format === 'html') exportHtml();
    if (format === 'docx') exportDocx();
    if (format === 'pdf') await exportPdf();
  };

  const headingActive = (level: number) => editor?.isActive('heading', { level });

  return (
    <div className="flex flex-col h-full bg-[#F5F7FA] font-sans text-slate-800 overflow-hidden">
      <header className="flex-none bg-white border-b border-slate-200 h-16 px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 p-2 rounded-md">
            <Signature color="white" size={20} />
          </div>
          <div>
            <h1 className="font-semibold text-sm md:text-base text-slate-900 leading-tight">Договор оказания услуг</h1>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-400" />
                Правки (2)
              </span>
              <span>•</span>
              <span className="text-slate-400">v. 2.5</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 mr-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-50 text-slate-700 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors"
            >
              <UploadCloud size={16} /> Импорт
            </button>
            <div className="relative group">
              <button
                type="button"
                className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors"
              >
                <Download size={16} /> Экспорт
              </button>
              <div className="absolute right-0 mt-2 w-44 bg-white shadow-lg border border-slate-200 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all">
                <button type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50" onClick={() => handleExport('html')}>
                  HTML
                </button>
                <button type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50" onClick={() => handleExport('docx')}>
                  DOCX
                </button>
                <button type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50" onClick={() => handleExport('pdf')} disabled={isExporting}>
                  {isExporting ? 'PDF…' : 'PDF'}
                </button>
              </div>
            </div>
          </div>

          {!isMobile && (
            <div
              onClick={() => setTrackChangesMode(!trackChangesMode)}
              className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mr-4 cursor-pointer transition-colors border
                    ${trackChangesMode ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-slate-50 text-slate-500 border-slate-200'}
                `}
            >
              <PenTool size={12} />
              {trackChangesMode ? 'Режим правок: ВКЛ' : 'Режим просмотра'}
            </div>
          )}

          {!isMobile && (
            <button className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors flex items-center gap-2 shadow-sm font-medium" type="button">
              <Share2 size={16} /> Согласовать
            </button>
          )}

          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className={`p-2 rounded-md transition-colors relative ${showSidebar ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-100'}`}
            type="button"
          >
            <MessageSquare size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
          </button>
        </div>
      </header>

      {!isMobile && (
        <div className="flex-none bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-center gap-6 shadow-sm z-10">
          <div className="flex items-center gap-1 pr-4 border-r border-slate-200">
            <ToolbarButton icon={RotateCcw} onClick={() => editor?.commands.undo()} label="" />
            <ToolbarButton icon={RotateCw} onClick={() => editor?.commands.redo()} label="" />
          </div>

          <div className="flex items-center gap-1 pr-4 border-r border-slate-200">
            <ToolbarButton icon={Bold} onClick={() => editor?.chain().focus().toggleBold().run()} label="Ж" active={editor?.isActive('bold')} />
            <ToolbarButton icon={Italic} onClick={() => editor?.chain().focus().toggleItalic().run()} label="К" active={editor?.isActive('italic')} />
            <ToolbarButton icon={Underline} onClick={() => editor?.chain().focus().toggleUnderline().run()} label="Ч" active={editor?.isActive('underline')} />
          </div>

          <div className="flex items-center gap-1 pr-4 border-r border-slate-200">
            <ToolbarButton icon={Heading1} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} label="Ст. 1" active={headingActive(2)} />
            <ToolbarButton icon={Heading2} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} label="п. 1.1" active={headingActive(3)} />
            <ToolbarButton icon={ListOrdered} onClick={() => editor?.chain().focus().toggleOrderedList().run()} label="1.2.3" active={editor?.isActive('orderedList')} />
          </div>

          <div className="relative">
            <button
              onClick={() => setShowInsertMenu(!showInsertMenu)}
              className="flex items-center gap-2 bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-md hover:bg-slate-100 transition-colors font-medium text-sm"
              type="button"
            >
              <Plus size={16} /> Вставить
            </button>

            {showInsertMenu && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-50">
                <InsertMenuItem icon={TableIcon} label="Таблица" onClick={() => handleInsert('Таблица')} />
                <InsertMenuItem icon={Scissors} label="Разрыв страницы" onClick={() => handleInsert('Разрыв')} />
                <InsertMenuItem icon={Image} label="Изображение" onClick={() => handleInsert('Изображение')} />
                <InsertMenuItem icon={Signature} label="Подпись" onClick={() => handleInsert('Подпись')} />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden flex relative">
        <div className="flex-1 overflow-y-auto bg-[#F5F7FA] flex justify-center py-8 px-4" onClick={() => setShowInsertMenu(false)}>
          <div
            ref={pageRef}
            className="w-full max-w-[960px] min-h-[1100px] bg-white shadow-md border border-slate-200 mx-auto transition-all relative"
          >
            {trackChangesMode && (
              <div className="absolute top-4 right-4 bg-orange-50 border border-orange-200 text-orange-600 px-3 py-1 text-xs rounded-full font-bold opacity-80 pointer-events-none">
                TRACK CHANGES ON
              </div>
            )}

            <EditorContent editor={editor} className={`${isMobile ? 'p-6 text-base' : 'p-16 text-lg'}`} />

            <div className="absolute inset-0 pointer-events-none">
              {signatureStamps.map((stamp) => (
                <SignatureStamp
                  key={stamp.id}
                  stamp={stamp}
                  isActive={activeStampId === stamp.id}
                  onActivate={setActiveStampId}
                  onDelete={handleDeleteStamp}
                  onChange={handleStampChange}
                  boundsRef={pageRef}
                />
              ))}
            </div>
          </div>
        </div>

        {!isMobile && showSidebar && (
          <div className="w-80 bg-white border-l border-slate-200 flex flex-col shadow-xl z-20">
            <div className="flex border-b border-slate-200">
              <button className="flex-1 py-3 text-sm font-medium text-slate-800 border-b-2 border-blue-600 bg-blue-50/50" type="button">
                Правки (2)
              </button>
              <button className="flex-1 py-3 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700" type="button">
                Комменты (1)
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/30">
              <SidebarItem
                type="change"
                author="Иванов И.И."
                date="10:23"
                text="Замена формулировки: «арбитражном» -> «суде общей юрисдикции»"
                active
              />
              <SidebarItem
                type="change"
                author="Петров А.С."
                date="10:45"
                text="Удалено слово: «качественно и»"
                active={false}
              />
              <div className="my-4 border-t border-slate-200" />
              <SidebarItem
                type="comment"
                author="Юрист"
                date="Вчера"
                text="Коллеги, прошу обратить внимание на пункт 2.1.1. Мы не можем гарантировать качество без критериев."
                active={false}
              />
            </div>
          </div>
        )}
      </div>

      {isMobile && (
        <div className="flex-none bg-white border-t border-slate-200 pb-safe z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-center px-4 py-2">
            <button
              onClick={() => setShowInsertMenu(true)}
              className="p-3 bg-slate-900 rounded-full text-white shadow-md active:scale-95 transition-transform"
              type="button"
            >
              <Plus size={20} />
            </button>

            <div className="flex items-center gap-4">
              <ToolbarButton isMobile icon={Bold} onClick={() => editor?.chain().focus().toggleBold().run()} />
              <ToolbarButton isMobile icon={Heading2} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} />
              <div className="w-px h-6 bg-slate-200" />
              <button className={`p-2 rounded-full ${trackChangesMode ? 'bg-orange-100 text-orange-600' : 'text-slate-400'}`} type="button">
                <PenTool size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        className="hidden"
        type="file"
        accept=".docx,.pdf,.md,.markdown,text/html,text/plain"
        onChange={handleImport}
      />

      <input type="hidden" value={content} readOnly />
    </div>
  );
}
