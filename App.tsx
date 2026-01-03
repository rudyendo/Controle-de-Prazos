
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
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { getLegalInsights, extractDeadlineFromText } from './services/geminiService';

// --- Components ---

const Sidebar = ({ currentView, setView }: { currentView: string, setView: (v: string) => void }) => (
  <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col fixed left-0 top-0 z-40 shadow-xl">
    <div className="p-8 text-center">
      <h1 className="text-2xl font-black flex items-center justify-center gap-2 tracking-tighter">
        <span className="bg-blue-600 px-2 py-0.5 rounded text-white shadow-lg shadow-blue-500/20 text-lg">JC</span> JurisControl
      </h1>
    </div>
    <nav className="flex-1 px-4 mt-2 space-y-1">
      <button 
        onClick={() => setView('dashboard')}
        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${currentView === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
      >
        <Icons.Dashboard /> <span className="font-semibold text-sm">Dashboard</span>
      </button>
      <button 
        onClick={() => setView('deadlines')}
        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${currentView === 'deadlines' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
      >
        <Icons.List /> <span className="font-semibold text-sm">Controle Geral</span>
      </button>
      <button 
        onClick={() => setView('reports')}
        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${currentView === 'reports' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
      >
        <Icons.Report /> <span className="font-semibold text-sm">Relatórios</span>
      </button>
      <div className="pt-6 pb-2 px-4">
        <p className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">Configuração</p>
      </div>
      <button 
        onClick={() => setView('settings')}
        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${currentView === 'settings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
      >
        <Icons.Settings /> <span className="font-semibold text-sm">Gestão de Itens</span>
      </button>
    </nav>
    <div className="p-6 text-[10px] font-bold text-slate-600 uppercase tracking-widest border-t border-slate-800/50">
      JurisControl v1.0.3
    </div>
  </aside>
);

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children?: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
        <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
          <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">&times;</button>
        </div>
        <div className="p-8 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [view, setView] = useState('dashboard');
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [insights, setInsights] = useState<string>('Analisando prazos com Inteligência Artificial...');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [aiInputText, setAiInputText] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [showAiInput, setShowAiInput] = useState(false);

  const [settings, setSettings] = useState<NotificationSettings>({
    greenAlertDays: 5,
    enableBrowserNotifications: true,
    quietMode: false,
    spreadsheetId: '',
    responsaveis: RESPONSAVEL_OPTIONS,
    pecas: PECA_OPTIONS,
    empresas: []
  });

  const [newRespName, setNewRespName] = useState('');
  const [newPecaName, setNewPecaName] = useState('');
  const [newEmpresaName, setNewEmpresaName] = useState('');

  const [newDeadline, setNewDeadline] = useState<Partial<Deadline>>({
    peca: '',
    responsavel: '',
    empresa: '',
    instituicao: '',
    assunto: '',
    data: new Date().toISOString().split('T')[0],
    hora: '09:00',
    status: DeadlineStatus.PENDING
  });

  // Filters for Reports
  const [selectedCompany, setSelectedCompany] = useState('Todas');
  const [selectedResponsible, setSelectedResponsible] = useState('Todos');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    const saved = localStorage.getItem('juris_deadlines');
    const savedSettings = localStorage.getItem('juris_settings');
    
    let loadedDeadlines: Deadline[] = [];
    if (saved) {
      loadedDeadlines = JSON.parse(saved);
      setDeadlines(loadedDeadlines);
    } else {
      const mock: Deadline[] = [
        { id: '1', peca: 'Parecer Jurídico', responsavel: 'EDUARDO', empresa: 'SOUL', instituicao: 'Bom Jesus dos Perdões/SP', assunto: 'Rescisão contratual e violação ao devido processo legal', data: new Date().toISOString().split('T')[0], hora: '14:00', status: DeadlineStatus.COMPLETED, createdAt: new Date().toISOString() },
        { id: '2', peca: 'Mandado de Segurança', responsavel: 'EDUARDO', empresa: 'SOUL', instituicao: 'Bom Jesus dos Perdões/SP', assunto: 'Rescisão contratual e violação ao devido processo legal', data: new Date(Date.now() + 86400000).toISOString().split('T')[0], hora: '10:00', status: DeadlineStatus.PENDING, createdAt: new Date().toISOString() },
        { id: '3', peca: 'Exceção de Pré-Executividade', responsavel: 'DANILO', empresa: 'SOUL', instituicao: 'Dois Córregos/SP', assunto: 'Prazo exíguo para execução e ausência de mobilização', data: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], hora: '15:00', status: DeadlineStatus.PENDING, createdAt: new Date().toISOString() },
      ];
      loadedDeadlines = mock;
      setDeadlines(mock);
    }

    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      if (!parsed.responsaveis) parsed.responsaveis = RESPONSAVEL_OPTIONS;
      if (!parsed.pecas) parsed.pecas = PECA_OPTIONS;
      if (!parsed.empresas) {
        parsed.empresas = Array.from(new Set(loadedDeadlines.map(d => d.empresa))).filter(Boolean);
      }
      setSettings(parsed);
    }
  }, []);

  useEffect(() => {
    if (settings.pecas.length > 0 && !newDeadline.peca) {
      setNewDeadline(prev => ({ ...prev, peca: settings.pecas[0] }));
    }
    if (settings.responsaveis.length > 0 && !newDeadline.responsavel) {
      setNewDeadline(prev => ({ ...prev, responsavel: settings.responsaveis[0] }));
    }
  }, [settings]);

  const handleAiExtract = async () => {
    if (!aiInputText.trim()) return;
    setIsAiProcessing(true);
    const extractedData = await extractDeadlineFromText(aiInputText);
    if (extractedData) {
      setNewDeadline(prev => ({
        ...prev,
        ...extractedData,
        peca: settings.pecas.includes(extractedData.peca) ? extractedData.peca : (prev.peca || settings.pecas[0])
      }));
      setShowAiInput(false);
      setAiInputText('');
    } else {
      alert("Não foi possível extrair os dados.");
    }
    setIsAiProcessing(false);
  };

  const syncWithGoogleSheets = async () => {
    if (!settings.spreadsheetId) {
      alert("Informe o ID da planilha nas configurações.");
      setView('settings');
      return;
    }
    setIsSyncing(true);
    try {
      const url = `https://docs.google.com/spreadsheets/d/${settings.spreadsheetId}/gviz/tq?tqx=out:json`;
      const response = await fetch(url);
      const text = await response.text();
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      const json = JSON.parse(text.substring(start, end + 1));
      const newDeadlines: Deadline[] = json.table.rows
        .filter((row: any) => row.c && row.c[0] && row.c[0].v !== 'PEÇA') 
        .map((row: any, index: number) => {
          const c = row.c;
          return {
            id: `sheet-${index}-${Date.now()}`,
            peca: c[0]?.v || '',
            responsavel: c[1]?.v || '',
            empresa: c[2]?.v?.toString().toUpperCase() || '',
            instituicao: c[3]?.v || '',
            assunto: c[4]?.v || '',
            data: new Date().toISOString().split('T')[0],
            hora: c[6]?.v || '09:00',
            status: DeadlineStatus.PENDING,
            createdAt: new Date().toISOString()
          };
        });
      setDeadlines(newDeadlines);
      setSettings(prev => ({ ...prev, lastSync: new Date().toLocaleString() }));
    } catch (e) {
      alert("Erro ao sincronizar.");
    } finally { setIsSyncing(false); }
  };

  useEffect(() => {
    if (deadlines.length > 0) {
      getLegalInsights(deadlines).then(setInsights);
    }
  }, [deadlines]);

  useEffect(() => {
    localStorage.setItem('juris_deadlines', JSON.stringify(deadlines));
  }, [deadlines]);

  useEffect(() => {
    localStorage.setItem('juris_settings', JSON.stringify(settings));
  }, [settings]);

  const alertData = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const pending = deadlines.filter(d => d.status === DeadlineStatus.PENDING);
    return {
      today: pending.filter(d => d.data === today),
      tomorrow: pending.filter(d => d.data === tomorrow),
      urgentCount: pending.filter(d => d.data <= today).length
    };
  }, [deadlines]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      total: deadlines.length,
      concluidos: deadlines.filter(d => d.status === DeadlineStatus.COMPLETED).length,
      pendentes: deadlines.filter(d => d.status === DeadlineStatus.PENDING && d.data >= today).length,
      atrasados: deadlines.filter(d => d.status === DeadlineStatus.PENDING && d.data < today).length,
    };
  }, [deadlines]);

  const chartData = [
    { name: 'Concluídos', value: stats.concluidos, color: COLORS.success },
    { name: 'Pendentes', value: stats.pendentes, color: COLORS.warning },
    { name: 'Atrasados', value: stats.atrasados, color: COLORS.danger },
  ].filter(d => d.value > 0);

  const upcomingDeadlines = useMemo(() => {
    return deadlines
      .filter(d => d.status === DeadlineStatus.PENDING)
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
      .slice(0, 5);
  }, [deadlines]);

  const filteredDeadlines = useMemo(() => {
    return deadlines.filter(d => {
      const matchCompany = selectedCompany === 'Todas' || d.empresa === selectedCompany;
      const matchResponsible = selectedResponsible === 'Todos' || d.responsavel === selectedResponsible;
      const matchStart = !dateRange.start || d.data >= dateRange.start;
      const matchEnd = !dateRange.end || d.data <= dateRange.end;
      return matchCompany && matchResponsible && matchStart && matchEnd;
    });
  }, [deadlines, selectedCompany, selectedResponsible, dateRange]);

  const reportStats = useMemo(() => ({
    total: filteredDeadlines.length,
    concluidos: filteredDeadlines.filter(d => d.status === DeadlineStatus.COMPLETED).length,
    pendentes: filteredDeadlines.filter(d => d.status === DeadlineStatus.PENDING).length,
  }), [filteredDeadlines]);

  const handleAddDeadline = (e: React.FormEvent) => {
    e.preventDefault();
    const deadline: Deadline = {
      ...(newDeadline as Deadline),
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    };
    setDeadlines(prev => [...prev, deadline]);
    setIsModalOpen(false);
  };

  const toggleStatus = (id: string) => {
    setDeadlines(prev => prev.map(d => d.id === id ? { ...d, status: d.status === DeadlineStatus.COMPLETED ? DeadlineStatus.PENDING : DeadlineStatus.COMPLETED } : d));
  };

  const deleteDeadline = (id: string) => {
    if (confirm('Deseja excluir este prazo?')) setDeadlines(prev => prev.filter(d => d.id !== id));
  };

  const addItem = (listKey: 'responsaveis' | 'pecas' | 'empresas', value: string, setter: (v: string) => void) => {
    if (!value.trim()) return;
    const val = value.trim().toUpperCase();
    if (settings[listKey].includes(val)) return alert("Item já cadastrado.");
    setSettings(prev => ({ ...prev, [listKey]: [...prev[listKey], val] }));
    setter('');
  };

  const removeItem = (listKey: 'responsaveis' | 'pecas' | 'empresas', value: string) => {
    if (confirm(`Remover "${value}" da lista?`)) {
      setSettings(prev => ({ ...prev, [listKey]: prev[listKey].filter(v => v !== value) }));
    }
  };

  return (
    <div className="flex bg-slate-50 min-h-screen text-slate-800 antialiased">
      <Sidebar currentView={view} setView={setView} />
      
      {/* Alertas lateral - Drawer */}
      {isNotifOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsNotifOpen(false)} />
          <div className="relative w-96 bg-white shadow-2xl p-8 overflow-y-auto animate-in slide-in-from-right duration-300 rounded-l-3xl">
            <h2 className="text-2xl font-black mb-8 flex items-center gap-3 text-slate-800 tracking-tighter"><Icons.Bell /> Alertas Críticos</h2>
            {(alertData.today.length > 0 || alertData.tomorrow.length > 0) ? (
              <div className="space-y-6">
                {alertData.today.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-3">Vencem Hoje</h3>
                    {alertData.today.map(d => (
                      <div key={d.id} className="p-4 bg-red-50 border border-red-100 rounded-2xl mb-2">
                        <p className="font-bold text-red-900 text-sm leading-tight">{d.peca}</p>
                        <p className="text-[10px] font-bold text-red-700 uppercase mt-1">{d.empresa}</p>
                      </div>
                    ))}
                  </div>
                )}
                {alertData.tomorrow.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-3">Vencem Amanhã</h3>
                    {alertData.tomorrow.map(d => (
                      <div key={d.id} className="p-4 bg-amber-50 border border-amber-100 rounded-2xl mb-2">
                        <p className="font-bold text-amber-900 text-sm leading-tight">{d.peca}</p>
                        <p className="text-[10px] font-bold text-amber-700 uppercase mt-1">{d.empresa}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400"><Icons.Check /></div>
                <p className="text-slate-500 font-bold">Tudo em dia!</p>
              </div>
            )}
            <button onClick={() => setIsNotifOpen(false)} className="mt-8 w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg">Fechar</button>
          </div>
        </div>
      )}

      <main className="ml-64 flex-1 p-10">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">
              {view === 'dashboard' && 'Visão Geral'}
              {view === 'deadlines' && 'Controle Geral'}
              {view === 'reports' && 'Relatórios Dinâmicos'}
              {view === 'settings' && 'Gestão de Sistema'}
            </h2>
            <p className="text-slate-500 font-medium mt-1">
              Escritório de Advocacia • Gestão Estratégica
            </p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setIsNotifOpen(true)} className="p-4 bg-white border border-slate-200 rounded-2xl relative hover:bg-slate-50 transition-all shadow-sm group">
              <div className="group-hover:scale-110 transition-transform"><Icons.Bell /></div>
              {alertData.urgentCount > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] w-6 h-6 flex items-center justify-center rounded-full font-black animate-bounce ring-4 ring-slate-50">{alertData.urgentCount}</span>}
            </button>
            <button onClick={() => { setShowAiInput(false); setIsModalOpen(true); }} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all hover:-translate-y-1">
              <Icons.Plus /> Novo Prazo
            </button>
          </div>
        </div>

        {/* --- Dashboard View --- */}
        {view === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* ALERTAS DE HOJE E AMANHÃ (SOLICITADOS PELO USUÁRIO) */}
            {(alertData.today.length > 0 || alertData.tomorrow.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {alertData.today.length > 0 && (
                  <div className="bg-white p-8 rounded-3xl border-2 border-red-500 shadow-xl shadow-red-500/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 animate-pulse text-red-500"><Icons.AlertCircle /></div>
                    <h3 className="text-xs font-black text-red-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-600 rounded-full animate-ping" /> VENCEM HOJE ({alertData.today.length})
                    </h3>
                    <div className="space-y-3">
                      {alertData.today.map(d => (
                        <div key={d.id} className="flex justify-between items-center bg-red-50/50 p-4 rounded-2xl border border-red-100">
                          <div>
                            <p className="font-black text-slate-900 leading-tight">{d.peca}</p>
                            <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">{d.empresa} • {d.responsavel}</p>
                          </div>
                          <span className="text-xs font-black text-red-700">{d.hora}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {alertData.tomorrow.length > 0 && (
                  <div className="bg-white p-8 rounded-3xl border-2 border-amber-400 shadow-xl shadow-amber-400/10 relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-4 text-amber-400"><Icons.Clock /></div>
                    <h3 className="text-xs font-black text-amber-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                       <span className="w-2 h-2 bg-amber-400 rounded-full" /> VENCEM AMANHÃ ({alertData.tomorrow.length})
                    </h3>
                    <div className="space-y-3">
                      {alertData.tomorrow.map(d => (
                        <div key={d.id} className="flex justify-between items-center bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                          <div>
                            <p className="font-black text-slate-900 leading-tight">{d.peca}</p>
                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">{d.empresa} • {d.responsavel}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AI Insights Section */}
            <div className="bg-white p-8 rounded-3xl border border-blue-100 shadow-sm bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
              <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2 mb-3">
                <Icons.Sparkles /> Panorama Estratégico IA
              </h3>
              <p className="text-slate-800 leading-relaxed font-medium italic">"{insights}"</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: 'Total Geral', val: stats.total, color: 'text-slate-900', bg: 'bg-white' },
                { label: 'Concluídos', val: stats.concluidos, color: 'text-emerald-600', bg: 'bg-emerald-50/50' },
                { label: 'Pendentes', val: stats.pendentes, color: 'text-amber-600', bg: 'bg-amber-50/50' },
                { label: 'Atrasados', val: stats.atrasados, color: 'text-red-600', bg: 'bg-red-50/50' },
              ].map((card, idx) => (
                <div key={idx} className={`${card.bg} p-8 rounded-3xl shadow-sm border border-slate-200/60 transition-all hover:shadow-md`}>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{card.label}</p>
                  <p className={`text-5xl font-black tracking-tighter ${card.color}`}>{card.val}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Pie Chart */}
              <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="text-xl font-black mb-8 text-slate-900 tracking-tight">Status das Demandas</h3>
                <div className="h-72">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={chartData} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={8} dataKey="value" stroke="none">
                          {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 italic font-bold">Sem dados suficientes para análise</div>
                  )}
                </div>
              </div>

              {/* Upcoming List */}
              <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="text-xl font-black mb-8 text-slate-900 tracking-tight">Próximos Vencimentos</h3>
                <div className="space-y-4">
                  {upcomingDeadlines.length > 0 ? upcomingDeadlines.map(d => (
                    <div key={d.id} className="flex items-center justify-between p-5 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all hover:shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${d.data === new Date().toISOString().split('T')[0] ? 'bg-red-600 animate-pulse' : 'bg-blue-600'}`} />
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">{d.peca}</p>
                          <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider mt-0.5">{d.empresa} • {d.responsavel}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-blue-600 tracking-tight">{new Date(d.data).toLocaleDateString('pt-BR')}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{d.hora}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="py-20 text-center text-slate-400 italic font-medium">Nenhum prazo pendente no momento</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- List View --- */}
        {view === 'deadlines' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-[0.2em]">
                  <tr>
                    <th className="px-8 py-6 text-center w-20">#</th>
                    <th className="px-8 py-6">Peça / Empresa</th>
                    <th className="px-8 py-6">Responsável</th>
                    <th className="px-8 py-6">Vencimento</th>
                    <th className="px-8 py-6">Status</th>
                    <th className="px-8 py-6 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deadlines.length > 0 ? deadlines.map((d, i) => (
                    <tr key={d.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6 text-[10px] font-black text-slate-300 text-center">{i + 1}</td>
                      <td className="px-8 py-6">
                        <div className="font-bold text-slate-900 leading-tight mb-1">{d.peca}</div>
                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{d.empresa}</div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="px-3 py-1.5 bg-slate-100 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-wider">{d.responsavel}</span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="font-black text-slate-900 tracking-tight">{new Date(d.data).toLocaleDateString('pt-BR')}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{d.hora}</div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${d.status === DeadlineStatus.COMPLETED ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                          <button onClick={() => toggleStatus(d.id)} className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 shadow-sm transition-all"><Icons.Check /></button>
                          <button onClick={() => deleteDeadline(d.id)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 shadow-sm transition-all"><Icons.Trash /></button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest italic text-xs">
                        Nenhum registro encontrado no sistema
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- Reports View --- */}
        {view === 'reports' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Empresa Cliente</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-blue-500 appearance-none" value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)}>
                  <option value="Todas">TODAS AS EMPRESAS</option>
                  {settings.empresas.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Responsável</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-blue-500 appearance-none" value={selectedResponsible} onChange={(e) => setSelectedResponsible(e.target.value)}>
                  <option value="Todos">TODOS OS RESPONSÁVEIS</option>
                  {settings.responsaveis.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data Início</label>
                <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-blue-500" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data Fim</label>
                <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-blue-500" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Filtrado</p>
                  <p className="text-4xl font-black text-slate-900 tracking-tighter">{reportStats.total}</p>
                </div>
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400"><Icons.List /></div>
              </div>
              <div className="bg-emerald-50/50 p-8 rounded-3xl border border-emerald-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Concluídos</p>
                  <p className="text-4xl font-black text-emerald-600 tracking-tighter">{reportStats.concluidos}</p>
                </div>
                <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600"><Icons.Check /></div>
              </div>
              <div className="bg-amber-50/50 p-8 rounded-3xl border border-amber-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Pendentes</p>
                  <p className="text-4xl font-black text-amber-600 tracking-tighter">{reportStats.pendentes}</p>
                </div>
                <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600"><Icons.Clock /></div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                 <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Tabela de Resultados</h3>
                 <button onClick={() => window.print()} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center gap-2">
                   <Icons.Sync /> PDF / Impressão
                 </button>
               </div>
               <div className="max-h-[500px] overflow-y-auto">
                 {filteredDeadlines.length > 0 ? (
                   <table className="w-full text-left">
                     <thead className="bg-slate-50 text-slate-400 text-[9px] uppercase font-black tracking-widest">
                       <tr>
                         <th className="px-8 py-5">Peça / Empresa</th>
                         <th className="px-8 py-5">Responsável</th>
                         <th className="px-8 py-5">Data / Hora</th>
                         <th className="px-8 py-5 text-right">Status</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {filteredDeadlines.map(d => (
                         <tr key={d.id} className="hover:bg-slate-50/20 transition-colors">
                           <td className="px-8 py-5">
                             <div className="font-bold text-slate-800 text-sm leading-tight">{d.peca}</div>
                             <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{d.empresa}</div>
                           </td>
                           <td className="px-8 py-5">
                             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{d.responsavel}</span>
                           </td>
                           <td className="px-8 py-5">
                             <div className="text-sm font-black text-slate-700">{new Date(d.data).toLocaleDateString('pt-BR')}</div>
                             <div className="text-[10px] text-slate-400 font-bold uppercase">{d.hora}</div>
                           </td>
                           <td className="px-8 py-5 text-right">
                             <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${d.status === DeadlineStatus.COMPLETED ? 'text-emerald-600' : 'text-amber-600'}`}>
                               {d.status}
                             </span>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 ) : (
                   <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest italic text-xs">
                     Nenhum registro para exibir com estes filtros.
                   </div>
                 )}
               </div>
            </div>
          </div>
        )}

        {/* --- Settings View --- */}
        {view === 'settings' && (
          <div className="max-w-4xl space-y-10 pb-20 animate-in fade-in duration-500">
            {/* Responsáveis */}
            <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-xl font-black mb-8 flex items-center gap-3 tracking-tight"><Icons.List /> Gestão de Responsáveis</h3>
              <div className="flex gap-4 mb-8">
                <input className="flex-1 bg-slate-50 border border-slate-200 p-4 rounded-2xl uppercase font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" value={newRespName} onChange={e => setNewRespName(e.target.value)} placeholder="NOVO NOME..." />
                <button onClick={() => addItem('responsaveis', newRespName, setNewRespName)} className="bg-slate-900 text-white px-8 rounded-2xl font-black hover:bg-slate-800 transition-all shadow-lg">ADICIONAR</button>
              </div>
              <div className="flex flex-wrap gap-3">
                {settings.responsaveis.map(r => (
                  <span key={r} className="bg-slate-100 px-5 py-3 rounded-2xl text-[10px] font-black text-slate-700 flex items-center gap-3 border border-slate-200/50 uppercase tracking-widest">
                    {r} <button onClick={() => removeItem('responsaveis', r)} className="text-red-400 hover:text-red-600 font-black p-1">&times;</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Peças */}
            <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-xl font-black mb-8 flex items-center gap-3 tracking-tight"><Icons.Table /> Peças Jurídicas</h3>
              <div className="flex gap-4 mb-8">
                <input className="flex-1 bg-slate-50 border border-slate-200 p-4 rounded-2xl uppercase font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" value={newPecaName} onChange={e => setNewPecaName(e.target.value)} placeholder="NOVA PEÇA..." />
                <button onClick={() => addItem('pecas', newPecaName, setNewPecaName)} className="bg-slate-900 text-white px-8 rounded-2xl font-black hover:bg-slate-800 transition-all shadow-lg">ADICIONAR</button>
              </div>
              <div className="flex flex-wrap gap-3">
                {settings.pecas.map(p => (
                  <span key={p} className="bg-slate-100 px-5 py-3 rounded-2xl text-[10px] font-black text-slate-700 flex items-center gap-3 border border-slate-200/50 uppercase tracking-widest">
                    {p} <button onClick={() => removeItem('pecas', p)} className="text-red-400 hover:text-red-600 font-black p-1">&times;</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Empresas */}
            <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-xl font-black mb-8 flex items-center gap-3 tracking-tight"><Icons.Report /> Empresas / Clientes</h3>
              <div className="flex gap-4 mb-8">
                <input className="flex-1 bg-slate-50 border border-slate-200 p-4 rounded-2xl uppercase font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" value={newEmpresaName} onChange={e => setNewEmpresaName(e.target.value)} placeholder="NOVA EMPRESA..." />
                <button onClick={() => addItem('empresas', newEmpresaName, setNewEmpresaName)} className="bg-slate-900 text-white px-8 rounded-2xl font-black hover:bg-slate-800 transition-all shadow-lg">ADICIONAR</button>
              </div>
              <div className="flex flex-wrap gap-3">
                {settings.empresas.map(e => (
                  <span key={e} className="bg-slate-100 px-5 py-3 rounded-2xl text-[10px] font-black text-slate-700 flex items-center gap-3 border border-slate-200/50 uppercase tracking-widest">
                    {e} <button onClick={() => removeItem('empresas', e)} className="text-red-400 hover:text-red-600 font-black p-1">&times;</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Sheets */}
            <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-xl font-black mb-4 tracking-tight">Sync Planilha Externa</h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-6">ID da Planilha Google (Opcional)</p>
              <input className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl mb-6 font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-inner" placeholder="ID DA PLANILHA..." value={settings.spreadsheetId} onChange={e => setSettings(prev => ({ ...prev, spreadsheetId: e.target.value }))} />
              <button onClick={syncWithGoogleSheets} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all">Sincronizar Agora</button>
            </div>
          </div>
        )}

        {/* --- Modal Cadastro --- */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Prazo Processual">
          <div className="mb-8">
            <button 
              onClick={() => setShowAiInput(!showAiInput)} 
              className="text-blue-600 text-[10px] font-black flex items-center gap-2 bg-blue-50 px-5 py-2.5 rounded-full uppercase tracking-[0.15em] hover:bg-blue-100 transition-all shadow-sm ring-1 ring-blue-100"
            >
              <Icons.Sparkles /> {showAiInput ? 'Ocultar Assistente' : 'Extrair de E-mail / Texto (IA)'}
            </button>
            {showAiInput && (
              <div className="mt-6 p-6 bg-blue-50/50 rounded-3xl border border-blue-100 animate-in zoom-in-95 shadow-inner">
                <textarea 
                  className="w-full p-5 text-sm rounded-2xl border border-blue-100 bg-white min-h-[140px] shadow-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium" 
                  placeholder="Cole o conteúdo da solicitação aqui para análise da Inteligência Artificial..." 
                  value={aiInputText} 
                  onChange={e => setAiInputText(e.target.value)} 
                />
                <div className="flex justify-end mt-4">
                  <button 
                    onClick={handleAiExtract} 
                    disabled={isAiProcessing || !aiInputText.trim()} 
                    className="bg-blue-600 text-white text-[10px] px-8 py-3 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 disabled:opacity-50"
                  >
                    {isAiProcessing ? 'Processando...' : 'Analisar e Preencher'}
                  </button>
                </div>
              </div>
            )}
          </div>
          <form onSubmit={handleAddDeadline} className="grid grid-cols-2 gap-8">
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Peça Jurídica</label>
              <select className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" value={newDeadline.peca} onChange={e => setNewDeadline(prev => ({ ...prev, peca: e.target.value }))} required>
                {settings.pecas.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Responsável</label>
              <select className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" value={newDeadline.responsavel} onChange={e => setNewDeadline(prev => ({ ...prev, responsavel: e.target.value }))} required>
                {settings.responsaveis.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Empresa Cliente</label>
              <select className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" value={newDeadline.empresa} onChange={e => setNewDeadline(prev => ({ ...prev, empresa: e.target.value }))} required>
                <option value="">Selecione...</option>
                {settings.empresas.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Vencimento Fetal</label>
              <input type="date" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" value={newDeadline.data} onChange={e => setNewDeadline(prev => ({ ...prev, data: e.target.value }))} required />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descrição / Assunto</label>
              <textarea className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]" value={newDeadline.assunto} onChange={e => setNewDeadline(prev => ({ ...prev, assunto: e.target.value }))} required />
            </div>
            <div className="col-span-2 flex justify-end gap-5 mt-8 border-t pt-8">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 rounded-2xl transition-all">Cancelar</button>
              <button type="submit" className="px-12 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all">Salvar Prazo</button>
            </div>
          </form>
        </Modal>
      </main>
    </div>
  );
}
