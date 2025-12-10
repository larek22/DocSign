import React, { useState, useRef, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline,
  ListOrdered,
  Heading1,
  Heading2,
  Plus,
  Image,
  Table,
  MessageSquare,
  Share2,
  PenTool,
  Scissors,
  Signature,
  RotateCcw,
  RotateCw,
} from 'lucide-react';

const ToolbarButton = ({ icon: Icon, active, onClick, label, isMobile }) => (
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

const InsertMenuItem = ({ icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
    type="button"
  >
    <Icon size={16} className="mr-3 text-slate-500" />
    {label}
  </button>
);

const SidebarItem = ({ type, author, text, date, active }) => {
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

export default function LegalEditor({ onRequestSignature, initialContent, signatureData, onSignatureApplied }) {
  const [content, setContent] = useState(initialContent);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [trackChangesMode, setTrackChangesMode] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const editorRef = useRef(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const format = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const insertHtml = (html) => {
    document.execCommand('insertHTML', false, html);
    editorRef.current?.focus();
  };

  const handleInsert = (type) => {
    setShowInsertMenu(false);
    if (type === 'Разрыв') {
      const pageBreakHtml =
        '<div class="page-break" style="margin: 40px 0; border-bottom: 2px dashed #cbd5e1; position: relative; text-align: center;">' +
        '<span style="background: #F5F7FA; padding: 0 10px; color: #64748b; font-size: 12px; position: relative; top: 10px;">Разрыв страницы</span>' +
        '</div><br>';
      insertHtml(pageBreakHtml);
    } else if (type === 'Подпись') {
      onRequestSignature();
    } else {
      alert(`В реальном приложении здесь откроется диалог вставки: ${type}`);
    }
  };

  useEffect(() => {
    if (!signatureData) return;
    const signatureHtml = `<div style="margin-top: 16px; display: inline-flex; flex-direction: column; align-items: flex-start; gap: 4px;">
      <span style="font-size: 12px; color: #475569;">Подписано:</span>
      <img src="${signatureData}" alt="Подпись" style="height: 72px; object-fit: contain; filter: drop-shadow(0 4px 8px rgba(15,23,42,0.1));" />
    </div>`;
    insertHtml(signatureHtml);
    onSignatureApplied?.();
  }, [signatureData, onSignatureApplied]);

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
            <ToolbarButton icon={RotateCcw} onClick={() => format('undo')} label="" />
            <ToolbarButton icon={RotateCw} onClick={() => format('redo')} label="" />
          </div>

          <div className="flex items-center gap-1 pr-4 border-r border-slate-200">
            <ToolbarButton icon={Bold} onClick={() => format('bold')} label="Ж" />
            <ToolbarButton icon={Italic} onClick={() => format('italic')} label="К" />
            <ToolbarButton icon={Underline} onClick={() => format('underline')} label="Ч" />
          </div>

          <div className="flex items-center gap-1 pr-4 border-r border-slate-200">
            <ToolbarButton icon={Heading1} onClick={() => format('formatBlock', 'H2')} label="Ст. 1" />
            <ToolbarButton icon={Heading2} onClick={() => format('formatBlock', 'H3')} label="п. 1.1" />
            <ToolbarButton icon={ListOrdered} onClick={() => format('insertOrderedList')} label="1.2.3" />
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
                <InsertMenuItem icon={Table} label="Таблица" onClick={() => handleInsert('Таблица')} />
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
          <div className="w-full max-w-[960px] min-h-[1100px] bg-white shadow-md border border-slate-200 mx-auto transition-all relative">
            {trackChangesMode && (
              <div className="absolute top-4 right-4 bg-orange-50 border border-orange-200 text-orange-600 px-3 py-1 text-xs rounded-full font-bold opacity-80 pointer-events-none">
                TRACK CHANGES ON
              </div>
            )}

            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className={`
                w-full h-full outline-none font-serif text-slate-900 leading-7
                selection:bg-blue-100 selection:text-blue-900
                ${isMobile ? 'p-6 text-base' : 'p-16 text-lg'}
              `}
              style={{ fontFamily: '"Merriweather", "Times New Roman", serif' }}
              dangerouslySetInnerHTML={{ __html: content }}
              onBlur={(e) => setContent(e.target.innerHTML)}
            />
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
              <ToolbarButton isMobile icon={Bold} onClick={() => format('bold')} />
              <ToolbarButton isMobile icon={Heading2} onClick={() => format('formatBlock', 'H3')} />
              <div className="w-px h-6 bg-slate-200" />
              <button className={`p-2 rounded-full ${trackChangesMode ? 'bg-orange-100 text-orange-600' : 'text-slate-400'}`} type="button">
                <PenTool size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      <input type="hidden" value={content} readOnly />
    </div>
  );
}
