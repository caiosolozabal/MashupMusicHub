
'use client';

import type { Event } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import type { VariantProps } from 'class-variance-authority';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';

interface ScheduleListViewProps {
  events: Event[];
  djPercentual: number | null;
  onView: (event: Event) => void;
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => void;
  canEdit: (event: Event) => boolean;
  canDelete: boolean;
}

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

export default function ScheduleListView({
  events,
  djPercentual,
  onView,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: ScheduleListViewProps) {
  const calculateCache = (event: Event): number => {
    if (typeof djPercentual !== 'number' || djPercentual < 0 || djPercentual > 1) {
      return 0;
    }
    return event.valor_total * djPercentual;
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Horário</TableHead>
            <TableHead>Evento</TableHead>
            <TableHead>Local</TableHead>
            <TableHead>Contratante</TableHead>
            <TableHead>Status Pag.</TableHead>
            <TableHead>Valor Total</TableHead>
            {djPercentual !== null && <TableHead>Seu Cachê (Est.)</TableHead>}
            <TableHead>DJ</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event.id}>
              <TableCell>
                <div className="font-medium">{format(event.data_evento, 'dd/MM/yyyy')}</div>
                <div className="text-xs text-muted-foreground">{event.dia_da_semana}</div>
              </TableCell>
              <TableCell>
                  {event.horario_inicio ? `${event.horario_inicio}${event.horario_fim ? ` - ${event.horario_fim}` : ''}` : 'N/A'}
              </TableCell>
              <TableCell className="font-medium">{event.nome_evento}</TableCell>
              <TableCell>{event.local}</TableCell>
              <TableCell>{event.contratante_nome}</TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(event.status_pagamento)} className="capitalize text-xs">
                  {getStatusText(event.status_pagamento)}
                </Badge>
              </TableCell>
              <TableCell>
                {Number(event.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </TableCell>
              {djPercentual !== null && (
                <TableCell>
                  {calculateCache(event).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </TableCell>
              )}
              <TableCell>{event.dj_nome}</TableCell>
              <TableCell className="text-right space-x-1">
                <Button variant="outline" size="icon" aria-label="Visualizar Evento" onClick={() => onView(event)}>
                  <Eye className="h-4 w-4" />
                </Button>
                {canEdit(event) && (
                  <Button variant="outline" size="icon" aria-label="Editar Evento" onClick={() => onEdit(event)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button variant="destructive" size="icon" aria-label="Excluir Evento" onClick={() => onDelete(event)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
