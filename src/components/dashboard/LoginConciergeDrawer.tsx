'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Sparkles, Calendar, Bell, X, CheckCircle2 } from 'lucide-react';
import type { Event, Task } from '@/lib/types';
import { addHours, isBefore, startOfDay } from 'date-fns';
import DjOperationalCard from './DjOperationalCard';

interface LoginConciergeDrawerProps {
  events: Event[];
  alerts: Task[];
}

export default function LoginConciergeDrawer({ events, alerts }: LoginConciergeDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Verificar se já apareceu nesta sessão
    const hasSeenInSession = sessionStorage.getItem('mashup_concierge_seen');
    if (hasSeenInSession) return;

    const now = new Date();
    const today = startOfDay(now);

    // Lógica para decidir se abre: Apenas eventos HOJE ou nos próximos 48h
    const upcomingEvents = events.filter(e => {
        const soon = addHours(now, 48);
        return e.data_evento >= today && isBefore(e.data_evento, soon) && e.status_pagamento !== 'cancelado';
    });

    const importantAlerts = alerts.filter(a => a.priority === 'high' || a.status === 'pending_acceptance');

    if (upcomingEvents.length > 0 || importantAlerts.length > 0) {
        setIsOpen(true);
        sessionStorage.setItem('mashup_concierge_seen', 'true');
    }
  }, [events, alerts]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0 border-none bg-background rounded-t-3xl sm:rounded-lg">
        <div className="relative">
            {/* Header Visual Premium */}
            <div className="h-32 bg-primary flex flex-col items-center justify-center text-black space-y-1 relative overflow-hidden">
                 <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
                 <Sparkles className="h-8 w-8 mb-1 animate-pulse" />
                 <h2 className="text-xl font-black uppercase tracking-tighter italic">Sua Agenda Mashup</h2>
                 <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">Briefing Operacional</p>
            </div>

            <div className="p-6 space-y-6">
                {alerts.filter(a => a.priority === 'high' || a.status === 'pending_acceptance').length > 0 && (
                    <div className="space-y-3">
                         <h3 className="text-[10px] font-black uppercase tracking-widest text-destructive flex items-center gap-2">
                             <Bell className="h-3 w-3 fill-destructive" /> Avisos Críticos
                         </h3>
                         {alerts.map(alert => (
                             <div key={alert.id} className="p-3 bg-destructive/5 border border-destructive/20 rounded-xl text-xs">
                                 <p className="font-bold text-destructive uppercase tracking-tight">{alert.title}</p>
                                 <p className="text-muted-foreground mt-1 line-clamp-2">{alert.description}</p>
                             </div>
                         ))}
                    </div>
                )}

                <DjOperationalCard events={events} />

                <div className="pt-2">
                    <Button 
                        onClick={() => setIsOpen(false)} 
                        className="w-full bg-black text-white hover:bg-black/90 font-black uppercase text-xs tracking-widest py-6 rounded-2xl"
                    >
                        <CheckCircle2 className="mr-2 h-4 w-4 text-primary" /> Entendido, vamos pro show!
                    </Button>
                </div>
            </div>
            
            <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 h-8 w-8 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/40 transition-colors"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}