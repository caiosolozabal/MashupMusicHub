import type { UserRole } from '@/context/AuthContext';
import type { Timestamp } from 'firebase/firestore';

export interface UserDetails {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  professionalType?: string | null;
  dj_percentual?: number | null;
  rental_percentual?: number | null;
  dj_color?: string | null;
  pode_locar?: boolean | null;
  bankName?: string | null;
  bankAgency?: string | null;
  bankAccount?: string | null;
  bankAccountType?: 'corrente' | 'poupanca' | null;
  bankDocument?: string | null;
  pixKey?: string | null;

  createdAt?: any;
  updatedAt?: any;
}

export interface Event {
  id: string;
  path: string;
  data_evento: Date;
  horario_inicio?: string | null;
  horario_fim?: string | null;
  dia_da_semana: string;
  nome_evento: string;
  local: string;
  contratante_nome: string;
  contratante_contato?: string | null;
  valor_total: number;
  valor_sinal: number;
  conta_que_recebeu: 'agencia' | 'dj';
  status_pagamento: 'pendente' | 'parcial' | 'pago' | 'vencido' | 'cancelado';
  tipo_servico: 'servico_dj' | 'locacao_equipamento';
  dj_id: string;
  dj_nome: string;
  dj_costs?: number | null;
  payment_proofs?: any[] | null;
  created_by: string;
  created_at: Date;
  updated_at?: Date;
  settlementId?: string | null;
  linkedEventId?: string | null;
  linkedEventName?: string | null;
  notes?: string | null;
}

export type TaskStatus =
  | "pending_acceptance"
  | "pending"
  | "doing"
  | "completed"
  | "declined"
  | "canceled";

export type TaskPriority = "low" | "medium" | "high";
export type TaskCategory = "operational" | "financial" | "meeting" | "equipment" | "other";

export type Task = {
  id: string;
  title: string;
  description?: string;
  ownerUid: string;
  createdByUid: string;
  assignedToUids?: string[];
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  dueDate: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp | null;
  completedByUid?: string | null;
  completionStatus?: "completed" | "not_completed" | null;
  completionNote?: string | null;
  linkedEventId?: string | null;
  notes?: string | null;
};
