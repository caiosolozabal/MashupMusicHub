
'use client';

import type { Event } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { VariantProps } from 'class-variance-authority';
import { Timestamp } from 'firebase/firestore';
import { FileText, Link as LinkIcon, Truck, Disc, StickyNote, Copy } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '../ui/button';

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
    return <p className="text-muted-foreground">Nenhum evento selecionado para visualização.</p>;
  }

  const eventDate = event.data_evento instanceof Timestamp ? event.data_evento.toDate() : (typeof event.data_evento === 'string' ? new Date(event.data_evento) : event.data_evento);
  const createdAtDate = event.created_at instanceof Timestamp ? event.created_at.toDate() : (typeof event.created_at === 'string' ? new Date(event.created_at) : event.created_at);
  const updatedAtDate = event.updated_at ? (event.updated_at instanceof Timestamp ? event.updated_at.toDate() : (typeof event.updated_at === 'string' ? new Date(event.updated_at) : event.updated_at)) : null;


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
              {format(eventDate, 'dd/MM/yyyy HH:mm')} ({event.dia_da_semana}) - {event.local}
            </CardDescription>
          </div>
          {onDuplicateEvent && (
              <Button variant="outline" size="sm" onClick={() => onDuplicateEvent(event)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicar Evento
              </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {event.linkedEventId && (
            <div className="p-3 border rounded-md bg-muted/30">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><LinkIcon className="h-4 w-4 text-primary" /> Evento Vinculado</h4>
                <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">Este evento está vinculado a: <span className="font-medium text-foreground">{event.linkedEventName || 'Evento sem nome'}</span></p>
                    {onViewEvent && (
                        <Button variant="outline" size="sm" onClick={() => onViewEvent(event.linkedEventId!)}>Ver Vinculado</Button>
                    )}
                </div>
            </div>
        )}

        <div>
          <h4 className="font-semibold text-sm mb-1">Contratante:</h4>
          <p className="text-muted-foreground">{event.contratante_nome}</p>
          {event.contratante_contato && <p className="text-xs text-muted-foreground">{event.contratante_contato}</p>}
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-1">DJ / Responsável:</h4>
          <p className="text-muted-foreground">{event.dj_nome}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <h4 className="font-semibold text-sm mb-1">Valor Total:</h4>
            <p className="text-muted-foreground">
              {Number(event.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-1">Valor Sinal:</h4>
            <p className="text-muted-foreground">
              {Number(event.valor_sinal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
           <div>
            <h4 className="font-semibold text-sm mb-1">Custos do DJ:</h4>
            <p className="text-muted-foreground">
              {Number(event.dj_costs || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold text-sm mb-1">Conta Recebeu Sinal:</h4>
            <p className="text-muted-foreground capitalize">
              {event.conta_que_recebeu === 'agencia' ? 'Agência' : 'DJ'}
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-1">Status Pagamento:</h4>
            <Badge variant={getStatusVariant(event.status_pagamento)} className="capitalize text-xs">
              {getStatusText(event.status_pagamento)}
            </Badge>
          </div>
        </div>
        
        {event.notes && (
          <>
            <Separator />
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-primary" />
                Anotações do Evento
              </h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-secondary/30 p-3 rounded-md">{event.notes}</p>
            </div>
          </>
        )}

        <Separator />

        <div>
          <h4 className="font-semibold text-sm mb-2">Comprovantes de Pagamento do DJ:</h4>
          {event.payment_proofs && event.payment_proofs.length > 0 ? (
            <ul className="space-y-2">
              {event.payment_proofs.map((proof, index) => (
                <li key={proof.id || index} className="flex items-center space-x-2 p-1.5 bg-secondary/30 rounded-md">
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <a 
                    href={proof.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs text-primary hover:underline truncate"
                    title={proof.name}
                  >
                    {proof.name}
                  </a>
                  <span className="text-xs text-muted-foreground ml-auto">
                    ({format(proof.uploadedAt instanceof Timestamp ? proof.uploadedAt.toDate() : new Date(proof.uploadedAt), 'dd/MM/yy')})
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhum comprovante de pagamento enviado pelo DJ.</p>
          )}
        </div>
        
        <Separator />

        <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            {createdAtDate && (
                <div>
                    <h4 className="font-semibold text-sm mb-1">Criado em:</h4>
                    <p>{format(createdAtDate, 'dd/MM/yyyy HH:mm')}</p>
                </div>
            )}
            {updatedAtDate && (
                <div>
                    <h4 className="font-semibold text-sm mb-1">Última Atualização:</h4>
                    <p>{format(updatedAtDate, 'dd/MM/yyyy HH:mm')}</p>
                </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
