
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
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}
