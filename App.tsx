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
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential
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
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children?: React.ReactNode;
}

const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
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
    { id: 'correspondence', label: 'Ofícios e Memorandos', icon: <Icons.Correspondence /> },
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
          Criado por Rudy Endo (Versão 1.1.20)
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
  const [correspondencePermissionError, setCorrespondencePermissionError] = useState<string | null>(null);
  
  // Correspondência
  const [usedOficioNumbers, setUsedOficioNumbers] = useState<number[]>([]);
  const [usedMemorandoNumbers, setUsedMemorandoNumbers] = useState<number[]>([]);
  const [activeCorrespondenceTab, setActiveCorrespondenceTab] = useState<'oficio' | 'memorando'>('oficio');
  const [maxOficioRange, setMaxOficioRange] = useState(100);

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

  // Sync Configurações
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
        }).catch(() => setPermissionError("Erro de acesso. Verifique as Regras do Firestore."));
      }
    }, (error) => {
      if (error.code === 'permission-denied') setPermissionError("Sem permissão para ler as configurações (Settings).");
    });
    return () => unsubscribe();
  }, [user]);

  // Sync Prazos
  useEffect(() => {
    if (!user) return;
    setIsSyncing(true);
    const q = query(collection(db, "deadlines"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedDeadlines = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Deadline[];
      setDeadlines(loadedDeadlines.sort((a, b) => a.data.localeCompare(b.data)));
      setIsSyncing(false);
    }, (error) => {
        if (error.code === 'permission-denied') setPermissionError("Sem permissão para ler a coleção 'deadlines'.");
    });
    return () => unsubscribe();
  }, [user]);

  // Sync Correspondência (Ofícios e Memorandos)
  useEffect(() => {
    if (!user) return;
    const oficioRef = doc(db, "correspondence", user.uid);
    const unsubscribe = onSnapshot(oficioRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUsedOficioNumbers(data.oficio || []);
        setUsedMemorandoNumbers(data.memorando || []);
        setCorrespondencePermissionError(null);
      } else {
        // Se o documento não existe, inicializamos como vazio
        setDoc(oficioRef, { oficio: [], memorando: [] }, { merge: true }).catch((err) => {
          if (err.code === 'permission-denied') {
            setCorrespondencePermissionError("ERRO DE PERMISSÃO: Você precisa autorizar a coleção 'correspondence' no console do Firebase Firestore.");
          }
        });
      }
    }, (error) => {
      if (error.code === 'permission-denied') {
        setCorrespondencePermissionError("ERRO DE PERMISSÃO: Você precisa autorizar a coleção 'correspondence' no console do Firebase Firestore (Aba Rules).");
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Verificação de Senha Admin (Mesma do Login)
  const verifyAdminPassword = async (): Promise<boolean> => {
    const password = prompt("Esta operação requer privilégios de administrador. Digite sua SENHA de login para confirmar:");
    if (!password || !user?.email || !auth.currentUser) return false;

    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(auth.currentUser, credential);
      return true;
    } catch (error: any) {
      alert("Acesso negado: Senha incorreta ou falha na autenticação.");
      return false;
    }
  };

  // Lógica de numeração com bloqueio visual e por senha
  const handleToggleCorrespondenceNumber = async (num: number, category: 'oficio' | 'memorando') => {
    if (!user) return;
    const currentList = category === 'oficio' ? usedOficioNumbers : usedMemorandoNumbers;
    const isAlreadyUsed = currentList.includes(num);

    let updated;
    if (isAlreadyUsed) {
      // Se já está marcado (vermelho), exige senha para desmarcar
      const isVerified = await verifyAdminPassword();
      if (!isVerified) return;
      updated = currentList.filter(n => n !== num);
    } else {
      // Se não está marcado, marca normalmente
      updated = [...currentList, num].sort((a, b) => a - b);
    }

    try {
      const oficioRef = doc(db, "correspondence", user.uid);
      await setDoc(oficioRef, { [category]: updated }, { merge: true });
    } catch (err: any) {
      if (err.code === 'permission-denied') {
        alert("ERRO DE PERMISSÃO: Você precisa atualizar as regras do Firebase conforme orientado.");
      } else {
        alert("Erro ao salvar: " + err.message);
      }
    }
  };

  const getNextNumber = (category: 'oficio' | 'memorando') => {
    const list = category === 'oficio' ? usedOficioNumbers : usedMemorandoNumbers;
    for (let i = 1; i <= 5000; i++) {
      if (!list.includes(i)) return i;
    }
    return 1;
  };

  const nextOficioNumber = useMemo(() => getNextNumber('oficio'), [usedOficioNumbers]);
  const nextMemorandoNumber = useMemo(() => getNextNumber('memorando'), [usedMemorandoNumbers]);

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
    } catch (err: any) { alert("Erro ao salvar."); }
  };

  const updateSettings = async (field: keyof NotificationSettings, newValue: any) => {
    if (!user || isSavingSettings) return;
    setIsSavingSettings(true);
    const settingsRef = doc(db, "settings", user.uid);
    try {
      await setDoc(settingsRef, { [field]: newValue, userId: user.uid }, { merge: true });
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

  const handleEditSetting = (index: number, list: string[], field: keyof NotificationSettings) => {
    const current = list[index];
    const newValue = prompt(`Editar:`, current);
    if (newValue && newValue.trim() !== "" && newValue !== current) {
      const updatedList = [...list];
      updatedList[index] = field === 'responsaveis' ? newValue.toUpperCase() : newValue;
      updateSettings(field, updatedList);
    }
  };

  const handleDeleteSetting = (index: number, list: string[], field: keyof NotificationSettings) => {
    if (confirm(`Remover da lista?`)) {
      const updatedList = list.filter((_, idx) => idx !== index);
      updateSettings(field, updatedList);
    }
  };

  const handleExportCSV = () => {
    const headers = ["Cliente", "Tipo", "Responsável", "Data", "Status", "Objeto"];
    const rows = filteredDeadlines.map(d => [d.empresa, d.peca, d.responsavel, formatLocalDate(d.data), d.status, d.assunto]);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio.csv`;
    link.click();
  };

  if (authLoading) return <div className="fixed inset-0 bg-[#020617] flex items-center justify-center text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em]">JurisControl...</div>;
  if (!user) return <AuthScreen onLogin={handleLogin} loading={authLoading} />;

  return (
    <div className="flex bg-[#F8FAFC] min-h-screen antialiased">
      <Sidebar currentView={view} setView={setView} user={user} onLogout={() => signOut(auth)} />
      
      <main className="ml-[280px] flex-1 p-16">
        {(permissionError || correspondencePermissionError) && (
          <div className="mb-8 p-8 bg-red-50 border border-red-200 rounded-[2rem] animate-in slide-in-from-top-4 duration-300 shadow-xl">
             <div className="flex items-start gap-6 text-red-700">
               <div className="p-3 bg-red-100 rounded-2xl"><Icons.AlertCircle /></div>
               <div className="flex-1">
                  <p className="font-black text-lg tracking-tight mb-2">Ação Requerida: Erro de Permissão do Firebase</p>
                  <p className="text-sm font-medium leading-relaxed mb-4">{permissionError || correspondencePermissionError}</p>
                  <div className="bg-white/50 p-6 rounded-2xl border border-red-100">
                    <p className="text-xs font-bold text-red-600 uppercase mb-3 tracking-widest">Como corrigir agora:</p>
                    <ol className="text-xs space-y-2 text-red-800 font-medium list-decimal ml-4">
                      <li>Acesse o <b>Console do Firebase</b> > <b>Firestore Database</b>.</li>
                      <li>Clique na aba <b>Rules (Regras)</b>.</li>
                      <li>Substitua as regras atuais pelas fornecidas na conversa anterior.</li>
                      <li>Clique em <b>Publish (Publicar)</b> e atualize esta página.</li>
                    </ol>
                  </div>
               </div>
             </div>
          </div>
        )}

        <header className="flex justify-between items-center mb-16">
          <div>
            <h2 className="text-6xl font-black text-[#0F172A] tracking-tighter mb-1">
              {view === 'dashboard' ? 'Dashboard' : view === 'deadlines' ? 'Controle Geral' : view === 'correspondence' ? 'Ofícios e Memorandos' : view === 'reports' ? 'Relatórios' : 'Gestão'}
            </h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">SISTEMA ATIVO</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => { resetDeadlineForm(); setIsModalOpen(true); }} className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black text-sm shadow-2xl shadow-blue-600/30 hover:bg-blue-700 hover:scale-[1.02] transition-all flex items-center gap-3">
               <Icons.Plus /> Novo Prazo
             </button>
          </div>
        </header>

        {view === 'dashboard' && (
          <div className="animate-in fade-in duration-500">
             <section className="grid grid-cols-4 gap-8 mb-16">
                <div className="bg-white p-10 rounded-[2.5rem] border-l-[10px] border-[#B91C1C] shadow-lg flex justify-between items-center">
                  <div><p className="text-[10px] font-black text-slate-400 uppercase mb-2">Atrasados</p><span className="text-6xl font-black text-[#0F172A] tracking-tighter">{stats.atrasados}</span></div>
                </div>
                <div className="bg-white p-10 rounded-[2.5rem] border-l-[10px] border-[#EA580C] shadow-lg flex justify-between items-center">
                  <div><p className="text-[10px] font-black text-slate-400 uppercase mb-2">Fatais</p><span className="text-6xl font-black text-[#0F172A] tracking-tighter">{stats.fatais}</span></div>
                </div>
                <div className="bg-white p-10 rounded-[2.5rem] border-l-[10px] border-[#F59E0B] shadow-lg flex justify-between items-center">
                  <div><p className="text-[10px] font-black text-slate-400 uppercase mb-2">Amanhã</p><span className="text-6xl font-black text-[#0F172A] tracking-tighter">{stats.amanha}</span></div>
                </div>
                <div className="bg-white p-10 rounded-[2.5rem] border-l-[10px] border-[#10B981] shadow-lg flex justify-between items-center">
                  <div><p className="text-[10px] font-black text-slate-400 uppercase mb-2">Próx. 5 Dias</p><span className="text-6xl font-black text-[#0F172A] tracking-tighter">{stats.prox5dias}</span></div>
                </div>
             </section>
             <div className="grid grid-cols-12 gap-8">
                <div className="col-span-8 bg-white p-12 rounded-[3.5rem] shadow-lg min-h-[500px]">
                    <h3 className="text-3xl font-black text-[#0F172A] mb-12 flex items-center gap-6">Próximas Entregas</h3>
                    <div className="space-y-6">
                      {deadlines.filter(d => d.status === DeadlineStatus.PENDING).slice(0, 4).map(d => (
                        <div key={d.id} className="flex justify-between items-center p-8 bg-slate-50/50 rounded-[2rem] border border-transparent hover:border-blue-100 transition-all">
                          <div className="flex-1"><p className="text-[10px] font-black text-blue-500 uppercase mb-2">{d.empresa}</p><h4 className="font-bold text-slate-900 text-xl">{d.peca}</h4></div>
                          <div className="text-right">
                              <p className="font-black text-slate-900 text-lg">{formatLocalDate(d.data)}</p>
                              <p className={`text-[10px] font-black uppercase mt-1 ${getDaysDiff(d.data) <= 1 ? 'text-red-500' : 'text-slate-400'}`}>Restam {getDaysDiff(d.data)} dias</p>
                          </div>
                        </div>
                      ))}
                    </div>
                </div>
                <div className="col-span-4 bg-[#020617] p-12 rounded-[3.5rem] shadow-2xl flex flex-col">
                    <h3 className="text-2xl font-black text-white mb-12">Desempenho</h3>
                    <div className="flex-1 flex flex-col items-center justify-center h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={chartData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={10} dataKey="value" stroke="none">
                                {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                              </Pie>
                            </PieChart>
                        </ResponsiveContainer>
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
                        <p className="text-[11px] font-bold text-slate-400 uppercase">{d.empresa} • {d.responsavel}</p>
                        {d.documentUrl && <a href={d.documentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-[10px] mt-2 inline-block font-black uppercase tracking-widest border-b-2 border-blue-100 hover:border-blue-600 transition-all">Ver Documento Processual →</a>}
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

        {view === 'correspondence' && (
          <div className="animate-in fade-in duration-500 space-y-12">
            <div className="grid grid-cols-12 gap-8">
              <div className="col-span-4 bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Próximo Ofício Livre</p>
                <h3 className="text-7xl font-black text-blue-600 tracking-tighter">
                  {nextOficioNumber.toString().padStart(3, '0')}
                </h3>
                <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-t border-slate-100 pt-6 w-full">Próximo Memorando Livre</p>
                <h3 className="text-7xl font-black text-amber-600 tracking-tighter">
                  {nextMemorandoNumber.toString().padStart(3, '0')}
                </h3>
              </div>
              <div className="col-span-8 bg-[#020617] p-10 rounded-[2.5rem] shadow-xl text-white flex flex-col">
                <h3 className="text-2xl font-black mb-6 flex items-center gap-3"><Icons.Table /> Controle de Numeração Seguro</h3>
                <p className="text-slate-400 text-sm mb-8 leading-relaxed">Números utilizados são destacados em <b>Vermelho</b> e bloqueados. Para liberar um número ou realizar ações em massa, sua senha de administrador será exigida.</p>
                <div className="mt-auto flex gap-4 p-2 bg-white/5 rounded-2xl w-fit">
                   <button onClick={() => setActiveCorrespondenceTab('oficio')} className={`px-10 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeCorrespondenceTab === 'oficio' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}>Ofícios</button>
                   <button onClick={() => setActiveCorrespondenceTab('memorando')} className={`px-10 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeCorrespondenceTab === 'memorando' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' : 'text-slate-500 hover:text-slate-300'}`}>Memorandos</button>
                </div>
              </div>
            </div>

            <div className="bg-white p-12 rounded-[3.5rem] shadow-xl border border-slate-100">
               <div className="flex justify-between items-center mb-10">
                  <h4 className="text-xl font-black text-slate-900 flex items-center gap-3">
                    Painel: {activeCorrespondenceTab === 'oficio' ? 'Ofícios' : 'Memorandos'}
                  </h4>
                  <div className="flex gap-4">
                     <button onClick={async () => {
                        if(confirm(`Tem certeza que deseja LIMPAR todos os registros de ${activeCorrespondenceTab === 'oficio' ? 'Ofícios' : 'Memorandos'}?`)) {
                           const isVerified = await verifyAdminPassword();
                           if (!isVerified) return;
                           try {
                              await setDoc(doc(db, "correspondence", user.uid), { [activeCorrespondenceTab]: [] }, { merge: true });
                              alert("Categoria limpa com sucesso!");
                           } catch (err: any) {
                              alert("Erro ao limpar categoria: " + err.message);
                           }
                        }
                     }} className="px-6 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-[10px] uppercase border border-red-100 transition-all">Limpar Categoria</button>
                  </div>
               </div>

               <div className="grid grid-cols-10 gap-4">
                  {Array.from({ length: maxOficioRange }, (_, i) => i + 1).map(num => {
                    const currentList = activeCorrespondenceTab === 'oficio' ? usedOficioNumbers : usedMemorandoNumbers;
                    const isUsed = currentList.includes(num);
                    const isNext = num === (activeCorrespondenceTab === 'oficio' ? nextOficioNumber : nextMemorandoNumber);
                    
                    return (
                      <button 
                        key={num} 
                        onClick={() => handleToggleCorrespondenceNumber(num, activeCorrespondenceTab)}
                        className={`aspect-square flex flex-col items-center justify-center rounded-2xl font-black text-sm transition-all border-2
                          ${isUsed 
                            ? 'bg-red-100 border-red-300 text-red-700 shadow-inner scale-95' 
                            : isNext 
                              ? (activeCorrespondenceTab === 'oficio' ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-amber-600 text-amber-600 bg-amber-50') + ' animate-pulse shadow-md border-dashed' 
                              : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                          }`}
                      >
                        <span className="text-[14px]">{num.toString().padStart(3, '0')}</span>
                        {isUsed && (
                          <div className="mt-1 text-red-500 animate-in zoom-in-50 duration-300">
                             <Icons.Lock />
                          </div>
                        )}
                      </button>
                    );
                  })}
               </div>
               <div className="mt-12 flex justify-center">
                  <button onClick={() => setMaxOficioRange(p => p + 100)} className="px-12 py-5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm transition-all">Ver Mais Números</button>
               </div>
            </div>
          </div>
        )}

        {view === 'reports' && (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="bg-white p-10 rounded-[2.5rem] shadow-sm">
                <h3 className="text-lg font-black mb-8 text-slate-800">Filtros de Relatório</h3>
                <div className="grid grid-cols-4 gap-6">
                   <select className="w-full bg-slate-50 p-5 rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-100" value={reportFilters.empresa} onChange={e => setReportFilters(p => ({ ...p, empresa: e.target.value }))}>
                      <option value="">Todos os Clientes</option>
                      {dynamicSettings.empresas.map(emp => <option key={emp} value={emp}>{emp}</option>)}
                   </select>
                   <select className="w-full bg-slate-50 p-5 rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-100" value={reportFilters.responsavel} onChange={e => setReportFilters(p => ({ ...p, responsavel: e.target.value }))}>
                      <option value="">Todos os Membros</option>
                      {dynamicSettings.responsaveis.map(resp => <option key={resp} value={resp}>{resp}</option>)}
                   </select>
                   <input type="date" className="w-full bg-slate-50 p-5 rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-100" value={reportFilters.dataInicio} onChange={e => setReportFilters(p => ({ ...p, dataInicio: e.target.value }))} />
                   <input type="date" className="w-full bg-slate-50 p-5 rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-100" value={reportFilters.dataFim} onChange={e => setReportFilters(p => ({ ...p, dataFim: e.target.value }))} />
                </div>
                <button onClick={handleExportCSV} className="mt-8 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-emerald-500/10 hover:bg-emerald-700 transition-all">Exportar Planilha (CSV)</button>
             </div>
             <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100">
                <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                   {filteredDeadlines.map(d => (
                     <div key={d.id} className="p-8 border-b border-slate-50 flex justify-between items-center last:border-0 hover:bg-slate-50/50 transition-colors">
                        <div>
                           <p className="text-[10px] font-black text-blue-500 uppercase mb-1">{d.empresa}</p>
                           <h4 className="font-bold text-slate-900 text-lg">{d.peca}</h4>
                        </div>
                        <div className="text-right">
                           <p className="font-black text-slate-900 text-lg mb-1">{formatLocalDate(d.data)}</p>
                           <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-slate-100 text-slate-600">{d.status}</span>
                        </div>
                     </div>
                   ))}
                   {filteredDeadlines.length === 0 && (
                     <div className="p-20 text-center text-slate-400 font-bold uppercase italic tracking-widest">Nenhum registro encontrado.</div>
                   )}
                </div>
             </div>
          </div>
        )}

        {view === 'settings' && (
          <div className="grid grid-cols-3 gap-8 animate-in fade-in duration-500">
             <div className="bg-white p-10 rounded-[2.5rem] shadow-sm flex flex-col border border-slate-100">
                <h3 className="text-2xl font-black mb-8 flex items-center gap-3"><div className="w-2 h-8 bg-blue-600 rounded-full" /> Gestão de Time</h3>
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] custom-scrollbar pr-2">
                   {dynamicSettings.responsaveis.map((r, i) => (
                      <div key={i} className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl group border border-transparent hover:border-blue-100 transition-all">
                         <span className="font-bold text-slate-700 text-sm">{r}</span>
                         <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEditSetting(i, dynamicSettings.responsaveis, 'responsaveis')} className="text-blue-500 p-2 hover:bg-white rounded-lg transition-all"><Icons.Edit /></button>
                            <button onClick={() => handleDeleteSetting(i, dynamicSettings.responsaveis, 'responsaveis')} className="text-red-400 p-2 hover:bg-white rounded-lg transition-all"><Icons.Trash /></button>
                         </div>
                      </div>
                   ))}
                </div>
                <button disabled={isSavingSettings} onClick={() => {
                   const n = prompt("Nome completo do Advogado:");
                   if(n && n.trim() !== "") updateSettings('responsaveis', [...dynamicSettings.responsaveis, n.toUpperCase()]);
                }} className="mt-6 w-full p-5 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50 hover:text-blue-600 transition-all">+ Adicionar Membro</button>
             </div>
             
             <div className="bg-white p-10 rounded-[2.5rem] shadow-sm flex flex-col border border-slate-100">
                <h3 className="text-2xl font-black mb-8 flex items-center gap-3"><div className="w-2 h-8 bg-amber-500 rounded-full" /> Tipos de Peça</h3>
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] custom-scrollbar pr-2">
                   {dynamicSettings.pecas.map((p, i) => (
                      <div key={i} className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl group border border-transparent hover:border-amber-100 transition-all">
                         <span className="font-bold text-slate-700 text-sm">{p}</span>
                         <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEditSetting(i, dynamicSettings.pecas, 'pecas')} className="text-blue-500 p-2 hover:bg-white rounded-lg transition-all"><Icons.Edit /></button>
                            <button onClick={() => handleDeleteSetting(i, dynamicSettings.pecas, 'pecas')} className="text-red-400 p-2 hover:bg-white rounded-lg transition-all"><Icons.Trash /></button>
                         </div>
                      </div>
                   ))}
                </div>
                <button disabled={isSavingSettings} onClick={() => {
                   const n = prompt("Descrição do Tipo de Peça:");
                   if(n && n.trim() !== "") updateSettings('pecas', [...dynamicSettings.pecas, n]);
                }} className="mt-6 w-full p-5 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50 hover:text-amber-500 transition-all">+ Adicionar Tipo</button>
             </div>

             <div className="bg-white p-10 rounded-[2.5rem] shadow-sm flex flex-col border border-slate-100">
                <h3 className="text-2xl font-black mb-8 flex items-center gap-3"><div className="w-2 h-8 bg-emerald-500 rounded-full" /> Carteira de Clientes</h3>
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] custom-scrollbar pr-2">
                   {dynamicSettings.empresas.map((e, i) => (
                      <div key={i} className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl group border border-transparent hover:border-emerald-100 transition-all">
                         <span className="font-bold text-slate-700 text-sm">{e}</span>
                         <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEditSetting(i, dynamicSettings.empresas, 'empresas')} className="text-blue-500 p-2 hover:bg-white rounded-lg transition-all"><Icons.Edit /></button>
                            <button onClick={() => handleDeleteSetting(i, dynamicSettings.empresas, 'empresas')} className="text-red-400 p-2 hover:bg-white rounded-lg transition-all"><Icons.Trash /></button>
                         </div>
                      </div>
                   ))}
                </div>
                <button disabled={isSavingSettings} onClick={() => {
                   const n = prompt("Nome da Empresa/Cliente:");
                   if(n && n.trim() !== "") updateSettings('empresas', [...dynamicSettings.empresas, n.toUpperCase()]);
                }} className="mt-6 w-full p-5 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50 hover:text-emerald-500 transition-all">+ Adicionar Cliente</button>
             </div>
          </div>
        )}

        <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetDeadlineForm(); }} title={editingDeadlineId ? "Editar Prazo Processual" : "Novo Registro de Prazo"}>
          <form onSubmit={handleAddDeadline} className="grid grid-cols-2 gap-8">
            <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Tipo de Documento</label><select className="w-full bg-slate-50 p-6 rounded-2xl font-bold focus:ring-2 focus:ring-blue-100 outline-none" value={newDeadline.peca} onChange={e => setNewDeadline(p => ({ ...p, peca: e.target.value }))} required><option value="">Selecione...</option>{dynamicSettings.pecas.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
            <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Empresa / Cliente</label><select className="w-full bg-slate-50 p-6 rounded-2xl font-bold focus:ring-2 focus:ring-blue-100 outline-none" value={newDeadline.empresa} onChange={e => setNewDeadline(p => ({ ...p, empresa: e.target.value }))} required><option value="">Selecione...</option>{dynamicSettings.empresas.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
            <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Data Limite</label><input type="date" className="w-full bg-slate-50 p-6 rounded-2xl font-bold focus:ring-2 focus:ring-blue-100 outline-none" value={newDeadline.data} onChange={e => setNewDeadline(p => ({ ...p, data: e.target.value }))} required /></div>
            <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Responsável</label><select className="w-full bg-slate-50 p-6 rounded-2xl font-bold focus:ring-2 focus:ring-blue-100 outline-none" value={newDeadline.responsavel} onChange={e => setNewDeadline(p => ({ ...p, responsavel: e.target.value }))} required><option value="">Selecione...</option>{dynamicSettings.responsaveis.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
            <div className="col-span-2 space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Link do Processo / Documento (Google Drive)</label><input type="url" className="w-full bg-slate-50 p-6 rounded-2xl font-bold focus:ring-2 focus:ring-blue-100 outline-none" value={newDeadline.documentUrl || ''} onChange={e => setNewDeadline(p => ({ ...p, documentUrl: e.target.value }))} placeholder="https://drive.google.com/..." /></div>
            <div className="col-span-2 space-y-4">
              <div className="flex justify-between items-center px-4"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Objeto da Ação / Assunto</label><button type="button" disabled={isSuggesting || !newDeadline.peca || !newDeadline.empresa} onClick={async () => { setIsSuggesting(true); const suggestion = await suggestActionObject(newDeadline.peca!, newDeadline.empresa!); setNewDeadline(prev => ({ ...prev, assunto: suggestion })); setIsSuggesting(false); }} className="text-[9px] font-black uppercase flex items-center gap-2 px-6 py-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Icons.Sparkles /> {isSuggesting ? 'GERANDO...' : 'IA SUGERIR'}</button></div>
              <textarea className="w-full bg-slate-50 p-8 rounded-3xl font-medium min-h-[120px] focus:ring-2 focus:ring-blue-100 outline-none" placeholder="Descreva os detalhes do prazo processual..." value={newDeadline.assunto} onChange={e => setNewDeadline(p => ({ ...p, assunto: e.target.value }))} required />
            </div>
            <button type="submit" className="col-span-2 bg-slate-900 text-white p-7 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 active:scale-95">{editingDeadlineId ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR REGISTRO'}</button>
          </form>
        </Modal>
      </main>
    </div>
  );
}
