
'use client';

import type { NextPage } from 'next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge, badgeVariants } from '@/components/ui/badge';
import type { Event, UserDetails } from '@/lib/types';
import { format, startOfMonth, endOfMonth, subDays, startOfYear, endOfYear } from 'date-fns';
import { CalendarIcon, Search, Loader2, ArrowRightLeft, TrendingUp, TrendingDown, Info } from 'lucide-react';
import type { VariantProps } from 'class-variance-authority';
import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import EventView from '@/components/events/EventView';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


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
  totalEvents: number;
  totalGrossRevenueOfEvents: number; // Valor Bruto dos Eventos (para o DJ selecionado no período)
  totalDjCostsInPeriod: number; // Total de Custos do DJ no período
  
  totalDjNetEntitlementInPeriod: number; // O que o DJ TEM DIREITO no total [(VT - Custo) * %DJ + Custo]
  totalAgencyNetEntitlementInPeriod: number; // O que a AGÊNCIA TEM DIREITO no total [(VT - Custo) * (1-%DJ)]

  // Detalhamento para o saldo:
  // Soma do que a agência deve ao DJ (dos eventos que a agência recebeu)
  sumOwedToDjByAgency: number; 
  // Soma do que o DJ deve à agência (dos eventos que o DJ recebeu)
  sumOwedToAgencyByDj: number; 
  
  finalBalanceForDj: number; // Saldo final: sumOwedToDjByAgency - sumOwedToAgencyByDj
}


const PaymentsPage: NextPage = () => {
  const { user, userDetails, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isViewEventOpen, setIsViewEventOpen] = useState(false);
  const [selectedEventForView, setSelectedEventForView] = useState<Event | null>(null);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDjId, setSelectedDjId] = useState<string>('all'); 
  const [allDjs, setAllDjs] = useState<UserDetails[]>([]);
  const [activeQuickFilter, setActiveQuickFilter] = useState<string>('month');


  useEffect(() => {
    const fetchDjs = async () => {
      if (!db || !(userDetails?.role === 'admin' || userDetails?.role === 'partner')) {
        setAllDjs([]);
        return;
      }
      try {
        const djsQuery = query(collection(db, 'users'), where('role', '==', 'dj'), orderBy('displayName'));
        const djsSnapshot = await getDocs(djsQuery);
        const djsList = djsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserDetails));
        setAllDjs(djsList);
      } catch (error) {
        console.error("Error fetching DJs: ", error);
        toast({ variant: 'destructive', title: 'Erro ao buscar DJs', description: (error as Error).message });
      }
    };
    fetchDjs();
  }, [userDetails?.role, toast]);

  useEffect(() => {
    const fetchEvents = async () => {
      if (authLoading || !user || !db) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      
      let q;
      const eventsCollectionRef = collection(db, 'events');

      // Admin/Partner: Fetch based on selected DJ or all.
      // DJ: Fetch only their own events.
      if (userDetails?.role === 'admin' || userDetails?.role === 'partner') {
        if (selectedDjId === 'all') {
          // For 'all' DJs, we might not fetch events initially or fetch only limited for performance.
          // For now, let's assume 'all' means no specific DJ is selected for summary, 
          // but events list might still show if not filtered.
          // The financial summary calculations are designed for a *specific* DJ.
          // If selectedDjId is 'all', the financial summary for a specific DJ won't be calculated.
           q = query(eventsCollectionRef, orderBy('data_evento', 'desc'));
        } else {
          q = query(eventsCollectionRef, where('dj_id', '==', selectedDjId), orderBy('data_evento', 'desc'));
        }
      } else if (userDetails?.role === 'dj') {
        q = query(eventsCollectionRef, where('dj_id', '==', user.uid), orderBy('data_evento', 'desc'));
        setSelectedDjId(user.uid); // Auto-select the logged-in DJ
      } else {
        setAllEvents([]); // No role to view events
        setIsLoading(false);
        return;
      }

      try {
        const eventsSnapshot = await getDocs(q);
        const eventsList = eventsSnapshot.docs.map(docSnapshot => {
          const data = docSnapshot.data();
          return {
            id: docSnapshot.id,
            ...data,
            data_evento: data.data_evento instanceof Timestamp ? data.data_evento.toDate() : new Date(data.data_evento),
            dj_costs: data.dj_costs ?? 0,
            created_at: data.created_at instanceof Timestamp ? data.created_at.toDate() : new Date(data.created_at),
            updated_at: data.updated_at && (data.updated_at instanceof Timestamp ? data.updated_at.toDate() : new Date(data.updated_at)),
            payment_proofs: Array.isArray(data.payment_proofs) ? data.payment_proofs.map(proof => ({
              ...proof,
              uploadedAt: proof.uploadedAt instanceof Timestamp ? proof.uploadedAt.toDate() : new Date(proof.uploadedAt)
            })) : [],
          } as Event;
        });
        setAllEvents(eventsList);
      } catch (error) {
        console.error("Error fetching events for payments: ", error);
        toast({ variant: 'destructive', title: 'Erro ao buscar eventos', description: (error as Error).message });
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch if auth is done and user details are available
    if (!authLoading && user && userDetails) {
        fetchEvents();
    } else if (!authLoading && !user) {
        setAllEvents([]); // Clear events if user logs out
        setIsLoading(false);
    }
  }, [user, authLoading, userDetails, selectedDjId, toast]); // userDetails added to re-fetch if role changes

  const filteredEvents = useMemo(() => {
    let eventsToFilter = [...allEvents];
    
    // Filter by DJ if admin/partner is viewing and a specific DJ is selected
    // OR if the logged-in user is a DJ (selectedDjId will be their UID)
    if (selectedDjId !== 'all') {
        eventsToFilter = eventsToFilter.filter(event => event.dj_id === selectedDjId);
    }


    if (dateRange?.from) {
      eventsToFilter = eventsToFilter.filter(event => event.data_evento >= dateRange.from!);
    }
    if (dateRange?.to) {
      const toDate = new Date(dateRange.to!);
      toDate.setHours(23, 59, 59, 999); 
      eventsToFilter = eventsToFilter.filter(event => event.data_evento <= toDate);
    }
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      eventsToFilter = eventsToFilter.filter(event =>
        event.nome_evento.toLowerCase().includes(lowerSearch) ||
        event.contratante_nome.toLowerCase().includes(lowerSearch) ||
        event.local.toLowerCase().includes(lowerSearch)
      );
    }
    // Crucially, filter out cancelled events before calculating financial summary
    return eventsToFilter.filter(event => event.status_pagamento !== 'cancelado');
  }, [allEvents, dateRange, searchTerm, selectedDjId]);


  const calculateFinancialSummary = useMemo((): FinancialSummary | null => {
    let djForSummary: UserDetails | undefined = undefined;

    if (userDetails?.role === 'dj') {
      djForSummary = userDetails;
    } else if ((userDetails?.role === 'admin' || userDetails?.role === 'partner') && selectedDjId !== 'all') {
      djForSummary = allDjs.find(dj => dj.uid === selectedDjId);
    }

    // If no specific DJ is selected for summary (e.g. admin viewing "all"), or DJ has no percentage, return null
    if (!djForSummary || typeof djForSummary.dj_percentual !== 'number') return null;

    const djBasePercentage = djForSummary.dj_percentual;

    const summary: FinancialSummary = {
      totalEvents: 0,
      totalGrossRevenueOfEvents: 0,
      totalDjCostsInPeriod: 0,
      totalDjServiceFeeInPeriod: 0,
      totalDjNetEntitlementInPeriod: 0,
      totalAgencyNetEntitlementInPeriod: 0,
      sumOwedToDjByAgency: 0,
      sumOwedToAgencyByDj: 0,
      finalBalanceForDj: 0,
    };

    // filteredEvents already excludes 'cancelado' status and is filtered for the selected DJ (if not 'all')
    // For financial summary, we must iterate only over events of the djForSummary
    const eventsForThisDjSummary = filteredEvents.filter(event => event.dj_id === djForSummary!.uid);


    eventsForThisDjSummary.forEach(event => {
      summary.totalEvents += 1;
      summary.totalGrossRevenueOfEvents += event.valor_total;
      
      const djCosts = event.dj_costs || 0;
      summary.totalDjCostsInPeriod += djCosts;

      const valueAfterDjCosts = event.valor_total - djCosts;
      const djServiceFee = valueAfterDjCosts * djBasePercentage; // DJ's cut from profit
      const agencyServiceFee = valueAfterDjCosts * (1 - djBasePercentage); // Agency's cut from profit
      const djTotalEntitlementForThisEvent = djServiceFee + djCosts; // What DJ is entitled to (fee + reimbursed costs)

      summary.totalDjServiceFeeInPeriod += djServiceFee;
      summary.totalDjNetEntitlementInPeriod += djTotalEntitlementForThisEvent;
      summary.totalAgencyNetEntitlementInPeriod += agencyServiceFee;
      
      if (event.conta_que_recebeu === 'agencia') {
        // Agency received full payment, so agency owes DJ their total entitlement for this event
        summary.sumOwedToDjByAgency += djTotalEntitlementForThisEvent;
      } else if (event.conta_que_recebeu === 'dj') {
        // DJ received full payment, so DJ owes Agency their service fee for this event
        summary.sumOwedToAgencyByDj += agencyServiceFee;
      }
    });

    summary.finalBalanceForDj = summary.sumOwedToDjByAgency - summary.sumOwedToAgencyByDj;
    
    return summary;
  }, [filteredEvents, userDetails, selectedDjId, allDjs]);

  const handleQuickFilter = (filter: 'month' | 'last30' | 'year') => {
    setActiveQuickFilter(filter);
    const today = new Date();
    if (filter === 'month') {
      setDateRange({ from: startOfMonth(today), to: endOfMonth(today) });
    } else if (filter === 'last30') {
      setDateRange({ from: subDays(today, 29), to: today });
    } else if (filter === 'year') {
      setDateRange({ from: startOfYear(today), to: endOfYear(today) });
    }
  };
  
  const handleOpenEventView = (event: Event) => {
    setSelectedEventForView(event);
    setIsViewEventOpen(true);
  };


  if (authLoading) {
    return (
        <div className="flex flex-col justify-center items-center h-64 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Carregando dados financeiros...</p>
        </div>
    );
  }
  
  const showDetailedSummary = !!(
    (userDetails?.role === 'dj') || 
    ((userDetails?.role === 'admin' || userDetails?.role === 'partner') && selectedDjId !== 'all' && calculateFinancialSummary)
  );
  const djNameToDisplay = userDetails?.role === 'dj' 
    ? (userDetails.displayName || userDetails.email) 
    : (allDjs.find(dj => dj.uid === selectedDjId)?.displayName || allDjs.find(dj => dj.uid === selectedDjId)?.email);


  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Financeiro e Pagamentos</CardTitle>
          <CardDescription>Acompanhe os recebimentos, pagamentos e saldos. Os fechamentos são calculados independente do status de pagamento do cliente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end p-4 border rounded-lg bg-muted/30 shadow-sm">
            <div className="lg:col-span-2">
              <label htmlFor="search-payments" className="text-sm font-medium text-foreground">Buscar Evento</label>
              <Input
                id="search-payments"
                placeholder="Nome, contratante, local..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-background"
              />
            </div>
            <div>
              <label htmlFor="date-range-payments" className="text-sm font-medium text-foreground">Período</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date-range-payments"
                    variant={"outline"}
                    className="w-full justify-start text-left font-normal bg-background"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "dd/MM/yy")} - {format(dateRange.to, "dd/MM/yy")}
                        </>
                      ) : (
                        format(dateRange.from, "dd/MM/yy")
                      )
                    ) : (
                      <span>Selecione</span>
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
            <div className="flex items-end gap-1">
                <Button onClick={() => handleQuickFilter('month')} variant={activeQuickFilter === 'month' ? 'default' : 'outline'} size="sm" className="flex-1">Mês</Button>
                <Button onClick={() => handleQuickFilter('last30')} variant={activeQuickFilter === 'last30' ? 'default' : 'outline'} size="sm" className="flex-1">30d</Button>
                <Button onClick={() => handleQuickFilter('year')} variant={activeQuickFilter === 'year' ? 'default' : 'outline'} size="sm" className="flex-1">Ano</Button>
            </div>

            {(userDetails?.role === 'admin' || userDetails?.role === 'partner') && (
              <div className="lg:col-span-1">
                <label htmlFor="dj-filter-payments" className="text-sm font-medium text-foreground">Filtrar por DJ</label>
                <Select value={selectedDjId} onValueChange={setSelectedDjId} disabled={allDjs.length === 0}>
                  <SelectTrigger id="dj-filter-payments" className="bg-background">
                    <SelectValue placeholder="Selecione um DJ para ver resumo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Ver todos os eventos (sem resumo de DJ)</SelectItem>
                    {allDjs.map(dj => (
                      <SelectItem key={dj.uid} value={dj.uid}>{dj.displayName || dj.email}</SelectItem>
                    ))}
                    {allDjs.length === 0 && <SelectItem value="no-djs" disabled>Nenhum DJ cadastrado</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {isLoading && (!calculateFinancialSummary && selectedDjId !== 'all') && (
             <div className="flex justify-center items-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Calculando resumo para o DJ...</p>
             </div>
          )}
          
          {showDetailedSummary && calculateFinancialSummary && djNameToDisplay && (
            <Card className="bg-primary/5 border-primary/20 shadow-md">
              <CardHeader>
                <CardTitle className="font-headline text-xl text-primary">
                    Resumo Financeiro: {djNameToDisplay}
                </CardTitle>
                <CardDescription>Referente ao período e filtros selecionados. Status de pagamento do cliente é para fins de cobrança e não afeta este cálculo de fechamento.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="p-3 bg-background/70 rounded-md shadow-sm">
                  <p className="text-muted-foreground">Eventos no Período:</p>
                  <p className="font-semibold text-lg">{calculateFinancialSummary.totalEvents}</p>
                </div>
                <div className="p-3 bg-background/70 rounded-md shadow-sm">
                  <p className="text-muted-foreground">Valor Bruto dos Eventos:</p>
                  <p className="font-semibold text-lg">{calculateFinancialSummary.totalGrossRevenueOfEvents.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div className="p-3 bg-background/70 rounded-md shadow-sm">
                  <p className="text-muted-foreground">Custos Totais do DJ:</p>
                  <p className="font-semibold text-lg">{calculateFinancialSummary.totalDjCostsInPeriod.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div className="p-3 bg-background/70 rounded-md shadow-sm">
                  <p className="text-muted-foreground">Total Parcela de Serviço DJ:</p>
                  <p className="font-semibold text-lg">{calculateFinancialSummary.totalDjServiceFeeInPeriod.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                   <p className="text-xs text-muted-foreground">(Valor Bruto - Custos) * %DJ</p>
                </div>

                <div className="p-3 bg-background/70 rounded-md shadow-sm">
                  <p className="text-muted-foreground">Valor Líquido Total do DJ:</p>
                  <p className="font-semibold text-lg text-green-700">{calculateFinancialSummary.totalDjNetEntitlementInPeriod.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  <p className="text-xs text-muted-foreground">(Parcela Serviço DJ + Custos)</p>
                </div>
                <div className="p-3 bg-background/70 rounded-md shadow-sm">
                  <p className="text-muted-foreground">Valor Líquido Total da Agência:</p>
                  <p className="font-semibold text-lg text-blue-700">{calculateFinancialSummary.totalAgencyNetEntitlementInPeriod.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  <p className="text-xs text-muted-foreground">(Valor Bruto - Custos) * %Agência</p>
                </div>
                
                <div className="p-3 bg-background/70 rounded-md shadow-sm col-span-1 md:col-span-2 lg:col-span-2 grid grid-cols-2 gap-3">
                    <div>
                        <p className="text-muted-foreground text-orange-600">Agência deve ao DJ:</p>
                        <p className="font-semibold text-lg text-orange-600">
                            {calculateFinancialSummary.sumOwedToDjByAgency.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                        <p className="text-xs text-muted-foreground">(De eventos pagos à Agência)</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-purple-600">DJ deve à Agência:</p>
                        <p className="font-semibold text-lg text-purple-600">
                            {calculateFinancialSummary.sumOwedToAgencyByDj.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                        <p className="text-xs text-muted-foreground">(De eventos pagos ao DJ)</p>
                    </div>
                </div>
                
                <div className={`p-4 rounded-md shadow-md text-center col-span-1 md:col-span-2 lg:col-span-4 ${calculateFinancialSummary.finalBalanceForDj >= 0 ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                    <p className={`font-semibold text-lg ${calculateFinancialSummary.finalBalanceForDj >= 0 ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                        {calculateFinancialSummary.finalBalanceForDj >= 0 ? 'SALDO A RECEBER PELO DJ:' : 'SALDO A REPASSAR PELO DJ:'}
                    </p>
                    <p className={`font-bold text-2xl ${calculateFinancialSummary.finalBalanceForDj >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                        {Math.abs(calculateFinancialSummary.finalBalanceForDj).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {calculateFinancialSummary.finalBalanceForDj > 0 ? 'A agência deve este valor ao DJ.' : calculateFinancialSummary.finalBalanceForDj < 0 ? 'O DJ deve este valor à agência.' : 'Saldo zerado para o período.'}
                    </p>
                </div>
              </CardContent>
            </Card>
          )}
          {selectedDjId === 'all' && (userDetails?.role === 'admin' || userDetails?.role === 'partner') && (
            <Card className="bg-accent/10 border-accent/30 shadow-sm">
              <CardContent className="pt-6">
                <p className="text-center text-accent-foreground/80">
                  <Info className="inline mr-2 h-5 w-5" />
                  Selecione um DJ específico no filtro acima para visualizar o resumo financeiro detalhado.
                </p>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl">Extrato de Eventos</CardTitle>
              <CardDescription>
                {(selectedDjId !== 'all' && djNameToDisplay) 
                  ? `Eventos de ${djNameToDisplay} no período.`
                  : `Todos os eventos no período.`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading && filteredEvents.length === 0 ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2">Carregando eventos...</p>
                </div>
              ) : filteredEvents.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhum evento encontrado para os filtros selecionados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <TooltipProvider>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Evento</TableHead>
                        <TableHead>DJ Atribuído</TableHead>
                        <TableHead className="text-right">Valor Total</TableHead>
                        <TableHead className="text-right">Custos DJ</TableHead>
                        <TableHead className="text-right">
                          <Tooltip>
                            <TooltipTrigger className="cursor-help border-b border-dashed border-muted-foreground">Parcela DJ (Serviço)</TooltipTrigger>
                            <TooltipContent>
                              <p>(Valor Total - Custos) * %DJ</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                        <TableHead>Recebido Por</TableHead>
                        <TableHead>Status Pag. (Cliente)</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEvents.map((event) => {
                        const djForEvent = allDjs.find(d => d.uid === event.dj_id) || (userDetails?.uid === event.dj_id ? userDetails : null);
                        const djPercent = djForEvent?.dj_percentual ?? 0; // Default to 0 if not found, though should exist
                        const djServiceFee = (event.valor_total - (event.dj_costs || 0)) * djPercent;
                        
                        return (
                          <TableRow key={event.id}>
                            <TableCell>{format(event.data_evento, 'dd/MM/yy')}</TableCell>
                            <TableCell className="font-medium max-w-xs truncate" title={event.nome_evento}>{event.nome_evento}</TableCell>
                            <TableCell>{event.dj_nome || 'N/A'}</TableCell>
                            <TableCell className="text-right">{Number(event.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                            <TableCell className="text-right">{Number(event.dj_costs || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                            <TableCell className="text-right font-semibold">{djServiceFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                            <TableCell className="capitalize">{event.conta_que_recebeu}</TableCell>
                            <TableCell>
                              <Badge variant={getStatusVariant(event.status_pagamento)} className="capitalize text-xs">
                                {getStatusText(event.status_pagamento)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="outline" size="sm" onClick={() => handleOpenEventView(event)}>Ver Detalhes</Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  </TooltipProvider>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl">Fechamentos Financeiros</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                A funcionalidade de fechamentos financeiros (para registrar acertos entre agência e DJs) será implementada aqui.
              </p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <Dialog open={isViewEventOpen} onOpenChange={(open) => { setIsViewEventOpen(open); if (!open) setSelectedEventForView(null); }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Evento: {selectedEventForView?.nome_evento}</DialogTitle>
          </DialogHeader>
          <EventView event={selectedEventForView} />
           <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewEventOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentsPage;

