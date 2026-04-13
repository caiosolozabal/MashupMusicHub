import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Event, UserDetails, FinancialSettlement } from './types';
import { isBefore, subDays, startOfDay } from 'date-fns';


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const pastelColors = [
  'hsl(38, 100%, 80%)', // Light Orange
  'hsl(60, 100%, 80%)', // Light Yellow
  'hsl(90, 100%, 85%)', // Light Green
  'hsl(160, 100%, 80%)', // Light Mint
  'hsl(195, 100%, 80%)', // Light Blue
  'hsl(260, 100%, 85%)', // Light Indigo
  'hsl(300, 100%, 85%)', // Light Purple
  'hsl(340, 100%, 85%)', // Light Pink
  'hsl(0, 90%, 85%)',   // Light Salmon
  'hsl(210, 90%, 85%)',  // Light Steel Blue
  'hsl(45, 100%, 85%)',  // Champagne
  'hsl(120, 100%, 90%)', // Tea Green
  'hsl(180, 100%, 85%)', // Pale Turquoise
  'hsl(280, 100%, 90%)', // Mauve
  'hsl(25, 100%, 85%)',  // Apricot
  'hsl(200, 100%, 90%)', // Sky Blue
  'hsl(150, 100%, 90%)', // Aquamarine
  'hsl(330, 100%, 90%)', // Fairy Pink
  'hsl(10, 100%, 90%)',  // Misty Rose
  'hsl(220, 100%, 90%)'  // Powder Blue
];


export function generateRandomPastelColor(): string {
  const randomIndex = Math.floor(Math.random() * pastelColors.length);
  return pastelColors[randomIndex];
}

export function getDayOfWeek(date: Date | undefined): string {
  if (!date) return '';
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return days[date.getDay()];
}

export type EventOperationalState = 'active' | 'closed' | 'overdue' | 'cancelled';

export function getEventOperationalState(
  event: Event
): EventOperationalState {
  if (event.status_pagamento === 'cancelado') return 'cancelled';

  const now = new Date();
  const thresholdDate = startOfDay(subDays(now, 1)); 
  const eventDate = event.data_evento;

  const isPast = isBefore(eventDate, thresholdDate);
  const isClientPaid = event.status_pagamento === 'pago';
  const isSettled = !!event.settlementId; 

  if (isPast && isClientPaid && isSettled) {
    return 'closed';
  }

  if (isPast && !isClientPaid) {
    return 'overdue';
  }

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
