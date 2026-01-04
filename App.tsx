
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Deadline, 
  DeadlineStatus,
  NotificationSettings
} from './types';
import { 
  Icons, 
  COLORS, 
  PECA_OPTIONS, 
  RESPONSAVEL_OPTIONS 
} from './constants';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';

// --- Utilitários de Data Corrigidos ---

const parseLocalDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
};

const formatLocalDate = (dateStr: string) => {
  if (!dateStr) return '-';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('pt-BR');
};

const getDaysDiff = (dateStr: string) => {
  if (!dateStr) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, month, day] = dateStr.split('-').map(Number);
  const deadlineDate = new Date(year, month - 1, day);
  deadlineDate.setHours(0, 0, 0, 0);
  const diffTime = deadlineDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getAlertLevel = (dateStr: string, status: DeadlineStatus, greenDays: number) => {
  if (status === DeadlineStatus.COMPLETED) return 'safe';
  const diff = getDaysDiff(dateStr);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'critical';
  if (diff === 1) return 'urgent';
  if (diff <= greenDays) return 'warning';
  return 'safe';
};

const exportToCSV = (data: Deadline[]) => {
  const headers = ['Peca', 'Empresa', 'Instituicao', 'Responsavel', 'Data', 'Hora', 'Status', 'Assunto', 'Link'];
  const csvRows = data.map(d => [
    `"${d.peca}"`,
    `"${d.empresa}"`,
    `"${d.instituicao || ''}"`,
    `"${d.responsavel}"`,
    d.data,
    `"${d.hora || ''}"`,
    d.status,
    `"${d.assunto.replace(/"/g, '""')}"`,
    `"${d.documentUrl || ''}"`
  ].join(','));
  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...csvRows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `relatorio_prazos_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// --- Componentes ---

const Sidebar = ({ currentView, setView }: { currentView: string, setView: (v: string) => void }) => {
  return (
    <aside className="w-64 bg-slate-950 text-white min-h-screen flex flex-col fixed left-0 top-0 z-40 shadow-2xl border-r border-slate-800">
      <div className="p-10 text-center">
        <h1 className="text-2xl font-black flex items-center justify-center gap-2 tracking-tighter">
          <span className="bg-blue-600 px-2 py-0.5 rounded text-white shadow-lg shadow-blue-500/30 text-lg">JC</span> JurisControl
        </h1>
      </div>
      <nav className="flex-1 px-6 mt-4 space-y-2">
        <button onClick={() => setView('dashboard')} className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all duration-300 ${currentView === 'dashboard' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-900 hover:text-white'}`}>
          <Icons.Dashboard /> <span className="font-bold text-sm">Dashboard</span>
        </button>
        <button onClick={() => setView('deadlines')} className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all duration-300 ${currentView === 'deadlines' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-900 hover:text-white'}`}>
          <Icons.List /> <span className="font-bold text-sm">Controle Geral</span>
        </button>
        <button onClick={() => setView('reports')} className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all duration-300 ${currentView === 'reports' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-900 hover:text-white'}`}>
          <Icons.Report /> <span className="font-bold text-sm">Relatórios</span>
        </button>
        <button onClick={() => setView('settings')} className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all duration-300 ${currentView === 'settings' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-900 hover:text-white'}`}>
          <Icons.Settings /> <span className="font-bold text-sm">Gestão</span>
        </button>
      </nav>
      <div className="p-8 border-t border-slate-900">
        <div className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">Legal Intel v1.9</div>
      </div>
    </aside>
  );
};

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children?: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden border border-slate-100">
        <div className="p-10 border-b flex justify-between items-center bg-slate-50/50">
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{title}</h2>
          <button onClick={onClose} className="p-3 hover:bg-slate-200 rounded-full transition-colors text-slate-400 group">
            <span className="text-2xl group-hover:scale-110 block">&times;</span>
          </button>
        </div>
        <div className="p-10 max-h-[75vh] overflow-y-auto no-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState('dashboard');
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'overdue' | 'today' | 'tomorrow' | 'week'>('all');

  const [reportFilter, setReportFilter] = useState({
    responsavel: '',
    empresa: '',
    status: '',
    startDate: '',
    endDate: ''
  });

  const [settings, setSettings] = useState<NotificationSettings>({
    greenAlertDays: 5,
    yellowAlertDays: 1,
    enableBrowserNotifications: true,
    notificationFrequency: 'always',
    quietMode: false,
    responsaveis: RESPONSAVEL_OPTIONS,
    pecas: PECA_OPTIONS,
    empresas: []
  });

  const [newDeadline, setNewDeadline] = useState<Partial<Deadline>>({
    peca: '',
    responsavel: '',
    empresa: '',
    instituicao: '',
    assunto: '',
    data: new Date().toISOString().split('T')[0],
    hora: '',
    status: DeadlineStatus.PENDING,
    documentUrl: ''
  });

  useEffect(() => {
    const savedD = localStorage.getItem('juris_deadlines');
    const savedS = localStorage.getItem('juris_settings');
    if (savedD) setDeadlines(JSON.parse(savedD));
    if (savedS) setSettings(JSON.parse(savedS));
  }, []);

  useEffect(() => {
    localStorage.setItem('juris_deadlines', JSON.stringify(deadlines));
  }, [deadlines]);

  useEffect(() => {
    localStorage.setItem('juris_settings', JSON.stringify(settings));
  }, [settings]);

  const handleImportSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalUrl = sheetUrl;
      if (sheetUrl.includes('/edit')) {
        finalUrl = sheetUrl.replace(/\/edit.*$/, '/export?format=csv');
      }
      const response = await fetch(finalUrl);
      if (!response.ok) throw new Error('Falha ao acessar planilha.');
      const csvText = await response.text();
      const rows = csvText.split('\n').map(row => row.split(',').map(cell => cell.trim().replace(/^"|"$/g, '')));
      const headers = rows[0].map(h => h.toLowerCase());
      const dataRows = rows.slice(1).filter(r => r.length > 1);
      const imported: Deadline[] = dataRows.map(row => {
        const getIdx = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));
        return {
          id: Math.random().toString(36).substring(2, 11),
          peca: row[getIdx(['peça', 'tipo', 'documento'])] || 'Importado',
          empresa: row[getIdx(['cliente', 'empresa', 'parte'])] || 'Importado',
          responsavel: row[getIdx(['resp', 'advogado'])] || 'EDUARDO',
          data: row[getIdx(['data', 'vencimento', 'prazo'])] || new Date().toISOString().split('T')[0],
          assunto: row[getIdx(['assunto', 'objeto', 'obs'])] || '',
          status: DeadlineStatus.PENDING,
          createdAt: new Date().toISOString(),
          hora: row[getIdx(['hora', 'horário'])] || '',
          instituicao: row[getIdx(['instituicao', 'orgao', 'tribunal'])] || '',
          documentUrl: row[getIdx(['link', 'drive', 'doc'])] || ''
        };
      });
      setDeadlines(prev => [...prev, ...imported]);
      setIsSyncModalOpen(false);
      setSheetUrl('');
      alert(`${imported.length} prazos importados!`);
    } catch (err: any) {
      alert("Erro na importação: " + err.message);
    }
  };

  const handleAddDeadline = (e: React.FormEvent) => {
    e.preventDefault();
    const deadline: Deadline = {
      ...(newDeadline as Deadline),
      id: Math.random().toString(36).substring(2, 11),
      createdAt: new Date().toISOString()
    };
    setDeadlines(prev => [...prev, deadline]);
    setIsModalOpen(false);
    setNewDeadline(prev => ({ 
      ...prev, 
      assunto: '', 
      documentUrl: '', 
      empresa: '', 
      instituicao: '', 
      hora: '' 
    }));
  };

  const stats = useMemo(() => {
    return {
      total: deadlines.length,
      concluidos: deadlines.filter(d => d.status === DeadlineStatus.COMPLETED).length,
      hoje: deadlines.filter(d => d.status === DeadlineStatus.PENDING && getDaysDiff(d.data) === 0).length,
      amanha: deadlines.filter(d => d.status === DeadlineStatus.PENDING && getDaysDiff(d.data) === 1).length,
      semana: deadlines.filter(d => d.status === DeadlineStatus.PENDING && getDaysDiff(d.data) > 1 && getDaysDiff(d.data) <= settings.greenAlertDays).length,
      atrasados: deadlines.filter(d => d.status === DeadlineStatus.PENDING && getDaysDiff(d.data) < 0).length,
    };
  }, [deadlines, settings.greenAlertDays]);

  const filteredDeadlines = useMemo(() => {
    return deadlines.filter(d => {
      if (activeFilter === 'all') return true;
      const diff = getDaysDiff(d.data);
      if (activeFilter === 'overdue') return diff < 0 && d.status === DeadlineStatus.PENDING;
      if (activeFilter === 'today') return diff === 0 && d.status === DeadlineStatus.PENDING;
      if (activeFilter === 'tomorrow') return diff === 1 && d.status === DeadlineStatus.PENDING;
      if (activeFilter === 'week') return diff > 1 && diff <= settings.greenAlertDays && d.status === DeadlineStatus.PENDING;
      return true;
    }).sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  }, [deadlines, activeFilter, settings.greenAlertDays]);

  const reportData = useMemo(() => {
    return deadlines.filter(d => {
      const matchResp = !reportFilter.responsavel || d.responsavel === reportFilter.responsavel;
      const matchEmp = !reportFilter.empresa || d.empresa.toUpperCase().includes(reportFilter.empresa.toUpperCase());
      const matchStatus = !reportFilter.status || d.status === reportFilter.status;
      
      const matchStart = !reportFilter.startDate || d.data >= reportFilter.startDate;
      const matchEnd = !reportFilter.endDate || d.data <= reportFilter.endDate;
      
      return matchResp && matchEmp && matchStatus && matchStart && matchEnd;
    });
  }, [deadlines, reportFilter]);

  const productivityData = useMemo(() => {
    return settings.responsaveis.map(resp => ({
      name: resp,
      concluidos: deadlines.filter(d => d.responsavel === resp && d.status === DeadlineStatus.COMPLETED).length,
      pendentes: deadlines.filter(d => d.responsavel === resp && d.status === DeadlineStatus.PENDING).length
    }));
  }, [deadlines, settings.responsaveis]);

  const chartData = [
    { name: 'Cumpridos', value: stats.concluidos, color: COLORS.success },
    { name: 'Atrasados', value: stats.atrasados, color: '#991b1b' }, 
    { name: 'Urgentes', value: stats.hoje, color: COLORS.danger },
    { name: 'Próximos', value: stats.amanha + stats.semana, color: COLORS.warning },
  ].filter(d => d.value > 0);

  const addItem = (key: 'responsaveis' | 'empresas' | 'pecas', value: string) => {
    const val = value.trim().toUpperCase();
    if (!val || settings[key].includes(val)) return;
    setSettings(prev => ({ ...prev, [key]: [...prev[key], val] }));
  };

  return (
    <div className="flex bg-slate-50 min-h-screen text-slate-900 antialiased font-medium">
      <Sidebar currentView={view} setView={setView} />
      
      <main className="ml-64 flex-1 p-12 relative overflow-x-hidden">
        {/* Top Header */}
        <div className="flex justify-between items-start mb-14">
          <div>
            <h2 className="text-5xl font-black text-slate-950 tracking-tighter mb-2">
              {view === 'dashboard' && 'Dashboard'}
              {view === 'deadlines' && 'Prazos Ativos'}
              {view === 'reports' && 'Relatórios'}
              {view === 'settings' && 'Gestão'}
            </h2>
            <div className="flex items-center gap-2 text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> JurisControl Live
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {view === 'reports' && (
              <button onClick={() => exportToCSV(reportData)} className="flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-500/20 font-black text-xs hover:bg-emerald-700 transition-all">
                <Icons.Table /> Exportar CSV
              </button>
            )}
            <button onClick={() => setIsSyncModalOpen(true)} className="flex items-center gap-2 px-6 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-600 font-bold text-xs hover:bg-slate-50 transition-all">
              <Icons.Sync /> Sincronizar
            </button>
            <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-2xl shadow-blue-500/30 hover:bg-blue-700 transition-all hover:-translate-y-1">
              <Icons.Plus /> Novo Prazo
            </button>
          </div>
        </div>

        {view === 'dashboard' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <section>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                <Icons.AlertCircle /> Radar de Prioridades
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <button onClick={() => setActiveFilter(activeFilter === 'overdue' ? 'all' : 'overdue')} className={`relative p-8 rounded-[2.5rem] border-2 transition-all text-left overflow-hidden group ${activeFilter === 'overdue' ? 'bg-red-800 border-red-700 shadow-2xl shadow-red-200 text-white scale-105' : 'bg-white border-slate-100 shadow-sm text-slate-900'}`}>
                  <div className={`absolute top-0 left-0 w-2 h-full ${activeFilter === 'overdue' ? 'bg-white/20' : 'bg-red-800'}`} />
                  <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-70">Atrasados</p>
                  <div className="flex items-end justify-between">
                    <span className="text-6xl font-black tracking-tighter">{stats.atrasados}</span>
                    <Icons.AlertCircle />
                  </div>
                </button>
                <button onClick={() => setActiveFilter(activeFilter === 'today' ? 'all' : 'today')} className={`relative p-8 rounded-[2.5rem] border-2 transition-all text-left overflow-hidden group ${activeFilter === 'today' ? 'bg-red-600 border-red-500 shadow-2xl shadow-red-200 text-white scale-105' : 'bg-white border-slate-100 shadow-sm text-slate-900'}`}>
                  <div className={`absolute top-0 left-0 w-2 h-full ${activeFilter === 'today' ? 'bg-white/20' : 'bg-red-500'}`} />
                  <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-70">Prazos Fatais</p>
                  <div className="flex items-end justify-between">
                    <span className="text-6xl font-black tracking-tighter">{stats.hoje}</span>
                    <Icons.Clock />
                  </div>
                </button>
                <button onClick={() => setActiveFilter(activeFilter === 'tomorrow' ? 'all' : 'tomorrow')} className={`relative p-8 rounded-[2.5rem] border-2 transition-all text-left overflow-hidden group ${activeFilter === 'tomorrow' ? 'bg-amber-500 border-amber-400 shadow-2xl shadow-amber-200 text-white scale-105' : 'bg-white border-slate-100 shadow-sm text-slate-900'}`}>
                   <div className={`absolute top-0 left-0 w-2 h-full ${activeFilter === 'tomorrow' ? 'bg-white/20' : 'bg-amber-500'}`} />
                   <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-70">Amanhã</p>
                   <div className="flex items-end justify-between">
                     <span className="text-6xl font-black tracking-tighter">{stats.amanha}</span>
                     <Icons.AlertCircle />
                   </div>
                </button>
                <button onClick={() => setActiveFilter(activeFilter === 'week' ? 'all' : 'week')} className={`relative p-8 rounded-[2.5rem] border-2 transition-all text-left overflow-hidden group ${activeFilter === 'week' ? 'bg-emerald-600 border-emerald-500 shadow-2xl shadow-emerald-200 text-white scale-105' : 'bg-white border-slate-100 shadow-sm text-slate-900'}`}>
                   <div className={`absolute top-0 left-0 w-2 h-full ${activeFilter === 'week' ? 'bg-white/20' : 'bg-emerald-500'}`} />
                   <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-70">Próx. {settings.greenAlertDays} dias</p>
                   <div className="flex items-end justify-between">
                     <span className="text-6xl font-black tracking-tighter">{stats.semana}</span>
                     <Icons.Check />
                   </div>
                </button>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
               <div className="lg:col-span-2 bg-white p-12 rounded-[3rem] border border-slate-100 shadow-sm">
                  <h3 className="text-2xl font-black text-slate-950 mb-10 tracking-tight flex items-center gap-3">
                    <Icons.Table /> {activeFilter === 'all' ? 'Próximas Entregas' : 'Resultados Filtrados'}
                  </h3>
                  <div className="space-y-6">
                    {filteredDeadlines.slice(0, 6).map(d => {
                      const level = getAlertLevel(d.data, d.status, settings.greenAlertDays);
                      return (
                        <div key={d.id} className="p-8 rounded-3xl border border-slate-100 flex justify-between items-center transition-all bg-slate-50/50">
                          <div className="flex items-center gap-6">
                             <div className={`w-3 h-12 rounded-full ${level === 'overdue' ? 'bg-red-800 animate-bounce' : level === 'critical' ? 'bg-red-500 shadow-lg shadow-red-200 animate-pulse' : level === 'urgent' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                             <div>
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">
                                  {d.empresa} {d.instituicao && `• ${d.instituicao}`}
                                </span>
                                <h4 className="font-black text-slate-900 text-lg leading-none">{d.peca}</h4>
                                <p className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase truncate max-w-[250px]">{d.assunto}</p>
                             </div>
                          </div>
                          <div className="text-right flex items-center gap-4">
                            {d.documentUrl && (
                              <a href={d.documentUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                                <Icons.ExternalLink />
                              </a>
                            )}
                            <div>
                              <span className={`text-[10px] font-black px-5 py-2 rounded-full uppercase tracking-[0.1em] ${getDaysDiff(d.data) < 0 ? 'bg-red-800' : 'bg-slate-900'} text-white`}>
                                {getDaysDiff(d.data) === 0 ? 'HOJE' : getDaysDiff(d.data) < 0 ? 'ATRASADO' : `EM ${getDaysDiff(d.data)} D`}
                              </span>
                              <p className="text-sm font-black text-slate-950 mt-3">
                                {formatLocalDate(d.data)} {d.hora && <span className="text-blue-600 ml-1">às {d.hora}</span>}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
               </div>
               <div className="bg-slate-950 p-10 rounded-[3rem] text-white shadow-2xl flex flex-col justify-between">
                  <h3 className="text-lg font-black mb-8 tracking-tight">Produtividade Geral</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={chartData} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={10} dataKey="value" stroke="none">
                          {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-8 space-y-3">
                    {chartData.map(c => (
                      <div key={c.name} className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                        <span className="flex items-center gap-3 font-bold text-slate-400 text-xs">{c.name}</span>
                        <span className="font-black text-lg">{c.value}</span>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        )}

        {view === 'reports' && (
          <div className="space-y-12 animate-in fade-in duration-500">
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 items-end">
               <div className="lg:col-span-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Advogado</label>
                  <select className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold text-sm outline-none" value={reportFilter.responsavel} onChange={e => setReportFilter(p => ({ ...p, responsavel: e.target.value }))}>
                    <option value="">TODOS</option>
                    {settings.responsaveis.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
               </div>
               <div className="lg:col-span-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Empresa</label>
                  <input className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold text-sm outline-none uppercase" placeholder="BUSCAR..." value={reportFilter.empresa} onChange={e => setReportFilter(p => ({ ...p, empresa: e.target.value }))} />
               </div>
               <div className="lg:col-span-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Status</label>
                  <select className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold text-sm outline-none" value={reportFilter.status} onChange={e => setReportFilter(p => ({ ...p, status: e.target.value }))}>
                    <option value="">TODOS</option>
                    <option value={DeadlineStatus.PENDING}>PENDENTES</option>
                    <option value={DeadlineStatus.COMPLETED}>CONCLUÍDOS</option>
                  </select>
               </div>
               <div className="lg:col-span-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">De</label>
                  <input type="date" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold text-sm outline-none" value={reportFilter.startDate} onChange={e => setReportFilter(p => ({ ...p, startDate: e.target.value }))} />
               </div>
               <div className="lg:col-span-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Até</label>
                  <input type="date" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold text-sm outline-none" value={reportFilter.endDate} onChange={e => setReportFilter(p => ({ ...p, endDate: e.target.value }))} />
               </div>
               <div className="lg:col-span-1">
                  <button onClick={() => setReportFilter({ responsavel: '', empresa: '', status: '', startDate: '', endDate: '' })} className="w-full py-4 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors">Limpar</button>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
               <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-black text-slate-900 tracking-tight">Extrato Consolidado ({reportData.length})</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-950 text-white text-[9px] uppercase font-black">
                        <tr>
                          <th className="px-8 py-5">Peça / Cliente</th>
                          <th className="px-8 py-5">Advogado</th>
                          <th className="px-8 py-5">Data</th>
                          <th className="px-8 py-5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {reportData.map(d => (
                          <tr key={d.id} className="text-xs">
                            <td className="px-8 py-5">
                              <div className="font-bold text-slate-900">{d.peca}</div>
                              <div className="text-[9px] text-slate-400 font-black uppercase mt-1">
                                {d.empresa} {d.instituicao && `• ${d.instituicao}`}
                              </div>
                            </td>
                            <td className="px-8 py-5 font-bold text-slate-600">{d.responsavel}</td>
                            <td className="px-8 py-5 font-black text-slate-900">
                              {formatLocalDate(d.data)} {d.hora && <span className="text-blue-600 text-[10px] ml-1">{d.hora}</span>}
                            </td>
                            <td className="px-8 py-5">
                              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${d.status === DeadlineStatus.COMPLETED ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{d.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
               </div>

               <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <h3 className="text-lg font-black mb-8 tracking-tight text-slate-900">Performance Individual</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={productivityData} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} style={{ fontSize: '10px', fontWeight: 'bold' }} />
                        <Tooltip />
                        <Bar dataKey="concluidos" fill={COLORS.success} radius={[0, 4, 4, 0]} barSize={12} stackId="a" name="Concluidos" />
                        <Bar dataKey="pendentes" fill={COLORS.warning} radius={[0, 4, 4, 0]} barSize={12} stackId="a" name="Pendentes" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
               </div>
            </div>
          </div>
        )}

        {view === 'deadlines' && (
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden animate-in fade-in duration-500">
             <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left">
                <thead className="bg-slate-950 text-white text-[10px] uppercase font-black tracking-[0.3em]">
                  <tr>
                    <th className="px-10 py-8">Peça Processual / Cliente</th>
                    <th className="px-10 py-8">Advogado</th>
                    <th className="px-10 py-8">Vencimento</th>
                    <th className="px-10 py-8">Estado / Alerta</th>
                    <th className="px-10 py-8 text-center">Gestão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {deadlines.length > 0 ? deadlines.sort((a,b) => new Date(a.data).getTime() - new Date(b.data).getTime()).map(d => {
                    const level = getAlertLevel(d.data, d.status, settings.greenAlertDays);
                    const diff = getDaysDiff(d.data);
                    return (
                      <tr key={d.id} className="hover:bg-slate-50/80 transition-all group">
                        <td className="px-10 py-8">
                          <div className="font-black text-slate-900 text-base leading-tight group-hover:text-blue-600 transition-colors flex items-center gap-2">
                            {d.peca}
                            {d.documentUrl && (
                              <a href={d.documentUrl} target="_blank" rel="noopener noreferrer" title="Ver Documentos" className="text-blue-500 hover:text-blue-700">
                                <Icons.ExternalLink />
                              </a>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2 mb-1">
                            {d.empresa} {d.instituicao && <span className="text-slate-300 mx-1">•</span>} {d.instituicao}
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium italic leading-relaxed max-w-lg">
                            <span className="text-[9px] font-black uppercase text-slate-300 mr-2">Objeto:</span>
                            {d.assunto}
                          </p>
                        </td>
                        <td className="px-10 py-8">
                          <span className="px-4 py-1.5 bg-slate-100 rounded-xl text-[10px] font-black text-slate-600 uppercase border border-slate-200">{d.responsavel}</span>
                        </td>
                        <td className="px-10 py-8">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-950">
                              {formatLocalDate(d.data)} 
                              {d.hora && <span className="text-blue-600 ml-1 text-[11px]">às {d.hora}</span>}
                            </span>
                            <span className="text-[9px] font-black text-slate-400 uppercase mt-1">
                              {diff < 0 ? 'Expirado' : diff === 0 ? 'Vence Hoje' : `Faltam ${diff} dias`}
                            </span>
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-3">
                            <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${d.status === DeadlineStatus.COMPLETED ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                              {d.status}
                            </span>
                            {d.status === DeadlineStatus.PENDING && (
                              <div className={`w-4 h-4 rounded-full ${level === 'overdue' ? 'bg-red-800' : level === 'critical' ? 'bg-red-500 animate-pulse' : level === 'urgent' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                            )}
                          </div>
                        </td>
                        <td className="px-10 py-8 flex justify-center gap-3">
                           {d.documentUrl && (
                             <a 
                               href={d.documentUrl} 
                               target="_blank" 
                               rel="noopener noreferrer" 
                               title="Abrir Pasta de Documentos" 
                               className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 hover:scale-110 transition-all"
                             >
                               <Icons.ExternalLink />
                             </a>
                           )}
                           <button onClick={() => {
                             setDeadlines(prev => prev.map(item => item.id === d.id ? { ...item, status: item.status === DeadlineStatus.COMPLETED ? DeadlineStatus.PENDING : DeadlineStatus.COMPLETED } : item));
                           }} className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:scale-110 transition-all"><Icons.Check /></button>
                           <button onClick={() => {
                             if (confirm("Remover este registro permanentemente?")) setDeadlines(prev => prev.filter(item => item.id !== d.id));
                           }} className="p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 hover:scale-110 transition-all"><Icons.Trash /></button>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan={5} className="p-32 text-center text-slate-300 font-black uppercase tracking-[0.4em] italic text-sm">Sem Registros</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'settings' && (
          <div className="max-w-4xl space-y-12 animate-in fade-in duration-500 pb-20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
               <div className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-sm">
                  <h3 className="text-xl font-black mb-10 flex items-center gap-3 tracking-tight text-blue-600"><Icons.Bell /> Alertas</h3>
                  <div className="space-y-10">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alerta Verde</label>
                        <span className="font-black text-blue-600 bg-blue-50 px-5 py-2 rounded-2xl">{settings.greenAlertDays} dias</span>
                      </div>
                      <input type="range" min="2" max="30" value={settings.greenAlertDays} onChange={e => setSettings(p => ({ ...p, greenAlertDays: parseInt(e.target.value) }))} className="w-full h-3 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600" />
                    </div>
                  </div>
               </div>

               <div className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-sm">
                  <h3 className="text-xl font-black mb-10 flex items-center gap-3 tracking-tight text-slate-900"><Icons.List /> Equipe</h3>
                  <div className="flex gap-4 mb-8">
                    <input className="flex-1 bg-slate-50 border border-slate-100 p-5 rounded-2xl uppercase font-black text-xs outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" id="newResp" placeholder="NOVO ADVOGADO..." />
                    <button onClick={() => {
                      const el = document.getElementById('newResp') as HTMLInputElement;
                      addItem('responsaveis', el.value);
                      el.value = '';
                    }} className="bg-slate-950 text-white px-8 rounded-2xl font-black text-[10px] uppercase hover:bg-slate-800">ADD</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {settings.responsaveis.map(r => (
                      <span key={r} className="bg-slate-100 px-5 py-3 rounded-2xl text-[10px] font-black text-slate-600 border border-slate-200 uppercase flex items-center gap-3">{r}<button onClick={() => setSettings(p => ({ ...p, responsaveis: p.responsaveis.filter(x => x !== r) }))} className="text-red-400">&times;</button></span>
                    ))}
                  </div>
               </div>

               <div className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-sm md:col-span-2">
                  <h3 className="text-xl font-black mb-10 flex items-center gap-3 tracking-tight text-slate-900"><Icons.Table /> Peças Processuais</h3>
                  <div className="flex gap-4 mb-8">
                    <input className="flex-1 bg-slate-50 border border-slate-100 p-5 rounded-2xl uppercase font-black text-xs outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" id="newPeca" placeholder="CADASTRAR NOVA PEÇA (Ex: RECURSO ESPECIAL)..." />
                    <button onClick={() => {
                      const el = document.getElementById('newPeca') as HTMLInputElement;
                      addItem('pecas', el.value);
                      el.value = '';
                    }} className="bg-blue-600 text-white px-10 rounded-2xl font-black text-[10px] uppercase hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all">Cadastrar</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {settings.pecas.map(p => (
                      <div key={p} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between items-center group transition-all hover:border-blue-200">
                        <span className="text-[10px] font-black text-slate-600 uppercase truncate pr-4">{p}</span>
                        <button onClick={() => setSettings(pState => ({ ...pState, pecas: pState.pecas.filter(x => x !== p) }))} className="text-red-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity font-bold text-lg">&times;</button>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        )}

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Prazo Processual">
          <form onSubmit={handleAddDeadline} className="grid grid-cols-2 gap-8">
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-4">Peça / Documento</label>
              <select className="w-full bg-slate-50 border border-slate-100 p-6 rounded-3xl font-black text-sm outline-none" value={newDeadline.peca} onChange={e => setNewDeadline(p => ({ ...p, peca: e.target.value }))} required>
                <option value="">SELECIONE...</option>
                {settings.pecas.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-4">Responsável</label>
              <select className="w-full bg-slate-50 border border-slate-100 p-6 rounded-3xl font-black text-sm outline-none" value={newDeadline.responsavel} onChange={e => setNewDeadline(p => ({ ...p, responsavel: e.target.value }))} required>
                <option value="">SELECIONE...</option>
                {settings.responsaveis.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-4">Cliente / Empresa</label>
              <input type="text" className="w-full bg-slate-50 border border-slate-100 p-6 rounded-3xl font-black text-sm uppercase outline-none" value={newDeadline.empresa} onChange={e => setNewDeadline(p => ({ ...p, empresa: e.target.value }))} required placeholder="NOME DO CLIENTE..." />
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-4">Instituição / Órgão</label>
              <input type="text" className="w-full bg-slate-50 border border-slate-100 p-6 rounded-3xl font-black text-sm uppercase outline-none" value={newDeadline.instituicao} onChange={e => setNewDeadline(p => ({ ...p, instituicao: e.target.value }))} placeholder="Ex: TJSP, RFB, TRF3..." />
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-4">Prazo Fatal</label>
              <input type="date" className="w-full bg-slate-50 border border-slate-100 p-6 rounded-3xl font-black text-sm outline-none" value={newDeadline.data} onChange={e => setNewDeadline(p => ({ ...p, data: e.target.value }))} required />
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-4">Hora (Opcional)</label>
              <input type="time" className="w-full bg-slate-50 border border-slate-100 p-6 rounded-3xl font-black text-sm outline-none" value={newDeadline.hora} onChange={e => setNewDeadline(p => ({ ...p, hora: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-4">Link do Drive / Documentos (Opcional)</label>
              <input type="url" className="w-full bg-slate-50 border border-slate-100 p-6 rounded-3xl font-black text-sm outline-none text-blue-600" value={newDeadline.documentUrl} onChange={e => setNewDeadline(p => ({ ...p, documentUrl: e.target.value }))} placeholder="https://drive.google.com/..." />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-4">Objeto da Ação / Providência</label>
              <textarea className="w-full bg-slate-50 border border-slate-100 p-6 rounded-3xl font-black min-h-[120px] text-sm outline-none leading-relaxed" value={newDeadline.assunto} onChange={e => setNewDeadline(p => ({ ...p, assunto: e.target.value }))} required placeholder="Descreva aqui o que deve ser feito no prazo..." />
            </div>
            <div className="col-span-2 pt-8 border-t flex justify-end gap-6">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 py-5 text-slate-400 font-black uppercase text-[10px]">Voltar</button>
              <button type="submit" className="bg-slate-950 text-white px-12 py-5 rounded-[2rem] font-black uppercase text-[10px] shadow-2xl hover:bg-slate-900 transition-all">Salvar Registro</button>
            </div>
          </form>
        </Modal>

        <Modal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} title="Sincronizar Planilha">
           <form onSubmit={handleImportSheet} className="space-y-8">
              <div className="bg-blue-50 p-8 rounded-3xl border border-blue-100">
                 <h4 className="font-black text-blue-900 mb-2">Instruções</h4>
                 <p className="text-xs text-blue-800 leading-relaxed font-bold">Publique sua planilha como CSV e cole o link abaixo.</p>
              </div>
              <input type="url" className="w-full bg-slate-50 border border-slate-100 p-6 rounded-3xl font-bold text-sm outline-none" value={sheetUrl} onChange={e => setSheetUrl(e.target.value)} placeholder="LINK DO CSV..." required />
              <div className="flex justify-end gap-4 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsSyncModalOpen(false)} className="px-8 py-5 text-slate-400 font-black uppercase text-[10px]">Cancelar</button>
                <button type="submit" className="bg-slate-950 text-white px-10 py-5 rounded-[2rem] font-black uppercase text-[10px]">Sincronizar</button>
              </div>
           </form>
        </Modal>
      </main>
    </div>
  );
}
