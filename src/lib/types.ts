
import type { UserRole } from '@/context/AuthContext';
import type { Timestamp } from 'firebase/firestore';

// UserDetails structure, to be refined
export interface UserDetails {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  dj_percentual?: number | null; // DJ's individual commission percentage (e.g., 0.7 for 70%)
  rental_percentual?: number | null; // DJ's equipment rental commission percentage
  dj_color?: string | null; // Hex color code for the DJ (e.g., #ff0000)
  pode_locar?: boolean | null; // Can this user create rental events?
  // Bank details for DJs
  bankName?: string | null;
  bankAgency?: string | null;
  bankAccount?: string | null;
  bankAccountType?: 'corrente' | 'poupanca' | null;
  bankDocument?: string | null; // CPF or CNPJ
  pixKey?: string | null; // PIX Key

  createdAt?: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
}

export interface AgencyAccount {
  id: string;
  accountName: string; // e.g., "Conta Principal Bradesco", "Conta Inter Lucas"
  bankName: string;
  agencyNumber?: string | null;
  accountNumber?: string | null;
  accountType: 'corrente' | 'poupanca' | 'pj' | 'pix' | 'outra';
  pixKey?: string | null; // PIX Key for the agency account
  notes?: string | null;
  createdAt?: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
}


export interface EventFile {
  id: string; // Can be file name or a generated ID
  name: string;
  url: string; // Firebase Storage URL
  type: 'contract' | 'payment_proof_client' | 'dj_receipt' | 'other';
  uploadedAt: Date; // Consider storing as Timestamp or ISO string in Firestore
}

export interface Event {
  id: string;
  data_evento: Date; // Stored as Firestore Timestamp, converted to Date on client
  horario_inicio?: string | null;
  horario_fim?: string | null;
  dia_da_semana: string;
  nome_evento: string;
  local: string;
  contratante_nome: string;
  contratante_contato?: string | null;
  valor_total: number;
  valor_sinal: number;
  conta_que_recebeu: 'agencia' | 'dj'; // This might later reference an AgencyAccount.id
  status_pagamento: 'pendente' | 'parcial' | 'pago' | 'vencido' | 'cancelado';
  tipo_servico: 'servico_dj' | 'locacao_equipamento'; // New field for service type
  dj_id: string;
  dj_nome: string;
  dj_costs?: number | null; // Custos adicionais do DJ para este evento
  payment_proofs?: EventFile[] | null; // Comprovantes de pagamento enviados pelo DJ
  created_by: string; // UID of user who created event
  created_at: Date; // Stored as Firestore Timestamp
  updated_at?: Date; // Stored as Firestore Timestamp
  files?: EventFile[] | null; // Outros arquivos gerais do evento
  settlementId?: string | null; // ID do fechamento ao qual este evento pertence
  linkedEventId?: string | null; // ID of a linked event (e.g., linking a DJ service with a rental)
  linkedEventName?: string | null; // Name of the linked event, for display purposes
  notes?: string | null; // General notes about the event
}

export interface SettlementEvent {
    id: string;
    data_evento: Date;
    nome_evento: string;
    contratante_nome: string;
    local: string;
    valor_total: number;
    conta_que_recebeu: 'agencia' | 'dj';
    status_pagamento: 'pendente' | 'parcial' | 'pago' | 'vencido' | 'cancelado';
}

// Represents a periodic financial closing for a DJ
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
  periodStart: Date | Timestamp;
  periodEnd: Date | Timestamp;
  events: Event[]; // Array of event objects included in this settlement
  summary: {
      totalEvents: number;
      grossRevenueInPeriod: number;
      djNetEntitlementInPeriod: number;
      totalReceivedByDjInPeriod: number;
      djFinalBalanceInPeriod: number;
  };
  status: 'pending' | 'paid' | 'disputed';
  generatedAt: Date | Timestamp;
  generatedBy: string; // UID of admin/partner
  paidAt?: Date | Timestamp | null;
  paymentProofUrl?: string | null;
}


export interface FinancialTransaction {
  id:string;
  eventId?: string; // Optional, if transaction is linked to a specific event
  settlementId?: string; // Optional, if part of a settlement
  djId: string;
  amount: number; // Positive for payments to DJ/Agency, can be negative for clawbacks if needed
  currency: string; // e.g., "BRL"
  type:
    | 'dj_commission_payout' // Agency pays DJ their cut
    | 'agency_fee_collection' // Agency collects its cut from DJ
    | 'client_payment_to_dj' // Record of client paying DJ directly
    | 'client_payment_to_agency' // Record of client paying agency
    | 'expense_reimbursement'; // Other types as needed
  description: string;
  transactionDate: Date;
  proofUrl?: string; // Link to Firebase Storage for payment slip
  createdBy: string; // UID of user who recorded this transaction
  createdAt: Date;
}


export interface GuestList {
  id: string;
  eventId: string;
  promoterId?: string; // UID of promoter/birthday person
  name:string; // List name, e.g., "John's Birthday List"
  guests: Guest[];
}

export interface Guest {
  id: string; // or use array index if not needing unique ID before adding
  name: string;
  value: number; // Price
  type: 'standard' | 'vip' | 'courtesy';
  checkInTime?: Date; // or Timestamp
  checkedInBy?: string; // UID of lister
  addedAt: Date; // or Timestamp
}

// Add other types as needed
