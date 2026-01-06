
'use client';

import type { Event, UserDetails } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { VariantProps } from 'class-variance-authority';
import { Eye, Edit, Trash2, Link as LinkIcon, Disc, Truck } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

interface ScheduleListViewProps {
  events: Event[];
  allDjs: UserDetails[];
  onView: (event: Event) => void;
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => void;
  canEdit: (event: Event) => boolean;
  showServiceTypeColumn: boolean;
  calculateDjCut: (event: Event, dj: UserDetails | undefined) => number;
  isDjView: boolean;
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

const getServiceTypeText = (type: Event['tipo_servico']): string => {
  switch (type) {
    case 'locacao_equipamento': return 'Locação';
    case 'servico_dj': // Fallthrough
    default: return 'Serviço DJ';
  }
}

const getRowStyle = (color: string | null | undefined, isLinked: boolean): React.CSSProperties => {
    if (!color) return {};
    const baseOpacity = isLinked ? 0.25 : 0.15;
    const bgColor = color.replace('hsl(', 'hsla(').replace(')', `, ${baseOpacity})`);
    const borderStyle = isLinked ? `2px solid ${color.replace('hsl(', 'hsla(').replace(')', ', 0.5)')}` : '';
    return { 
        backgroundColor: bgColor,
        borderLeft: borderStyle,
        borderRight: borderStyle,
    };
};


export default function ScheduleListView({
  events,
  allDjs,
  onView,
  onEdit,
  onDelete,
  canEdit,
  showServiceTypeColumn,
  calculateDjCut,
  isDjView,
}: ScheduleListViewProps) {
  
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-3 py-1.5">Data</TableHead>
            <TableHead className="px-3 py-1.5">Horário</TableHead>
            <TableHead className="px-3 py-1.5">Evento</TableHead>
            {showServiceTypeColumn && <TableHead className="px-3 py-1.5">Tipo</TableHead>}
            <TableHead className="px-3 py-1.5">Local</TableHead>
            <TableHead className="px-3 py-1.5">Contratante</TableHead>
            <TableHead className="px-3 py-1.5">Status Pag.</TableHead>
            <TableHead className="px-3 py-1.5">Valor Total</TableHead>
            {isDjView && <TableHead className="px-3 py-1.5">Seu Cachê (Est.)</TableHead>}
            <TableHead className="px-3 py-1.5">DJ</TableHead>
            <TableHead className="text-right px-3 py-1.5">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event, index) => {
             const djForEvent = allDjs.find(dj => dj.uid === event.dj_id);
             const djColor = djForEvent?.dj_color;
             const isLinked = !!event.linkedEventId;
             const nextEventIsLinked = index + 1 < events.length && events[index + 1].linkedEventId === event.id;
             const estimatedCut = calculateDjCut(event, djForEvent);

            return(
            <TableRow 
                key={event.id} 
                style={getRowStyle(djColor, isLinked)} 
                className={cn(isLinked && !nextEventIsLinked && "border-b-2 border-b-primary/50")}
            >
              <TableCell className="p-1.5">
                <div className="font-medium text-sm">{format(event.data_evento, 'dd/MM/yyyy')}</div>
                <div className="text-xs text-muted-foreground">{event.dia_da_semana}</div>
              </TableCell>
              <TableCell className="p-1.5 text-sm">
                  {event.horario_inicio ? `${event.horario_inicio}${event.horario_fim ? ` - ${event.horario_fim}` : ''}` : 'N/A'}
              </TableCell>
              <TableCell className="font-medium p-1.5 text-sm">
                <div className='flex items-center gap-2'>
                    {event.tipo_servico === 'locacao_equipamento' ? <Truck className="h-4 w-4 text-muted-foreground" /> : <Disc className="h-4 w-4 text-muted-foreground" />}
                    {event.nome_evento}
                    {isLinked && <LinkIcon className="h-4 w-4 text-primary" title={`Vinculado a outro evento`} />}
                </div>
              </TableCell>
              {showServiceTypeColumn && (
                <TableCell className="p-1.5">
                   <Badge variant="secondary" className="text-xs whitespace-nowrap">{getServiceTypeText(event.tipo_servico)}</Badge>
                </TableCell>
              )}
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
              {isDjView && (
                <TableCell className="p-1.5 text-sm">
                  {estimatedCut.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
                
                <Button variant="destructive" size="icon" aria-label="Excluir Evento" onClick={() => onDelete(event)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
                
              </TableCell>
            </TableRow>
          )})}
        </TableBody>
      </Table>
    </div>
  );
}
