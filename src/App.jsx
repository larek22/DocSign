import React, { useState } from 'react';
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
} from 'lucide-react';

// --- THEME ENGINE ---
// Тот же движок, адаптированный под большие площади
const styles = {
  bg: (dark) => (dark ? 'bg-[#080808]' : 'bg-[#F5F2EB]'),
  sidebar: (dark) =>
    dark ? 'bg-[#0B0C10] border-r border-white/5' : 'bg-[#FDFBF7] border-r border-[#E5E0D6]',
  textMain: (dark) => (dark ? 'text-[#EAEAEA]' : 'text-[#1A1A1A]'),
  textSec: (dark) => (dark ? 'text-[#888888]' : 'text-[#666660]'),
  glass: (dark) =>
    dark ? 'bg-[#1A1A1A]/40 backdrop-blur-md border border-white/5' : 'bg-[#FFFFFF]/60 backdrop-blur-md border border-black/5',
  card: (dark) =>
    dark ? 'bg-[#121212] border border-white/5 hover:border-white/10' : 'bg-white border border-[#E5E0D6] hover:border-[#D4AF37]/30',
  goldText: 'text-[#C5A059]',
  accentGradient: 'bg-gradient-to-br from-[#C5A059] to-[#8A6E36]',
};

// --- UI COMPONENTS ---

const SidebarItem = ({ icon: Icon, label, active, collapsed, isDark, onClick }) => (
  <button
    onClick={onClick}
    className={`
      w-full flex items-center gap-4 p-3 mb-2 rounded-xl transition-all duration-300 group
      ${
        active
          ? isDark
            ? 'bg-white/10 text-white'
            : 'bg-[#1A1A1A] text-white'
          : isDark
            ? 'text-gray-500 hover:text-white hover:bg-white/5'
            : 'text-gray-500 hover:text-black hover:bg-black/5'
      }
    `}
  >
    <Icon size={20} strokeWidth={1.5} className={active ? 'text-[#C5A059]' : ''} />
    {!collapsed && (
      <span className={`text-sm font-medium tracking-wide ${collapsed ? 'opacity-0' : 'opacity-100'}`}>{label}</span>
    )}
    {active && !collapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#C5A059] shadow-[0_0_8px_#C5A059]" />}
  </button>
);

const StatCard = ({ title, value, sub, icon: Icon, isDark }) => (
  <div className={`p-6 rounded-[20px] ${styles.card(isDark)} transition-all duration-300 hover:transform hover:-translate-y-1`}>
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-full ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
        <Icon size={20} className={styles.goldText} />
      </div>
      <span className={`text-xs font-bold tracking-wider uppercase ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{sub}</span>
    </div>
    <h3 className={`text-3xl font-serif mb-1 ${styles.textMain(isDark)}`}>{value}</h3>
    <p className={`text-xs uppercase tracking-widest ${styles.textSec(isDark)}`}>{title}</p>
  </div>
);

const TableRow = ({ client, caseName, status, date, isDark }) => (
  <tr className={`group border-b transition-colors ${isDark ? 'border-white/5 hover:bg-white/[0.02]' : 'border-black/5 hover:bg-black/[0.02]'}`}>
    <td className="py-4 pl-4">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-serif ${isDark ? 'bg-white/10' : 'bg-black/10'}`}>
          {client.charAt(0)}
        </div>
        <span className={`font-medium ${styles.textMain(isDark)}`}>{client}</span>
      </div>
    </td>
    <td className={`py-4 ${styles.textSec(isDark)}`}>{caseName}</td>
    <td className="py-4">
      <span
        className={`
        px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border
        ${status === 'Active' ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10' : ''}
        ${status === 'Review' ? 'border-amber-500/30 text-amber-500 bg-amber-500/10' : ''}
        ${status === 'Draft' ? 'border-gray-500/30 text-gray-500 bg-gray-500/10' : ''}
      `}
      >
        {status}
      </span>
    </td>
    <td className={`py-4 text-sm ${styles.textSec(isDark)}`}>{date}</td>
    <td className="py-4 pr-4 text-right">
      <button className={`opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>
        <MoreHorizontal size={16} />
      </button>
    </td>
  </tr>
);

// --- MAIN SCREENS ---

const DashboardView = ({ isDark }) => (
  <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in duration-700">
    {/* Header Section */}
    <div className="flex justify-between items-end mb-10">
      <div>
        <p className={`text-xs font-bold tracking-[0.2em] uppercase mb-2 ${styles.goldText}`}>Sunday, 14 Dec • Rome</p>
        <h1 className={`text-4xl font-serif ${styles.textMain(isDark)}`}>Overview</h1>
      </div>
      <div className="flex gap-4">
        <button
          className={`px-6 py-3 rounded-full text-sm font-bold tracking-widest uppercase transition-all ${
            isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-[#1A1A1A] text-white hover:bg-gray-800'
          }`}
        >
          + New Matter
        </button>
      </div>
    </div>

    {/* Top Grid: Hero Action & Stats */}
    <div className="grid grid-cols-12 gap-6 mb-10">
      {/* Hero Banner */}
      <div className="col-span-12 lg:col-span-8 relative overflow-hidden rounded-[24px] group cursor-pointer shadow-2xl">
        <div className="absolute inset-0 bg-[#0F1115]">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#1a237e] opacity-20 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#C5A059] opacity-10 blur-[100px] rounded-full"></div>
        </div>

        <div className="relative z-10 p-10 h-full flex flex-col justify-between min-h-[300px]">
          <div className="flex justify-between items-start">
            <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center bg-white/5 backdrop-blur-md">
              <Scale className="text-white" size={24} />
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/5">
              <span className="text-xs font-bold text-white tracking-widest uppercase">AI Engine v2.4 Active</span>
            </div>
          </div>

          <div className="max-w-xl">
            <h2 className="text-3xl font-serif text-white mb-4">Contract Intelligence</h2>
            <p className="text-white/60 mb-8 font-light text-lg">
              Drag and drop your PDF here to initiate a deep scan for liability clauses, compliance risks, and non-standard deviations.
            </p>
            <div className="flex items-center gap-4 text-sm font-bold text-[#C5A059] uppercase tracking-widest group-hover:translate-x-2 transition-transform">
              Start Analysis <ChevronRight size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Column */}
      <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
        <StatCard title="Active Cases" value="24" sub="+12%" icon={FolderOpen} isDark={isDark} />
        <StatCard title="Hours Billed" value="142.5" sub="+12%" icon={Clock} isDark={isDark} />
      </div>
    </div>

    {/* Recent Matters Table */}
    <div className={`rounded-[24px] p-8 ${styles.card(isDark)}`}>
      <div className="flex justify-between items-center mb-6">
        <h3 className={`text-xl font-serif ${styles.textMain(isDark)}`}>Recent Matters</h3>
        <div className="flex gap-2">
          <button className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>
            <Search size={18} className={styles.textSec(isDark)} />
          </button>
          <button className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>
            <MoreHorizontal size={18} className={styles.textSec(isDark)} />
          </button>
        </div>
      </div>

      <table className="w-full text-left border-collapse">
        <thead>
          <tr className={`text-xs uppercase tracking-widest border-b ${isDark ? 'text-gray-500 border-white/5' : 'text-gray-400 border-black/5'}`}>
            <th className="pb-4 pl-4 font-normal">Client</th>
            <th className="pb-4 font-normal">Matter</th>
            <th className="pb-4 font-normal">Status</th>
            <th className="pb-4 font-normal">Last Updated</th>
            <th className="pb-4 font-normal text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          <TableRow client="TechCorp Inc." caseName="Merger Agreement v2" status="Review" date="2h ago" isDark={isDark} />
          <TableRow client="Sterling Art" caseName="IP Rights Transfer" status="Active" date="Yesterday" isDark={isDark} />
          <TableRow client="Nexus Logistics" caseName="Employment Dispute" status="Draft" date="Oct 10" isDark={isDark} />
          <TableRow client="Private Estate" caseName="Trust Formation" status="Active" date="Oct 08" isDark={isDark} />
        </tbody>
      </table>
    </div>
  </div>
);

const DocumentAnalysisView = ({ isDark }) => (
  <div className="h-screen flex flex-col animate-in slide-in-from-bottom-4">
    {/* Toolbar */}
    <div className={`h-16 border-b flex items-center justify-between px-6 ${isDark ? 'border-white/5 bg-[#0B0C10]' : 'border-black/5 bg-white'}`}>
      <div className="flex items-center gap-4">
        <h2 className={`font-serif text-lg ${styles.textMain(isDark)}`}>NDA_Draft_v0.4.pdf</h2>
        <span className="px-2 py-0.5 rounded text-[10px] bg-gray-500/20 text-gray-500 font-bold uppercase">Read Only</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
            isDark ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' : 'bg-amber-50 text-amber-600'
          }`}
        >
          <AlertTriangle size={14} /> 2 Risks Found
        </button>
        <div className={`h-6 w-[1px] ${isDark ? 'bg-white/10' : 'bg-black/10'}`}></div>
        <button
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider ${isDark ? 'bg-white text-black' : 'bg-black text-white'}`}
        >
          Export Report
        </button>
      </div>
    </div>

    {/* Split View */}
    <div className="flex-1 flex overflow-hidden">
      {/* Left: Document Preview (Mock) */}
      <div className={`flex-1 overflow-y-auto p-12 flex justify-center ${isDark ? 'bg-[#121212]' : 'bg-[#F2F0E9]'}`}>
        <div className={`w-[800px] min-h-[1000px] shadow-2xl p-16 relative ${isDark ? 'bg-[#1E1E1E] text-gray-300' : 'bg-white text-gray-800'}`}>
          <div className="mb-12 flex justify-between">
            <div className="w-32 h-8 bg-current opacity-10 rounded"></div>
            <div className="w-24 h-4 bg-current opacity-10 rounded"></div>
          </div>
          <div className="space-y-6 text-justify opacity-80 font-serif leading-loose text-sm">
            <p>THIS AGREEMENT is made on the 14th day of December, 2025...</p>
            <p>1. DEFINITIONS. "Confidential Information" means all information disclosed by Disclosing Party...</p>
            <p className="bg-amber-500/20 -mx-2 px-2 py-1 rounded border-l-2 border-amber-500 relative group">
              2. INDEMNIFICATION. Receiving Party agrees to indemnify Disclosing Party for any and all losses, unlimited in scope and duration...
              <span className="absolute -right-32 top-0 text-amber-500 text-xs font-sans font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronLeft size={12} /> High Risk
              </span>
            </p>
            <p>3. TERM. This agreement shall remain in effect for a period of five (5) years...</p>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-3">
                <div className="w-full h-3 bg-current opacity-10 rounded"></div>
                <div className="w-[90%] h-3 bg-current opacity-10 rounded"></div>
                <div className="w-[95%] h-3 bg-current opacity-10 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: AI Findings Panel */}
      <div className={`w-[400px] border-l flex flex-col ${isDark ? 'bg-[#0B0C10] border-white/5' : 'bg-white border-black/5'}`}>
        <div className="p-6 border-b border-white/5">
          <h3 className={`font-serif text-xl mb-1 ${styles.textMain(isDark)}`}>AI Analysis</h3>
          <p className={`text-xs ${styles.textSec(isDark)}`}>Powered by Juris-LLM v4</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className={`p-5 rounded-xl border-l-2 border-amber-500 ${isDark ? 'bg-[#151515]' : 'bg-amber-50/50'}`}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-amber-500" />
              <span className={`text-sm font-bold ${styles.textMain(isDark)}`}>Uncapped Liability</span>
            </div>
            <p className={`text-sm mb-4 leading-relaxed ${styles.textSec(isDark)}`}>
              Clause 2.1 contains unlimited indemnification language. Market standard for this transaction type typically caps liability at 2x contract value.
            </p>
            <div className="space-y-2">
              <button className={`w-full py-2 rounded-lg text-xs font-bold border transition-colors ${isDark ? 'border-white/10 hover:bg-white/5 text-white' : 'border-black/10 hover:bg-black/5 text-black'}`}>
                Auto-Draft Amendment
              </button>
              <button className={`w-full py-2 rounded-lg text-xs font-bold transition-colors ${isDark ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-black'}`}>
                Ignore
              </button>
            </div>
          </div>

          <div className={`p-5 rounded-xl border-l-2 border-emerald-500 ${isDark ? 'bg-[#151515]' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span className={`text-sm font-bold ${styles.textMain(isDark)}`}>Jurisdiction Check</span>
            </div>
            <p className={`text-sm leading-relaxed ${styles.textSec(isDark)}`}>
              Governing law is set to NY State, consistent with previous agreements with this counterparty.
            </p>
          </div>
        </div>

        <div className={`p-4 border-t ${isDark ? 'border-white/5' : 'border-black/5'}`}>
          <div className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
            <SparklesIcon size={18} className="text-amber-500" />
            <input
              type="text"
              placeholder="Ask about this contract..."
              className="bg-transparent border-none outline-none text-sm w-full font-light"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Helper Icon for the chat
const SparklesIcon = ({ className, size }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
  </svg>
);

// --- DESKTOP LAYOUT ---

export default function EliteJuristDesktop() {
  const [isDark, setIsDark] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | analysis
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`flex h-screen w-full font-sans transition-colors duration-500 ${styles.bg(isDark)}`}>
      {/* SIDEBAR */}
      <aside
        className={`
        flex flex-col h-full transition-all duration-300 z-50
        ${collapsed ? 'w-20' : 'w-[280px]'}
        ${styles.sidebar(isDark)}
      `}
      >
        {/* Logo Area */}
        <div className="h-24 flex items-center px-6 justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 min-w-[40px] rounded-full flex items-center justify-center border transition-colors ${isDark ? 'border-white/20 bg-white/5' : 'border-black/10 bg-white'}`}>
              <span className={`font-serif font-bold text-xl ${styles.textMain(isDark)}`}>J.</span>
            </div>
            {!collapsed && <span className={`font-serif font-bold text-lg tracking-tight ${styles.textMain(isDark)} animate-in fade-in`}>Juris</span>}
          </div>
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-black/5 text-black'}`}
            aria-label="Toggle sidebar"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6">
          <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest opacity-40">{!collapsed ? 'Main Menu' : '•'}</div>
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} collapsed={collapsed} isDark={isDark} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={FileText} label="Document Analysis" active={activeTab === 'analysis'} collapsed={collapsed} isDark={isDark} onClick={() => setActiveTab('analysis')} />
          <SidebarItem icon={FolderOpen} label="Case Archive" active={false} collapsed={collapsed} isDark={isDark} />
          <SidebarItem icon={PieChart} label="Analytics" active={false} collapsed={collapsed} isDark={isDark} />

          <div className="mt-8 mb-2 px-2 text-[10px] font-bold uppercase tracking-widest opacity-40">{!collapsed ? 'Settings' : '•'}</div>
          <SidebarItem icon={Settings} label="Configuration" active={false} collapsed={collapsed} isDark={isDark} />
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/5 flex gap-2">
          <button
            onClick={() => setIsDark((prev) => !prev)}
            className={`flex-1 flex items-center justify-center p-3 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
            aria-label="Toggle theme"
          >
            <Zap size={20} className={isDark ? 'text-white' : 'text-black'} />
          </button>
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            className={`p-3 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-black/5 text-black'}`}
            aria-label="Collapse sidebar"
          >
            {collapsed ? <Menu size={18} /> : <X size={18} />}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-auto relative">
        <div className="fixed inset-0 pointer-events-none">
          <div className={`absolute top-0 right-0 w-[50%] h-[50%] rounded-full blur-[150px] opacity-[0.03] ${isDark ? 'bg-white' : 'bg-black'}`}></div>
        </div>

        {activeTab === 'dashboard' && <DashboardView isDark={isDark} />}
        {activeTab === 'analysis' && <DocumentAnalysisView isDark={isDark} />}
      </main>

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
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
