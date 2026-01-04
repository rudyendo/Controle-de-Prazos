
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
  instituicao: string;
  assunto: string;
  data: string;
  hora: string;
  status: DeadlineStatus;
  createdAt: string;
  documentUrl?: string;
}

export interface NotificationSettings {
  greenAlertDays: number;
  yellowAlertDays: number; // Geralmente 1 (amanhã)
  enableBrowserNotifications: boolean;
  notificationFrequency: 'always' | 'daily' | 'hourly';
  quietMode: boolean;
  responsaveis: string[];
  pecas: string[];
  empresas: string[];
}

export interface ReportStats {
  total: number;
  concluidos: number;
  pendentes: number;
  atrasados: number;
}
