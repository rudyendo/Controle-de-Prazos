
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
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col relative animate-in zoom-in-95 duration-200">
        <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center">
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
          <p className="text-slate-500 font-bold uppercase text-[9px] tracking-[0.2em] mt-2">Versão Cloud 1.9</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onLogin(email, password, isSignUp); }} className="space-y-4">
          <input type="email" required className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600" placeholder="E-mail profissional" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" required className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} />
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-5 rounded-2xl font-bold text-sm uppercase tracking-widest transition-all disabled:opacity-50 mt-4">
            {loading ? 'Autenticando...' : isSignUp ? 'Criar Conta' : 'Acessar Painel'}
          </button>
        </form>
        <button onClick={() => setIsSignUp(!isSignUp)} className="w-full mt-8 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-white transition-colors">
          {isSignUp ? 'Já possui acesso? Entrar' : 'Solicitar novo acesso'}
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
    <aside className="w-[280px] bg-[#020617] text-white min-h-screen flex flex-col fixed left-0 top-0 z-40 border-r border-slate-800/50">
      <div className="p-12 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xl italic shadow-lg shadow-blue-500/20">JC</div>
        <h1 className="text-2xl font-black tracking-tight">JurisControl</h1>
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

      <div className="p-12 mt-auto">
        <div className="text-[9px] font-bold text-slate-700 uppercase tracking-[0.2em] leading-relaxed mb-4">
          LEGAL INTEL V1.9
        </div>
        {user && (
          <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 truncate">{user.email}</p>
            <button onClick={onLogout} className="text-[10px] font-black uppercase text-red-500 hover:text-red-400 transition-colors">Sair da Conta</button>
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
  
  // Estados de filtro para relatórios
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
    } catch (err: any) { 
      console.error("Add error:", err);
      alert("Erro ao salvar: " + err.message); 
    }
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

  const stats = useMemo(() => ({
    atrasados: deadlines.filter(d => d.status === DeadlineStatus.PENDING && getDaysDiff(d.data) < 0).length,
    fatais: deadlines.filter(d => d.status === DeadlineStatus.PENDING && getDaysDiff(d.data) === 0).length,
    amanha: deadlines.filter(d => d.status === DeadlineStatus.PENDING && getDaysDiff(d.data) === 1).length,
    prox5dias: deadlines.filter(d => d.status === DeadlineStatus.PENDING && getDaysDiff(d.data) > 1 && getDaysDiff(d.data) <= 5).length,
  }), [deadlines]);

  // Lógica de filtragem para relatórios
  const filteredDeadlines = useMemo(() => {
    return deadlines.filter(d => {
      const matchEmpresa = !reportFilters.empresa || d.empresa === reportFilters.empresa;
      const matchResponsavel = !reportFilters.responsavel || d.responsavel === reportFilters.responsavel;
      const matchInicio = !reportFilters.dataInicio || d.data >= reportFilters.dataInicio;
      const matchFim = !reportFilters.dataFim || d.data <= reportFilters.dataFim;
      return matchEmpresa && matchResponsavel && matchInicio && matchFim;
    });
  }, [deadlines, reportFilters]);

  // Funções de Exportação
  const exportToCSV = () => {
    if (filteredDeadlines.length === 0) {
      alert("Nenhum dado para exportar.");
      return;
    }
    const header = "Data;Peca;Empresa;Responsavel;Assunto;Status;DocumentoUrl\n";
    const rows = filteredDeadlines.map(d => {
      const escapedAssunto = d.assunto.replace(/"/g, '""');
      return `${formatLocalDate(d.data)};${d.peca};${d.empresa};${d.responsavel};"${escapedAssunto}";${d.status};${d.documentUrl || ''}`;
    }).join("\n");
    
    const blob = new Blob(["\ufeff" + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Relatorio_Prazos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = async () => {
    if (filteredDeadlines.length === 0) {
      alert("Nenhum dado para exportar.");
      return;
    }
    
    try {
      // Importações dinâmicas conforme necessário
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Relatório de Prazos Processuais", 14, 20);
      doc.setFontSize(10);
      doc.text(`JurisControl - Extraído em: ${new Date().toLocaleString('pt-BR')}`, 14, 28);
      
      const tableRows = filteredDeadlines.map(d => [
        formatLocalDate(d.data),
        d.peca,
        d.empresa,
        d.responsavel,
        d.status
      ]);

      autoTable(doc, {
        startY: 35,
        head: [['Data', 'Peça', 'Empresa', 'Responsável', 'Status']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] }, // Slate-900
        styles: { fontSize: 8 }
      });

      doc.save(`Relatorio_JurisControl_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Erro ao gerar PDF. Verifique sua conexão.");
    }
  };

  // Função para editar itens das configurações
  const handleEditConfigItem = (category: 'empresas' | 'responsaveis' | 'pecas', index: number) => {
    const currentValue = dynamicSettings[category][index];
    const newValue = prompt(`Editar:`, currentValue);
    if (newValue && newValue.trim() !== "" && newValue !== currentValue) {
      const newList = [...dynamicSettings[category]];
      newList[index] = category === 'pecas' ? newValue.trim() : newValue.trim().toUpperCase();
      updateSettings(category, newList);
    }
  };

  if (authLoading) return <div className="fixed inset-0 bg-[#020617] flex items-center justify-center text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em]">Carregando Sistema...</div>;
  if (!user) return <AuthScreen onLogin={handleLogin} loading={authLoading} />;

  return (
    <div className="flex bg-[#F8FAFC] min-h-screen antialiased">
      <Sidebar currentView={view} setView={setView} user={user} onLogout={() => signOut(auth)} />
      
      <main className="ml-[280px] flex-1 p-16">
        <header className="flex justify-between items-center mb-16">
          <div>
            <h2 className="text-6xl font-black text-[#0F172A] tracking-tighter mb-2">
              {view === 'dashboard' ? 'Dashboard' : view === 'deadlines' ? 'Controle Geral' : view === 'reports' ? 'Relatórios' : 'Gestão'}
            </h2>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <span className="text-[11px] font-black text-emerald-500/80 uppercase tracking-[0.2em]">JURISCONTROL LIVE</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => window.location.reload()} className="flex items-center gap-2 px-6 py-4 bg-white border border-slate-100 rounded-2xl text-[11px] font-black uppercase text-slate-500 hover:bg-slate-50 transition-all shadow-sm">
               <Icons.Sync /> Sincronizar
             </button>
             <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-2xl shadow-blue-600/30 hover:bg-blue-700 hover:scale-[1.02] transition-all active:scale-95">
               + Novo Prazo
             </button>
          </div>
        </header>

        {view === 'dashboard' && (
          <div className="animate-in fade-in duration-500">
             <div className="mb-12">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                  <Icons.AlertCircle /> RADAR DE PRIORIDADES
                </h3>
                <section className="grid grid-cols-4 gap-6 mb-16">
                    <div className="bg-white p-8 rounded-[1.8rem] border-l-[4px] border-red-800 shadow-sm radar-card relative flex items-center justify-center min-h-[160px]">
                      <div className="text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">ATRASADOS</p>
                        <span className="text-6xl font-black text-[#0F172A] tracking-tighter block leading-none">{stats.atrasados}</span>
                      </div>
                      <div className="absolute right-6 bottom-6 text-slate-300"><Icons.AlertCircle /></div>
                    </div>
                    <div className="bg-white p-8 rounded-[1.8rem] border-l-[4px] border-red-500 shadow-sm radar-card relative flex items-center justify-center min-h-[160px]">
                      <div className="text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">PRAZOS FATAIS</p>
                        <span className="text-6xl font-black text-[#0F172A] tracking-tighter block leading-none">{stats.fatais}</span>
                      </div>
                      <div className="absolute right-6 bottom-6 text-slate-300"><Icons.Clock /></div>
                    </div>
                    <div className="bg-white p-8 rounded-[1.8rem] border-l-[4px] border-amber-500 shadow-sm radar-card relative flex items-center justify-center min-h-[160px]">
                      <div className="text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">AMANHÃ</p>
                        <span className="text-6xl font-black text-[#0F172A] tracking-tighter block leading-none">{stats.amanha}</span>
                      </div>
                      <div className="absolute right-6 bottom-6 text-slate-300"><Icons.AlertCircle /></div>
                    </div>
                    <div className="bg-white p-8 rounded-[1.8rem] border-l-[4px] border-emerald-500 shadow-sm radar-card relative flex items-center justify-center min-h-[160px]">
                      <div className="text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">PRÓX. 5 DIAS</p>
                        <span className="text-6xl font-black text-[#0F172A] tracking-tighter block leading-none">{stats.prox5dias}</span>
                      </div>
                      <div className="absolute right-6 bottom-6 text-slate-300"><Icons.Check /></div>
                    </div>
                </section>
             </div>

             <div className="grid grid-cols-12 gap-8">
                <div className="col-span-8 bg-white p-12 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <h3 className="text-2xl font-black text-[#0F172A] mb-10 flex items-center gap-4">
                      <Icons.List /> Próximas Entregas
                    </h3>
                    <div className="space-y-4">
                      {deadlines.filter(d => d.status === DeadlineStatus.PENDING).slice(0, 5).map(d => (
                        <div key={d.id} className="flex justify-between items-center p-8 bg-slate-50/50 rounded-3xl border border-slate-50 group hover:border-blue-100 transition-all">
                          <div className="flex-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wider">{d.empresa} • {d.responsavel}</p>
                            <h4 className="font-black text-slate-900 text-lg group-hover:text-blue-600 transition-colors">{d.peca}</h4>
                          </div>
                          <div className="flex items-center gap-4">
                            {d.documentUrl && (
                              <a href={d.documentUrl} target="_blank" rel="noopener noreferrer" title="Ver Documentos" className="p-4 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                                <Icons.ExternalLink />
                              </a>
                            )}
                            <div className="text-right min-w-[100px]">
                              <p className="font-black text-slate-900">{formatLocalDate(d.data)}</p>
                              <p className={`text-[9px] font-black uppercase ${getDaysDiff(d.data) === 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                {getDaysDiff(d.data) === 0 ? 'Vence Hoje' : `Faltam ${getDaysDiff(d.data)} dias`}
                              </p>
                            </div>
                            <button onClick={() => toggleStatus(d)} className="p-4 bg-white border border-slate-100 text-emerald-500 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm">
                              <Icons.Check />
                            </button>
                          </div>
                        </div>
                      ))}
                      {deadlines.filter(d => d.status === DeadlineStatus.PENDING).length === 0 && (
                        <div className="text-center py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100">
                          <p className="text-slate-300 font-bold uppercase italic tracking-widest">Nenhuma entrega pendente</p>
                        </div>
                      )}
                    </div>
                </div>

                <div className="col-span-4 bg-[#020617] p-10 rounded-[2.5rem] shadow-xl text-white">
                    <h3 className="text-xl font-black mb-8 tracking-tight">Produtividade Geral</h3>
                    <div className="space-y-6">
                        <div className="h-40 bg-white/5 rounded-3xl border border-white/5 flex items-center justify-center italic text-sm text-slate-500">Métricas de Equipe</div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Total Prazos</p>
                                <p className="text-2xl font-black">{deadlines.length}</p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Pendentes</p>
                                <p className="text-2xl font-black">{deadlines.filter(d => d.status === DeadlineStatus.PENDING).length}</p>
                            </div>
                        </div>
                    </div>
                </div>
             </div>
          </div>
        )}

        {view === 'reports' && (
          <div className="animate-in fade-in duration-500">
             {/* Painel de Filtros */}
             <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm mb-12">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                   <Icons.Settings /> FILTROS DE RELATÓRIO
                </h3>
                <div className="grid grid-cols-4 gap-6">
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Empresa/Cliente</label>
                      <select 
                        className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                        value={reportFilters.empresa}
                        onChange={e => setReportFilters(p => ({ ...p, empresa: e.target.value }))}
                      >
                         <option value="">TODAS AS EMPRESAS</option>
                         {dynamicSettings.empresas.map(emp => <option key={emp} value={emp}>{emp}</option>)}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Responsável</label>
                      <select 
                        className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                        value={reportFilters.responsavel}
                        onChange={e => setReportFilters(p => ({ ...p, responsavel: e.target.value }))}
                      >
                         <option value="">TODOS OS RESPONSÁVEIS</option>
                         {dynamicSettings.responsaveis.map(resp => <option key={resp} value={resp}>{resp}</option>)}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Data Inicial</label>
                      <input 
                        type="date" 
                        className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                        value={reportFilters.dataInicio}
                        onChange={e => setReportFilters(p => ({ ...p, dataInicio: e.target.value }))}
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Data Final</label>
                      <input 
                        type="date" 
                        className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                        value={reportFilters.dataFim}
                        onChange={e => setReportFilters(p => ({ ...p, dataFim: e.target.value }))}
                      />
                   </div>
                </div>
                <div className="mt-8 flex justify-end gap-3">
                   <button 
                     onClick={() => setReportFilters({ empresa: '', responsavel: '', dataInicio: '', dataFim: '' })}
                     className="px-6 py-3 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-all"
                   >
                      Limpar Filtros
                   </button>
                </div>
             </div>

             {/* Resultados do Relatório */}
             <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                         <Icons.Report />
                      </div>
                      <div>
                         <h3 className="text-xl font-black text-[#0F172A] tracking-tight">Resultados do Relatório</h3>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{filteredDeadlines.length} registros encontrados</p>
                      </div>
                   </div>
                   
                   <div className="flex gap-4 items-center">
                      <div className="flex gap-2 mr-6">
                        <button 
                          onClick={exportToCSV}
                          className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
                        >
                          <Icons.Table /> Exportar CSV
                        </button>
                        <button 
                          onClick={exportToPDF}
                          className="flex items-center gap-2 px-6 py-3 bg-blue-600 rounded-xl text-[10px] font-black uppercase text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                        >
                          <Icons.Table /> Exportar PDF
                        </button>
                      </div>
                      <div className="text-right">
                         <p className="text-[9px] font-black text-slate-400 uppercase">Concluídos</p>
                         <p className="text-xl font-black text-emerald-600">{filteredDeadlines.filter(d => d.status === DeadlineStatus.COMPLETED).length}</p>
                      </div>
                      <div className="w-[1px] h-10 bg-slate-100 mx-2" />
                      <div className="text-right">
                         <p className="text-[9px] font-black text-slate-400 uppercase">Pendentes</p>
                         <p className="text-xl font-black text-amber-500">{filteredDeadlines.filter(d => d.status === DeadlineStatus.PENDING).length}</p>
                      </div>
                   </div>
                </div>

                <div className="divide-y divide-slate-50">
                   {filteredDeadlines.map(d => (
                     <div key={d.id} className="p-8 flex justify-between items-center hover:bg-slate-50/30 transition-all">
                        <div className="flex-1 pr-8">
                           <div className="flex items-center gap-3 mb-2">
                              <span className="font-black text-slate-900 text-lg tracking-tight">{d.peca}</span>
                              <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase ${d.status === DeadlineStatus.COMPLETED ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                 {d.status}
                              </span>
                           </div>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{d.empresa} • Resp: {d.responsavel}</p>
                           <p className="text-xs text-slate-500 mt-3 line-clamp-1 italic">"{d.assunto}"</p>
                        </div>
                        <div className="flex items-center gap-6">
                           <div className="text-right min-w-[120px]">
                              <p className="font-black text-slate-900">{formatLocalDate(d.data)}</p>
                              <p className="text-[9px] font-black uppercase text-slate-400">Vencimento</p>
                           </div>
                           {d.documentUrl && (
                             <a href={d.documentUrl} target="_blank" rel="noopener noreferrer" className="p-4 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all">
                                <Icons.ExternalLink />
                             </a>
                           )}
                        </div>
                     </div>
                   ))}
                   {filteredDeadlines.length === 0 && (
                     <div className="py-40 text-center">
                        <p className="text-slate-300 font-black uppercase italic tracking-[0.3em]">Nenhum registro nos filtros selecionados</p>
                     </div>
                   )}
                </div>
             </div>
          </div>
        )}

        {view === 'deadlines' && (
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden animate-in fade-in duration-300">
             <div className="divide-y divide-slate-50">
                {deadlines.map(d => (
                  <div key={d.id} className="p-10 flex justify-between items-center hover:bg-slate-50/50 transition-all">
                    <div className="flex-1 pr-10">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="font-black text-[#0F172A] text-xl tracking-tight">{d.peca}</span>
                        <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase ${d.status === DeadlineStatus.COMPLETED ? 'bg-emerald-100 text-emerald-700' : getDaysDiff(d.data) < 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {d.status === DeadlineStatus.COMPLETED ? 'Concluído' : getDaysDiff(d.data) < 0 ? 'Expirado' : 'Pendente'}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{d.empresa} • Resp: {d.responsavel}</p>
                      <p className="mt-5 text-slate-600 text-sm italic border-l-4 border-slate-100 pl-4 py-2">"{d.assunto}"</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right min-w-[140px]">
                         <p className="font-black text-[#0F172A] text-lg">{formatLocalDate(d.data)}</p>
                         <p className={`text-[10px] font-black uppercase mt-1 ${getDaysDiff(d.data) < 0 && d.status !== DeadlineStatus.COMPLETED ? 'text-red-500' : 'text-blue-600'}`}>
                            {d.status === DeadlineStatus.COMPLETED ? 'Concluído' : getDaysDiff(d.data) < 0 ? 'Prazo Vencido' : getDaysDiff(d.data) === 0 ? 'Vence Hoje' : `${getDaysDiff(d.data)} dias restantes`}
                         </p>
                      </div>
                      <div className="flex gap-2">
                        {d.documentUrl && (
                          <a href={d.documentUrl} target="_blank" rel="noopener noreferrer" className="p-5 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all"><Icons.ExternalLink /></a>
                        )}
                        <button onClick={() => toggleStatus(d)} className="p-5 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all"><Icons.Check /></button>
                        <button onClick={() => deleteDeadline(d.id)} className="p-5 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all"><Icons.Trash /></button>
                      </div>
                    </div>
                  </div>
                ))}
                {deadlines.length === 0 && (
                   <div className="text-center py-40">
                      <p className="text-slate-300 font-black uppercase italic tracking-[0.3em]">Nenhum registro encontrado</p>
                   </div>
                )}
             </div>
          </div>
        )}

        {view === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-right-4">
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <h3 className="text-xl font-black mb-6 flex items-center gap-3">Meus Clientes</h3>
              <div className="flex gap-3 mb-6">
                <input id="new-empresa" type="text" className="flex-1 bg-slate-50 p-4 rounded-2xl font-bold text-sm outline-none border-0 focus:ring-2 focus:ring-emerald-100 transition-all" placeholder="Nome do Cliente..." />
                <button onClick={() => {
                  const input = document.getElementById('new-empresa') as HTMLInputElement;
                  if (input.value) {
                    updateSettings('empresas', [...dynamicSettings.empresas, input.value.toUpperCase()]);
                    input.value = '';
                  }
                }} className="bg-emerald-600 text-white px-6 rounded-2xl font-black text-xs uppercase hover:bg-emerald-700">Add</button>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {dynamicSettings.empresas.map((e, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl group">
                    <span className="font-bold text-slate-700 text-sm tracking-tight">{e}</span>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditConfigItem('empresas', idx)} className="text-slate-400 hover:text-blue-600"><Icons.Edit /></button>
                      <button onClick={() => updateSettings('empresas', dynamicSettings.empresas.filter((_, i) => i !== idx))} className="text-red-300 hover:text-red-600"><Icons.Trash /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <h3 className="text-xl font-black mb-6 flex items-center gap-3">Equipe / Responsáveis</h3>
              <div className="flex gap-3 mb-6">
                <input id="new-responsavel" type="text" className="flex-1 bg-slate-50 p-4 rounded-2xl font-bold text-sm outline-none border-0 focus:ring-2 focus:ring-emerald-100 transition-all" placeholder="Nome do Responsável..." />
                <button onClick={() => {
                  const input = document.getElementById('new-responsavel') as HTMLInputElement;
                  if (input.value) {
                    updateSettings('responsaveis', [...dynamicSettings.responsaveis, input.value.toUpperCase()]);
                    input.value = '';
                  }
                }} className="bg-emerald-600 text-white px-6 rounded-2xl font-black text-xs uppercase hover:bg-emerald-700">Add</button>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {dynamicSettings.responsaveis.map((r, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl group">
                    <span className="font-bold text-slate-700 text-sm tracking-tight">{r}</span>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditConfigItem('responsaveis', idx)} className="text-slate-400 hover:text-blue-600"><Icons.Edit /></button>
                      <button onClick={() => updateSettings('responsaveis', dynamicSettings.responsaveis.filter((_, i) => i !== idx))} className="text-red-300 hover:text-red-600"><Icons.Trash /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <h3 className="text-xl font-black mb-6 flex items-center gap-3">Documentos & Peças</h3>
              <div className="flex gap-3 mb-6">
                <input id="new-peca" type="text" className="flex-1 bg-slate-50 p-4 rounded-2xl font-bold text-sm outline-none border-0 focus:ring-2 focus:ring-emerald-100 transition-all" placeholder="Nova Peça..." />
                <button onClick={() => {
                  const input = document.getElementById('new-peca') as HTMLInputElement;
                  if (input.value) {
                    updateSettings('pecas', [...dynamicSettings.pecas, input.value]);
                    input.value = '';
                  }
                }} className="bg-emerald-600 text-white px-6 rounded-2xl font-black text-xs uppercase hover:bg-emerald-700">Add</button>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {dynamicSettings.pecas.map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl group">
                    <span className="font-bold text-slate-700 text-sm tracking-tight">{p}</span>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditConfigItem('pecas', idx)} className="text-slate-400 hover:text-blue-600"><Icons.Edit /></button>
                      <button onClick={() => updateSettings('pecas', dynamicSettings.pecas.filter((_, i) => i !== idx))} className="text-red-300 hover:text-red-600"><Icons.Trash /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Registro Processual">
          <form onSubmit={handleAddDeadline} className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">O que é o Documento?</label>
              <select className="w-full bg-slate-50 p-6 rounded-[1.5rem] font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" value={newDeadline.peca} onChange={e => setNewDeadline(p => ({ ...p, peca: e.target.value }))} required>
                <option value="">SELECIONE...</option>
                {dynamicSettings.pecas.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Para qual Cliente?</label>
              <select className="w-full bg-slate-50 p-6 rounded-[1.5rem] font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" value={newDeadline.empresa} onChange={e => setNewDeadline(p => ({ ...p, empresa: e.target.value }))} required>
                <option value="">SELECIONE...</option>
                {dynamicSettings.empresas.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Vencimento</label>
              <input type="date" className="w-full bg-slate-50 p-6 rounded-[1.5rem] font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" value={newDeadline.data} onChange={e => setNewDeadline(p => ({ ...p, data: e.target.value }))} required />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Responsável</label>
              <select className="w-full bg-slate-50 p-6 rounded-[1.5rem] font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" value={newDeadline.responsavel} onChange={e => setNewDeadline(p => ({ ...p, responsavel: e.target.value }))} required>
                <option value="">SELECIONE...</option>
                {dynamicSettings.responsaveis.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="col-span-2 space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Link da Pasta (Google Drive / Documentos) - Opcional</label>
              <div className="relative">
                <input 
                  type="url" 
                  className="w-full bg-slate-50 p-6 rounded-[1.5rem] font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all pl-12" 
                  placeholder="https://drive.google.com/..." 
                  value={newDeadline.documentUrl} 
                  onChange={e => setNewDeadline(p => ({ ...p, documentUrl: e.target.value }))} 
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Icons.ExternalLink />
                </div>
              </div>
            </div>
            <div className="col-span-2 space-y-3">
              <div className="flex justify-between items-center ml-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Objeto da Providência</label>
                <button type="button" onClick={async () => {
                   if(newDeadline.peca && newDeadline.empresa) {
                      const suggestion = await suggestActionObject(newDeadline.peca, newDeadline.empresa);
                      setNewDeadline(prev => ({ ...prev, assunto: suggestion }));
                   }
                }} className="text-[9px] font-black text-blue-600 uppercase flex items-center gap-1"><Icons.Sparkles /> Sugerir IA</button>
              </div>
              <textarea className="w-full bg-slate-50 p-8 rounded-[2rem] font-medium text-sm outline-none min-h-[120px] focus:ring-4 focus:ring-blue-100 transition-all" placeholder="Detalhes do que deve ser feito..." value={newDeadline.assunto} onChange={e => setNewDeadline(p => ({ ...p, assunto: e.target.value }))} required />
            </div>
            <button type="submit" className="col-span-2 bg-slate-950 text-white p-7 rounded-[1.5rem] font-black uppercase text-xs tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-200">Finalizar Registro</button>
          </form>
        </Modal>
      </main>
    </div>
  );
}
