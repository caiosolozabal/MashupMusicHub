'use client';

import type { Event, UserDetails } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Eye, Edit, Trash2, Disc, Truck, Lock, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { cn, getEventOperationalState } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface ScheduleListViewProps {
  events: Event[];
  allDjs: UserDetails[];
  onView: (event: Event) => void;
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => void;
  isDjView: boolean;
}

export default function ScheduleListView({
  events,
  allDjs,
  onView,
  onEdit,
  onDelete,
}: ScheduleListViewProps) {
  
  const { user, userDetails } = useAuth();
  
  const canEditDelete = (event: Event, state: string) => {
    if (state === 'closed') return false;
    if (userDetails?.role === 'admin' || userDetails?.role === 'partner') return true;
    return user?.uid === event.dj_id;
  };
  
  return (
    <div className="overflow-x-auto -mx-2 sm:mx-0">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[100px] h-10 px-2 sm:px-4">Data</TableHead>
            <TableHead className="h-10 px-2 sm:px-4">Evento</TableHead>
            <TableHead className="h-10 px-2 sm:px-4">Status</TableHead>
            <TableHead className="hidden sm:table-cell h-10 px-2 sm:px-4">Pagamento</TableHead>
            <TableHead className="hidden md:table-cell h-10 px-2 sm:px-4">Total</TableHead>
            <TableHead className="hidden lg:table-cell h-10 px-2 sm:px-4">DJ</TableHead>
            <TableHead className="text-right h-10 px-2 sm:px-4">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum evento encontrado.</TableCell>
            </TableRow>
          ) : events.map((event) => {
             const dj = allDjs.find(d => d.uid === event.dj_id);
             const state = getEventOperationalState(event);
             const isClosed = state === 'closed';
             const isOverdue = state === 'overdue';

            return(
            <TableRow key={event.id} className={cn("hover:bg-muted/50 transition-colors", isClosed && "opacity-60 bg-muted/20", isOverdue && "bg-destructive/5")}>
              <TableCell className="py-2 px-2 sm:px-4">
                <div className="font-bold text-xs sm:text-sm">{format(event.data_evento, 'dd/MM/yyyy')}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground capitalize">{event.dia_da_semana}</div>
              </TableCell>
              <TableCell className="py-2 px-2 sm:px-4">
                <div className='flex items-center gap-1.5'>
                    <div className="shrink-0">
                      {event.tipo_servico === 'locacao_equipamento' ? <Truck className="h-3.5 w-3.5 text-primary" /> : <Disc className="h-3.5 w-3.5 text-primary" />}
                    </div>
                    <span className="font-semibold text-xs sm:text-sm line-clamp-1">
                      {event.nome_evento}
                    </span>
                    {isClosed && <Lock className="h-3 w-3 text-muted-foreground shrink-0" title="Evento Encerrado" />}
                </div>
              </TableCell>
              <TableCell className="py-2 px-2 sm:px-4">
                <div className="flex flex-col gap-1">
                  {state === 'closed' && <Badge variant="outline" className="text-[10px] h-5 bg-green-50 text-green-700 border-green-200">Encerrado</Badge>}
                  {state === 'overdue' && <Badge variant="destructive" className="text-[10px] h-5 animate-pulse flex gap-1 items-center px-1.5"><AlertTriangle className="h-2.5 w-2.5" />Em Atraso</Badge>}
                  {state === 'active' && <Badge variant="secondary" className="text-[10px] h-5">Ativo</Badge>}
                  {state === 'cancelled' && <Badge variant="outline" className="text-[10px] h-5">Cancelado</Badge>}
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell py-2 px-2 sm:px-4">
                <Badge variant={event.status_pagamento === 'pago' ? 'default' : 'outline'} className="text-[10px] h-5 capitalize">
                  {event.status_pagamento}
                </Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell py-2 px-2 sm:px-4 text-xs">
                {event.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </TableCell>
              <TableCell className="hidden lg:table-cell py-2 px-2 sm:px-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: dj?.dj_color || '#ccc' }}></span>
                  <span className="truncate max-w-[100px]">{event.dj_nome}</span>
                </div>
              </TableCell>
              <TableCell className="py-2 px-2 sm:px-4 text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => onView(event)}><Eye className="h-3.5 w-3.5" /></Button>
                  {canEditDelete(event, state) ? (
                    <>
                      <Button variant="outline" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => onEdit(event)}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button variant="destructive" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => onDelete(event)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </>
                  ) : isClosed && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 cursor-not-allowed" disabled><Lock className="h-3.5 w-3.5" /></Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          )})}
        </TableBody>
      </Table>
    </div>
  );
}