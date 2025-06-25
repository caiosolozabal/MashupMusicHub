
'use client';

import type { Event, UserDetails } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { VariantProps } from 'class-variance-authority';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';

interface ScheduleListViewProps {
  events: Event[];
  allDjs: UserDetails[];
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

const getRowStyle = (color: string | null | undefined): React.CSSProperties => {
    if (!color) return {};
    // convert hsl(h, s%, l%) to hsla(h, s%, l%, a) to make it more subtle
    const bgColor = color.replace('hsl(', 'hsla(').replace(')', ', 0.15)');
    return { backgroundColor: bgColor };
};


export default function ScheduleListView({
  events,
  allDjs,
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
            <TableHead className="px-3 py-1.5">Data</TableHead>
            <TableHead className="px-3 py-1.5">Horário</TableHead>
            <TableHead className="px-3 py-1.5">Evento</TableHead>
            <TableHead className="px-3 py-1.5">Local</TableHead>
            <TableHead className="px-3 py-1.5">Contratante</TableHead>
            <TableHead className="px-3 py-1.5">Status Pag.</TableHead>
            <TableHead className="px-3 py-1.5">Valor Total</TableHead>
            {djPercentual !== null && <TableHead className="px-3 py-1.5">Seu Cachê (Est.)</TableHead>}
            <TableHead className="px-3 py-1.5">DJ</TableHead>
            <TableHead className="text-right px-3 py-1.5">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => {
             const djForEvent = allDjs.find(dj => dj.uid === event.dj_id);
             const djColor = djForEvent?.dj_color;
            return(
            <TableRow key={event.id} style={getRowStyle(djColor)}>
              <TableCell className="p-1.5">
                <div className="font-medium text-sm">{format(event.data_evento, 'dd/MM/yyyy')}</div>
                <div className="text-xs text-muted-foreground">{event.dia_da_semana}</div>
              </TableCell>
              <TableCell className="p-1.5 text-sm">
                  {event.horario_inicio ? `${event.horario_inicio}${event.horario_fim ? ` - ${event.horario_fim}` : ''}` : 'N/A'}
              </TableCell>
              <TableCell className="font-medium p-1.5 text-sm">{event.nome_evento}</TableCell>
              <TableCell className="p-1.5 text-sm">{event.local}</TableCell>
              <TableCell className="p-1.5 text-sm">{event.contratante_nome}</TableCell>
              <TableCell className="p-1.5">
                <Badge variant={getStatusVariant(event.status_pagamento)} className="capitalize text-xs">
                  {getStatusText(event.status_pagamento)}
                </Badge>
              </TableCell>
              <TableCell className="p-1.5 text-sm">
                {Number(event.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </TableCell>
              {djPercentual !== null && (
                <TableCell className="p-1.5 text-sm">
                  {calculateCache(event).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </TableCell>
              )}
              <TableCell className="p-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full border" style={{ backgroundColor: djColor || 'transparent' }}></span>
                  <span>{event.dj_nome}</span>
                </div>
              </TableCell>
              <TableCell className="text-right space-x-1 p-1.5">
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
          )})}
        </TableBody>
      </Table>
    </div>
  );
}
