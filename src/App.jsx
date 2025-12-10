import React, { useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import LegalEditor from './components/LegalEditor.jsx';
import SignaturePad from './components/SignaturePad.jsx';

const initialDocument = `
    <h1>ДОГОВОР ОКАЗАНИЯ ЮРИДИЧЕСКИХ УСЛУГ № 12/24</h1>
    <p>г. Москва &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; «10» декабря 2025 г.</p>
    <br>
    <p>Общество с ограниченной ответственностью «Вектор», именуемое в дальнейшем <b>«Заказчик»</b>, в лице Генерального директора Иванова И.И., действующего на основании Устава, с одной стороны, и...</p>
    <h2>1. ПРЕДМЕТ ДОГОВОРА</h2>
    <p>1.1. Исполнитель обязуется по заданию Заказчика оказать юридические услуги, указанные в п. 1.2 настоящего Договора, а Заказчик обязуется принять и оплатить эти услуги.</p>
    <p>1.2. Перечень услуг:</p>
    <ul>
      <li>Правовой анализ документов;</li>
      <li>Подготовка письменных заключений;</li>
      <li>Представительство в <span style="background-color: #fee2e2; text-decoration: line-through; color: #991b1b;">арбитражном</span> <span style="background-color: #dcfce7; color: #166534;">суде общей юрисдикции</span>.</li>
    </ul>
    <div class="page-break" style="margin: 40px 0; border-bottom: 2px dashed #cbd5e1; position: relative; text-align: center;">
        <span style="background: #F5F7FA; padding: 0 10px; color: #64748b; font-size: 12px; position: relative; top: 10px;">Разрыв страницы</span>
    </div>
    <h2>2. ПРАВА И ОБЯЗАННОСТИ СТОРОН</h2>
    <p>2.1. Исполнитель обязан:</p>
    <p>2.1.1. Оказывать Услуги <span style="background-color: #fee2e2; text-decoration: line-through; color: #991b1b;">качественно и</span> в срок, установленный настоящим Договором.</p>
  `;

export default function App() {
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signatureData, setSignatureData] = useState(null);

  const handleOpenSignature = () => setShowSignaturePad(true);

  const handleSaveSignature = (dataUrl) => {
    setSignatureData(dataUrl);
    setShowSignaturePad(false);
  };

  const handleCloseSignature = () => setShowSignaturePad(false);

  const handleSignatureApplied = () => setSignatureData(null);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">DocSign</p>
            <h1 className="text-3xl font-bold text-slate-900 mt-1">Юридический редактор с подписью</h1>
            <p className="text-slate-600 mt-1">Редактируйте договор, отслеживайте правки и подписывайте прямо в браузере.</p>
          </div>
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-200">
            <ShieldCheck className="text-emerald-500" size={20} />
            <div className="text-sm">
              <p className="font-semibold text-slate-800">Шифрование включено</p>
              <p className="text-slate-500">Подписи сохраняются локально</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden min-h-[80vh]">
          <LegalEditor
            initialContent={initialDocument}
            onRequestSignature={handleOpenSignature}
            signatureData={signatureData}
            onSignatureApplied={handleSignatureApplied}
          />
        </div>
      </div>

      {showSignaturePad && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full p-6 relative">
            <button
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-500"
              type="button"
              onClick={handleCloseSignature}
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-semibold text-slate-900 mb-1">Подпишите документ</h2>
            <p className="text-slate-600 mb-4">Используйте стилус или мышь. Подпись автоматически добавится в текст.</p>
            <SignaturePad onSave={handleSaveSignature} onCancel={handleCloseSignature} />
          </div>
        </div>
      )}
    </div>
  );
}
