
'use client';

import type { GuestEvent, GuestList, GuestSubmission } from '@/lib/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MapPin, Calendar, Clock, Disc } from 'lucide-react';

interface ConfirmationTicketProps {
  event: GuestEvent;
  list: GuestList;
  submission: GuestSubmission;
}

export default function ConfirmationTicket({ event, list, submission }: ConfirmationTicketProps) {
  const eventDate = event.date.toDate();

  return (
    <div className="w-full relative group">
      {/* Glow Effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-purple-600/50 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
      
      <div className="relative w-full bg-[#111] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
        
        {/* Top Section - Brand/Visual */}
        <div className="h-32 bg-primary relative flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
          </div>
          <Disc className="h-16 w-16 text-black/20 animate-spin-slow absolute -right-4 -top-4" />
          <h2 className="text-black font-black font-headline text-3xl uppercase tracking-tighter italic">Mashup</h2>
        </div>

        {/* Ticket Body */}
        <div className="p-6 pt-8 space-y-6">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Convidado Confirmado</p>
            <h3 className="text-2xl font-black uppercase tracking-tight line-clamp-1">{submission.name}</h3>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Evento</p>
              <p className="text-xs font-black uppercase tracking-tight line-clamp-1">{event.name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Segmento</p>
              <p className="text-xs font-black uppercase tracking-tight">{list.name}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/5">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <p className="text-[9px] font-bold uppercase tracking-widest">Data</p>
              </div>
              <p className="text-xs font-black uppercase">{format(eventDate, "dd 'de' MMMM", { locale: ptBR })}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <p className="text-[9px] font-bold uppercase tracking-widest">Local</p>
              </div>
              <p className="text-xs font-black uppercase truncate">{event.location}</p>
            </div>
          </div>
        </div>

        {/* Detalhe de Picote do Ticket */}
        <div className="relative flex items-center justify-between px-2 h-8">
          <div className="absolute left-0 -translate-x-1/2 w-6 h-6 rounded-full bg-black"></div>
          <div className="absolute right-0 translate-x-1/2 w-6 h-6 rounded-full bg-black"></div>
          <div className="w-full border-t-2 border-dashed border-white/10"></div>
        </div>

        {/* Bottom Section - Validations */}
        <div className="p-6 bg-white/[0.02] flex justify-between items-end">
          <div className="space-y-1">
            <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Data do Registro</p>
            <p className="text-[10px] font-bold text-white/60">{format(new Date(), "dd/MM/yyyy HH:mm")}</p>
          </div>
          <div className="text-right">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary italic">#MASHUPHUBSQUAD</p>
          </div>
        </div>
      </div>
    </div>
  );
}
