'use client';

import type { Event, UserDetails, FinancialSettlement } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Eye, Edit, Trash2, Link as LinkIcon, Disc, Truck, Lock, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { cn, calculateDjCut, getEventOperationalState } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface ScheduleListViewProps {
  events: Event[];
  allDjs: UserDetails[];
  settlements: Record<string, FinancialSettlement>;
  onView: (event: Event) => void;
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => void;
  isDjView: boolean;
}

export default function ScheduleListView({
  events,
  allDjs,
  settlements,
  onView,
  onEdit,
  onDelete,
  isDjView,
}: ScheduleListViewProps) {
  
  const { user, userDetails } = useAuth();
  
  const canEditDelete = (event: Event, state: string) => {
    if (state === 'closed') return false;
    if (userDetails?.role === 'admin' || userDetails?.role === 'partner') return true;
    return user?.uid === event.dj_id;
  };
  
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Evento</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Pagamento</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>DJ</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => {
             const dj = allDjs.find(d => d.uid === event.dj_id);
             const state = getEventOperationalState(event, settlements[event.settlementId || '']);
             const isClosed = state === 'closed';
             const isOverdue = state === 'overdue';

            return(
            <TableRow key={event.id} className={cn(isClosed && "opacity-60 bg-muted/20", isOverdue && "bg-destructive/5")}>
              <TableCell>
                <div className="font-medium text-sm">{format(event.data_evento, 'dd/MM/yyyy')}</div>
                <div className="text-xs text-muted-foreground">{event.dia_da_semana}</div>
              </TableCell>
              <TableCell className="font-medium text-sm">
                <div className='flex items-center gap-2'>
                    {event.tipo_servico === 'locacao_equipamento' ? <Truck className="h-4 w-4" /> : <Disc className="h-4 w-4" />}
                    {event.nome_evento}
                    {isClosed && <Lock className="h-3 w-3 text-muted-foreground" title="Evento Encerrado" />}
                </div>
              </TableCell>
              <TableCell>
                {state === 'closed' && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Encerrado</Badge>}
                {state === 'overdue' && <Badge variant="destructive" className="animate-pulse flex gap-1"><AlertTriangle className="h-3 w-3" />Em Atraso</Badge>}
                {state === 'active' && <Badge variant="secondary">Ativo</Badge>}
                {state === 'cancelled' && <Badge variant="outline">Cancelado</Badge>}
              </TableCell>
              <TableCell>
                <Badge variant={event.status_pagamento === 'pago' ? 'default' : 'outline'} className="capitalize">
                  {event.status_pagamento}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">
                {event.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </TableCell>
              <TableCell className="text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dj?.dj_color || '#ccc' }}></span>
                  {event.dj_nome}
                </div>
              </TableCell>
              <TableCell className="text-right space-x-1">
                <Button variant="outline" size="icon" onClick={() => onView(event)}><Eye className="h-4 w-4" /></Button>
                {canEditDelete(event, state) ? (
                  <>
                    <Button variant="outline" size="icon" onClick={() => onEdit(event)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="destructive" size="icon" onClick={() => onDelete(event)}><Trash2 className="h-4 w-4" /></Button>
                  </>
                ) : isClosed && (
                  <Button variant="ghost" size="icon" disabled><Lock className="h-4 w-4" /></Button>
                )}
              </TableCell>
            </TableRow>
          )})}
        </TableBody>
      </Table>
    </div>
  );
}
