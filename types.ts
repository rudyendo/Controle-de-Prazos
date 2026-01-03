
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
}

export interface NotificationSettings {
  greenAlertDays: number;
  enableBrowserNotifications: boolean;
  quietMode: boolean;
  spreadsheetId?: string; // ID da planilha do Google
  lastSync?: string;      // Data da última sincronização
  responsaveis: string[]; // Lista dinâmica de responsáveis
  pecas: string[];        // Lista dinâmica de tipos de peças
  empresas: string[];     // Lista dinâmica de empresas/clientes
}

export interface ReportStats {
  total: number;
  concluidos: number;
  pendentes: number;
  atrasados: number;
}
