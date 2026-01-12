
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Deadline, 
  DeadlineStatus,
  NotificationSettings,
  AuthUser,
  Jurisprudencia
} from './types';
import { 
  Icons, 
  PECA_OPTIONS as INITIAL_PECAS, 
  RESPONSAVEL_OPTIONS as INITIAL_RESPONSAVEIS,
  EMPRESA_OPTIONS as INITIAL_EMPRESAS,
  AREA_DIREITO_OPTIONS as INITIAL_AREAS,
  ORGAO_JULGADOR_OPTIONS as INITIAL_ORGAOS,
  TEMA_JURIS_OPTIONS as INITIAL_TEMAS
} from './constants';
import { suggestActionObject } from './services/geminiService';

// Gráficos
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

// PDF Export
import { jsPDF } from "jspdf";
import "jspdf-autotable";

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
    { id: 'jurisprudencia', label: 'Jurisprudências', icon: <Icons.Jurisprudencia /> },
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
          Criado por Rudy Endo (Versão 1.1.29)
        </p>
      </div>
    </aside>
  );
};

export default function App() {
  const [view, setView] = useState('dashboard');
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [jurisprudencias, setJurisprudencias] = useState<Jurisprudencia[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isJurisModalOpen, setIsJurisModalOpen] = useState(false);
  const [editingDeadlineId, setEditingDeadlineId] = useState<string | null>(null);
  const [editingJurisId, setEditingJurisId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [correspondencePermissionError, setCorrespondencePermissionError] = useState<string | null>(null);
  const [jurisSearch, setJurisSearch] = useState('');
  
  // Correspondência
  const [usedOficioNumbers, setUsedOficioNumbers] = useState<number[]>([]);
  const [usedMemorandoNumbers, setUsedMemorandoNumbers] = useState<number[]>([]);
  const [activeCorrespondenceTab, setActiveCorrespondenceTab] = useState<'oficio' | 'memorando'>('oficio');
  const [maxOficioRange, setMaxOficioRange] = useState(50);

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
    empresas: INITIAL_EMPRESAS,
    areasDireito: INITIAL_AREAS,
    orgaosJulgadores: INITIAL_ORGAOS,
    temasJuris: INITIAL_TEMAS
  });

  const [newDeadline, setNewDeadline] = useState<Partial<Deadline>>({
    peca: '', responsavel: '', empresa: '', assunto: '', instituicao: '',
    data: new Date().toISOString().split('T')[0], hora: '', status: DeadlineStatus.PENDING,
    documentUrl: ''
  });

  const [newJuris, setNewJuris] = useState<Partial<Jurisprudencia>>({
    area: '', tema: '', orgao: '', enunciado: ''
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
          empresas: data.empresas || INITIAL_EMPRESAS,
          areasDireito: data.areasDireito || INITIAL_AREAS,
          orgaosJulgadores: data.orgaosJulgadores || INITIAL_ORGAOS,
          temasJuris: data.temasJuris || INITIAL_TEMAS
        }));
        setPermissionError(null);
      } else {
        // Inicialização do documento de configurações se não existir
        setDoc(settingsRef, {
          userId: user.uid,
          responsaveis: INITIAL_RESPONSAVEIS,
          pecas: INITIAL_PECAS,
          empresas: INITIAL_EMPRESAS,
          areasDireito: INITIAL_AREAS,
          orgaosJulgadores: INITIAL_ORGAOS,
          temasJuris: INITIAL_TEMAS,
          createdAt: new Date().toISOString()
        }).catch((err) => {
          if (err.code === 'permission-denied') {
            setPermissionError("ERRO DE PERMISSÃO: Firestore negou acesso.");
          }
        });
      }
    }, (error) => {
      if (error.code === 'permission-denied') setPermissionError("Sem permissão para ler as configurações.");
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
        if (error.code === 'permission-denied') setPermissionError("Erro de acesso à coleção 'deadlines'.");
    });
    return () => unsubscribe();
  }, [user]);

  // Sync Jurisprudências
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "jurisprudencias"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Jurisprudencia[];
      setJurisprudencias(loaded.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    }, (error) => {
      if (error.code === 'permission-denied') setPermissionError("Erro de acesso à coleção 'jurisprudencias'.");
    });
    return () => unsubscribe();
  }, [user]);

  // Sync Correspondência
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
        setDoc(oficioRef, { oficio: [], memorando: [] }, { merge: true }).catch((err) => {
          if (err.code === 'permission-denied') {
            setCorrespondencePermissionError("ERRO DE PERMISSÃO: Correspondência.");
          }
        });
      }
    }, (error) => {
      if (error.code === 'permission-denied') setCorrespondencePermissionError("Sem permissão para Correspondência.");
    });
    return () => unsubscribe();
  }, [user]);

  // Verificação de Senha Admin
  const verifyAdminPassword = async (): Promise<boolean> => {
    const password = prompt("Esta operação requer privilégios de administrador. Digite sua SENHA de login:");
    if (!password || !user?.email || !auth.currentUser) return false;

    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(auth.currentUser, credential);
      return true;
    } catch (error: any) {
      alert("Acesso negado: Senha incorreta.");
      return false;
    }
  };

  const handleToggleCorrespondenceNumber = async (num: number, category: 'oficio' | 'memorando') => {
    if (!user) return;
    const currentList = category === 'oficio' ? usedOficioNumbers : usedMemorandoNumbers;
    const isAlreadyUsed = currentList.includes(num);

    let updated;
    if (isAlreadyUsed) {
      const isVerified = await verifyAdminPassword();
      if (!isVerified) return;
      updated = currentList.filter(n => n !== num);
    } else {
      updated = [...currentList, num].sort((a, b) => a - b);
    }

    try {
      const oficioRef = doc(db, "correspondence", user.uid);
      await setDoc(oficioRef, { [category]: updated }, { merge: true });
    } catch (err: any) {
      alert("Erro ao salvar numeração.");
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
    } catch (err: any) { alert("Erro de Autenticação."); }
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

  const resetJurisForm = () => {
    setNewJuris({ area: '', tema: '', orgao: '', enunciado: '' });
    setEditingJurisId(null);
  };

  const handleEditClick = (d: Deadline) => {
    setEditingDeadlineId(d.id);
    setNewDeadline({ ...d });
    setIsModalOpen(true);
  };

  const handleEditJurisClick = (j: Jurisprudencia) => {
    setEditingJurisId(j.id);
    setNewJuris({ ...j });
    setIsJurisModalOpen(true);
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
    } catch (err: any) { alert("Erro ao salvar prazo."); }
  };

  const handleAddJuris = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      if (editingJurisId) {
        await updateDoc(doc(db, "jurisprudencias", editingJurisId), {
          ...newJuris,
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, "jurisprudencias"), {
          ...newJuris,
          userId: user.uid,
          createdAt: new Date().toISOString()
        });
      }
      setIsJurisModalOpen(false);
      resetJurisForm();
    } catch (err) { alert("Erro ao salvar jurisprudência."); }
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

  const deleteJuris = async (id: string) => {
    if (confirm("Remover permanentemente esta jurisprudência?")) await deleteDoc(doc(db, "jurisprudencias", id));
  };

  const handleSendToReview = (d: Deadline) => {
    if (!d.documentUrl) {
      alert("Nenhum link de documento associado.");
      return;
    }
    const phone = "5584999598686";
    const message = `Solicito revisão: *${d.peca}* (Cliente: *${d.empresa}*). Link: ${d.documentUrl}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
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

  const filteredJuris = useMemo(() => {
    if (!jurisSearch) return jurisprudencias;
    const s = jurisSearch.toLowerCase();
    return jurisprudencias.filter(j => 
      j.tema.toLowerCase().includes(s) || 
      j.area.toLowerCase().includes(s) || 
      j.enunciado.toLowerCase().includes(s) ||
      j.orgao.toLowerCase().includes(s)
    );
  }, [jurisprudencias, jurisSearch]);

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
    link.download = `relatorio_prazos.csv`;
    link.click();
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("JurisControl - Relatório de Prazos", 14, 15);
    const tableData = filteredDeadlines.map(d => [
      d.empresa,
      d.peca,
      d.responsavel,
      formatLocalDate(d.data),
      d.status
    ]);
    (doc as any).autoTable({
      head: [['Empresa', 'Peça', 'Responsável', 'Data', 'Status']],
      body: tableData,
      startY: 20
    });
    doc.save("relatorio_prazos.pdf");
  };

  if (authLoading) return <div className="fixed inset-0 bg-[#020617] flex items-center justify-center text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em]">JurisControl...</div>;
  if (!user) return <AuthScreen onLogin={handleLogin} loading={authLoading} />;

  return (
    <div className="flex bg-[#F8FAFC] min-h-screen antialiased">
      <Sidebar currentView={view} setView={setView} user={user} onLogout={() => signOut(auth)} />
      
      <main className="ml-[280px] flex-1 p-16">
        {(permissionError || correspondencePermissionError) && (
          <div className="mb-12 p-10 bg-red-50 border border-red-200 rounded-[3rem] animate-in slide-in-from-top-4 duration-300 shadow-2xl">
             <div className="flex items-start gap-8 text-red-700">
               <div className="p-4 bg-red-100 rounded-2xl shadow-sm"><Icons.AlertCircle /></div>
               <div className="flex-1">
                  <p className="font-black text-2xl tracking-tight mb-4 uppercase italic">Erro de Permissão Detectado</p>
                  <p className="text-base font-medium leading-relaxed mb-8 opacity-80">O Firestore está bloqueando o acesso aos seus dados. Para corrigir, copie as regras abaixo e cole no seu Console do Firebase:</p>
                  
                  <div className="bg-slate-900 p-8 rounded-[2rem] border border-white/10 shadow-inner mb-8 relative group">
                    <pre className="text-[11px] font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /settings/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /deadlines/{deadlineId} {
      allow read, write: if request.auth != null && (request.resource.data.userId == request.auth.uid || resource.data.userId == request.auth.uid);
    }
    match /jurisprudencias/{jurisId} {
      allow read, write: if request.auth != null && (request.resource.data.userId == request.auth.uid || resource.data.userId == request.auth.uid);
    }
    match /correspondence/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}`}
                    </pre>
                  </div>
                  
                  <div className="flex items-center gap-4 bg-white/50 p-6 rounded-2xl border border-red-100">
                    <span className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center font-black">!</span>
                    <p className="text-xs font-bold text-red-900">Acesse: Console do Firebase > Firestore > Rules. Cole e clique em 'Publish'.</p>
                  </div>
               </div>
             </div>
          </div>
        )}

        <header className="flex justify-between items-center mb-16">
          <div>
            <h2 className="text-6xl font-black text-[#0F172A] tracking-tighter mb-1 uppercase italic">
              {view === 'dashboard' ? 'Dashboard' : view === 'deadlines' ? 'Controle Geral' : view === 'correspondence' ? 'Ofícios e Memorandos' : view === 'jurisprudencia' ? 'Jurisprudências' : view === 'reports' ? 'Relatórios' : 'Gestão do Sistema'}
            </h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">PERFORMANCE MÁXIMA</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
             {view === 'jurisprudencia' ? (
               <button onClick={() => { resetJurisForm(); setIsJurisModalOpen(true); }} className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black text-sm shadow-2xl shadow-blue-600/30 hover:bg-blue-700 hover:scale-[1.02] transition-all flex items-center gap-3">
                 <Icons.Plus /> ADICIONAR PRECEDENTE
               </button>
             ) : (
               <button onClick={() => { resetDeadlineForm(); setIsModalOpen(true); }} className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black text-sm shadow-2xl shadow-blue-600/30 hover:bg-blue-700 hover:scale-[1.02] transition-all flex items-center gap-3">
                 <Icons.Plus /> REGISTRAR NOVO PRAZO
               </button>
             )}
          </div>
        </header>

        {view === 'dashboard' && (
          <div className="animate-in fade-in duration-500">
             <section className="grid grid-cols-4 gap-8 mb-16">
                <div className="bg-white p-10 rounded-[2.5rem] border-l-[12px] border-red-600 shadow-xl flex justify-between items-center">
                  <div><p className="text-[11px] font-black text-slate-400 uppercase mb-2 tracking-widest">ATRASADOS</p><span className="text-7xl font-black text-[#0F172A] tracking-tighter">{stats.atrasados}</span></div>
                </div>
                <div className="bg-white p-10 rounded-[2.5rem] border-l-[12px] border-orange-500 shadow-xl flex justify-between items-center">
                  <div><p className="text-[11px] font-black text-slate-400 uppercase mb-2 tracking-widest">FATAIS HOJE</p><span className="text-7xl font-black text-[#0F172A] tracking-tighter">{stats.fatais}</span></div>
                </div>
                <div className="bg-white p-10 rounded-[2.5rem] border-l-[12px] border-amber-500 shadow-xl flex justify-between items-center">
                  <div><p className="text-[11px] font-black text-slate-400 uppercase mb-2 tracking-widest">AMANHÃ</p><span className="text-7xl font-black text-[#0F172A] tracking-tighter">{stats.amanha}</span></div>
                </div>
                <div className="bg-white p-10 rounded-[2.5rem] border-l-[12px] border-emerald-500 shadow-xl flex justify-between items-center">
                  <div><p className="text-[11px] font-black text-slate-400 uppercase mb-2 tracking-widest">PRÓX. 5 DIAS</p><span className="text-7xl font-black text-[#0F172A] tracking-tighter">{stats.prox5dias}</span></div>
                </div>
             </section>
             <div className="grid grid-cols-12 gap-10">
                <div className="col-span-8 bg-white p-14 rounded-[3.5rem] shadow-2xl min-h-[500px]">
                    <h3 className="text-3xl font-black text-[#0F172A] mb-14 flex items-center gap-6 uppercase italic tracking-tight">Próximas Entregas Críticas</h3>
                    <div className="space-y-6">
                      {deadlines.filter(d => d.status === DeadlineStatus.PENDING).slice(0, 5).map(d => (
                        <div key={d.id} className="flex justify-between items-center p-8 bg-slate-50/70 rounded-[2.5rem] border border-transparent hover:border-blue-200 transition-all hover:bg-white hover:shadow-lg">
                          <div className="flex-1 pr-8">
                             <p className="text-[11px] font-black text-blue-600 uppercase mb-2 tracking-wider">{d.empresa} • {d.responsavel}</p>
                             <h4 className="font-bold text-slate-900 text-2xl tracking-tight">{d.peca}</h4>
                          </div>
                          <div className="flex items-center gap-8">
                            <div className="text-right">
                                <p className="font-black text-slate-900 text-xl tracking-tighter">{formatLocalDate(d.data)}</p>
                                <p className={`text-[11px] font-black uppercase mt-1 ${getDaysDiff(d.data) <= 1 ? 'text-red-500' : 'text-slate-400'}`}>Faltam {getDaysDiff(d.data)} dias</p>
                            </div>
                            <button onClick={() => toggleStatus(d)} className="w-16 h-16 flex items-center justify-center bg-white border border-slate-200 text-emerald-500 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm hover:shadow-emerald-200">
                               <Icons.Check />
                            </button>
                          </div>
                        </div>
                      ))}
                      {deadlines.filter(d => d.status === DeadlineStatus.PENDING).length === 0 && (
                        <div className="py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs italic">Sem prazos pendentes no momento</div>
                      )}
                    </div>
                </div>
                <div className="col-span-4 bg-[#020617] p-14 rounded-[3.5rem] shadow-2xl flex flex-col">
                    <h3 className="text-2xl font-black text-white mb-14 uppercase italic tracking-tight">Estatísticas Reais</h3>
                    <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={chartData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={8} dataKey="value" stroke="none">
                                {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                              </Pie>
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                              />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-10 space-y-4">
                       <div className="flex justify-between items-center text-xs font-bold uppercase text-slate-400 px-4">
                          <span>Concluídos</span>
                          <span className="text-emerald-400">{deadlines.filter(d => d.status === DeadlineStatus.COMPLETED).length}</span>
                       </div>
                       <div className="flex justify-between items-center text-xs font-bold uppercase text-slate-400 px-4">
                          <span>Pendentes</span>
                          <span className="text-blue-400">{deadlines.filter(d => d.status === DeadlineStatus.PENDING).length}</span>
                       </div>
                    </div>
                </div>
             </div>
          </div>
        )}

        {view === 'deadlines' && (
          <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
             <div className="divide-y divide-slate-100">
                {deadlines.map(d => (
                  <div key={d.id} className="p-12 flex flex-col hover:bg-slate-50/50 transition-all border-l-[12px] border-transparent hover:border-blue-500">
                    <div className="flex justify-between items-start mb-6 w-full">
                      <div className="flex-1 pr-12">
                        <div className="flex items-center gap-4 mb-3">
                          <span className="font-black text-[#0F172A] text-2xl tracking-tight uppercase italic">{d.peca}</span>
                          <span className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${d.status === DeadlineStatus.COMPLETED ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{d.status}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="text-[12px] font-black text-slate-400 uppercase tracking-wider">{d.empresa} • ADV: {d.responsavel}</p>
                          {d.documentUrl && (
                            <a href={d.documentUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                              <Icons.ExternalLink />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-5">
                        <div className="text-right min-w-[150px] mr-6">
                           <p className="font-black text-[#0F172A] text-2xl tracking-tighter">{formatLocalDate(d.data)}</p>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">DATA LIMITE</p>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={() => toggleStatus(d)} title="Marcar como Concluído" className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"><Icons.Check /></button>
                          <button onClick={() => handleSendToReview(d)} title="Enviar p/ Revisão" className="w-14 h-14 bg-cyan-50 text-cyan-600 rounded-2xl hover:bg-cyan-600 hover:text-white transition-all shadow-sm"><Icons.Review /></button>
                          <button onClick={() => handleEditClick(d)} title="Editar Prazo" className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Icons.Edit /></button>
                          <button onClick={() => deleteDeadline(d.id)} title="Remover Registro" className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm"><Icons.Trash /></button>
                        </div>
                      </div>
                    </div>
                    <div className="pt-8 border-t border-slate-50 w-full">
                       <p className="text-slate-600 text-base leading-relaxed font-medium italic opacity-80">"{d.assunto}"</p>
                    </div>
                  </div>
                ))}
                {deadlines.length === 0 && (
                   <div className="p-40 text-center opacity-40">
                      <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-8"><Icons.List /></div>
                      <p className="text-xl font-black uppercase italic tracking-widest">Nenhum prazo cadastrado</p>
                   </div>
                )}
             </div>
          </div>
        )}

        {view === 'jurisprudencia' && (
          <div className="space-y-12 animate-in fade-in duration-500">
             <div className="bg-white p-14 rounded-[4rem] shadow-2xl flex items-center justify-between border border-slate-100">
                <div className="flex-1 max-w-2xl relative">
                   <div className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-400"><Icons.Search /></div>
                   <input 
                    type="text" 
                    placeholder="Filtrar por tema, área ou trecho da ementa..." 
                    className="w-full bg-slate-50 p-7 pl-20 rounded-[2.5rem] font-bold text-base outline-none focus:ring-4 focus:ring-blue-100 transition-all border border-transparent focus:border-blue-200"
                    value={jurisSearch}
                    onChange={e => setJurisSearch(e.target.value)}
                   />
                </div>
                <div className="text-right pl-10 border-l border-slate-100">
                   <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">REPERTÓRIO</p>
                   <p className="text-5xl font-black text-slate-900 tracking-tighter italic">{filteredJuris.length}</p>
                </div>
             </div>

             <div className="grid grid-cols-1 gap-10">
                {filteredJuris.map(j => (
                  <div key={j.id} className="bg-white p-14 rounded-[4rem] shadow-2xl border border-slate-100 hover:border-blue-300 transition-all group relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-48 h-48 bg-blue-50/50 rounded-full -mr-24 -mt-24 transition-all group-hover:bg-blue-100/50" />
                     
                     <div className="flex justify-between items-start mb-10 relative z-10">
                        <div>
                           <div className="flex items-center gap-3 mb-6">
                              <span className="px-6 py-2 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200">
                                {j.area}
                              </span>
                              <span className="px-6 py-2 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                                {j.orgao}
                              </span>
                           </div>
                           <h3 className="text-4xl font-black text-slate-900 tracking-tight leading-tight uppercase italic max-w-4xl">{j.tema}</h3>
                        </div>
                        <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                           <button onClick={() => handleEditJurisClick(j)} className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Icons.Edit /></button>
                           <button onClick={() => deleteJuris(j.id)} className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm"><Icons.Trash /></button>
                        </div>
                     </div>
                     <div className="bg-slate-50 p-12 rounded-[3rem] border border-slate-100 relative z-10">
                        <p className="text-slate-700 text-xl leading-relaxed font-medium italic opacity-90">
                          "{j.enunciado}"
                        </p>
                     </div>
                  </div>
                ))}
                {filteredJuris.length === 0 && (
                  <div className="p-40 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-200 opacity-50">
                     <div className="inline-flex items-center justify-center w-32 h-32 bg-slate-50 rounded-full mb-10 text-slate-300"><Icons.Jurisprudencia /></div>
                     <p className="text-2xl font-black uppercase italic tracking-[0.3em] text-slate-400">Sem resultados para a busca</p>
                  </div>
                )}
             </div>
          </div>
        )}

        {view === 'settings' && (
          <div className="space-y-20 animate-in fade-in duration-700">
             <section>
                <div className="flex items-center gap-6 mb-12">
                   <div className="w-3 h-12 bg-blue-600 rounded-full shadow-lg shadow-blue-200" />
                   <h3 className="text-4xl font-black text-slate-900 tracking-tight uppercase italic">Estrutura Operacional</h3>
                </div>
                <div className="grid grid-cols-3 gap-10">
                   <div className="bg-white p-12 rounded-[3.5rem] shadow-xl flex flex-col border border-slate-100 hover:shadow-2xl transition-all">
                      <div className="flex items-center justify-between mb-10">
                         <h3 className="text-2xl font-black flex items-center gap-4 uppercase italic tracking-tight">Gestão de Time</h3>
                         <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Icons.Dashboard /></div>
                      </div>
                      <div className="space-y-4 flex-1 overflow-y-auto max-h-[400px] custom-scrollbar pr-3">
                         {dynamicSettings.responsaveis.map((r, i) => (
                            <div key={i} className="flex justify-between items-center p-6 bg-slate-50 rounded-2xl group border border-transparent hover:border-blue-200 transition-all">
                               <span className="font-bold text-slate-700 text-sm">{r}</span>
                               <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleEditSetting(i, dynamicSettings.responsaveis, 'responsaveis')} className="w-10 h-10 flex items-center justify-center text-blue-500 bg-white rounded-xl shadow-sm"><Icons.Edit /></button>
                                  <button onClick={() => handleDeleteSetting(i, dynamicSettings.responsaveis, 'responsaveis')} className="w-10 h-10 flex items-center justify-center text-red-400 bg-white rounded-xl shadow-sm"><Icons.Trash /></button>
                               </div>
                            </div>
                         ))}
                      </div>
                      <button disabled={isSavingSettings} onClick={() => {
                         const n = prompt("Nome completo do Advogado:");
                         if(n && n.trim() !== "") updateSettings('responsaveis', [...dynamicSettings.responsaveis, n.toUpperCase()]);
                      }} className="mt-8 w-full p-6 border-2 border-dashed border-slate-200 rounded-2xl text-[11px] font-black uppercase text-slate-400 hover:bg-slate-50 hover:text-blue-600 transition-all tracking-widest">+ ADICIONAR MEMBRO</button>
                   </div>
                   
                   <div className="bg-white p-12 rounded-[3.5rem] shadow-xl flex flex-col border border-slate-100 hover:shadow-2xl transition-all">
                      <div className="flex items-center justify-between mb-10">
                         <h3 className="text-2xl font-black flex items-center gap-4 uppercase italic tracking-tight">Tipos de Peça</h3>
                         <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Icons.List /></div>
                      </div>
                      <div className="space-y-4 flex-1 overflow-y-auto max-h-[400px] custom-scrollbar pr-3">
                         {dynamicSettings.pecas.map((p, i) => (
                            <div key={i} className="flex justify-between items-center p-6 bg-slate-50 rounded-2xl group border border-transparent hover:border-amber-200 transition-all">
                               <span className="font-bold text-slate-700 text-sm">{p}</span>
                               <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleEditSetting(i, dynamicSettings.pecas, 'pecas')} className="w-10 h-10 flex items-center justify-center text-blue-500 bg-white rounded-xl shadow-sm"><Icons.Edit /></button>
                                  <button onClick={() => handleDeleteSetting(i, dynamicSettings.pecas, 'pecas')} className="w-10 h-10 flex items-center justify-center text-red-400 bg-white rounded-xl shadow-sm"><Icons.Trash /></button>
                               </div>
                            </div>
                         ))}
                      </div>
                      <button disabled={isSavingSettings} onClick={() => {
                         const n = prompt("Descrição do Tipo de Peça:");
                         if(n && n.trim() !== "") updateSettings('pecas', [...dynamicSettings.pecas, n]);
                      }} className="mt-8 w-full p-6 border-2 border-dashed border-slate-200 rounded-2xl text-[11px] font-black uppercase text-slate-400 hover:bg-slate-50 hover:text-amber-500 transition-all tracking-widest">+ ADICIONAR TIPO</button>
                   </div>

                   <div className="bg-white p-12 rounded-[3.5rem] shadow-xl flex flex-col border border-slate-100 hover:shadow-2xl transition-all">
                      <div className="flex items-center justify-between mb-10">
                         <h3 className="text-2xl font-black flex items-center gap-4 uppercase italic tracking-tight">Carteira de Clientes</h3>
                         <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Icons.Report /></div>
                      </div>
                      <div className="space-y-4 flex-1 overflow-y-auto max-h-[400px] custom-scrollbar pr-3">
                         {dynamicSettings.empresas.map((e, i) => (
                            <div key={i} className="flex justify-between items-center p-6 bg-slate-50 rounded-2xl group border border-transparent hover:border-emerald-200 transition-all">
                               <span className="font-bold text-slate-700 text-sm">{e}</span>
                               <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleEditSetting(i, dynamicSettings.empresas, 'empresas')} className="w-10 h-10 flex items-center justify-center text-blue-500 bg-white rounded-xl shadow-sm"><Icons.Edit /></button>
                                  <button onClick={() => handleDeleteSetting(i, dynamicSettings.empresas, 'empresas')} className="w-10 h-10 flex items-center justify-center text-red-400 bg-white rounded-xl shadow-sm"><Icons.Trash /></button>
                               </div>
                            </div>
                         ))}
                      </div>
                      <button disabled={isSavingSettings} onClick={() => {
                         const n = prompt("Nome da Empresa/Cliente:");
                         if(n && n.trim() !== "") updateSettings('empresas', [...dynamicSettings.empresas, n.toUpperCase()]);
                      }} className="mt-8 w-full p-6 border-2 border-dashed border-slate-200 rounded-2xl text-[11px] font-black uppercase text-slate-400 hover:bg-slate-50 hover:text-emerald-500 transition-all tracking-widest">+ ADICIONAR CLIENTE</button>
                   </div>
                </div>
             </section>

             <section>
                <div className="flex items-center gap-6 mb-12">
                   <div className="w-3 h-12 bg-emerald-600 rounded-full shadow-lg shadow-emerald-200" />
                   <h3 className="text-4xl font-black text-slate-900 tracking-tight uppercase italic">Inteligência Jurídica</h3>
                </div>
                <div className="grid grid-cols-3 gap-10">
                   <div className="bg-white p-12 rounded-[3.5rem] shadow-xl flex flex-col border border-slate-100 hover:shadow-2xl transition-all">
                      <div className="flex items-center justify-between mb-10">
                         <h3 className="text-2xl font-black flex items-center gap-4 uppercase italic tracking-tight">Áreas do Direito</h3>
                         <div className="p-3 bg-cyan-50 text-cyan-600 rounded-xl"><Icons.Jurisprudencia /></div>
                      </div>
                      <div className="space-y-4 flex-1 overflow-y-auto max-h-[400px] custom-scrollbar pr-3">
                         {dynamicSettings.areasDireito.map((a, i) => (
                            <div key={i} className="flex justify-between items-center p-6 bg-slate-50 rounded-2xl group border border-transparent hover:border-cyan-200 transition-all">
                               <span className="font-bold text-slate-700 text-sm">{a}</span>
                               <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleEditSetting(i, dynamicSettings.areasDireito, 'areasDireito')} className="w-10 h-10 flex items-center justify-center text-blue-500 bg-white rounded-xl shadow-sm"><Icons.Edit /></button>
                                  <button onClick={() => handleDeleteSetting(i, dynamicSettings.areasDireito, 'areasDireito')} className="w-10 h-10 flex items-center justify-center text-red-400 bg-white rounded-xl shadow-sm"><Icons.Trash /></button>
                               </div>
                            </div>
                         ))}
                         {dynamicSettings.areasDireito.length === 0 && <p className="text-[10px] text-slate-300 italic uppercase text-center py-10">Nenhuma área configurada</p>}
                      </div>
                      <button disabled={isSavingSettings} onClick={() => {
                         const n = prompt("Nome da Área:");
                         if(n && n.trim() !== "") updateSettings('areasDireito', [...dynamicSettings.areasDireito, n]);
                      }} className="mt-8 w-full p-6 border-2 border-dashed border-slate-200 rounded-2xl text-[11px] font-black uppercase text-slate-400 hover:bg-slate-50 hover:text-cyan-600 transition-all tracking-widest">+ ADICIONAR ÁREA</button>
                   </div>

                   <div className="bg-white p-12 rounded-[3.5rem] shadow-xl flex flex-col border border-slate-100 hover:shadow-2xl transition-all">
                      <div className="flex items-center justify-between mb-10">
                         <h3 className="text-2xl font-black flex items-center gap-4 uppercase italic tracking-tight">Órgãos Julgadores</h3>
                         <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Icons.Table /></div>
                      </div>
                      <div className="space-y-4 flex-1 overflow-y-auto max-h-[400px] custom-scrollbar pr-3">
                         {dynamicSettings.orgaosJulgadores.map((o, i) => (
                            <div key={i} className="flex justify-between items-center p-6 bg-slate-50 rounded-2xl group border border-transparent hover:border-indigo-200 transition-all">
                               <span className="font-bold text-slate-700 text-sm">{o}</span>
                               <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleEditSetting(i, dynamicSettings.orgaosJulgadores, 'orgaosJulgadores')} className="w-10 h-10 flex items-center justify-center text-blue-500 bg-white rounded-xl shadow-sm"><Icons.Edit /></button>
                                  <button onClick={() => handleDeleteSetting(i, dynamicSettings.orgaosJulgadores, 'orgaosJulgadores')} className="w-10 h-10 flex items-center justify-center text-red-400 bg-white rounded-xl shadow-sm"><Icons.Trash /></button>
                               </div>
                            </div>
                         ))}
                         {dynamicSettings.orgaosJulgadores.length === 0 && <p className="text-[10px] text-slate-300 italic uppercase text-center py-10">Nenhum órgão configurado</p>}
                      </div>
                      <button disabled={isSavingSettings} onClick={() => {
                         const n = prompt("Nome do Órgão:");
                         if(n && n.trim() !== "") updateSettings('orgaosJulgadores', [...dynamicSettings.orgaosJulgadores, n]);
                      }} className="mt-8 w-full p-6 border-2 border-dashed border-slate-200 rounded-2xl text-[11px] font-black uppercase text-slate-400 hover:bg-slate-50 hover:text-indigo-600 transition-all tracking-widest">+ ADICIONAR ÓRGÃO</button>
                   </div>

                   <div className="bg-white p-12 rounded-[3.5rem] shadow-xl flex flex-col border border-slate-100 hover:shadow-2xl transition-all">
                      <div className="flex items-center justify-between mb-10">
                         <h3 className="text-2xl font-black flex items-center gap-4 uppercase italic tracking-tight">Temas Recomendados</h3>
                         <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Icons.Sparkles /></div>
                      </div>
                      <div className="space-y-4 flex-1 overflow-y-auto max-h-[400px] custom-scrollbar pr-3">
                         {dynamicSettings.temasJuris.map((t, i) => (
                            <div key={i} className="flex justify-between items-center p-6 bg-slate-50 rounded-2xl group border border-transparent hover:border-purple-200 transition-all">
                               <span className="font-bold text-slate-700 text-sm">{t}</span>
                               <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleEditSetting(i, dynamicSettings.temasJuris, 'temasJuris')} className="w-10 h-10 flex items-center justify-center text-blue-500 bg-white rounded-xl shadow-sm"><Icons.Edit /></button>
                                  <button onClick={() => handleDeleteSetting(i, dynamicSettings.temasJuris, 'temasJuris')} className="w-10 h-10 flex items-center justify-center text-red-400 bg-white rounded-xl shadow-sm"><Icons.Trash /></button>
                               </div>
                            </div>
                         ))}
                         {dynamicSettings.temasJuris.length === 0 && <p className="text-[10px] text-slate-300 italic uppercase text-center py-10">Nenhum tema configurado</p>}
                      </div>
                      <button disabled={isSavingSettings} onClick={() => {
                         const n = prompt("Descrição do Tema:");
                         if(n && n.trim() !== "") updateSettings('temasJuris', [...dynamicSettings.temasJuris, n]);
                      }} className="mt-8 w-full p-6 border-2 border-dashed border-slate-200 rounded-2xl text-[11px] font-black uppercase text-slate-400 hover:bg-slate-50 hover:text-purple-600 transition-all tracking-widest">+ ADICIONAR TEMA</button>
                   </div>
                </div>
             </section>
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

        <Modal isOpen={isJurisModalOpen} onClose={() => { setIsJurisModalOpen(false); resetJurisForm(); }} title={editingJurisId ? "Editar Jurisprudência" : "Novo Cadastro de Jurisprudência"}>
          <form onSubmit={handleAddJuris} className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Área do Direito</label>
              <select className="w-full bg-slate-50 p-6 rounded-2xl font-bold focus:ring-2 focus:ring-blue-100 outline-none" value={newJuris.area} onChange={e => setNewJuris(p => ({ ...p, area: e.target.value }))} required>
                 <option value="">Selecione...</option>
                 {dynamicSettings.areasDireito.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Órgão Julgador</label>
              <select className="w-full bg-slate-50 p-6 rounded-2xl font-bold focus:ring-2 focus:ring-blue-100 outline-none" value={newJuris.orgao} onChange={e => setNewJuris(p => ({ ...p, orgao: e.target.value }))} required>
                 <option value="">Selecione...</option>
                 {dynamicSettings.orgaosJulgadores.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="col-span-2 space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Tema / Tópico Central</label>
              <select className="w-full bg-slate-50 p-6 rounded-2xl font-bold focus:ring-2 focus:ring-blue-100 outline-none" value={newJuris.tema} onChange={e => setNewJuris(p => ({ ...p, tema: e.target.value }))} required>
                 <option value="">Selecione...</option>
                 {dynamicSettings.temasJuris.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-span-2 space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Enunciado / Ementa Completa</label>
              <textarea className="w-full bg-slate-50 p-8 rounded-3xl font-medium min-h-[250px] focus:ring-2 focus:ring-blue-100 outline-none" placeholder="Cole aqui o texto da ementa ou acórdão..." value={newJuris.enunciado} onChange={e => setNewJuris(p => ({ ...p, enunciado: e.target.value }))} required />
            </div>
            <button type="submit" className="col-span-2 bg-slate-900 text-white p-7 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-600 transition-all shadow-xl active:scale-95 uppercase italic">
              {editingJurisId ? 'ATUALIZAR PRECEDENTE' : 'SALVAR JURISPRUDÊNCIA'}
            </button>
          </form>
        </Modal>
      </main>
    </div>
  );
}
