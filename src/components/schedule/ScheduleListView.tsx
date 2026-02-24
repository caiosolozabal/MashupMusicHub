'use client';

import type { Event, UserDetails } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Eye, Edit, Trash2, Disc, Truck, Lock, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { cn, getEventOperationalState, getDayOfWeek } from '@/lib/utils';
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
            <TableHead className="w-[80px] h-9 px-1 sm:px-4 text-[10px] sm:text-xs uppercase font-black">Data</TableHead>
            <TableHead className="h-9 px-1 sm:px-4 text-[10px] sm:text-xs uppercase font-black">Evento / DJ</TableHead>
            <TableHead className="h-9 px-1 sm:px-4 text-[10px] sm:text-xs uppercase text-center font-black">Status</TableHead>
            <TableHead className="hidden md:table-cell h-9 px-2 sm:px-4 text-right font-black">Total</TableHead>
            <TableHead className="text-right h-9 px-1 sm:px-4 text-[10px] sm:text-xs uppercase font-black">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum evento encontrado.</TableCell>
            </TableRow>
          ) : events.map((event) => {
             const dj = allDjs.find(d => d.uid === event.dj_id);
             const state = getEventOperationalState(event);
             const isClosed = state === 'closed';
             const isOverdue = state === 'overdue';
             const dayLabel = event.dia_da_semana || getDayOfWeek(event.data_evento);
             const djColor = dj?.dj_color || '#e2e8f0';
             
             // Identificação do DJ com fallback
             const djDisplayName = event.dj_nome || dj?.displayName || dj?.email?.split('@')[0] || 'DJ não definido';

            return(
            <TableRow 
              key={event.id} 
              className={cn(
                "hover:bg-muted/50 transition-colors border-l-[6px]", 
                isClosed && "opacity-60 bg-muted/20", 
                isOverdue && "bg-destructive/5"
              )} 
              style={{ borderLeftColor: djColor }}
            >
              <TableCell className="py-2 px-1 sm:px-4">
                <div className="font-bold text-[11px] sm:text-sm leading-tight">{format(event.data_evento, 'dd/MM/yyyy')}</div>
                <div className="text-[9px] sm:text-xs text-muted-foreground capitalize leading-tight">
                  {dayLabel.substring(0, 3)}
                </div>
              </TableCell>
              <TableCell className="py-2 px-1 sm:px-4">
                <div className='flex flex-col gap-1'>
                    <div className='flex items-center gap-1.5'>
                        <div className="shrink-0">
                          {event.tipo_servico === 'locacao_equipamento' ? <Truck className="h-3.5 w-3.5 text-primary" /> : <Disc className="h-3.5 w-3.5 text-primary" />}
                        </div>
                        <span className="font-bold text-[12px] sm:text-sm line-clamp-1 leading-tight text-foreground">
                          {event.nome_evento}
                        </span>
                        {isClosed && <Lock className="h-2.5 w-2.5 text-muted-foreground shrink-0" />}
                    </div>
                    {/* Identificação clara do DJ */}
                    <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full shrink-0 border border-black/10" style={{ backgroundColor: djColor }}></div>
                        <span className="text-[10px] sm:text-[11px] font-black text-muted-foreground uppercase tracking-wider">
                            {djDisplayName}
                        </span>
                    </div>
                </div>
              </TableCell>
              <TableCell className="py-2 px-1 sm:px-4">
                <div className="flex flex-col gap-1 items-center">
                  {state === 'closed' && <Badge variant="outline" className="text-[9px] h-5 py-0 bg-green-50 text-green-700 border-green-200 uppercase font-bold">Encerrado</Badge>}
                  {state === 'overdue' && (
                    <Badge variant="destructive" className="text-[9px] h-5 py-0 animate-pulse flex gap-1 items-center justify-center px-1.5 uppercase font-bold">
                      <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                      <span>Atraso</span>
                    </Badge>
                  )}
                  {state === 'active' && <Badge variant="secondary" className="text-[9px] h-5 py-0 uppercase font-bold">Ativo</Badge>}
                  {state === 'cancelled' && <Badge variant="outline" className="text-[9px] h-5 py-0 uppercase font-bold">Cancelado</Badge>}
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell py-2 px-2 sm:px-4 text-xs text-right font-bold">
                {event.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </TableCell>
              <TableCell className="py-2 px-1 sm:px-4 text-right">
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
