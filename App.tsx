
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Deadline, 
  DeadlineStatus,
  NotificationSettings,
  AuthUser
} from './types';
import { 
  Icons, 
  COLORS, 
  PECA_OPTIONS, 
  RESPONSAVEL_OPTIONS,
  EMPRESA_OPTIONS
} from './constants';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Tooltip 
} from 'recharts';
import { suggestActionObject } from './services/geminiService';

// Firebase Imports
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
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
  orderBy
} from "firebase/firestore";

// CONFIGURAÇÃO FINAL - Seus dados do Firebase (100% Corretos agora)
const firebaseConfig = {
  apiKey: "AIzaSyBaaw8h1UNCjuBeyea6s9XqxCaP2feaM3U",
  authDomain: "juriscontrolendo.firebaseapp.com",
  projectId: "juriscontrolendo",
  storageBucket: "juriscontrolendo.firebasestorage.app",
  messagingSenderId: "824104145702",
  appId: "1:824104145702:web:1a65ea986f11b6ea46e7e7",
  measurementId: "G-BD9N4W5JXS"
};

// Inicialização
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
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

const getAlertLevel = (dateStr: string, status: DeadlineStatus, greenDays: number) => {
  if (status === DeadlineStatus.COMPLETED) return 'safe';
  const diff = getDaysDiff(dateStr);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'critical';
  if (diff === 1) return 'urgent';
  if (diff <= greenDays) return 'warning';
  return 'safe';
};

// --- Componentes ---
const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl border border-slate-100 flex flex-col relative animate-in zoom-in-95 duration-300">
        <div className="p-8 sm:p-12 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <h3 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tighter">{title}</h3>
          <button onClick={onClose} className="p-3 sm:p-4 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400 hover:text-slate-900">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div className="p-8 sm:p-12 overflow-y-auto flex-1 custom-scrollbar">{children}</div>
      </div>
    </div>
  );
};

const AuthScreen = ({ onLogin, loading }: { onLogin: (email: string, pass: string, isSignUp: boolean) => void, loading: boolean }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-[100] p-6 overflow-hidden">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600 rounded-full blur-[150px]" />
      </div>
      <div className="bg-white/10 backdrop-blur-3xl p-12 rounded-[3rem] w-full max-w-md border border-white/10 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-3xl shadow-xl shadow-blue-500/30 mb-6 text-white text-3xl font-black">JC</div>
          <h2 className="text-3xl font-black text-white tracking-tighter">JurisControl</h2>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">Nuvem Conectada</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onLogin(email, password, isSignUp); }} className="space-y-6">
          <input type="email" required className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" required className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} />
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50">
            {loading ? 'Acessando Nuvem...' : isSignUp ? 'Criar Acesso Nuvem' : 'Entrar no Sistema'}
          </button>
        </form>
        <button onClick={() => setIsSignUp(!isSignUp)} className="w-full mt-8 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-white transition-colors">
          {isSignUp ? 'Já tem conta? Entrar' : 'Não tem conta? Criar acesso'}
        </button>
      </div>
    </div>
  );
};

const Sidebar = ({ currentView, setView, user, onLogout }: { currentView: string, setView: (v: string) => void, user: AuthUser | null, onLogout: () => void }) => {
  return (
    <aside className="w-64 bg-slate-950 text-white min-h-screen flex flex-col fixed left-0 top-0 z-40 border-r border-slate-800">
      <div className="p-10 text-center">
        <h1 className="text-2xl font-black tracking-tighter"><span className="text-blue-600">J</span>urisControl</h1>
      </div>
      <nav className="flex-1 px-6 space-y-2">
        <button onClick={() => setView('dashboard')} className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all ${currentView === 'dashboard' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}>
          <Icons.Dashboard /> <span className="font-bold text-sm">Painel</span>
        </button>
        <button onClick={() => setView('deadlines')} className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all ${currentView === 'deadlines' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}>
          <Icons.List /> <span className="font-bold text-sm">Prazos</span>
        </button>
        <button onClick={() => setView('settings')} className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all ${currentView === 'settings' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}>
          <Icons.Settings /> <span className="font-bold text-sm">Gestão</span>
        </button>
      </nav>
      {user && (
        <div className="p-6 border-t border-slate-900 m-4 bg-white/5 rounded-3xl text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-2 truncate">{user.email}</p>
          <button onClick={onLogout} className="text-[9px] font-black uppercase text-red-400 hover:text-red-300">Sair</button>
        </div>
      )}
    </aside>
  );
};

export default function App() {
  const [view, setView] = useState('dashboard');
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'overdue' | 'today' | 'tomorrow' | 'week'>('all');
  const [aiLoading, setAiLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [settings] = useState<NotificationSettings>({
    greenAlertDays: 5,
    yellowAlertDays: 1,
    enableBrowserNotifications: true,
    notificationFrequency: 'always',
    quietMode: false,
    responsaveis: RESPONSAVEL_OPTIONS,
    pecas: PECA_OPTIONS,
    empresas: EMPRESA_OPTIONS 
  });

  const [newDeadline, setNewDeadline] = useState<Partial<Deadline>>({
    peca: '', responsavel: RESPONSAVEL_OPTIONS[0], empresa: '', assunto: '',
    data: new Date().toISOString().split('T')[0], status: DeadlineStatus.PENDING
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
    setIsSyncing(true);
    const q = query(collection(db, "deadlines"), where("userId", "==", user.uid), orderBy("data", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDeadlines(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Deadline[]);
      setIsSyncing(false);
    }, () => setIsSyncing(false));
    return () => unsubscribe();
  }, [user]);

  const handleLogin = async (email: string, pass: string, isSignUp: boolean) => {
    setAuthLoading(true);
    try {
      if (isSignUp) await createUserWithEmailAndPassword(auth, email, pass);
      else await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) { alert("Acesso negado: " + err.message); }
    finally { setAuthLoading(false); }
  };

  const handleAddDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, "deadlines"), {
        ...newDeadline,
        userId: user.uid,
        createdAt: new Date().toISOString()
      });
      setIsModalOpen(false);
      setNewDeadline({ ...newDeadline, assunto: '' });
    } catch (err: any) { alert("Erro de gravação: " + err.message); }
  };

  const toggleStatus = async (d: Deadline) => {
    const newS = d.status === DeadlineStatus.COMPLETED ? DeadlineStatus.PENDING : DeadlineStatus.COMPLETED;
    await updateDoc(doc(db, "deadlines", d.id), { status: newS });
  };

  const deleteDeadline = async (id: string) => {
    if (confirm("Remover permanentemente?")) await deleteDoc(doc(db, "deadlines", id));
  };

  const stats = useMemo(() => ({
    concluidos: deadlines.filter(d => d.status === DeadlineStatus.COMPLETED).length,
    hoje: deadlines.filter(d => d.status === DeadlineStatus.PENDING && getDaysDiff(d.data) === 0).length,
    atrasados: deadlines.filter(d => d.status === DeadlineStatus.PENDING && getDaysDiff(d.data) < 0).length,
  }), [deadlines]);

  if (authLoading) return <div className="fixed inset-0 bg-slate-950 flex items-center justify-center text-white font-black uppercase text-xs tracking-widest">Sincronizando...</div>;
  if (!user) return <AuthScreen onLogin={handleLogin} loading={authLoading} />;

  return (
    <div className="flex bg-slate-50 min-h-screen antialiased">
      <Sidebar currentView={view} setView={setView} user={user} onLogout={() => signOut(auth)} />
      <main className="ml-64 flex-1 p-12">
        <header className="flex justify-between items-start mb-12">
          <div>
            <h2 className="text-4xl font-black text-slate-950 tracking-tighter mb-2">Painel de Controle</h2>
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
              Nuvem Ativa: Rudy Endo
            </div>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all">+ Novo Registro</button>
        </header>

        {view === 'dashboard' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <section className="grid grid-cols-3 gap-6">
                <div className="bg-red-800 p-8 rounded-[2.5rem] text-white shadow-2xl">
                   <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-70">Atrasados</p>
                   <span className="text-6xl font-black tracking-tighter">{stats.atrasados}</span>
                </div>
                <div className="bg-red-600 p-8 rounded-[2.5rem] text-white shadow-2xl">
                   <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-70">Prazos de Hoje</p>
                   <span className="text-6xl font-black tracking-tighter">{stats.hoje}</span>
                </div>
                <div className="bg-emerald-600 p-8 rounded-[2.5rem] text-white shadow-2xl">
                   <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-70">Concluídos</p>
                   <span className="text-6xl font-black tracking-tighter">{stats.concluidos}</span>
                </div>
             </section>

             <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                <h3 className="text-xl font-black mb-8">Prazos Próximos</h3>
                <div className="space-y-4">
                  {deadlines.filter(d => d.status === DeadlineStatus.PENDING).slice(0, 5).map(d => (
                    <div key={d.id} className="flex justify-between items-center p-6 bg-slate-50 rounded-3xl border border-slate-100">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{d.empresa}</p>
                        <h4 className="font-black text-slate-900">{d.peca}</h4>
                      </div>
                      <span className="bg-slate-900 text-white px-5 py-2 rounded-full text-[10px] font-black">{formatLocalDate(d.data)}</span>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        )}

        {view === 'deadlines' && (
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden">
             <div className="divide-y divide-slate-100">
                {deadlines.map(d => (
                  <div key={d.id} className="p-8 hover:bg-slate-50 transition-all flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-black text-slate-900 text-lg leading-none">{d.peca}</span>
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${d.status === DeadlineStatus.COMPLETED ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{d.status}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-black uppercase mt-2 tracking-widest">{d.empresa} • {d.responsavel}</p>
                      <p className="text-xs text-slate-500 mt-4 italic">"{d.assunto}"</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                         <p className="font-black text-slate-900">{formatLocalDate(d.data)}</p>
                         <p className="text-[9px] font-black text-blue-600 uppercase">{getDaysDiff(d.data) < 0 ? 'Expirado' : `Faltam ${getDaysDiff(d.data)} dias`}</p>
                      </div>
                      <button onClick={() => toggleStatus(d)} className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><Icons.Check /></button>
                      <button onClick={() => deleteDeadline(d.id)} className="p-4 bg-red-50 text-red-600 rounded-2xl"><Icons.Trash /></button>
                    </div>
                  </div>
                ))}
                {deadlines.length === 0 && <p className="p-20 text-center text-slate-300 font-black uppercase italic tracking-widest">Nenhum registro ativo</p>}
             </div>
          </div>
        )}

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Prazo">
          <form onSubmit={handleAddDeadline} className="grid grid-cols-2 gap-8">
            <select className="w-full bg-slate-50 p-6 rounded-3xl font-black text-sm border-0 outline-none" value={newDeadline.peca} onChange={e => setNewDeadline(p => ({ ...p, peca: e.target.value }))} required>
              <option value="">PEÇA...</option>
              {settings.pecas.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select className="w-full bg-slate-50 p-6 rounded-3xl font-black text-sm border-0 outline-none" value={newDeadline.empresa} onChange={e => setNewDeadline(p => ({ ...p, empresa: e.target.value }))} required>
              <option value="">CLIENTE...</option>
              {settings.empresas.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <input type="date" className="w-full bg-slate-50 p-6 rounded-3xl font-black text-sm border-0 outline-none" value={newDeadline.data} onChange={e => setNewDeadline(p => ({ ...p, data: e.target.value }))} required />
            <select className="w-full bg-slate-50 p-6 rounded-3xl font-black text-sm border-0 outline-none" value={newDeadline.responsavel} onChange={e => setNewDeadline(p => ({ ...p, responsavel: e.target.value }))}>
              {settings.responsaveis.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="col-span-2">
              <textarea className="w-full bg-slate-50 p-6 rounded-3xl font-black text-sm border-0 outline-none min-h-[120px]" placeholder="O que deve ser feito?" value={newDeadline.assunto} onChange={e => setNewDeadline(p => ({ ...p, assunto: e.target.value }))} required />
            </div>
            <button type="submit" className="col-span-2 bg-slate-950 text-white p-6 rounded-3xl font-black uppercase text-xs tracking-widest">Salvar na Nuvem</button>
          </form>
        </Modal>
      </main>
    </div>
  );
}
