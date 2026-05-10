
export enum DeadlineStatus {
  PENDING = 'PENDENTE',
  COMPLETED = 'CONCLUÍDO',
  OVERDUE = 'ATRASADO'
}

export interface ProcessNote {
  id: string;
  text: string;
  createdAt: string;
}

export interface ClientProcess {
  id: string;
  number: string; // Número do processo
  title: string; // Título ou Classe
  notes: ProcessNote[];
  createdAt: string;
}

export interface Client {
  id: string;
  type: 'PF' | 'PJ';
  name: string; // Nome ou Razão Social
  displayName: string; // Nome amigável para exibição
  document: string; // CPF ou CNPJ
  driveUrl?: string; // Opcional
  // Detalhes extras para PJ
  tradeName?: string;
  address?: string;
  adminName?: string;
  email?: string;
  phone?: string;
  processes?: ClientProcess[];
  createdAt: string;
}

export interface Deadline {
  id: string;
  peca: string;
  responsavel: string;
  empresa: string;
  instituicao?: string;
  assunto: string;
  data: string;
  hora?: string;
  status: DeadlineStatus;
  createdAt: string;
  documentUrl?: string;
  userId?: string;
}

export interface Jurisprudencia {
  id: string;
  area: string;
  tema: string;
  orgao: string;
  enunciado: string;
  userId: string;
  createdAt: string;
}

export enum AdminTaskCategory {
  MEETING = 'REUNIÃO',
  DISPATCH = 'DESPACHO COM JUIZ',
  EMAIL = 'ENVIAR E-MAIL',
  CALL = 'LIGAÇÃO',
  DOC_COLLECTION = 'COBRANÇA DE DOCUMENTOS',
  OTHER = 'OUTROS'
}

export type AdminTaskAlert = '24H' | '2H' | '1H' | 'ON_TIME';

export interface AdminTask {
  id: string;
  category: AdminTaskCategory;
  title: string;
  description?: string;
  date: string;
  time?: string;
  status: DeadlineStatus;
  userId: string;
  createdAt: string;
  updatedAt?: string;
  alerts?: AdminTaskAlert[];
}

export interface NotificationRule {
  id: string;
  deadlineType: string; // Corresponds to 'peca' or 'ALL'
  priority: 'ALTA' | 'MÉDIA' | 'BAIXA';
  leadTimeDays: number;
  channels: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
}

export interface NotificationSettings {
  greenAlertDays: number;
  yellowAlertDays: number;
  enableBrowserNotifications: boolean;
  notificationFrequency: 'always' | 'daily' | 'hourly';
  quietMode: boolean;
  responsaveis: string[];
  pecas: string[];
  empresas: string[]; // Mantido para compatibilidade de nomes simples
  clients?: Client[]; // Novo campo para objetos complexos
  areasDireito: string[];
  orgaosJulgadores: string[];
  temasJuris: string[];
  firebaseConfig?: any;
  rules: NotificationRule[];
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}
