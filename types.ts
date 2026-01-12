
export enum DeadlineStatus {
  PENDING = 'PENDENTE',
  COMPLETED = 'CONCLUÍDO',
  OVERDUE = 'ATRASADO'
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
  userId?: string; // Para filtrar dados por usuário na nuvem
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
  empresas: string[];
  areasDireito: string[];
  orgaosJulgadores: string[];
  temasJuris: string[];
  firebaseConfig?: any; // Configuração dinâmica do usuário
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}