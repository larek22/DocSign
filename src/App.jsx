import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Scale,
  FileText,
  Clock,
  Search,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  Zap,
  MoreHorizontal,
  LayoutDashboard,
  FolderOpen,
  Settings,
  PieChart,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  UploadCloud,
  BookOpen,
  Sparkles,
  Fingerprint,
  Bookmark,
  Activity,
  ShieldAlert,
  BrainCircuit,
  Layers,
  KeyRound,
  FileCheck,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// --- ОБЩИЕ СТИЛИ И ТЕМА ---
const Fonts = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap&subset=cyrillic');
    .font-serif-display { font-family: 'Playfair Display', serif; }
    .font-sans-ui { font-family: 'Inter', sans-serif; }
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    .animate-in { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `}</style>
);

const theme = {
  dark: {
    bg: 'bg-[#0F0F0F]',
    paper: 'bg-[#1A1A1A]',
    textPrimary: 'text-[#E0E0E0]',
    textSecondary: 'text-[#888888]',
    border: 'border-[#333333]',
    accent: 'text-[#C5A059]',
    accentBg: 'bg-[#C5A059]',
    success: 'text-emerald-500',
    highlightCritical:
      'bg-red-900/30 text-red-200 border-b-2 border-red-500 cursor-pointer hover:bg-red-900/50',
    highlightWarning:
      'bg-amber-900/30 text-amber-200 border-b-2 border-amber-500 cursor-pointer hover:bg-amber-900/50',
  },
  light: {
    bg: 'bg-[#F9F7F2]',
    paper: 'bg-[#FFFFFF]',
    textPrimary: 'text-[#1A1A1A]',
    textSecondary: 'text-[#666660]',
    border: 'border-[#E5E0D6]',
    accent: 'text-[#B08D55]',
    accentBg: 'bg-[#B08D55]',
    success: 'text-emerald-600',
    highlightCritical: 'bg-red-100 text-red-900 border-b-2 border-red-500 cursor-pointer hover:bg-red-200',
    highlightWarning:
      'bg-amber-100 text-amber-900 border-b-2 border-amber-500 cursor-pointer hover:bg-amber-200',
  },
};

const detectDocumentType = (text) => {
  const lower = text.toLowerCase();
  if (lower.includes('конфиденциал')) return 'NDA';
  if (lower.includes('поставка')) return 'Договор поставки';
  if (lower.includes('лиценз')) return 'Лицензионный договор';
  return 'Договор';
};

const buildPipelineResult = (text, issues) => {
  const type = detectDocumentType(text);
  const baseScore = 60 + issues.length * 10;
  const risk_score = Math.min(95, baseScore);
  return {
    document_meta: {
      type,
      risk_score,
      jurisdiction: 'RF',
    },
    analysis: issues.map((issue, idx) => ({
      original_id: `clause_${idx + 1}`,
      original_text: issue.textMatch,
      risk_level: issue.type === 'critical' ? 'Critical' : 'Warning',
      issue_title: issue.title,
      legal_basis: issue.category || 'Общие положения ГК РФ',
      ai_suggestion: issue.suggestion,
      diff_highlight: {
        remove: issue.textMatch,
        add: issue.suggestion,
      },
    })),
  };
};

const DEFAULT_LLM_SETTINGS = {
  model: 'gpt-5-mini',
  temperature: 0.2,
  maxTokens: 1200,
  topP: 1,
};

const callLLM = async ({ system, user, apiKey, log, settings }) => {
  const model = settings?.model?.trim() || DEFAULT_LLM_SETTINGS.model;
  const rawTemperature = Number(settings?.temperature ?? DEFAULT_LLM_SETTINGS.temperature);
  const max_tokens = settings?.maxTokens ? Number(settings.maxTokens) : undefined;
  const top_p = settings?.topP ? Number(settings.topP) : undefined;

  const isGpt5Mini = model?.startsWith('gpt-5-mini');
  const useResponsesApi = isGpt5Mini; // для gpt-5-mini используем Responses API и не отправляем temperature
  const temperature = !isGpt5Mini && !Number.isNaN(rawTemperature) ? rawTemperature : undefined;
  if (isGpt5Mini && rawTemperature !== undefined) {
    log?.('info', 'Температура не отправлена для gpt-5-mini: модель использует встроенное значение', {
      requested: rawTemperature,
    });
  }

  // responses API ожидает max_output_tokens, chat completions — max_tokens / max_completion_tokens
  const tokenField = useResponsesApi
    ? 'max_output_tokens'
    : model?.startsWith('gpt-5')
    ? 'max_completion_tokens'
    : 'max_tokens';

  const payload = useResponsesApi
    ? {
        model,
        input: [
          { role: 'system', content: [{ type: 'text', text: system }] },
          { role: 'user', content: [{ type: 'text', text: user }] },
        ],
        ...(typeof max_tokens === 'number' && !Number.isNaN(max_tokens)
          ? { [tokenField]: max_tokens }
          : {}),
        ...(typeof top_p === 'number' && !Number.isNaN(top_p) ? { top_p } : {}),
      }
    : {
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        ...(!isGpt5Mini && temperature !== undefined ? { temperature } : {}),
        ...(typeof max_tokens === 'number' && !Number.isNaN(max_tokens)
          ? { [tokenField]: max_tokens }
          : {}),
        ...(typeof top_p === 'number' && !Number.isNaN(top_p) ? { top_p } : {}),
      };

  log?.('info', `LLM запрос (${model})`, {
    ...payload,
    messages: undefined,
    input: undefined,
  });

  const response = await fetch(useResponsesApi ? 'https://api.openai.com/v1/responses' : 'https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    log?.('error', 'Ответ LLM вернул ошибку', { status: response.status, body: text });
    throw new Error(`LLM ответ ${response.status}: ${text.slice(0, 200)}`);
  }

  const data = await response.json();

  const extractText = () => {
    if (data?.output_text) return data.output_text;
    if (Array.isArray(data?.output)) {
      return data.output
        .flatMap((item) => item?.content || [])
        .map((c) => c?.text || '')
        .join('');
    }
    return data?.choices?.[0]?.message?.content;
  };

  const content = extractText();
  log?.('info', 'LLM ответ получен', { content: content?.slice(0, 400) || 'пусто' });
  return content;
};

const stripCodeFence = (raw = '') => {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1];
  return raw.replace(/^```[a-zA-Z]*\s*/i, '').replace(/```$/i, '');
};

const safeJSON = (str, log) => {
  if (!str) return { data: null, raw: '' };
  const normalized = (() => {
    const fenced = stripCodeFence(str.trim());
    const first = fenced.indexOf('{');
    const last = fenced.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) return fenced.slice(first, last + 1);
    return fenced;
  })();

  try {
    return { data: JSON.parse(normalized), raw: normalized };
  } catch (error) {
    log?.('error', 'Не удалось распарсить JSON из ответа LLM', {
      message: error.message,
      snippet: normalized.slice(0, 400),
    });
    return { data: null, raw: normalized, error };
  }
};

const runPipeline = async ({ text, issues, apiKey, log, settings }) => {
  if (!text || !text.trim()) {
    throw new Error('Загруженный документ пуст или не удалось извлечь текст.');
  }

  if (!apiKey) {
    throw new Error('API ключ не указан. Добавьте ключ и повторите анализ.');
  }

  const finalIssues = issues?.length ? issues : extractIssuesFromText(text);

  const parserPrompt = `Ты — AI-ассистент, специализирующийся на юридической структуре документов. Твоя задача: разбить входящий текст договора на логические блоки (Статьи/Пункты). Игнорируй колонтитулы и номера страниц. Определи тип документа (NDA, Договор поставки, Лицензионный договор). Выдели "Существенные условия" (Essential Terms) для данного типа договора согласно ГК РФ. Верни результат в формате JSON, где каждый пункт имеет ID и чистый текст.`;
  const riskPrompt = `Ты — беспощадный старший юрист (Senior Associate) в топовой юридической фирме, защищающий интересы Исполнителя. Тебе переданы структурированные пункты договора в JSON. Найди любые условия, которые противоречат ГК РФ, создают финансовые риски, кабальны или двояко трактуются. Формат мысли: Цитата / Почему это плохо / Ссылка на закон / Вердикт (Критично/Внимание). Верни краткий список рисков в JSON.`;
  const judgePrompt = `Ты — Партнер юридической фирмы и главный редактор. Проверь список рисков младшего юриста. Удали ложные срабатывания, оставь только влияющие на бизнес. Для каждого подтверджённого риска предложи идеальную формулировку (Gold Standard Clause) с компромиссным тоном для контрагента. Верни результат строго в JSON со структурой: {"document_meta":{...},"analysis":[{original_id,original_text,risk_level,issue_title,legal_basis,ai_suggestion,diff_highlight:{remove,add}}]}.`;

  log?.('info', 'Шаг 1: парсинг документа', { length: text.length });
  const parserAnswer = await callLLM({
    system: parserPrompt,
    user: text.slice(0, 12000),
    apiKey,
    log,
    settings,
  });
  const { data: parserJSON } = safeJSON(parserAnswer, log);
  if (!parserJSON) {
    throw new Error('LLM не вернул корректный JSON на этапе парсинга.');
  }

  log?.('info', 'Шаг 2: поиск рисков', { sections: parserJSON?.length || Object.keys(parserJSON || {}).length });
  const redTeamAnswer = await callLLM({
    system: riskPrompt,
    user: JSON.stringify(parserJSON).slice(0, 12000),
    apiKey,
    log,
    settings,
  });
  const { data: redTeamJSON } = safeJSON(redTeamAnswer, log);
  if (!redTeamJSON) {
    throw new Error('LLM не вернул корректный JSON на этапе поиска рисков.');
  }

  log?.('info', 'Шаг 3: финальный судья', { risks: Array.isArray(redTeamJSON) ? redTeamJSON.length : Object.keys(redTeamJSON || {}).length });
  const judgeAnswer = await callLLM({
    system: judgePrompt,
    user: JSON.stringify(redTeamJSON).slice(0, 12000),
    apiKey,
    log,
    settings,
  });
  const { data: judgeJSON } = safeJSON(judgeAnswer, log);
  if (!judgeJSON?.analysis) {
    log?.('error', 'Этап судьи вернул неожиданный формат', {
      judgeAnswer: judgeAnswer?.slice(0, 500),
    });
    throw new Error('LLM не смог собрать финальный JSON. Проверьте логи.');
  }

  log?.('info', 'Pipeline завершён', { analysis: judgeJSON.analysis?.length || 0 });
  return {
    pipeline: judgeJSON,
    issues: judgeJSON.analysis?.map((item, idx) => ({
      id: item.original_id || `issue-${idx + 1}`,
      type: item.risk_level?.toLowerCase() === 'critical' ? 'critical' : 'warning',
      textMatch: item.diff_highlight?.remove || item.original_text,
      title: item.issue_title || 'Риск',
      description: item.legal_basis || 'Проверьте формулировку',
      suggestion: item.diff_highlight?.add || item.ai_suggestion,
      category: item.legal_basis || 'Общие положения',
    })) || finalIssues,
  };
};

const ApiKeyModal = ({ visible, onClose, onSave, apiKey, isDark }) => {
  const [value, setValue] = useState(apiKey || '');
  const t = isDark ? theme.dark : theme.light;

  if (!visible) return null;

  return (
    <div className={`fixed inset-0 z-[70] flex items-center justify-center ${t.bg} bg-opacity-90 animate-in`}>
      <div className={`w-full max-w-lg rounded-2xl p-8 border ${t.border} ${t.paper} shadow-2xl relative`}>
        <button
          aria-label="Закрыть"
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
        >
          <X size={18} />
        </button>
        <div className="flex items-center gap-3 mb-4">
          <KeyRound className={t.accent} />
          <h3 className={`text-xl font-serif-display ${t.textPrimary}`}>API ключ</h3>
        </div>
        <p className={`text-sm mb-4 ${t.textSecondary}`}>
          Добавьте ключ вашей LLM (например, GPT-5-mini), чтобы запускать трёхступенчатый pipeline: Парсинг → Red Team → Судья.
        </p>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="sk-..."
          className={`w-full p-3 rounded-lg border ${t.border} ${t.paper} ${t.textPrimary} outline-none`}
        />
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" isDark={isDark} onClick={onClose}>
            Отмена
          </Button>
          <Button
            variant="primary"
            isDark={isDark}
            onClick={() => {
              onSave(value.trim());
              onClose();
            }}
          >
            Сохранить ключ
          </Button>
        </div>
      </div>
    </div>
  );
};

const AdminPanel = ({ visible, onClose, isDark, apiKey, onSaveKey, settings, onSaveSettings }) => {
  const t = isDark ? theme.dark : theme.light;
  const [localKey, setLocalKey] = useState(apiKey || '');
  const [localSettings, setLocalSettings] = useState({
    model: settings?.model || DEFAULT_LLM_SETTINGS.model,
    temperature: settings?.temperature ?? DEFAULT_LLM_SETTINGS.temperature,
    maxTokens: settings?.maxTokens ?? DEFAULT_LLM_SETTINGS.maxTokens,
    topP: settings?.topP ?? DEFAULT_LLM_SETTINGS.topP,
  });

  useEffect(() => {
    setLocalKey(apiKey || '');
  }, [apiKey]);

  useEffect(() => {
    setLocalSettings({
      model: settings?.model || DEFAULT_LLM_SETTINGS.model,
      temperature: settings?.temperature ?? DEFAULT_LLM_SETTINGS.temperature,
      maxTokens: settings?.maxTokens ?? DEFAULT_LLM_SETTINGS.maxTokens,
      topP: settings?.topP ?? DEFAULT_LLM_SETTINGS.topP,
    });
  }, [settings]);

  if (!visible) return null;

  return (
    <div className={`fixed inset-0 z-[75] flex items-center justify-center ${t.bg} bg-opacity-90 animate-in`}>
      <div className={`w-full max-w-3xl rounded-2xl p-8 border ${t.border} ${t.paper} shadow-2xl relative`}>
        <button
          aria-label="Закрыть"
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
        >
          <X size={18} />
        </button>
        <div className="flex items-center gap-3 mb-4">
          <Settings className={t.accent} />
          <h3 className={`text-xl font-serif-display ${t.textPrimary}`}>Админка LLM</h3>
        </div>
        <p className={`text-sm mb-6 ${t.textSecondary}`}>
          Управляйте ключами и параметрами запросов к GPT (модель, температура, max tokens, top-p). Настройки сохраняются локально
          и применяются ко всем шагам пайплайна.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={`p-4 rounded-xl border ${t.border} ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
            <h4 className={`font-serif-display text-lg mb-3 ${t.textPrimary}`}>API ключ</h4>
            <input
              value={localKey}
              onChange={(e) => setLocalKey(e.target.value)}
              placeholder="sk-..."
              className={`w-full p-3 rounded-lg border ${t.border} ${t.paper} ${t.textPrimary} outline-none mb-3`}
            />
            <div className="flex gap-3">
              <Button
                variant="primary"
                isDark={isDark}
                onClick={() => {
                  onSaveKey?.(localKey.trim());
                }}
                className="flex-1"
              >
                Сохранить ключ
              </Button>
              <Button
                variant="secondary"
                isDark={isDark}
                onClick={() => {
                  setLocalKey('');
                  onSaveKey?.('');
                }}
              >
                Очистить
              </Button>
            </div>
          </div>

          <div className={`p-4 rounded-xl border ${t.border} ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
            <h4 className={`font-serif-display text-lg mb-3 ${t.textPrimary}`}>Модель и лимиты</h4>
            <label className={`text-xs uppercase tracking-widest font-bold ${t.textSecondary}`}>Модель</label>
            <input
              value={localSettings.model}
              onChange={(e) => setLocalSettings((s) => ({ ...s, model: e.target.value }))}
              className={`w-full p-3 rounded-lg border ${t.border} ${t.paper} ${t.textPrimary} outline-none mb-3`}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`text-xs uppercase tracking-widest font-bold ${t.textSecondary}`}>Температура</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={localSettings.temperature}
                  disabled={localSettings.model?.startsWith('gpt-5-mini')}
                  onChange={(e) => setLocalSettings((s) => ({ ...s, temperature: Number(e.target.value) }))}
                  className="w-full"
                />
                <div className={`text-sm ${t.textPrimary}`}>
                  {localSettings.temperature}
                  {localSettings.model?.startsWith('gpt-5-mini') && (
                    <span className={`ml-2 text-xs ${t.textSecondary}`}>
                      Для gpt-5-mini температура фиксирована, параметр не отправляется
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label className={`text-xs uppercase tracking-widest font-bold ${t.textSecondary}`}>Top P</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={localSettings.topP}
                  onChange={(e) => setLocalSettings((s) => ({ ...s, topP: Number(e.target.value) }))}
                  className="w-full"
                />
                <div className={`text-sm ${t.textPrimary}`}>{localSettings.topP}</div>
              </div>
            </div>
            <label className={`text-xs uppercase tracking-widest font-bold ${t.textSecondary}`}>Max tokens</label>
            <input
              type="number"
              min="256"
              max="32000"
              value={localSettings.maxTokens}
              onChange={(e) => setLocalSettings((s) => ({ ...s, maxTokens: Number(e.target.value) }))}
              className={`w-full p-3 rounded-lg border ${t.border} ${t.paper} ${t.textPrimary} outline-none`}
            />

            <Button
              variant="primary"
              isDark={isDark}
              className="w-full mt-4"
              onClick={() => onSaveSettings?.(localSettings)}
            >
              Сохранить параметры
            </Button>
          </div>
        </div>

        <div className={`mt-4 text-xs ${t.textSecondary}`}>
          Настройки применяются к шагам: парсер → red team → судья. Для gpt-5-mini используется параметр
          <span className="font-semibold"> max_completion_tokens</span>, поэтому численное значение сохраняется, но передается в
          актуальном поле. Для gpt-5-mini температура зафиксирована провайдером (параметр не отправляется вручную), поэтому для
          экономии токенов используйте лимит и top-p.
        </div>
      </div>
    </div>
  );
};

const LogConsole = ({ visible, onClose, entries, isDark }) => {
  const t = isDark ? theme.dark : theme.light;
  if (!visible) return null;

  return (
    <div className={`fixed inset-0 z-[80] flex items-center justify-center ${t.bg} bg-opacity-90 animate-in`}>
      <div className={`w-full max-w-4xl h-[70vh] rounded-2xl p-6 border ${t.border} ${t.paper} shadow-2xl relative overflow-hidden`}>
        <button
          aria-label="Закрыть"
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
        >
          <X size={18} />
        </button>
        <div className="flex items-center gap-3 mb-4">
          <Activity className={t.accent} />
          <h3 className={`text-xl font-serif-display ${t.textPrimary}`}>Логи пайплайна</h3>
        </div>
        <p className={`text-sm mb-4 ${t.textSecondary}`}>
          Здесь отображаются запросы и ответы LLM, статусы шагов и ошибки. При обращении в поддержку приложите содержимое этого окна.
        </p>
        <div className="h-full overflow-auto hide-scrollbar space-y-3 pr-2">
          {entries.length === 0 && <div className={`${t.textSecondary} text-sm`}>Логи пусты.</div>}
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`p-3 rounded-lg border ${t.border} ${isDark ? 'bg-white/5' : 'bg-black/5'} text-sm`}
            >
              <div className="flex justify-between items-center mb-1">
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${
                    entry.level === 'error'
                      ? 'bg-red-500/10 text-red-400'
                      : entry.level === 'info'
                      ? 'bg-amber-500/10 text-amber-500'
                      : 'bg-emerald-500/10 text-emerald-400'
                  }`}
                >
                  {entry.level}
                </span>
                <span className={`text-[11px] ${t.textSecondary}`}>
                  {new Date(entry.timestamp).toLocaleTimeString('ru-RU')}
                </span>
              </div>
              <div className={`${t.textPrimary} font-medium mb-1`}>{entry.message}</div>
              {entry.data && (
                <pre className={`text-[11px] whitespace-pre-wrap break-words ${t.textSecondary}`}>
                  {JSON.stringify(entry.data, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StepIndicator = ({ status, label, isDark }) => {
  const t = isDark ? theme.dark : theme.light;
  return (
    <div className={`flex items-center gap-4 transition-opacity duration-500 ${status === 'pending' ? 'opacity-40' : 'opacity-100'}`}>
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-500 ${
          status === 'completed'
            ? 'bg-emerald-500 border-emerald-500 text-black'
            : status === 'active'
            ? `${t.accentBg} border-transparent text-black animate-pulse`
            : `border-gray-600 ${t.textSecondary}`
        }`}
      >
        {status === 'completed' ? <CheckCircle2 size={16} /> : status === 'active' ? <Activity size={16} /> : <div className="w-2 h-2 rounded-full bg-current" />}
      </div>
      <span className={`text-sm font-medium ${status === 'active' ? t.textPrimary : t.textSecondary} font-serif-display tracking-wide`}>
        {label}
      </span>
    </div>
  );
};

const MultiStageLoader = ({ isDark, onComplete, onCancel, apiKey, doc, onOpenApi, onError, onLog, settings }) => {
  const t = isDark ? theme.dark : theme.light;
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  const runningRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (runningRef.current) return;
      runningRef.current = true;
      try {
        setError('');
        setStep(1);
        onLog?.('info', 'Старт пайплайна', { name: doc?.name, size: doc?.text?.length });
        await new Promise((resolve) => setTimeout(resolve, 800));
        setStep(2);
        await new Promise((resolve) => setTimeout(resolve, 1200));
        setStep(3);
        const result = await runPipeline({
          text: doc?.text,
          issues: doc?.issues,
          apiKey,
          log: onLog,
          settings,
        });
        if (cancelled) return;
        setStep(4);
        await new Promise((resolve) => setTimeout(resolve, 400));
        onCompleteRef.current?.(result);
      } catch (err) {
        if (cancelled) return;
        setError(err.message || 'Неизвестная ошибка при анализе документа.');
        onLog?.('error', 'Ошибка пайплайна', { message: err.message });
        onErrorRef.current?.(err.message || 'Ошибка анализа');
      } finally {
        runningRef.current = false;
      }
    };

    if (!doc?.text) {
      setError('Не удалось прочитать документ. Загрузите файл ещё раз.');
      return undefined;
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [apiKey, doc, attempt, onLog, settings]);

  const steps = [
    '1. Парсинг и структурирование (статьи, пункты)',
    '2. Red Team: поиск всех рисков',
    '3. Судья: валидация и идеальные формулировки',
    '4. Сборка итогового JSON',
  ];

  const renderStatus = (idx) => {
    if (step > idx) return 'completed';
    if (step === idx) return 'active';
    return 'pending';
  };

  return (
    <div className={`fixed inset-0 z-[60] flex items-center justify-center ${t.bg} bg-opacity-95 animate-in`}>
      <button onClick={onCancel} className={`absolute top-6 left-6 p-2 rounded-full ${t.textSecondary} hover:bg-white/5`}>
        <X size={22} />
      </button>
      <div className="w-full max-w-lg px-8 relative text-center">
        <BrainCircuit size={120} className={`mx-auto mb-6 ${t.accent}`} />
        <h3 className={`text-2xl font-serif-display mb-2 ${t.textPrimary}`}>AI Legal Pipeline</h3>
        <p className={`text-sm ${t.textSecondary} mb-8`}>
          GPT-5-mini: Parser → Red Team → Judge. Проверяем текст и формируем безопасные формулировки.
        </p>
        <div className="space-y-4 text-left">
          {steps.map((label, idx) => (
            <StepIndicator key={label} status={renderStatus(idx)} label={label} isDark={isDark} />
          ))}
        </div>

        {error && (
          <div className={`mt-8 p-4 rounded-xl border ${t.border} ${t.paper}`}>
            <p className={`text-sm mb-3 ${t.textPrimary}`}>{error}</p>
            <div className="flex gap-3 flex-wrap justify-center">
              <Button variant="primary" isDark={isDark} onClick={() => setAttempt((a) => a + 1)}>
                Повторить анализ
              </Button>
              {onOpenApi && (
                <Button variant="secondary" isDark={isDark} onClick={onOpenApi}>
                  Добавить API ключ
                </Button>
              )}
              <Button variant="ghost" isDark={isDark} onClick={onCancel}>
                Закрыть
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const extractIssuesFromText = (text) => {
  const candidates = [
    {
      id: 'liability',
      type: 'critical',
      textMatch: 'независимо от наличия вины',
      title: 'Риск безусловной ответственности',
      description:
        'Формулировка возлагает ответственность даже при отсутствии вины. Это создаёт чрезмерные риски для исполнителя.',
      suggestion: 'при наличии документально подтверждённой вины (умысла или грубой неосторожности)',
      category: 'Ответственность (ст. 401 ГК РФ)',
    },
    {
      id: 'uncapped-penalty',
      type: 'warning',
      textMatch: '5 000 000',
      title: 'Высокая неустойка',
      description: 'Размер неустойки выглядит завышенным и может быть признан несоразмерным.',
      suggestion: '1 000 000 (один миллион) рублей либо 2x стоимости контракта',
      category: 'Ответственность',
    },
    {
      id: 'perpetual-term',
      type: 'warning',
      textMatch: 'действует бессрочно',
      title: 'Бессрочный характер обязательств',
      description:
        'Бессрочные обязательства могут ограничивать конкуренцию. Рекомендуется установить разумный срок охраны.',
      suggestion: 'действует в течение 5 (пяти) лет с момента передачи информации',
      category: 'Срок действия',
    },
  ];

  return candidates.filter((issue) => text.toLowerCase().includes(issue.textMatch.toLowerCase()));
};

const extractTextFromPdf = async (arrayBuffer) => {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageTexts = [];

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item) => item.str).join(' ');
    pageTexts.push(strings);
  }

  return pageTexts.join('\n');
};

const extractTextFromDocx = async (arrayBuffer) => {
  const { value } = await mammoth.extractRawText({ arrayBuffer });
  return value;
};

const readFileAsText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file, 'utf-8');
  });

const parseFileToText = async (file) => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'pdf') {
    return extractTextFromPdf(await file.arrayBuffer());
  }
  if (extension === 'docx') {
    return extractTextFromDocx(await file.arrayBuffer());
  }
  return readFileAsText(file);
};

// --- МОБИЛЬНЫЕ КОМПОНЕНТЫ ---
const Button = ({ children, variant = 'primary', onClick, className = '', isDark, disabled }) => {
  const base =
    'px-5 py-3 rounded-xl font-sans-ui font-medium text-sm transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const styles = {
    primary: isDark
      ? 'bg-[#C5A059] text-black hover:bg-[#D4AF37]'
      : 'bg-[#1A1A1A] text-white hover:bg-[#333] ',
    secondary: isDark
      ? 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
      : 'bg-white text-black border border-gray-200 hover:bg-gray-50',
    ghost: 'bg-transparent opacity-60 hover:opacity-100',
  };

  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
};

const UploadScreen = ({ isDark, onUploadComplete, onCancel }) => {
  const t = isDark ? theme.dark : theme.light;
  const inputRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const handlePick = () => {
    setError('');
    inputRef.current?.click();
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsScanning(true);
    setProgress(4);
    try {
      const text = await parseFileToText(file);
      setProgress(80);
      const issues = extractIssuesFromText(text);
      setProgress(100);
      setTimeout(() => onUploadComplete({ text, issues, name: file.name }), 300);
    } catch (err) {
      setError('Не удалось прочитать файл. Попробуйте TXT, PDF или DOCX.');
      console.error(err);
      setIsScanning(false);
      setProgress(0);
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${t.bg} bg-opacity-95 animate-in`}>
      <button onClick={onCancel} className={`absolute top-6 left-6 p-2 rounded-full ${t.textSecondary} hover:bg-white/5`}>
        <X size={24} />
      </button>

      <div className="w-full max-w-md px-6">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md,.rtf"
          className="hidden"
          onChange={handleFile}
        />

        <div
          onClick={!isScanning ? handlePick : undefined}
          className={`
            relative aspect-[4/5] rounded-3xl border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center cursor-pointer group overflow-hidden
            ${isScanning ? 'border-transparent bg-black/5' : `${t.border} hover:border-[#C5A059]`}
            ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}
          `}
        >
          {isScanning ? (
            <>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#C5A059]/20 to-transparent w-full h-[20%] animate-[scan_2s_linear_infinite]" />
              <div className="flex flex-col items-center z-10">
                <div className={`w-16 h-16 rounded-2xl mb-6 flex items-center justify-center ${t.accentBg} text-black animate-pulse`}>
                  <FileText size={32} />
                </div>
                <h3 className={`font-serif-display text-xl ${t.textPrimary} mb-2`}>Читаем документ...</h3>
                <p className={`font-mono text-sm ${t.accent}`}>{progress}%</p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center text-center p-8 transition-transform duration-300 group-hover:scale-105">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${isDark ? 'bg-[#1A1A1A]' : 'bg-white'} shadow-xl`}>
                <UploadCloud size={32} className={t.accent} />
              </div>
              <h3 className={`font-serif-display text-2xl ${t.textPrimary} mb-2`}>Загрузите договор</h3>
              <p className={`text-sm ${t.textSecondary} mb-6`}>
                Поддерживаемые форматы: PDF, DOCX, TXT.
                <br />AI автоматически найдёт риски.
              </p>
              <Button variant="primary" isDark={isDark}>
                Выбрать файл
              </Button>
              {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes scan {
          0% { top: -20%; }
          100% { top: 120%; }
        }
      `}</style>
    </div>
  );
};

const INITIAL_TEXT = `
ДОГОВОР О КОНФИДЕНЦИАЛЬНОСТИ (NDA)

1. Предмет соглашения. Принимающая сторона обязуется сохранять в тайне любую Конфиденциальную информацию, полученную от Раскрывающей стороны.

2. Ответственность. В случае разглашения Конфиденциальной информации Принимающая сторона обязуется возместить Раскрывающей стороне все убытки в полном объеме, включая упущенную выгоду, независимо от наличия вины Принимающей стороны. Штрафная неустойка составляет 5 000 000 (пять миллионов) рублей за каждый факт нарушения.

3. Срок действия. Настоящее Соглашение действует бессрочно и не может быть расторгнуто Принимающей стороной в одностороннем порядке.

4. Применимое право. К отношениям сторон применяется право Российской Федерации. Споры подлежат разрешению в Арбитражном суде г. Москвы.
`;

const INITIAL_ISSUES = extractIssuesFromText(INITIAL_TEXT);

const DocumentWorkspace = ({
  isDark,
  onBack,
  onSave,
  initialText = INITIAL_TEXT,
  initialIssues = INITIAL_ISSUES,
  fileName = 'Документ',
}) => {
  const t = isDark ? theme.dark : theme.light;
  const [text, setText] = useState(initialText);
  const [issues, setIssues] = useState(initialIssues);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [isAllClean, setIsAllClean] = useState(false);

  useEffect(() => {
    setText(initialText);
    setIssues(initialIssues);
    setSelectedIssue(null);
    setIsAllClean(initialIssues.length === 0);
  }, [initialIssues, initialText]);

  const handleApplyFix = (issue) => {
    const newText = text.replace(issue.textMatch, issue.suggestion);
    const remaining = issues.filter((i) => i.id !== issue.id);
    setText(newText);
    setIssues(remaining);
    setSelectedIssue(null);
    if (remaining.length === 0) setTimeout(() => setIsAllClean(true), 400);
  };

  const handleSave = () => {
    onSave?.({ issuesCount: issues.length, text, issues });
  };

  const interactiveText = useMemo(() => {
    let parts = [{ text, type: 'normal', id: null }];
    issues.forEach((issue) => {
      const next = [];
      parts.forEach((part) => {
        if (part.type !== 'normal') {
          next.push(part);
          return;
        }
        const index = part.text.indexOf(issue.textMatch);
        if (index === -1) {
          next.push(part);
        } else {
          if (index > 0) next.push({ text: part.text.slice(0, index), type: 'normal' });
          next.push({ text: part.text.slice(index, index + issue.textMatch.length), type: issue.type, id: issue.id });
          if (index + issue.textMatch.length < part.text.length) {
            next.push({ text: part.text.slice(index + issue.textMatch.length), type: 'normal' });
          }
        }
      });
      parts = next;
    });
    return parts;
  }, [issues, text]);

  if (isAllClean) {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center ${t.bg} animate-in`}>
        <div className="text-center p-8 max-w-sm">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 bg-emerald-500/10 text-emerald-500 animate-[scaleIn_0.4s_ease]`}>
            <ShieldCheck size={48} strokeWidth={1.5} />
          </div>
          <h2 className={`font-serif-display text-3xl mb-4 ${t.textPrimary}`}>Договор чист</h2>
          <p className={`text-sm ${t.textSecondary} mb-8`}>
            Все критические риски устранены. Документ готов к подписанию.
          </p>
          <Button variant="primary" isDark={isDark} onClick={handleSave} className="w-full">
            Сохранить в архив
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${t.bg} animate-in`}>
      <div className={`h-16 border-b ${t.border} flex items-center justify-between px-4 backdrop-blur-md`}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className={`p-2 rounded-full hover:bg-black/5 ${t.textSecondary}`} aria-label="Назад">
            <X size={20} />
          </button>
          <div>
            <h3 className={`font-serif-display text-lg ${t.textPrimary}`}>{fileName}</h3>
            <p className={`text-xs ${t.textSecondary} flex items-center gap-2`}>
              {issues.length === 0 ? (
                <span className="text-emerald-500 font-medium flex items-center gap-1">
                  <CheckCircle2 size={12} /> Чисто
                </span>
              ) : (
                <span className="text-amber-500 font-medium flex items-center gap-1">
                  <Activity size={12} /> Активных рисков: {issues.length}
                </span>
              )}
            </p>
          </div>
        </div>
        <Button variant="ghost" className={`!text-xs ${t.textSecondary}`} onClick={handleSave}>
          Сохранить как есть
        </Button>
      </div>

      <div className="flex-1 overflow-hidden relative flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 md:p-12 leading-loose whitespace-pre-wrap font-serif-display text-lg md:text-xl selection:bg-amber-500/30">
          <div className={`max-w-3xl mx-auto ${t.textPrimary} transition-all duration-500`}>
            {interactiveText.map((part, index) => {
              if (part.type === 'normal') return <span key={index}>{part.text}</span>;
              const style = part.type === 'critical' ? t.highlightCritical : t.highlightWarning;
              const target = issues.find((i) => i.id === part.id);
              return (
                <span
                  key={index}
                  className={`rounded px-1 transition-all duration-300 border-b-2 ${style}`}
                  onClick={() => setSelectedIssue(target)}
                >
                  {part.text}
                </span>
              );
            })}
          </div>
          <div className="h-40" />
        </div>

        {selectedIssue && (
          <div className={`absolute bottom-0 left-0 right-0 ${t.paper} border-t ${t.border} shadow-2xl p-6 rounded-t-3xl animate-[slideUp_0.4s_cubic-bezier(0.16,1,0.3,1)] z-30`}>
            <div className="max-w-3xl mx-auto">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  {selectedIssue.type === 'critical' ? (
                    <span className="bg-red-500/10 text-red-500 text-[10px] font-bold px-2 py-1 rounded border border-red-500/20 uppercase tracking-wider">
                      Критично
                    </span>
                  ) : (
                    <span className="bg-amber-500/10 text-amber-500 text-[10px] font-bold px-2 py-1 rounded border border-amber-500/20 uppercase tracking-wider">
                      Внимание
                    </span>
                  )}
                  <span className={`text-xs font-mono uppercase tracking-widest ${t.textSecondary} hidden sm:inline-block`}>
                    {selectedIssue.category}
                  </span>
                </div>
                <button onClick={() => setSelectedIssue(null)} className={t.textSecondary} aria-label="Закрыть">
                  <X size={20} />
                </button>
              </div>

              <h4 className={`text-xl font-serif-display mb-2 ${t.textPrimary}`}>{selectedIssue.title}</h4>
              <p className={`text-sm mb-6 ${t.textSecondary} leading-relaxed`}>{selectedIssue.description}</p>

              <div className={`p-5 rounded-xl border mb-6 relative overflow-hidden ${isDark ? 'bg-black/40 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-500 to-emerald-500 opacity-70" />
                <div className="flex flex-col gap-4">
                  <div className="opacity-60 pl-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      <p className="text-[10px] uppercase font-bold text-red-400">Было</p>
                    </div>
                    <p className={`text-sm line-through decoration-red-400/40 ${t.textSecondary}`}>
                      "{selectedIssue.textMatch}"
                    </p>
                  </div>
                  <div className="pl-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <p className="text-[10px] uppercase font-bold text-emerald-500">Станет</p>
                    </div>
                    <p className={`text-sm font-medium ${t.textPrimary}`}>
                      "{selectedIssue.suggestion}"
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="primary" isDark={isDark} onClick={() => handleApplyFix(selectedIssue)} className="flex-1 shadow-lg shadow-amber-500/20">
                  Заменить текст
                </Button>
                <Button variant="secondary" isDark={isDark} onClick={() => setSelectedIssue(null)} className="flex-1">
                  Править вручную
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </div>
  );
};

const StatCardMobile = ({ label, value, icon: Icon, isDark, trend }) => {
  const t = isDark ? theme.dark : theme.light;
  return (
    <div className={`p-5 rounded-2xl border ${t.border} ${t.paper} flex flex-col justify-between h-36 relative overflow-hidden group hover:border-[#C5A059]/50 transition-all duration-300 shadow-sm`}>
      <div className="flex justify-between items-start z-10">
        <Icon size={22} className={t.accent} strokeWidth={1.5} />
        {trend && <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">{trend}</span>}
      </div>
      <div className="z-10">
        <h3 className={`text-3xl font-serif-display ${t.textPrimary} mb-1`}>{value}</h3>
        <p className={`text-xs uppercase tracking-wider font-medium ${t.textSecondary}`}>{label}</p>
      </div>
      <Icon size={100} className={`absolute -bottom-6 -right-6 opacity-[0.03] ${t.textPrimary} rotate-[-15deg] group-hover:rotate-0 transition-transform duration-500`} />
    </div>
  );
};

const RecentMatter = ({ matter, isDark }) => {
  const t = isDark ? theme.dark : theme.light;
  const statusConfig = {
    Cleared: { text: 'Согласовано', style: 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20' },
    Attention: { text: 'Риски', style: 'text-amber-500 bg-amber-500/10 border border-amber-500/20' },
    Critical: { text: 'Критично', style: 'text-red-500 bg-red-500/10 border border-red-500/20' },
  };
  const config = statusConfig[matter.status] || statusConfig.Cleared;

  return (
    <div className={`p-4 rounded-xl border ${t.border} ${t.paper} flex items-center justify-between group hover:border-[#C5A059]/30 transition-all cursor-pointer`}>
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isDark ? 'bg-white/5 group-hover:bg-[#C5A059]/10' : 'bg-gray-100'} ${t.textPrimary}`}>
          <FileText size={18} strokeWidth={1.5} className="group-hover:text-[#C5A059] transition-colors" />
        </div>
        <div>
          <h4 className={`font-serif-display text-sm mb-0.5 ${t.textPrimary}`}>{matter.title}</h4>
          <p className={`text-xs ${t.textSecondary}`}>{matter.date}</p>
        </div>
      </div>
      <div className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${config.style}`}>{config.text}</div>
    </div>
  );
};

const MobileExperience = ({ onSwitch, onOpenApi, apiKey, onLog, onOpenLogs, settings, onOpenAdmin }) => {
  const [isDark, setIsDark] = useState(true);
  const [view, setView] = useState('dashboard');
  const [matters, setMatters] = useState([
    { id: 1, title: 'Договор поставки #542', date: 'Сегодня', status: 'Attention' },
    { id: 2, title: 'NDA с партнёром', date: 'Вчера', status: 'Cleared' },
  ]);
  const [documentData, setDocumentData] = useState({
    text: INITIAL_TEXT,
    issues: INITIAL_ISSUES,
    name: 'NDA_Draft_ru.txt',
    pipeline: buildPipelineResult(INITIAL_TEXT, INITIAL_ISSUES),
  });
  const [pendingDoc, setPendingDoc] = useState(null);
  const [pipelineError, setPipelineError] = useState('');

  const t = isDark ? theme.dark : theme.light;

  const handleSaveResult = ({ issuesCount, text, issues }) => {
    setDocumentData((prev) => ({ ...prev, text, issues }));
    const next = [
      {
        id: Date.now(),
        title: documentData.name,
        date: new Date().toLocaleDateString('ru-RU'),
        status: issuesCount === 0 ? 'Cleared' : 'Attention',
      },
      ...matters,
    ];
    setMatters(next);
    setView('dashboard');
  };

  return (
    <div className={`min-h-screen transition-colors duration-700 font-sans-ui ${t.bg} selection:bg-[#C5A059]/30`}> 
      <Fonts />
      {view === 'upload' && (
        <UploadScreen
          isDark={isDark}
          onCancel={() => setView('dashboard')}
          onUploadComplete={(data) => {
            setPipelineError('');
            setPendingDoc(data);
            setView('analyzing');
          }}
        />
      )}

      {view === 'analyzing' && pendingDoc && (
        <MultiStageLoader
          isDark={isDark}
          apiKey={apiKey}
          doc={pendingDoc}
          settings={settings}
          onOpenApi={onOpenApi}
          onLog={onLog}
          onError={(message) => {
            setPipelineError(message || 'Не удалось завершить анализ.');
            setView('dashboard');
            setPendingDoc(null);
          }}
          onCancel={() => {
            setPipelineError('Анализ остановлен пользователем.');
            setView('dashboard');
            setPendingDoc(null);
          }}
          onComplete={(result) => {
            setDocumentData({
              text: pendingDoc.text,
              issues: result.issues,
              name: pendingDoc.name,
              pipeline: result.pipeline,
            });
            setView('workspace');
            setPendingDoc(null);
            setPipelineError('');
          }}
        />
      )}
      {view === 'workspace' && (
        <DocumentWorkspace
          isDark={isDark}
          onBack={() => setView('dashboard')}
          onSave={handleSaveResult}
          initialText={documentData.text}
          initialIssues={documentData.issues}
          fileName={documentData.name}
        />
      )}

      {view === 'dashboard' && (
        <div className="pb-24 max-w-lg mx-auto min-h-screen flex flex-col relative">
          <header className="pt-8 pb-4 px-6 flex justify-between items-center sticky top-0 z-20 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${t.border} bg-white/5`}>
                <Scale size={18} className={t.textPrimary} />
              </div>
              <span className={`font-serif-display font-bold text-lg ${t.textPrimary}`}>Jurist AI</span>
            </div>
              <div className="flex gap-2">
                <button
                  onClick={onOpenApi}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold ${isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-black'}`}
                >
                  API ключ
                </button>
                <button
                  onClick={onOpenAdmin}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold ${isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-black'}`}
                >
                  Админка
                </button>
                <button
                  onClick={() => {
                    onLog?.('info', 'Открытие окна логов', { source: 'mobile-header' });
                    onOpenLogs?.();
                  }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold ${isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-black'}`}
              >
                Логи
              </button>
              <button
                onClick={onSwitch}
                className={`px-3 py-2 rounded-lg text-xs font-semibold ${isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-black'}`}
              >
                Десктоп
              </button>
              <button
                onClick={() => setIsDark(!isDark)}
                className={`p-2.5 rounded-full ${t.textSecondary} hover:bg-white/5 transition-colors`}
                aria-label="Смена темы"
              >
                {isDark ? <Sparkles size={18} /> : <span className="w-4 h-4 rounded-full bg-black block" />}
              </button>
            </div>
          </header>

          <div className="px-6 mb-8 animate-in">
            <p className={`text-[10px] font-bold tracking-[0.2em] uppercase mb-3 ${t.accent}`}>
              {new Date().toLocaleDateString('ru-RU', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 className={`font-serif-display text-4xl mb-2 ${t.textPrimary} leading-tight`}>
              Добрый день,
              <br />
              Коллега.
            </h1>
          </div>

          {pipelineError && (
            <div className="px-6 mb-6 animate-in" style={{ animationDelay: '0.05s' }}>
              <div className={`p-4 rounded-xl border ${t.border} ${t.paper} text-sm ${t.textPrimary}`}>
                {pipelineError}
              </div>
            </div>
          )}

          <div className="px-6 grid grid-cols-2 gap-4 mb-8 animate-in" style={{ animationDelay: '0.1s' }}>
            <StatCardMobile label="В работе" value={matters.length} icon={Activity} isDark={isDark} trend="+1 нов." />
            <StatCardMobile label="Согласовано" value="128" icon={ShieldAlert} isDark={isDark} />
          </div>

          <div className="px-6 mb-10 animate-in" style={{ animationDelay: '0.2s' }}>
            <button
              onClick={() => setView('upload')}
              className={`w-full group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 hover:scale-[1.01] shadow-2xl ${
                isDark ? 'bg-gradient-to-br from-[#C5A059] to-[#9A7D46]' : 'bg-[#1A1A1A] border border-gray-100'
              }`}
            >
              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <div className={`p-3 rounded-full inline-flex mb-4 ${isDark ? 'bg-black/15 text-black' : 'bg-white/10 text-white'}`}>
                    <Search size={24} strokeWidth={2} />
                  </div>
                  <h2 className={`text-2xl font-serif-display mb-1 ${isDark ? 'text-black' : 'text-white'}`}>Анализ документа</h2>
                  <p className={`text-xs opacity-70 ${isDark ? 'text-black font-medium' : 'text-white'}`}>Загрузить PDF / DOCX</p>
                </div>
                <div className={`p-2 rounded-full ${isDark ? 'bg-black/10' : 'bg-white/10'}`}>
                  <ChevronRight className={isDark ? 'text-black' : 'text-white'} />
                </div>
              </div>
              <div className="absolute -right-6 -bottom-6 opacity-10 transform rotate-12">
                <BookOpen size={160} />
              </div>
            </button>
          </div>

          <div className="px-6 flex-1 animate-in" style={{ animationDelay: '0.3s' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`font-serif-display text-xl ${t.textPrimary}`}>Последние дела</h3>
              <button className={`text-[10px] font-bold tracking-widest uppercase ${t.textSecondary} hover:${t.textPrimary} transition-colors`}>
                Все
              </button>
            </div>

            <div className="space-y-3 pb-10">
              {matters.length > 0 ? (
                matters.map((matter) => <RecentMatter key={matter.id} matter={matter} isDark={isDark} />)
              ) : (
                <div className={`text-center py-10 ${t.textSecondary} italic text-sm border border-dashed ${t.border} rounded-xl`}>
                  Архив пуст.
                </div>
              )}
            </div>
          </div>

          <div className="fixed bottom-6 left-6 right-6 z-40">
            <div
              className={`h-16 rounded-full mx-auto max-w-[320px] ${
                isDark ? 'bg-[#1A1A1A]/90 border-white/10' : 'bg-white/90 border-black/5'
              } backdrop-blur-xl border shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] flex items-center justify-between px-8`}
            >
              <button className={`${t.accent} transform scale-110`} aria-label="Главная">
                <Scale size={24} />
              </button>
              <button className={`${t.textSecondary} hover:${t.textPrimary} transition-colors`} aria-label="Поиск">
                <Search size={22} />
              </button>
              <button className={`${t.textSecondary} hover:${t.textPrimary} transition-colors`} aria-label="Закладки">
                <Bookmark size={22} />
              </button>
              <button className={`${t.textSecondary} hover:${t.textPrimary} transition-colors`} aria-label="Профиль">
                <Fingerprint size={22} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- ДЕСКТОПНЫЕ КОМПОНЕНТЫ ---
const desktopStyles = {
  bg: (dark) => (dark ? 'bg-[#080808]' : 'bg-[#F5F2EB]'),
  sidebar: (dark) => (dark ? 'bg-[#0B0C10] border-r border-white/5' : 'bg-[#FDFBF7] border-r border-[#E5E0D6]'),
  textMain: (dark) => (dark ? 'text-[#EAEAEA]' : 'text-[#1A1A1A]'),
  textSec: (dark) => (dark ? 'text-[#888888]' : 'text-[#666660]'),
  card: (dark) => (dark ? 'bg-[#121212] border border-white/5 hover:border-white/10' : 'bg-white border border-[#E5E0D6] hover:border-[#D4AF37]/30'),
};

const SidebarItem = ({ icon: Icon, label, active, collapsed, isDark, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 p-3 mb-2 rounded-xl transition-all duration-300 group ${
      active
        ? isDark
          ? 'bg-white/10 text-white'
          : 'bg-[#1A1A1A] text-white'
        : isDark
        ? 'text-gray-500 hover:text-white hover:bg-white/5'
        : 'text-gray-500 hover:text-black hover:bg-black/5'
    }`}
  >
    <Icon size={20} strokeWidth={1.5} className={active ? 'text-[#C5A059]' : ''} />
    {!collapsed && <span className={`text-sm font-medium tracking-wide ${collapsed ? 'opacity-0' : 'opacity-100'}`}>{label}</span>}
    {active && !collapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#C5A059] shadow-[0_0_8px_#C5A059]" />}
  </button>
);

const StatCardDesktop = ({ title, value, sub, icon: Icon, isDark }) => (
  <div className={`p-6 rounded-[20px] ${desktopStyles.card(isDark)} transition-all duration-300 hover:transform hover:-translate-y-1`}>
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-full ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
        <Icon size={20} className="text-[#C5A059]" />
      </div>
      <span className={`text-xs font-bold tracking-wider uppercase ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{sub}</span>
    </div>
    <h3 className={`text-3xl font-serif mb-1 ${desktopStyles.textMain(isDark)}`}>{value}</h3>
    <p className={`text-xs uppercase tracking-widest ${desktopStyles.textSec(isDark)}`}>{title}</p>
  </div>
);

const TableRow = ({ client, caseName, status, date, isDark }) => (
  <tr className={`group border-b transition-colors ${isDark ? 'border-white/5 hover:bg-white/[0.02]' : 'border-black/5 hover:bg-black/[0.02]'}`}>
    <td className="py-4 pl-4">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-serif ${isDark ? 'bg-white/10' : 'bg-black/10'}`}>
          {client.charAt(0)}
        </div>
        <span className={`font-medium ${desktopStyles.textMain(isDark)}`}>{client}</span>
      </div>
    </td>
    <td className={`py-4 ${desktopStyles.textSec(isDark)}`}>{caseName}</td>
    <td className="py-4">
      <span
        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
          status === 'Active' ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10' : ''
        } ${status === 'Review' ? 'border-amber-500/30 text-amber-500 bg-amber-500/10' : ''} ${
          status === 'Draft' ? 'border-gray-500/30 text-gray-500 bg-gray-500/10' : ''
        }`}
      >
        {status}
      </span>
    </td>
    <td className={`py-4 text-sm ${desktopStyles.textSec(isDark)}`}>{date}</td>
    <td className="py-4 pr-4 text-right">
      <button className={`opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`} aria-label="Действия">
        <MoreHorizontal size={16} />
      </button>
    </td>
  </tr>
);

const DashboardView = ({ isDark, onStartUpload }) => (
  <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in duration-700">
    <div className="flex justify-between items-end mb-10">
      <div>
        <p className={`text-xs font-bold tracking-[0.2em] uppercase mb-2 text-[#C5A059]`}>
          {new Date().toLocaleDateString('ru-RU', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <h1 className={`text-4xl font-serif ${desktopStyles.textMain(isDark)}`}>Обзор</h1>
      </div>
      <div className="flex gap-4">
        <button
          className={`px-6 py-3 rounded-full text-sm font-bold tracking-widest uppercase transition-all ${
            isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-[#1A1A1A] text-white hover:bg-gray-800'
          }`}
          onClick={onStartUpload}
        >
          + Новое дело
        </button>
      </div>
    </div>

    <div className="grid grid-cols-12 gap-6 mb-10">
      <div className="col-span-12 lg:col-span-8 relative overflow-hidden rounded-[24px] group cursor-pointer shadow-2xl" onClick={onStartUpload}>
        <div className="absolute inset-0 bg-[#0F1115]">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#1a237e] opacity-20 blur-[120px] rounded-full" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#C5A059] opacity-10 blur-[100px] rounded-full" />
        </div>
        <div className="relative z-10 p-10 h-full flex flex-col justify-between min-h-[300px]">
          <div className="flex justify-between items-start">
            <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center bg-white/5 backdrop-blur-md">
              <Scale className="text-white" size={24} />
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/5">
              <span className="text-xs font-bold text-white tracking-widest uppercase">AI Engine v2.4</span>
            </div>
          </div>
          <div className="max-w-xl">
            <h2 className="text-3xl font-serif text-white mb-4">Интеллектуальный анализ</h2>
            <p className="text-white/60 mb-8 font-light text-lg">
              Перетащите PDF или DOCX, чтобы обнаружить неограниченную ответственность, срок действия и другие риски.
            </p>
            <div className="flex items-center gap-4 text-sm font-bold text-[#C5A059] uppercase tracking-widest group-hover:translate-x-2 transition-transform">
              Начать анализ <ChevronRight size={16} />
            </div>
          </div>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
        <StatCardDesktop title="Активные дела" value="24" sub="+12%" icon={FolderOpen} isDark={isDark} />
        <StatCardDesktop title="Отработано часов" value="142.5" sub="+12%" icon={Clock} isDark={isDark} />
      </div>
    </div>

    <div className={`rounded-[24px] p-8 ${desktopStyles.card(isDark)}`}>
      <div className="flex justify-between items-center mb-6">
        <h3 className={`text-xl font-serif ${desktopStyles.textMain(isDark)}`}>Последние дела</h3>
        <div className="flex gap-2">
          <button className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`} aria-label="Поиск">
            <Search size={18} className={desktopStyles.textSec(isDark)} />
          </button>
          <button className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`} aria-label="Дополнительно">
            <MoreHorizontal size={18} className={desktopStyles.textSec(isDark)} />
          </button>
        </div>
      </div>

      <table className="w-full text-left border-collapse">
        <thead>
          <tr className={`text-xs uppercase tracking-widest border-b ${isDark ? 'text-gray-500 border-white/5' : 'text-gray-400 border-black/5'}`}>
            <th className="pb-4 pl-4 font-normal">Клиент</th>
            <th className="pb-4 font-normal">Дело</th>
            <th className="pb-4 font-normal">Статус</th>
            <th className="pb-4 font-normal">Обновлено</th>
            <th className="pb-4 font-normal text-right">Действие</th>
          </tr>
        </thead>
        <tbody>
          <TableRow client="TechCorp" caseName="Слияние компаний" status="Review" date="2 часа назад" isDark={isDark} />
          <TableRow client="Sterling Art" caseName="Передача прав ИС" status="Active" date="Вчера" isDark={isDark} />
          <TableRow client="Nexus Logistics" caseName="Трудовой спор" status="Draft" date="10 окт" isDark={isDark} />
          <TableRow client="Private Estate" caseName="Формирование траста" status="Active" date="08 окт" isDark={isDark} />
        </tbody>
      </table>
    </div>
  </div>
);


const DocumentAnalysisView = ({ isDark, documentData, onEdit, apiKey, pipelineError = '', onOpenLogs, settings, onOpenAdmin }) => {
  const { text, issues, name, pipeline } = documentData;
  const preview = text.split(/\n+/).filter(Boolean).slice(0, 6);

  const renderPreview = (paragraph) => {
    let parts = [{ text: paragraph, type: 'normal', id: null }];
    issues.forEach((issue) => {
      const next = [];
      parts.forEach((part) => {
        if (part.type !== 'normal') {
          next.push(part);
          return;
        }
        const idx = part.text.toLowerCase().indexOf(issue.textMatch.toLowerCase());
        if (idx === -1) {
          next.push(part);
        } else {
          if (idx > 0) next.push({ text: part.text.slice(0, idx), type: 'normal' });
          next.push({ text: part.text.slice(idx, idx + issue.textMatch.length), type: issue.type, id: issue.id });
          if (idx + issue.textMatch.length < part.text.length) {
            next.push({ text: part.text.slice(idx + issue.textMatch.length), type: 'normal' });
          }
        }
      });
      parts = next;
    });

    return parts.map((part, idx) => {
      if (part.type === 'normal') return <span key={idx}>{part.text}</span>;
      const style = part.type === 'critical' ? 'bg-red-500/20 text-red-300 px-1 rounded' : 'bg-amber-500/20 text-amber-200 px-1 rounded';
      return <span key={idx} className={style}>{part.text}</span>;
    });
  };

  return (
    <div className="h-screen flex flex-col animate-in slide-in-from-bottom-4 relative">
      <div className={`h-16 border-b flex items-center justify-between px-6 ${isDark ? 'border-white/5 bg-[#0B0C10]' : 'border-black/5 bg-white'}`}>
        <div className="flex items-center gap-4">
          <h2 className={`font-serif text-lg ${desktopStyles.textMain(isDark)}`}>{name}</h2>
          <span className="px-2 py-0.5 rounded text-[10px] bg-gray-500/20 text-gray-500 font-bold uppercase">Только чтение</span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-[11px] uppercase tracking-wider font-bold px-3 py-1 rounded-full border ${
              apiKey ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-amber-500/30 text-amber-400 bg-amber-500/10'
            }`}
          >
            {apiKey ? 'API подключен' : 'API не задан'}
          </span>
          <span className={`text-[11px] uppercase tracking-wider font-bold px-3 py-1 rounded-full border ${
              isDark ? 'border-white/10 text-white' : 'border-black/10 text-black'
            }`}>
            {settings?.model || 'gpt-5-mini'} · T={settings?.temperature ?? DEFAULT_LLM_SETTINGS.temperature}
          </span>
          <button
            onClick={onOpenLogs}
            className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider border ${
              isDark ? 'border-white/10 text-white hover:bg-white/10' : 'border-black/10 text-black hover:bg-black/5'
            }`}
          >
            Логи
          </button>
          <button
            onClick={onOpenAdmin}
            className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider border ${
              isDark ? 'border-white/10 text-white hover:bg-white/10' : 'border-black/10 text-black hover:bg-black/5'
            }`}
          >
            Настройки LLM
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
              isDark ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' : 'bg-amber-50 text-amber-600'
            }`}
          >
            <AlertTriangle size={14} /> {issues.length} рисков
          </button>
          <div className={`h-6 w-[1px] ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
          <button className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider ${isDark ? 'bg-white text-black' : 'bg-black text-white'}`}>
            Экспорт отчёта
          </button>
          <button
            onClick={onEdit}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border ${
              isDark ? 'border-white/10 text-white hover:bg-white/10' : 'border-black/10 text-black hover:bg-black/5'
            }`}
          >
            Редактировать
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {pipelineError && (
          <div className={`absolute top-16 left-0 right-0 z-10 px-6 py-3 text-sm ${
            isDark ? 'bg-red-500/10 border-b border-red-500/30 text-red-100' : 'bg-red-50 border-b border-red-200 text-red-800'
          }`}>
            {pipelineError}
          </div>
        )}

        <div className={`flex-1 overflow-y-auto p-12 flex justify-center ${isDark ? 'bg-[#121212]' : 'bg-[#F2F0E9]'}`}>
          <div className={`w-[800px] min-h-[1000px] shadow-2xl p-16 relative ${isDark ? 'bg-[#1E1E1E] text-gray-300' : 'bg-white text-gray-800'}`}>
            <div className="mb-12 flex justify-between">
              <div className="w-32 h-8 bg-current opacity-10 rounded" />
              <div className="w-24 h-4 bg-current opacity-10 rounded" />
            </div>
            <div className="space-y-6 text-justify opacity-80 font-serif leading-loose text-sm">
              {preview.map((paragraph, idx) => (
                <p key={idx} className={issues.length ? 'relative' : ''}>
                  {renderPreview(paragraph)}
                  {idx === 1 && issues.length > 0 && (
                    <span className="absolute -right-32 top-0 text-amber-500 text-xs font-sans font-bold flex items-center gap-1">
                      <ChevronLeft size={12} /> Обнаружены риски
                    </span>
                  )}
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className={`w-[400px] border-l flex flex-col ${isDark ? 'bg-[#0B0C10] border-white/5' : 'bg-white border-black/5'}`}>
          <div className="p-6 border-b border-white/5">
            <h3 className={`font-serif text-xl mb-1 ${desktopStyles.textMain(isDark)}`}>AI-анализ</h3>
            <p className={`text-xs ${desktopStyles.textSec(isDark)}`}>Модель Juris-LLM v4</p>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {pipeline && (
              <div className={`p-4 rounded-xl border ${isDark ? 'border-white/5 bg-white/5' : 'border-black/5 bg-black/5'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Layers size={16} className={desktopStyles.textMain(isDark)} />
                    <span className={`text-sm font-semibold ${desktopStyles.textMain(isDark)}`}>{pipeline.document_meta.type}</span>
                  </div>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      pipeline.document_meta.risk_score > 80 ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    Риск {pipeline.document_meta.risk_score}/100
                  </span>
                </div>
                <div className={`text-xs flex gap-3 ${desktopStyles.textSec(isDark)}`}>
                  <span>Юрисдикция: {pipeline.document_meta.jurisdiction}</span>
                  <span>Формат JSON готов к выгрузке</span>
                </div>
              </div>
            )}

            {pipeline?.analysis.map((item) => (
              <div
                key={item.original_id}
                className={`p-5 rounded-xl border ${isDark ? 'border-white/5 bg-[#151515]' : 'border-black/5 bg-gray-50'}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <FileCheck size={16} className={desktopStyles.textMain(isDark)} />
                    <span className={`text-sm font-bold ${desktopStyles.textMain(isDark)}`}>{item.issue_title}</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${
                      item.risk_level === 'Critical' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    {item.risk_level}
                  </span>
                </div>
                <p className={`text-xs mb-2 ${desktopStyles.textSec(isDark)}`}>{item.legal_basis}</p>
                <div className={`p-3 rounded-lg border ${isDark ? 'border-white/10' : 'border-black/10'} text-sm ${desktopStyles.textMain(isDark)}`}>
                  <div className="mb-2 text-xs uppercase tracking-widest text-red-400">Было</div>
                  <p className="line-through opacity-70">{item.diff_highlight.remove}</p>
                  <div className="mt-3 text-xs uppercase tracking-widest text-emerald-400">Станет</div>
                  <p className="font-medium">{item.ai_suggestion}</p>
                </div>
              </div>
            ))}
          </div>

          <div className={`p-4 border-t ${isDark ? 'border-white/5' : 'border-black/5'}`}>
            <div className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
              <Sparkles size={18} className="text-amber-500" />
              <input type="text" placeholder="Спросите об этом договоре..." className="bg-transparent border-none outline-none text-sm w-full font-light" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DesktopExperience = ({ onSwitch, apiKey, onOpenApi, onLog, onOpenLogs, settings, onOpenAdmin }) => {
  const [isDark, setIsDark] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);
  const [pendingDoc, setPendingDoc] = useState(null);
  const [pipelineError, setPipelineError] = useState('');
  const [documentData, setDocumentData] = useState({
    text: INITIAL_TEXT,
    issues: INITIAL_ISSUES,
    name: 'NDA_Draft_ru.txt',
    pipeline: buildPipelineResult(INITIAL_TEXT, INITIAL_ISSUES),
  });

  const handleUploadComplete = (data) => {
    setShowUpload(false);
    setActiveTab('analysis');
    setPendingDoc(data);
    setPipelineError('');
    setShowPipeline(true);
  };

  const handleSaveEditor = ({ issuesCount, text, issues }) => {
    setDocumentData((prev) => ({ ...prev, text, issues, pipeline: buildPipelineResult(text, issues) }));
    setShowEditor(false);
  };

  return (
    <div className={`flex h-screen w-full font-sans transition-colors duration-500 ${desktopStyles.bg(isDark)}`}>
      {showUpload && (
        <UploadScreen
          isDark={isDark}
          onCancel={() => setShowUpload(false)}
          onUploadComplete={handleUploadComplete}
        />
      )}

      {showPipeline && pendingDoc && (
        <MultiStageLoader
          isDark={isDark}
          apiKey={apiKey}
          doc={pendingDoc}
          settings={settings}
          onOpenApi={onOpenApi}
          onLog={onLog}
          onError={(message) => {
            setPipelineError(message || 'Не удалось завершить анализ.');
            setShowPipeline(false);
            setPendingDoc(null);
          }}
          onCancel={() => {
            setPipelineError('Анализ прерван. Проверьте ключ или формат файла.');
            setShowPipeline(false);
            setPendingDoc(null);
          }}
          onComplete={(result) => {
            setDocumentData({
              text: pendingDoc.text,
              issues: result.issues,
              name: pendingDoc.name,
              pipeline: result.pipeline,
            });
            setShowPipeline(false);
            setPendingDoc(null);
            setPipelineError('');
          }}
        />
      )}

      {showEditor && (
        <DocumentWorkspace
          isDark={isDark}
          onBack={() => setShowEditor(false)}
          onSave={handleSaveEditor}
          initialText={documentData.text}
          initialIssues={documentData.issues}
          fileName={documentData.name}
        />
      )}
      <aside
        className={`flex flex-col h-full transition-all duration-300 z-50 ${collapsed ? 'w-20' : 'w-[280px]'} ${desktopStyles.sidebar(isDark)}`}
      >
        <div className="h-24 flex items-center px-6 justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 min-w-[40px] rounded-full flex items-center justify-center border transition-colors ${
              isDark ? 'border-white/20 bg-white/5' : 'border-black/10 bg-white'
            }`}>
              <span className={`font-serif font-bold text-xl ${desktopStyles.textMain(isDark)}`}>J.</span>
            </div>
            {!collapsed && <span className={`font-serif font-bold text-lg tracking-tight ${desktopStyles.textMain(isDark)} animate-in`}>Juris</span>}
          </div>
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-black/5 text-black'}`}
            aria-label="Свернуть меню"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-6">
          <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest opacity-40">{!collapsed ? 'Главное меню' : '•'}</div>
          <SidebarItem icon={LayoutDashboard} label="Дашборд" active={activeTab === 'dashboard'} collapsed={collapsed} isDark={isDark} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={FileText} label="Анализ договора" active={activeTab === 'analysis'} collapsed={collapsed} isDark={isDark} onClick={() => setActiveTab('analysis')} />
          <SidebarItem icon={FolderOpen} label="Архив дел" active={false} collapsed={collapsed} isDark={isDark} />
          <SidebarItem icon={PieChart} label="Аналитика" active={false} collapsed={collapsed} isDark={isDark} />

          <div className="mt-8 mb-2 px-2 text-[10px] font-bold uppercase tracking-widest opacity-40">{!collapsed ? 'Настройки' : '•'}</div>
          <SidebarItem icon={Settings} label="Конфигурация" active={false} collapsed={collapsed} isDark={isDark} />
        </nav>

        <div className="p-4 border-t border-white/5 flex gap-2">
          <button
            onClick={() => setIsDark((prev) => !prev)}
            className={`flex-1 flex items-center justify-center p-3 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
            aria-label="Смена темы"
          >
            <Zap size={20} className={isDark ? 'text-white' : 'text-black'} />
          </button>
          <button
            onClick={onOpenAdmin}
            className={`p-3 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-black/5 text-black'}`}
            aria-label="LLM настройки"
          >
            <Settings size={18} />
          </button>
          <button
            onClick={onSwitch}
            className={`p-3 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-black/5 text-black'}`}
            aria-label="Мобильная версия"
          >
            <LayoutDashboard size={18} />
          </button>
          <button
            onClick={onOpenApi}
            className={`p-3 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-black/5 text-black'}`}
            aria-label="API ключ"
          >
            <KeyRound size={18} />
          </button>
          <button
            onClick={() => {
              onLog?.('info', 'Открытие логов', { source: 'desktop-sidebar' });
              onOpenLogs?.();
            }}
            className={`p-3 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-black/5 text-black'}`}
            aria-label="Логи пайплайна"
          >
            <Activity size={18} />
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto relative">
        <div className="fixed inset-0 pointer-events-none">
          <div className={`absolute top-0 right-0 w-[50%] h-[50%] rounded-full blur-[150px] opacity-[0.03] ${isDark ? 'bg-white' : 'bg-black'}`} />
        </div>
        {activeTab === 'dashboard' && <DashboardView isDark={isDark} onStartUpload={() => setShowUpload(true)} />}
        {activeTab === 'analysis' && (
          <DocumentAnalysisView
            isDark={isDark}
            documentData={documentData}
            onEdit={() => setShowEditor(true)}
            apiKey={apiKey}
            pipelineError={pipelineError}
            onOpenLogs={onOpenLogs}
            settings={settings}
            onOpenAdmin={onOpenAdmin}
          />
        )}
      </main>
    </div>
  );
};

// --- ОСНОВНОЙ ПЕРЕКЛЮЧАТЕЛЬ ---
export default function App() {
  const [mode, setMode] = useState('desktop');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('jurist_api_key') || '');
  const [llmSettings, setLlmSettings] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('jurist_llm_settings') || 'null');
      return stored || DEFAULT_LLM_SETTINGS;
    } catch (e) {
      return DEFAULT_LLM_SETTINGS;
    }
  });
  const [showApiModal, setShowApiModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logEntries, setLogEntries] = useState([]);

  const appendLog = (level, message, data) => {
    setLogEntries((prev) => {
      const next = [...prev, { id: `${Date.now()}-${Math.random()}`, level, message, data, timestamp: Date.now() }];
      return next.slice(-200);
    });
  };

  useEffect(() => {
    localStorage.setItem('jurist_api_key', apiKey || '');
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('jurist_llm_settings', JSON.stringify(llmSettings || DEFAULT_LLM_SETTINGS));
  }, [llmSettings]);

  return (
    <div className="min-h-screen">
      <ApiKeyModal
        visible={showApiModal}
        onClose={() => setShowApiModal(false)}
        onSave={setApiKey}
        apiKey={apiKey}
        isDark={mode === 'desktop'}
      />
      <AdminPanel
        visible={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        isDark={mode === 'desktop'}
        apiKey={apiKey}
        onSaveKey={setApiKey}
        settings={llmSettings}
        onSaveSettings={(next) => {
          setLlmSettings(next);
          setShowAdminModal(false);
          appendLog('info', 'LLM настройки обновлены', next);
        }}
      />
      <LogConsole
        visible={showLogs}
        onClose={() => setShowLogs(false)}
        entries={logEntries}
        isDark={mode === 'desktop'}
      />
      {mode === 'desktop' ? (
        <DesktopExperience
          onSwitch={() => setMode('mobile')}
          apiKey={apiKey}
          onOpenApi={() => setShowApiModal(true)}
          onLog={appendLog}
          onOpenLogs={() => setShowLogs(true)}
          onOpenAdmin={() => setShowAdminModal(true)}
          settings={llmSettings}
        />
      ) : (
        <MobileExperience
          onSwitch={() => setMode('desktop')}
          onOpenApi={() => setShowApiModal(true)}
          apiKey={apiKey}
          onLog={appendLog}
          onOpenLogs={() => setShowLogs(true)}
          onOpenAdmin={() => setShowAdminModal(true)}
          settings={llmSettings}
        />
      )}
    </div>
  );
}
