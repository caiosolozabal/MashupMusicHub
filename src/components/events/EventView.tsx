
'use client';

import type { Event } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { VariantProps } from 'class-variance-authority';
import { Timestamp } from 'firebase/firestore';
import { FileText, Link as LinkIcon, Truck, Disc, StickyNote, Copy, User } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '../ui/button';
import { getDayOfWeek } from '@/lib/utils';

const getStatusVariant = (status?: Event['status_pagamento']): VariantProps<typeof badgeVariants>['variant'] => {
  switch (status) {
    case 'pago': return 'default';
    case 'parcial': return 'secondary';
    case 'pendente': return 'outline';
    case 'vencido': return 'destructive';
    case 'cancelado': return 'destructive';
    default: return 'outline';
  }
};

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

interface EventViewProps {
  event: Event | null;
  onViewEvent?: (eventId: string) => void;
  onDuplicateEvent?: (event: Event) => void;
}

export default function EventView({ event, onViewEvent, onDuplicateEvent }: EventViewProps) {
  if (!event) {
    return <p className="text-muted-foreground">Nenhum evento selecionado.</p>;
  }

  const eventDate = event.data_evento instanceof Timestamp ? event.data_evento.toDate() : (typeof event.data_evento === 'string' ? new Date(event.data_evento) : event.data_evento);
  const dayLabel = event.dia_da_semana || getDayOfWeek(eventDate);
  const serviceType = event.tipo_servico || 'servico_dj';

  return (
    <Card className="shadow-none border-0">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-grow">
            <CardTitle className="font-headline text-2xl flex items-center gap-2">
                {serviceType === 'locacao_equipamento' ? <Truck className="h-6 w-6 text-primary" /> : <Disc className="h-6 w-6 text-primary" />}
                {event.nome_evento}
            </CardTitle>
            <CardDescription>
              {format(eventDate, 'dd/MM/yyyy HH:mm')} ({dayLabel}) - {event.local}
            </CardDescription>
          </div>
          {onDuplicateEvent && (
              <Button variant="outline" size="sm" onClick={() => onDuplicateEvent(event)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicar
              </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {event.linkedEventId && (
            <div className="p-3 border rounded-md bg-muted/30">
                <h4 className="font-semibold text-xs mb-2 flex items-center gap-2 uppercase tracking-widest"><LinkIcon className="h-3.5 w-3.5 text-primary" /> Vínculo</h4>
                <div className="flex justify-between items-center">
                    <p className="text-sm">Vinculado a: <span className="font-bold text-primary">{event.linkedEventName || '...'}</span></p>
                    {onViewEvent && (
                        <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase" onClick={() => onViewEvent(event.linkedEventId!)}>Ver</Button>
                    )}
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Contratante</h4>
            <p className="font-bold text-sm">{event.contratante_nome}</p>
            {event.contratante_contato && <p className="text-xs text-muted-foreground">{event.contratante_contato}</p>}
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
              <User className="h-3 w-3" /> Responsável
            </h4>
            <p className="font-bold text-sm text-primary">{event.dj_nome}</p>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Valor Total</h4>
            <p className="font-black text-base">
              {Number(event.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Status Pagamento</h4>
            <Badge variant={getStatusVariant(event.status_pagamento)} className="text-[10px] uppercase font-bold px-2 py-0.5">
              {getStatusText(event.status_pagamento)}
            </Badge>
          </div>
           <div className="hidden md:block">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Sinal Recebido</h4>
            <p className="text-sm font-medium capitalize">{event.conta_que_recebeu === 'agencia' ? 'Agência' : 'Prestador'}</p>
          </div>
        </div>
        
        {event.notes && (
          <div className="pt-2">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
              <StickyNote className="h-3.5 w-3.5 text-primary" /> Observações
            </h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-secondary/30 p-3 rounded-xl border border-primary/10">{event.notes}</p>
          </div>
        )}

        <Separator />

        <div>
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Comprovantes e Arquivos</h4>
          {event.payment_proofs && event.payment_proofs.length > 0 ? (
            <ul className="space-y-2">
              {event.payment_proofs.map((proof, index) => (
                <li key={proof.id || index} className="flex items-center space-x-2 p-2 bg-secondary/30 rounded-lg border border-white/5">
                  <FileText className="h-4 w-4 text-primary" />
                  <a href={proof.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold hover:underline truncate flex-1">
                    {proof.name}
                  </a>
                  <span className="text-[9px] text-muted-foreground uppercase font-black">
                    {format(proof.uploadedAt instanceof Timestamp ? proof.uploadedAt.toDate() : new Date(proof.uploadedAt), 'dd/MM')}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground italic">Nenhum arquivo enviado.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
