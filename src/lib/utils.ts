import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Event, UserDetails, FinancialSettlement } from './types';
import { isBefore, subDays, startOfDay } from 'date-fns';


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const pastelColors = [
  'hsl(38, 100%, 80%)', // Light Orange
  'hsl(60, 100%, 80%)', // Light Yellow
  'hsl(90, 100%, 85%)', // Light Green
  'hsl(160, 100%, 80%)', // Light Mint
  'hsl(195, 100%, 80%)', // Light Blue
  'hsl(260, 100%, 85%)', // Light Indigo
  'hsl(300, 100%, 85%)', // Light Purple
  'hsl(340, 100%, 85%)', // Light Pink
  'hsl(0, 90%, 85%)',   // Light Salmon
  'hsl(210, 90%, 85%)'  // Light Steel Blue
];


export function generateRandomPastelColor(): string {
  const randomIndex = Math.floor(Math.random() * pastelColors.length);
  return pastelColors[randomIndex];
}

/**
 * Define o estado operacional de um evento baseado em tempo, pagamento e settlement.
 */
export type EventOperationalState = 'active' | 'closed' | 'overdue' | 'cancelled';

export function getEventOperationalState(
  event: Event, 
  settlement?: FinancialSettlement | null
): EventOperationalState {
  if (event.status_pagamento === 'cancelado') return 'cancelled';

  const now = new Date();
  const thresholdDate = startOfDay(subDays(now, 1)); // Margem D+1
  const eventDate = event.data_evento;

  const isPast = isBefore(eventDate, thresholdDate);
  const isClientPaid = event.status_pagamento === 'pago';
  const isSettlementPaid = settlement?.status === 'paid';

  // ENCERRADO: Passado + Pago pelo cliente + Pago ao DJ (via settlement)
  if (isPast && isClientPaid && isSettlementPaid) {
    return 'closed';
  }

  // EM ATRASO: Passado + Cliente não pagou integralmente
  if (isPast && !isClientPaid) {
    return 'overdue';
  }

  // ATIVO: Qualquer outra condição (incluindo futuros ou passados com settlement pendente)
  return 'active';
}


export const calculateDjCut = (event: Event, dj: UserDetails | undefined): number => {
    if (event.status_pagamento === 'cancelado' || !dj) {
      return 0;
    }

    let applicablePercent: number | null | undefined;

    if (event.tipo_servico === 'locacao_equipamento') {
      applicablePercent = dj.rental_percentual;
    } else { 
      applicablePercent = dj.dj_percentual;
    }

    if (typeof applicablePercent !== 'number' || applicablePercent < 0 || applicablePercent > 1) {
       return (event.dj_costs || 0);
    }

    const baseValue = event.valor_total - (event.dj_costs || 0);
    const finalCut = (baseValue * applicablePercent) + (event.dj_costs || 0);
    
    return finalCut;
};
