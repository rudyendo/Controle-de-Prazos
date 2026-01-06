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
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2rem] shadow-2xl flex flex-col relative animate-in zoom-in-95 duration-200">
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
    { id: 'dashboard', label: 'Dashboard', icon: <Icons.Dashboard /> },
    { id: 'deadlines', label: 'Controle Geral', icon: <Icons.List /> },
    { id: 'reports', label: 'Relatórios', icon: <Icons.Report /> },
    { id: 'settings', label: 'Gestão', icon: <Icons.Settings /> },
  ];

  return (
    <aside className="w-[280px] bg-[#020617] text-white min-h-screen flex flex-col fixed left-0 top-0 z-40">
      <div className="p-10 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xl italic shadow-lg shadow-blue-500/20">JC</div>
        <h1 className="text-xl font-black tracking-tight">JurisControl</h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map(item => (
          <button 
            key={item.id}
            onClick={() => setView(item.id)} 
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-200 group ${currentView === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <span className={`${currentView === item.id ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>{item.icon}</span>
            <span className="font-bold text-[14px]">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-10 mt-auto border-t border-white/5 space-y-6">
        {user && (
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Logado como:</p>
            <p className="text-[11px] font-bold text-slate-300 truncate opacity-90" title={user.email || ''}>
              {user.email}
            </p>
          </div>
        )}

        {user && (
          <button onClick={onLogout} className="text-[10px] font-black text-red-500 uppercase hover:text-red-400 transition-colors tracking-widest flex items-center gap-2">
            Desconectar
          </button>
        )}

        <p className="text-[9px] font-medium text-slate-600 italic">
          Criado por Rudy Endo (Versão 1.1.10)
        </p>
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
  const [editingDeadlineId, setEditingDeadlineId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  
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
    peca: '', responsavel: '', empresa: '', assunto: '', instituicao: '',
    data: new Date().toISOString().split('T')[0], hora: '', status: DeadlineStatus.PENDING,
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
        const data = docSnap.data();
        setDynamicSettings(prev => ({
          ...prev,
          ...data,
          responsaveis: data.responsaveis || INITIAL_RESPONSAVEIS,
          pecas: data.pecas || INITIAL_PECAS,
          empresas: data.empresas || INITIAL_EMPRESAS
        }));
        setPermissionError(null);
      } else {
        setDoc(settingsRef, {
          userId: user.uid,
          responsaveis: INITIAL_RESPONSAVEIS,
          pecas: INITIAL_PECAS,
          empresas: INITIAL_EMPRESAS
        }).catch(err => {
          if (err.code === 'permission-denied') {
            setPermissionError("Não foi possível criar as configurações iniciais devido às Rules do Firestore.");
          }
        });
      }
    }, (error) => {
      if (error.code === 'permission-denied') {
        setPermissionError("Permissão negada para ler configurações.");
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
      setPermissionError(null);
    }, (error) => {
      setIsSyncing(false);
      if (error.code === 'permission-denied') {
        setPermissionError("Permissão negada para acessar os prazos.");
      }
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

  const resetDeadlineForm = () => {
    setNewDeadline({ 
      peca: '', responsavel: '', empresa: '', assunto: '', instituicao: '',
      data: new Date().toISOString().split('T')[0], hora: '',
      status: DeadlineStatus.PENDING, documentUrl: '' 
    });
    setEditingDeadlineId(null);
  };

  const handleEditClick = (d: Deadline) => {
    setEditingDeadlineId(d.id);
    setNewDeadline({ ...d });
    setIsModalOpen(true);
  };

  const handleAddDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      if (editingDeadlineId) {
        const { id, ...updateData } = newDeadline as Deadline;
        await updateDoc(doc(db, "deadlines", editingDeadlineId), {
          ...updateData,
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, "deadlines"), {
          ...newDeadline,
          userId: user.uid,
          createdAt: new Date().toISOString(),
          status: DeadlineStatus.PENDING
        });
      }
      setIsModalOpen(false);
      resetDeadlineForm();
    } catch (err: any) { alert("Erro ao salvar: " + err.message); }
  };

  const updateSettings = async (field: keyof NotificationSettings, newValue: any) => {
    if (!user || isSavingSettings) return;
    setIsSavingSettings(true);
    const settingsRef = doc(db, "settings", user.uid);
    try {
      await setDoc(settingsRef, { [field]: newValue, userId: user.uid }, { merge: true });
      setPermissionError(null);
    } catch (err: any) {
      if (err.code === 'permission-denied') {
        setPermissionError(`Erro de permissão ao editar "${field}". Verifique suas Rules.`);
      } else {
        alert("Erro ao salvar: " + err.message);
      }
    } finally {
      setIsSavingSettings(false);
    }
  };

  const toggleStatus = async (d: Deadline) => {
    const newS = d.status === DeadlineStatus.COMPLETED ? DeadlineStatus.PENDING : DeadlineStatus.COMPLETED;
    await updateDoc(doc(db, "deadlines", d.id), { status: newS });
  };

  const deleteDeadline = async (id: string) => {
    if (confirm("Remover permanentemente este prazo?")) await deleteDoc(doc(db, "deadlines", id));
  };

  const chartData = useMemo(() => {
    const completed = deadlines.filter(d => d.status === DeadlineStatus.COMPLETED).length;
    const pending = deadlines.filter(d => d.status === DeadlineStatus.PENDING).length;
    return [
      { name: 'Concluídos', value: completed, color: '#10b981' },
      { name: 'Pendentes', value: pending, color: '#3b82f6' }
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

  // --- Funções de Gestão ---
  const handleEditSetting = (index: number, list: string[], field: keyof NotificationSettings) => {
    const current = list[index];
    const label = field === 'responsaveis' ? 'Advogado' : field === 'pecas' ? 'Tipo de Peça' : 'Empresa';
    const newValue = prompt(`Editar ${label}:`, current);
    if (newValue && newValue.trim() !== "" && newValue !== current) {
      const updatedList = [...list];
      updatedList[index] = field === 'responsaveis' ? newValue.toUpperCase() : newValue;
      updateSettings(field, updatedList);
    }
  };

  const handleDeleteSetting = (index: number, list: string[], field: keyof NotificationSettings) => {
    const label = field === 'responsaveis' ? 'Advogado' : field === 'pecas' ? 'Tipo de Peça' : 'Empresa';
    if (confirm(`Remover "${list[index]}" da lista de ${label}?`)) {
      const updatedList = list.filter((_, idx) => idx !== index);
      updateSettings(field, updatedList);
    }
  };

  // --- Funções de Exportação ---
  const handleExportCSV = () => {
    const headers = ["Cliente", "Instituição", "Tipo de Peça", "Responsável", "Data", "Hora", "Status", "Objeto"];
    const rows = filteredDeadlines.map(d => [
      d.empresa, d.instituicao || '-', d.peca, d.responsavel, formatLocalDate(d.data), d.hora || '-', d.status, d.assunto.replace(/"/g, '""')
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `prazos_relatorio_${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
  };

  const handleExportPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text('JurisControl - Relatório de Prazos', 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, 14, 30);
    autoTable(doc, {
      head: [["Cliente", "Tipo de Peça", "Responsável", "Data", "Status"]],
      body: filteredDeadlines.map(d => [d.empresa, d.peca, d.responsavel, formatLocalDate(d.data), d.status]),
      startY: 40,
      theme: 'grid'
    });
    doc.save(`relatorio_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (authLoading) return <div className="fixed inset-0 bg-[#020617] flex items-center justify-center text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em]">Carregando JurisControl...</div>;
  if (!user) return <AuthScreen onLogin={handleLogin} loading={authLoading} />;

  return (
    <div className="flex bg-[#F8FAFC] min-h-screen antialiased">
      <Sidebar currentView={view} setView={setView} user={user} onLogout={() => signOut(auth)} />
      
      <main className="ml-[280px] flex-1 p-16">
        {permissionError && (
          <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-2xl animate-in slide-in-from-top-4 duration-300">
             <div className="flex items-center gap-4 text-red-600">
               <Icons.AlertCircle />
               <p className="font-bold text-sm">{permissionError}</p>
             </div>
          </div>
        )}

        <header className="flex justify-between items-center mb-16">
          <div>
            <h2 className="text-6xl font-black text-[#0F172A] tracking-tighter mb-1">
              {view === 'dashboard' ? 'Dashboard' : view === 'deadlines' ? 'Controle Geral' : view === 'reports' ? 'Relatórios' : 'Gestão'}
            </h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">SISTEMA ATIVO</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => window.location.reload()} className="flex items-center gap-2 px-6 py-4 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all">
               <Icons.Sync /> Atualizar
             </button>
             <button onClick={() => { resetDeadlineForm(); setIsModalOpen(true); }} className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black text-sm shadow-2xl shadow-blue-600/30 hover:bg-blue-700 hover:scale-[1.02] transition-all active:scale-95 flex items-center gap-3">
               <Icons.Plus /> Novo Prazo
             </button>
          </div>
        </header>

        {view === 'dashboard' && (
          <div className="animate-in fade-in duration-500">
             <section className="grid grid-cols-4 gap-8 mb-16">
                <div className="bg-white p-10 rounded-[2.5rem] border-l-[10px] border-[#B91C1C] shadow-lg shadow-slate-200/50 flex justify-between items-center radar-card">
                  <div><p className="text-[10px] font-black text-slate-400 uppercase mb-2">Atrasados</p><span className="text-6xl font-black text-[#0F172A] tracking-tighter">{stats.atrasados}</span></div>
                  <div className="text-slate-300"><Icons.AlertCircle /></div>
                </div>
                <div className="bg-white p-10 rounded-[2.5rem] border-l-[10px] border-[#EA580C] shadow-lg shadow-slate-200/50 flex justify-between items-center radar-card">
                  <div><p className="text-[10px] font-black text-slate-400 uppercase mb-2">Prazos Fatais</p><span className="text-6xl font-black text-[#0F172A] tracking-tighter">{stats.fatais}</span></div>
                  <div className="text-slate-300"><Icons.Clock /></div>
                </div>
                <div className="bg-white p-10 rounded-[2.5rem] border-l-[10px] border-[#F59E0B] shadow-lg shadow-slate-200/50 flex justify-between items-center radar-card">
                  <div><p className="text-[10px] font-black text-slate-400 uppercase mb-2">Amanhã</p><span className="text-6xl font-black text-[#0F172A] tracking-tighter">{stats.amanha}</span></div>
                  <div className="text-slate-300"><Icons.AlertCircle /></div>
                </div>
                <div className="bg-white p-10 rounded-[2.5rem] border-l-[10px] border-[#10B981] shadow-lg shadow-slate-200/50 flex justify-between items-center radar-card">
                  <div><p className="text-[10px] font-black text-slate-400 uppercase mb-2">Próx. 5 Dias</p><span className="text-6xl font-black text-[#0F172A] tracking-tighter">{stats.prox5dias}</span></div>
                  <div className="text-slate-300"><Icons.Check /></div>
                </div>
             </section>

             <div className="grid grid-cols-12 gap-8">
                <div className="col-span-8 bg-white p-12 rounded-[3.5rem] shadow-lg shadow-slate-200/50 min-h-[500px]">
                    <h3 className="text-3xl font-black text-[#0F172A] mb-12 flex items-center gap-6"><Icons.Table /> Próximas Entregas</h3>
                    <div className="space-y-6">
                      {deadlines.filter(d => d.status === DeadlineStatus.PENDING).slice(0, 4).map(d => (
                        <div key={d.id} className="flex justify-between items-center p-8 bg-slate-50/50 rounded-[2rem] hover:border-blue-100 transition-all border border-transparent">
                          <div className="flex-1"><p className="text-[10px] font-black text-blue-500 uppercase mb-2">{d.empresa}</p><h4 className="font-bold text-slate-900 text-xl">{d.peca}</h4></div>
                          <div className="flex items-center gap-10">
                            <div className="text-right">
                              <p className="font-black text-slate-900 text-lg">{formatLocalDate(d.data)}</p>
                              <p className={`text-[10px] font-black uppercase mt-1 ${getDaysDiff(d.data) <= 1 ? 'text-red-500' : 'text-slate-400'}`}>Restam {getDaysDiff(d.data)} dias</p>
                            </div>
                            <button onClick={() => toggleStatus(d)} className="p-5 bg-white text-emerald-500 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm border border-slate-100"><Icons.Check /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                </div>
                <div className="col-span-4 bg-[#020617] p-12 rounded-[3.5rem] shadow-2xl flex flex-col">
                    <h3 className="text-2xl font-black text-white mb-12">Desempenho Geral</h3>
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <div className="w-full h-72 mb-8">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={chartData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={10} dataKey="value" stroke="none">
                                {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                              </Pie>
                              <Tooltip contentStyle={{ borderRadius: '20px', backgroundColor: '#0f172a', border: 'none', color: '#fff' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                    </div>
                </div>
             </div>
          </div>
        )}

        {view === 'deadlines' && (
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-4">
             <div className="divide-y divide-slate-50">
                {deadlines.map(d => (
                  <div key={d.id} className="p-10 flex flex-col hover:bg-slate-50/50 transition-all">
                    <div className="flex justify-between items-start mb-6 w-full">
                      <div className="flex-1 pr-10">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-black text-[#0F172A] text-xl tracking-tight">{d.peca}</span>
                          <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase ${d.status === DeadlineStatus.COMPLETED ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{d.status}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-[11px] font-bold text-slate-400 uppercase">{d.empresa} • {d.responsavel}</p>
                          {d.documentUrl && (
                            <a href={d.documentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 transition-colors" title="Ver Documento">
                              <Icons.ExternalLink />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right min-w-[140px] mr-4"><p className="font-black text-[#0F172A] text-lg">{formatLocalDate(d.data)}</p></div>
                        <div className="flex gap-2">
                          <button onClick={() => toggleStatus(d)} className="p-4 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"><Icons.Check /></button>
                          <button onClick={() => handleEditClick(d)} className="p-4 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Icons.Edit /></button>
                          <button onClick={() => deleteDeadline(d.id)} className="p-4 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Icons.Trash /></button>
                        </div>
                      </div>
                    </div>
                    <div className="pt-6 border-t border-slate-50/80 w-full"><p className="text-slate-500 text-sm italic">"{d.assunto}"</p></div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {view === 'reports' && (
          <div className="animate-in fade-in duration-500 space-y-8">
             <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h3 className="text-lg font-black mb-8 flex items-center gap-2 text-slate-800"><Icons.Report /> Filtros de Relatório</h3>
                <div className="grid grid-cols-4 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Cliente / Empresa</label>
                      <select className="w-full bg-slate-50 p-5 rounded-2xl font-bold text-xs outline-none border-none focus:ring-2 focus:ring-blue-100" value={reportFilters.empresa} onChange={e => setReportFilters(p => ({ ...p, empresa: e.target.value }))}>
                         <option value="">Todos os Clientes</option>
                         {dynamicSettings.empresas.map(emp => <option key={emp} value={emp}>{emp}</option>)}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Advogado Responsável</label>
                      <select className="w-full bg-slate-50 p-5 rounded-2xl font-bold text-xs outline-none border-none focus:ring-2 focus:ring-blue-100" value={reportFilters.responsavel} onChange={e => setReportFilters(p => ({ ...p, responsavel: e.target.value }))}>
                         <option value="">Todos os Membros</option>
                         {dynamicSettings.responsaveis.map(resp => <option key={resp} value={resp}>{resp}</option>)}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Data Inicial</label>
                      <input type="date" className="w-full bg-slate-50 p-5 rounded-2xl font-bold text-xs outline-none border-none focus:ring-2 focus:ring-blue-100" value={reportFilters.dataInicio} onChange={e => setReportFilters(p => ({ ...p, dataInicio: e.target.value }))} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Data Final</label>
                      <input type="date" className="w-full bg-slate-50 p-5 rounded-2xl font-bold text-xs outline-none border-none focus:ring-2 focus:ring-blue-100" value={reportFilters.dataFim} onChange={e => setReportFilters(p => ({ ...p, dataFim: e.target.value }))} />
                   </div>
                </div>
             </div>
             
             <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/10">
                   <h3 className="text-xl font-black text-slate-900">Registros Encontrados ({filteredDeadlines.length})</h3>
                   <div className="flex gap-3">
                      <button onClick={handleExportCSV} className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/10 active:scale-95">
                        Exportar CSV
                      </button>
                      <button onClick={handleExportPDF} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-900/10 active:scale-95">
                        Exportar PDF
                      </button>
                   </div>
                </div>
                <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                   {filteredDeadlines.map(d => (
                     <div key={d.id} className="p-8 border-b border-slate-50 flex justify-between items-center last:border-0 hover:bg-slate-50/50 transition-all">
                        <div className="flex-1">
                           <div className="flex items-center gap-2 mb-1">
                             <p className="text-[10px] font-black text-blue-500 uppercase">{d.empresa}</p>
                             <span className="text-slate-300 text-[10px]">•</span>
                             <p className="text-[10px] font-black text-slate-400 uppercase">{d.responsavel}</p>
                           </div>
                           <h4 className="font-bold text-slate-900 text-lg">{d.peca}</h4>
                           <p className="text-slate-500 text-xs mt-1 italic line-clamp-1">"{d.assunto}"</p>
                        </div>
                        <div className="text-right">
                           <p className="font-black text-slate-900 text-lg">{formatLocalDate(d.data)}</p>
                           <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${d.status === DeadlineStatus.COMPLETED ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                             {d.status}
                           </span>
                        </div>
                     </div>
                   ))}
                   {filteredDeadlines.length === 0 && (
                     <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest italic">
                        Nenhum registro encontrado para os filtros selecionados.
                     </div>
                   )}
                </div>
             </div>
          </div>
        )}

        {view === 'settings' && (
          <div className="grid grid-cols-3 gap-8 animate-in fade-in duration-500">
             {/* GESTÃO DE TIME */}
             <div className="bg-white p-10 rounded-[2.5rem] shadow-sm flex flex-col border border-slate-100">
                <h3 className="text-2xl font-black mb-8 flex items-center gap-3"><div className="w-2 h-8 bg-blue-600 rounded-full" /> Gestão de Time</h3>
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                   {dynamicSettings.responsaveis.map((r, i) => (
                      <div key={i} className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl group border border-transparent hover:border-blue-100 transition-all">
                         <span className="font-bold text-slate-700 text-sm">{r}</span>
                         <div className="flex gap-2">
                            <button onClick={() => handleEditSetting(i, dynamicSettings.responsaveis, 'responsaveis')} className="p-2 text-blue-500 hover:bg-white rounded-lg transition-all" title="Editar"><Icons.Edit /></button>
                            <button onClick={() => handleDeleteSetting(i, dynamicSettings.responsaveis, 'responsaveis')} className="p-2 text-red-400 hover:bg-white rounded-lg transition-all" title="Remover"><Icons.Trash /></button>
                         </div>
                      </div>
                   ))}
                </div>
                <button disabled={isSavingSettings} onClick={() => {
                   const n = prompt("Nome do Advogado:");
                   if(n && n.trim() !== "") updateSettings('responsaveis', [...dynamicSettings.responsaveis, n.toUpperCase()]);
                }} className="mt-6 w-full p-5 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50 hover:text-blue-500 transition-all">
                  {isSavingSettings ? 'Salvando...' : '+ Adicionar Membro'}
                </button>
             </div>

             {/* GESTÃO DE PEÇAS */}
             <div className="bg-white p-10 rounded-[2.5rem] shadow-sm flex flex-col border border-slate-100">
                <h3 className="text-2xl font-black mb-8 flex items-center gap-3"><div className="w-2 h-8 bg-amber-500 rounded-full" /> Gestão de Peças</h3>
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                   {dynamicSettings.pecas.map((p, i) => (
                      <div key={i} className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl border border-transparent hover:border-amber-100 transition-all">
                         <span className="font-bold text-slate-700 text-sm">{p}</span>
                         <div className="flex gap-2">
                            <button onClick={() => handleEditSetting(i, dynamicSettings.pecas, 'pecas')} className="p-2 text-blue-500 hover:bg-white rounded-lg transition-all" title="Editar"><Icons.Edit /></button>
                            <button onClick={() => handleDeleteSetting(i, dynamicSettings.pecas, 'pecas')} className="p-2 text-red-400 hover:bg-white rounded-lg transition-all" title="Remover"><Icons.Trash /></button>
                         </div>
                      </div>
                   ))}
                </div>
                <button disabled={isSavingSettings} onClick={() => {
                   const n = prompt("Tipo de Peça:");
                   if(n && n.trim() !== "") updateSettings('pecas', [...dynamicSettings.pecas, n]);
                }} className="mt-6 w-full p-5 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50 hover:text-amber-500 transition-all">
                  {isSavingSettings ? 'Salvando...' : '+ Adicionar Peça'}
                </button>
             </div>

             {/* GESTÃO DE EMPRESAS */}
             <div className="bg-white p-10 rounded-[2.5rem] shadow-sm flex flex-col border border-slate-100">
                <h3 className="text-2xl font-black mb-8 flex items-center gap-3"><div className="w-2 h-8 bg-emerald-500 rounded-full" /> Gestão de Clientes</h3>
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                   {dynamicSettings.empresas.map((e, i) => (
                      <div key={i} className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl border border-transparent hover:border-emerald-100 transition-all">
                         <span className="font-bold text-slate-700 text-sm">{e}</span>
                         <div className="flex gap-2">
                            <button onClick={() => handleEditSetting(i, dynamicSettings.empresas, 'empresas')} className="p-2 text-blue-500 hover:bg-white rounded-lg transition-all" title="Editar"><Icons.Edit /></button>
                            <button onClick={() => handleDeleteSetting(i, dynamicSettings.empresas, 'empresas')} className="p-2 text-red-400 hover:bg-white rounded-lg transition-all" title="Remover"><Icons.Trash /></button>
                         </div>
                      </div>
                   ))}
                </div>
                <button disabled={isSavingSettings} onClick={() => {
                   const n = prompt("Nome da Empresa:");
                   if(n && n.trim() !== "") updateSettings('empresas', [...dynamicSettings.empresas, n.toUpperCase()]);
                }} className="mt-6 w-full p-5 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50 hover:text-emerald-500 transition-all">
                  {isSavingSettings ? 'Salvando...' : '+ Adicionar Empresa'}
                </button>
             </div>
          </div>
        )}

        <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetDeadlineForm(); }} title={editingDeadlineId ? "Editar Prazo" : "Novo Registro"}>
          <form onSubmit={handleAddDeadline} className="grid grid-cols-2 gap-8">
            <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase ml-4">Tipo de Documento</label><select className="w-full bg-slate-50 p-6 rounded-2xl font-bold" value={newDeadline.peca} onChange={e => setNewDeadline(p => ({ ...p, peca: e.target.value }))} required><option value="">Selecione...</option>{dynamicSettings.pecas.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
            <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase ml-4">Empresa</label><select className="w-full bg-slate-50 p-6 rounded-2xl font-bold" value={newDeadline.empresa} onChange={e => setNewDeadline(p => ({ ...p, empresa: e.target.value }))} required><option value="">Selecione...</option>{dynamicSettings.empresas.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
            <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase ml-4">Data Limite</label><input type="date" className="w-full bg-slate-50 p-6 rounded-2xl font-bold" value={newDeadline.data} onChange={e => setNewDeadline(p => ({ ...p, data: e.target.value }))} required /></div>
            <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase ml-4">Hora (Opcional)</label><input type="time" className="w-full bg-slate-50 p-6 rounded-2xl font-bold" value={newDeadline.hora} onChange={e => setNewDeadline(p => ({ ...p, hora: e.target.value }))} /></div>
            <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase ml-4">Responsável</label><select className="w-full bg-slate-50 p-6 rounded-2xl font-bold" value={newDeadline.responsavel} onChange={e => setNewDeadline(p => ({ ...p, responsavel: e.target.value }))} required><option value="">Selecione...</option>{dynamicSettings.responsaveis.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
            <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase ml-4">Instituição</label><input type="text" className="w-full bg-slate-50 p-6 rounded-2xl font-bold" placeholder="Ex: Vara Cível..." value={newDeadline.instituicao || ''} onChange={e => setNewDeadline(p => ({ ...p, instituicao: e.target.value }))} /></div>
            
            <div className="col-span-2 space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Link do Documento (Google Drive)</label>
              <input 
                type="url" 
                className="w-full bg-slate-50 p-6 rounded-2xl font-bold" 
                placeholder="https://drive.google.com/..." 
                value={newDeadline.documentUrl || ''} 
                onChange={e => setNewDeadline(p => ({ ...p, documentUrl: e.target.value }))} 
              />
            </div>

            <div className="col-span-2 space-y-4">
              <div className="flex justify-between items-center ml-4">
                <label className="text-[10px] font-black text-slate-400 uppercase">Objeto / Assunto</label>
                <button type="button" disabled={isSuggesting || !newDeadline.peca || !newDeadline.empresa} onClick={async () => { setIsSuggesting(true); const suggestion = await suggestActionObject(newDeadline.peca!, newDeadline.empresa!); setNewDeadline(prev => ({ ...prev, assunto: suggestion })); setIsSuggesting(false); }} className={`text-[9px] font-black uppercase flex items-center gap-2 px-4 py-2 rounded-full transition-all ${isSuggesting ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white'}`}>
                  <Icons.Sparkles /> {isSuggesting ? 'Pensando...' : 'IA Sugerir'}
                </button>
              </div>
              <textarea className="w-full bg-slate-50 p-8 rounded-3xl font-medium min-h-[120px]" placeholder="Descrição detalhada do prazo..." value={newDeadline.assunto} onChange={e => setNewDeadline(p => ({ ...p, assunto: e.target.value }))} required />
            </div>
            <button type="submit" className="col-span-2 bg-slate-950 text-white p-7 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-600 transition-all">{editingDeadlineId ? 'Salvar Alterações' : 'Registrar Prazo'}</button>
          </form>
        </Modal>
      </main>
    </div>
  );
}
