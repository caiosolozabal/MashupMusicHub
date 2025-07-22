
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Info } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import type { Event, UserDetails } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge, badgeVariants } from '@/components/ui/badge';
import type { VariantProps } from 'class-variance-authority';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';


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

interface FinancialSummary {
  totalBruto: number;
  totalCustos: number;
  totalLiquido: number;
  parcelaDjTotal: number;
  totalRecebidoPeloDj: number;
  saldoFinal: number;
}

export default function SettlementsPage() {
  const { user, userDetails, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [events, setEvents] = useState<Event[]>([]);
  const [allDjs, setAllDjs] = useState<UserDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [selectedDjId, setSelectedDjId] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);


  const fetchAllData = useCallback(async () => {
    if (authLoading || !user || !userDetails || userDetails.role === 'dj') {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      if (!db) throw new Error("Firestore not initialized");

      const dataPromises = [];
      const eventsQuery = query(collection(db, 'events'), orderBy('data_evento', 'asc'));
      dataPromises.push(getDocs(eventsQuery));

      if (userDetails.role === 'admin' || userDetails.role === 'partner') {
        const djsQuery = query(collection(db, 'users'), where('role', '==', 'dj'), orderBy('displayName'));
        dataPromises.push(getDocs(djsQuery));
      }
      
      const results = await Promise.all(dataPromises);

      const eventsSnapshot = results[0];
      const eventsList = eventsSnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          ...data,
          data_evento: data.data_evento instanceof Timestamp ? data.data_evento.toDate() : new Date(data.data_evento),
          dj_costs: data.dj_costs ?? 0,
        } as Event;
      });
      setEvents(eventsList);

      if (userDetails.role === 'admin' || userDetails.role === 'partner') {
         const djsSnapshot = results[1];
         const djsList = djsSnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserDetails));
         setAllDjs(djsList);
      }

    } catch (error) {
      console.error("Error fetching data: ", error);
      toast({ variant: 'destructive', title: 'Erro ao carregar dados', description: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, user, userDetails, toast]);


  useEffect(() => {
    if (!authLoading && user && userDetails) {
        fetchAllData();
    } else if (!authLoading && (!user || !userDetails)) {
        setIsLoading(false);
    }
  }, [authLoading, user, userDetails, fetchAllData]);

  const filteredEvents = useMemo(() => {
    if (!selectedDjId) {
      setSelectedEventIds([]);
      return [];
    }

    let filtered = events.filter(event => event.dj_id === selectedDjId);
    
    if (dateRange?.from) {
      const fromDate = startOfDay(dateRange.from); 
      if (!dateRange.to) {
         filtered = filtered.filter(event => event.data_evento >= fromDate);
      } 
      else {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        filtered = filtered.filter(event => event.data_evento >= fromDate && event.data_evento <= toDate);
      }
    }
    
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(event => 
        event.nome_evento.toLowerCase().includes(lowerSearchTerm) ||
        event.contratante_nome.toLowerCase().includes(lowerSearchTerm) ||
        event.local.toLowerCase().includes(lowerSearchTerm)
      );
    }
    
    // Auto-select all filtered events when filter changes
    setSelectedEventIds(filtered.map(e => e.id));

    return filtered;
  }, [events, selectedDjId, dateRange, searchTerm]);

  const eventsForCalculation = useMemo(() => {
    return filteredEvents.filter(event => selectedEventIds.includes(event.id));
  }, [selectedEventIds, filteredEvents]);


  const handleSelectEvent = (eventId: string) => {
    setSelectedEventIds(prev =>
      prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEventIds(filteredEvents.map(e => e.id));
    } else {
      setSelectedEventIds([]);
    }
  };


  const calculateDjCut = useCallback((event: Event, djPercent: number): number => {
    if (event.status_pagamento === 'cancelado') return 0;
    // Formula: ((Valor Total - Custos) * %DJ) + Custos
    const baseValue = event.valor_total - (event.dj_costs || 0);
    return (baseValue * djPercent) + (event.dj_costs || 0);
  }, []);

  const financialSummary = useMemo<FinancialSummary | null>(() => {
    if (!selectedDjId || eventsForCalculation.length === 0) return null;

    const selectedDj = allDjs.find(dj => dj.uid === selectedDjId);
    if (!selectedDj || typeof selectedDj.dj_percentual !== 'number') {
        return null;
    }

    const djPercent = selectedDj.dj_percentual;
    let totalBruto = 0;
    let totalCustos = 0;
    let parcelaDjTotal = 0;
    let totalRecebidoPeloDj = 0;

    for (const event of eventsForCalculation) {
      if (event.status_pagamento === 'cancelado') continue;
      
      totalBruto += event.valor_total;
      totalCustos += event.dj_costs || 0;
      
      const djCutForEvent = calculateDjCut(event, djPercent);
      parcelaDjTotal += djCutForEvent;
      
      // CRITICAL CORRECTION: Sum only the down payment (sinal) if the DJ received it.
      if (event.conta_que_recebeu === 'dj') {
        totalRecebidoPeloDj += event.valor_sinal;
      }
    }

    const saldoFinal = parcelaDjTotal - totalRecebidoPeloDj;
    
    return {
      totalBruto,
      totalCustos,
      totalLiquido: totalBruto - totalCustos,
      parcelaDjTotal,
      totalRecebidoPeloDj,
      saldoFinal,
    };
  }, [eventsForCalculation, selectedDjId, allDjs, calculateDjCut]);

  if (authLoading) {
    return (
        <div className="flex flex-col justify-center items-center h-64 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Carregando...</p>
        </div>
    );
  }
  
  if (userDetails?.role === 'dj') {
     return (
         <Card>
            <CardHeader>
                <CardTitle>Acesso Restrito</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Apenas Administradores e Sócios podem acessar esta página.</p>
            </CardContent>
        </Card>
     )
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <CardTitle className="font-headline text-2xl">Gerar Fechamentos</CardTitle>
                <CardDescription>Selecione um DJ e o período para gerar um novo fechamento.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
                <label className="text-sm font-medium">DJ *</label>
                <Select value={selectedDjId} onValueChange={setSelectedDjId} disabled={isLoading}>
                    <SelectTrigger>
                    <SelectValue placeholder={isLoading ? "Carregando..." : "Selecione o DJ"} />
                    </SelectTrigger>
                    <SelectContent>
                    {allDjs.map(dj => (
                        <SelectItem key={dj.uid} value={dj.uid}>{dj.displayName || dj.email}</SelectItem>
                    ))}
                    {!isLoading && allDjs.length === 0 && <SelectItem value="no-djs" disabled>Nenhum DJ cadastrado</SelectItem>}
                    </SelectContent>
                </Select>
            </div>
             <div className="space-y-2">
                <label className="text-sm font-medium">Período</label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                        id="date"
                        variant={"outline"}
                        className="w-full justify-start text-left font-normal"
                        >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                            dateRange.to ? (
                            <>
                                {format(dateRange.from, "dd/MM/yy")} -{" "}
                                {format(dateRange.to, "dd/MM/yy")}
                            </>
                            ) : (
                            `A partir de ${format(dateRange.from, "dd/MM/yy")}`
                            )
                        ) : (
                            <span>Todo o período</span>
                        )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                        />
                    </PopoverContent>
                </Popover>
             </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar Evento</label>
              <Input 
                placeholder="Buscar por evento, contratante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {selectedDjId && financialSummary && (
            <Card className="mb-6 bg-secondary/50">
              <CardHeader>
                 <CardTitle className="text-xl">Resumo do Fechamento</CardTitle>
                 <CardDescription>
                    Resumo para {allDjs.find(dj => dj.uid === selectedDjId)?.displayName} com base nos {eventsForCalculation.length} eventos selecionados.
                 </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Eventos Selecionados</p>
                    <p className="text-lg font-bold">{eventsForCalculation.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Bruto Total</p>
                    <p className="text-lg font-bold">{financialSummary.totalBruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1.5">
                        <p className="text-sm text-muted-foreground">Parcela Líquida do DJ</p>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="text-xs">Fórmula: ((Valor Total - Custos) * % DJ) + Custos</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <p className="text-lg font-bold">{financialSummary.parcelaDjTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sinal Recebido pelo DJ</p>
                    <p className="text-lg font-bold">{financialSummary.totalRecebidoPeloDj.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>
                   <div className={`p-2 rounded-md ${financialSummary.saldoFinal >= 0 ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'}`}>
                    <p className="text-sm font-semibold">{financialSummary.saldoFinal >= 0 ? 'A Agência PAGA ao DJ' : 'O DJ PAGA à Agência'}</p>
                    <p className={`text-xl font-bold ${financialSummary.saldoFinal >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                      {Math.abs(financialSummary.saldoFinal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                </div>
                 <div className="flex justify-end pt-4">
                    <Button disabled={eventsForCalculation.length === 0}>
                        Gerar Fechamento
                    </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Separator className="my-4" />

          {isLoading ? (
             <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Carregando eventos...</p>
             </div>
          ) : !selectedDjId ? (
            <p className="text-muted-foreground text-center py-8">Por favor, selecione um DJ para visualizar os eventos.</p>
          ) : filteredEvents.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum evento encontrado para os filtros selecionados.</p>
          ) : (
             <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedEventIds.length === filteredEvents.length && filteredEvents.length > 0}
                        onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                        aria-label="Selecionar todos"
                      />
                    </TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Status Pag.</TableHead>
                    <TableHead>Recebido por</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Sinal</TableHead>
                    <TableHead>Custos DJ</TableHead>
                    <TableHead>Parcela DJ (Apurado)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => {
                     const djData = allDjs.find(dj => dj.uid === event.dj_id);
                     const djPercentual = djData?.dj_percentual ?? 0;
                     const parcelaDj = calculateDjCut(event, djPercentual);

                    return(
                      <TableRow key={event.id} data-state={selectedEventIds.includes(event.id) ? 'selected' : ''}>
                         <TableCell>
                          <Checkbox
                            checked={selectedEventIds.includes(event.id)}
                            onCheckedChange={() => handleSelectEvent(event.id)}
                            aria-label={`Selecionar evento ${event.nome_evento}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{format(event.data_evento, 'dd/MM/yyyy')}</div>
                        </TableCell>
                        <TableCell className="font-medium">{event.nome_evento}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(event.status_pagamento)} className="capitalize text-xs">
                            {getStatusText(event.status_pagamento)}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">{event.conta_que_recebeu === 'agencia' ? 'Agência' : 'DJ'}</TableCell>
                        <TableCell>
                          {Number(event.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                         <TableCell>
                          {Number(event.valor_sinal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                        <TableCell>
                          {Number(event.dj_costs || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                         <TableCell className="font-semibold">
                          {parcelaDj.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
