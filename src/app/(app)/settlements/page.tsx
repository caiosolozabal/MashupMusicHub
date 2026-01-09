'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Info, X, AlertTriangle, ArrowLeft } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp, writeBatch, doc } from 'firebase/firestore';
import type { Event, UserDetails, FinancialSettlement } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { Input }from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, getYear, getMonth, startOfMonth, endOfMonth, subDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge, badgeVariants } from '@/components/ui/badge';
import type { VariantProps } from 'class-variance-authority';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { calculateDjCut } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import SettlementDetailView from '@/components/settlements/SettlementDetailView';
import { Label } from '@/components/ui/label';

type ViewMode = 'settlement' | 'detail';

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
        case 'locacao_equipamento':
            return 'Locação';
        case 'servico_dj':
        default:
            return 'Serviço DJ';
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

interface PendingPaymentsInfo {
  totalPending: number;
  totalOverdue: number;
  pendingEvents: Event[];
  overdueEvents: Event[];
}


const months = [
  { value: '0', label: 'Janeiro' }, { value: '1', label: 'Fevereiro' }, { value: '2', label: 'Março' },
  { value: '3', label: 'Abril' }, { value: '4', label: 'Maio' }, { value: '5', label: 'Junho' },
  { value: '6', label: 'Julho' }, { value: '7', label: 'Agosto' }, { value: '8', label: 'Setembro' },
  { value: '9', label: 'Outubro' }, { value: '10', label: 'Novembro' }, { value: '11', label: 'Dezembro' }
];

const getYears = () => {
    const currentYear = getYear(new Date());
    const years = [];
    for (let i = currentYear + 1; i >= currentYear - 5; i--) {
        years.push(i.toString());
    }
    return years;
};

export default function SettlementsPage() {
  const { user, userDetails, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  // State
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [allSettlements, setAllSettlements] = useState<FinancialSettlement[]>([]);
  const [allDjs, setAllDjs] = useState<UserDetails[]>([]);
  
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isLoadingDjs, setIsLoadingDjs] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // UI Mode State
  const [viewMode, setViewMode] = useState<ViewMode>('settlement');
  const [selectedSettlement, setSelectedSettlement] = useState<FinancialSettlement | null>(null);

  // Filters State
  const [selectedDjId, setSelectedDjId] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(getMonth(new Date()).toString());
  const [selectedYear, setSelectedYear] = useState<string>(getYear(new Date()).toString());
  const [showClosedEvents, setShowClosedEvents] = useState(false);
  const availableYears = useMemo(() => getYears(), []);
  
  // Fetch only the list of DJs on initial load for Admins/Partners
  useEffect(() => {
    if (authLoading || !userDetails) return;

    const fetchDjs = async () => {
      if (userDetails.role === 'admin' || userDetails.role === 'partner') {
        setIsLoadingDjs(true);
        try {
          const djsQuery = query(collection(db, 'users'), where('role', '==', 'dj'), orderBy('displayName'));
          const djsSnapshot = await getDocs(djsQuery);
          const djsList = djsSnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserDetails));
          setAllDjs(djsList);
        } catch (error) {
           console.error("Error fetching DJs: ", error);
           toast({ variant: 'destructive', title: 'Erro ao carregar DJs', description: (error as Error).message });
        } finally {
          setIsLoadingDjs(false);
        }
      } else if (userDetails.role === 'dj') {
        setAllDjs([userDetails]);
        setSelectedDjId(userDetails.uid); // Auto-select the logged-in DJ
        setIsLoadingDjs(false);
      }
    };
    
    fetchDjs();
  }, [authLoading, userDetails, toast]);


  // Fetch events and settlements when a DJ is selected
  const fetchDjData = useCallback(async (djId: string) => {
    if (!djId) return;

    setIsLoadingData(true);
    try {
      const eventsQuery = query(collection(db, 'events'), where('dj_id', '==', djId), orderBy('data_evento', 'asc'));
      const settlementsQuery = query(collection(db, 'settlements'), where('djId', '==', djId), orderBy('generatedAt', 'desc'));

      const [eventsSnapshot, settlementsSnapshot] = await Promise.all([
        getDocs(eventsQuery),
        getDocs(settlementsQuery)
      ]);

      const eventsList = eventsSnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          ...data,
          data_evento: data.data_evento instanceof Timestamp ? data.data_evento.toDate() : new Date(data.data_evento),
          dj_costs: data.dj_costs ?? 0,
          tipo_servico: data.tipo_servico || 'servico_dj',
        } as Event;
      });

      const settlementsList = settlementsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FinancialSettlement));

      setAllEvents(eventsList);
      setAllSettlements(settlementsList);
    } catch (error) {
      console.error("Error fetching DJ data: ", error);
      toast({ variant: 'destructive', title: 'Erro ao carregar dados do DJ', description: (error as Error).message });
    } finally {
      setIsLoadingData(false);
    }
  }, [toast]);
  
  // Trigger data fetch when selectedDjId changes
  useEffect(() => {
    if (selectedDjId) {
      fetchDjData(selectedDjId);
    } else {
      // Clear data if no DJ is selected
      setAllEvents([]);
      setAllSettlements([]);
    }
  }, [selectedDjId, fetchDjData]);

  
  useEffect(() => {
    if (selectedYear && selectedMonth) {
        const year = parseInt(selectedYear, 10);
        const month = parseInt(selectedMonth, 10);
        const start = startOfMonth(new Date(year, month));
        const end = endOfMonth(new Date(year, month));
        setDateRange({ from: start, to: end });
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
      // When dateRange is changed manually, reset month/year selectors
      if (dateRange) {
        const from = dateRange.from;
        if(from) {
          if (!selectedYear || !selectedMonth || getYear(from) !== parseInt(selectedYear, 10) || getMonth(from) !== parseInt(selectedMonth, 10)) {
              setSelectedYear(undefined);
              setSelectedMonth(undefined);
          }
        }
      }
  }, [dateRange, selectedMonth, selectedYear]);

  // Filter logic
  const { filteredEvents, djSettlements } = useMemo(() => {
    let eventsToFilter = [...allEvents];

    if (dateRange?.from) {
      const fromDate = startOfDay(dateRange.from);
      const toDate = dateRange.to ? new Date(dateRange.to) : new Date(8640000000000000); // Far future date if no end
      toDate.setHours(23, 59, 59, 999);
      eventsToFilter = eventsToFilter.filter(event => event.data_evento >= fromDate && event.data_evento <= toDate);
    }

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      eventsToFilter = eventsToFilter.filter(event => 
        event.nome_evento.toLowerCase().includes(lowerSearchTerm) ||
        (event.contratante_nome && event.contratante_nome.toLowerCase().includes(lowerSearchTerm)) ||
        event.local.toLowerCase().includes(lowerSearchTerm)
      );
    }
    
    // Main filter for open/closed events
    const finalFilteredEvents = eventsToFilter.filter(event => {
        if (showClosedEvents) return true; // Show all if checkbox is checked
        return !event.settlementId; // Otherwise, show only open events
    });

    return { filteredEvents: finalFilteredEvents, djSettlements: allSettlements };
  }, [allEvents, allSettlements, dateRange, searchTerm, showClosedEvents]);

  const pendingPaymentsInfo = useMemo<PendingPaymentsInfo | null>(() => {
    if (!selectedDjId) return null;

    const today = startOfDay(new Date());
    const overdueLimitDate = subDays(today, 15);
    
    const pendingEvents = allEvents.filter(event => 
        event.data_evento < today && 
        event.status_pagamento !== 'pago' && 
        event.status_pagamento !== 'cancelado'
    );
    
    const overdueEvents = pendingEvents.filter(event => event.data_evento < overdueLimitDate);

    if (pendingEvents.length === 0) {
        return null;
    }

    return {
        totalPending: pendingEvents.length,
        totalOverdue: overdueEvents.length,
        pendingEvents,
        overdueEvents,
    };
  }, [allEvents, selectedDjId]);


  // Reset selected events if the main filtered list changes
  useEffect(() => {
    const filteredIds = new Set(filteredEvents.map(e => e.id));
    setSelectedEventIds(prev => prev.filter(id => filteredIds.has(id)));
  }, [filteredEvents]);


  const eventsForCalculation = useMemo(() => {
    return filteredEvents.filter(event => selectedEventIds.includes(event.id) && !event.settlementId);
  }, [selectedEventIds, filteredEvents]);


  const handleSelectEvent = (eventId: string) => {
    setSelectedEventIds(prev =>
      prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEventIds(filteredEvents.filter(e => !e.settlementId).map(e => e.id));
    } else {
      setSelectedEventIds([]);
    }
  };

  const financialSummary = useMemo<FinancialSummary | null>(() => {
    if (!selectedDjId || eventsForCalculation.length === 0) return null;

    const selectedDj = allDjs.find(dj => dj.uid === selectedDjId);
    if (!selectedDj) return null;
    
    const hasDjPercent = typeof selectedDj.dj_percentual === 'number';
    const hasRentalPercent = typeof selectedDj.rental_percentual === 'number';

    if (!hasDjPercent && !hasRentalPercent) {
        if (userDetails?.role !== 'dj') { 
            toast({
                variant: "destructive",
                title: "Cálculo Interrompido",
                description: `O DJ ${selectedDj?.displayName} não possui percentuais de serviço ou locação definidos.`
            });
        }
        return null;
    }

    let totalBruto = 0;
    let totalCustos = 0;
    let parcelaDjTotal = 0;
    let totalRecebidoPeloDj = 0;

    for (const event of eventsForCalculation) {
      if (event.status_pagamento === 'cancelado') continue;
      
      totalBruto += event.valor_total;
      totalCustos += event.dj_costs || 0;
      
      const djCutForEvent = calculateDjCut(event, selectedDj);
      parcelaDjTotal += djCutForEvent;
      
      if (event.conta_que_recebeu === 'dj') {
        totalRecebidoPeloDj += event.valor_total;
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
  }, [eventsForCalculation, selectedDjId, allDjs, toast, userDetails]);

  const handleGenerateSettlement = async () => {
    if (!user || !financialSummary || eventsForCalculation.length === 0 || !selectedDjId) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não é possível gerar o fechamento. Verifique os dados.'});
      return;
    }
    setIsSubmitting(true);

    const selectedDj = allDjs.find(dj => dj.uid === selectedDjId);
    if (!selectedDj) {
        toast({ variant: 'destructive', title: 'Erro', description: 'DJ selecionado não encontrado.'});
        setIsSubmitting(false);
        return;
    }

    const batch = writeBatch(db);

    // 1. Create the new settlement document
    const settlementRef = doc(collection(db, 'settlements'));
    const newSettlement: Omit<FinancialSettlement, 'id'> = {
      djId: selectedDj.uid,
      djName: selectedDj.displayName || '',
      djDetails: {
        bankName: selectedDj.bankName || null,
        bankAgency: selectedDj.bankAgency || null,
        bankAccount: selectedDj.bankAccount || null,
        bankAccountType: selectedDj.bankAccountType || null,
        bankDocument: selectedDj.bankDocument || null,
        pixKey: selectedDj.pixKey || null,
      },
      periodStart: dateRange?.from ? Timestamp.fromDate(dateRange.from) : null,
      periodEnd: dateRange?.to ? Timestamp.fromDate(dateRange.to) : null,
      events: eventsForCalculation.map(e => e.id),
      summary: {
        totalEvents: eventsForCalculation.length,
        grossRevenue: financialSummary.totalBruto,
        djNetEntitlement: financialSummary.parcelaDjTotal,
        totalReceivedByDj: financialSummary.totalRecebidoPeloDj,
        finalBalance: financialSummary.saldoFinal,
      },
      status: 'pending',
      generatedAt: Timestamp.now(),
      generatedBy: user.uid,
    };
    batch.set(settlementRef, newSettlement);

    // 2. Update each selected event to link it to the new settlement
    for (const event of eventsForCalculation) {
      const eventRef = doc(db, 'events', event.id);
      batch.update(eventRef, { settlementId: settlementRef.id });
    }

    // 3. Commit the batch
    try {
      await batch.commit();
      toast({
        title: 'Fechamento Gerado!',
        description: `O fechamento para ${selectedDj.displayName} foi criado com sucesso.`
      });
      // Refetch data to show the updated list of "open" events
      fetchDjData(selectedDjId);
      // Clear selections after successful generation
      setSelectedEventIds([]);
    } catch (error) {
      console.error("Error generating settlement:", error);
      toast({ variant: 'destructive', title: 'Erro ao Gerar Fechamento', description: (error as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewSettlement = (settlement: FinancialSettlement) => {
    setSelectedSettlement(settlement);
    setViewMode('detail');
  };

  const handleReturnToSettlementMode = () => {
    setSelectedSettlement(null);
    setViewMode('settlement');
  };


  if (authLoading) {
    return (
        <div className="flex flex-col justify-center items-center h-64 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Carregando...</p>
        </div>
    );
  }
  
  if (!userDetails || !['admin', 'partner', 'dj'].includes(userDetails.role!)) {
     return (
         <Card>
            <CardHeader>
                <CardTitle>Acesso Restrito</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Você não tem permissão para acessar esta página.</p>
            </CardContent>
        </Card>
     )
  }

  const isActionAllowed = userDetails?.role === 'admin' || userDetails?.role === 'partner';
  const selectedDjName = allDjs.find(dj => dj.uid === selectedDjId)?.displayName;

  if (viewMode === 'detail' && selectedSettlement) {
    return (
        <SettlementDetailView 
            settlement={selectedSettlement}
            events={allEvents.filter(e => selectedSettlement.events.includes(e.id))}
            onBack={handleReturnToSettlementMode}
        />
    )
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <CardTitle className="font-headline text-2xl">Fechamentos</CardTitle>
                <CardDescription>
                  {isActionAllowed
                    ? 'Selecione um DJ, o período e os eventos para gerar um novo fechamento ou consultar o histórico.'
                    : 'Visualize seus eventos, fechamentos e resumos financeiros.'
                  }
                </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-end">
            {isActionAllowed && (
              <div className="space-y-2 xl:col-span-1">
                  <Label htmlFor='dj-select'>DJ *</Label>
                  <Select inputId='dj-select' value={selectedDjId} onValueChange={setSelectedDjId} disabled={isLoadingDjs}>
                      <SelectTrigger>
                      <SelectValue placeholder={isLoadingDjs ? "Carregando..." : "Selecione o DJ"} />
                      </SelectTrigger>
                      <SelectContent>
                      {allDjs.map(dj => (
                          <SelectItem key={dj.uid} value={dj.uid}>{dj.displayName || dj.email}</SelectItem>
                      ))}
                      {!isLoadingDjs && allDjs.length === 0 && <SelectItem value="no-djs" disabled>Nenhum DJ cadastrado</SelectItem>}
                      </SelectContent>
                  </Select>
              </div>
            )}
             <div className="space-y-2 xl:col-span-1">
                <Label>Mês</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={!selectedYear}>
                    <SelectTrigger><SelectValue placeholder="Mês" /></SelectTrigger>
                    <SelectContent>
                        {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                </Select>
             </div>
             <div className="space-y-2 xl:col-span-1">
                <Label>Ano</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger><SelectValue placeholder="Ano" /></SelectTrigger>
                    <SelectContent>
                        {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2 xl:col-span-1">
              <Label>ou Período Manual</Label>
              <div className="flex items-center gap-1">
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
                {dateRange && (
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setDateRange(undefined)}>
                        <X className="h-4 w-4" />
                    </Button>
                )}
              </div>
            </div>
            <div className="space-y-2 xl:col-span-1">
              <Label>Buscar Evento</Label>
              <Input 
                placeholder="Nome, contratante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {selectedDjId && pendingPaymentsInfo && pendingPaymentsInfo.totalPending > 0 && isActionAllowed && (
             <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Atenção: Pagamentos Pendentes!</AlertTitle>
                <AlertDescription>
                    Este DJ possui <span className="font-bold">{pendingPaymentsInfo.totalPending}</span> evento(s) com pagamento pendente, dos quais <span className="font-bold">{pendingPaymentsInfo.totalOverdue}</span> estão em atraso (+15 dias).
                </AlertDescription>
            </Alert>
          )}

          {selectedDjId && financialSummary && (
            <Card className="mb-6 bg-secondary/50">
              <CardHeader>
                 <CardTitle className="text-xl">Resumo do Fechamento</CardTitle>
                 <CardDescription>
                    Resumo para {selectedDjName} com base nos {eventsForCalculation.length} eventos selecionados.
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
                                    <p className="text-xs max-w-xs">Fórmula: ((Valor Total - Custos) * % do Serviço) + Custos. O percentual varia com o tipo de serviço (DJ ou Locação).</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <p className="text-lg font-bold">{financialSummary.parcelaDjTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor que o DJ Recebeu</p>
                    <p className="text-lg font-bold">{financialSummary.totalRecebidoPeloDj.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>
                   <div className={`p-2 rounded-md ${financialSummary.saldoFinal >= 0 ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'}`}>
                    <p className="text-sm font-semibold">{financialSummary.saldoFinal >= 0 ? 'A Agência PAGA' : 'O DJ PAGA'}</p>
                    <p className={`text-xl font-bold ${financialSummary.saldoFinal >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                      {Math.abs(financialSummary.saldoFinal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                </div>
                 {isActionAllowed && (
                    <div className="flex justify-end pt-4">
                        <Button 
                          onClick={handleGenerateSettlement}
                          disabled={eventsForCalculation.length === 0 || isSubmitting}
                        >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Gerar Fechamento
                        </Button>
                    </div>
                 )}
              </CardContent>
            </Card>
          )}

          <Separator className="my-4" />

          <div className="space-y-4">
            <h3 className="font-headline text-lg">Eventos</h3>
            <div className="flex items-center space-x-2">
                <Checkbox id="show-closed" checked={showClosedEvents} onCheckedChange={(checked) => setShowClosedEvents(checked as boolean)} />
                <Label htmlFor="show-closed">Visualizar eventos fechados / anteriores no período</Label>
            </div>
            {isLoadingData ? (
                <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-2">Carregando eventos...</p>
                </div>
            ) : !selectedDjId ? (
                <p className="text-muted-foreground text-center py-8">
                {isActionAllowed ? 'Por favor, selecione um DJ para visualizar os eventos.' : 'Carregando seus dados...'}
                </p>
            ) : filteredEvents.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhum evento encontrado para os filtros selecionados.</p>
            ) : (
                <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px]">
                        {isActionAllowed && (
                            <Checkbox
                            checked={selectedEventIds.length === filteredEvents.filter(e => !e.settlementId).length && filteredEvents.filter(e => !e.settlementId).length > 0}
                            onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                            aria-label="Selecionar todos"
                            />
                        )}
                        </TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Evento</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status Pag.</TableHead>
                        <TableHead>Recebido por</TableHead>
                        <TableHead>Valor Total</TableHead>
                        <TableHead>Custos DJ</TableHead>
                        <TableHead>Parcela DJ (Apurado)</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {filteredEvents.map((event) => {
                        const djData = allDjs.find(dj => dj.uid === event.dj_id);
                        const parcelaDj = calculateDjCut(event, djData);
                        const isSettled = !!event.settlementId;

                        return(
                        <TableRow key={event.id} data-state={selectedEventIds.includes(event.id) ? 'selected' : ''} className={isSettled ? 'bg-muted/30' : ''}>
                            <TableCell>
                            {isActionAllowed && !isSettled && (
                                <Checkbox
                                checked={selectedEventIds.includes(event.id)}
                                onCheckedChange={() => handleSelectEvent(event.id)}
                                aria-label={`Selecionar evento ${event.nome_evento}`}
                                />
                            )}
                            </TableCell>
                            <TableCell>
                            <div className="font-medium">{format(event.data_evento, 'dd/MM/yyyy')}</div>
                            </TableCell>
                            <TableCell className="font-medium">{event.nome_evento}</TableCell>
                            <TableCell>
                            <Badge variant="secondary" className="text-xs whitespace-nowrap">{getServiceTypeText(event.tipo_servico)}</Badge>
                            </TableCell>
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
          </div>

          <Separator className="my-6" />

          <div className="space-y-4">
             <h3 className="font-headline text-lg">Histórico de Fechamentos</h3>
             {isLoadingData ? (
                 <p className="text-muted-foreground">Carregando histórico...</p>
             ) : !selectedDjId ? (
                 <p className="text-muted-foreground text-center py-4">{isActionAllowed ? 'Selecione um DJ para ver o histórico.' : ''}</p>
             ) : djSettlements.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Nenhum fechamento encontrado para este DJ.</p>
             ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {djSettlements.map(settlement => (
                        <Button 
                            key={settlement.id} 
                            variant="outline" 
                            className="justify-between h-auto py-2 px-3"
                            onClick={() => handleViewSettlement(settlement)}
                        >
                            <div className="flex flex-col items-start">
                                <span className="text-sm font-semibold">
                                    Fechamento {format(settlement.generatedAt.toDate(), 'dd/MM/yy')}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {settlement.summary.totalEvents} eventos
                                </span>
                            </div>
                             <Badge variant={settlement.status === 'paid' ? 'default' : 'secondary'} className="capitalize text-xs">
                                {settlement.status === 'paid' ? 'Pago' : 'Pendente'}
                            </Badge>
                        </Button>
                    ))}
                </div>
             )}
          </div>

        </CardContent>
      </Card>
    </div>
  );
}

    
    