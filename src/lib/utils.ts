import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Event, UserDetails } from './types';


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// A predefined palette of distinct and pleasant pastel colors.
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
  // Select a random color from the predefined palette to ensure visual distinction.
  const randomIndex = Math.floor(Math.random() * pastelColors.length);
  return pastelColors[randomIndex];
}


/**
 * Calculates the DJ's cut for a given event, considering the service type and costs.
 * @param event The event object.
 * @param dj The user details object for the DJ, containing their percentages.
 * @returns The calculated monetary value of the DJ's cut.
 */
export const calculateDjCut = (event: Event, dj: UserDetails | undefined): number => {
    if (event.status_pagamento === 'cancelado' || !dj) return 0;
    
    let djPercent: number | null | undefined;

    // Determine which percentage to use based on the service type
    if (event.tipo_servico === 'locacao_equipamento') {
      djPercent = dj.rental_percentual;
    } else { // 'servico_dj' or default
      djPercent = dj.dj_percentual;
    }
      
    // If the relevant percentage is not a valid number, the cut is 0 (plus costs if any)
    if (typeof djPercent !== 'number' || djPercent < 0 || djPercent > 1) {
       // A DJ might still get paid for costs even if their percentage is zero.
       return (event.dj_costs || 0);
    }

    // Base value for calculation is total value minus costs
    const baseValue = event.valor_total - (event.dj_costs || 0);

    // The DJ's cut is their percentage of the base value, plus their costs back.
    const finalCut = (baseValue * djPercent) + (event.dj_costs || 0);
    
    return finalCut;
};
