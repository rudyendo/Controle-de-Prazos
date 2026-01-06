
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Deadline, 
  DeadlineStatus,
  NotificationSettings,
  AuthUser
} from './types';
import { 
  Icons, 
  PECA_OPTIONS as INITIAL_PECAS, 
  RESPONSAVEL_OPTIONS as INITIAL_RESPONSAVEIS,
  EMPRESA_OPTIONS as INITIAL_EMPRESAS
} from './constants';
import { suggestActionObject } from './services/geminiService';

// Gráficos
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

// Firebase Imports
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  onSnapshot,
  setDoc
} from "firebase/firestore";

// CONFIGURAÇÃO DO USUÁRIO
const firebaseConfig = {
  apiKey: "AIzaSyBaaw8h1UNCjuBeyea6s9XqxCaP2feaM3U",
  authDomain: "juriscontrolendo.firebaseapp.com",
  projectId: "juriscontrolendo",
  storageBucket: "juriscontrolendo.firebasestorage.app",
  messagingSenderId: "824104145702",
  appId: "1:824104145702:web:1a65ea986f11b6ea46e7e7",
  measurementId: "G-BD9N4W5JXS"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Utilitários ---
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

// --- Componentes ---
const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white/95 backdrop-blur-xl w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col relative animate-in zoom-in-95 duration-200 border border-white/20">
        <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div className="p-10 overflow-y-auto flex-1 custom-scrollbar">{children}</div>
      </div>
    </div>
  );
};

const AuthScreen = ({ onLogin, loading }: { onLogin: (email: string, pass: string, isSignUp: boolean) => void, loading: boolean }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="fixed inset-0 bg-[#020617] flex items-center justify-center z-[100] p-6">
      <div className="bg-white/5 backdrop-blur-xl p-12 rounded-[2.5rem] w-full max-w-md border border-white/10 shadow-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/20 mb-6 text-white text-2xl font-black italic">JC</div>
          <h2 className="text-2xl font-black text-white tracking-tighter">JurisControl</h2>
          <p className="text-slate-500 font-bold uppercase text-[9px] tracking-[0.2em] mt-2">Legal Performance System</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onLogin(email, password, isSignUp); }} className="space-y-4">
          <input type="email" required className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600" placeholder="E-mail profissional" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" required className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} />
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-5 rounded-2xl font-bold text-sm uppercase tracking-widest transition-all disabled:opacity-50 mt-4">
            {loading ? 'Sincronizando...' : isSignUp ? 'Criar Nova Conta' : 'Acessar Painel'}
          </button>
        </form>
        <button onClick={() => setIsSignUp(!isSignUp)} className="w-full mt-8 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-white transition-colors">
          {isSignUp ? 'Já possui acesso? Entrar' : 'Solicitar novo acesso corporativo'}
        </button>
      </div>
    </div>
  );
};

const Sidebar = ({ currentView, setView, user, onLogout }: { currentView: string, setView: (v: string) => void, user: AuthUser | null, onLogout: () => void }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Início', icon: <Icons.Dashboard /> },
    { id: 'deadlines', label: 'Prazos Ativos', icon: <Icons.List /> },
    { id: 'reports', label: 'Estatísticas', icon: <Icons.Report /> },
    { id: 'settings', label: 'Configurações', icon: <Icons.Settings /> },
  ];

  return (
    <aside className="w-[280px] bg-[#020617] text-white min-h-screen flex flex-col fixed left-0 top-0 z-40 border-r border-slate-800/50">
      <div className="p-10 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xl italic shadow-lg shadow-blue-500/20">JC</div>
        <h1 className="text-xl font-black tracking-tight">JurisControl</h1>
      </div>
      
      <nav className="flex-1 px-6 space-y-1">
        {menuItems.map(item => (
          <button 
            key={item.id}
            onClick={() => setView(item.id)} 
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-200 group ${currentView === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
          >
            <span className={`${currentView === item.id ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>{item.icon}</span>
            <span className="font-bold text-[13px] tracking-tight">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-10 mt-auto">
        {user && (
          <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Usuário Logado</p>
            <p className="text-[11px] font-bold text-white mb-3 truncate">{user.email}</p>
            <button onClick={onLogout} className="text-[10px] font-black uppercase text-red-500 hover:text-red-400 transition-colors flex items-center gap-2">
              <Icons.Trash /> Desconectar
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default function App() {
  const [view, setView] = useState('dashboard');
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  
  const [reportFilters, setReportFilters] = useState({
    empresa: '',
    responsavel: '',
    dataInicio: '',
    dataFim: ''
  });

  const [dynamicSettings, setDynamicSettings] = useState<NotificationSettings>({
    greenAlertDays: 5,
    yellowAlertDays: 1,
    enableBrowserNotifications: true,
    notificationFrequency: 'always',
    quietMode: false,
    responsaveis: INITIAL_RESPONSAVEIS,
    pecas: INITIAL_PECAS,
    empresas: INITIAL_EMPRESAS 
  });

  const [newDeadline, setNewDeadline] = useState<Partial<Deadline>>({
    peca: '', responsavel: '', empresa: '', assunto: '',
    data: new Date().toISOString().split('T')[0], status: DeadlineStatus.PENDING,
    documentUrl: ''
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({ uid: firebaseUser.uid, email: firebaseUser.email, displayName: firebaseUser.displayName });
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const settingsRef = doc(db, "settings", user.uid);
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        setDynamicSettings(prev => ({ ...prev, ...docSnap.data() }));
      } else {
        setDoc(settingsRef, {
          responsaveis: INITIAL_RESPONSAVEIS,
          pecas: INITIAL_PECAS,
          empresas: INITIAL_EMPRESAS
        });
      }
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setIsSyncing(true);
    const q = query(collection(db, "deadlines"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedDeadlines = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Deadline[];
      setDeadlines(loadedDeadlines.sort((a, b) => a.data.localeCompare(b.data)));
      setIsSyncing(false);
    }, (error) => {
      console.error("Firestore error:", error);
      setIsSyncing(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogin = async (email: string, pass: string, isSignUp: boolean) => {
    setAuthLoading(true);
    try {
      if (isSignUp) await createUserWithEmailAndPassword(auth, email, pass);
      else await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) { alert("Erro: " + err.message); }
    finally { setAuthLoading(false); }
  };

  const handleAddDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, "deadlines"), {
        ...newDeadline,
        userId: user.uid,
        createdAt: new Date().toISOString(),
        status: DeadlineStatus.PENDING
      });
      setIsModalOpen(false);
      setNewDeadline({ 
        peca: '', 
        responsavel: '', 
        empresa: '', 
        assunto: '',
        data: new Date().toISOString().split('T')[0], 
        status: DeadlineStatus.PENDING,
        documentUrl: '' 
      });
    } catch (err: any) { alert("Erro ao salvar: " + err.message); }
  };

  const updateSettings = async (field: keyof NotificationSettings, newValue: any) => {
    if (!user) return;
    const settingsRef = doc(db, "settings", user.uid);
    await updateDoc(settingsRef, { [field]: newValue });
  };

  const toggleStatus = async (d: Deadline) => {
    const newS = d.status === DeadlineStatus.COMPLETED ? DeadlineStatus.PENDING : DeadlineStatus.COMPLETED;
    await updateDoc(doc(db, "deadlines", d.id), { status: newS });
  };

  const deleteDeadline = async (id: string) => {
    if (confirm("Remover permanentemente?")) await deleteDoc(doc(db, "deadlines", id));
  };

  // Dados para os Gráficos
  const chartData = useMemo(() => {
    const completed = deadlines.filter(d => d.status === DeadlineStatus.COMPLETED).length;
    const pending = deadlines.filter(d => d.status === DeadlineStatus.PENDING).length;
    return [
      { name: 'Concluídos', value: completed, color: '#10b981' },
      { name: 'Pendentes', value: pending, color: '#f59e0b' }
    ];
  }, [deadlines]);

  const stats = useMemo(() => ({
    atrasados: deadlines.filter(d => d.status === DeadlineStatus.PENDING && getDaysDiff(d.data) < 0).length,
    fatais: deadlines.filter(d => d.status === DeadlineStatus.PENDING && getDaysDiff(d.data) === 0).length,
    amanha: deadlines.filter(d => d.status === DeadlineStatus.PENDING && getDaysDiff(d.data) === 1).length,
    prox5dias: deadlines.filter(d => d.status === DeadlineStatus.PENDING && getDaysDiff(d.data) > 1 && getDaysDiff(d.data) <= 5).length,
  }), [deadlines]);

  const filteredDeadlines = useMemo(() => {
    return deadlines.filter(d => {
      const matchEmpresa = !reportFilters.empresa || d.empresa === reportFilters.empresa;
      const matchResponsavel = !reportFilters.responsavel || d.responsavel === reportFilters.responsavel;
      const matchInicio = !reportFilters.dataInicio || d.data >= reportFilters.dataInicio;
      const matchFim = !reportFilters.dataFim || d.data <= reportFilters.dataFim;
      return matchEmpresa && matchResponsavel && matchInicio && matchFim;
    });
  }, [deadlines, reportFilters]);

  if (authLoading) return <div className="fixed inset-0 bg-[#020617] flex items-center justify-center text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em]">Iniciando Motor de Prazos...</div>;
  if (!user) return <AuthScreen onLogin={handleLogin} loading={authLoading} />;

  return (
    <div className="flex bg-[#F8FAFC] min-h-screen antialiased">
      <Sidebar currentView={view} setView={setView} user={user} onLogout={() => signOut(auth)} />
      
      <main className="ml-[280px] flex-1 p-16">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-5xl font-black text-[#0F172A] tracking-tighter mb-2">
              {view === 'dashboard' ? 'Painel Executivo' : view === 'deadlines' ? 'Controle de Prazos' : view === 'reports' ? 'Insights Jurídicos' : 'Gestão de Sistema'}
            </h2>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full animate-pulse ${isSyncing ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sincronização Cloud Ativa</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black text-sm shadow-2xl shadow-blue-600/30 hover:bg-blue-700 hover:scale-[1.02] transition-all active:scale-95 flex items-center gap-3">
               <Icons.Plus /> Registrar Prazo
             </button>
          </div>
        </header>

        {view === 'dashboard' && (
          <div className="animate-in fade-in duration-500">
             <section className="grid grid-cols-4 gap-6 mb-12">
                <div className="bg-white p-8 rounded-[2rem] border-l-4 border-red-600 shadow-sm radar-card">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">ATRASADOS</p>
                  <span className="text-5xl font-black text-[#0F172A] tracking-tighter">{stats.atrasados}</span>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border-l-4 border-amber-600 shadow-sm radar-card">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">VENCEM HOJE</p>
                  <span className="text-5xl font-black text-[#0F172A] tracking-tighter">{stats.fatais}</span>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border-l-4 border-blue-500 shadow-sm radar-card">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">AMANHÃ</p>
                  <span className="text-5xl font-black text-[#0F172A] tracking-tighter">{stats.amanha}</span>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border-l-4 border-emerald-500 shadow-sm radar-card">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">CONCLUÍDOS</p>
                  <span className="text-5xl font-black text-[#0F172A] tracking-tighter">{deadlines.filter(d => d.status === DeadlineStatus.COMPLETED).length}</span>
                </div>
             </section>

             <div className="grid grid-cols-12 gap-8">
                {/* Gráfico de Visão Geral */}
                <div className="col-span-4 bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center">
                    <h3 className="text-lg font-black text-[#0F172A] mb-8 w-full">Balanço de Operação</h3>
                    <div className="w-full h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={8}
                            dataKey="value"
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex gap-6 mt-4">
                        <div className="flex items-center gap-2">
                           <div className="w-3 h-3 rounded-full bg-emerald-500" />
                           <span className="text-[10px] font-black text-slate-400 uppercase">Feitos</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="w-3 h-3 rounded-full bg-amber-500" />
                           <span className="text-[10px] font-black text-slate-400 uppercase">Pendentes</span>
                        </div>
                    </div>
                </div>

                {/* Próximas Entregas */}
                <div className="col-span-8 bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-10">
                      <h3 className="text-xl font-black text-[#0F172A] flex items-center gap-4">
                        <Icons.Clock /> Prioridades da Semana
                      </h3>
                    </div>
                    <div className="space-y-4">
                      {deadlines.filter(d => d.status === DeadlineStatus.PENDING).slice(0, 4).map(d => (
                        <div key={d.id} className="flex justify-between items-center p-6 bg-slate-50/50 rounded-2xl border border-transparent hover:border-blue-100 transition-all group">
                          <div className="flex-1">
                            <p className="text-[9px] font-black text-blue-500 uppercase mb-1 tracking-wider">{d.empresa}</p>
                            <h4 className="font-bold text-slate-900 text-base">{d.peca}</h4>
                          </div>
                          <div className="flex items-center gap-8">
                            <div className="text-right">
                              <p className="font-black text-slate-900 text-sm">{formatLocalDate(d.data)}</p>
                              <p className={`text-[8px] font-black uppercase ${getDaysDiff(d.data) <= 1 ? 'text-red-500' : 'text-slate-400'}`}>
                                {getDaysDiff(d.data) === 0 ? 'Vence Hoje' : getDaysDiff(d.data) < 0 ? 'Expirado' : `Em ${getDaysDiff(d.data)} dias`}
                              </p>
                            </div>
                            <button onClick={() => toggleStatus(d)} className="p-4 bg-white text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm border border-slate-100">
                              <Icons.Check />
                            </button>
                          </div>
                        </div>
                      ))}
                      {deadlines.filter(d => d.status === DeadlineStatus.PENDING).length === 0 && (
                        <div className="text-center py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100">
                          <p className="text-slate-300 font-bold uppercase italic tracking-widest text-xs">Céu limpo: Nenhum prazo pendente</p>
                        </div>
                      )}
                    </div>
                </div>
             </div>
          </div>
        )}

        {view === 'deadlines' && (
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
             <div className="divide-y divide-slate-50">
                {deadlines.map(d => (
                  <div key={d.id} className="p-10 flex justify-between items-center hover:bg-slate-50/50 transition-all">
                    <div className="flex-1 pr-10">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-black text-[#0F172A] text-xl tracking-tight">{d.peca}</span>
                        <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase ${d.status === DeadlineStatus.COMPLETED ? 'bg-emerald-100 text-emerald-700' : getDaysDiff(d.data) < 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {d.status === DeadlineStatus.COMPLETED ? 'Finalizado' : getDaysDiff(d.data) < 0 ? 'Atrasado' : 'Pendente'}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{d.empresa} • {d.responsavel}</p>
                      <p className="mt-4 text-slate-600 text-sm italic line-clamp-2">"{d.assunto}"</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right min-w-[140px] mr-4">
                         <p className="font-black text-[#0F172A] text-lg">{formatLocalDate(d.data)}</p>
                         <p className={`text-[10px] font-black uppercase mt-1 ${getDaysDiff(d.data) < 0 && d.status !== DeadlineStatus.COMPLETED ? 'text-red-500' : 'text-blue-500'}`}>
                            {d.status === DeadlineStatus.COMPLETED ? 'Entrega OK' : getDaysDiff(d.data) < 0 ? 'Prazo Perdido' : getDaysDiff(d.data) === 0 ? 'Último Dia' : `Faltam ${getDaysDiff(d.data)} dias`}
                         </p>
                      </div>
                      <div className="flex gap-2">
                        {d.documentUrl && (
                          <a href={d.documentUrl} target="_blank" rel="noopener noreferrer" className="p-4 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Icons.ExternalLink /></a>
                        )}
                        <button onClick={() => toggleStatus(d)} className="p-4 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"><Icons.Check /></button>
                        <button onClick={() => deleteDeadline(d.id)} className="p-4 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Icons.Trash /></button>
                      </div>
                    </div>
                  </div>
                ))}
                {deadlines.length === 0 && (
                   <div className="text-center py-40">
                      <div className="inline-flex p-6 bg-slate-50 rounded-full mb-6 text-slate-200"><Icons.List /></div>
                      <p className="text-slate-300 font-black uppercase italic tracking-[0.3em]">Lista de prazos vazia</p>
                   </div>
                )}
             </div>
          </div>
        )}

        {view === 'reports' && (
          <div className="animate-in fade-in duration-500 space-y-8">
             <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                   <Icons.Settings /> REFINAR ANÁLISE
                </h3>
                <div className="grid grid-cols-4 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Cliente</label>
                      <select 
                        className="w-full bg-slate-50 p-5 rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-100 transition-all border-none"
                        value={reportFilters.empresa}
                        onChange={e => setReportFilters(p => ({ ...p, empresa: e.target.value }))}
                      >
                         <option value="">Todos</option>
                         {dynamicSettings.empresas.map(emp => <option key={emp} value={emp}>{emp}</option>)}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Advogado</label>
                      <select 
                        className="w-full bg-slate-50 p-5 rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-100 transition-all border-none"
                        value={reportFilters.responsavel}
                        onChange={e => setReportFilters(p => ({ ...p, responsavel: e.target.value }))}
                      >
                         <option value="">Todos</option>
                         {dynamicSettings.responsaveis.map(resp => <option key={resp} value={resp}>{resp}</option>)}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">De</label>
                      <input type="date" className="w-full bg-slate-50 p-5 rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-100 border-none" value={reportFilters.dataInicio} onChange={e => setReportFilters(p => ({ ...p, dataInicio: e.target.value }))} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Até</label>
                      <input type="date" className="w-full bg-slate-50 p-5 rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-100 border-none" value={reportFilters.dataFim} onChange={e => setReportFilters(p => ({ ...p, dataFim: e.target.value }))} />
                   </div>
                </div>
             </div>

             <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/20">
                   <div>
                      <h3 className="text-xl font-black text-[#0F172A]">Resultados Filtrados</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase mt-1">{filteredDeadlines.length} registros no período</p>
                   </div>
                   <div className="flex gap-3">
                      <button onClick={() => window.print()} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-slate-800 transition-all">Gerar Relatório PDF</button>
                   </div>
                </div>
                <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                   {filteredDeadlines.map(d => (
                     <div key={d.id} className="p-8 flex justify-between items-center border-b border-slate-50 last:border-0">
                        <div className="flex-1">
                           <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{d.empresa} • {d.responsavel}</p>
                           <h4 className="font-bold text-slate-900">{d.peca}</h4>
                        </div>
                        <div className="text-right flex items-center gap-10">
                           <div className="text-right">
                              <p className="font-black text-slate-900 text-sm">{formatLocalDate(d.data)}</p>
                              <span className={`text-[8px] font-black uppercase ${d.status === DeadlineStatus.COMPLETED ? 'text-emerald-500' : 'text-amber-500'}`}>{d.status}</span>
                           </div>
                           <Icons.ExternalLink />
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        {view === 'settings' && (
          <div className="grid grid-cols-3 gap-8 animate-in fade-in duration-500">
             <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h3 className="text-lg font-black mb-6">Advogados / Time</h3>
                <div className="space-y-3">
                   {dynamicSettings.responsaveis.map((r, i) => (
                      <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                         <span className="font-bold text-sm text-slate-700">{r}</span>
                         <button onClick={() => updateSettings('responsaveis', dynamicSettings.responsaveis.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600"><Icons.Trash /></button>
                      </div>
                   ))}
                   <button onClick={() => {
                      const n = prompt("Nome do Advogado:");
                      if(n) updateSettings('responsaveis', [...dynamicSettings.responsaveis, n.toUpperCase()]);
                   }} className="w-full p-4 border-2 border-dashed border-slate-100 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50 transition-all">+ Adicionar</button>
                </div>
             </div>
             {/* Similares para Empresas e Peças seriam replicados aqui */}
          </div>
        )}

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Registro Processual">
          <form onSubmit={handleAddDeadline} className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Tipo de Documento</label>
              <select className="w-full bg-slate-50 p-6 rounded-2xl font-bold text-sm outline-none border-none focus:ring-4 focus:ring-blue-100 transition-all" value={newDeadline.peca} onChange={e => setNewDeadline(p => ({ ...p, peca: e.target.value }))} required>
                <option value="">Selecione...</option>
                {dynamicSettings.pecas.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Cliente / Empresa</label>
              <select className="w-full bg-slate-50 p-6 rounded-2xl font-bold text-sm outline-none border-none focus:ring-4 focus:ring-blue-100 transition-all" value={newDeadline.empresa} onChange={e => setNewDeadline(p => ({ ...p, empresa: e.target.value }))} required>
                <option value="">Selecione...</option>
                {dynamicSettings.empresas.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Vencimento Improrrogável</label>
              <input type="date" className="w-full bg-slate-50 p-6 rounded-2xl font-bold text-sm outline-none border-none focus:ring-4 focus:ring-blue-100 transition-all" value={newDeadline.data} onChange={e => setNewDeadline(p => ({ ...p, data: e.target.value }))} required />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Responsável Técnico</label>
              <select className="w-full bg-slate-50 p-6 rounded-2xl font-bold text-sm outline-none border-none focus:ring-4 focus:ring-blue-100 transition-all" value={newDeadline.responsavel} onChange={e => setNewDeadline(p => ({ ...p, responsavel: e.target.value }))} required>
                <option value="">Selecione...</option>
                {dynamicSettings.responsaveis.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="col-span-2 space-y-4">
              <div className="flex justify-between items-center ml-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Objeto da Providência</label>
                <button 
                  type="button" 
                  disabled={isSuggesting || !newDeadline.peca || !newDeadline.empresa}
                  onClick={async () => {
                    setIsSuggesting(true);
                    const suggestion = await suggestActionObject(newDeadline.peca!, newDeadline.empresa!);
                    setNewDeadline(prev => ({ ...prev, assunto: suggestion }));
                    setIsSuggesting(false);
                  }}
                  className={`text-[9px] font-black uppercase flex items-center gap-2 px-4 py-2 rounded-full transition-all ${isSuggesting ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white'}`}
                >
                  <Icons.Sparkles /> {isSuggesting ? 'Pensando...' : 'Sugerir com IA'}
                </button>
              </div>
              <textarea className="w-full bg-slate-50 p-8 rounded-3xl font-medium text-sm outline-none min-h-[120px] focus:ring-4 focus:ring-blue-100 border-none transition-all" placeholder="Detalhes técnicos do prazo..." value={newDeadline.assunto} onChange={e => setNewDeadline(p => ({ ...p, assunto: e.target.value }))} required />
            </div>
            <button type="submit" className="col-span-2 bg-slate-950 text-white p-7 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-blue-600 transition-all shadow-xl">Registrar Prazo no Radar</button>
          </form>
        </Modal>
      </main>
    </div>
  );
}