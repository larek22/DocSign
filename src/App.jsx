import React, { useEffect, useState } from 'react';
import {
  Scale,
  ShieldCheck,
  FileSignature,
  Clock,
  Search,
  Bell,
  Menu,
  Fingerprint,
  Zap,
  MoreVertical,
  ArrowUpRight,
  Bookmark,
  Sparkles,
  AlertOctagon,
  Play,
  Settings,
  FolderLock,
  Upload,
  DownloadCloud,
  CheckCircle2,
  Cpu,
  Shield,
  Plus,
} from 'lucide-react';

const palette = {
  bg: (dark) => (dark ? 'bg-[#050505]' : 'bg-[#F8F6F1]'),
  textMain: (dark) => (dark ? 'text-white' : 'text-[#121212]'),
  textSubtle: (dark) => (dark ? 'text-white/70' : 'text-[#3f3f3f]'),
  panel: (dark) => (dark ? 'bg-[#0E0E0E]/80 border-white/5' : 'bg-white border-black/5'),
  panelHover: (dark) => (dark ? 'hover:border-white/10' : 'hover:border-black/10'),
  accent: 'text-[#C5A059]',
};

const useTheme = () => {
  const [isDark, setIsDark] = useState(true);
  const toggle = () => setIsDark((prev) => !prev);
  return { isDark, toggle };
};

const Badge = ({ label, tone = 'default' }) => {
  const toneStyles = {
    default: 'text-white/70 bg-white/5 border-white/10',
    amber: 'text-amber-200 bg-amber-500/10 border-amber-400/30',
    green: 'text-emerald-200 bg-emerald-500/10 border-emerald-400/30',
  };
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-[0.2em] border ${toneStyles[tone]}`}
    >
      {label}
    </span>
  );
};

const Surface = ({ isDark, children, className = '', onClick }) => (
  <div
    onClick={onClick}
    className={`relative rounded-2xl border transition-all duration-300 ${
      palette.panel(isDark)
    } ${palette.panelHover(isDark)} ${className}`}
  >
    {children}
  </div>
);

const StatCard = ({ icon: Icon, label, value, trend, isDark }) => (
  <Surface isDark={isDark} className="p-4 flex items-center gap-4 min-h-[110px]">
    <div className={`${isDark ? 'bg-white/5' : 'bg-black/5'} p-3 rounded-xl`}>
      <Icon className={palette.accent} size={24} strokeWidth={1.5} />
    </div>
    <div className="flex-1">
      <p className={`text-sm uppercase tracking-[0.2em] ${palette.textSubtle(isDark)}`}>{label}</p>
      <div className="flex items-baseline gap-3">
        <span className={`text-2xl font-semibold ${palette.textMain(isDark)}`}>{value}</span>
        <span className="text-xs text-emerald-400">{trend}</span>
      </div>
    </div>
    <ArrowUpRight className={`opacity-30 ${palette.textMain(isDark)}`} size={18} />
  </Surface>
);

const DocumentRow = ({ title, type, status, updated, isDark }) => (
  <Surface
    isDark={isDark}
    className="p-4 flex items-center gap-4 hover:-translate-y-[2px] cursor-pointer"
  >
    <div className={`${isDark ? 'bg-white/5' : 'bg-black/5'} rounded-xl p-3`}> 
      <FileSignature className={palette.accent} size={20} />
    </div>
    <div className="flex-1">
      <p className={`font-medium ${palette.textMain(isDark)}`}>{title}</p>
      <p className={`text-sm ${palette.textSubtle(isDark)}`}>{type}</p>
    </div>
    <Badge label={status} tone={status === 'Critical' ? 'amber' : 'green'} />
    <p className={`text-xs ${palette.textSubtle(isDark)}`}>{updated}</p>
    <MoreVertical className={`opacity-40 ${palette.textMain(isDark)}`} size={16} />
  </Surface>
);

const TimelineItem = ({ icon: Icon, label, time, detail, isDark }) => (
  <div className="flex gap-3">
    <div className={`${isDark ? 'bg-white/5' : 'bg-black/5'} w-10 h-10 rounded-full flex items-center justify-center`}>
      <Icon className={palette.accent} size={18} />
    </div>
    <div className="flex-1 border-b border-white/5 pb-3">
      <p className={`text-sm font-semibold ${palette.textMain(isDark)}`}>{label}</p>
      <p className={`text-xs ${palette.textSubtle(isDark)}`}>{detail}</p>
    </div>
    <span className={`text-xs ${palette.textSubtle(isDark)}`}>{time}</span>
  </div>
);

const DesktopHero = ({ isDark, onNavigate }) => (
  <Surface
    isDark={isDark}
    onClick={() => onNavigate('scan')}
    className="p-8 overflow-hidden cursor-pointer group min-h-[260px] flex"
  >
    <div className="absolute inset-0 bg-gradient-to-r from-[#111] via-[#0b0b0b] to-transparent" />
    <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_40%_40%,rgba(197,160,89,0.18),rgba(5,5,5,0))]" />
    <div className="relative flex-1 space-y-4">
      <Badge label="AI Analysis 2.0" tone="amber" />
      <h1 className={`font-serif text-4xl leading-snug ${palette.textMain(isDark)}`}>
        Elite contract review built for desktop counsel.
      </h1>
      <p className={`${palette.textSubtle(isDark)} max-w-2xl`}>
        Upload, triage, and co-author amendments without leaving your workflow. Precision risk detection meets elegant control.
      </p>
      <div className="flex gap-3">
        <button
          className="px-5 py-3 rounded-xl bg-white text-black font-semibold flex items-center gap-2 shadow-lg shadow-black/30"
        >
          Start a Scan <ArrowUpRight size={18} />
        </button>
        <button
          className={`px-5 py-3 rounded-xl border ${isDark ? 'border-white/10 text-white' : 'border-black/10 text-black'} flex items-center gap-2`}
        >
          Watch demo <Play size={16} />
        </button>
      </div>
    </div>
    <div className="hidden xl:flex w-[360px] relative">
      <Surface
        isDark={isDark}
        className="w-full p-5 space-y-3 border border-white/10 bg-gradient-to-b from-white/5 to-transparent"
      >
        <div className="flex justify-between items-center">
          <p className={`text-sm ${palette.textSubtle(isDark)}`}>NDA_Draft_v0.4.pdf</p>
          <Shield className={palette.accent} size={18} />
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full bg-[#C5A059] w-4/5" />
        </div>
        <div className={`text-sm ${palette.textMain(isDark)}`}>
          2 potential liabilities detected
        </div>
        <div className="space-y-2">
          {["Unlimited indemnity", "Missing audit carve-out"].map((item) => (
            <div key={item} className={`flex items-center justify-between text-xs ${palette.textSubtle(isDark)}`}>
              <span>{item}</span>
              <CheckCircle2 className="text-emerald-400" size={16} />
            </div>
          ))}
        </div>
      </Surface>
    </div>
  </Surface>
);

const ScanView = ({ isDark, onBack }) => {
  const [scanning, setScanning] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    let timer;
    if (scanning) {
      timer = setTimeout(() => {
        setScanning(false);
        setComplete(true);
      }, 2800);
    }
    return () => clearTimeout(timer);
  }, [scanning]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className={`px-3 py-2 rounded-lg border text-sm ${isDark ? 'border-white/10 text-white' : 'border-black/10 text-black'}`}
          >
            Back to desk
          </button>
          <Badge label={complete ? 'Report ready' : scanning ? 'Scanning' : 'Staged'} tone={complete ? 'green' : 'amber'} />
        </div>
        <div className={`flex gap-2 text-xs items-center ${palette.textSubtle(isDark)}`}>
          <Sparkles size={16} className={palette.accent} />
          AI cross-checking CFR & GDPR corpus
        </div>
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        <Surface isDark={isDark} className="xl:col-span-2 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`font-serif text-2xl ${palette.textMain(isDark)}`}>Document intake</h3>
              <p className={`${palette.textSubtle(isDark)} text-sm`}>Drop files or pull from DMS.</p>
            </div>
            <button
              onClick={() => setScanning(true)}
              className="px-4 py-2 rounded-lg bg-white text-black font-semibold flex items-center gap-2"
            >
              {scanning ? 'Analyzing' : 'Start scan'} <Zap size={16} />
            </button>
          </div>

          <div
            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-4 ${
              isDark ? 'border-white/10 bg-white/5' : 'border-black/10 bg-black/5'
            } ${scanning ? 'animate-pulse' : ''}`}
          >
            <Upload size={36} className={palette.accent} />
            <div className="text-center space-y-1">
              <p className={`text-lg font-medium ${palette.textMain(isDark)}`}>Drag & drop contracts</p>
              <p className={`${palette.textSubtle(isDark)} text-sm`}>PDF, DOCX, TXT up to 50 MB</p>
            </div>
            <div className="flex gap-3">
              <button className={`px-4 py-2 rounded-lg border ${isDark ? 'border-white/10 text-white' : 'border-black/10 text-black'}`}>
                Browse desktop
              </button>
              <button className="px-4 py-2 rounded-lg bg-black text-white flex items-center gap-2">
                <DownloadCloud size={16} /> Connect cloud drive
              </button>
            </div>
          </div>

          {complete && (
            <Surface isDark={isDark} className="p-4 grid md:grid-cols-3 gap-3">
              {["Indemnity", "Data residency", "Audit"].map((item, idx) => (
                <div key={item} className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <p className={`text-xs uppercase tracking-[0.2em] ${palette.textSubtle(isDark)}`}>
                    Risk {idx + 1}
                  </p>
                  <p className={`text-lg font-serif ${palette.textMain(isDark)}`}>{item}</p>
                  <p className="text-xs text-amber-300 mt-1 flex items-center gap-1">
                    <AlertOctagon size={14} /> Review clause
                  </p>
                </div>
              ))}
            </Surface>
          )}
        </Surface>

        <Surface isDark={isDark} className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h4 className={`font-serif text-xl ${palette.textMain(isDark)}`}>Live activity</h4>
            <Bell className={palette.accent} size={18} />
          </div>
          <div className="space-y-4">
            <TimelineItem
              icon={Sparkles}
              label="Clause intelligence"
              detail="Model aligning with market indemnity caps"
              time={scanning ? 'running' : 'just now'}
              isDark={isDark}
            />
            <TimelineItem
              icon={ShieldCheck}
              label="Regulatory sweep"
              detail="GDPR/CCPA mapping complete"
              time="1m"
              isDark={isDark}
            />
            <TimelineItem
              icon={FileSignature}
              label="Draft amendment"
              detail="Redlines ready for counsel review"
              time="3m"
              isDark={isDark}
            />
          </div>
          <div className="pt-2">
            <button className="w-full py-3 rounded-xl bg-white text-black font-semibold flex items-center justify-center gap-2">
              Generate amendment package
              <ArrowUpRight size={16} />
            </button>
          </div>
        </Surface>
      </div>
    </div>
  );
};

const Dashboard = ({ isDark, onNavigate }) => (
  <div className="space-y-6">
    <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
      <div>
        <p className={`text-xs uppercase tracking-[0.25em] ${palette.accent}`}>Wednesday, 12 Oct</p>
        <h2 className={`font-serif text-4xl ${palette.textMain(isDark)}`}>Welcome back, Counselor.</h2>
        <p className={`${palette.textSubtle(isDark)} mt-1`}>
          Continue where you left off or launch a new desktop-grade analysis.
        </p>
      </div>
      <div className="flex gap-2">
        <button className="px-4 py-2 rounded-lg bg-white text-black font-semibold flex items-center gap-2">
          <Sparkles size={16} /> New AI workspace
        </button>
        <button className={`px-4 py-2 rounded-lg border ${isDark ? 'border-white/10 text-white' : 'border-black/10 text-black'}`}>
          <Plus size={16} /> Manual file
        </button>
      </div>
    </div>

    <DesktopHero isDark={isDark} onNavigate={onNavigate} />

    <div className="grid xl:grid-cols-4 gap-6">
      <StatCard icon={ShieldCheck} label="Compliant clauses" value="94%" trend="+3.2%" isDark={isDark} />
      <StatCard icon={Scale} label="Risk alerts" value="08" trend="-2 this week" isDark={isDark} />
      <StatCard icon={Clock} label="Avg review time" value="6m 12s" trend="-14%" isDark={isDark} />
      <StatCard icon={Cpu} label="Model version" value="v2.4" trend="Stable" isDark={isDark} />
    </div>

    <div className="grid xl:grid-cols-3 gap-6">
      <Surface isDark={isDark} className="xl:col-span-2 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`font-serif text-2xl ${palette.textMain(isDark)}`}>Recent matters</h3>
            <p className={`${palette.textSubtle(isDark)} text-sm`}>Desktop-optimized view for your active contracts</p>
          </div>
          <button className="text-sm text-amber-300 flex items-center gap-2">
            View archive <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="space-y-3">
          <DocumentRow
            title="Merger Agreement: TechCorp"
            type="M&A • 112 pages"
            status="Critical"
            updated="2h ago"
            isDark={isDark}
          />
          <DocumentRow
            title="IP Rights Transfer"
            type="IP • 26 pages"
            status="Cleared"
            updated="Yesterday"
            isDark={isDark}
          />
          <DocumentRow
            title="Employment Contract #402"
            type="HR • 14 pages"
            status="Cleared"
            updated="Oct 10"
            isDark={isDark}
          />
        </div>
      </Surface>
      <Surface isDark={isDark} className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`font-serif text-xl ${palette.textMain(isDark)}`}>Upcoming actions</h3>
            <p className={`${palette.textSubtle(isDark)} text-sm`}>Desktop notifications muted</p>
          </div>
          <Bell className={palette.accent} size={18} />
        </div>
        <div className="space-y-3">
          <TimelineItem
            icon={AlertOctagon}
            label="Review indemnity limits"
            detail="NDA_Draft_v0.4.pdf"
            time="Today"
            isDark={isDark}
          />
          <TimelineItem
            icon={Bookmark}
            label="Flagged jurisdiction"
            detail="Data residency addendum"
            time="Tomorrow"
            isDark={isDark}
          />
          <TimelineItem
            icon={ShieldCheck}
            label="Compliance audit"
            detail="SOC2 evidence refresh"
            time="Friday"
            isDark={isDark}
          />
        </div>
      </Surface>
    </div>
  </div>
);

const Sidebar = ({ isDark }) => (
  <div
    className={`hidden lg:flex flex-col gap-4 w-[280px] px-4 py-6 sticky top-0 h-screen ${palette.bg(isDark)}`}
  >
    <div className="flex items-center gap-3 px-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${isDark ? 'border-white/10 bg-white/5' : 'border-black/10 bg-white/60'}`}>
        <span className={`font-serif font-bold text-xl ${palette.textMain(isDark)}`}>J.</span>
      </div>
      <div>
        <p className={`text-xs uppercase tracking-[0.2em] ${palette.textSubtle(isDark)}`}>DocSign</p>
        <p className={`font-semibold ${palette.textMain(isDark)}`}>Elite Jurist</p>
      </div>
    </div>
    <Surface isDark={isDark} className="p-4 space-y-3">
      {[
        { icon: Scale, label: 'Workspace' },
        { icon: Search, label: 'Search' },
        { icon: Bookmark, label: 'Bookmarks' },
        { icon: ShieldCheck, label: 'Compliance' },
        { icon: Settings, label: 'Settings' },
      ].map((item) => (
        <div key={item.label} className="flex items-center gap-3 text-sm text-white/80">
          <item.icon size={16} className={palette.accent} />
          <span className={`${palette.textMain(isDark)}`}>{item.label}</span>
        </div>
      ))}
    </Surface>
    <Surface isDark={isDark} className="p-4 space-y-2">
      <p className={`text-xs uppercase tracking-[0.2em] ${palette.textSubtle(isDark)}`}>Security</p>
      <div className="flex items-center gap-2">
        <FolderLock size={18} className={palette.accent} />
        <p className={`${palette.textMain(isDark)} text-sm`}>End-to-end encryption</p>
      </div>
      <div className="flex items-center gap-2">
        <Fingerprint size={18} className={palette.accent} />
        <p className={`${palette.textMain(isDark)} text-sm`}>SAML & SSO enforced</p>
      </div>
    </Surface>
  </div>
);

const TopBar = ({ isDark, toggle }) => (
  <div className="sticky top-0 z-20 backdrop-blur-xl bg-black/40 border-b border-white/5 px-6 py-4 flex items-center gap-4">
    <button className="lg:hidden w-10 h-10 rounded-full flex items-center justify-center border border-white/10">
      <Menu size={18} />
    </button>
    <div className="flex-1 flex items-center gap-3">
      <div className={`flex items-center gap-2 rounded-xl px-3 py-2 border ${isDark ? 'border-white/10 bg-white/5' : 'border-black/10 bg-white/60'}`}>
        <Search size={16} className="text-white/60" />
        <input
          className={`bg-transparent outline-none text-sm flex-1 ${palette.textMain(isDark)}`}
          placeholder="Search matters, clauses, or citations"
        />
      </div>
      <button className={`px-3 py-2 rounded-lg border text-sm ${isDark ? 'border-white/10 text-white' : 'border-black/10 text-black'}`}>
        Filters
      </button>
    </div>
    <div className="flex items-center gap-2">
      <button className={`w-10 h-10 rounded-full border ${isDark ? 'border-white/10' : 'border-black/10'} flex items-center justify-center`}>
        <Bell size={18} className={palette.accent} />
      </button>
      <button
        onClick={toggle}
        className={`px-4 py-2 rounded-lg border font-semibold ${isDark ? 'border-white/10 text-white' : 'border-black/10 text-black'}`}
      >
        {isDark ? 'Light mode' : 'Dark mode'}
      </button>
    </div>
  </div>
);

export default function App() {
  const { isDark, toggle } = useTheme();
  const [view, setView] = useState('dashboard');

  return (
    <div className={`min-h-screen ${palette.bg(isDark)} text-white relative overflow-hidden`}>
      <div className="absolute inset-0 pointer-events-none opacity-70" aria-hidden>
        <div className="absolute -top-32 -left-24 w-[40vw] h-[40vw] rounded-full bg-gradient-to-br from-[#C5A059]/20 to-transparent blur-[120px]" />
        <div className="absolute top-10 right-0 w-[30vw] h-[30vw] rounded-full bg-gradient-to-br from-[#1a1a1a] to-transparent blur-[160px]" />
      </div>
      <div className="relative flex">
        <Sidebar isDark={isDark} />
        <div className="flex-1 max-w-[1400px] mx-auto w-full">
          <TopBar isDark={isDark} toggle={toggle} />
          <main className="px-6 pb-14 space-y-8">
            {view === 'dashboard' && <Dashboard isDark={isDark} onNavigate={setView} />}
            {view === 'scan' && <ScanView isDark={isDark} onBack={() => setView('dashboard')} />}
          </main>
        </div>
      </div>
    </div>
  );
}
