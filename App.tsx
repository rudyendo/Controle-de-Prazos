import React, { useState, useEffect, useMemo } from "react";
import {
  Deadline,
  DeadlineStatus,
  NotificationSettings,
  NotificationRule,
  AuthUser,
  Jurisprudencia,
  Client,
  ClientProcess,
  ProcessNote,
  AdminTask,
  AdminTaskCategory,
  AdminTaskAlert,
  DocumentTemplate,
} from "./types";
import {
  Icons,
  PECA_OPTIONS as INITIAL_PECAS,
  RESPONSAVEL_OPTIONS as INITIAL_RESPONSAVEIS,
  EMPRESA_OPTIONS as INITIAL_EMPRESAS,
  AREA_DIREITO_OPTIONS as INITIAL_AREAS,
  ORGAO_JULGADOR_OPTIONS as INITIAL_ORGAOS,
  TEMA_JURIS_OPTIONS as INITIAL_TEMAS,
} from "./constants";
import { suggestActionObject } from "./services/geminiService";

// Gráficos
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

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
  reauthenticateWithCredential,
  GoogleAuthProvider,
  signInWithPopup,
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
  setDoc,
  or,
  getDoc,
  query as firestoreQuery,
} from "firebase/firestore";

// CONFIGURAÇÃO DO USUÁRIO
const firebaseConfig = {
  apiKey: "AIzaSyBaaw8h1UNCjuBeyea6s9XqxCaP2feaM3U",
  authDomain: "juriscontrolendo.firebaseapp.com",
  projectId: "juriscontrolendo",
  storageBucket: "juriscontrolendo.firebasestorage.app",
  messagingSenderId: "824104145702",
  appId: "1:824104145702:web:1a65ea986f11b6ea46e7e7",
  measurementId: "G-BD9N4W5JXS",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Utilitários ---
const formatLocalDate = (dateStr: string) => {
  if (!dateStr) return "-";
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("pt-BR");
};

const getDaysDiff = (dateStr: string) => {
  if (!dateStr) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, month, day] = dateStr.split("-").map(Number);
  const deadlineDate = new Date(year, month - 1, day);
  deadlineDate.setHours(0, 0, 0, 0);
  const diffTime = deadlineDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const formatDateToISO = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
          <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
          >
            <Icons.Close />
          </button>
        </div>
        <div className="p-6 md:p-10 overflow-y-auto flex-1 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

const AuthScreen = ({
  onLogin,
  onGoogleLogin,
  loading,
}: {
  onLogin: (email: string, pass: string, isSignUp: boolean) => void;
  onGoogleLogin: () => void;
  loading: boolean;
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="fixed inset-0 bg-[#020617] flex items-center justify-center z-[100] p-6">
      <div className="bg-white/5 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] w-full max-w-md border border-white/10 shadow-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/20 mb-6 text-white text-2xl font-black">
            JC
          </div>
          <h2 className="text-2xl font-black text-white tracking-tighter">
            JurisControl
          </h2>
          <p className="text-slate-500 font-bold uppercase text-[9px] tracking-[0.2em] mt-2">
            Legal Performance System
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onLogin(email, password, isSignUp);
          }}
          className="space-y-4"
        >
          <input
            type="email"
            required
            className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600"
            placeholder="E-mail profissional"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            required
            className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-white font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex justify-end px-2">
            {!isSignUp && (
              <button
                type="button"
                onClick={() => {
                  if (!email) {
                    alert("Digite seu e-mail para recuperar a senha.");
                    return;
                  }
                  // @ts-ignore
                  import("firebase/auth").then(
                    ({ getAuth, sendPasswordResetEmail }) => {
                      sendPasswordResetEmail(getAuth(), email)
                        .then(() => alert("E-mail de recuperação enviado!"))
                        .catch((e) => alert("Erro: " + e.message));
                    },
                  );
                }}
                className="text-[10px] font-black text-slate-500 hover:text-blue-400 uppercase tracking-widest transition-colors"
              >
                Esqueci minha senha
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-5 rounded-2xl font-bold text-sm uppercase tracking-widest transition-all disabled:opacity-50 mt-4"
          >
            {loading
              ? "Sincronizando..."
              : isSignUp
                ? "Criar Nova Conta"
                : "Acessar Painel"}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
            <span className="bg-[#0b1120] px-4 text-slate-500">
              Ou continue com
            </span>
          </div>
        </div>

        <button
          onClick={onGoogleLogin}
          disabled={loading}
          type="button"
          className="w-full bg-white hover:bg-slate-50 text-[#001d3d] p-5 rounded-2xl font-bold text-sm uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-3 group"
        >
          <svg
            className="w-5 h-5 transition-transform group-hover:scale-110"
            viewBox="0 0 24 24"
          >
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Acessar com Google
        </button>

        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full mt-8 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-white transition-colors"
        >
          {isSignUp
            ? "Já possui acesso? Entrar"
            : "Solicitar novo acesso corporativo"}
        </button>
      </div>
    </div>
  );
};

// --- Componentes Auxiliares ---

const DEFAULT_TEMPLATES: DocumentTemplate[] = [
  {
    id: "prop-ad-judicia",
    name: "Procuração Ad Judicia",
    type: "PROCURACAO",
    content: `PROCURAÇÃO AD JUDICIA\n\nOUTORGANTE: {{NOME}}, {{NACIONALIDADE}}, {{ESTADO_CIVIL}}, {{PROFISSAO}}, inscrito no CPF sob o nº {{DOCUMENTO}}, residente e domiciliado em {{ENDERECO}}.\n\nOUTORGADO: [NOME DO ADVOGADO], inscrito na OAB/{{ESTADO}} sob o nº [NUMERO], com escritório profissional em [ENDEREÇO DO ESCRITÓRIO].\n\nPODERES: Pelo presente instrumento particular de procuração, o outorgante nomeia e constitui o outorgado seu procurador, conferindo-lhe os poderes da cláusula ad judicia et extra, para o foro em geral, em qualquer Juízo, Instância ou Tribunal, bem como os poderes especiais para confessar, reconhecer a procedência do pedido, transigir, desistir, receber, dar quitação e firmar compromisso, e tudo o mais que for necessário ao fiel cumprimento do presente mandato.\n\n{{DATA_ATUAL}}.\n\n__________________________________________\n{{NOME}}`,
    createdAt: new Date().toISOString(),
  },
  {
    id: "contrato-honorarios",
    name: "Contrato de Honorários",
    type: "CONTRATO",
    content: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS\n\nCONTRATANTE: {{NOME}}, inscrito no CPF/CNPJ sob o nº {{DOCUMENTO}}, residente/sediado em {{ENDERECO}}.\n\nCONTRATADO: [NOME DO ESCRITÓRIO/ADVOGADO], com sede em [ENDEREÇO].\n\nCLÁUSULA PRIMEIRA - DO OBJETO: O presente contrato tem como objeto a prestação de serviços advocatícios para [DESCREVER OBJETO].\n\nCLÁUSULA SEGUNDA - DOS HONORÁRIOS: Pelos serviços prestados, o CONTRATANTE pagará ao CONTRATADO a importância de R$ [VALOR], na forma de [FORMA DE PAGAMENTO].\n\nCLÁUSULA TERCEIRA - DAS DESPESAS: Todas as despesas judiciais e extrajudiciais serão de responsabilidade do CONTRATANTE.\n\nPor estarem assim justos e contratados, firmam o presente instrumento em duas vias de igual teor.\n\n{{DATA_ATUAL}}.\n\n__________________________________________\nCONTRATANTE\n\n__________________________________________\nCONTRATADO`,
    createdAt: new Date().toISOString(),
  },
];

const DocGenerator = ({ clients }: { clients: Client[] }) => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<DocumentTemplate | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);

  const generate = () => {
    if (!selectedClient || !selectedTemplate) return;

    let content = selectedTemplate.content;
    const data = {
      NOME: selectedClient.name,
      DOCUMENTO: selectedClient.document,
      ENDERECO: selectedClient.address || "[ENDEREÇO NÃO CADASTRADO]",
      NACIONALIDADE: "[NACIONALIDADE]",
      ESTADO_CIVIL: "[ESTADO CIVIL]",
      PROFISSAO: "[PROFISSÃO]",
      DATA_ATUAL: new Date().toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    };

    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      content = content.replace(regex, value);
    });

    setGeneratedContent(content);
    setIsEditing(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    alert("Copiado para a área de transferência!");
  };

  const downloadAsTxt = () => {
    const element = document.createElement("a");
    const file = new Blob([generatedContent], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `${selectedTemplate?.name || "documento"}.txt`;
    document.body.appendChild(element);
    element.click();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg">
              <Icons.FileText />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              Configurar Documento
            </h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                1. Selecionar Cliente
              </label>
              <select
                className="w-full bg-slate-50 p-4 rounded-xl font-bold text-sm border border-slate-100 outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                onChange={(e) =>
                  setSelectedClient(
                    clients.find((c) => c.id === e.target.value) || null,
                  )
                }
                value={selectedClient?.id || ""}
              >
                <option value="">Selecione o Cliente...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                2. Escolher Modelo
              </label>
              <div className="grid grid-cols-1 gap-3">
                {DEFAULT_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t)}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-start text-left ${selectedTemplate?.id === t.id ? "bg-blue-50 border-blue-600" : "bg-white border-slate-100 hover:border-slate-300"}`}
                  >
                    <span className="text-xs font-black text-slate-900 uppercase tracking-tight">
                      {t.name}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 mt-1">
                      {t.type}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={generate}
              disabled={!selectedClient || !selectedTemplate}
              className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed mt-4"
            >
              GERAR RASCUNHO AGORA
            </button>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 space-y-6 flex flex-col min-h-[500px]">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              Visualização
            </h3>
            {isEditing && (
              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm"
                  title="Copiar"
                >
                  <Icons.Copy />
                </button>
                <button
                  onClick={downloadAsTxt}
                  className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 transition-all shadow-sm"
                  title="Baixar TXT"
                >
                  <Icons.Download />
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-100 p-6 relative overflow-hidden h-full">
            {isEditing ? (
              <textarea
                className="w-full h-full bg-transparent border-none outline-none font-serif text-sm leading-relaxed text-slate-800 resize-none p-2 min-h-[400px]"
                value={generatedContent}
                onChange={(e) => setGeneratedContent(e.target.value)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-4 mt-20">
                <div className="scale-[2]">
                  <Icons.Sparkles />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] max-w-[200px] text-center">
                  Configure os dados à esquerda para gerar o documento
                  automaticamente
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Sidebar = ({
  currentView,
  setView,
  user,
  onLogout,
  isOpen,
  toggleSidebar,
}: {
  currentView: string;
  setView: (v: string) => void;
  user: AuthUser | null;
  onLogout: () => void;
  isOpen: boolean;
  toggleSidebar: () => void;
}) => {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: <Icons.Dashboard /> },
    { id: "agenda", label: "Agenda", icon: <Icons.Calendar /> },
    { id: "deadlines", label: "Controle de Prazos", icon: <Icons.List /> },
    { id: "clients", label: "Clientes", icon: <Icons.Users /> },
    {
      id: "correspondence",
      label: "Ofícios e Memorandos",
      icon: <Icons.Correspondence />,
    },
    {
      id: "jurisprudencia",
      label: "Jurisprudências",
      icon: <Icons.Jurisprudencia />,
    },
    { id: "documents", label: "Documentos", icon: <Icons.FileText /> },
    { id: "reports", label: "Relatórios", icon: <Icons.Report /> },
    { id: "settings", label: "Configurações", icon: <Icons.Settings /> },
  ];

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] md:hidden transition-opacity"
          onClick={toggleSidebar}
        ></div>
      )}

      <aside
        className={`w-[280px] bg-[#020617] text-white h-full min-h-screen flex flex-col fixed left-0 top-0 z-50 transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="p-8 md:p-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/20">
              JC
            </div>
            <h1 className="text-xl font-black tracking-tight">JurisControl</h1>
          </div>
          <button
            onClick={toggleSidebar}
            className="md:hidden p-2 text-slate-400 hover:text-white"
          >
            <Icons.Close />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setView(item.id);
                if (window.innerWidth < 768) toggleSidebar();
              }}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-200 group ${currentView === item.id ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500 hover:text-slate-300"}`}
            >
              <span
                className={`${currentView === item.id ? "text-white" : "text-slate-500 group-hover:text-slate-300"}`}
              >
                {item.icon}
              </span>
              <span className="font-bold text-[14px]">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-8 md:p-10 mt-auto border-t border-white/5 space-y-6">
          {user && (
            <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 transition-all hover:bg-white/[0.05] group">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="User"
                      className="w-10 h-10 rounded-full border-2 border-white/10 shadow-lg group-hover:border-blue-500/30 transition-all"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 border border-white/10">
                      <svg
                        className="w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#0b1120] rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[12px] font-bold text-white truncate group-hover:text-blue-200 transition-colors"
                    title={user.displayName || user.email || ""}
                  >
                    {user.displayName ||
                      (user.email ? user.email.split("@")[0] : "Usuário")}
                  </p>
                  <p className="text-[10px] font-medium text-slate-400 truncate opacity-40 mt-0.5">
                    {user.email}
                  </p>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="w-full bg-slate-800/40 hover:bg-red-500/10 text-slate-400 hover:text-red-500 p-3 rounded-xl font-black text-[8px] uppercase tracking-[0.2em] transition-all border border-white/5 hover:border-red-500/20 flex items-center justify-center gap-2 group/logout"
              >
                <svg
                  className="w-3.5 h-3.5 transition-transform group-hover/logout:-translate-x-0.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                SAIR DO SISTEMA
              </button>
            </div>
          )}

          <p className="text-[9px] font-medium text-slate-600">
            Criado por Rudy Endo (Versão 1.1.44)
          </p>
        </div>
      </aside>
    </>
  );
};

export default function App() {
  const [view, setView] = useState("dashboard");
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [adminTasks, setAdminTasks] = useState<AdminTask[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sentNotifications, setSentNotifications] = useState<Set<string>>(
    new Set(),
  );
  const [jurisprudencias, setJurisprudencias] = useState<Jurisprudencia[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);
  const [newRule, setNewRule] = useState<Partial<NotificationRule>>({
    deadlineType: "ALL",
    priority: "MÉDIA",
    leadTimeDays: 5,
    channels: { email: true, push: false, inApp: true },
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<{
    type: "deadline" | "task";
    data: Deadline | AdminTask;
  } | null>(null);
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [dashboardCalendarDate, setDashboardCalendarDate] = useState(
    new Date(),
  );

  // Reset agenda to current week when opening the view
  useEffect(() => {
    if (view === "agenda") {
      setCurrentCalendarDate(new Date());
    }
  }, [view]);

  const getDaysInWeek = (date: Date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - (day === 0 ? -1 : day - 1); // No domingo, pula para a próxima segunda-feira
    const monday = new Date(startOfWeek.setDate(diff));

    const days = [];
    for (let i = 0; i < 5; i++) {
      // Apenas 5 dias (Seg-Sex)
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      days.push(nextDay);
    }
    return days;
  };

  const getWeekRangeLabel = (date: Date) => {
    const days = getDaysInWeek(date);
    const first = days[0];
    const last = days[4];

    const options: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "short",
    };
    return `${first.toLocaleDateString("pt-BR", options)} - ${last.toLocaleDateString("pt-BR", options)}`.toUpperCase();
  };

  const [isJurisModalOpen, setIsJurisModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [isClientDetailsModalOpen, setIsClientDetailsModalOpen] =
    useState(false);
  const [selectedClientForDetails, setSelectedClientForDetails] =
    useState<Client | null>(null);
  const [editingDeadlineId, setEditingDeadlineId] = useState<string | null>(
    null,
  );
  const [editingAdminTaskId, setEditingAdminTaskId] = useState<string | null>(
    null,
  );
  const [editingJurisId, setEditingJurisId] = useState<string | null>(null);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [activeClientForProcesses, setActiveClientForProcesses] =
    useState<Client | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isFetchingCNPJ, setIsFetchingCNPJ] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [jurisSearch, setJurisSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // State para Processos e Notas
  const [newProcess, setNewProcess] = useState({ number: "", title: "" });
  const [activeProcessForNotes, setActiveProcessForNotes] = useState<
    string | null
  >(null);
  const [newNoteText, setNewNoteText] = useState("");

  // State para Formulário de Cliente
  const [clientType, setClientType] = useState<"PF" | "PJ">("PJ");
  const [preferredNameSource, setPreferredNameSource] = useState<
    "RAZAO" | "FANTASIA"
  >("FANTASIA");
  const [clientForm, setClientForm] = useState<Partial<Client>>({
    name: "",
    document: "",
    driveUrl: "",
    tradeName: "",
    address: "",
    adminName: "",
    email: "",
    phone: "",
  });

  // Correspondência
  const [usedOficioNumbers, setUsedOficioNumbers] = useState<number[]>([]);
  const [usedMemorandoNumbers, setUsedMemorandoNumbers] = useState<number[]>(
    [],
  );
  const [activeCorrespondenceTab, setActiveCorrespondenceTab] = useState<
    "oficio" | "memorando"
  >("oficio");
  const [maxOficioRange, setMaxOficioRange] = useState(50);

  const [reportFilters, setReportFilters] = useState({
    empresa: "",
    responsavel: "",
    dataInicio: "",
    dataFim: "",
  });

  const [dynamicSettings, setDynamicSettings] = useState<NotificationSettings>({
    greenAlertDays: 5,
    yellowAlertDays: 1,
    enableBrowserNotifications: true,
    notificationFrequency: "always",
    quietMode: false,
    responsaveis: INITIAL_RESPONSAVEIS,
    pecas: INITIAL_PECAS,
    empresas: INITIAL_EMPRESAS,
    clients: [],
    areasDireito: INITIAL_AREAS,
    orgaosJulgadores: INITIAL_ORGAOS,
    temasJuris: INITIAL_TEMAS,
    rules: [],
  });

  const [newDeadline, setNewDeadline] = useState<Partial<Deadline>>({
    peca: "",
    responsavel: "",
    empresa: "",
    assunto: "",
    instituicao: "",
    data: formatDateToISO(new Date()),
    hora: "",
    status: DeadlineStatus.PENDING,
    documentUrl: "",
  });

  const [newAdminTask, setNewAdminTask] = useState<Partial<AdminTask>>({
    category: AdminTaskCategory.MEETING,
    title: "",
    description: "",
    date: formatDateToISO(new Date()),
    time: "",
    status: DeadlineStatus.PENDING,
    alerts: [],
  });

  const [newJuris, setNewJuris] = useState<Partial<Jurisprudencia>>({
    area: "",
    tema: "",
    orgao: "",
    enunciado: "",
  });

  // Solicitar permissão de notificação ao carregar
  useEffect(() => {
    if ("Notification" in window) {
      if (
        Notification.permission !== "granted" &&
        Notification.permission !== "denied"
      ) {
        Notification.requestPermission();
      }
    }
  }, []);

  const playNotificationSound = () => {
    try {
      const audio = new Audio(
        "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
      );
      audio.volume = 0.5;
      audio
        .play()
        .catch((e) => console.log("Audio play blocked by browser policy"));
    } catch (e) {
      console.log("Error playing notification sound", e);
    }
  };

  const sendBrowserNotification = (title: string, body: string) => {
    if (
      dynamicSettings.enableBrowserNotifications &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      new Notification(title, {
        body,
        icon: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
        badge: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
      });
      playNotificationSound();
    }
  };

  // Motor de Notificações
  useEffect(() => {
    const checkNotifications = () => {
      const now = new Date();

      // 1. Checar Tarefas Administrativas
      adminTasks.forEach((task) => {
        if (
          task.status === DeadlineStatus.COMPLETED ||
          !task.time ||
          !task.date
        )
          return;

        const [taskHour, taskMin] = task.time.split(":").map(Number);

        // Criar data base da tarefa
        const [y, m, d] = task.date.split("-").map(Number);
        const taskDateObj = new Date(y, m - 1, d, taskHour, taskMin);
        const diffMs = taskDateObj.getTime() - now.getTime();
        const diffMin = Math.floor(diffMs / 60000);

        task.alerts?.forEach((alertType) => {
          const alertId = `${task.id}-${alertType}`;
          if (sentNotifications.has(alertId)) return;

          let shouldAlert = false;
          let label = "";

          if (alertType === "ON_TIME" && diffMin <= 0 && diffMin > -5) {
            shouldAlert = true;
            label = "AGORA";
          } else if (alertType === "1H" && diffMin <= 60 && diffMin > 55) {
            shouldAlert = true;
            label = "EM 1 HORA";
          } else if (alertType === "2H" && diffMin <= 120 && diffMin > 115) {
            shouldAlert = true;
            label = "EM 2 HORAS";
          } else if (alertType === "24H" && diffMin <= 1440 && diffMin > 1435) {
            shouldAlert = true;
            label = "EM 24 HORAS";
          }

          if (shouldAlert) {
            sendBrowserNotification(
              `ALERTA: ${task.title}`,
              `${label}: ${task.time} - ${task.description || ""}`,
            );
            setSentNotifications((prev) => new Set(prev).add(alertId));
          }
        });
      });

      // 2. Checar Prazos Processuais baseados em Regras
      deadlines.forEach((deadline) => {
        if (deadline.status === DeadlineStatus.COMPLETED) return;

        const rule = (dynamicSettings.rules || []).find(
          (r) => r.deadlineType === "ALL" || r.deadlineType === deadline.peca,
        );
        if (!rule) return;

        const daysLeft = getDaysDiff(deadline.data);
        const alertId = `deadline-${deadline.id}-${rule.id}`;

        if (daysLeft === rule.leadTimeDays && !sentNotifications.has(alertId)) {
          sendBrowserNotification(
            `PRAZO: ${deadline.peca}`,
            `Faltam ${daysLeft} dias para o prazo de ${deadline.empresa}`,
          );
          setSentNotifications((prev) => new Set(prev).add(alertId));
        }
      });
    };

    const interval = setInterval(checkNotifications, 60000); // Checa a cada minuto
    checkNotifications(); // Checa imediatamente ao montar

    return () => clearInterval(interval);
  }, [adminTasks, deadlines, dynamicSettings, sentNotifications]);

  const currentMonthName = "Compilado por Mês";

  const productivityData = useMemo(() => {
    const months = [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez",
    ];
    const currentYear = new Date().getFullYear();

    return months.map((month, index) => {
      const dCount = deadlines.filter((d) => {
        if (d.status !== DeadlineStatus.COMPLETED) return false;
        if (!d.data) return false;
        const [y, m] = d.data.split("-").map(Number);
        return y === currentYear && m === index + 1;
      }).length;

      const tCount = adminTasks.filter((t) => {
        if (t.status !== DeadlineStatus.COMPLETED) return false;
        if (!t.date) return false;
        const [y, m] = t.date.split("-").map(Number);
        return y === currentYear && m === index + 1;
      }).length;

      return {
        name: month,
        total: dCount + tCount,
        prazos: dCount,
        tarefas: tCount,
      };
    });
  }, [deadlines, adminTasks]);

  const companyDemandData = useMemo(() => {
    const counts: Record<string, number> = {};
    deadlines.forEach((d) => {
      if (d.empresa) {
        counts[d.empresa] = (counts[d.empresa] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [deadlines]);

  const lawyerProductivityData = useMemo(() => {
    const resps = dynamicSettings.responsaveis || INITIAL_RESPONSAVEIS;
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();

    return resps
      .map((name) => {
        const total = deadlines.filter((d) => {
          if (d.status !== DeadlineStatus.COMPLETED || d.responsavel !== name)
            return false;
          const dDate = new Date(d.data);
          return (
            dDate.getMonth() === curMonth && dDate.getFullYear() === curYear
          );
        }).length;
        return { name, total };
      })
      .sort((a, b) => b.total - a.total);
  }, [deadlines, dynamicSettings.responsaveis]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        });
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
    const unsubscribe = onSnapshot(
      settingsRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as any;
          setDynamicSettings((prev) => ({
            ...prev,
            ...data,
            responsaveis: data.responsaveis || INITIAL_RESPONSAVEIS,
            pecas: data.pecas || INITIAL_PECAS,
            empresas: data.empresas || INITIAL_EMPRESAS,
            clients: data.clients || [],
            areasDireito: data.areasDireito || INITIAL_AREAS,
            orgaosJulgadores: data.orgaosJulgadores || INITIAL_ORGAOS,
            temasJuris: data.temasJuris || INITIAL_TEMAS,
            rules: data.rules || [],
          }));
          setPermissionError(null);
        } else {
          setDoc(settingsRef, {
            userId: user.uid,
            userEmail: user.email,
            responsaveis: INITIAL_RESPONSAVEIS,
            pecas: INITIAL_PECAS,
            empresas: INITIAL_EMPRESAS,
            clients: [],
            areasDireito: INITIAL_AREAS,
            orgaosJulgadores: INITIAL_ORGAOS,
            temasJuris: INITIAL_TEMAS,
            rules: [],
            createdAt: new Date().toISOString(),
          }).catch(() => setPermissionError("Erro de Permissão."));
        }
      },
      (error) => {
        if (error.code === "permission-denied")
          setPermissionError("Erro de Permissão: Firestore bloqueado.");
      },
    );
    return () => unsubscribe();
  }, [user]);

  // Sync Prazos
  useEffect(() => {
    if (!user) return;
    setIsSyncing(true);

    // Consulta híbrida para garantir restauração de dados antigos e novos
    const q = firestoreQuery(
      collection(db, "deadlines"),
      or(where("userId", "==", user.uid), where("userEmail", "==", user.email)),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedDeadlines = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Deadline[];
        setDeadlines(
          loadedDeadlines.sort((a, b) => a.data.localeCompare(b.data)),
        );
        setIsSyncing(false);
      },
      (error) => {
        if (error.code === "permission-denied")
          setPermissionError("Acesso negado à coleção 'deadlines'.");
      },
    );
    return () => unsubscribe();
  }, [user]);

  // Sync Agenda Adm
  useEffect(() => {
    if (!user) return;
    const q = firestoreQuery(
      collection(db, "adminTasks"),
      or(where("userId", "==", user.uid), where("userEmail", "==", user.email)),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as AdminTask[];
        setAdminTasks(
          loaded.sort(
            (a, b) =>
              a.date.localeCompare(b.date) ||
              (a.time || "").localeCompare(b.time || ""),
          ),
        );
      },
      (error) => {
        if (error.code === "permission-denied")
          setPermissionError("Acesso negado à coleção 'adminTasks'.");
      },
    );
    return () => unsubscribe();
  }, [user]);

  // Sync Jurisprudências
  useEffect(() => {
    if (!user) return;
    const q = firestoreQuery(
      collection(db, "jurisprudencias"),
      or(where("userId", "==", user.uid), where("userEmail", "==", user.email)),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Jurisprudencia[];
        setJurisprudencias(
          loaded.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        );
      },
      (error) => {
        if (error.code === "permission-denied")
          setPermissionError("Acesso negado à coleção 'jurisprudencias'.");
      },
    );
    return () => unsubscribe();
  }, [user]);

  // Sync Clientes
  useEffect(() => {
    if (!user) return;
    const q = firestoreQuery(
      collection(db, "clients"),
      or(where("userId", "==", user.uid), where("userEmail", "==", user.email)),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Client[];
        setClients(loaded.sort((a, b) => a.name.localeCompare(b.name)));
      },
      (error) => {
        if (error.code === "permission-denied")
          console.error("Sem permissão para Clientes.");
      },
    );
    return () => unsubscribe();
  }, [user]);

  // Migração automática de clientes legados (do settings para a coleção dedicada)
  useEffect(() => {
    if (
      !user ||
      !dynamicSettings.clients ||
      dynamicSettings.clients.length === 0
    )
      return;

    const migrate = async () => {
      console.log("Detectados clientes legados para migração...");
      const legacyClients = dynamicSettings.clients!;

      for (const client of legacyClients) {
        try {
          const existingDoc = await getDoc(doc(db, "clients", client.id));
          if (!existingDoc.exists()) {
            await setDoc(doc(db, "clients", client.id), {
              ...client,
              userId: user.uid,
              userEmail: user.email,
              migratedAt: new Date().toISOString(),
            });
          }
        } catch (e) {
          console.error("Falha ao migrar cliente:", client.name, e);
        }
      }

      await updateSettings({ clients: [] });
      console.log("Migração de clientes concluída.");
    };

    migrate();
  }, [user, dynamicSettings.clients]);

  // Sync Correspondência
  useEffect(() => {
    if (!user) return;
    const oficioRef = doc(db, "correspondence", user.uid);
    const oficioRefEmail = doc(db, "correspondence", user.email || "no-email");

    const unsubscribe = onSnapshot(
      oficioRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as any;
          setUsedOficioNumbers(data.oficio || []);
          setUsedMemorandoNumbers(data.memorando || []);
        } else {
          // Migração de dados legados por e-mail se existirem
          getDoc(oficioRefEmail)
            .then((emailSnap) => {
              if (emailSnap.exists()) {
                const data = emailSnap.data() as any;
                setDoc(oficioRef, data, { merge: true }).catch(() => {});
                setUsedOficioNumbers(data.oficio || []);
                setUsedMemorandoNumbers(data.memorando || []);
              } else {
                setDoc(
                  oficioRef,
                  { oficio: [], memorando: [] },
                  { merge: true },
                ).catch(() => {});
              }
            })
            .catch(() => {});
        }
      },
      (error) => {
        if (error.code === "permission-denied")
          console.error("Sem permissão para Correspondência.");
      },
    );
    return () => unsubscribe();
  }, [user]);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  // Verificação de Senha Admin
  const verifyAdminPassword = async (): Promise<boolean> => {
    if (!user || !auth.currentUser) return false;

    // Se o usuário logou com Google, não pedimos senha de e-mail (pois não existe)
    // Usamos uma confirmação explícita para ações sensíveis
    const isGoogleUser = auth.currentUser.providerData.some(
      (p) => p.providerId === "google.com",
    );

    if (isGoogleUser) {
      return confirm(
        "Esta é uma ação sensível (excluir numeração permanente). Deseja confirmar sua identidade e prosseguir?",
      );
    }

    const password = prompt(
      "Confirmação de Segurança. Digite sua senha de acesso:",
    );
    if (!password || !user.email) return false;

    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(auth.currentUser, credential);
      return true;
    } catch (error: any) {
      console.error("Erro na reautenticação:", error);
      alert("Falha na verificação: Senha incorreta ou erro de conexão.");
      return false;
    }
  };

  const handleToggleCorrespondenceNumber = async (
    num: number,
    category: "oficio" | "memorando",
  ) => {
    if (!user) return;
    const currentList =
      category === "oficio" ? usedOficioNumbers : usedMemorandoNumbers;
    const isAlreadyUsed = currentList.includes(num);

    let updated;
    if (isAlreadyUsed) {
      const isVerified = await verifyAdminPassword();
      if (!isVerified) return;
      updated = currentList.filter((n) => n !== num);
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

  const getNextNumber = (category: "oficio" | "memorando") => {
    const list =
      category === "oficio" ? usedOficioNumbers : usedMemorandoNumbers;
    for (let i = 1; i <= 5000; i++) {
      if (!list.includes(i)) return i;
    }
    return 1;
  };

  const nextOficioNumber = useMemo(
    () => getNextNumber("oficio"),
    [usedOficioNumbers],
  );
  const nextMemorandoNumber = useMemo(
    () => getNextNumber("memorando"),
    [usedMemorandoNumbers],
  );

  const handleLogin = async (
    email: string,
    pass: string,
    isSignUp: boolean,
  ) => {
    setAuthLoading(true);
    try {
      if (isSignUp) await createUserWithEmailAndPassword(auth, email, pass);
      else await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      alert("Credenciais inválidas.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Erro Google Login:", err);
      if (err.code === "auth/unauthorized-domain") {
        alert(
          "Erro: Este domínio não está autorizado no Firebase Console. Adicione '" +
            window.location.hostname +
            "' em Authentication > Settings > Authorized Domains.",
        );
      } else {
        alert(
          `Falha no login com Google: ${err.message || "Erro desconhecido"}`,
        );
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const resetAdminTaskForm = () => {
    setNewAdminTask({
      category: AdminTaskCategory.MEETING,
      title: "",
      description: "",
      date: formatDateToISO(new Date()),
      time: "",
      status: DeadlineStatus.PENDING,
      alerts: [],
    });
    setEditingAdminTaskId(null);
  };

  const resetDeadlineForm = () => {
    setNewDeadline({
      peca: "",
      responsavel: "",
      empresa: "",
      assunto: "",
      instituicao: "",
      data: formatDateToISO(new Date()),
      hora: "",
      status: DeadlineStatus.PENDING,
      documentUrl: "",
    });
    setEditingDeadlineId(null);
  };

  const resetJurisForm = () => {
    setNewJuris({ area: "", tema: "", orgao: "", enunciado: "" });
    setEditingJurisId(null);
  };

  const handleEditClick = (d: Deadline) => {
    setEditingDeadlineId(d.id);
    setNewDeadline({ ...d });
    setIsModalOpen(true);
  };

  const handleEditAdminTaskClick = (t: AdminTask) => {
    setEditingAdminTaskId(t.id);
    setNewAdminTask({ ...t });
    setIsAgendaModalOpen(true);
  };

  const handleEditJurisClick = (j: Jurisprudencia) => {
    setEditingJurisId(j.id);
    setNewJuris({ ...j });
    setIsJurisModalOpen(true);
  };

  const handleAddDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;
    try {
      if (editingDeadlineId) {
        const { id, ...updateData } = newDeadline as Deadline;
        await updateDoc(doc(db, "deadlines", editingDeadlineId), {
          ...updateData,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await addDoc(collection(db, "deadlines"), {
          ...newDeadline,
          userId: user.uid,
          userEmail: user.email,
          createdAt: new Date().toISOString(),
          status: DeadlineStatus.PENDING,
        });
      }
      setIsModalOpen(false);
      resetDeadlineForm();
    } catch (err: any) {
      console.error("Erro ao salvar prazo:", err);
      alert(
        `Erro ao salvar prazo: ${err.message || "Verifique suas permissões no Firestore"}`,
      );
    }
  };

  const handleAddAdminTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;
    try {
      if (editingAdminTaskId) {
        const { id, ...updateData } = newAdminTask as AdminTask;
        await updateDoc(doc(db, "adminTasks", editingAdminTaskId), {
          ...updateData,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await addDoc(collection(db, "adminTasks"), {
          ...newAdminTask,
          userId: user.uid,
          userEmail: user.email,
          createdAt: new Date().toISOString(),
          status: DeadlineStatus.PENDING,
        });
      }
      setIsAgendaModalOpen(false);
      resetAdminTaskForm();
    } catch (err: any) {
      console.error("Erro ao salvar tarefa adm:", err);
      alert(
        `Erro ao salvar tarefa: ${err.message || "Verifique suas permissões no Firestore"}`,
      );
    }
  };

  const handleSaveRule = () => {
    const rules = [...(dynamicSettings.rules || [])];
    const ruleToSave = {
      ...newRule,
      id: newRule.id || Date.now().toString(),
    } as NotificationRule;

    if (editingRuleIndex !== null) {
      rules[editingRuleIndex] = ruleToSave;
    } else {
      rules.push(ruleToSave);
    }

    updateSettings("rules", rules);
    setIsRuleModalOpen(false);
    setNewRule({
      deadlineType: "ALL",
      priority: "MÉDIA",
      leadTimeDays: 5,
      channels: { email: true, push: false, inApp: true },
    });
    setEditingRuleIndex(null);
  };

  const handleDeleteRule = (index: number) => {
    if (confirm("Deseja realmente excluir este alerta?")) {
      const rules = dynamicSettings.rules.filter((_, i) => i !== index);
      updateSettings("rules", rules);
    }
  };

  const handleAddJuris = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;
    try {
      if (editingJurisId) {
        await updateDoc(doc(db, "jurisprudencias", editingJurisId), {
          ...newJuris,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await addDoc(collection(db, "jurisprudencias"), {
          ...newJuris,
          userId: user.uid,
          userEmail: user.email,
          createdAt: new Date().toISOString(),
        });
      }
      setIsJurisModalOpen(false);
      resetJurisForm();
    } catch (err) {
      const error = err as any;
      console.error("Erro ao salvar jurisprudência:", error);
      alert(
        `Erro ao salvar precedente: ${error.message || "Verifique suas permissões no Firestore"}`,
      );
    }
  };

  const updateSettings = async (
    fieldOrUpdates: keyof NotificationSettings | Partial<NotificationSettings>,
    newValue?: any,
  ) => {
    if (!user) return;
    setIsSavingSettings(true);
    const settingsRef = doc(db, "settings", user.uid);
    try {
      const updates =
        typeof fieldOrUpdates === "string"
          ? { [fieldOrUpdates]: newValue }
          : fieldOrUpdates;
      await setDoc(
        settingsRef,
        { ...updates, userId: user.uid, userEmail: user.email },
        { merge: true },
      );
    } finally {
      setIsSavingSettings(false);
    }
  };

  const toggleStatus = async (d: Deadline) => {
    const newS =
      d.status === DeadlineStatus.COMPLETED
        ? DeadlineStatus.PENDING
        : DeadlineStatus.COMPLETED;
    await updateDoc(doc(db, "deadlines", d.id), { status: newS });
  };

  const toggleAdminTaskStatus = async (t: AdminTask) => {
    const newS =
      t.status === DeadlineStatus.COMPLETED
        ? DeadlineStatus.PENDING
        : DeadlineStatus.COMPLETED;
    await updateDoc(doc(db, "adminTasks", t.id), { status: newS });
  };

  const deleteDeadline = async (id: string) => {
    await deleteDoc(doc(db, "deadlines", id));
  };

  const deleteAdminTask = async (id: string) => {
    await deleteDoc(doc(db, "adminTasks", id));
  };

  const deleteJuris = async (id: string) => {
    await deleteDoc(doc(db, "jurisprudencias", id));
  };

  const handleSendToReview = (d: Deadline) => {
    if (!d.documentUrl) {
      alert("Vincule um link primeiro.");
      return;
    }
    const phone = "5584999598686";
    const message = `Solicito revisão: *${d.peca}* (Cliente: *${d.empresa}*). Link: ${d.documentUrl}`;
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      "_blank",
    );
  };

  // Lógica Avançada de Consulta CNPJ
  const handleFetchCNPJ = async () => {
    const rawCnpj = (clientForm.document || "").replace(/\D/g, "");
    if (rawCnpj.length !== 14) {
      alert("CNPJ deve conter 14 dígitos.");
      return;
    }

    setIsFetchingCNPJ(true);
    try {
      const response = await fetch(
        `https://brasilapi.com.br/api/cnpj/v1/${rawCnpj}`,
      );
      if (!response.ok) throw new Error("CNPJ não encontrado ou erro na API.");
      const data = (await response.json()) as any;

      const addr = `${data.logradouro}, ${data.numero}${data.complemento ? " - " + data.complemento : ""}, ${data.bairro}, ${data.municipio}/${data.uf}`;

      // Identifica Sócio-Administrador
      const admin = data.qsa?.find((s: any) =>
        s.qualificacao_socio.toLowerCase().includes("administrador"),
      );

      setClientForm((prev) => ({
        ...prev,
        name: data.razao_social,
        tradeName: data.nome_fantasia || "",
        address: addr,
        adminName: admin?.nome_socio || "",
        email: data.email || "",
        phone: data.ddd_telefone_1
          ? `(${data.ddd_telefone_1.slice(0, 2)}) ${data.ddd_telefone_1.slice(2)}`
          : data.email
            ? ""
            : "", // Tenta formatar se houver
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
    setClientForm({ ...c, email: c.email || "", phone: c.phone || "" });
    // Tenta inferir a preferência se for PJ e já tiver displayName
    if (c.type === "PJ" && c.displayName === c.name) {
      setPreferredNameSource("RAZAO");
    } else {
      setPreferredNameSource("FANTASIA");
    }
    setIsClientModalOpen(true);
  };

  const handleSaveClient = async () => {
    if (!clientForm.name?.trim() || !user) {
      alert("Preencha o nome do cliente.");
      return;
    }

    const clientName = clientForm.name.toUpperCase();
    const tradeName = (
      clientType === "PJ" ? clientForm.tradeName || "" : ""
    ).toUpperCase();

    // Nome para Exibição baseado na preferência
    let preferredName;
    if (clientType === "PJ") {
      preferredName = (
        preferredNameSource === "FANTASIA"
          ? tradeName || clientName
          : clientName
      ).toUpperCase();
    } else {
      preferredName = clientName;
    }

    const isLegacy = editingClientId?.startsWith("legacy-");

    // Validação: Impedir duplicidade entre cadastros RICOS apenas
    const alreadyRegistered = clients.some(
      (c) =>
        c.id !== (isLegacy ? null : editingClientId) &&
        (c.name.toUpperCase() === clientName ||
          (c.tradeName && c.tradeName.toUpperCase() === tradeName)),
    );

    if (alreadyRegistered) {
      alert("Este cliente já possui um cadastro completo.");
      return;
    }

    const finalClientId =
      isLegacy || !editingClientId
        ? Math.random().toString(36).substr(2, 9)
        : editingClientId!;
    const existingClient = clients.find((c) => c.id === finalClientId);

    const clientData: any = {
      type: clientType,
      name: clientName,
      displayName: preferredName,
      document: clientForm.document || "",
      driveUrl: clientForm.driveUrl || "",
      tradeName: tradeName,
      address: clientType === "PJ" ? clientForm.address || "" : "",
      adminName: clientType === "PJ" ? clientForm.adminName || "" : "",
      email: clientForm.email || "",
      phone: clientForm.phone || "",
      processes: existingClient?.processes || [],
      userId: user.uid,
      userEmail: user.email,
      createdAt: existingClient?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      // Salva na coleção dedicada
      await setDoc(doc(db, "clients", finalClientId), clientData);

      // Atualiza a lista simples nas configurações para o seletor de prazos
      let updatedEmpresas = [...dynamicSettings.empresas];
      if (editingClientId && isLegacy) {
        const legacyName = editingClientId.replace("legacy-", "").toUpperCase();
        const empIdx = updatedEmpresas.findIndex(
          (e) => e.toUpperCase() === legacyName,
        );
        if (empIdx > -1) updatedEmpresas[empIdx] = preferredName;
        else if (!updatedEmpresas.includes(preferredName))
          updatedEmpresas.push(preferredName);
      } else if (!updatedEmpresas.includes(preferredName)) {
        updatedEmpresas.push(preferredName);
      }

      await updateSettings({ empresas: updatedEmpresas });

      setIsClientModalOpen(false);
      setEditingClientId(null);
      setClientForm({
        name: "",
        document: "",
        driveUrl: "",
        tradeName: "",
        address: "",
        adminName: "",
        email: "",
        phone: "",
      });
    } catch (err: any) {
      console.error("Erro ao salvar cliente:", err);
      alert("Falha ao salvar cliente no banco de dados.");
    }
  };

  const handleDeleteClient = async (client: Client) => {
    if (
      !confirm(
        `Excluir cadastro de ${client.displayName}? (Isso não apagará os prazos vinculados)`,
      )
    )
      return;

    try {
      await deleteDoc(doc(db, "clients", client.id));

      // Remove da lista simples também if for desejado
      const preferredName = client.displayName.toUpperCase();
      const updatedEmpresas = dynamicSettings.empresas.filter(
        (e) => e.toUpperCase() !== preferredName,
      );
      await updateSettings({ empresas: updatedEmpresas });
    } catch (err: any) {
      alert("Erro ao excluir cliente.");
    }
  };

  // --- Gestão de Processos e Notas ---
  const handleOpenClientDetails = (client: Client) => {
    setSelectedClientForDetails(client);
    setIsClientDetailsModalOpen(true);
  };

  const handleOpenProcesses = (client: Client) => {
    setActiveClientForProcesses(client);
    setIsProcessModalOpen(true);
    setActiveProcessForNotes(null);
  };

  const handleAddProcess = async () => {
    if (!activeClientForProcesses || !newProcess.number.trim()) return;

    const proc: ClientProcess = {
      id: Math.random().toString(36).substr(2, 9),
      number: newProcess.number.toUpperCase(),
      title: newProcess.title.toUpperCase(),
      notes: [],
      createdAt: new Date().toISOString(),
    };

    const updatedProcesses = [
      ...(activeClientForProcesses.processes || []),
      proc,
    ];

    try {
      await updateDoc(doc(db, "clients", activeClientForProcesses.id), {
        processes: updatedProcesses,
      });
      setNewProcess({ number: "", title: "" });
      setActiveClientForProcesses({
        ...activeClientForProcesses,
        processes: updatedProcesses,
      });
    } catch (err: any) {
      alert("Erro ao adicionar processo.");
    }
  };

  const handleDeleteProcess = async (procId: string) => {
    if (
      !activeClientForProcesses ||
      !confirm("Remover este processo e todas as suas notas?")
    )
      return;

    const updatedProcesses = (activeClientForProcesses.processes || []).filter(
      (p) => p.id !== procId,
    );

    try {
      await updateDoc(doc(db, "clients", activeClientForProcesses.id), {
        processes: updatedProcesses,
      });
      setActiveClientForProcesses({
        ...activeClientForProcesses,
        processes: updatedProcesses,
      });
      if (activeProcessForNotes === procId) setActiveProcessForNotes(null);
    } catch (err: any) {
      alert("Erro ao remover processo.");
    }
  };

  const handleAddNote = async (procId: string) => {
    if (!activeClientForProcesses || !newNoteText.trim()) return;

    const note: ProcessNote = {
      id: Math.random().toString(36).substr(2, 9),
      text: newNoteText,
      createdAt: new Date().toISOString(),
    };

    const updatedProcesses = (activeClientForProcesses.processes || []).map(
      (p) => {
        if (p.id === procId) return { ...p, notes: [note, ...(p.notes || [])] };
        return p;
      },
    );

    try {
      await updateDoc(doc(db, "clients", activeClientForProcesses.id), {
        processes: updatedProcesses,
      });
      setNewNoteText("");
      setActiveClientForProcesses({
        ...activeClientForProcesses,
        processes: updatedProcesses,
      });
    } catch (err: any) {
      alert("Erro ao adicionar nota.");
    }
  };

  const handleDeleteNote = async (procId: string, noteId: string) => {
    if (!activeClientForProcesses || !confirm("Remover esta anotação?")) return;

    const updatedProcesses = (activeClientForProcesses.processes || []).map(
      (p) => {
        if (p.id === procId)
          return {
            ...p,
            notes: (p.notes || []).filter((n) => n.id !== noteId),
          };
        return p;
      },
    );

    try {
      await updateDoc(doc(db, "clients", activeClientForProcesses.id), {
        processes: updatedProcesses,
      });
      setActiveClientForProcesses({
        ...activeClientForProcesses,
        processes: updatedProcesses,
      });
    } catch (err: any) {
      alert("Erro ao remover nota.");
    }
  };

  const chartData = useMemo(() => {
    const completed = deadlines.filter(
      (d) => d.status === DeadlineStatus.COMPLETED,
    ).length;
    const pending = deadlines.filter(
      (d) => d.status === DeadlineStatus.PENDING,
    ).length;
    return [
      { name: "Concluídos", value: completed, color: "#10b981" },
      { name: "Pendentes", value: pending, color: "#3b82f6" },
    ];
  }, [deadlines]);

  const stats = useMemo(
    () => ({
      atrasados: deadlines.filter(
        (d) => d.status === DeadlineStatus.PENDING && getDaysDiff(d.data) < 0,
      ).length,
      fatais: deadlines.filter(
        (d) => d.status === DeadlineStatus.PENDING && getDaysDiff(d.data) === 0,
      ).length,
      amanha: deadlines.filter(
        (d) => d.status === DeadlineStatus.PENDING && getDaysDiff(d.data) === 1,
      ).length,
      prox5dias: deadlines.filter(
        (d) =>
          d.status === DeadlineStatus.PENDING &&
          getDaysDiff(d.data) > 1 &&
          getDaysDiff(d.data) <= 5,
      ).length,
    }),
    [deadlines],
  );

  const filteredDeadlines = useMemo(() => {
    return deadlines.filter((d) => {
      const matchEmpresa =
        !reportFilters.empresa || d.empresa === reportFilters.empresa;
      const matchResponsavel =
        !reportFilters.responsavel ||
        d.responsavel === reportFilters.responsavel;
      const matchInicio =
        !reportFilters.dataInicio || d.data >= reportFilters.dataInicio;
      const matchFim =
        !reportFilters.dataFim || d.data <= reportFilters.dataFim;
      return matchEmpresa && matchResponsavel && matchInicio && matchFim;
    });
  }, [deadlines, reportFilters]);

  // LISTA UNIFICADA PARA O SELETOR DE CLIENTES (Preferência Nome Fantasia + Deduplicação)
  const unifiedEmpresasOptions = useMemo(() => {
    const namesSet = new Set<string>();
    const richFromColl = clients || [];
    const richFromLeg = dynamicSettings.clients || [];

    const allRich = [...richFromColl];
    const collIds = new Set(richFromColl.map((c) => c.id));
    richFromLeg.forEach((lc) => {
      if (!collIds.has(lc.id)) allRich.push(lc);
    });

    const knownReasonSocials = new Set(
      allRich.map((c) => c.name.toUpperCase()),
    );
    const knownDisplayNames = new Set(
      allRich.map((c) => c.displayName.toUpperCase()),
    );

    allRich.forEach((c) => {
      namesSet.add(c.displayName.toUpperCase());
    });

    dynamicSettings.empresas.forEach((e) => {
      const upperE = e.toUpperCase();
      // Se o nome legado já é a razão social ou o display name de alguém, ignora
      if (!knownReasonSocials.has(upperE) && !knownDisplayNames.has(upperE)) {
        namesSet.add(upperE);
      }
    });

    return Array.from(namesSet).sort((a: string, b: string) =>
      a.localeCompare(b),
    );
  }, [dynamicSettings.empresas, clients, dynamicSettings.clients]);

  // UNIFICAÇÃO DA LISTA DE CLIENTES PARA A ABA DE CONSULTA
  const filteredClientsList = useMemo(() => {
    const fromColl = clients || [];
    const fromLeg = dynamicSettings.clients || [];

    // Combina fontes com prioridade para a coleção
    const richClients = [...fromColl];
    const collIds = new Set(fromColl.map((c) => c.id));
    fromLeg.forEach((lc) => {
      if (!collIds.has(lc.id)) richClients.push(lc);
    });

    const existingNames = new Set(richClients.map((c) => c.name.toUpperCase()));
    const existingTrades = new Set(
      richClients.map((c) => (c.tradeName || "").toUpperCase()).filter(Boolean),
    );
    const existingDisplays = new Set(
      richClients.map((c) => c.displayName.toUpperCase()),
    );

    dynamicSettings.empresas.forEach((empName) => {
      const upperName = empName.toUpperCase();
      if (
        !existingNames.has(upperName) &&
        !existingTrades.has(upperName) &&
        !existingDisplays.has(upperName)
      ) {
        richClients.push({
          id: `legacy-${upperName}`,
          type: "PJ",
          name: upperName,
          displayName: upperName,
          document: "N/D",
          driveUrl: "",
          createdAt: new Date().toISOString(),
        });
      }
    });

    const list = richClients.sort((a, b) =>
      a.displayName.localeCompare(b.displayName),
    );

    if (!clientSearch) return list;
    const s = clientSearch.toLowerCase();
    return list.filter(
      (c) =>
        (c.name || "").toLowerCase().includes(s) ||
        (c.displayName || "").toLowerCase().includes(s) ||
        (c.tradeName || "").toLowerCase().includes(s) ||
        (c.document || "").toLowerCase().includes(s),
    );
  }, [
    clients,
    dynamicSettings.empresas,
    dynamicSettings.clients,
    clientSearch,
  ]);

  const pendingDeadlines = useMemo(
    () =>
      filteredDeadlines
        .filter((d) => d.status === DeadlineStatus.PENDING)
        .sort((a, b) => {
          const dateCompare = a.data.localeCompare(b.data);
          if (dateCompare !== 0) return dateCompare;
          return (a.hora || "00:00").localeCompare(b.hora || "00:00");
        }),
    [filteredDeadlines],
  );
  const completedDeadlines = useMemo(
    () =>
      filteredDeadlines
        .filter((d) => d.status === DeadlineStatus.COMPLETED)
        .sort((a, b) => b.data.localeCompare(a.data)),
    [filteredDeadlines],
  );

  const filteredJuris = useMemo(() => {
    if (!jurisSearch) return jurisprudencias;
    const s = jurisSearch.toLowerCase();
    return jurisprudencias.filter(
      (j) =>
        j.tema.toLowerCase().includes(s) ||
        j.area.toLowerCase().includes(s) ||
        j.enunciado.toLowerCase().includes(s) ||
        j.orgao.toLowerCase().includes(s),
    );
  }, [jurisprudencias, jurisSearch]);

  const groupedJuris = useMemo(() => {
    const groups: { [key: string]: Jurisprudencia[] } = {};
    filteredJuris.forEach((j) => {
      const tema = j.tema || "Sem Tema";
      if (!groups[tema]) groups[tema] = [];
      groups[tema].push(j);
    });
    return groups;
  }, [filteredJuris]);

  const handleEditSetting = (
    index: number,
    list: string[],
    field: keyof NotificationSettings,
  ) => {
    const current = list[index];
    const newValue = prompt(`Editar entrada:`, current);
    if (newValue && newValue.trim() !== "" && newValue !== current) {
      const updatedList = [...list];
      updatedList[index] =
        field === "responsaveis" ||
        field === "pecas" ||
        field === "empresas" ||
        field === "orgaosJulgadores"
          ? newValue.toUpperCase()
          : newValue;
      updateSettings(field, updatedList);
    }
  };

  const handleDeleteSetting = (
    index: number,
    list: string[],
    field: keyof NotificationSettings,
  ) => {
    if (confirm(`Remover definitivamente?`)) {
      const updatedList = list.filter((_, idx) => idx !== index);
      updateSettings(field, updatedList);
    }
  };

  const handleExportCSV = () => {
    const headers = ["Cliente", "Peça", "ADV", "Vencimento", "Status"];
    const rows = filteredDeadlines.map((d) => [
      d.empresa,
      d.peca,
      d.responsavel,
      formatLocalDate(d.data),
      d.status,
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `juriscontrol_report.csv`;
    link.click();
  };

  const handleExportPDF = () => {
    const docPdf = new jsPDF();
    docPdf.text("JurisControl - Relatório Operacional", 14, 15);
    const tableData = filteredDeadlines.map((d) => [
      d.empresa,
      d.peca,
      d.responsavel,
      formatLocalDate(d.data),
      d.status,
    ]);
    (docPdf as any).autoTable({
      head: [["Empresa", "Peça", "Responsável", "Data", "Status"]],
      body: tableData,
      startY: 20,
    });
    docPdf.save("juriscontrol_report.pdf");
  };

  const handleExportBackup = () => {
    const backupData = {
      version: "1.1",
      exportedAt: new Date().toISOString(),
      deadlines,
      adminTasks,
      jurisprudencias,
      clients,
      settings: dynamicSettings,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `juriscontrol_backup_${new Date().toISOString().split("T")[0]}.json`;
    link.click();
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (
      !confirm(
        "Isso irá sobrescrever ou duplicar dados dependendo do conteúdo. Deseja prosseguir com a restauração?",
      )
    )
      return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backup = JSON.parse(event.target?.result as string);
        if (!backup.deadlines && !backup.adminTasks && !backup.clients) {
          throw new Error("Arquivo de backup inválido.");
        }

        setIsSyncing(true);

        // Importar Clientes (Se houver no backup)
        if (backup.clients) {
          for (const c of backup.clients) {
            const { id, ...data } = c;
            await addDoc(collection(db, "clients"), {
              ...data,
              userId: user.uid,
              userEmail: user.email,
              importedAt: new Date().toISOString(),
            });
          }
        } else if (backup.settings?.clients) {
          // Migração de backup antigo (onde clientes estavam nas settings)
          for (const c of backup.settings.clients) {
            const { id, ...data } = c;
            await addDoc(collection(db, "clients"), {
              ...data,
              userId: user.uid,
              userEmail: user.email,
              importedAt: new Date().toISOString(),
            });
          }
        }

        // Importar Prazos
        if (backup.deadlines) {
          for (const d of backup.deadlines) {
            const { id, ...data } = d;
            await addDoc(collection(db, "deadlines"), {
              ...data,
              userId: user.uid,
              userEmail: user.email,
              imported: true,
            });
          }
        }

        // Importar Tarefas
        if (backup.adminTasks) {
          for (const t of backup.adminTasks) {
            const { id, ...data } = t;
            await addDoc(collection(db, "adminTasks"), {
              ...data,
              userId: user.uid,
              userEmail: user.email,
              imported: true,
            });
          }
        }

        // Importar Jurisprudências
        if (backup.jurisprudencias) {
          for (const j of backup.jurisprudencias) {
            const { id, ...data } = j;
            await addDoc(collection(db, "jurisprudencias"), {
              ...data,
              userId: user.uid,
              userEmail: user.email,
              imported: true,
            });
          }
        }

        alert("Restauração concluída com sucesso!");
      } catch (err: any) {
        console.error("Erro na restauração:", err);
        const errorMsg =
          err.code === "permission-denied"
            ? "Permissão negada no Firestore. Verifique as regras de segurança."
            : err.message || "Falha ao processar o arquivo de backup.";
        alert(`Erro na restauração: ${errorMsg}`);
      } finally {
        setIsSyncing(false);
      }
    };
    reader.readAsText(file);
  };

  if (authLoading)
    return (
      <div className="fixed inset-0 bg-[#020617] flex items-center justify-center text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] animate-pulse">
        Sincronizando Sistema...
      </div>
    );
  if (!user)
    return (
      <AuthScreen
        onLogin={handleLogin}
        onGoogleLogin={handleGoogleLogin}
        loading={authLoading}
      />
    );

  const renderDeadlineList = (list: Deadline[]) => (
    <div className="divide-y divide-slate-100">
      {list.map((d) => (
        <div
          key={d.id}
          className="p-6 md:p-10 flex flex-col hover:bg-slate-50/50 transition-all border-l-[6px] md:border-l-[10px] border-transparent hover:border-blue-500"
        >
          <div className="flex flex-col lg:flex-row justify-between items-start mb-4 w-full gap-4">
            <div className="flex-1 md:pr-10 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                <span className="font-black text-[#0F172A] text-lg md:text-xl tracking-tight uppercase">
                  {d.peca}
                </span>
                <span
                  className={`w-fit px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${d.status === DeadlineStatus.COMPLETED ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                >
                  {d.status}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  {d.empresa} • ADV: {d.responsavel}
                </p>
                {d.documentUrl && (
                  <a
                    href={d.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                    title="Ver Link"
                  >
                    <Icons.ExternalLink />
                  </a>
                )}
              </div>
            </div>
            <div className="flex flex-row-reverse lg:flex-row items-center justify-between lg:justify-end w-full lg:w-auto gap-4">
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleSendToReview(d)}
                  className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-sm flex items-center justify-center"
                  title="Enviar p/ Revisão"
                >
                  <Icons.Review />
                </button>
                <button
                  onClick={() => toggleStatus(d)}
                  className="w-10 h-10 md:w-12 md:h-12 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm flex items-center justify-center"
                  title="Alternar Status"
                >
                  <Icons.Check />
                </button>
                <button
                  onClick={() => handleEditClick(d)}
                  className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center justify-center"
                  title="Editar"
                >
                  <Icons.Edit />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm("Remover prazo definitivamente?"))
                      deleteDeadline(d.id);
                  }}
                  className="w-10 h-10 md:w-12 md:h-12 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm flex items-center justify-center"
                  title="Excluir"
                >
                  <Icons.Trash />
                </button>
              </div>
              <div className="text-left lg:text-right min-w-[100px] md:min-w-[120px]">
                <p className="font-black text-[#0F172A] text-lg md:text-xl tracking-tighter">
                  {formatLocalDate(d.data)}{" "}
                  {d.hora && (
                    <span className="text-blue-600 text-sm ml-1">
                      às {d.hora}
                    </span>
                  )}
                </p>
                <p
                  className={`text-[8px] font-black uppercase mt-0.5 ${getDaysDiff(d.data) <= 1 ? "text-red-500" : "text-slate-400"}`}
                >
                  {getDaysDiff(d.data)} dias
                </p>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-50 w-full">
            <p className="text-slate-600 text-xs md:text-sm leading-relaxed font-medium">
              "{d.assunto}"
            </p>
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
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-lg">
            JC
          </div>
          <h1 className="text-lg font-black tracking-tight">JurisControl</h1>
        </div>
        <button
          onClick={toggleMobileMenu}
          className="p-2 bg-white/5 rounded-lg"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </button>
      </div>

      <main className="md:ml-[280px] flex-1 p-6 md:p-16">
        {permissionError && (
          <div className="mb-8 md:mb-12 p-6 md:p-8 bg-red-50 border border-red-200 rounded-[1.5rem] md:rounded-[2.5rem] animate-in slide-in-from-top-4 shadow-2xl">
            <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6 text-red-700">
              <div className="p-3 bg-red-100 rounded-xl shadow-sm">
                <Icons.AlertCircle />
              </div>
              <div className="flex-1">
                <p className="font-black text-lg md:text-xl tracking-tight mb-3 uppercase">
                  Erro de Configuração
                </p>
                <p className="text-xs md:text-sm font-medium leading-relaxed mb-6 opacity-80">
                  Firestore bloqueado. Atualize as regras no console Firebase:
                </p>

                <div className="bg-slate-900 p-4 md:p-6 rounded-2xl border border-white/10 shadow-inner mb-4 overflow-x-auto">
                  <pre className="text-[9px] md:text-[10px] font-mono text-emerald-400 whitespace-pre leading-relaxed">
                    {`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /settings/{userId} { allow read, write: if request.auth != null && request.auth.uid == userId; }
    match /deadlines/{id} { allow read, write: if request.auth != null && (resource == null || resource.data.userId == request.auth.uid); }
    match /adminTasks/{id} { allow read, write: if request.auth != null && (resource == null || resource.data.userId == request.auth.uid); }
    match /jurisprudencias/{id} { allow read, write: if request.auth != null; }
    match /correspondence/{userId} { allow read, write: if request.auth != null && request.auth.uid == userId; }
    match /{document=**} { allow read, write: if false; }
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
              {view === "dashboard"
                ? "Dashboard"
                : view === "clients"
                  ? "Consulta de Clientes"
                  : view === "deadlines"
                    ? "Controle de Prazos"
                    : view === "agenda"
                      ? "Agenda"
                      : view === "correspondence"
                        ? "Ofícios e Memorandos"
                        : view === "jurisprudencia"
                          ? "Jurisprudências"
                          : view === "documents"
                            ? "Gerador de Documentos"
                            : view === "reports"
                              ? "Relatórios"
                              : "Configurações"}
            </h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
              <span className="text-[9px] md:text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
                SISTEMA OPERACIONAL
              </span>
            </div>
          </div>
          <div className="w-full md:w-auto flex items-center gap-4">
            {view === "dashboard" ? (
              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <button
                  onClick={() => {
                    resetDeadlineForm();
                    setIsModalOpen(true);
                  }}
                  className="flex-1 md:flex-none bg-red-600 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl font-black text-xs md:text-sm shadow-xl shadow-red-600/30 hover:bg-red-700 hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                >
                  <Icons.Plus /> NOVO PRAZO
                </button>
                <button
                  onClick={() => {
                    resetAdminTaskForm();
                    setIsAgendaModalOpen(true);
                  }}
                  className="flex-1 md:flex-none bg-blue-600 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl font-black text-xs md:text-sm shadow-xl shadow-blue-600/30 hover:bg-blue-700 hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                >
                  <Icons.Plus /> NOVA TAREFA
                </button>
              </div>
            ) : view === "jurisprudencia" ? (
              <button
                onClick={() => {
                  resetJurisForm();
                  setIsJurisModalOpen(true);
                }}
                className="w-full md:w-auto bg-blue-600 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl font-black text-xs md:text-sm shadow-xl shadow-blue-600/30 hover:bg-blue-700 hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
              >
                <Icons.Plus /> NOVO PRECEDENTE
              </button>
            ) : view === "agenda" ? (
              <button
                onClick={() => {
                  resetAdminTaskForm();
                  setIsAgendaModalOpen(true);
                }}
                className="w-full md:w-auto bg-blue-600 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl font-black text-xs md:text-sm shadow-xl shadow-blue-600/30 hover:bg-blue-700 hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
              >
                <Icons.Plus /> NOVA TAREFA
              </button>
            ) : view === "clients" ? (
              <button
                onClick={() => {
                  setEditingClientId(null);
                  setClientType("PJ");
                  setClientForm({
                    name: "",
                    document: "",
                    driveUrl: "",
                    tradeName: "",
                    address: "",
                    adminName: "",
                    email: "",
                    phone: "",
                  });
                  setPreferredNameSource("FANTASIA");
                  setIsClientModalOpen(true);
                }}
                className="w-full md:w-auto bg-emerald-600 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl font-black text-xs md:text-sm shadow-xl shadow-emerald-600/30 hover:bg-emerald-700 hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
              >
                <Icons.Plus /> CADASTRAR CLIENTE
              </button>
            ) : (
              <button
                onClick={() => {
                  resetDeadlineForm();
                  setIsModalOpen(true);
                }}
                className="w-full md:w-auto bg-blue-600 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl font-black text-xs md:text-sm shadow-xl shadow-blue-600/30 hover:bg-blue-700 hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
              >
                <Icons.Plus /> REGISTRAR PRAZO
              </button>
            )}
          </div>
        </header>

        {view === "dashboard" && (
          <div className="space-y-12 animate-in fade-in duration-500">
            <div className="bg-white p-8 md:p-12 rounded-[2rem] md:rounded-[4rem] shadow-2xl border border-slate-100 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-80" />
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div className="flex flex-col gap-2">
                  <h3 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-4">
                    <span className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg">
                      <Icons.Dashboard />
                    </span>
                    Cronograma Integrado
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-16">
                    {getWeekRangeLabel(dashboardCalendarDate)}
                  </p>
                </div>
                <div className="flex gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-inner">
                  <button
                    onClick={() => {
                      const newDate = new Date(dashboardCalendarDate);
                      newDate.setDate(newDate.getDate() - 7);
                      setDashboardCalendarDate(newDate);
                    }}
                    className="p-2 text-slate-400 hover:text-blue-600 transition-all bg-white rounded-lg border border-slate-100 shadow-sm shrink-0"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setDashboardCalendarDate(new Date())}
                    className="px-4 py-2 bg-white text-slate-900 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all border border-slate-100 shadow-sm"
                  >
                    Hoje
                  </button>
                  <button
                    onClick={() => {
                      const newDate = new Date(dashboardCalendarDate);
                      newDate.setDate(newDate.getDate() + 7);
                      setDashboardCalendarDate(newDate);
                    }}
                    className="p-2 text-slate-400 hover:text-blue-600 transition-all bg-white rounded-lg border border-slate-100 shadow-sm shrink-0"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {getDaysInWeek(dashboardCalendarDate).map((day) => {
                  const dayStr = formatDateToISO(day);
                  const dayDeadlines = deadlines
                    .filter((d) => d.data === dayStr)
                    .sort((a, b) =>
                      (a.hora || "00:00").localeCompare(b.hora || "00:00"),
                    );
                  const dayAdm = adminTasks
                    .filter((t) => t.date === dayStr)
                    .sort((a, b) =>
                      (a.time || "00:00").localeCompare(b.time || "00:00"),
                    );
                  const isToday = formatDateToISO(new Date()) === dayStr;

                  return (
                    <div
                      key={dayStr}
                      className={`p-5 rounded-[2rem] border transition-all flex flex-col gap-4 min-h-[300px] ${isToday ? "bg-slate-50 border-blue-200 ring-2 ring-blue-50" : "bg-white border-slate-100"}`}
                    >
                      <div className="text-center pb-3 border-b border-slate-100">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          {day.toLocaleDateString("pt-BR", {
                            weekday: "short",
                          })}
                        </p>
                        <p
                          className={`text-xl font-black ${isToday ? "text-blue-600" : "text-slate-900"}`}
                        >
                          {day.getDate()}
                        </p>
                      </div>
                      <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar">
                        {dayDeadlines.length === 0 && dayAdm.length === 0 && (
                          <div className="h-full flex items-center justify-center py-10 opacity-20">
                            <Icons.Clock />
                          </div>
                        )}
                        {dayDeadlines.map((d) => {
                          const isCompleted =
                            d.status === DeadlineStatus.COMPLETED;
                          return (
                            <div
                              key={d.id}
                              onClick={() => {
                                setSelectedAppointment({
                                  type: "deadline",
                                  data: d,
                                });
                                setIsDetailsModalOpen(true);
                              }}
                              className={`p-3 border rounded-2xl flex flex-col gap-1 cursor-pointer hover:shadow-md transition-all group relative ${isCompleted ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleStatus(d);
                                }}
                                className={`absolute top-2 right-2 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${isCompleted ? "bg-emerald-600 text-white" : "bg-white text-slate-300 hover:text-emerald-600 border border-slate-100 shadow-sm"}`}
                                title={
                                  isCompleted
                                    ? "Marcar como pendente"
                                    : "Concluir"
                                }
                              >
                                <div className="scale-75">
                                  <Icons.Check />
                                </div>
                              </button>
                              <div className="flex items-center gap-1.5">
                                <div
                                  className={`w-1 h-1 rounded-full ${isCompleted ? "bg-emerald-500" : "bg-red-500"}`}
                                />
                                <span
                                  className={`text-[7px] font-black uppercase ${isCompleted ? "text-emerald-600" : "text-red-600"}`}
                                >
                                  Processual
                                </span>
                              </div>
                              <p
                                className={`text-[10px] font-bold leading-tight uppercase line-clamp-2 ${isCompleted ? "text-emerald-900" : "text-slate-900"}`}
                              >
                                {d.peca}
                              </p>
                              <p
                                className={`text-[8px] font-black truncate ${isCompleted ? "text-emerald-400" : "text-slate-400"}`}
                              >
                                {d.empresa}
                              </p>
                            </div>
                          );
                        })}
                        {dayAdm.map((t) => {
                          const isCompleted =
                            t.status === DeadlineStatus.COMPLETED;
                          return (
                            <div
                              key={t.id}
                              onClick={() => {
                                setSelectedAppointment({
                                  type: "task",
                                  data: t,
                                });
                                setIsDetailsModalOpen(true);
                              }}
                              className={`p-3 border rounded-2xl flex flex-col gap-1 cursor-pointer hover:shadow-md transition-all group relative ${isCompleted ? "bg-emerald-50 border-emerald-100" : "bg-blue-50 border-blue-100"}`}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleAdminTaskStatus(t);
                                }}
                                className={`absolute top-2 right-2 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${isCompleted ? "bg-emerald-600 text-white" : "bg-white text-slate-300 hover:text-emerald-600 border border-slate-100 shadow-sm"}`}
                                title={
                                  isCompleted
                                    ? "Marcar como pendente"
                                    : "Concluir"
                                }
                              >
                                <div className="scale-75">
                                  <Icons.Check />
                                </div>
                              </button>
                              <div className="flex items-center gap-1.5">
                                <div
                                  className={`w-1 h-1 rounded-full ${isCompleted ? "bg-emerald-500" : "bg-blue-600"}`}
                                />
                                <span
                                  className={`text-[7px] font-black uppercase ${isCompleted ? "text-emerald-600" : "text-blue-600"}`}
                                >
                                  Administrativo
                                </span>
                              </div>
                              <p
                                className={`text-[10px] font-bold leading-tight uppercase line-clamp-2 ${isCompleted ? "text-emerald-900" : "text-slate-900"}`}
                              >
                                {t.title}
                              </p>
                              <p
                                className={`text-[8px] font-black ${isCompleted ? "text-emerald-400" : "text-slate-400"}`}
                              >
                                {t.time || "--:--"}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-12">
              <div className="lg:col-span-12 bg-[#020617] p-8 md:p-12 rounded-[2rem] md:rounded-[4rem] shadow-2xl flex flex-col items-center gap-12">
                <div className="w-full space-y-6 text-center">
                  <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">
                    Métricas de Produtividade
                  </h3>
                  <p className="text-slate-400 font-medium text-sm md:text-base leading-relaxed">
                    Produtividade mensal consolidada (Prazos e Tarefas
                    concluídas).
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
                  <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 backdrop-blur-sm">
                    <div className="flex justify-between items-center mb-8">
                      <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-3">
                        <Icons.ChartIcon /> Produtividade Anual
                      </h4>
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                        {currentMonthName}
                      </span>
                    </div>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={productivityData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.05)"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="name"
                            stroke="rgba(255,255,255,0.3)"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            stroke="rgba(255,255,255,0.3)"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#0f172a",
                              border: "none",
                              borderRadius: "12px",
                              fontSize: "10px",
                            }}
                            itemStyle={{ color: "#60a5fa" }}
                          />
                          <Bar
                            dataKey="total"
                            fill="#3b82f6"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 backdrop-blur-sm">
                    <div className="flex justify-between items-center mb-8">
                      <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-3">
                        <Icons.Users /> Produção / Advogado
                      </h4>
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                        Mês Atual
                      </span>
                    </div>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={lawyerProductivityData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.05)"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="name"
                            stroke="rgba(255,255,255,0.3)"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            stroke="rgba(255,255,255,0.3)"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#0f172a",
                              border: "none",
                              borderRadius: "12px",
                              fontSize: "10px",
                            }}
                            itemStyle={{ color: "#f59e0b" }}
                          />
                          <Bar
                            dataKey="total"
                            fill="#f59e0b"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
 
                  <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 backdrop-blur-sm">
                    <div className="flex justify-between items-center mb-8">
                      <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-3">
                        <Icons.Factory /> Top Demandantes
                      </h4>
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                        {currentMonthName}
                      </span>
                    </div>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={companyDemandData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.05)"
                            horizontal={false}
                          />
                          <XAxis type="number" hide />
                          <YAxis
                            type="category"
                            dataKey="name"
                            stroke="rgba(255,255,255,0.3)"
                            fontSize={10}
                            width={80}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#0f172a",
                              border: "none",
                              borderRadius: "12px",
                              fontSize: "10px",
                            }}
                            itemStyle={{ color: "#10b981" }}
                          />
                          <Bar
                            dataKey="total"
                            fill="#10b981"
                            radius={[0, 4, 4, 0]}
                            barSize={20}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === "clients" && (
          <div className="space-y-8 md:space-y-10 animate-in fade-in duration-500">
            <div className="bg-white p-6 md:p-10 rounded-[1.5rem] md:rounded-[3rem] shadow-2xl flex flex-col md:flex-row items-center justify-between border border-slate-100 gap-6">
              <div className="w-full md:flex-1 md:max-w-xl relative">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400">
                  <Icons.Search />
                </div>
                <input
                  type="text"
                  placeholder="Buscar cliente por nome, documento ou fantasia..."
                  className="w-full bg-slate-50 p-4 md:p-5 pl-16 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all border border-transparent"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                />
              </div>
              <div className="w-full md:w-auto text-left md:text-right md:pl-8 md:border-l border-slate-100">
                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">
                  TOTAL DE CLIENTES
                </p>
                <p className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter italic">
                  {filteredClientsList.length}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {filteredClientsList.map((client) => {
                const isLegacy = client.id.startsWith("legacy-");
                return (
                  <div
                    key={client.id}
                    onClick={() => {
                      setSelectedClientForDetails(client);
                      setIsClientDetailsModalOpen(true);
                    }}
                    className="bg-white p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col justify-between group hover:border-blue-200 transition-all cursor-pointer"
                  >
                    <div className="mb-6">
                      <div className="flex justify-between items-start mb-4">
                        <span
                          className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${client.type === "PJ" ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"}`}
                        >
                          {client.type}
                        </span>
                        <div
                          className="flex gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleEditClient(client)}
                            className="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                            title="Editar"
                          >
                            <Icons.Edit />
                          </button>
                          <button
                            onClick={() => handleDeleteClient(client)}
                            className="w-7 h-7 flex items-center justify-center bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm"
                            title="Excluir"
                          >
                            <Icons.Trash />
                          </button>
                        </div>
                      </div>
                      <h3 className="text-lg font-black text-slate-900 leading-tight uppercase mb-1 line-clamp-2">
                        {client.displayName}
                      </h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {client.document || "Sem Documento"}
                      </p>
                    </div>

                    <div
                      className="flex gap-3 pt-6 border-t border-slate-50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleOpenProcesses(client)}
                        className="flex-1 bg-[#020617] text-white py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10"
                      >
                        Processos
                      </button>
                      {client.driveUrl && (
                        <a
                          href={client.driveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all shadow-inner"
                          title="Pasta Cloud"
                        >
                          <Icons.ExternalLink />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === "deadlines" && (
          <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-500">
            <section className="bg-white rounded-[1.5rem] md:rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
              <div className="bg-blue-600 px-8 py-4 flex items-center justify-between">
                <h3 className="text-white font-black uppercase text-sm tracking-widest">
                  Prazos Pendentes
                </h3>
                <span className="bg-white/20 text-white px-3 py-1 rounded-full text-[10px] font-bold">
                  {pendingDeadlines.length}
                </span>
              </div>
              {pendingDeadlines.length > 0 ? (
                renderDeadlineList(pendingDeadlines)
              ) : (
                <div className="p-16 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                  Nenhum prazo pendente
                </div>
              )}
            </section>

            <section className="bg-white rounded-[1.5rem] md:rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
              <div className="bg-emerald-600 px-8 py-4 flex items-center justify-between">
                <h3 className="text-white font-black uppercase text-sm tracking-widest">
                  Prazos Concluídos
                </h3>
                <span className="bg-white/20 text-white px-3 py-1 rounded-full text-[10px] font-bold">
                  {completedDeadlines.length}
                </span>
              </div>
              {completedDeadlines.length > 0 ? (
                renderDeadlineList(completedDeadlines)
              ) : (
                <div className="p-16 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                  Nenhum prazo concluído
                </div>
              )}
            </section>
          </div>
        )}

        {view === "agenda" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden">
              <div className="bg-slate-900 px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <h3 className="text-white font-black uppercase text-sm tracking-widest flex items-center gap-3">
                    <Icons.Calendar />
                    <span className="md:hidden">
                      {currentCalendarDate
                        .toLocaleDateString("pt-BR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                        .toUpperCase()}
                    </span>
                    <span className="hidden md:inline">
                      {getWeekRangeLabel(currentCalendarDate)}
                    </span>
                  </h3>
                </div>
                <div className="flex gap-2 w-full md:w-auto justify-between">
                  <button
                    onClick={() => {
                      const newDate = new Date(currentCalendarDate);
                      if (window.innerWidth < 768) {
                        newDate.setDate(newDate.getDate() - 1);
                      } else {
                        newDate.setDate(newDate.getDate() - 7);
                      }
                      setCurrentCalendarDate(newDate);
                    }}
                    className="p-2 text-white/60 hover:text-white transition-all bg-white/5 rounded-lg border border-white/10 shrink-0"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setCurrentCalendarDate(new Date())}
                    className="flex-1 md:flex-none px-6 py-2 bg-white/10 text-white rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-slate-900 transition-all border border-white/10"
                  >
                    Hoje
                  </button>
                  <button
                    onClick={() => {
                      const newDate = new Date(currentCalendarDate);
                      if (window.innerWidth < 768) {
                        newDate.setDate(newDate.getDate() + 1);
                      } else {
                        newDate.setDate(newDate.getDate() + 7);
                      }
                      setCurrentCalendarDate(newDate);
                    }}
                    className="p-2 text-white/60 hover:text-white transition-all bg-white/5 rounded-lg border border-white/10 shrink-0"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-1 grid grid-cols-1 md:grid-cols-5 gap-px bg-slate-100 border-b border-slate-100">
                {["Segunda", "Terça", "Quarta", "Quinta", "Sexta"].map(
                  (day) => (
                    <div
                      key={day}
                      className="hidden md:block bg-white py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest"
                    >
                      {day}
                    </div>
                  ),
                )}
                <div className="md:hidden bg-white py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {currentCalendarDate
                    .toLocaleDateString("pt-BR", { weekday: "long" })
                    .toUpperCase()}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-px bg-slate-100">
                {getDaysInWeek(currentCalendarDate).map((day, idx) => {
                  const dayStr = formatDateToISO(day);
                  const selectedDayStr = formatDateToISO(currentCalendarDate);
                  const tasksForDay = adminTasks.filter(
                    (t) => t.date === dayStr,
                  );
                  const isToday = formatDateToISO(new Date()) === dayStr;
                  const isSelected = selectedDayStr === dayStr;

                  return (
                    <div
                      key={dayStr}
                      className={`bg-white min-h-[400px] p-4 transition-all flex flex-col gap-3 border-r border-slate-100 last:border-r-0 ${!isSelected ? "hidden md:flex" : "flex"}`}
                    >
                      <div className="flex items-center justify-between md:justify-center mb-2">
                        <span className="md:hidden text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {day.toLocaleDateString("pt-BR", {
                            weekday: "short",
                          })}
                        </span>
                        <span
                          className={`text-base font-black w-10 h-10 flex items-center justify-center rounded-full transition-all ${isToday ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" : "text-slate-400"}`}
                        >
                          {day.getDate()}
                        </span>
                      </div>

                      <div className="space-y-3 flex-1">
                        {tasksForDay.length === 0 ? (
                          <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-50 rounded-[1.5rem] p-4">
                            <span className="text-[8px] font-black text-slate-200 uppercase tracking-widest text-center">
                              Nenhum compromisso
                            </span>
                          </div>
                        ) : (
                          tasksForDay.map((task) => (
                            <div
                              key={task.id}
                              onClick={(e) => {
                                // Evitar que cliques nos botões de ação abram o modal de detalhes
                                if ((e.target as HTMLElement).closest("button"))
                                  return;
                                setSelectedAppointment({
                                  type: "task",
                                  data: task,
                                });
                                setIsDetailsModalOpen(true);
                              }}
                              className={`p-3 rounded-2xl border flex flex-col gap-2 transition-all group/task cursor-pointer ${task.status === DeadlineStatus.COMPLETED ? "bg-slate-50 opacity-50 border-slate-100" : "bg-white shadow-sm border-slate-200 hover:border-blue-400 hover:shadow-md"}`}
                            >
                              <div className="flex flex-col">
                                <span className="text-[8px] font-black text-blue-600 uppercase mb-0.5">
                                  {task.category}
                                </span>
                                <span className="text-xs font-bold text-slate-900 leading-tight uppercase line-clamp-2">
                                  {task.title}
                                </span>
                              </div>
                              <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 overflow-hidden">
                                <span className="text-[9px] font-black text-blue-600 shrink-0">
                                  {task.time || "--:--"}
                                </span>
                                <div className="flex gap-1 shrink-0">
                                  <button
                                    onClick={() => toggleAdminTaskStatus(task)}
                                    className={`p-1.5 rounded-lg transition-all ${task.status === DeadlineStatus.COMPLETED ? "text-emerald-500 bg-emerald-50" : "text-slate-400 hover:bg-emerald-50 hover:text-emerald-500 font-bold"}`}
                                    title="Concluir"
                                  >
                                    <Icons.Check />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleEditAdminTaskClick(task)
                                    }
                                    className="p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-500 rounded-lg transition-all"
                                    title="Editar"
                                  >
                                    <Icons.Edit />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (
                                        window.confirm(
                                          "Remover tarefa definitivamente?",
                                        )
                                      )
                                        deleteAdminTask(task.id);
                                    }}
                                    className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-all"
                                    title="Excluir"
                                  >
                                    <Icons.Trash />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {view === "jurisprudencia" && (
          <div className="space-y-8 md:space-y-10 animate-in fade-in duration-500">
            <div className="bg-white p-6 md:p-10 rounded-[1.5rem] md:rounded-[3rem] shadow-2xl flex flex-col md:flex-row items-center justify-between border border-slate-100 gap-6">
              <div className="w-full md:flex-1 md:max-w-xl relative">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400">
                  <Icons.Search />
                </div>
                <input
                  type="text"
                  placeholder="Filtrar precedentes..."
                  className="w-full bg-slate-50 p-4 md:p-5 pl-16 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all border border-transparent"
                  value={jurisSearch}
                  onChange={(e) => setJurisSearch(e.target.value)}
                />
              </div>
              <div className="w-full md:w-auto text-left md:text-right md:pl-8 md:border-l border-slate-100">
                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">
                  ACERVO
                </p>
                <p className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter italic">
                  {filteredJuris.length}
                </p>
              </div>
            </div>

            <div className="space-y-10">
              {(
                Object.entries(groupedJuris) as [string, Jurisprudencia[]][]
              ).map(([tema, items]) => (
                <div
                  key={tema}
                  className="bg-white p-6 md:p-10 rounded-[2.5rem] md:rounded-[4rem] shadow-2xl border border-slate-100 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-2 h-full bg-amber-500"></div>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-slate-50 pb-6 gap-4">
                    <div>
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.25em] mb-1">
                        TEMA JURÍDICO
                      </p>
                      <h3 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">
                        {tema}
                      </h3>
                    </div>
                    <span className="bg-amber-50 text-amber-600 px-4 py-2 rounded-full text-[10px] font-black shadow-sm">
                      {items.length} PRECEDENTES
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    {items.map((j) => (
                      <div
                        key={j.id}
                        className="bg-slate-50 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-transparent hover:border-blue-200 transition-all group"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-3 py-1 bg-blue-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest">
                              {j.area}
                            </span>
                            <span className="px-3 py-1 bg-slate-200 text-slate-600 rounded-lg text-[8px] font-black uppercase tracking-widest">
                              {j.orgao}
                            </span>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditJurisClick(j)}
                              className="w-8 h-8 flex items-center justify-center bg-white text-blue-500 rounded-lg shadow-sm hover:bg-blue-500 hover:text-white transition-all"
                            >
                              <Icons.Edit />
                            </button>
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    "Remover precedente definitivamente?",
                                  )
                                )
                                  deleteJuris(j.id);
                              }}
                              className="w-8 h-8 flex items-center justify-center bg-white text-red-400 rounded-lg shadow-sm hover:bg-red-400 hover:text-white transition-all"
                            >
                              <Icons.Trash />
                            </button>
                          </div>
                        </div>
                        <p className="text-slate-700 text-sm md:text-base leading-relaxed font-medium italic">
                          "{j.enunciado}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === "correspondence" && (
          <div className="space-y-8 md:space-y-10 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
              <div className="lg:col-span-4 bg-white p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl flex flex-row lg:flex-col items-center justify-around md:justify-center text-center border border-slate-100">
                <div className="flex flex-col items-center">
                  <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 md:mb-4">
                    PRÓXIMO OFÍCIO
                  </p>
                  <h3 className="text-4xl md:text-6xl font-black text-blue-600 tracking-tighter mb-0 md:mb-8">
                    {nextOficioNumber.toString().padStart(3, "0")}
                  </h3>
                </div>
                <div className="hidden lg:block w-full h-px bg-slate-100 mb-8"></div>
                <div className="flex flex-col items-center">
                  <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 md:mb-4">
                    PRÓXIMO MEMO
                  </p>
                  <h3 className="text-4xl md:text-6xl font-black text-amber-600 tracking-tighter">
                    {nextMemorandoNumber.toString().padStart(3, "0")}
                  </h3>
                </div>
              </div>
              <div className="lg:col-span-8 bg-[#020617] p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl text-white flex flex-col border border-white/5">
                <h3 className="text-xl md:text-2xl font-black mb-4 md:mb-6 uppercase tracking-tight flex items-center gap-4">
                  <Icons.Table /> Gestão de Numeração
                </h3>
                <div className="mt-auto flex gap-3 p-2 bg-white/5 rounded-2xl w-full sm:w-fit overflow-x-auto">
                  <button
                    onClick={() => setActiveCorrespondenceTab("oficio")}
                    className={`flex-1 sm:flex-none whitespace-nowrap px-6 md:px-8 py-3 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all ${activeCorrespondenceTab === "oficio" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-300"}`}
                  >
                    OFÍCIOS
                  </button>
                  <button
                    onClick={() => setActiveCorrespondenceTab("memorando")}
                    className={`flex-1 sm:flex-none whitespace-nowrap px-6 md:px-8 py-3 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all ${activeCorrespondenceTab === "memorando" ? "bg-amber-600 text-white" : "text-slate-500 hover:text-slate-300"}`}
                  >
                    MEMORANDOS
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-slate-100">
              <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-10 gap-2 md:gap-3">
                {Array.from({ length: maxOficioRange }, (_, i) => i + 1).map(
                  (num) => {
                    const currentList =
                      activeCorrespondenceTab === "oficio"
                        ? usedOficioNumbers
                        : usedMemorandoNumbers;
                    const isUsed = currentList.includes(num);
                    const isNext =
                      num ===
                      (activeCorrespondenceTab === "oficio"
                        ? nextOficioNumber
                        : nextMemorandoNumber);
                    return (
                      <button
                        key={num}
                        onClick={() =>
                          handleToggleCorrespondenceNumber(
                            num,
                            activeCorrespondenceTab,
                          )
                        }
                        className={`aspect-square flex flex-col items-center justify-center rounded-xl md:rounded-2xl font-black text-xs md:text-base transition-all border-2 ${isUsed ? "bg-red-50 border-red-100 text-red-600 shadow-inner scale-95" : isNext ? (activeCorrespondenceTab === "oficio" ? "border-blue-600 text-blue-600 bg-blue-50" : "border-amber-600 text-amber-600 bg-amber-50") + " animate-pulse" : "bg-slate-50 border-transparent text-slate-300 hover:bg-slate-100"}`}
                      >
                        {num.toString().padStart(3, "0")}
                      </button>
                    );
                  },
                )}
              </div>
            </div>
          </div>
        )}

        {view === "documents" && <DocGenerator clients={clients} />}

        {view === "reports" && (
          <div className="space-y-8 md:space-y-10 animate-in fade-in duration-500">
            <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-slate-100">
              <h3 className="text-lg md:text-xl font-black mb-6 md:mb-8 uppercase tracking-tight flex items-center gap-4">
                <Icons.Clock /> Filtros do Relatório
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">
                    Cliente
                  </label>
                  <select
                    className="w-full bg-slate-50 p-4 rounded-xl font-bold text-xs outline-none focus:ring-4 focus:ring-blue-100"
                    value={reportFilters.empresa}
                    onChange={(e) =>
                      setReportFilters((p) => ({
                        ...p,
                        empresa: e.target.value,
                      }))
                    }
                  >
                    <option value="">Todos os Clientes</option>
                    {unifiedEmpresasOptions.map((emp) => (
                      <option key={emp} value={emp}>
                        {emp}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">
                    Responsável
                  </label>
                  <select
                    className="w-full bg-slate-50 p-4 rounded-xl font-bold text-xs outline-none focus:ring-4 focus:ring-blue-100"
                    value={reportFilters.responsavel}
                    onChange={(e) =>
                      setReportFilters((p) => ({
                        ...p,
                        responsavel: e.target.value,
                      }))
                    }
                  >
                    <option value="">Todos os Advogados</option>
                    {dynamicSettings.responsaveis.map((resp) => (
                      <option key={resp} value={resp}>
                        {resp}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">
                    Início
                  </label>
                  <input
                    type="date"
                    className="w-full bg-slate-50 p-4 rounded-xl font-bold text-xs outline-none focus:ring-4 focus:ring-blue-100"
                    value={reportFilters.dataInicio}
                    onChange={(e) =>
                      setReportFilters((p) => ({
                        ...p,
                        dataInicio: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">
                    Fim
                  </label>
                  <input
                    type="date"
                    className="w-full bg-slate-50 p-4 rounded-xl font-bold text-xs outline-none focus:ring-4 focus:ring-blue-100"
                    value={reportFilters.dataFim}
                    onChange={(e) =>
                      setReportFilters((p) => ({
                        ...p,
                        dataFim: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
              <div className="p-6 md:p-10 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 bg-slate-50/50 gap-4">
                <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight">
                  Resultados ({filteredDeadlines.length})
                </h3>
                <div className="flex w-full sm:w-auto gap-3">
                  <button
                    onClick={handleExportCSV}
                    className="flex-1 sm:flex-none bg-[#10b981] text-white px-5 md:px-6 py-3 rounded-xl font-black text-[9px] md:text-[10px] uppercase shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all"
                  >
                    CSV
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="flex-1 sm:flex-none bg-[#020617] text-white px-5 md:px-6 py-3 rounded-xl font-black text-[9px] md:text-[10px] uppercase shadow-lg shadow-slate-900/20 hover:scale-105 transition-all"
                  >
                    PDF
                  </button>
                </div>
              </div>
              <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-50 custom-scrollbar">
                {filteredDeadlines.map((d) => (
                  <div
                    key={d.id}
                    className="p-5 md:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-slate-50 transition-colors gap-4"
                  >
                    <div className="flex-1 sm:pr-8">
                      <p className="text-[8px] md:text-[9px] font-black text-blue-600 uppercase mb-1 tracking-widest">
                        {d.empresa} • ADV: {d.responsavel}
                      </p>
                      <h4 className="font-bold text-slate-900 text-sm md:text-base uppercase tracking-tight">
                        {d.peca}
                      </h4>
                    </div>
                    <div className="w-full sm:w-auto flex justify-between sm:justify-end items-center gap-6 md:gap-8 border-t sm:border-t-0 pt-3 sm:pt-0">
                      <span
                        className={`text-[8px] font-black uppercase px-3 py-1.5 rounded-lg ${d.status === DeadlineStatus.COMPLETED ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                      >
                        {d.status}
                      </span>
                      <p className="font-black text-slate-900 text-base md:text-lg tracking-tighter w-24 text-right">
                        {formatLocalDate(d.data)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === "settings" && (
          <div className="space-y-12 md:space-y-16 animate-in fade-in duration-700 pb-10">
            {/* Backup e Restauração */}
            <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-sm border border-slate-100 mb-8 overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -translate-y-16 translate-x-16 opacity-50 group-hover:scale-110 transition-all"></div>

              <div className="flex items-center gap-6 mb-10 relative">
                <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                  <Icons.Sync />
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                    Segurança de Dados
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Backup e Restauração do Sistema
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 transition-all hover:bg-white hover:shadow-xl hover:-translate-y-1">
                  <h4 className="font-black text-slate-900 text-sm uppercase tracking-wider mb-4 flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    Exportar Backup
                  </h4>
                  <p className="text-slate-500 text-xs leading-relaxed mb-6">
                    Baixe uma cópia completa de todos os seus prazos, tarefas,
                    jurisprudências e configurações em formato JSON.
                  </p>
                  <button
                    onClick={handleExportBackup}
                    className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-slate-900/10"
                  >
                    Gerar Arquivo de Backup
                  </button>
                </div>

                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 transition-all hover:bg-white hover:shadow-xl hover:-translate-y-1">
                  <h4 className="font-black text-slate-900 text-sm uppercase tracking-wider mb-4 flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Restaurar Sistema
                  </h4>
                  <p className="text-slate-500 text-xs leading-relaxed mb-6">
                    Importe dados de um arquivo de backup anterior (.json).
                    Nota: Isso adicionará os registros ao banco de dados atual.
                  </p>
                  <label className="block w-full bg-blue-600 text-white p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-center cursor-pointer hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/10">
                    Selecionar Arquivo
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={handleImportBackup}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* SEÇÃO ESCRITÓRIO */}
            <section>
              <div className="flex items-center gap-4 mb-8 md:mb-10">
                <div className="w-2 h-10 bg-blue-600 rounded-full shadow-lg shadow-blue-200" />
                <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase">
                  Escritório
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl flex flex-col border border-slate-100">
                  <h3 className="text-sm md:text-base font-black mb-6 md:mb-8 flex items-center gap-3 uppercase tracking-tight">
                    Equipe
                  </h3>
                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
                    {dynamicSettings.responsaveis.map((r, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center p-3 md:p-4 bg-slate-50 rounded-xl group border border-transparent hover:border-blue-200 transition-all"
                      >
                        <span className="font-bold text-slate-700 text-[10px] md:text-[11px] uppercase">
                          {r}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleEditSetting(
                                i,
                                dynamicSettings.responsaveis,
                                "responsaveis",
                              )
                            }
                            className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-blue-500 bg-white rounded-lg shadow-sm"
                          >
                            <Icons.Edit />
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteSetting(
                                i,
                                dynamicSettings.responsaveis,
                                "responsaveis",
                              )
                            }
                            className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-red-400 bg-white rounded-lg shadow-sm"
                          >
                            <Icons.Trash />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    disabled={isSavingSettings}
                    onClick={() => {
                      const n = prompt("Nome do Advogado:");
                      if (n && n.trim() !== "")
                        updateSettings("responsaveis", [
                          ...dynamicSettings.responsaveis,
                          n.toUpperCase(),
                        ]);
                    }}
                    className="mt-6 w-full p-3 md:p-4 border-2 border-dashed border-slate-200 rounded-xl text-[8px] md:text-[9px] font-black uppercase text-slate-400 hover:bg-slate-50 hover:text-blue-600 transition-all tracking-widest"
                  >
                    + MEMBRO
                  </button>
                </div>

                <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl flex flex-col border border-slate-100">
                  <h3 className="text-sm md:text-base font-black mb-6 md:mb-8 flex items-center gap-3 uppercase tracking-tight">
                    Peças
                  </h3>
                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
                    {dynamicSettings.pecas.map((p, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center p-3 md:p-4 bg-slate-50 rounded-xl group border border-transparent hover:border-amber-200 transition-all"
                      >
                        <span className="font-bold text-slate-700 text-[10px] md:text-[11px] uppercase">
                          {p}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleEditSetting(
                                i,
                                dynamicSettings.pecas,
                                "pecas",
                              )
                            }
                            className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-blue-500 bg-white rounded-lg shadow-sm"
                          >
                            <Icons.Edit />
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteSetting(
                                i,
                                dynamicSettings.pecas,
                                "pecas",
                              )
                            }
                            className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-red-400 bg-white rounded-lg shadow-sm"
                          >
                            <Icons.Trash />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    disabled={isSavingSettings}
                    onClick={() => {
                      const n = prompt("Descrição:");
                      if (n && n.trim() !== "")
                        updateSettings("pecas", [
                          ...dynamicSettings.pecas,
                          n.toUpperCase(),
                        ]);
                    }}
                    className="mt-6 w-full p-3 md:p-4 border-2 border-dashed border-slate-200 rounded-xl text-[8px] md:text-[9px] font-black uppercase text-slate-400 hover:bg-slate-50 hover:text-amber-600 transition-all tracking-widest"
                  >
                    + TIPO
                  </button>
                </div>
              </div>
            </section>

            {/* SEÇÃO JURISPRUDÊNCIA - GESTÃO DE ITENS */}
            <section>
              <div className="flex items-center gap-4 mb-8 md:mb-10">
                <div className="w-2 h-10 bg-amber-600 rounded-full shadow-lg shadow-amber-200" />
                <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase">
                  Jurisprudência
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {/* ÁREAS */}
                <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl flex flex-col border border-slate-100">
                  <h3 className="text-sm md:text-base font-black mb-6 md:mb-8 flex items-center gap-3 uppercase tracking-tight">
                    Áreas do Direito
                  </h3>
                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
                    {dynamicSettings.areasDireito.map((a, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center p-3 md:p-4 bg-slate-50 rounded-xl group border border-transparent hover:border-amber-200 transition-all"
                      >
                        <span className="font-bold text-slate-700 text-[10px] md:text-[11px] uppercase">
                          {a}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleEditSetting(
                                i,
                                dynamicSettings.areasDireito,
                                "areasDireito",
                              )
                            }
                            className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-blue-500 bg-white rounded-lg shadow-sm"
                          >
                            <Icons.Edit />
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteSetting(
                                i,
                                dynamicSettings.areasDireito,
                                "areasDireito",
                              )
                            }
                            className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-red-400 bg-white rounded-lg shadow-sm"
                          >
                            <Icons.Trash />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    disabled={isSavingSettings}
                    onClick={() => {
                      const n = prompt("Nome da Área:");
                      if (n && n.trim() !== "")
                        updateSettings("areasDireito", [
                          ...dynamicSettings.areasDireito,
                          n,
                        ]);
                    }}
                    className="mt-6 w-full p-3 md:p-4 border-2 border-dashed border-slate-200 rounded-xl text-[8px] md:text-[9px] font-black uppercase text-slate-400 hover:bg-slate-50 hover:text-amber-600 transition-all tracking-widest"
                  >
                    + ÁREA
                  </button>
                </div>

                {/* ÓRGÃOS */}
                <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl flex flex-col border border-slate-100">
                  <h3 className="text-sm md:text-base font-black mb-6 md:mb-8 flex items-center gap-3 uppercase tracking-tight">
                    Órgãos Julgadores
                  </h3>
                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
                    {dynamicSettings.orgaosJulgadores.map((o, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center p-3 md:p-4 bg-slate-50 rounded-xl group border border-transparent hover:border-blue-200 transition-all"
                      >
                        <span className="font-bold text-slate-700 text-[10px] md:text-[11px] uppercase">
                          {o}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleEditSetting(
                                i,
                                dynamicSettings.orgaosJulgadores,
                                "orgaosJulgadores",
                              )
                            }
                            className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-blue-500 bg-white rounded-lg shadow-sm"
                          >
                            <Icons.Edit />
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteSetting(
                                i,
                                dynamicSettings.orgaosJulgadores,
                                "orgaosJulgadores",
                              )
                            }
                            className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-red-400 bg-white rounded-lg shadow-sm"
                          >
                            <Icons.Trash />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    disabled={isSavingSettings}
                    onClick={() => {
                      const n = prompt("Nome do Órgão:");
                      if (n && n.trim() !== "")
                        updateSettings("orgaosJulgadores", [
                          ...dynamicSettings.orgaosJulgadores,
                          n.toUpperCase(),
                        ]);
                    }}
                    className="mt-6 w-full p-3 md:p-4 border-2 border-dashed border-slate-200 rounded-xl text-[8px] md:text-[9px] font-black uppercase text-slate-400 hover:bg-slate-50 hover:text-blue-600 transition-all tracking-widest"
                  >
                    + ÓRGÃO
                  </button>
                </div>

                {/* TEMAS */}
                <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl flex flex-col border border-slate-100">
                  <h3 className="text-sm md:text-base font-black mb-6 md:mb-8 flex items-center gap-3 uppercase tracking-tight">
                    Temas
                  </h3>
                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
                    {dynamicSettings.temasJuris.map((t, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center p-3 md:p-4 bg-slate-50 rounded-xl group border border-transparent hover:border-emerald-200 transition-all"
                      >
                        <span className="font-bold text-slate-700 text-[10px] md:text-[11px] uppercase">
                          {t}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleEditSetting(
                                i,
                                dynamicSettings.temasJuris,
                                "temasJuris",
                              )
                            }
                            className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-blue-500 bg-white rounded-lg shadow-sm"
                          >
                            <Icons.Edit />
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteSetting(
                                i,
                                dynamicSettings.temasJuris,
                                "temasJuris",
                              )
                            }
                            className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-red-400 bg-white rounded-lg shadow-sm"
                          >
                            <Icons.Trash />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    disabled={isSavingSettings}
                    onClick={() => {
                      const n = prompt("Descrição do Tema:");
                      if (n && n.trim() !== "")
                        updateSettings("temasJuris", [
                          ...dynamicSettings.temasJuris,
                          n,
                        ]);
                    }}
                    className="mt-6 w-full p-3 md:p-4 border-2 border-dashed border-slate-200 rounded-xl text-[8px] md:text-[9px] font-black uppercase text-slate-400 hover:bg-slate-50 hover:text-emerald-600 transition-all tracking-widest"
                  >
                    + TEMA
                  </button>
                </div>
              </div>
            </section>

            {/* SEÇÃO NOTIFICAÇÕES E ALERTAS */}
            <section>
              <div className="flex items-center gap-4 mb-8 md:mb-10">
                <div className="w-2 h-10 bg-indigo-600 rounded-full shadow-lg shadow-indigo-200" />
                <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase">
                  Notificações e Alertas
                </h3>
              </div>

              <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden">
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                  <div className="xl:col-span-1 border-r border-slate-50 pr-8">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">
                      Configurações Gerais
                    </p>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                        <div>
                          <p className="text-[10px] font-black text-slate-900 uppercase">
                            Alertas no Browser
                          </p>
                          <p className="text-[8px] font-bold text-slate-400 mt-1">
                            Notificações Push
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            if (
                              !dynamicSettings.enableBrowserNotifications &&
                              "Notification" in window
                            ) {
                              Notification.requestPermission().then(
                                (permission) => {
                                  if (permission === "granted") {
                                    updateSettings(
                                      "enableBrowserNotifications",
                                      true,
                                    );
                                  } else {
                                    alert(
                                      "Permissão de notificação negada pelo navegador.",
                                    );
                                  }
                                },
                              );
                            } else {
                              updateSettings(
                                "enableBrowserNotifications",
                                !dynamicSettings.enableBrowserNotifications,
                              );
                            }
                          }}
                          className={`w-12 h-6 rounded-full transition-all relative ${dynamicSettings.enableBrowserNotifications ? "bg-blue-600" : "bg-slate-200"}`}
                        >
                          <div
                            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${dynamicSettings.enableBrowserNotifications ? "left-7" : "left-1"}`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                        <div>
                          <p className="text-[10px] font-black text-slate-900 uppercase">
                            Modo Silencioso
                          </p>
                          <p className="text-[8px] font-bold text-slate-400 mt-1">
                            Pausar alertas
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            updateSettings(
                              "quietMode",
                              !dynamicSettings.quietMode,
                            )
                          }
                          className={`w-12 h-6 rounded-full transition-all relative ${dynamicSettings.quietMode ? "bg-blue-600" : "bg-slate-200"}`}
                        >
                          <div
                            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${dynamicSettings.quietMode ? "left-7" : "left-1"}`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="xl:col-span-3">
                    <div className="flex justify-between items-center mb-6">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        Regras Personalizadas ({dynamicSettings.rules.length})
                      </p>
                      <button
                        onClick={() => {
                          setEditingRuleIndex(null);
                          setNewRule({
                            deadlineType: "ALL",
                            priority: "MÉDIA",
                            leadTimeDays: 5,
                            channels: { email: true, push: false, inApp: true },
                          });
                          setIsRuleModalOpen(true);
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
                      >
                        <Icons.Plus /> NOVA REGRA
                      </button>
                    </div>

                    {dynamicSettings.rules.length === 0 ? (
                      <div className="bg-slate-50 p-12 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-300 mb-4">
                          <Icons.Bell />
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Nenhuma regra de alerta definida
                        </p>
                        <p className="text-[10px] text-slate-400 mt-2">
                          Crie regras para receber notificações baseadas no tipo
                          de prazo
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {dynamicSettings.rules.map((rule, idx) => (
                          <div
                            key={rule.id}
                            className="p-6 bg-slate-50 rounded-3xl border border-transparent hover:border-blue-200 transition-all group relative"
                          >
                            <div className="flex justify-between items-start mb-4">
                              <span
                                className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${rule.priority === "ALTA" ? "bg-red-100 text-red-600" : rule.priority === "MÉDIA" ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"}`}
                              >
                                Prioridade {rule.priority}
                              </span>
                              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                <button
                                  onClick={() => {
                                    setEditingRuleIndex(idx);
                                    setNewRule(rule);
                                    setIsRuleModalOpen(true);
                                  }}
                                  className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-blue-500 hover:bg-blue-500 hover:text-white transition-all"
                                >
                                  <Icons.Edit />
                                </button>
                                <button
                                  onClick={() => handleDeleteRule(idx)}
                                  className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all"
                                >
                                  <Icons.Trash />
                                </button>
                              </div>
                            </div>
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-2">
                              {rule.deadlineType === "ALL"
                                ? "Todos os Prazos"
                                : rule.deadlineType}
                            </h4>
                            <div className="flex items-center gap-4 text-slate-500 mb-4">
                              <div className="flex items-center gap-1.5">
                                <Icons.Clock />
                                <span className="text-[9px] font-black uppercase">
                                  {rule.leadTimeDays} Dias de Antecedência
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2 pt-4 border-t border-white">
                              {rule.channels.email && (
                                <div
                                  className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-slate-400 shadow-sm"
                                  title="E-mail"
                                >
                                  <Icons.Mail />
                                </div>
                              )}
                              {rule.channels.push && (
                                <div
                                  className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-slate-400 shadow-sm"
                                  title="Browser Push"
                                >
                                  <Icons.Bell />
                                </div>
                              )}
                              {rule.channels.inApp && (
                                <div
                                  className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-slate-400 shadow-sm"
                                  title="Notificação no Sistema"
                                >
                                  <Icons.Dashboard />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        <Modal
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedAppointment(null);
          }}
          title={
            selectedAppointment?.type === "deadline"
              ? "Detalhes do Prazo"
              : "Detalhes do Compromisso"
          }
        >
          {selectedAppointment && (
            <div className="space-y-8">
              <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                <div
                  className={`p-4 rounded-2xl ${selectedAppointment.type === "deadline" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}
                >
                  {selectedAppointment.type === "deadline" ? (
                    <Icons.Clock />
                  ) : (
                    <Icons.Calendar />
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    {selectedAppointment.type === "deadline"
                      ? "Atividade Processual"
                      : "Atividade Administrativa"}
                  </p>
                  <h4 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">
                    {selectedAppointment.type === "deadline"
                      ? (selectedAppointment.data as Deadline).peca
                      : (selectedAppointment.data as AdminTask).title}
                  </h4>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">
                      Informações Gerais
                    </p>
                    <div className="space-y-4">
                      {selectedAppointment.type === "deadline" && (
                        <>
                          <div className="flex justify-between items-center py-2 border-b border-white">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">
                              Cliente
                            </span>
                            <span className="text-xs font-black text-slate-900">
                              {(selectedAppointment.data as Deadline).empresa}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-white">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">
                              Responsável
                            </span>
                            <span className="text-xs font-black text-slate-900">
                              {
                                (selectedAppointment.data as Deadline)
                                  .responsavel
                              }
                            </span>
                          </div>
                          {(selectedAppointment.data as Deadline)
                            .instituicao && (
                            <div className="flex justify-between items-center py-2 border-b border-white">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">
                                Órgão
                              </span>
                              <span className="text-xs font-black text-slate-900">
                                {
                                  (selectedAppointment.data as Deadline)
                                    .instituicao
                                }
                              </span>
                            </div>
                          )}
                        </>
                      )}
                      {selectedAppointment.type === "task" && (
                        <>
                          <div className="flex justify-between items-center py-2 border-b border-white">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">
                              Categoria
                            </span>
                            <span className="text-xs font-black text-blue-600">
                              {(selectedAppointment.data as AdminTask).category}
                            </span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between items-center py-2 border-b border-white">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                          Data
                        </span>
                        <span className="text-xs font-black text-slate-900">
                          {formatLocalDate(
                            selectedAppointment.type === "deadline"
                              ? (selectedAppointment.data as Deadline).data
                              : (selectedAppointment.data as AdminTask).date,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                          Horário
                        </span>
                        <span className="text-xs font-black text-slate-900">
                          {(selectedAppointment.type === "deadline"
                            ? (selectedAppointment.data as Deadline).hora
                            : (selectedAppointment.data as AdminTask).time) ||
                            "--:--"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100 flex flex-col h-full">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">
                      Assunto / Descrição
                    </p>
                    <p className="text-sm font-medium text-slate-700 leading-relaxed italic border-l-4 border-slate-200 pl-4 py-2">
                      {selectedAppointment.type === "deadline"
                        ? (selectedAppointment.data as Deadline).assunto
                        : (selectedAppointment.data as AdminTask).description ||
                          "Nenhuma descrição fornecida."}
                    </p>

                    {selectedAppointment.type === "deadline" &&
                      (selectedAppointment.data as Deadline).documentUrl && (
                        <div className="mt-auto pt-6">
                          <a
                            href={
                              (selectedAppointment.data as Deadline).documentUrl
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-3 bg-blue-600 text-white p-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition-all"
                          >
                            <Icons.ExternalLink /> ACESSAR DOCUMENTO
                          </a>
                        </div>
                      )}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => {
                    const isDeadline = selectedAppointment.type === "deadline";
                    if (isDeadline)
                      handleEditClick(selectedAppointment.data as Deadline);
                    else
                      handleEditAdminTaskClick(
                        selectedAppointment.data as AdminTask,
                      );
                    setIsDetailsModalOpen(false);
                  }}
                  className="flex-1 flex items-center justify-center gap-3 bg-slate-900 text-white p-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-sm"
                >
                  <Icons.Edit /> EDITAR
                </button>
                <button
                  onClick={() => {
                    const isDeadline = selectedAppointment.type === "deadline";
                    if (isDeadline)
                      deleteDeadline((selectedAppointment.data as Deadline).id);
                    else
                      deleteAdminTask(
                        (selectedAppointment.data as AdminTask).id,
                      );
                    setIsDetailsModalOpen(false);
                    setSelectedAppointment(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-3 bg-white text-red-600 border border-red-100 p-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm"
                >
                  <Icons.Trash /> EXCLUIR
                </button>
                <button
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    setSelectedAppointment(null);
                  }}
                  className="px-8 p-4 rounded-xl font-black text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-all"
                >
                  FECHAR
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* MODAL PARA GESTÃO DE PROCESSOS DO CLIENTE */}
        <Modal
          isOpen={isProcessModalOpen}
          onClose={() => {
            setIsProcessModalOpen(false);
            setActiveClientForProcesses(null);
            setActiveProcessForNotes(null);
          }}
          title={`Processos de ${activeClientForProcesses?.displayName}`}
        >
          <div className="space-y-10">
            {/* Formulário de Novo Processo */}
            <div className="p-6 md:p-8 bg-slate-50 rounded-3xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 ml-1">
                Vincular Novo Processo
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1">
                    Número do Processo
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 0000000-00.0000.0.00.0000"
                    className="w-full bg-white p-4 rounded-xl font-bold text-sm border border-slate-200 outline-none focus:ring-4 focus:ring-blue-100"
                    value={newProcess.number}
                    onChange={(e) =>
                      setNewProcess((p) => ({ ...p, number: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1">
                    Título/Classe
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Cobrança, Indenizatória..."
                    className="w-full bg-white p-4 rounded-xl font-bold text-sm border border-slate-200 outline-none focus:ring-4 focus:ring-blue-100"
                    value={newProcess.title}
                    onChange={(e) =>
                      setNewProcess((p) => ({ ...p, title: e.target.value }))
                    }
                  />
                </div>
              </div>
              <button
                onClick={handleAddProcess}
                disabled={!newProcess.number.trim()}
                className="w-full mt-4 bg-blue-600 text-white p-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                CADASTRAR PROCESSO
              </button>
            </div>

            {/* Listagem de Processos */}
            <div className="space-y-6">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight ml-1">
                Processos Vinculados
              </h4>
              {(activeClientForProcesses?.processes || []).length === 0 ? (
                <div className="p-10 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                    Nenhum processo cadastrado
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(activeClientForProcesses?.processes || []).map((proc) => (
                    <div
                      key={proc.id}
                      className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden transition-all hover:shadow-md"
                    >
                      <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50">
                        <div className="flex-1">
                          <p className="font-black text-blue-600 text-base md:text-lg tracking-tight uppercase">
                            {proc.number}
                          </p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {proc.title || "Sem Título"}
                          </p>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                          <button
                            onClick={() =>
                              setActiveProcessForNotes(
                                activeProcessForNotes === proc.id
                                  ? null
                                  : proc.id,
                              )
                            }
                            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${activeProcessForNotes === proc.id ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-blue-600 hover:bg-blue-50"}`}
                          >
                            {activeProcessForNotes === proc.id
                              ? "FECHAR NOTAS"
                              : `NOTAS (${(proc.notes || []).length})`}
                          </button>
                          <button
                            onClick={() => handleDeleteProcess(proc.id)}
                            className="p-2.5 bg-white border border-slate-200 text-red-500 rounded-xl hover:bg-red-50 transition-all shadow-sm"
                          >
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
                                onChange={(e) => setNewNoteText(e.target.value)}
                                onKeyDown={(e) =>
                                  e.key === "Enter" && handleAddNote(proc.id)
                                }
                              />
                              <button
                                onClick={() => handleAddNote(proc.id)}
                                disabled={!newNoteText.trim()}
                                className="bg-slate-900 text-white px-6 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-blue-600 transition-all disabled:opacity-30"
                              >
                                ADD
                              </button>
                            </div>

                            <div className="space-y-3 mt-4">
                              {(proc.notes || []).length === 0 ? (
                                <p className="text-center py-6 text-slate-300 font-bold text-[9px] uppercase tracking-[0.2em]">
                                  Sem anotações registradas
                                </p>
                              ) : (
                                (proc.notes || []).map((note) => (
                                  <div
                                    key={note.id}
                                    className="p-4 bg-slate-50 rounded-2xl flex justify-between items-start group border border-transparent hover:border-slate-200 transition-all"
                                  >
                                    <div className="flex-1 pr-6">
                                      <p className="text-slate-700 text-sm font-medium leading-relaxed">
                                        {note.text}
                                      </p>
                                      <p className="text-[8px] font-black text-slate-400 uppercase mt-2 tracking-widest">
                                        {new Date(
                                          note.createdAt,
                                        ).toLocaleString("pt-BR")}
                                      </p>
                                    </div>
                                    <button
                                      onClick={() =>
                                        handleDeleteNote(proc.id, note.id)
                                      }
                                      className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all"
                                    >
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

        {/* MODAL PARA AGENDA ADMINISTRATIVA */}
        <Modal
          isOpen={isAgendaModalOpen}
          onClose={() => {
            setIsAgendaModalOpen(false);
            resetAdminTaskForm();
          }}
          title={
            editingAdminTaskId
              ? "Editar Agendamento"
              : "Novo Agendamento Administrativo"
          }
        >
          <form onSubmit={handleAddAdminTask} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Categoria
                </label>
                <select
                  className="w-full bg-slate-50 p-3 rounded-xl font-bold text-sm border border-slate-100 focus:ring-4 focus:ring-blue-100 outline-none"
                  value={newAdminTask.category}
                  onChange={(e) =>
                    setNewAdminTask((p) => ({
                      ...p,
                      category: e.target.value as AdminTaskCategory,
                    }))
                  }
                >
                  {Object.values(AdminTaskCategory).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Título / Assunto
                </label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-50 p-3 rounded-xl font-bold text-sm border border-slate-100 focus:ring-4 focus:ring-blue-100 outline-none"
                  value={newAdminTask.title}
                  onChange={(e) =>
                    setNewAdminTask((p) => ({ ...p, title: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Descrição (Opcional)
              </label>
              <textarea
                className="w-full bg-slate-50 p-3 rounded-xl font-bold text-sm border border-slate-100 focus:ring-4 focus:ring-blue-100 outline-none min-h-[100px]"
                value={newAdminTask.description}
                onChange={(e) =>
                  setNewAdminTask((p) => ({
                    ...p,
                    description: e.target.value,
                  }))
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Data
                </label>
                <input
                  type="date"
                  required
                  className="w-full bg-slate-50 p-3 rounded-xl font-bold text-sm border border-slate-100 focus:ring-4 focus:ring-blue-100 outline-none"
                  value={newAdminTask.date}
                  onChange={(e) =>
                    setNewAdminTask((p) => ({ ...p, date: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Hora (Opcional)
                </label>
                <input
                  type="time"
                  className="w-full bg-slate-50 p-3 rounded-xl font-bold text-sm border border-slate-100 focus:ring-4 focus:ring-blue-100 outline-none"
                  value={newAdminTask.time}
                  onChange={(e) =>
                    setNewAdminTask((p) => ({ ...p, time: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Alertas (Selecione até 2)
                </label>
                <span className="text-[8px] font-bold text-slate-400 uppercase">
                  {newAdminTask.alerts?.length || 0}/2
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { value: "24H", label: "24h antes" },
                  { value: "2H", label: "2h antes" },
                  { value: "1H", label: "1h antes" },
                  { value: "ON_TIME", label: "Na hora" },
                ].map((opt) => {
                  const isSelected = newAdminTask.alerts?.includes(
                    opt.value as AdminTaskAlert,
                  );
                  const isMax =
                    !isSelected && (newAdminTask.alerts?.length || 0) >= 2;

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={isMax}
                      onClick={() => {
                        const current = newAdminTask.alerts || [];
                        if (isSelected) {
                          setNewAdminTask((p) => ({
                            ...p,
                            alerts: current.filter((a) => a !== opt.value),
                          }));
                        } else {
                          setNewAdminTask((p) => ({
                            ...p,
                            alerts: [...current, opt.value as AdminTaskAlert],
                          }));
                        }
                      }}
                      className={`p-3 rounded-xl border text-[9px] font-black uppercase transition-all flex flex-col items-center gap-1 ${isSelected ? "bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm" : "bg-slate-50 border-slate-100 text-slate-400 hover:bg-white hover:border-slate-300"} ${isMax ? "opacity-30 cursor-not-allowed" : ""}`}
                    >
                      <Icons.Bell />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-[1.02] transition-all"
            >
              {editingAdminTaskId
                ? "ATUALIZAR AGENDAMENTO"
                : "SALVAR NA AGENDA"}
            </button>
          </form>
        </Modal>

        {/* MODAL PARA VISUALIZAR DADOS COMPLETOS DO CLIENTE */}
        <Modal
          isOpen={isClientDetailsModalOpen}
          onClose={() => {
            setIsClientDetailsModalOpen(false);
            setSelectedClientForDetails(null);
          }}
          title={`Dados Completos: ${selectedClientForDetails?.displayName}`}
        >
          {selectedClientForDetails && (
            <div className="space-y-10 animate-in fade-in duration-300">
              {/* Informações Cadastrais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Informações Principais
                  </p>
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase">
                      Nome / Razão Social
                    </label>
                    <p className="font-bold text-slate-900">
                      {selectedClientForDetails.name}
                    </p>
                  </div>
                  {selectedClientForDetails.tradeName && (
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase">
                        Nome Fantasia
                      </label>
                      <p className="font-bold text-slate-900">
                        {selectedClientForDetails.tradeName}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase">
                      {selectedClientForDetails.type === "PJ" ? "CNPJ" : "CPF"}
                    </label>
                    <p className="font-bold text-slate-900">
                      {selectedClientForDetails.document}
                    </p>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Localização e Contato
                  </p>
                  {selectedClientForDetails.address && (
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase">
                        Endereço
                      </label>
                      <p className="font-bold text-slate-900 text-sm">
                        {selectedClientForDetails.address}
                      </p>
                    </div>
                  )}
                  {selectedClientForDetails.adminName && (
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase">
                        Sócio-Administrador
                      </label>
                      <p className="font-bold text-blue-600">
                        {selectedClientForDetails.adminName}
                      </p>
                    </div>
                  )}
                  {selectedClientForDetails.email && (
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase">
                        E-mail
                      </label>
                      <p className="font-bold text-slate-900 text-sm">
                        {selectedClientForDetails.email}
                      </p>
                    </div>
                  )}
                  {selectedClientForDetails.phone && (
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase">
                        Telefone
                      </label>
                      <p className="font-bold text-slate-900 text-sm">
                        {selectedClientForDetails.phone}
                      </p>
                    </div>
                  )}
                  {selectedClientForDetails.driveUrl && (
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase">
                        Pasta no Google Drive
                      </label>
                      <a
                        href={selectedClientForDetails.driveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 font-bold text-sm hover:underline mt-1"
                      >
                        <Icons.ExternalLink /> Acessar Documentos
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Processos Vinculados */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                    Processos Cadastrados
                  </h4>
                  <span className="bg-slate-900 text-white px-4 py-1 rounded-full text-[10px] font-black">
                    {(selectedClientForDetails.processes || []).length} ATIVOS
                  </span>
                </div>

                {(selectedClientForDetails.processes || []).length === 0 ? (
                  <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                      Nenhum processo vinculado a este cliente
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {(selectedClientForDetails.processes || []).map((proc) => (
                      <div
                        key={proc.id}
                        className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="font-black text-blue-600 text-lg tracking-tight uppercase">
                              {proc.number}
                            </p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {proc.title || "Sem Título"}
                            </p>
                          </div>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                            Cadastrado em:{" "}
                            {new Date(proc.createdAt).toLocaleDateString(
                              "pt-BR",
                            )}
                          </span>
                        </div>

                        {proc.notes && proc.notes.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-slate-50 space-y-3">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                              Últimas Anotações
                            </p>
                            {proc.notes.slice(0, 3).map((note) => (
                              <div
                                key={note.id}
                                className="bg-slate-50 p-3 rounded-xl"
                              >
                                <p className="text-xs text-slate-700 font-medium">
                                  {note.text}
                                </p>
                                <p className="text-[8px] font-bold text-slate-400 mt-1">
                                  {new Date(note.createdAt).toLocaleDateString(
                                    "pt-BR",
                                  )}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>

        {/* MODAL PARA CADASTRO/EDIÇÃO DE CLIENTE (HÍBRIDO PF/PJ) */}
        <Modal
          isOpen={isClientModalOpen}
          onClose={() => {
            setIsClientModalOpen(false);
            setEditingClientId(null);
            setClientForm({
              name: "",
              document: "",
              driveUrl: "",
              tradeName: "",
              address: "",
              adminName: "",
              email: "",
              phone: "",
            });
          }}
          title={
            editingClientId ? "Atualizar Cliente" : "Cadastrar Novo Cliente"
          }
        >
          <div className="space-y-6">
            <div className="flex p-1.5 bg-slate-100 rounded-2xl">
              <button
                onClick={() => {
                  setClientType("PJ");
                  setClientForm((p) => ({ ...p }));
                }}
                className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${clientType === "PJ" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400"}`}
              >
                Pessoa Jurídica
              </button>
              <button
                onClick={() => {
                  setClientType("PF");
                  setClientForm((p) => ({
                    ...p,
                    tradeName: "",
                    address: "",
                    adminName: "",
                    email: "",
                    phone: "",
                  }));
                }}
                className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${clientType === "PF" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400"}`}
              >
                Pessoa Física
              </button>
            </div>

            {clientType === "PJ" ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4">
                    Busca Automática Receita
                  </p>
                  <div className="flex gap-4">
                    <input
                      type="text"
                      placeholder="CNPJ (apenas números)"
                      className="flex-1 bg-white p-4 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-200 border border-slate-100"
                      value={clientForm.document}
                      onChange={(e) =>
                        setClientForm((p) => ({
                          ...p,
                          document: e.target.value,
                        }))
                      }
                    />
                    <button
                      onClick={handleFetchCNPJ}
                      disabled={
                        isFetchingCNPJ ||
                        (clientForm.document || "").replace(/\D/g, "")
                          .length !== 14
                      }
                      className="bg-blue-600 text-white px-8 py-4 rounded-xl font-black text-xs uppercase shadow-lg shadow-blue-500/20 hover:scale-105 transition-all disabled:opacity-50"
                    >
                      {isFetchingCNPJ ? "..." : "BUSCAR"}
                    </button>
                  </div>
                </div>

                <div className="space-y-4 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Razão Social
                    </label>
                    <input
                      type="text"
                      className="w-full bg-white p-4 rounded-xl font-bold text-sm border border-slate-100 outline-none focus:ring-4 focus:ring-blue-100"
                      value={clientForm.name}
                      onChange={(e) =>
                        setClientForm((p) => ({ ...p, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Nome Fantasia
                    </label>
                    <input
                      type="text"
                      className="w-full bg-white p-4 rounded-xl font-bold text-sm border border-slate-100 outline-none focus:ring-4 focus:ring-blue-100"
                      value={clientForm.tradeName}
                      onChange={(e) =>
                        setClientForm((p) => ({
                          ...p,
                          tradeName: e.target.value,
                        }))
                      }
                    />
                  </div>

                  {/* Seleção de Nome Preferencial */}
                  <div className="space-y-3 pt-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Nome para Exibição no Sistema
                    </label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setPreferredNameSource("RAZAO")}
                        className={`flex-1 flex flex-col items-center p-3 rounded-xl border-2 transition-all ${preferredNameSource === "RAZAO" ? "bg-blue-50 border-blue-600" : "bg-white border-slate-200 opacity-60 hover:opacity-100"}`}
                      >
                        <span className="text-[8px] font-black text-slate-400 uppercase mb-1">
                          Usar Razão Social
                        </span>
                        <span className="text-[10px] font-bold text-slate-900 truncate w-full text-center">
                          {clientForm.name || "Pendente"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreferredNameSource("FANTASIA")}
                        className={`flex-1 flex flex-col items-center p-3 rounded-xl border-2 transition-all ${preferredNameSource === "FANTASIA" ? "bg-blue-50 border-blue-600" : "bg-white border-slate-200 opacity-60 hover:opacity-100"}`}
                      >
                        <span className="text-[8px] font-black text-slate-400 uppercase mb-1">
                          Usar Nome Fantasia
                        </span>
                        <span className="text-[10px] font-bold text-slate-900 truncate w-full text-center">
                          {clientForm.tradeName ||
                            (clientForm.name ? clientForm.name : "Pendente")}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Link Google Drive
                    </label>
                    <input
                      type="url"
                      placeholder="https://drive.google.com/..."
                      className="w-full bg-white p-4 rounded-xl font-bold text-sm border border-slate-100 outline-none focus:ring-4 focus:ring-blue-100"
                      value={clientForm.driveUrl || ""}
                      onChange={(e) =>
                        setClientForm((p) => ({
                          ...p,
                          driveUrl: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Endereço
                    </label>
                    <input
                      type="text"
                      className="w-full bg-white p-4 rounded-xl font-bold text-sm border border-slate-100 outline-none focus:ring-4 focus:ring-blue-100"
                      value={clientForm.address}
                      onChange={(e) =>
                        setClientForm((p) => ({
                          ...p,
                          address: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        E-mail
                      </label>
                      <input
                        type="email"
                        className="w-full bg-white p-4 rounded-xl font-bold text-sm border border-slate-100 outline-none focus:ring-4 focus:ring-blue-100"
                        value={clientForm.email}
                        onChange={(e) =>
                          setClientForm((p) => ({
                            ...p,
                            email: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Telefone
                      </label>
                      <input
                        type="text"
                        className="w-full bg-white p-4 rounded-xl font-bold text-sm border border-slate-100 outline-none focus:ring-4 focus:ring-blue-100"
                        value={clientForm.phone}
                        onChange={(e) =>
                          setClientForm((p) => ({
                            ...p,
                            phone: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Sócio-ADM
                    </label>
                    <input
                      type="text"
                      className="w-full bg-white p-4 rounded-xl font-bold text-sm border border-slate-100 outline-none focus:ring-4 focus:ring-blue-100"
                      value={clientForm.adminName}
                      onChange={(e) =>
                        setClientForm((p) => ({
                          ...p,
                          adminName: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    placeholder="Nome do Cliente"
                    className="w-full bg-slate-50 p-4 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-emerald-100 border border-transparent"
                    value={clientForm.name}
                    onChange={(e) =>
                      setClientForm((p) => ({ ...p, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">
                    CPF
                  </label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    className="w-full bg-slate-50 p-4 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-emerald-100 border border-transparent"
                    value={clientForm.document}
                    onChange={(e) =>
                      setClientForm((p) => ({ ...p, document: e.target.value }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">
                      E-mail
                    </label>
                    <input
                      type="email"
                      placeholder="email@exemplo.com"
                      className="w-full bg-slate-50 p-4 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-emerald-100 border border-transparent"
                      value={clientForm.email}
                      onChange={(e) =>
                        setClientForm((p) => ({ ...p, email: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">
                      Telefone
                    </label>
                    <input
                      type="text"
                      placeholder="(00) 00000-0000"
                      className="w-full bg-slate-50 p-4 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-emerald-100 border border-transparent"
                      value={clientForm.phone}
                      onChange={(e) =>
                        setClientForm((p) => ({ ...p, phone: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">
                    Link Google Drive
                  </label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/..."
                    className="w-full bg-slate-50 p-4 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-emerald-100 border border-transparent"
                    value={clientForm.driveUrl || ""}
                    onChange={(e) =>
                      setClientForm((p) => ({ ...p, driveUrl: e.target.value }))
                    }
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleSaveClient}
              disabled={!clientForm.name?.trim()}
              className={`w-full p-6 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl disabled:opacity-50 mt-4 ${clientType === "PJ" ? "bg-slate-900 hover:bg-blue-600 text-white" : "bg-slate-900 hover:bg-emerald-600 text-white"}`}
            >
              {editingClientId ? "SALVAR ATUALIZAÇÕES" : "FINALIZAR CADASTRO"}
            </button>
          </div>
        </Modal>

        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            resetDeadlineForm();
          }}
          title={editingDeadlineId ? "Editar Registro" : "Registrar Prazo"}
        >
          <form
            onSubmit={handleAddDeadline}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8"
          >
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">
                Tipo de Peça
              </label>
              <select
                className="w-full bg-slate-50 p-4 md:p-5 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-blue-100 outline-none"
                value={newDeadline.peca}
                onChange={(e) =>
                  setNewDeadline((p) => ({ ...p, peca: e.target.value }))
                }
                required
              >
                <option value="">Selecione...</option>
                {[...dynamicSettings.pecas]
                  .sort((a, b) => a.localeCompare(b, "pt-BR"))
                  .map((p) => (
                    <option key={p} value={p.toUpperCase()}>
                      {p.toUpperCase()}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">
                Cliente
              </label>
              <select
                className="w-full bg-slate-50 p-4 md:p-5 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-blue-100 outline-none"
                value={newDeadline.empresa}
                onChange={(e) =>
                  setNewDeadline((p) => ({ ...p, empresa: e.target.value }))
                }
                required
              >
                <option value="">Selecione...</option>
                {unifiedEmpresasOptions.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">
                Data do Prazo
              </label>
              <input
                type="date"
                className="w-full bg-slate-50 p-4 md:p-5 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-blue-100 outline-none"
                value={newDeadline.data}
                onChange={(e) =>
                  setNewDeadline((p) => ({ ...p, data: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">
                Hora do Prazo
              </label>
              <input
                type="time"
                className="w-full bg-slate-50 p-4 md:p-5 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-blue-100 outline-none"
                value={newDeadline.hora || ""}
                onChange={(e) =>
                  setNewDeadline((p) => ({ ...p, hora: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">
                Responsável
              </label>
              <select
                className="w-full bg-slate-50 p-4 md:p-5 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-blue-100 outline-none"
                value={newDeadline.responsavel}
                onChange={(e) =>
                  setNewDeadline((p) => ({ ...p, responsavel: e.target.value }))
                }
                required
              >
                <option value="">Selecione...</option>
                {dynamicSettings.responsaveis.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">
                Órgão/Instituição
              </label>
              <input
                type="text"
                className="w-full bg-slate-50 p-4 md:p-5 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-blue-100 outline-none"
                value={newDeadline.instituicao || ""}
                onChange={(e) =>
                  setNewDeadline((p) => ({ ...p, instituicao: e.target.value }))
                }
                placeholder="Ex: TJSP, STJ, Receita Federal..."
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">
                Link do Documento (Drive)
              </label>
              <input
                type="url"
                className="w-full bg-slate-50 p-4 md:p-5 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-blue-100 outline-none"
                value={newDeadline.documentUrl || ""}
                onChange={(e) =>
                  setNewDeadline((p) => ({ ...p, documentUrl: e.target.value }))
                }
                placeholder="https://drive.google.com/..."
              />
            </div>
            <div className="md:col-span-2 space-y-4">
              <div className="flex justify-between items-center px-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Descrição da Atividade
                </label>
                <button
                  type="button"
                  disabled={
                    isSuggesting || !newDeadline.peca || !newDeadline.empresa
                  }
                  onClick={async () => {
                    setIsSuggesting(true);
                    const suggestion = await suggestActionObject(
                      newDeadline.peca!,
                      newDeadline.empresa!,
                    );
                    setNewDeadline((prev) => ({
                      ...prev,
                      assunto: suggestion,
                    }));
                    setIsSuggesting(false);
                  }}
                  className="text-[9px] font-black uppercase px-4 md:px-6 py-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                >
                  <Icons.Sparkles /> {isSuggesting ? "..." : "Sugestão IA"}
                </button>
              </div>
              <textarea
                className="w-full bg-slate-50 p-6 md:p-8 rounded-2xl md:rounded-3xl font-medium text-sm min-h-[100px] md:min-h-[120px] focus:ring-4 focus:ring-blue-100 outline-none"
                placeholder="Detalhes operacionais sobre a tarefa..."
                value={newDeadline.assunto}
                onChange={(e) =>
                  setNewDeadline((p) => ({ ...p, assunto: e.target.value }))
                }
                required
              />
            </div>
            <button
              type="submit"
              className="md:col-span-2 bg-slate-900 text-white p-5 md:p-6 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-600 transition-all shadow-xl active:scale-95"
            >
              {editingDeadlineId ? "Salvar Alterações" : "Confirmar Registro"}
            </button>
          </form>
        </Modal>

        <Modal
          isOpen={isJurisModalOpen}
          onClose={() => {
            setIsJurisModalOpen(false);
            resetJurisForm();
          }}
          title={
            editingJurisId ? "Editar Jurisprudência" : "Nova Jurisprudência"
          }
        >
          <form
            onSubmit={handleAddJuris}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8"
          >
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-3">
                Área
              </label>
              <select
                className="w-full bg-slate-50 p-4 md:p-5 rounded-2xl font-bold text-sm outline-none"
                value={newJuris.area}
                onChange={(e) =>
                  setNewJuris((p) => ({ ...p, area: e.target.value }))
                }
                required
              >
                <option value="">Selecione...</option>
                {dynamicSettings.areasDireito.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-3">
                Órgão
              </label>
              <select
                className="w-full bg-slate-50 p-4 md:p-5 rounded-2xl font-bold text-sm outline-none"
                value={newJuris.orgao}
                onChange={(e) =>
                  setNewJuris((p) => ({ ...p, orgao: e.target.value }))
                }
                required
              >
                <option value="">Selecione...</option>
                {dynamicSettings.orgaosJulgadores.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-3">
                Tema
              </label>
              <select
                className="w-full bg-slate-50 p-4 md:p-5 rounded-2xl font-bold text-sm outline-none"
                value={newJuris.tema}
                onChange={(e) =>
                  setNewJuris((p) => ({ ...p, tema: e.target.value }))
                }
                required
              >
                <option value="">Selecione...</option>
                {dynamicSettings.temasJuris.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-3">
                Enunciado
              </label>
              <textarea
                className="w-full bg-slate-50 p-6 md:p-8 rounded-2xl md:rounded-3xl font-medium text-sm min-h-[150px] md:min-h-[200px] outline-none"
                placeholder="Texto completo..."
                value={newJuris.enunciado}
                onChange={(e) =>
                  setNewJuris((p) => ({ ...p, enunciado: e.target.value }))
                }
                required
              />
            </div>
            <button
              type="submit"
              className="md:col-span-2 bg-slate-900 text-white p-5 md:p-6 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-600 transition-all shadow-xl active:scale-95"
            >
              {editingJurisId
                ? "Atualizar Precedente"
                : "Salvar Jurisprudência"}
            </button>
          </form>
        </Modal>

        <Modal
          isOpen={isRuleModalOpen}
          onClose={() => {
            setIsRuleModalOpen(false);
            setEditingRuleIndex(null);
          }}
          title={
            editingRuleIndex !== null
              ? "Editar Alerta"
              : "Configurar Novo Alerta"
          }
        >
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">
                  Tipo de Prazo
                </label>
                <select
                  className="w-full bg-slate-50 p-4 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100"
                  value={newRule.deadlineType}
                  onChange={(e) =>
                    setNewRule((p) => ({ ...p, deadlineType: e.target.value }))
                  }
                >
                  <option value="ALL">TODOS OS PRAZOS</option>
                  {/* Opções de Peça ordenadas e em maiúsculo */}
                  {[...dynamicSettings.pecas]
                    .sort((a, b) => a.localeCompare(b, "pt-BR"))
                    .map((p) => (
                      <option key={p} value={p.toUpperCase()}>
                        {p.toUpperCase()}
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">
                  Prioridade
                </label>
                <div className="flex gap-2">
                  {["ALTA", "MÉDIA", "BAIXA"].map((p) => (
                    <button
                      key={p}
                      onClick={() =>
                        setNewRule((prev) => ({ ...prev, priority: p as any }))
                      }
                      className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all shadow-sm ${newRule.priority === p ? (p === "ALTA" ? "bg-red-600 text-white shadow-red-200" : p === "MÉDIA" ? "bg-amber-500 text-white shadow-amber-200" : "bg-blue-600 text-white shadow-blue-200") : "bg-slate-50 text-slate-400 hover:bg-slate-100"}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">
                  Antecedência (Dias)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  className="w-full bg-slate-50 p-4 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100"
                  value={newRule.leadTimeDays}
                  onChange={(e) =>
                    setNewRule((p) => ({
                      ...p,
                      leadTimeDays: parseInt(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">
                  Canais de Alerta
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() =>
                      setNewRule((p) => ({
                        ...p,
                        channels: { ...p.channels!, email: !p.channels!.email },
                      }))
                    }
                    className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-1 ${newRule.channels?.email ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-white border-slate-100 text-slate-300"}`}
                  >
                    <Icons.Mail />
                    <span className="text-[7px] font-black uppercase text-center">
                      E-mail
                    </span>
                  </button>
                  <button
                    onClick={() =>
                      setNewRule((p) => ({
                        ...p,
                        channels: { ...p.channels!, push: !p.channels!.push },
                      }))
                    }
                    className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-1 ${newRule.channels?.push ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-white border-slate-100 text-slate-300"}`}
                  >
                    <Icons.Bell />
                    <span className="text-[7px] font-black uppercase text-center">
                      Push
                    </span>
                  </button>
                  <button
                    onClick={() =>
                      setNewRule((p) => ({
                        ...p,
                        channels: { ...p.channels!, inApp: !p.channels!.inApp },
                      }))
                    }
                    className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-1 ${newRule.channels?.inApp ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-white border-slate-100 text-slate-300"}`}
                  >
                    <Icons.Dashboard />
                    <span className="text-[7px] font-black uppercase text-center">
                      In-App
                    </span>
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={handleSaveRule}
              className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl active:scale-95"
            >
              {editingRuleIndex !== null
                ? "Atualizar Regra de Alerta"
                : "Ativar Regra de Alerta"}
            </button>
          </div>
        </Modal>
      </main>
    </div>
  );
}
