
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
  Legend
} from 'recharts';
import { getLegalInsights, extractDeadlineFromText } from './services/geminiService';

// --- Subcomponentes ---

const Sidebar = ({ currentView, setView }: { currentView: string, setView: (v: string) => void }) => {
  const isAiActive = !!process.env.API_KEY;
  
  return (
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
          onClick={() => setView('settings')}
          className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${currentView === 'settings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
        >
          <Icons.Settings /> <span className="font-semibold text-sm">Gestão</span>
        </button>
      </nav>
      <div className="p-6 border-t border-slate-800/50">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${isAiActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            {isAiActive ? 'IA Conectada' : 'IA Desconectada'}
          </span>
        </div>
        <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
          v1.0.6
        </div>
      </div>
    </aside>
  );
};

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

export default function App() {
  const [view, setView] = useState('dashboard');
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [insights, setInsights] = useState<string>('Aguardando dados para análise estratégica...');
  
  const [aiInputText, setAiInputText] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [showAiInput, setShowAiInput] = useState(false);

  const [settings, setSettings] = useState<NotificationSettings>({
    greenAlertDays: 5,
    enableBrowserNotifications: true,
    quietMode: false,
    responsaveis: RESPONSAVEL_OPTIONS,
    pecas: PECA_OPTIONS,
    empresas: []
  });

  const [newRespName, setNewRespName] = useState('');
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

  // Persistência
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

  // Atualizar insights quando prazos mudarem
  useEffect(() => {
    if (deadlines.length > 0) {
      getLegalInsights(deadlines).then(setInsights);
    }
  }, [deadlines]);

  const handleAiExtract = async () => {
    if (!aiInputText.trim()) return;
    setIsAiProcessing(true);
    const data = await extractDeadlineFromText(aiInputText);
    if (data) {
      setNewDeadline(prev => ({ ...prev, ...data }));
      setShowAiInput(false);
      setAiInputText('');
    } else {
      alert("Falha na extração. Verifique a chave da API no Vercel.");
    }
    setIsAiProcessing(false);
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
  };

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

  const addItem = (key: 'responsaveis' | 'empresas', value: string, setter: (v: string) => void) => {
    const val = value.trim().toUpperCase();
    if (!val || settings[key].includes(val)) return;
    setSettings(prev => ({ ...prev, [key]: [...prev[key], val] }));
    setter('');
  };

  return (
    <div className="flex bg-slate-50 min-h-screen text-slate-800 antialiased">
      <Sidebar currentView={view} setView={setView} />
      
      <main className="ml-64 flex-1 p-10">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">
              {view === 'dashboard' && 'Visão Geral'}
              {view === 'deadlines' && 'Controle Geral'}
              {view === 'settings' && 'Gestão'}
            </h2>
            <p className="text-slate-500 font-medium mt-1">Gestão Estratégica de Prazos</p>
          </div>
          <button onClick={() => { setShowAiInput(false); setIsModalOpen(true); }} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all hover:-translate-y-1">
            <Icons.Plus /> Novo Prazo
          </button>
        </div>

        {view === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* IA Insights */}
            <div className="bg-white p-8 rounded-3xl border border-blue-100 shadow-sm bg-gradient-to-r from-blue-50/50 to-indigo-50/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Icons.Sparkles /></div>
              <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2 mb-3">
                <Icons.Sparkles /> Panorama da IA
              </h3>
              <p className="text-slate-800 leading-relaxed font-medium italic relative z-10">"{insights}"</p>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: 'Total', val: stats.total, color: 'text-slate-900' },
                { label: 'Concluídos', val: stats.concluidos, color: 'text-emerald-600' },
                { label: 'Pendentes', val: stats.pendentes, color: 'text-amber-600' },
                { label: 'Atrasados', val: stats.atrasados, color: 'text-red-600' },
              ].map((card, idx) => (
                <div key={idx} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200/60">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{card.label}</p>
                  <p className={`text-4xl font-black tracking-tighter ${card.color}`}>{card.val}</p>
                </div>
              ))}
            </div>

            {/* Gráfico */}
            <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-xl font-black mb-8 text-slate-900 tracking-tight">Produtividade do Escritório</h3>
              <div className="h-80">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={8} dataKey="value" stroke="none">
                        {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 italic font-medium">Sem dados para exibição</div>
                )}
              </div>
            </div>
          </div>
        )}

        {view === 'deadlines' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-[0.2em]">
                  <tr>
                    <th className="px-8 py-6">Peça / Empresa</th>
                    <th className="px-8 py-6">Responsável</th>
                    <th className="px-8 py-6">Vencimento</th>
                    <th className="px-8 py-6">Status</th>
                    <th className="px-8 py-6 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deadlines.length > 0 ? deadlines.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="font-bold text-slate-900 leading-tight">{d.peca}</div>
                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{d.empresa}</div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-600 uppercase">{d.responsavel}</span>
                      </td>
                      <td className="px-8 py-6 font-black text-slate-900">
                        {new Date(d.data).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${d.status === DeadlineStatus.COMPLETED ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-8 py-6 flex justify-center gap-3">
                         <button onClick={() => {
                           setDeadlines(prev => prev.map(item => item.id === d.id ? { ...item, status: item.status === DeadlineStatus.COMPLETED ? DeadlineStatus.PENDING : DeadlineStatus.COMPLETED } : item));
                         }} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all"><Icons.Check /></button>
                         <button onClick={() => {
                           if (confirm("Excluir prazo?")) setDeadlines(prev => prev.filter(item => item.id !== d.id));
                         }} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all"><Icons.Trash /></button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest">Nenhum prazo registrado</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'settings' && (
          <div className="max-w-3xl space-y-10 animate-in fade-in duration-500">
            <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm">
               <h3 className="text-xl font-black mb-8 flex items-center gap-3 tracking-tight"><Icons.List /> Gestão de Responsáveis</h3>
               <div className="flex gap-4 mb-6">
                 <input className="flex-1 bg-slate-50 border border-slate-200 p-4 rounded-2xl uppercase font-bold outline-none focus:ring-2 focus:ring-blue-500" value={newRespName} onChange={e => setNewRespName(e.target.value)} placeholder="NOVO NOME..." />
                 <button onClick={() => addItem('responsaveis', newRespName, setNewRespName)} className="bg-slate-900 text-white px-8 rounded-2xl font-black hover:bg-slate-800 transition-all">ADD</button>
               </div>
               <div className="flex flex-wrap gap-2">
                 {settings.responsaveis.map(r => (
                   <span key={r} className="bg-slate-100 px-4 py-2 rounded-xl text-[10px] font-black text-slate-600 border border-slate-200 uppercase">{r}</span>
                 ))}
               </div>
            </div>

            <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm">
               <h3 className="text-xl font-black mb-8 flex items-center gap-3 tracking-tight"><Icons.Report /> Empresas / Clientes</h3>
               <div className="flex gap-4 mb-6">
                 <input className="flex-1 bg-slate-50 border border-slate-200 p-4 rounded-2xl uppercase font-bold outline-none focus:ring-2 focus:ring-blue-500" value={newEmpresaName} onChange={e => setNewEmpresaName(e.target.value)} placeholder="NOVA EMPRESA..." />
                 <button onClick={() => addItem('empresas', newEmpresaName, setNewEmpresaName)} className="bg-slate-900 text-white px-8 rounded-2xl font-black hover:bg-slate-800 transition-all">ADD</button>
               </div>
               <div className="flex flex-wrap gap-2">
                 {settings.empresas.map(e => (
                   <span key={e} className="bg-slate-100 px-4 py-2 rounded-xl text-[10px] font-black text-slate-600 border border-slate-200 uppercase">{e}</span>
                 ))}
               </div>
            </div>
          </div>
        )}

        {/* Modal de Cadastro */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Lançamento">
          <div className="mb-8">
            <button onClick={() => setShowAiInput(!showAiInput)} className="text-blue-600 text-[10px] font-black flex items-center gap-2 bg-blue-50 px-6 py-3 rounded-full uppercase tracking-widest hover:bg-blue-100 transition-all">
              <Icons.Sparkles /> {showAiInput ? 'Ocultar Assistente' : 'Preencher via E-mail (IA)'}
            </button>
            {showAiInput && (
              <div className="mt-4 animate-in zoom-in-95 duration-200">
                <textarea className="w-full p-5 bg-slate-50 rounded-2xl border border-slate-200 min-h-[150px] outline-none focus:ring-2 focus:ring-blue-500" placeholder="Cole o texto aqui..." value={aiInputText} onChange={e => setAiInputText(e.target.value)} />
                <div className="flex justify-end mt-4">
                  <button onClick={handleAiExtract} disabled={isAiProcessing} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50">
                    {isAiProcessing ? 'Processando...' : 'Extrair Dados'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleAddDeadline} className="grid grid-cols-2 gap-6">
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Peça Jurídica</label>
              <select className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold" value={newDeadline.peca} onChange={e => setNewDeadline(p => ({ ...p, peca: e.target.value }))} required>
                {settings.pecas.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Responsável</label>
              <select className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold" value={newDeadline.responsavel} onChange={e => setNewDeadline(p => ({ ...p, responsavel: e.target.value }))} required>
                {settings.responsaveis.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Cliente</label>
              <select className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold" value={newDeadline.empresa} onChange={e => setNewDeadline(p => ({ ...p, empresa: e.target.value }))} required>
                <option value="">Selecione...</option>
                {settings.empresas.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Vencimento Fatal</label>
              <input type="date" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold" value={newDeadline.data} onChange={e => setNewDeadline(p => ({ ...p, data: e.target.value }))} required />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Assunto / Descrição</label>
              <textarea className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold min-h-[80px]" value={newDeadline.assunto} onChange={e => setNewDeadline(p => ({ ...p, assunto: e.target.value }))} required />
            </div>
            <div className="col-span-2 pt-6 border-t flex justify-end gap-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-slate-400 font-black uppercase text-[10px]">Cancelar</button>
              <button type="submit" className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg">Salvar Prazo</button>
            </div>
          </form>
        </Modal>
      </main>
    </div>
  );
}
