
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Clock, 
  Phone, 
  MessageCircle, 
  Navigation, 
  Calendar, 
  Info,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { format, isToday, isTomorrow, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Event } from '@/lib/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface DjOperationalCardProps {
  events: Event[];
}

export default function DjOperationalCard({ events }: DjOperationalCardProps) {
  const sortedEvents = useMemo(() => {
    return [...events]
      .filter(e => e.status_pagamento !== 'cancelado')
      .sort((a, b) => a.data_evento.getTime() - b.data_evento.getTime())
      .slice(0, 3);
  }, [events]);

  if (sortedEvents.length === 0) return null;

  const mainEvent = sortedEvents[0];
  const others = sortedEvents.slice(1);

  const getDayLabel = (date: Date) => {
    if (isToday(date)) return 'HOJE';
    if (isTomorrow(date)) return 'AMANHÃ';
    return format(date, "dd 'de' MMM", { locale: ptBR }).toUpperCase();
  };

  const handleOpenMaps = (local: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(local)}`;
    window.open(url, '_blank');
  };

  const handleOpenWhatsApp = (phone: string, eventName: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá, sou o DJ da Mashup escalado para o evento ${eventName}.`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Sua Agenda Operacional</h2>
      
      {/* Evento em Destaque (Próximo/Hoje) */}
      <Card className={cn(
        "relative overflow-hidden border-l-[6px] transition-all hover:shadow-md",
        isToday(mainEvent.data_evento) ? "border-l-primary bg-primary/5" : "border-l-muted-foreground/30"
      )}>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <Badge variant={isToday(mainEvent.data_evento) ? "default" : "outline"} className="text-[10px] font-black tracking-widest uppercase">
                {getDayLabel(mainEvent.data_evento)}
              </Badge>
              <CardTitle className="text-2xl font-black font-headline tracking-tighter uppercase italic leading-none pt-2">
                {mainEvent.nome_evento}
              </CardTitle>
              <CardDescription className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-widest">
                <Clock className="h-3 w-3 text-primary" />
                Início: {mainEvent.horario_inicio || '--:--'} {mainEvent.horario_fim && `• Fim: ${mainEvent.horario_fim}`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-background border flex items-center justify-center shrink-0">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight">{mainEvent.local}</p>
                <button 
                  onClick={() => handleOpenMaps(mainEvent.local)}
                  className="text-[10px] font-black uppercase text-primary hover:underline flex items-center gap-1 mt-1"
                >
                  Abrir no GPS <Navigation className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-background border flex items-center justify-center shrink-0">
                <Phone className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight">{mainEvent.contratante_nome}</p>
                {mainEvent.contratante_contato && (
                  <button 
                    onClick={() => handleOpenWhatsApp(mainEvent.contratante_contato!, mainEvent.nome_evento)}
                    className="text-[10px] font-black uppercase text-green-600 hover:underline flex items-center gap-1 mt-1"
                  >
                    Chamar no WhatsApp <MessageCircle className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {mainEvent.notes && (
            <div className="p-3 bg-background rounded-xl border border-dashed text-xs text-muted-foreground leading-relaxed italic">
              <div className="flex items-center gap-1.5 mb-1 not-italic font-black text-[9px] uppercase tracking-widest text-foreground">
                <Info className="h-3 w-3 text-primary" /> Briefing do Artista
              </div>
              {mainEvent.notes}
            </div>
          )}

          <div className="pt-2">
             <Button asChild variant="outline" className="w-full text-xs font-bold uppercase tracking-widest h-11 bg-background">
                <Link href="/schedule">Ver agenda completa <ChevronRight className="ml-1 h-3 w-3" /></Link>
             </Button>
          </div>
        </CardContent>
      </Card>

      {/* Outros eventos futuros compactos */}
      {others.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {others.map((event) => (
            <Card key={event.id} className="bg-muted/30 border-none shadow-none">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-1">
                    {getDayLabel(event.data_evento)}
                  </p>
                  <p className="font-bold text-sm truncate">{event.nome_evento}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{event.local}</p>
                </div>
                <div className="text-right shrink-0">
                   <p className="text-xs font-black">{event.horario_inicio || '--:--'}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
