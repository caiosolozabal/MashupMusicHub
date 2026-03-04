
import type { UserRole } from '@/context/AuthContext';
import type { Timestamp } from 'firebase/firestore';

export interface UserDetails {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
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

// --- GUEST LIST MODULE TYPES ---

export interface GuestEvent {
  id: string;
  name: string;
  date: Timestamp;
  location: string;
  mediaUrl?: string | null;
  backgroundUrl?: string | null;
  promoText?: string | null;
  curfewAt?: Timestamp | null;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface GuestList {
  id: string;
  eventId: string;
  name: string;
  slug: string;
  capacity?: number | null;
  statsToken: string;
  customMediaUrl?: string | null;
  customPromoText?: string | null;
  submissionCount: number;
}

export interface GuestSubmission {
  id: string;
  eventId: string;
  listId: string;
  contactId?: string | null;
  name: string;
  whatsapp?: string | null;
  instagram?: string | null;
  email?: string | null;
  submittedAt: Timestamp;
}

export interface Contact {
  id: string; // UUID
  name: string;
  whatsapp?: string | null;
  instagram?: string | null;
  email?: string | null;
  tags?: string[];
  lastActivity: Timestamp;
  attendanceCount: number;
  updatedAt?: Timestamp;
}

export interface UrlSlug {
  type: 'list';
  eventId: string;
  listId: string;
}

// --- EXISTING TYPES ---

export interface AgencyAccount {
  id: string;
  accountName: string;
  bankName: string;
  agencyNumber?: string | null;
  accountNumber?: string | null;
  accountType: 'corrente' | 'poupanca' | 'pj' | 'pix' | 'outra';
  pixKey?: string | null;
  notes?: string | null;
  createdAt?: any;
  updatedAt?: any;
}

export interface EventFile {
  id: string;
  name: string;
  url: string;
  type: 'contract' | 'payment_proof_client' | 'dj_receipt' | 'other';
  uploadedAt: Date;
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
  payment_proofs?: EventFile[] | null;
  created_by: string;
  created_at: Date;
  updated_at?: Date;
  files?: EventFile[] | null;
  settlementId?: string | null;
  linkedEventId?: string | null;
  linkedEventName?: string | null;
  notes?: string | null;
}

export interface FinancialSettlement {
  id: string;
  djId: string;
  djName: string;
  djDetails: {
    bankName?: string | null;
    bankAgency?: string | null;
    bankAccount?: string | null;
    bankAccountType?: 'corrente' | 'poupanca' | null;
    bankDocument?: string | null;
    pixKey?: string | null;
  };
  periodStart?: Timestamp | null;
  periodEnd?: Timestamp | null;
  events: string[];
  summary: {
      totalEvents: number;
      grossRevenue: number;
      djNetEntitlement: number;
      totalReceivedByDj: number;
      finalBalance: number;
      finalPaidValue: number;
      deltaValue: number;
  };
  notes?: string | null;
  status: 'pending' | 'paid' | 'disputed';
  generatedAt: Timestamp;
  generatedBy: string;
  generatedByName?: string | null;
  paidAt?: Timestamp | null;
  paymentProofUrl?: string | null;
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

export interface AppConfig {
  logoUrl?: string | null;
  pixKey?: string | null;
  companyName?: string | null;
  rentalTerms?: string | null;
}

export interface RentalItem {
  id: string;
  name: string;
  category: string;
  photoUrl?: string | null;
  description?: string | null;
  basePrice: number;
  tags?: string[];
  soundScore?: number | null;
  recommendedPeople?: number | null;
  isActive: boolean;
  stockQty?: number | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface RentalQuoteItem {
  itemId: string;
  nameSnapshot: string;
  categorySnapshot?: string;
  photoUrlSnapshot?: string | null;
  qty: number;
  basePriceSnapshot: number;
  unitPrice: number;
  lineTotal: number;
}

export type RentalQuoteStatus = 'draft' | 'sent' | 'approved' | 'cancelled';

export interface RentalQuote {
  id: string;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: RentalQuoteStatus;
  clientName: string;
  clientContact?: string | null;
  eventName?: string | null;
  eventDate?: Timestamp | null;
  eventLocation?: string | null;
  kitName?: string | null;
  items: RentalQuoteItem[];
  fees: {
    frete: number;
    montagem: number;
    outros: number;
  };
  discount: number;
  totals: {
    itemsSubtotal: number;
    feesTotal: number;
    discountTotal: number;
    grandTotal: number;
  };
  capacitySummary?: string | null;
  notes?: string | null;
}
