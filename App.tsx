
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Deadline, 
  DeadlineStatus,
  NotificationSettings,
  AuthUser,
  Jurisprudencia,
  Client,
  ClientProcess,
  ProcessNote
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
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-6 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl max-h-[95vh] rounded-[1.5rem] md:rounded-[2rem] shadow-2xl flex flex-col relative animate-in zoom-in-95 duration-200">
        <div className="px-6 py-5 md:px-10 md:py-8 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
             <Icons.Close />
          </button>
        </div>
        <div className="p-6 md:p-10 overflow-y-auto flex-1 custom-scrollbar">{children}</div>
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
      <div className="bg-white/5 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] w-full max-w-md border border-white/10 shadow-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/20 mb-6 text-white text-2xl font-black">JC</div>
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

const Sidebar = ({ currentView, setView, user, onLogout, isOpen, toggleSidebar }: { currentView: string, setView: (v: string) => void, user: AuthUser | null, onLogout: () => void, isOpen: boolean, toggleSidebar: () => void }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Icons.Dashboard /> },
    { id: 'clients', label: 'Clientes', icon: <Icons.Users /> }, 
    { id: 'deadlines', label: 'Controle Geral', icon: <Icons.List /> },
    { id: 'correspondence', label: 'Ofícios e Memorandos', icon: <Icons.Correspondence /> },
    { id: 'jurisprudencia', label: 'Jurisprudências', icon: <Icons.Jurisprudencia /> },
    { id: 'reports', label: 'Relatórios', icon: <Icons.Report /> },
    { id: 'settings', label: 'Gestão', icon: <Icons.Settings /> },
  ];

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] md:hidden transition-opacity" onClick={toggleSidebar}></div>
      )}
      
      <aside className={`w-[280px] bg-[#020617] text-white h-full min-h-screen flex flex-col fixed left-0 top-0 z-50 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-8 md:p-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/20">JC</div>
            <h1 className="text-xl font-black tracking-tight">JurisControl</h1>
          </div>
          <button onClick={toggleSidebar} className="md:hidden p-2 text-slate-400 hover:text-white">
            <Icons.Close />
          </button>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map(item => (
            <button 
              key={item.id}
              onClick={() => { setView(item.id); if(window.innerWidth < 768) toggleSidebar(); }} 
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-200 group ${currentView === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <span className={`${currentView === item.id ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>{item.icon}</span>
              <span className="font-bold text-[14px]">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-8 md:p-10 mt-auto border-t border-white/5 space-y-6">
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

          <p className="text-[9px] font-medium text-slate-600">
            Criado por Rudy Endo (Versão 1.1.43)
          </p>
        </div>
      </aside>
    </>
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
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [editingDeadlineId, setEditingDeadlineId] = useState<string | null>(null);
  const [editingJurisId, setEditingJurisId] = useState<string | null>(null);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [activeClientForProcesses, setActiveClientForProcesses] = useState<Client | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isFetchingCNPJ, setIsFetchingCNPJ] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [jurisSearch, setJurisSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // State para Processos e Notas
  const [newProcess, setNewProcess] = useState({ number: '', title: '' });
  const [activeProcessForNotes, setActiveProcessForNotes] = useState<string | null>(null);
  const [newNoteText, setNewNoteText] = useState('');

  // State para Formulário de Cliente
  const [clientType, setClientType] = useState<'PF' | 'PJ'>('PJ');
  const [preferredNameSource, setPreferredNameSource] = useState<'RAZAO' | 'FANTASIA'>('FANTASIA');
  const [clientForm, setClientForm] = useState<Partial<Client>>({
    name: '', document: '', driveUrl: '', tradeName: '', address: '', adminName: ''
  });
  
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
    clients: [], 
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
        const data = docSnap.data() as any;
        setDynamicSettings(prev => ({
          ...prev,
          ...data,
          responsaveis: data.responsaveis || INITIAL_RESPONSAVEIS,
          pecas: data.pecas || INITIAL_PECAS,
          empresas: data.empresas || INITIAL_EMPRESAS,
          clients: data.clients || [],
          areasDireito: data.areasDireito || INITIAL_AREAS,
          orgaosJulgadores: data.orgaosJulgadores || INITIAL_ORGAOS,
          temasJuris: data.temasJuris || INITIAL_TEMAS
        }));
        setPermissionError(null);
      } else {
        setDoc(settingsRef, {
          userId: user.uid,
          responsaveis: INITIAL_RESPONSAVEIS,
          pecas: INITIAL_PECAS,
          empresas: INITIAL_EMPRESAS,
          clients: [],
          areasDireito: INITIAL_AREAS,
          orgaosJulgadores: INITIAL_ORGAOS,
          temasJuris: INITIAL_TEMAS,
          createdAt: new Date().toISOString()
        }).catch(() => setPermissionError("Erro de Permissão."));
      }
    }, (error) => {
      if (error.code === 'permission-denied') setPermissionError("Erro de Permissão: Firestore bloqueado.");
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
        if (error.code === 'permission-denied') setPermissionError("Acesso negado à coleção 'deadlines'.");
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
      if (error.code === 'permission-denied') setPermissionError("Acesso negado à coleção 'jurisprudencias'.");
    });
    return () => unsubscribe();
  }, [user]);

  // Sync Correspondência
  useEffect(() => {
    if (!user) return;
    const oficioRef = doc(db, "correspondence", user.uid);
    const unsubscribe = onSnapshot(oficioRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        setUsedOficioNumbers(data.oficio || []);
        setUsedMemorandoNumbers(data.memorando || []);
      } else {
        setDoc(oficioRef, { oficio: [], memorando: [] }, { merge: true }).catch(() => {});
      }
    }, (error) => {
      if (error.code === 'permission-denied') console.error("Sem permissão para Correspondência.");
    });
    return () => unsubscribe();
  }, [user]);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  // Verificação de Senha Admin
  const verifyAdminPassword = async (): Promise<boolean> => {
    const password = prompt("Confirmação de Segurança. Digite sua senha:");
    if (!password || !user?.email || !auth.currentUser) return false;

    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(auth.currentUser, credential);
      return true;
    } catch (error: any) {
      alert("Autenticação falhou.");
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
      alert("Erro ao gravar numeração.");
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
    } catch (err: any) { alert("Credenciais inválidas."); }
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
    } catch (err: any) { alert("Erro ao salvar."); }
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
    } catch (err) { alert("Erro ao salvar."); }
  };

  const updateSettings = async (fieldOrUpdates: keyof NotificationSettings | Partial<NotificationSettings>, newValue?: any) => {
    if (!user) return;
    setIsSavingSettings(true);
    const settingsRef = doc(db, "settings", user.uid);
    try {
      const updates = typeof fieldOrUpdates === 'string' 
        ? { [fieldOrUpdates]: newValue } 
        : fieldOrUpdates;
      await setDoc(settingsRef, { ...updates, userId: user.uid }, { merge: true });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const toggleStatus = async (d: Deadline) => {
    const newS = d.status === DeadlineStatus.COMPLETED ? DeadlineStatus.PENDING : DeadlineStatus.COMPLETED;
    await updateDoc(doc(db, "deadlines", d.id), { status: newS });
  };

  const deleteDeadline = async (id: string) => {
    if (confirm("Remover definitivamente?")) await deleteDoc(doc(db, "deadlines", id));
  };

  const deleteJuris = async (id: string) => {
    if (confirm("Remover definitivamente?")) await deleteDoc(doc(db, "jurisprudencias", id));
  };

  const handleSendToReview = (d: Deadline) => {
    if (!d.documentUrl) {
      alert("Vincule um link primeiro.");
      return;
    }
    const phone = "5584999598686";
    const message = `Solicito revisão: *${d.peca}* (Cliente: *${d.empresa}*). Link: ${d.documentUrl}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Lógica Avançada de Consulta CNPJ
  const handleFetchCNPJ = async () => {
    const rawCnpj = (clientForm.document || '').replace(/\D/g, '');
    if (rawCnpj.length !== 14) {
      alert("CNPJ deve conter 14 dígitos.");
      return;
    }

    setIsFetchingCNPJ(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${rawCnpj}`);
      if (!response.ok) throw new Error("CNPJ não encontrado ou erro na API.");
      const data = await response.json() as any;
      
      const addr = `${data.logradouro}, ${data.numero}${data.complemento ? ' - ' + data.complemento : ''}, ${data.bairro}, ${data.municipio}/${data.uf}`;
      
      // Identifica Sócio-Administrador
      const admin = data.qsa?.find((s: any) => s.qualificacao_socio.toLowerCase().includes('administrador'));
      
      setClientForm(prev => ({ 
        ...prev, 
        name: data.razao_social,
        tradeName: data.nome_fantasia || '',
        address: addr,
        adminName: admin?.nome_socio || ''
      }));
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsFetchingCNPJ(false);
    }
  };

  const handleEditClient = (c: Client) => {
    setEditingClientId(c.id);
    setClientType(c.type);
    setClientForm({ ...c });
    // Tenta inferir a preferência se for PJ e já tiver displayName
    if (c.type === 'PJ' && c.displayName === c.name) {
      setPreferredNameSource('RAZAO');
    } else {
      setPreferredNameSource('FANTASIA');
    }
    setIsClientModalOpen(true);
  };

  const handleSaveClient = () => {
    if (!clientForm.name?.trim()) {
      alert("Preencha o nome do cliente.");
      return;
    }
    
    const clientName = clientForm.name.toUpperCase();
    const tradeName = (clientType === 'PJ' ? (clientForm.tradeName || '') : '').toUpperCase();
    
    // Nome para Exibição baseado na preferência
    let preferredName;
    if (clientType === 'PJ') {
      preferredName = (preferredNameSource === 'FANTASIA' ? (tradeName || clientName) : clientName).toUpperCase();
    } else {
      preferredName = clientName;
    }

    const isLegacy = editingClientId?.startsWith('legacy-');
    
    // Validação: Impedir duplicidade entre cadastros RICOS apenas
    const alreadyRegistered = (dynamicSettings.clients || []).some(c => 
      c.id !== editingClientId && 
      (c.name.toUpperCase() === clientName || (c.tradeName && c.tradeName.toUpperCase() === tradeName))
    );
    
    if (alreadyRegistered) {
      alert("Este cliente já possui um cadastro completo.");
      return;
    }

    const clientData: Client = {
      id: isLegacy || !editingClientId ? Math.random().toString(36).substr(2, 9) : editingClientId!,
      type: clientType,
      name: clientName,
      displayName: preferredName,
      document: clientForm.document || '',
      driveUrl: clientForm.driveUrl || '',
      tradeName: tradeName,
      address: clientType === 'PJ' ? (clientForm.address || '') : '',
      adminName: clientType === 'PJ' ? (clientForm.adminName || '') : '',
      processes: editingClientId && !isLegacy ? (dynamicSettings.clients?.find(c => c.id === editingClientId)?.processes || []) : [],
      createdAt: new Date().toISOString()
    };

    let updatedClients = [...(dynamicSettings.clients || [])];
    let updatedEmpresas = [...dynamicSettings.empresas];

    if (editingClientId) {
       if (isLegacy) {
         // Migrando cliente legado para rico
         const legacyName = editingClientId.replace('legacy-', '').toUpperCase();
         updatedClients.push(clientData);
         
         const empIdx = updatedEmpresas.findIndex(e => e.toUpperCase() === legacyName);
         if (empIdx > -1) updatedEmpresas[empIdx] = preferredName;
         else if (!updatedEmpresas.includes(preferredName)) updatedEmpresas.push(preferredName);
       } else {
         // Editando cliente rico existente
         const idx = updatedClients.findIndex(c => c.id === editingClientId);
         const oldDisplayName = updatedClients[idx].displayName.toUpperCase();
         updatedClients[idx] = clientData;

         if (oldDisplayName !== preferredName) {
           const empIdx = updatedEmpresas.findIndex(e => e.toUpperCase() === oldDisplayName);
           if (empIdx > -1) updatedEmpresas[empIdx] = preferredName;
           else if (!updatedEmpresas.includes(preferredName)) updatedEmpresas.push(preferredName);
         }
       }
    } else {
       // Novo cliente absoluto
       if (!updatedEmpresas.includes(preferredName)) {
          updatedEmpresas.push(preferredName);
       }
       updatedClients.push(clientData);
    }

    // Gravação Atômica
    updateSettings({ empresas: updatedEmpresas, clients: updatedClients });
    
    setIsClientModalOpen(false);
    setEditingClientId(null);
    setClientForm({ name: '', document: '', driveUrl: '', tradeName: '', address: '', adminName: '' });
  };

  const handleDeleteClient = (client: Client) => {
    if (!confirm(`Excluir cliente ${client.displayName}?`)) return;
    
    const preferredName = client.displayName.toUpperCase();
    const updatedEmpresas = dynamicSettings.empresas.filter(e => e.toUpperCase() !== preferredName);
    const updatedClients = (dynamicSettings.clients || []).filter(c => c.id !== client.id);
    
    updateSettings({ empresas: updatedEmpresas, clients: updatedClients });
  };

  // --- Gestão de Processos e Notas ---
  const handleOpenProcesses = (client: Client) => {
    setActiveClientForProcesses(client);
    setIsProcessModalOpen(true);
    setActiveProcessForNotes(null);
  };

  const handleAddProcess = () => {
    if (!activeClientForProcesses || !newProcess.number.trim()) return;
    
    const proc: ClientProcess = {
      id: Math.random().toString(36).substr(2, 9),
      number: newProcess.number.toUpperCase(),
      title: newProcess.title.toUpperCase(),
      notes: [],
      createdAt: new Date().toISOString()
    };

    const updatedClients = (dynamicSettings.clients || []).map(c => {
      if (c.id === activeClientForProcesses.id) {
        return { ...c, processes: [...(c.processes || []), proc] };
      }
      return c;
    });

    updateSettings('clients', updatedClients);
    setNewProcess({ number: '', title: '' });
    setActiveClientForProcesses({ ...activeClientForProcesses, processes: [...(activeClientForProcesses.processes || []), proc] });
  };

  const handleDeleteProcess = (procId: string) => {
    if (!activeClientForProcesses || !confirm("Remover este processo e todas as suas notas?")) return;
    
    const updatedClients = (dynamicSettings.clients || []).map(c => {
      if (c.id === activeClientForProcesses.id) {
        return { ...c, processes: (c.processes || []).filter(p => p.id !== procId) };
      }
      return c;
    });

    updateSettings('clients', updatedClients);
    setActiveClientForProcesses({ ...activeClientForProcesses, processes: (activeClientForProcesses.processes || []).filter(p => p.id !== procId) });
    if (activeProcessForNotes === procId) setActiveProcessForNotes(null);
  };

  const handleAddNote = (procId: string) => {
    if (!activeClientForProcesses || !newNoteText.trim()) return;
    
    const note: ProcessNote = {
      id: Math.random().toString(36).substr(2, 9),
      text: newNoteText,
      createdAt: new Date().toISOString()
    };

    const updatedClients = (dynamicSettings.clients || []).map(c => {
      if (c.id === activeClientForProcesses.id) {
        const updatedProcs = (c.processes || []).map(p => {
          if (p.id === procId) return { ...p, notes: [note, ...(p.notes || [])] };
          return p;
        });
        return { ...c, processes: updatedProcs };
      }
      return c;
    });

    updateSettings('clients', updatedClients);
    setNewNoteText('');
    
    // Atualiza localmente também para visualização imediata no modal
    setActiveClientForProcesses({
      ...activeClientForProcesses,
      processes: (activeClientForProcesses.processes || []).map(p => {
        if (p.id === procId) return { ...p, notes: [note, ...(p.notes || [])] };
        return p;
      })
    });
  };

  const handleDeleteNote = (procId: string, noteId: string) => {
    if (!activeClientForProcesses || !confirm("Remover esta anotação?")) return;
    
    const updatedClients = (dynamicSettings.clients || []).map(c => {
      if (c.id === activeClientForProcesses.id) {
        const updatedProcs = (c.processes || []).map(p => {
          if (p.id === procId) return { ...p, notes: (p.notes || []).filter(n => n.id !== noteId) };
          return p;
        });
        return { ...c, processes: updatedProcs };
      }
      return c;
    });

    updateSettings('clients', updatedClients);
    setActiveClientForProcesses({
      ...activeClientForProcesses,
      processes: (activeClientForProcesses.processes || []).map(p => {
        if (p.id === procId) return { ...p, notes: (p.notes || []).filter(n => n.id !== noteId) };
        return p;
      })
    });
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

  // LISTA UNIFICADA PARA O SELETOR DE CLIENTES (Preferência Nome Fantasia + Deduplicação)
  const unifiedEmpresasOptions = useMemo(() => {
     const namesSet = new Set<string>();
     const richClients = dynamicSettings.clients || [];
     const knownReasonSocials = new Set(richClients.map(c => c.name.toUpperCase()));
     const knownDisplayNames = new Set(richClients.map(c => c.displayName.toUpperCase()));
     
     richClients.forEach(c => {
       namesSet.add(c.displayName.toUpperCase());
     });
     
     dynamicSettings.empresas.forEach(e => {
       const upperE = e.toUpperCase();
       // Se o nome legado já é a razão social ou o display name de alguém, ignora
       if (!knownReasonSocials.has(upperE) && !knownDisplayNames.has(upperE)) {
         namesSet.add(upperE);
       }
     });
     
     return Array.from(namesSet).sort((a: string, b: string) => a.localeCompare(b));
  }, [dynamicSettings.empresas, dynamicSettings.clients]);

  // UNIFICAÇÃO DA LISTA DE CLIENTES PARA A ABA DE CONSULTA
  const filteredClientsList = useMemo(() => {
    const richClients = [...(dynamicSettings.clients || [])];
    const existingNames = new Set(richClients.map(c => c.name.toUpperCase()));
    const existingTrades = new Set(richClients.map(c => (c.tradeName || '').toUpperCase()).filter(Boolean));
    const existingDisplays = new Set(richClients.map(c => c.displayName.toUpperCase()));
    
    dynamicSettings.empresas.forEach(empName => {
      const upperName = empName.toUpperCase();
      if (!existingNames.has(upperName) && !existingTrades.has(upperName) && !existingDisplays.has(upperName)) {
        richClients.push({
          id: `legacy-${upperName}`,
          type: 'PJ', 
          name: upperName,
          displayName: upperName,
          document: 'N/D',
          driveUrl: '',
          createdAt: new Date().toISOString()
        });
      }
    });

    const list = richClients.sort((a, b) => a.displayName.localeCompare(b.displayName));

    if (!clientSearch) return list;
    const s = clientSearch.toLowerCase();
    return list.filter(c => 
      (c.name || "").toLowerCase().includes(s) || 
      (c.displayName || "").toLowerCase().includes(s) ||
      (c.tradeName || "").toLowerCase().includes(s) ||
      (c.document || "").toLowerCase().includes(s)
    );
  }, [dynamicSettings.clients, dynamicSettings.empresas, clientSearch]);

  const pendingDeadlines = useMemo(() => filteredDeadlines.filter(d => d.status === DeadlineStatus.PENDING), [filteredDeadlines]);
  const completedDeadlines = useMemo(() => 
    filteredDeadlines
      .filter(d => d.status === DeadlineStatus.COMPLETED)
      .sort((a, b) => b.data.localeCompare(a.data)), 
  [filteredDeadlines]);

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

  const groupedJuris = useMemo(() => {
    const groups: { [key: string]: Jurisprudencia[] } = {};
    filteredJuris.forEach(j => {
      const tema = j.tema || 'Sem Tema';
      if (!groups[tema]) groups[tema] = [];
      groups[tema].push(j);
    });
    return groups;
  }, [filteredJuris]);

  const handleEditSetting = (index: number, list: string[], field: keyof NotificationSettings) => {
    const current = list[index];
    const newValue = prompt(`Editar entrada:`, current);
    if (newValue && newValue.trim() !== "" && newValue !== current) {
      const updatedList = [...list];
      updatedList[index] = (field === 'responsaveis' || field === 'pecas' || field === 'empresas' || field === 'orgaosJulgadores') ? newValue.toUpperCase() : newValue;
      updateSettings(field, updatedList);
    }
  };

  const handleDeleteSetting = (index: number, list: string[], field: keyof NotificationSettings) => {
    if (confirm(`Remover definitivamente?`)) {
      const updatedList = list.filter((_, idx) => idx !== index);
      updateSettings(field, updatedList);
    }
  };

  const handleExportCSV = () => {
    const headers = ["Cliente", "Peça", "ADV", "Vencimento", "Status"];
    const rows = filteredDeadlines.map(d => [d.empresa, d.peca, d.responsavel, formatLocalDate(d.data), d.status]);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `juriscontrol_report.csv`;
    link.click();
  };

  const handleExportPDF = () => {
    const docPdf = new jsPDF();
    docPdf.text("JurisControl - Relatório Operacional", 14, 15);
    const tableData = filteredDeadlines.map(d => [
      d.empresa,
      d.peca,
      d.responsavel,
      formatLocalDate(d.data),
      d.status
    ]);
    (docPdf as any).autoTable({
      head: [['Empresa', 'Peça', 'Responsável', 'Data', 'Status']],
      body: tableData,
      startY: 20
    });
    docPdf.save("juriscontrol_report.pdf");
  };

  if (authLoading) return <div className="fixed inset-0 bg-[#020617] flex items-center justify-center text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] animate-pulse">Sincronizando Sistema...</div>;
  if (!user) return <AuthScreen onLogin={handleLogin} loading={authLoading} />;

  const renderDeadlineList = (list: Deadline[]) => (
    <div className="divide-y divide-slate-100">
      {list.map(d => (
        <div key={d.id} className="p-6 md:p-10 flex flex-col hover:bg-slate-50/50 transition-all border-l-[6px] md:border-l-[10px] border-transparent hover:border-blue-500">
          <div className="flex flex-col lg:flex-row justify-between items-start mb-4 w-full gap-4">
            <div className="flex-1 md:pr-10 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                <span className="font-black text-[#0F172A] text-lg md:text-xl tracking-tight uppercase">{d.peca}</span>
                <span className={`w-fit px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${d.status === DeadlineStatus.COMPLETED ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{d.status}</span>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-wider">{d.empresa} • ADV: {d.responsavel}</p>
                {d.documentUrl && (
                  <a href={d.documentUrl} target="_blank" rel="noopener noreferrer" className="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all" title="Ver Link">
                    <Icons.ExternalLink />
                  </a>
                )}
              </div>
            </div>
            <div className="flex flex-row-reverse lg:flex-row items-center justify-between lg:justify-end w-full lg:w-auto gap-4">
              <div className="flex gap-2 shrink-0">
                <button onClick={() => handleSendToReview(d)} className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-sm flex items-center justify-center" title="Enviar p/ Revisão"><Icons.Review /></button>
                <button onClick={() => toggleStatus(d)} className="w-10 h-10 md:w-12 md:h-12 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm flex items-center justify-center" title="Alternar Status"><Icons.Check /></button>
                <button onClick={() => handleEditClick(d)} className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center justify-center" title="Editar"><Icons.Edit /></button>
                <button onClick={() => deleteDeadline(d.id)} className="w-10 h-10 md:w-12 md:h-12 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm flex items-center justify-center" title="Excluir"><Icons.Trash /></button>
              </div>
              <div className="text-left lg:text-right min-w-[100px] md:min-w-[120px]">
                 <p className="font-black text-[#0F172A] text-lg md:text-xl tracking-tighter">{formatLocalDate(d.data)}</p>
                 <p className={`text-[8px] font-black uppercase mt-0.5 ${getDaysDiff(d.data) <= 1 ? 'text-red-500' : 'text-slate-400'}`}>{getDaysDiff(d.data)} dias</p>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-50 w-full">
             <p className="text-slate-600 text-xs md:text-sm leading-relaxed font-medium">"{d.assunto}"</p>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex bg-[#F8FAFC] min-h-screen antialiased flex-col md:flex-row">
      <Sidebar 
        currentView={view} 
        setView={setView} 
        user={user} 
        onLogout={() => signOut(auth)} 
        isOpen={isMobileMenuOpen}
        toggleSidebar={toggleMobileMenu}
      />
      
      {/* Mobile Header */}
      <div className="md:hidden bg-[#020617] text-white p-5 flex justify-between items-center sticky top-0 z-[40] shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-lg">JC</div>
          <h1 className="text-lg font-black tracking-tight">JurisControl</h1>
        </div>
        <button onClick={toggleMobileMenu} className="p-2 bg-white/5 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
        </button>
      </div>

      <main className="md:ml-[280px] flex-1 p-6 md:p-16">
        {permissionError && (
          <div className="mb-8 md:mb-12 p-6 md:p-8 bg-red-50 border border-red-200 rounded-[1.5rem] md:rounded-[2.5rem] animate-in slide-in-from-top-4 shadow-2xl">
             <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6 text-red-700">
               <div className="p-3 bg-red-100 rounded-xl shadow-sm"><Icons.AlertCircle /></div>
               <div className="flex-1">
                  <p className="font-black text-lg md:text-xl tracking-tight mb-3 uppercase">Erro de Configuração</p>
                  <p className="text-xs md:text-sm font-medium leading-relaxed mb-6 opacity-80">Firestore bloqueado. Atualize as regras no console Firebase:</p>
                  
                  <div className="bg-slate-900 p-4 md:p-6 rounded-2xl border border-white/10 shadow-inner mb-4 overflow-x-auto">
                    <pre className="text-[9px] md:text-[10px] font-mono text-emerald-400 whitespace-pre leading-relaxed">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /settings/{userId} { allow read, write: if request.auth != null && request.auth.uid == userId; }
    match /deadlines/{id} { allow read, write: if request.auth != null; }
    match /jurisprudencias/{id} { allow read, write: if request.auth != null; }
    match /correspondence/{userId} { allow read, write: if request.auth != null && request.auth.uid == userId; }
  }
}`}
                    </pre>
                  </div>
               </div>
             </div>
          </div>
        )}

        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 md:mb-12">
          <div>
            <h2 className="text-2xl md:text-4xl font-black text-[#0F172A] tracking-tight mb-1 uppercase">
              {view === 'dashboard' ? 'Dashboard' : view === 'clients' ? 'Consulta de Clientes' : view === 'deadlines' ? 'Controle Geral' : view === 'correspondence' ? 'Ofícios e Memorandos' : view === 'jurisprudencia' ? 'Jurisprudências' : view === 'reports' ? 'Relatórios' : 'Gestão'}
            </h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
              <span className="text-[9px] md:text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">SISTEMA OPERACIONAL</span>
            </div>
          </div>
          <div className="w-full md:w-auto flex items-center gap-4">
             {view === 'jurisprudencia' ? (
               <button onClick={() => { resetJurisForm(); setIsJurisModalOpen(true); }} className="w-full md:w-auto bg-blue-600 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl font-black text-xs md:text-sm shadow-xl shadow-blue-600/30 hover:bg-blue-700 hover:scale-[1.02] transition-all flex items-center justify-center gap-3">
                 <Icons.Plus /> NOVO PRECEDENTE
               </button>
             ) : view === 'clients' ? (
              <button onClick={() => { setEditingClientId(null); setClientType('PJ'); setClientForm({ name: '', document: '', driveUrl: '', tradeName: '', address: '', adminName: '' }); setPreferredNameSource('FANTASIA'); setIsClientModalOpen(true); }} className="w-full md:w-auto bg-emerald-600 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl font-black text-xs md:text-sm shadow-xl shadow-emerald-600/30 hover:bg-emerald-700 hover:scale-[1.02] transition-all flex items-center justify-center gap-3">
                <Icons.Plus /> CADASTRAR CLIENTE
              </button>
             ) : (
               <button onClick={() => { resetDeadlineForm(); setIsModalOpen(true); }} className="w-full md:w-auto bg-blue-600 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl font-black text-xs md:text-sm shadow-xl shadow-blue-600/30 hover:bg-blue-700 hover:scale-[1.02] transition-all flex items-center justify-center gap-3">
                 <Icons.Plus /> REGISTRAR PRAZO
               </button>
             )}
          </div>
        </header>

        {view === 'dashboard' && (
          <div className="animate-in fade-in duration-500">
             <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-12">
                <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border-l-4 md:border-l-8 border-red-600 shadow-xl flex justify-between items-center">
                  <div><p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">ATRASADOS</p><span className="text-3xl md:text-5xl font-black text-[#0F172A] tracking-tighter">{stats.atrasados}</span></div>
                </div>
                <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border-l-4 md:border-l-8 border-orange-500 shadow-xl flex justify-between items-center">
                  <div><p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">HOJE</p><span className="text-3xl md:text-5xl font-black text-[#0F172A] tracking-tighter">{stats.fatais}</span></div>
                </div>
                <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border-l-4 md:border-l-8 border-amber-500 shadow-xl flex justify-between items-center">
                  <div><p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">AMANHÃ</p><span className="text-3xl md:text-5xl font-black text-[#0F172A] tracking-tighter">{stats.amanha}</span></div>
                </div>
                <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border-l-4 md:border-l-8 border-emerald-500 shadow-xl flex justify-between items-center">
                  <div><p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">PRÓXIMOS</p><span className="text-3xl md:text-5xl font-black text-[#0F172A] tracking-tighter">{stats.prox5dias}</span></div>
                </div>
             </section>
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl min-h-[400px]">
                    <h3 className="text-lg md:text-xl font-black text-[#0F172A] mb-6 md:mb-8 flex items-center gap-4 uppercase tracking-tight">Próximos Prazos</h3>
                    <div className="space-y-4">
                      {deadlines.filter(d => d.status === DeadlineStatus.PENDING).slice(0, 5).map(d => (
                        <div key={d.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 md:p-5 bg-slate-50/70 rounded-2xl border border-transparent hover:border-blue-200 transition-all hover:bg-white hover:shadow-lg gap-4">
                          <div className="flex-1">
                             <p className="text-[8px] font-black text-blue-600 uppercase mb-1 tracking-wider">{d.empresa} • ADV: {d.responsavel}</p>
                             <h4 className="font-bold text-slate-900 text-base md:text-lg tracking-tight uppercase line-clamp-1">{d.peca}</h4>
                          </div>
                          <div className="flex items-center justify-between w-full md:w-auto gap-4 md:gap-6 border-t md:border-t-0 pt-3 md:pt-0">
                            <div className="text-left md:text-right">
                                <p className="font-black text-slate-900 text-base md:text-lg tracking-tighter">{formatLocalDate(d.data)}</p>
                                <p className={`text-[8px] font-black uppercase mt-0.5 ${getDaysDiff(d.data) <= 1 ? 'text-red-500' : 'text-slate-400'}`}>{getDaysDiff(d.data)} dias</p>
                            </div>
                            <button onClick={() => toggleStatus(d)} className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-white border border-slate-200 text-emerald-500 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm shrink-0">
                               <Icons.Check />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                </div>
                <div className="lg:col-span-4 bg-[#020617] p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl flex flex-col">
                    <h3 className="text-lg font-black text-white mb-6 md:mb-8 uppercase tracking-tight">Métricas Ativas</h3>
                    <div className="flex-1 flex flex-col items-center justify-center min-h-[200px] md:min-h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={6} dataKey="value" stroke="none">
                                {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                              </Pie>
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                              />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-6 md:mt-8 space-y-3">
                       <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-400 px-5 py-3 bg-white/5 rounded-xl">
                          <span>Concluídos</span>
                          <span className="text-emerald-400 text-lg">{deadlines.filter(d => d.status === DeadlineStatus.COMPLETED).length}</span>
                       </div>
                    </div>
                </div>
             </div>
          </div>
        )}

        {view === 'clients' && (
          <div className="space-y-8 md:space-y-10 animate-in fade-in duration-500">
             <div className="bg-white p-6 md:p-10 rounded-[1.5rem] md:rounded-[3rem] shadow-2xl flex flex-col md:flex-row items-center justify-between border border-slate-100 gap-6">
                <div className="w-full md:flex-1 md:max-w-xl relative">
                   <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"><Icons.Search /></div>
                   <input 
                    type="text" 
                    placeholder="Filtrar por nome, fantasia ou documento..." 
                    className="w-full bg-slate-50 p-4 md:p-5 pl-16 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all border border-transparent"
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                   />
                </div>
                <div className="w-full md:w-auto text-left md:text-right md:pl-8 md:border-l border-slate-100">
                   <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">CARTEIRA</p>
                   <p className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter italic">{filteredClientsList.length}</p>
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
                {filteredClientsList.map(client => (
                  <div key={client.id} className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col group hover:border-blue-200 transition-all relative">
                    <div className="flex justify-between items-start mb-6">
                      <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${client.type === 'PJ' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {client.type === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                      </span>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEditClient(client)} className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-all"><Icons.Edit /></button>
                        <button onClick={() => handleDeleteClient(client)} className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"><Icons.Trash /></button>
                      </div>
                    </div>

                    <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase line-clamp-2 mb-1">
                      {client.displayName}
                    </h3>
                    {client.type === 'PJ' && client.displayName !== client.name && <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-4">{client.name}</p>}
                    
                    <div className="space-y-4 mt-auto">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex justify-between items-center mb-2">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{client.type === 'PJ' ? 'CNPJ' : 'CPF'}</p>
                           <p className="text-xs font-bold text-slate-700">{client.document}</p>
                        </div>
                        {client.adminName && (
                          <div className="pt-2 border-t border-slate-100">
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Administrador</p>
                             <p className="text-xs font-bold text-blue-600 truncate">{client.adminName}</p>
                          </div>
                        )}
                        <div className="pt-2 mt-2 border-t border-slate-100 flex justify-between items-center">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Processos Ativos</p>
                          <span className="text-[10px] font-black text-slate-900 bg-slate-200 px-2 py-0.5 rounded-full">{(client.processes || []).length}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                         <button onClick={() => handleOpenProcesses(client)} className="flex items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-slate-900/20 hover:bg-blue-600 transition-all">
                           <Icons.Table /> Processos
                         </button>
                         {client.driveUrl ? (
                           <a href={client.driveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">
                             <Icons.ExternalLink /> Drive
                           </a>
                         ) : (
                           <button disabled className="bg-slate-100 text-slate-300 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest cursor-not-allowed">Sem Drive</button>
                         )}
                      </div>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {view === 'deadlines' && (
          <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-500">
             <section className="bg-white rounded-[1.5rem] md:rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
                <div className="bg-blue-600 px-8 py-4 flex items-center justify-between">
                   <h3 className="text-white font-black uppercase text-sm tracking-widest">Prazos Pendentes</h3>
                   <span className="bg-white/20 text-white px-3 py-1 rounded-full text-[10px] font-bold">{pendingDeadlines.length}</span>
                </div>
                {pendingDeadlines.length > 0 ? renderDeadlineList(pendingDeadlines) : <div className="p-16 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">Nenhum prazo pendente</div>}
             </section>

             <section className="bg-white rounded-[1.5rem] md:rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
                <div className="bg-emerald-600 px-8 py-4 flex items-center justify-between">
                   <h3 className="text-white font-black uppercase text-sm tracking-widest">Prazos Concluídos</h3>
                   <span className="bg-white/20 text-white px-3 py-1 rounded-full text-[10px] font-bold">{completedDeadlines.length}</span>
                </div>
                {completedDeadlines.length > 0 ? renderDeadlineList(completedDeadlines) : <div className="p-16 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">Nenhum prazo concluído</div>}
             </section>
          </div>
        )}

        {view === 'jurisprudencia' && (
          <div className="space-y-8 md:space-y-10 animate-in fade-in duration-500">
             <div className="bg-white p-6 md:p-10 rounded-[1.5rem] md:rounded-[3rem] shadow-2xl flex flex-col md:flex-row items-center justify-between border border-slate-100 gap-6">
                <div className="w-full md:flex-1 md:max-w-xl relative">
                   <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"><Icons.Search /></div>
                   <input type="text" placeholder="Filtrar precedentes..." className="w-full bg-slate-50 p-4 md:p-5 pl-16 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all border border-transparent" value={jurisSearch} onChange={e => setJurisSearch(e.target.value)} />
                </div>
                <div className="w-full md:w-auto text-left md:text-right md:pl-8 md:border-l border-slate-100">
                   <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">ACERVO</p>
                   <p className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter italic">{filteredJuris.length}</p>
                </div>
             </div>

             <div className="space-y-10">
                {(Object.entries(groupedJuris) as [string, Jurisprudencia[]][]).map(([tema, items]) => (
                  <div key={tema} className="bg-white p-6 md:p-10 rounded-[2.5rem] md:rounded-[4rem] shadow-2xl border border-slate-100 relative overflow-hidden">
                     <div className="absolute top-0 left-0 w-2 h-full bg-amber-500"></div>
                     <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-slate-50 pb-6 gap-4">
                        <div>
                          <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.25em] mb-1">TEMA JURÍDICO</p>
                          <h3 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">{tema}</h3>
                        </div>
                        <span className="bg-amber-50 text-amber-600 px-4 py-2 rounded-full text-[10px] font-black shadow-sm">{items.length} PRECEDENTES</span>
                     </div>
                     <div className="grid grid-cols-1 gap-6">
                        {items.map(j => (
                          <div key={j.id} className="bg-slate-50 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-transparent hover:border-blue-200 transition-all group">
                             <div className="flex justify-between items-start mb-4">
                               <div className="flex flex-wrap items-center gap-2">
                                  <span className="px-3 py-1 bg-blue-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest">{j.area}</span>
                                  <span className="px-3 py-1 bg-slate-200 text-slate-600 rounded-lg text-[8px] font-black uppercase tracking-widest">{j.orgao}</span>
                               </div>
                               <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleEditJurisClick(j)} className="w-8 h-8 flex items-center justify-center bg-white text-blue-500 rounded-lg shadow-sm hover:bg-blue-500 hover:text-white transition-all"><Icons.Edit /></button>
                                  <button onClick={() => deleteJuris(j.id)} className="w-8 h-8 flex items-center justify-center bg-white text-red-400 rounded-lg shadow-sm hover:bg-red-400 hover:text-white transition-all"><Icons.Trash /></button>
                               </div>
                             </div>
                             <p className="text-slate-700 text-sm md:text-base leading-relaxed font-medium italic">"{j.enunciado}"</p>
                          </div>
                        ))}
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {view === 'correspondence' && (
          <div className="space-y-8 md:space-y-10 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
              <div className="lg:col-span-4 bg-white p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl flex flex-row lg:flex-col items-center justify-around md:justify-center text-center border border-slate-100">
                <div className="flex flex-col items-center">
                  <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 md:mb-4">PRÓXIMO OFÍCIO</p>
                  <h3 className="text-4xl md:text-6xl font-black text-blue-600 tracking-tighter mb-0 md:mb-8">{nextOficioNumber.toString().padStart(3, '0')}</h3>
                </div>
                <div className="hidden lg:block w-full h-px bg-slate-100 mb-8"></div>
                <div className="flex flex-col items-center">
                  <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 md:mb-4">PRÓXIMO MEMO</p>
                  <h3 className="text-4xl md:text-6xl font-black text-amber-600 tracking-tighter">{nextMemorandoNumber.toString().padStart(3, '0')}</h3>
                </div>
              </div>
              <div className="lg:col-span-8 bg-[#020617] p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl text-white flex flex-col border border-white/5">
                <h3 className="text-xl md:text-2xl font-black mb-4 md:mb-6 uppercase tracking-tight flex items-center gap-4"><Icons.Table /> Gestão de Numeração</h3>
                <div className="mt-auto flex gap-3 p-2 bg-white/5 rounded-2xl w-full sm:w-fit overflow-x-auto">
                   <button onClick={() => setActiveCorrespondenceTab('oficio')} className={`flex-1 sm:flex-none whitespace-nowrap px-6 md:px-8 py-3 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all ${activeCorrespondenceTab === 'oficio' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>OFÍCIOS</button>
                   <button onClick={() => setActiveCorrespondenceTab('memorando')} className={`flex-1 sm:flex-none whitespace-nowrap px-6 md:px-8 py-3 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all ${activeCorrespondenceTab === 'memorando' ? 'bg-amber-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>MEMORANDOS</button>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-slate-100">
               <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-10 gap-2 md:gap-3">
                  {Array.from({ length: maxOficioRange }, (_, i) => i + 1).map(num => {
                    const currentList = activeCorrespondenceTab === 'oficio' ? usedOficioNumbers : usedMemorandoNumbers;
                    const isUsed = currentList.includes(num);
                    const isNext = num === (activeCorrespondenceTab === 'oficio' ? nextOficioNumber : nextMemorandoNumber);
                    return (
                      <button key={num} onClick={() => handleToggleCorrespondenceNumber(num, activeCorrespondenceTab)} className={`aspect-square flex flex-col items-center justify-center rounded-xl md:rounded-2xl font-black text-xs md:text-base transition-all border-2 ${isUsed ? 'bg-red-50 border-red-100 text-red-600 shadow-inner scale-95' : isNext ? (activeCorrespondenceTab === 'oficio' ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-amber-600 text-amber-600 bg-amber-50') + ' animate-pulse' : 'bg-slate-50 border-transparent text-slate-300 hover:bg-slate-100'}`}>
                        {num.toString().padStart(3, '0')}
                      </button>
                    );
                  })}
               </div>
            </div>
          </div>
        )}

        {view === 'reports' && (
          <div className="space-y-8 md:space-y-10 animate-in fade-in duration-500">
             <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-slate-100">
                <h3 className="text-lg md:text-xl font-black mb-6 md:mb-8 uppercase tracking-tight flex items-center gap-4"><Icons.Clock /> Filtros do Relatório</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                   <div className="space-y-2">
                     <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Cliente</label>
                     <select className="w-full bg-slate-50 p-4 rounded-xl font-bold text-xs outline-none focus:ring-4 focus:ring-blue-100" value={reportFilters.empresa} onChange={e => setReportFilters(p => ({ ...p, empresa: e.target.value }))}>
                        <option value="">Todos os Clientes</option>
                        {unifiedEmpresasOptions.map(emp => <option key={emp} value={emp}>{emp}</option>)}
                     </select>
                   </div>
                   <div className="space-y-2">
                     <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Responsável</label>
                     <select className="w-full bg-slate-50 p-4 rounded-xl font-bold text-xs outline-none focus:ring-4 focus:ring-blue-100" value={reportFilters.responsavel} onChange={e => setReportFilters(p => ({ ...p, responsavel: e.target.value }))}>
                        <option value="">Todos os Advogados</option>
                        {dynamicSettings.responsaveis.map(resp => <option key={resp} value={resp}>{resp}</option>)}
                     </select>
                   </div>
                   <div className="space-y-2"><label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Início</label><input type="date" className="w-full bg-slate-50 p-4 rounded-xl font-bold text-xs outline-none focus:ring-4 focus:ring-blue-100" value={reportFilters.dataInicio} onChange={e => setReportFilters(p => ({ ...p, dataInicio: e.target.value }))} /></div>
                   <div className="space-y-2"><label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Fim</label><input type="date" className="w-full bg-slate-50 p-4 rounded-xl font-bold text-xs outline-none focus:ring-4 focus:ring-blue-100" value={reportFilters.dataFim} onChange={e => setReportFilters(p => ({ ...p, dataFim: e.target.value }))} /></div>
                </div>
             </div>

             <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
                <div className="p-6 md:p-10 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 bg-slate-50/50 gap-4">
                   <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight">Resultados ({filteredDeadlines.length})</h3>
                   <div className="flex w-full sm:w-auto gap-3">
                      <button onClick={handleExportCSV} className="flex-1 sm:flex-none bg-[#10b981] text-white px-5 md:px-6 py-3 rounded-xl font-black text-[9px] md:text-[10px] uppercase shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all">CSV</button>
                      <button onClick={handleExportPDF} className="flex-1 sm:flex-none bg-[#020617] text-white px-5 md:px-6 py-3 rounded-xl font-black text-[9px] md:text-[10px] uppercase shadow-lg shadow-slate-900/20 hover:scale-105 transition-all">PDF</button>
                   </div>
                </div>
                <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-50 custom-scrollbar">
                   {filteredDeadlines.map(d => (
                     <div key={d.id} className="p-5 md:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-slate-50 transition-colors gap-4">
                        <div className="flex-1 sm:pr-8">
                           <p className="text-[8px] md:text-[9px] font-black text-blue-600 uppercase mb-1 tracking-widest">{d.empresa} • ADV: {d.responsavel}</p>
                           <h4 className="font-bold text-slate-900 text-sm md:text-base uppercase tracking-tight">{d.peca}</h4>
                        </div>
                        <div className="w-full sm:w-auto flex justify-between sm:justify-end items-center gap-6 md:gap-8 border-t sm:border-t-0 pt-3 sm:pt-0">
                           <span className={`text-[8px] font-black uppercase px-3 py-1.5 rounded-lg ${d.status === DeadlineStatus.COMPLETED ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{d.status}</span>
                           <p className="font-black text-slate-900 text-base md:text-lg tracking-tighter w-24 text-right">{formatLocalDate(d.data)}</p>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        {view === 'settings' && (
          <div className="space-y-12 md:space-y-16 animate-in fade-in duration-700 pb-10">
             {/* SEÇÃO ESCRITÓRIO */}
             <section>
                <div className="flex items-center gap-4 mb-8 md:mb-10"><div className="w-2 h-10 bg-blue-600 rounded-full shadow-lg shadow-blue-200" /><h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase">Escritório</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                   <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl flex flex-col border border-slate-100">
                      <h3 className="text-sm md:text-base font-black mb-6 md:mb-8 flex items-center gap-3 uppercase tracking-tight">Equipe</h3>
                      <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
                         {dynamicSettings.responsaveis.map((r, i) => (
                            <div key={i} className="flex justify-between items-center p-3 md:p-4 bg-slate-50 rounded-xl group border border-transparent hover:border-blue-200 transition-all">
                               <span className="font-bold text-slate-700 text-[10px] md:text-[11px] uppercase">{r}</span>
                               <div className="flex gap-2"><button onClick={() => handleEditSetting(i, dynamicSettings.responsaveis, 'responsaveis')} className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-blue-500 bg-white rounded-lg shadow-sm"><Icons.Edit /></button><button onClick={() => handleDeleteSetting(i, dynamicSettings.responsaveis, 'responsaveis')} className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-red-400 bg-white rounded-lg shadow-sm"><Icons.Trash /></button></div>
                            </div>
                         ))}
                      </div>
                      <button disabled={isSavingSettings} onClick={() => {
                         const n = prompt("Nome do Advogado:");
                         if(n && n.trim() !== "") updateSettings('responsaveis', [...dynamicSettings.responsaveis, n.toUpperCase()]);
                      }} className="mt-6 w-full p-3 md:p-4 border-2 border-dashed border-slate-200 rounded-xl text-[8px] md:text-[9px] font-black uppercase text-slate-400 hover:bg-slate-50 hover:text-blue-600 transition-all tracking-widest">+ MEMBRO</button>
                   </div>

                   <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl flex flex-col border border-slate-100">
                      <h3 className="text-sm md:text-base font-black mb-6 md:mb-8 flex items-center gap-3 uppercase tracking-tight">Peças</h3>
                      <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
                         {dynamicSettings.pecas.map((p, i) => (
                            <div key={i} className="flex justify-between items-center p-3 md:p-4 bg-slate-50 rounded-xl group border border-transparent hover:border-amber-200 transition-all">
                               <span className="font-bold text-slate-700 text-[10px] md:text-[11px] uppercase">{p}</span>
                               <div className="flex gap-2"><button onClick={() => handleEditSetting(i, dynamicSettings.pecas, 'pecas')} className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-blue-500 bg-white rounded-lg shadow-sm"><Icons.Edit /></button><button onClick={() => handleDeleteSetting(i, dynamicSettings.pecas, 'pecas')} className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-red-400 bg-white rounded-lg shadow-sm"><Icons.Trash /></button></div>
                            </div>
                         ))}
                      </div>
                      <button disabled={isSavingSettings} onClick={() => {
                         const n = prompt("Descrição:");
                         if(n && n.trim() !== "") updateSettings('pecas', [...dynamicSettings.pecas, n.toUpperCase()]);
                      }} className="mt-6 w-full p-3 md:p-4 border-2 border-dashed border-slate-200 rounded-xl text-[8px] md:text-[9px] font-black uppercase text-slate-400 hover:bg-slate-50 hover:text-amber-600 transition-all tracking-widest">+ TIPO</button>
                   </div>
                </div>
             </section>

             {/* SEÇÃO JURISPRUDÊNCIA - GESTÃO DE ITENS */}
             <section>
                <div className="flex items-center gap-4 mb-8 md:mb-10">
                   <div className="w-2 h-10 bg-amber-600 rounded-full shadow-lg shadow-amber-200" />
                   <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase">Jurisprudência</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                   {/* ÁREAS */}
                   <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl flex flex-col border border-slate-100">
                      <h3 className="text-sm md:text-base font-black mb-6 md:mb-8 flex items-center gap-3 uppercase tracking-tight">Áreas do Direito</h3>
                      <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
                         {dynamicSettings.areasDireito.map((a, i) => (
                            <div key={i} className="flex justify-between items-center p-3 md:p-4 bg-slate-50 rounded-xl group border border-transparent hover:border-amber-200 transition-all">
                               <span className="font-bold text-slate-700 text-[10px] md:text-[11px] uppercase">{a}</span>
                               <div className="flex gap-2">
                                  <button onClick={() => handleEditSetting(i, dynamicSettings.areasDireito, 'areasDireito')} className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-blue-500 bg-white rounded-lg shadow-sm"><Icons.Edit /></button>
                                  <button onClick={() => handleDeleteSetting(i, dynamicSettings.areasDireito, 'areasDireito')} className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-red-400 bg-white rounded-lg shadow-sm"><Icons.Trash /></button>
                               </div>
                            </div>
                         ))}
                      </div>
                      <button disabled={isSavingSettings} onClick={() => {
                         const n = prompt("Nome da Área:");
                         if(n && n.trim() !== "") updateSettings('areasDireito', [...dynamicSettings.areasDireito, n]);
                      }} className="mt-6 w-full p-3 md:p-4 border-2 border-dashed border-slate-200 rounded-xl text-[8px] md:text-[9px] font-black uppercase text-slate-400 hover:bg-slate-50 hover:text-amber-600 transition-all tracking-widest">+ ÁREA</button>
                   </div>

                   {/* ÓRGÃOS */}
                   <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl flex flex-col border border-slate-100">
                      <h3 className="text-sm md:text-base font-black mb-6 md:mb-8 flex items-center gap-3 uppercase tracking-tight">Órgãos Julgadores</h3>
                      <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
                         {dynamicSettings.orgaosJulgadores.map((o, i) => (
                            <div key={i} className="flex justify-between items-center p-3 md:p-4 bg-slate-50 rounded-xl group border border-transparent hover:border-blue-200 transition-all">
                               <span className="font-bold text-slate-700 text-[10px] md:text-[11px] uppercase">{o}</span>
                               <div className="flex gap-2">
                                  <button onClick={() => handleEditSetting(i, dynamicSettings.orgaosJulgadores, 'orgaosJulgadores')} className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-blue-500 bg-white rounded-lg shadow-sm"><Icons.Edit /></button>
                                  <button onClick={() => handleDeleteSetting(i, dynamicSettings.orgaosJulgadores, 'orgaosJulgadores')} className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-red-400 bg-white rounded-lg shadow-sm"><Icons.Trash /></button>
                               </div>
                            </div>
                         ))}
                      </div>
                      <button disabled={isSavingSettings} onClick={() => {
                         const n = prompt("Nome do Órgão:");
                         if(n && n.trim() !== "") updateSettings('orgaosJulgadores', [...dynamicSettings.orgaosJulgadores, n.toUpperCase()]);
                      }} className="mt-6 w-full p-3 md:p-4 border-2 border-dashed border-slate-200 rounded-xl text-[8px] md:text-[9px] font-black uppercase text-slate-400 hover:bg-slate-50 hover:text-blue-600 transition-all tracking-widest">+ ÓRGÃO</button>
                   </div>

                   {/* TEMAS */}
                   <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl flex flex-col border border-slate-100">
                      <h3 className="text-sm md:text-base font-black mb-6 md:mb-8 flex items-center gap-3 uppercase tracking-tight">Temas</h3>
                      <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
                         {dynamicSettings.temasJuris.map((t, i) => (
                            <div key={i} className="flex justify-between items-center p-3 md:p-4 bg-slate-50 rounded-xl group border border-transparent hover:border-emerald-200 transition-all">
                               <span className="font-bold text-slate-700 text-[10px] md:text-[11px] uppercase">{t}</span>
                               <div className="flex gap-2">
                                  <button onClick={() => handleEditSetting(i, dynamicSettings.temasJuris, 'temasJuris')} className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-blue-500 bg-white rounded-lg shadow-sm"><Icons.Edit /></button>
                                  <button onClick={() => handleDeleteSetting(i, dynamicSettings.temasJuris, 'temasJuris')} className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-red-400 bg-white rounded-lg shadow-sm"><Icons.Trash /></button>
                               </div>
                            </div>
                         ))}
                      </div>
                      <button disabled={isSavingSettings} onClick={() => {
                         const n = prompt("Descrição do Tema:");
                         if(n && n.trim() !== "") updateSettings('temasJuris', [...dynamicSettings.temasJuris, n]);
                      }} className="mt-6 w-full p-3 md:p-4 border-2 border-dashed border-slate-200 rounded-xl text-[8px] md:text-[9px] font-black uppercase text-slate-400 hover:bg-slate-50 hover:text-emerald-600 transition-all tracking-widest">+ TEMA</button>
                   </div>
                </div>
             </section>
          </div>
        )}

        {/* MODAL PARA GESTÃO DE PROCESSOS DO CLIENTE */}
        <Modal 
          isOpen={isProcessModalOpen} 
          onClose={() => { setIsProcessModalOpen(false); setActiveClientForProcesses(null); setActiveProcessForNotes(null); }} 
          title={`Processos de ${activeClientForProcesses?.displayName}`}
        >
          <div className="space-y-10">
            {/* Formulário de Novo Processo */}
            <div className="p-6 md:p-8 bg-slate-50 rounded-3xl border border-slate-100">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 ml-1">Vincular Novo Processo</p>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Número do Processo</label>
                     <input type="text" placeholder="Ex: 0000000-00.0000.0.00.0000" className="w-full bg-white p-4 rounded-xl font-bold text-sm border border-slate-200 outline-none focus:ring-4 focus:ring-blue-100" value={newProcess.number} onChange={e => setNewProcess(p => ({ ...p, number: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Título/Classe</label>
                     <input type="text" placeholder="Ex: Cobrança, Indenizatória..." className="w-full bg-white p-4 rounded-xl font-bold text-sm border border-slate-200 outline-none focus:ring-4 focus:ring-blue-100" value={newProcess.title} onChange={e => setNewProcess(p => ({ ...p, title: e.target.value }))} />
                  </div>
               </div>
               <button onClick={handleAddProcess} disabled={!newProcess.number.trim()} className="w-full mt-4 bg-blue-600 text-white p-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50">CADASTRAR PROCESSO</button>
            </div>

            {/* Listagem de Processos */}
            <div className="space-y-6">
               <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight ml-1">Processos Vinculados</h4>
               {(activeClientForProcesses?.processes || []).length === 0 ? (
                 <div className="p-10 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Nenhum processo cadastrado</p>
                 </div>
               ) : (
                 <div className="space-y-4">
                    {(activeClientForProcesses?.processes || []).map(proc => (
                      <div key={proc.id} className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden transition-all hover:shadow-md">
                        <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50">
                           <div className="flex-1">
                              <p className="font-black text-blue-600 text-base md:text-lg tracking-tight uppercase">{proc.number}</p>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{proc.title || 'Sem Título'}</p>
                           </div>
                           <div className="flex gap-2 w-full md:w-auto">
                              <button onClick={() => setActiveProcessForNotes(activeProcessForNotes === proc.id ? null : proc.id)} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${activeProcessForNotes === proc.id ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-blue-600 hover:bg-blue-50'}`}>
                                 {activeProcessForNotes === proc.id ? 'FECHAR NOTAS' : `NOTAS (${(proc.notes || []).length})`}
                              </button>
                              <button onClick={() => handleDeleteProcess(proc.id)} className="p-2.5 bg-white border border-slate-200 text-red-500 rounded-xl hover:bg-red-50 transition-all shadow-sm">
                                 <Icons.Trash />
                              </button>
                           </div>
                        </div>

                        {activeProcessForNotes === proc.id && (
                          <div className="p-6 md:p-8 bg-white border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
                             <div className="flex flex-col gap-4">
                                <div className="flex gap-3">
                                   <input 
                                    type="text" 
                                    placeholder="Nova anotação sobre este processo..." 
                                    className="flex-1 bg-slate-50 p-4 rounded-xl font-medium text-sm outline-none border border-transparent focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all"
                                    value={newNoteText}
                                    onChange={e => setNewNoteText(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddNote(proc.id)}
                                   />
                                   <button onClick={() => handleAddNote(proc.id)} disabled={!newNoteText.trim()} className="bg-slate-900 text-white px-6 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-blue-600 transition-all disabled:opacity-30">ADD</button>
                                </div>

                                <div className="space-y-3 mt-4">
                                   {(proc.notes || []).length === 0 ? (
                                      <p className="text-center py-6 text-slate-300 font-bold text-[9px] uppercase tracking-[0.2em]">Sem anotações registradas</p>
                                   ) : (
                                      (proc.notes || []).map(note => (
                                        <div key={note.id} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-start group border border-transparent hover:border-slate-200 transition-all">
                                           <div className="flex-1 pr-6">
                                              <p className="text-slate-700 text-sm font-medium leading-relaxed">{note.text}</p>
                                              <p className="text-[8px] font-black text-slate-400 uppercase mt-2 tracking-widest">{new Date(note.createdAt).toLocaleString('pt-BR')}</p>
                                           </div>
                                           <button onClick={() => handleDeleteNote(proc.id, note.id)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all">
                                              <Icons.Trash />
                                           </button>
                                        </div>
                                      ))
                                   )}
                                </div>
                             </div>
                          </div>
                        )}
                      </div>
                    ))}
                 </div>
               )}
            </div>
          </div>
        </Modal>

        {/* MODAL PARA CADASTRO/EDIÇÃO DE CLIENTE (HÍBRIDO PF/PJ) */}
        <Modal isOpen={isClientModalOpen} onClose={() => { setIsClientModalOpen(false); setEditingClientId(null); setClientForm({ name: '', document: '', driveUrl: '', tradeName: '', address: '', adminName: '' }); }} title={editingClientId ? "Atualizar Cliente" : "Cadastrar Novo Cliente"}>
          <div className="space-y-6">
            <div className="flex p-1.5 bg-slate-100 rounded-2xl">
              <button onClick={() => { setClientType('PJ'); setClientForm(p => ({ ...p })); }} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${clientType === 'PJ' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Pessoa Jurídica</button>
              <button onClick={() => { setClientType('PF'); setClientForm(p => ({ ...p, tradeName: '', address: '', adminName: '' })); }} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${clientType === 'PF' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Pessoa Física</button>
            </div>

            {clientType === 'PJ' ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4">Busca Automática Receita</p>
                  <div className="flex gap-4">
                    <input type="text" placeholder="CNPJ (apenas números)" className="flex-1 bg-white p-4 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-200 border border-slate-100" value={clientForm.document} onChange={e => setClientForm(p => ({ ...p, document: e.target.value }))} />
                    <button onClick={handleFetchCNPJ} disabled={isFetchingCNPJ || (clientForm.document || '').replace(/\D/g, '').length !== 14} className="bg-blue-600 text-white px-8 py-4 rounded-xl font-black text-xs uppercase shadow-lg shadow-blue-500/20 hover:scale-105 transition-all disabled:opacity-50">{isFetchingCNPJ ? '...' : 'BUSCAR'}</button>
                  </div>
                </div>

                <div className="space-y-4 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Razão Social</label>
                    <input type="text" className="w-full bg-white p-4 rounded-xl font-bold text-sm border border-slate-100 outline-none focus:ring-4 focus:ring-blue-100" value={clientForm.name} onChange={e => setClientForm(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Fantasia</label>
                    <input type="text" className="w-full bg-white p-4 rounded-xl font-bold text-sm border border-slate-100 outline-none focus:ring-4 focus:ring-blue-100" value={clientForm.tradeName} onChange={e => setClientForm(p => ({ ...p, tradeName: e.target.value }))} />
                  </div>

                  {/* Seleção de Nome Preferencial */}
                  <div className="space-y-3 pt-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome para Exibição no Sistema</label>
                    <div className="flex gap-3">
                       <button 
                        type="button"
                        onClick={() => setPreferredNameSource('RAZAO')}
                        className={`flex-1 flex flex-col items-center p-3 rounded-xl border-2 transition-all ${preferredNameSource === 'RAZAO' ? 'bg-blue-50 border-blue-600' : 'bg-white border-slate-200 opacity-60 hover:opacity-100'}`}
                       >
                          <span className="text-[8px] font-black text-slate-400 uppercase mb-1">Usar Razão Social</span>
                          <span className="text-[10px] font-bold text-slate-900 truncate w-full text-center">{clientForm.name || 'Pendente'}</span>
                       </button>
                       <button 
                        type="button"
                        onClick={() => setPreferredNameSource('FANTASIA')}
                        className={`flex-1 flex flex-col items-center p-3 rounded-xl border-2 transition-all ${preferredNameSource === 'FANTASIA' ? 'bg-blue-50 border-blue-600' : 'bg-white border-slate-200 opacity-60 hover:opacity-100'}`}
                       >
                          <span className="text-[8px] font-black text-slate-400 uppercase mb-1">Usar Nome Fantasia</span>
                          <span className="text-[10px] font-bold text-slate-900 truncate w-full text-center">{clientForm.tradeName || (clientForm.name ? clientForm.name : 'Pendente')}</span>
                       </button>
                    </div>
                  </div>

                  <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço</label><input type="text" className="w-full bg-white p-4 rounded-xl font-bold text-sm border border-slate-100 outline-none focus:ring-4 focus:ring-blue-100" value={clientForm.address} onChange={e => setClientForm(p => ({ ...p, address: e.target.value }))} /></div>
                  <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Sócio-ADM</label><input type="text" className="w-full bg-white p-4 rounded-xl font-bold text-sm border border-slate-100 outline-none focus:ring-4 focus:ring-blue-100" value={clientForm.adminName} onChange={e => setClientForm(p => ({ ...p, adminName: e.target.value }))} /></div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">Nome Completo</label><input type="text" placeholder="Nome do Cliente" className="w-full bg-slate-50 p-4 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-emerald-100 border border-transparent" value={clientForm.name} onChange={e => setClientForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">CPF</label><input type="text" placeholder="000.000.000-00" className="w-full bg-slate-50 p-4 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-emerald-100 border border-transparent" value={clientForm.document} onChange={e => setClientForm(p => ({ ...p, document: e.target.value }))} /></div>
              </div>
            )}

            <button onClick={handleSaveClient} disabled={!clientForm.name?.trim()} className={`w-full p-6 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl disabled:opacity-50 mt-4 ${clientType === 'PJ' ? 'bg-slate-900 hover:bg-blue-600 text-white' : 'bg-slate-900 hover:bg-emerald-600 text-white'}`}>{editingClientId ? 'SALVAR ATUALIZAÇÕES' : 'FINALIZAR CADASTRO'}</button>
          </div>
        </Modal>

        <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetDeadlineForm(); }} title={editingDeadlineId ? "Editar Registro" : "Registrar Prazo"}>
          <form onSubmit={handleAddDeadline} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">Tipo de Peça</label><select className="w-full bg-slate-50 p-4 md:p-5 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-blue-100 outline-none" value={newDeadline.peca} onChange={e => setNewDeadline(p => ({ ...p, peca: e.target.value }))} required><option value="">Selecione...</option>{dynamicSettings.pecas.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
            <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">Cliente</label><select className="w-full bg-slate-50 p-4 md:p-5 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-blue-100 outline-none" value={newDeadline.empresa} onChange={e => setNewDeadline(p => ({ ...p, empresa: e.target.value }))} required><option value="">Selecione...</option>{unifiedEmpresasOptions.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
            <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">Data do Prazo</label><input type="date" className="w-full bg-slate-50 p-4 md:p-5 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-blue-100 outline-none" value={newDeadline.data} onChange={e => setNewDeadline(p => ({ ...p, data: e.target.value }))} required /></div>
            <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">Hora do Prazo</label><input type="time" className="w-full bg-slate-50 p-4 md:p-5 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-blue-100 outline-none" value={newDeadline.hora || ''} onChange={e => setNewDeadline(p => ({ ...p, hora: e.target.value }))} /></div>
            <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">Responsável</label><select className="w-full bg-slate-50 p-4 md:p-5 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-blue-100 outline-none" value={newDeadline.responsavel} onChange={e => setNewDeadline(p => ({ ...p, responsavel: e.target.value }))} required><option value="">Selecione...</option>{dynamicSettings.responsaveis.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
            <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">Órgão/Instituição</label><input type="text" className="w-full bg-slate-50 p-4 md:p-5 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-blue-100 outline-none" value={newDeadline.instituicao || ''} onChange={e => setNewDeadline(p => ({ ...p, instituicao: e.target.value }))} placeholder="Ex: TJSP, STJ, Receita Federal..." /></div>
            <div className="md:col-span-2 space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">Link do Documento (Drive)</label><input type="url" className="w-full bg-slate-50 p-4 md:p-5 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-blue-100 outline-none" value={newDeadline.documentUrl || ''} onChange={e => setNewDeadline(p => ({ ...p, documentUrl: e.target.value }))} placeholder="https://drive.google.com/..." /></div>
            <div className="md:col-span-2 space-y-4">
              <div className="flex justify-between items-center px-4"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição da Atividade</label><button type="button" disabled={isSuggesting || !newDeadline.peca || !newDeadline.empresa} onClick={async () => { setIsSuggesting(true); const suggestion = await suggestActionObject(newDeadline.peca!, newDeadline.empresa!); setNewDeadline(prev => ({ ...prev, assunto: suggestion })); setIsSuggesting(false); }} className="text-[9px] font-black uppercase px-4 md:px-6 py-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Icons.Sparkles /> {isSuggesting ? '...' : 'Sugestão IA'}</button></div>
              <textarea className="w-full bg-slate-50 p-6 md:p-8 rounded-2xl md:rounded-3xl font-medium text-sm min-h-[100px] md:min-h-[120px] focus:ring-4 focus:ring-blue-100 outline-none" placeholder="Detalhes operacionais sobre a tarefa..." value={newDeadline.assunto} onChange={e => setNewDeadline(p => ({ ...p, assunto: e.target.value }))} required />
            </div>
            <button type="submit" className="md:col-span-2 bg-slate-900 text-white p-5 md:p-6 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-600 transition-all shadow-xl active:scale-95">{editingDeadlineId ? 'Salvar Alterações' : 'Confirmar Registro'}</button>
          </form>
        </Modal>

        <Modal isOpen={isJurisModalOpen} onClose={() => { setIsJurisModalOpen(false); resetJurisForm(); }} title={editingJurisId ? "Editar Jurisprudência" : "Nova Jurisprudência"}>
          <form onSubmit={handleAddJuris} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-3">Área</label><select className="w-full bg-slate-50 p-4 md:p-5 rounded-2xl font-bold text-sm outline-none" value={newJuris.area} onChange={e => setNewJuris(p => ({ ...p, area: e.target.value }))} required><option value="">Selecione...</option>{dynamicSettings.areasDireito.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
            <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-3">Órgão</label><select className="w-full bg-slate-50 p-4 md:p-5 rounded-2xl font-bold text-sm outline-none" value={newJuris.orgao} onChange={e => setNewJuris(p => ({ ...p, orgao: e.target.value }))} required><option value="">Selecione...</option>{dynamicSettings.orgaosJulgadores.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
            <div className="md:col-span-2 space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-3">Tema</label><select className="w-full bg-slate-50 p-4 md:p-5 rounded-2xl font-bold text-sm outline-none" value={newJuris.tema} onChange={e => setNewJuris(p => ({ ...p, tema: e.target.value }))} required><option value="">Selecione...</option>{dynamicSettings.temasJuris.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div className="md:col-span-2 space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-3">Enunciado</label><textarea className="w-full bg-slate-50 p-6 md:p-8 rounded-2xl md:rounded-3xl font-medium text-sm min-h-[150px] md:min-h-[200px] outline-none" placeholder="Texto completo..." value={newJuris.enunciado} onChange={e => setNewJuris(p => ({ ...p, enunciado: e.target.value }))} required /></div>
            <button type="submit" className="md:col-span-2 bg-slate-900 text-white p-5 md:p-6 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-600 transition-all shadow-xl active:scale-95">{editingJurisId ? 'Atualizar Precedente' : 'Salvar Jurisprudência'}</button>
          </form>
        </Modal>
      </main>
    </div>
  );
}
