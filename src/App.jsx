import React, { useState, useEffect } from 'react';
import {
  Scale,
  ShieldCheck,
  FileSignature,
  Clock,
  Search,
  Bell,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  Fingerprint,
  Zap,
  MoreVertical,
  ArrowUpRight,
  Bookmark,
  Sparkles,
  AlertOctagon,
  Check,
  Play,
} from 'lucide-react';

// --- ТЕМА ---

const useTheme = () => {
  const [isDark, setIsDark] = useState(true);
  const toggle = () => setIsDark((prev) => !prev);
  return { isDark, toggle };
};

// Палитра "Old Money"
const styles = {
  bg: (dark) => (dark ? 'bg-[#050505]' : 'bg-[#F2F0E9]'),
  textMain: (dark) => (dark ? 'text-[#EAEAEA]' : 'text-[#1A1A1A]'),
  textSec: (dark) => (dark ? 'text-[#888888]' : 'text-[#666660]'),
  glass: (dark) =>
    dark
      ? 'bg-[#1A1A1A]/60 backdrop-blur-xl border border-white/5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]'
      : 'bg-[#FFFFFF]/70 backdrop-blur-xl border border-black/5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]',
  goldText: 'text-[#C5A059]',
  goldBg: 'bg-[#C5A059]',
  card: (dark) =>
    dark
      ? 'bg-[#121212] border border-white/5 shadow-2xl shadow-black/50'
      : 'bg-white border border-[#E5E0D6] shadow-[0_2px_24px_-6px_rgba(0,0,0,0.04)]',
};

// --- КОМПОНЕНТЫ ---

const SerifHeader = ({ children, className = '', dark }) => (
  <h2 className={`font-serif tracking-tight ${className} ${dark ? 'text-white' : 'text-black'}`}>
    {children}
  </h2>
);

const IconButton = ({ icon: Icon, onClick, isDark, label }) => (
  <button
    onClick={onClick}
    className={`p-3 rounded-full transition-all duration-300 group ${
      isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-black/5 text-black'
    }`}
    aria-label={label}
  >
    <Icon strokeWidth={1.5} size={22} className="opacity-70 group-hover:opacity-100 transition-opacity" />
  </button>
);

const PremiumCard = ({ children, className, isDark, onClick }) => (
  <div
    onClick={onClick}
    className={`
      relative overflow-hidden rounded-[20px] p-6 transition-all duration-500 ease-out
      hover:scale-[1.01] cursor-pointer group
      ${styles.card(isDark)} ${className}
    `}
  >
    {children}
  </div>
);

// --- ЭКРАНЫ ---

const Dashboard = ({ isDark, onNavigate }) => (
  <div className="pt-24 px-6 pb-32 animate-in fade-in duration-700">
    <div className="mb-8">
      <p className={`text-xs font-bold tracking-[0.2em] uppercase mb-2 ${styles.goldText}`}>
        Среда, 12 окт
      </p>
      <SerifHeader dark={isDark} className="text-4xl">
        Доброе утро,<br />Советник.
      </SerifHeader>
    </div>

    <div
      onClick={() => onNavigate('scan')}
      className="relative w-full aspect-[16/9] rounded-[24px] overflow-hidden cursor-pointer group shadow-2xl shadow-black/20"
    >
      <div className="absolute inset-0 bg-[#0F1115]">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#1a237e] opacity-20 blur-[100px] rounded-full group-hover:opacity-30 transition-opacity duration-700"></div>
        <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-[#C5A059] opacity-10 blur-[80px] rounded-full"></div>
      </div>

      <div className="absolute inset-0 p-8 flex flex-col justify-between z-10">
        <div className="flex justify-between items-start">
          <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center bg-white/5 backdrop-blur-md">
            <Scale className="text-white" size={20} strokeWidth={1.5} />
          </div>
          <span className="px-3 py-1 rounded-full border border-white/10 bg-black/20 backdrop-blur-md text-[10px] font-bold text-white tracking-widest uppercase">
            AI Анализ 2.0
          </span>
        </div>

        <div>
          <h3 className="text-2xl font-serif text-white mb-2">Новый скан контракта</h3>
          <p className="text-white/50 text-sm font-light max-w-[80%]">Загрузите PDF или DOCX, чтобы найти риски и несоответствия.</p>
        </div>

        <div className="absolute right-6 bottom-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform translate-x-2 group-hover:translate-x-0">
          <ArrowUpRight className="text-white" />
        </div>
      </div>
    </div>

    <div className="mt-12">
      <div className="flex justify-between items-end mb-6 border-b border-gray-500/10 pb-2">
        <h3 className={`font-serif text-xl ${styles.textMain(isDark)}`}>Недавние дела</h3>
        <button className={`text-xs tracking-widest uppercase font-bold hover:opacity-70 transition-opacity ${styles.textSec(isDark)}`}>
          Архив
        </button>
      </div>

      <div className="space-y-4">
        {[
          { title: 'Слияние: TechCorp', date: '2 часа назад', status: 'Требует внимания', icon: AlertOctagon, color: 'text-amber-500' },
          { title: 'Передача IP прав', date: 'Вчера', status: 'Ок', icon: Check, color: 'text-emerald-500' },
          { title: 'Трудовой контракт #402', date: '10 окт', status: 'Черновик', icon: FileSignature, color: 'text-gray-400' },
        ].map((item, i) => (
          <PremiumCard key={i} isDark={isDark} className="!p-5 flex items-center gap-5">
            <div className={`p-3 rounded-full ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
              <item.icon className={item.color} size={20} strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <h4 className={`font-medium text-sm mb-1 ${styles.textMain(isDark)}`}>{item.title}</h4>
              <p className={`text-xs ${styles.textSec(isDark)}`}>
                {item.date} • {item.status}
              </p>
            </div>
            <ChevronRight size={16} className={`opacity-30 ${styles.textMain(isDark)}`} />
          </PremiumCard>
        ))}
      </div>
    </div>
  </div>
);

const ScanView = ({ isDark, onBack }) => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(false);

  useEffect(() => {
    if (scanning) {
      const timer = setTimeout(() => {
        setScanning(false);
        setResult(true);
      }, 2500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [scanning]);

  if (result) {
    return (
      <div className="h-full pt-24 px-6 animate-in slide-in-from-bottom-8 duration-700">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={onBack}
            className={`flex items-center gap-2 text-sm font-bold tracking-widest uppercase opacity-60 hover:opacity-100 ${styles.textMain(isDark)}`}
          >
            <ChevronLeft size={16} /> Назад
          </button>
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
            <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">Найдено 2 проблемы</span>
          </div>
        </div>

        <div className={`rounded-t-[32px] min-h-screen p-8 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)] ${isDark ? 'bg-[#151515]' : 'bg-white'}`}>
          <div className="w-full flex justify-center mb-8">
            <div className="w-12 h-1.5 rounded-full bg-gray-500/20"></div>
          </div>

          <h2 className={`font-serif text-3xl mb-2 ${styles.textMain(isDark)}`}>Отчет анализа</h2>
          <p className={`text-sm mb-10 ${styles.textSec(isDark)}`}>
            Документ: <span className="underline decoration-1 underline-offset-4">NDA_Draft_v0.4.pdf</span>
          </p>

          <div className="relative pl-6 border-l-2 border-amber-500/50 mb-10 group cursor-pointer">
            <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 ${isDark ? 'bg-[#151515] border-amber-500' : 'bg-white border-amber-500'}`}></div>

            <h3 className={`text-lg font-serif mb-2 ${styles.textMain(isDark)} group-hover:text-amber-500 transition-colors`}>
              Статья об индемнификации
            </h3>
            <p className={`text-sm leading-relaxed ${styles.textSec(isDark)}`}>
              Текущее формулировка перекладывает <span className="text-amber-500 font-medium">неограниченную ответственность</span> на раскрывающую сторону. Это отклонение от практики (потолок 2x гонорара).
            </p>

            <div className={`mt-4 p-4 rounded-xl text-sm italic font-serif ${isDark ? 'bg-amber-500/10 text-amber-200' : 'bg-amber-50 text-amber-800'}`}>
              «Рекомендация: ограничить ответственность суммой контракта».
            </div>
          </div>

          <div className="relative pl-6 border-l-2 border-emerald-500/20 mb-8 opacity-60 hover:opacity-100 transition-opacity">
            <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 ${isDark ? 'bg-[#151515] border-emerald-500' : 'bg-white border-emerald-500'}`}></div>
            <h3 className={`text-lg font-serif mb-2 ${styles.textMain(isDark)}`}>Период конфиденциальности</h3>
            <p className={`text-sm leading-relaxed ${styles.textSec(isDark)}`}>Срок 5 лет. Соответствует стандарту.</p>
          </div>

          <button
            className={`w-full py-4 mt-4 rounded-xl font-bold text-xs tracking-[0.2em] uppercase transition-all hover:scale-[1.02] ${
              isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'
            }`}
          >
            Сгенерировать дополнение
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div
        className={`relative w-64 h-[360px] rounded-[4px] border transition-all duration-700 ${
          scanning ? 'border-transparent scale-105' : 'border-gray-500/30'
        } flex items-center justify-center overflow-hidden`}
      >
        <div
          className={`absolute inset-0 p-8 space-y-4 transition-opacity duration-500 ${
            scanning ? 'opacity-40' : 'opacity-100'
          } ${isDark ? 'bg-[#121212]' : 'bg-white'}`}
        >
          <div className="w-1/3 h-2 bg-gray-500/20 mb-8"></div>
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="w-full h-1.5 bg-gray-500/10 rounded-full"></div>
          ))}
          <div className="w-2/3 h-1.5 bg-gray-500/10 rounded-full"></div>
        </div>

        {scanning && (
          <div className="absolute inset-0 z-20 animate-scan">
            <div className="h-full w-full bg-gradient-to-b from-transparent via-amber-500/20 to-transparent translate-y-[-100%] animate-scan-beam"></div>
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.8)]"></div>
          </div>
        )}

        {!scanning && (
          <div
            onClick={() => setScanning(true)}
            className="absolute inset-0 z-30 flex items-center justify-center cursor-pointer group bg-black/5 hover:bg-black/10 transition-colors"
          >
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center backdrop-blur-md transition-transform group-hover:scale-110 ${
                isDark ? 'bg-white/10 text-white' : 'bg-black/80 text-white'
              }`}
            >
              <Search size={24} strokeWidth={1.5} />
            </div>
          </div>
        )}
      </div>

      <div className="mt-12 text-center space-y-2">
        <h2 className={`font-serif text-2xl ${styles.textMain(isDark)}`}>
          {scanning ? 'Анализ прецедентов…' : 'Загрузите документ'}
        </h2>
        <p className={`text-sm font-light ${styles.textSec(isDark)}`}>ИИ сверит с Гражданским кодексом</p>
      </div>
    </div>
  );
};

// --- НАВИГАЦИЯ ---

const LuxuryNav = ({ isDark }) => (
  <div className="fixed bottom-0 left-0 right-0 p-6 z-50 pointer-events-none">
    <div
      className={`mx-auto max-w-[280px] h-[64px] rounded-full px-2 flex justify-between items-center pointer-events-auto ${styles.glass(isDark)}`}
    >
      {[
        { icon: Scale, active: true },
        { icon: Search, active: false },
        { icon: Bookmark, active: false },
        { icon: Fingerprint, active: false },
      ].map((item, idx) => (
        <button
          key={idx}
          className={`
            w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
            ${
              item.active
                ? isDark
                  ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                  : 'bg-black text-white shadow-lg'
                : isDark
                  ? 'text-white/40 hover:bg-white/10 hover:text-white'
                  : 'text-black/40 hover:bg-black/5 hover:text-black'
            }
          `}
        >
          <item.icon size={20} strokeWidth={1.5} />
        </button>
      ))}
    </div>
  </div>
);

// --- ШАПКА ---

const Header = ({ isDark, toggle, forceMobile, setForceMobile }) => (
  <header className={`fixed top-0 left-0 right-0 z-50 px-6 py-6 transition-colors duration-500`}>
    <div className="flex justify-between items-center gap-3">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${isDark ? 'border-white/20 bg-white/5' : 'border-black/10 bg-white/50'}`}>
          <span className={`font-serif font-bold text-xl ${styles.textMain(isDark)}`}>J.</span>
        </div>
        <div className="hidden sm:block">
          <p className={`text-xs uppercase tracking-[0.25em] ${styles.textSec(isDark)}`}>DocSign</p>
          <p className={`font-semibold ${styles.textMain(isDark)}`}>Elite Jurist</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setForceMobile((prev) => !prev)}
          className={`hidden sm:inline-flex px-3 py-2 rounded-lg border text-xs tracking-widest uppercase ${
            isDark ? 'border-white/15 text-white' : 'border-black/15 text-black'
          }`}
        >
          {forceMobile ? 'Десктоп' : 'Мобильная версия'}
        </button>
        <IconButton icon={Zap} isDark={isDark} onClick={toggle} label="Сменить тему" />
        <IconButton icon={Menu} isDark={isDark} onClick={() => setForceMobile((prev) => !prev)} label="Меню" />
      </div>
    </div>
  </header>
);

// --- ЛОГИКА ---

export default function EliteJuristApp() {
  const { isDark, toggle } = useTheme();
  const [view, setView] = useState('dashboard');
  const [forceMobile, setForceMobile] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const mainWidth = forceMobile ? 'max-w-md' : 'max-w-5xl';
  const mainHeight = forceMobile ? 'h-screen overflow-y-auto no-scrollbar' : '';

  return (
    <div className={`relative min-h-screen font-sans transition-colors duration-700 ${styles.bg(isDark)}`}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full blur-[120px] opacity-[0.06] ${isDark ? 'bg-white' : 'bg-black'}`}></div>
      </div>

      <Header isDark={isDark} toggle={toggle} forceMobile={forceMobile} setForceMobile={setForceMobile} />

      <main className={`relative ${mainWidth} mx-auto ${mainHeight} pt-2 pb-16 sm:pb-24`}>
        {view === 'dashboard' && <Dashboard isDark={isDark} onNavigate={setView} />}
        {view === 'scan' && <ScanView isDark={isDark} onBack={() => setView('dashboard')} />}
      </main>

      <LuxuryNav isDark={isDark} />

      <style>{`
        @keyframes scan-beam {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(360px); }
        }
        .animate-scan-beam {
          animation: scan-beam 2s linear infinite;
        }
        .animate-in {
            animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
