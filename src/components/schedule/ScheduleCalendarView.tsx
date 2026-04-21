
'use client';

import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import type { Event, UserDetails } from '@/lib/types';
import { format, isSameDay } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import EventView from '@/components/events/EventView';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { buttonVariants } from "@/components/ui/button"


interface ScheduleCalendarViewProps {
  events: Event[];
  allDjs: UserDetails[];
}

const getStatusText = (status?: Event['status_pagamento']): string => {
  switch (status) {
    case 'pago': return 'Pago';
    case 'parcial': return 'Parcial';
    case 'pendente': return 'Pendente';
    case 'vencido': return 'Vencido';
    case 'cancelado': return 'Cancelado';
    default: return status || 'N/A';
  }
};


export default function ScheduleCalendarView({ events, allDjs }: ScheduleCalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [displayedMonth, setDisplayedMonth] = useState<Date>(new Date());
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedEventForView, setSelectedEventForView] = useState<Event | null>(null);
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    const now = new Date();
    setSelectedDate(now);
    setDisplayedMonth(now);
    setToday(now);
  }, []);

  const handleEventClick = (event: Event) => {
    setSelectedEventForView(event);
    setIsViewOpen(true);
  };

  const DayContent = (props: { date: Date }) => {
    const dayEvents = events.filter(eventItem => eventItem.data_evento && isSameDay(eventItem.data_evento, props.date));
    
    const renderDateNumber = () => (
      <span className={`absolute top-1 left-1 text-xs z-20 ${today && isSameDay(props.date, today) ? 'font-bold text-primary' : 'text-foreground/60'}`}>
        {format(props.date, 'd')}
      </span>
    );

    return (
      <TooltipProvider>
        <div className="flex flex-col items-stretch justify-start w-full h-full relative pt-6 px-1 space-y-0.5 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {renderDateNumber()}
          {dayEvents.map(event => {
            const djForEvent = allDjs.find(dj => dj.uid === event.dj_id);
            const eventColor = djForEvent?.dj_color || 'hsl(var(--muted))';
            
            return (
              <Tooltip key={event.id} delayDuration={100}>
                <TooltipTrigger asChild>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEventClick(event);
                    }}
                    className={cn(
                      "text-[9px] leading-tight p-1 rounded-sm cursor-pointer hover:opacity-80 w-full text-left truncate text-slate-900 font-bold border border-black/5"
                    )}
                    style={{ backgroundColor: eventColor }}
                  >
                    {event.horario_inicio ? `${event.horario_inicio.substring(0,5)} ` : ''}{event.nome_evento}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="p-2 text-xs bg-background border-border shadow-lg rounded-md z-50">
                  <p className="font-semibold">{event.nome_evento}</p>
                  <p>DJ: {event.dj_nome}</p>
                  {event.horario_inicio && <p>{event.horario_inicio}{event.horario_fim ? ` - ${event.horario_fim}`: ''}</p>}
                  <p className="capitalize">Status: {getStatusText(event.status_pagamento)}</p>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </TooltipProvider>
    );
  };

  if (!selectedDate) return null;

  return (
    <div className="space-y-4">
      {/* Legenda de DJs */}
      <div className="flex flex-wrap gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-full mb-1">Legenda Profissionais:</span>
        {allDjs.map(dj => (
          <div key={dj.uid} className="flex items-center gap-1.5 bg-background px-2 py-1 rounded-md border border-border/50 shadow-sm">
            <div className="h-2.5 w-2.5 rounded-full border border-black/10" style={{ backgroundColor: dj.dj_color || 'gray' }} />
            <span className="text-[10px] font-bold text-foreground">{dj.displayName}</span>
          </div>
        ))}
      </div>

      <div className="w-full overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <div className="min-w-[800px] pb-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            month={displayedMonth}
            onMonthChange={setDisplayedMonth}
            className="rounded-md border shadow-sm w-full"
            components={{
              DayContent: DayContent,
            }}
            modifiers={{
                today: today || undefined,
            }}
            modifiersClassNames={{
                today: 'ring-2 ring-primary ring-inset rounded-md', 
            }}
            classNames={{
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-4 w-full",
              caption: "flex justify-center pt-1 relative items-center",
              caption_label: "text-sm font-bold uppercase tracking-widest",
              nav: "space-x-1 flex items-center",
              nav_button: cn(
                buttonVariants({ variant: "outline" }),
                "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
              ),
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              
              table: "w-full border-collapse",
              head_row: "flex w-full bg-muted/20 rounded-t-md", 
              head_cell: "flex-1 text-muted-foreground font-black text-[10px] uppercase tracking-tighter text-center py-2",
              
              row: "flex w-full border-b border-border last:border-0",
              cell: "flex-1 min-h-[120px] text-sm relative border-r border-border last:border-r-0 p-0", 
              
              day: cn(
                "h-full w-full p-0 font-normal flex items-stretch justify-stretch hover:bg-muted/10 transition-colors" 
              ),
              day_selected: "bg-primary/5",
              day_today: "bg-transparent", 
              day_outside: "day-outside text-muted-foreground opacity-30",
              day_disabled: "text-muted-foreground opacity-50",
              day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
              day_hidden: "invisible",
            }}
          />
        </div>
      </div>

      <div className="flex justify-center">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => {
            setDisplayedMonth(new Date());
            setSelectedDate(new Date());
          }}
          className="text-xs font-bold"
        >
          Voltar para Hoje
        </Button>
      </div>

       <Dialog open={isViewOpen} onOpenChange={(open) => { setIsViewOpen(open); if (!open) setSelectedEventForView(null); }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Evento</DialogTitle>
          </DialogHeader>
          <EventView event={selectedEventForView} />
           <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
