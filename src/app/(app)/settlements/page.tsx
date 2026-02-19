'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, Info, X, AlertTriangle, ArrowLeft, CheckCircle2, FileDown, Calculator, Trash2, UserCheck } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp, writeBatch, doc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import type { Event, UserDetails, FinancialSettlement } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { Input }from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, getYear, getMonth, startOfMonth, endOfMonth, subDays, isEqual } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge, badgeVariants } from '@/components/ui/badge';
import type { VariantProps } from 'class-variance-authority';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { calculateDjCut, cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import SettlementDetailView from '@/components/settlements/SettlementDetailView';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { generateSettlementPdf } from '@/components/settlements/SettlementPDFDocument';


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

const getButtonStatusVariant = (status?: Event['status_pagamento']): VariantProps<typeof buttonVariants>['variant'] => {
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
  { value: '0', label: 'Jan' }, { value: '1', label: 'Fev' }, { value: '2', label: 'Mar' },
  { value: '3', label: 'Abr' }, { value: '4', label: 'Mai' }, { value: '5', label: 'Jun' },
  { value: '6', label: 'Jul' }, { value: '7', label: 'Ago' }, { value: '8', label: 'Set' },
  { value: '9', label: 'Out' }, { value: '10', label: 'Nov' }, { value: '11', label: 'Dez' }
];

const getYears = () => {
    const currentYear = new Date().getFullYear();
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
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>(undefined);
  const [selectedYear, setSelectedYear] = useState<string | undefined>(undefined);
  const [showClosedEvents, setShowClosedEvents] = useState(false);
  const [availableYears, setAvailableYears] = useState<string[]>([]);

  // Defer initialization to avoid hydration error
  useEffect(() => {
    const now = new Date();
    setSelectedMonth(getMonth(now).toString());
    setSelectedYear(getYear(now).toString());
    setDateRange({
      from: startOfMonth(now),
      to: endOfMonth(now),
    });
    setAvailableYears(getYears());
  }, []);

  const isActionAllowed = userDetails?.role === 'admin' || userDetails?.role === 'partner';
  
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
  const fetchDjData = useCallback(async (djIdToFetch: string) => {
    if (!djIdToFetch) return;

    setIsLoadingData(true);
    try {
      const eventsQuery = query(collection(db, 'events'), where('dj_id', '==', djIdToFetch), orderBy('data_evento', 'asc'));
      const settlementsQuery = query(collection(db, 'settlements'), where('djId', '==', djIdToFetch), orderBy('generatedAt', 'desc'));

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

  // Sync dateRange when month/year dropdowns are used
  useEffect(() => {
    if (selectedYear && selectedMonth) {
      const year = parseInt(selectedYear, 10);
      const month = parseInt(selectedMonth, 10);
      const newFrom = startOfMonth(new Date(year, month));
      const newTo = endOfMonth(new Date(year, month));

      // Only update dateRange if it's different to prevent loops
      if (!dateRange || !isEqual(dateRange.from || 0, newFrom) || !isEqual(dateRange.to || 0, newTo)) {
        setDateRange({ from: newFrom, to: newTo });
      }
    }
  }, [selectedMonth, selectedYear, dateRange]);

  // When dateRange is changed MANUALLY (e.g., by calendar picker),
  // clear month/year dropdowns to indicate a custom range is active.
  const handleDateRangeChange = (newRange: DateRange | undefined) => {
    setDateRange(newRange);
    setSelectedMonth(undefined);
    setSelectedYear(undefined);
  }

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
  
  const handleStatusUpdate = async (eventId: string, newStatus: Event['status_pagamento']) => {
    if (!isActionAllowed) {
        toast({ variant: 'destructive', title: 'Acesso Negado', description: "Você não tem permissão para alterar o status." });
        return;
    }

    const originalEvents = [...allEvents];
    const eventToUpdate = originalEvents.find(e => e.id === eventId);
    
    if (!eventToUpdate) return;

    // Optimistic UI Update
    setAllEvents(prev => prev.map(e => e.id === eventId ? { ...e, status_pagamento: newStatus } : e));

    try {
        const eventRef = doc(db, 'events', eventId);
        await updateDoc(eventRef, {
            status_pagamento: newStatus,
            updated_at: serverTimestamp(),
        });
        toast({
            title: 'Status Atualizado!',
            description: `O evento "${eventToUpdate.nome_evento}" foi atualizado para "${getStatusText(newStatus)}".`
        });
    } catch (error) {
        // Revert on error
        setAllEvents(originalEvents);
        console.error("Error updating status: ", error);
        toast({ variant: 'destructive', title: 'Erro ao atualizar', description: (error as Error).message });
    }
  };

  const handleAccountUpdate = async (eventId: string, newAccount: 'agencia' | 'dj') => {
    if (!isActionAllowed) return;
    
    setAllEvents(prev => prev.map(e => e.id === eventId ? { ...e, conta_que_recebeu: newAccount } : e));

    try {
        const eventRef = doc(db, 'events', eventId);
        await updateDoc(eventRef, {
            conta_que_recebeu: newAccount,
            updated_at: serverTimestamp(),
        });
        toast({ title: 'Conta de Recebimento Atualizada' });
    } catch (error) {
        fetchDjData(selectedDjId);
        console.error("Error updating account: ", error);
        toast({ variant: 'destructive', title: 'Erro ao atualizar', description: (error as Error).message });
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

  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [finalPaidValue, setFinalPaidValue] = useState<number>(0);
  const [settlementNotes, setSettlementNotes] = useState('');
  const [confirmedManualAjust, setConfirmedManualAjust] = useState(false);

  // Open confirmation dialog
  const handleOpenConfirmDialog = () => {
    if (!financialSummary) return;
    setFinalPaidValue(financialSummary.saldoFinal);
    setSettlementNotes('');
    setConfirmedManualAjust(false);
    setIsConfirmDialogOpen(true);
  };

  const handleGenerateSettlement = async () => {
    if (!user || !financialSummary || eventsForCalculation.length === 0 || !selectedDjId) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não é possível gerar o fechamento.'});
      return;
    }

    const isAdjusted = finalPaidValue !== financialSummary.saldoFinal;
    if (isAdjusted && (!settlementNotes.trim() || !confirmedManualAjust)) {
        toast({ variant: 'destructive', title: 'Campos Obrigatórios', description: 'Justifique o ajuste manual e marque o checkbox de confirmação.'});
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
        finalPaidValue: finalPaidValue,
        deltaValue: finalPaidValue - financialSummary.saldoFinal,
      },
      notes: settlementNotes || null,
      status: 'paid', // Irreversible
      generatedAt: Timestamp.now(),
      generatedBy: user.uid,
      generatedByName: userDetails?.displayName || user.email,
    };
    batch.set(settlementRef, newSettlement);

    for (const event of eventsForCalculation) {
      const eventRef = doc(db, 'events', event.id);
      batch.update(eventRef, { settlementId: settlementRef.id });
    }

    try {
      await batch.commit();
      toast({
        title: 'Fechamento Realizado!',
        description: `O fechamento para ${selectedDj.displayName} foi concluído.`
      });
      
      // Automatic PDF Generation option
      await generateSettlementPdf({ id: settlementRef.id, ...newSettlement } as FinancialSettlement, eventsForCalculation);

      setIsConfirmDialogOpen(false);
      fetchDjData(selectedDjId);
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

  const handleDeleteSettlement = async (settlement: FinancialSettlement) => {
    if (!isActionAllowed) return;
    setIsSubmitting(true);
    try {
        const batch = writeBatch(db);
        
        // 1. Delete Settlement
        batch.delete(doc(db, 'settlements', settlement.id));
        
        // 2. Unlink events
        for (const eventId of settlement.events) {
            batch.update(doc(db, 'events', eventId), { settlementId: null });
        }
        
        await batch.commit();
        toast({ title: 'Fechamento Excluído', description: 'Os eventos foram liberados para novo fechamento.' });
        fetchDjData(selectedDjId);
        handleReturnToSettlementMode();
    } catch (error) {
        console.error("Error deleting settlement:", error);
        toast({ variant: 'destructive', title: 'Erro ao excluir fechamento', description: (error as Error).message });
    } finally {
        setIsSubmitting(false);
    }
  };


  if (authLoading || !selectedMonth) {
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

  const isDj = userDetails?.role === 'dj';
  const selectedDjName = allDjs.find(dj => dj.uid === selectedDjId)?.displayName;
  const isAdjusted = financialSummary && finalPaidValue !== financialSummary.saldoFinal;
  const delta = financialSummary ? finalPaidValue - financialSummary.saldoFinal : 0;

  if (viewMode === 'detail' && selectedSettlement) {
    return (
        <SettlementDetailView 
            settlement={selectedSettlement}
            events={allEvents.filter(e => selectedSettlement.events.includes(e.id))}
            onBack={handleReturnToSettlementMode}
            onDelete={() => handleDeleteSettlement(selectedSettlement)}
            isDeleting={isSubmitting}
        />
    )
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-lg">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
            <div>
                <CardTitle className="font-headline text-xl sm:text-2xl">Fechamentos</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {isActionAllowed
                    ? 'Selecione um DJ e o período para gerar um fechamento.'
                    : 'Visualize seus eventos e simule fechamentos.'
                  }
                </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 items-end">
            {isActionAllowed && (
              <div className="space-y-1 xl:col-span-1">
                  <Label htmlFor='dj-select' className="text-xs font-semibold">DJ *</Label>
                  <Select inputId='dj-select' value={selectedDjId} onValueChange={setSelectedDjId} disabled={isLoadingDjs}>
                      <SelectTrigger className="h-9">
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
             <div className="grid grid-cols-2 gap-2 sm:col-span-1 xl:col-span-1">
                <div className="space-y-1">
                    <Label className="text-xs font-semibold">Mês</Label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Mês" /></SelectTrigger>
                        <SelectContent>
                            {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1">
                    <Label className="text-xs font-semibold">Ano</Label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Ano" /></SelectTrigger>
                        <SelectContent>
                            {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
             </div>
            <div className="space-y-1 xl:col-span-1">
              <Label className="text-xs font-semibold">ou Período Manual</Label>
              <div className="flex items-center gap-1">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                          id="date"
                          variant={"outline"}
                          className="w-full h-9 justify-start text-left font-normal text-xs"
                        >
                          <CalendarIcon className="mr-2 h-3 w-3" />
                          {dateRange?.from ? (
                              dateRange.to ? (
                              <>{format(dateRange.from, "dd/MM/yy")} - {format(dateRange.to, "dd/MM/yy")}</>
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
                          onSelect={handleDateRangeChange}
                          numberOfMonths={isDj ? 1 : 2}
                        />
                    </PopoverContent>
                </Popover>
                {dateRange && (
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleDateRangeChange(undefined)}>
                        <X className="h-4 w-4" />
                    </Button>
                )}
              </div>
            </div>
            <div className="space-y-1 xl:col-span-1">
              <Label className="text-xs font-semibold">Buscar Evento</Label>
              <Input 
                placeholder="Nome, contratante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {selectedDjId && pendingPaymentsInfo && pendingPaymentsInfo.totalPending > 0 && isActionAllowed && (
             <Alert variant="destructive" className="mb-4 py-2 px-3">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="text-sm font-bold">Pagamentos Pendentes!</AlertTitle>
                <AlertDescription className="text-xs">
                    Este DJ possui <span className="font-bold">{pendingPaymentsInfo.totalPending}</span> evento(s) pendentes (<span className="font-bold">{pendingPaymentsInfo.totalOverdue}</span> em atraso).
                </AlertDescription>
            </Alert>
          )}

          {selectedDjId && financialSummary && (
            <Card className="mb-4 bg-secondary/50 border-primary/10">
              <CardHeader className="p-3 pb-2">
                 <CardTitle className="text-sm font-bold">Resumo do Fechamento</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 text-center">
                  <div className="bg-background/50 p-1.5 rounded-md border border-border/50">
                    <p className="text-[10px] text-muted-foreground uppercase">Eventos</p>
                    <p className="text-sm font-bold">{eventsForCalculation.length}</p>
                  </div>
                  <div className="bg-background/50 p-1.5 rounded-md border border-border/50">
                    <p className="text-[10px] text-muted-foreground uppercase">Bruto</p>
                    <p className="text-sm font-bold">{financialSummary.totalBruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>
                  <div className="bg-background/50 p-1.5 rounded-md border border-border/50">
                    <p className="text-[10px] text-muted-foreground uppercase">Cachê DJ</p>
                    <p className="text-sm font-bold">{financialSummary.parcelaDjTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>
                  <div className="bg-background/50 p-1.5 rounded-md border border-border/50">
                    <p className="text-[10px] text-muted-foreground uppercase">Rec. p/ DJ</p>
                    <p className="text-sm font-bold">{financialSummary.totalRecebidoPeloDj.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>
                   <div className={`p-1.5 rounded-md ${financialSummary.saldoFinal >= 0 ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'} border border-primary/10`}>
                    <p className="text-[10px] font-bold uppercase">{financialSummary.saldoFinal >= 0 ? 'Agência Paga' : 'DJ Paga'}</p>
                    <p className={`text-sm font-black ${financialSummary.saldoFinal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {Math.abs(financialSummary.saldoFinal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                </div>
                 {isActionAllowed && (
                    <div className="flex justify-end">
                        <Button 
                          size="sm"
                          onClick={handleOpenConfirmDialog}
                          disabled={eventsForCalculation.length === 0 || isSubmitting}
                          className="h-8 text-xs font-bold"
                        >
                            {isSubmitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                            Gerar Fechamento
                        </Button>
                    </div>
                 )}
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-headline text-base font-bold">Eventos do Período</h3>
                <div className="flex items-center space-x-2">
                    <Checkbox id="show-closed" checked={showClosedEvents} onCheckedChange={(checked) => setShowClosedEvents(checked as boolean)} />
                    <Label htmlFor="show-closed" className="text-[10px] leading-none cursor-pointer">Ver fechados/anteriores</Label>
                </div>
            </div>
            {isLoadingData ? (
                <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-2 text-sm">Carregando...</p>
                </div>
            ) : !selectedDjId ? (
                <p className="text-muted-foreground text-center py-8 text-sm">
                {isActionAllowed ? 'Selecione um DJ para visualizar os eventos.' : 'Carregando seus dados...'}
                </p>
            ) : filteredEvents.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 text-sm">Nenhum evento encontrado.</p>
            ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                <Table>
                    <TableHeader>
                    <TableRow className="hover:bg-transparent h-8">
                        <TableHead className="w-[40px] px-2">
                        {(isActionAllowed || isDj) && (
                            <Checkbox
                            checked={selectedEventIds.length > 0 && selectedEventIds.length === filteredEvents.filter(e => !e.settlementId).length}
                            onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                            aria-label="Selecionar todos"
                            />
                        )}
                        </TableHead>
                        <TableHead className="px-2 text-[10px] uppercase font-black">Data</TableHead>
                        <TableHead className="px-2 text-[10px] uppercase font-black">Evento</TableHead>
                        <TableHead className="px-2 text-[10px] uppercase font-black">Status</TableHead>
                        <TableHead className="px-2 text-[10px] uppercase font-black text-right">Total</TableHead>
                        <TableHead className="px-2 text-[10px] uppercase font-black text-right">Cachê DJ</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {filteredEvents.map((event) => {
                        const djData = allDjs.find(dj => dj.uid === event.dj_id);
                        const parcelaDj = calculateDjCut(event, djData);
                        const isSettled = !!event.settlementId;

                        return(
                        <TableRow key={event.id} data-state={selectedEventIds.includes(event.id) ? 'selected' : ''} className={cn("h-10 hover:bg-muted/30 transition-colors", isSettled ? 'bg-muted/20 opacity-60' : '')}>
                            <TableCell className="px-2">
                            {(isActionAllowed || isDj) && !isSettled && (
                                <Checkbox
                                checked={selectedEventIds.includes(event.id)}
                                onCheckedChange={() => handleSelectEvent(event.id)}
                                aria-label={`Selecionar evento ${event.nome_evento}`}
                                />
                            )}
                            </TableCell>
                            <TableCell className="px-2 whitespace-nowrap">
                                <div className="font-bold text-[11px]">{format(event.data_evento, 'dd/MM/yy')}</div>
                            </TableCell>
                            <TableCell className="px-2">
                                <div className="font-semibold text-[11px] line-clamp-1">{event.nome_evento}</div>
                                <div className="text-[9px] text-muted-foreground capitalize">{event.conta_que_recebeu === 'agencia' ? 'Agência' : 'DJ'}</div>
                            </TableCell>
                            <TableCell className="px-2">
                                {isActionAllowed ? (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant={getButtonStatusVariant(event.status_pagamento)} className="h-5 text-[9px] px-1.5 font-bold uppercase">
                                                {getStatusText(event.status_pagamento)}
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onSelect={() => handleStatusUpdate(event.id, 'pendente')}>Pendente</DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => handleStatusUpdate(event.id, 'parcial')}>Parcial</DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => handleStatusUpdate(event.id, 'pago')}>Pago</DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => handleStatusUpdate(event.id, 'vencido')}>Vencido</DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onSelect={() => handleAccountUpdate(event.id, event.conta_que_recebeu === 'agencia' ? 'dj' : 'agencia')}>Alterar Recebimento</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ) : (
                                    <Badge variant={getStatusVariant(event.status_pagamento)} className="h-5 text-[9px] px-1.5 font-bold uppercase">
                                        {getStatusText(event.status_pagamento)}
                                    </Badge>
                                )}
                            </TableCell>
                            <TableCell className="px-2 text-right text-[11px] font-medium">
                                {Number(event.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </TableCell>
                            <TableCell className="px-2 text-right text-[11px] font-black text-primary">
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

          <Separator className="my-4" />

          <div className="space-y-3">
             <h3 className="font-headline text-base font-bold">Histórico de Fechamentos</h3>
             {isLoadingData ? (
                 <p className="text-xs text-muted-foreground">Carregando histórico...</p>
             ) : !selectedDjId ? (
                 <p className="text-xs text-muted-foreground text-center py-4">{isActionAllowed ? 'Selecione um DJ para ver o histórico.' : ''}</p>
             ) : djSettlements.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum fechamento encontrado.</p>
             ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {djSettlements.map(settlement => (
                        <Card 
                            key={settlement.id} 
                            className="hover:border-primary transition-colors cursor-pointer group shadow-sm flex flex-col"
                            onClick={() => handleViewSettlement(settlement)}
                        >
                            <CardHeader className="p-3 pb-1 space-y-0.5">
                                <div className="flex justify-between items-start gap-1">
                                    <span className="text-[10px] font-black truncate">
                                        {format(settlement.generatedAt.toDate(), 'dd/MM/yy')}
                                    </span>
                                    <Badge variant={settlement.status === 'paid' ? 'default' : 'secondary'} className="text-[8px] h-4 px-1 leading-none uppercase">
                                        {settlement.status === 'paid' ? 'Pago' : 'Pend'}
                                    </Badge>
                                </div>
                                <span className="text-[8px] text-muted-foreground uppercase font-bold">
                                    {settlement.summary?.totalEvents || 0} eventos
                                </span>
                            </CardHeader>
                            <CardContent className="p-3 pt-0 mt-auto">
                                <p className="text-xs font-black text-primary">
                                    {(settlement.summary?.finalPaidValue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
             )}
          </div>

        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="p-6 pb-2">
                <DialogTitle className="text-2xl font-headline">Confirmar Fechamento</DialogTitle>
                <DialogDescription>
                    Revise os eventos e ajuste o valor final se necessário. Esta ação é irreversível.
                </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-hidden p-6 pt-0 space-y-6">
                {/* DJ & Payment Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/20">
                    <div className="space-y-1">
                        <Label className="text-muted-foreground">DJ Responsável</Label>
                        <p className="font-bold text-lg">{selectedDjName}</p>
                        <p className="text-sm text-muted-foreground">
                            Período: {selectedMonth && selectedYear ? `${months.find(m => m.value === selectedMonth)?.label} / ${selectedYear}` : 'Período Manual'}
                        </p>
                    </div>
                    <div className="space-y-1 md:border-l md:pl-4">
                        <Label className="text-muted-foreground">Dados de Pagamento</Label>
                        {allDjs.find(d => d.uid === selectedDjId)?.pixKey ? (
                            <p className="font-medium flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                PIX: {allDjs.find(d => d.uid === selectedDjId)?.pixKey}
                            </p>
                        ) : allDjs.find(d => d.uid === selectedDjId)?.bankName ? (
                            <div className="text-sm">
                                <p className="font-medium">{allDjs.find(d => d.uid === selectedDjId)?.bankName}</p>
                                <p>Ag: {allDjs.find(d => d.uid === selectedDjId)?.bankAgency} Conta: {allDjs.find(d => d.uid === selectedDjId)?.bankAccount}</p>
                            </div>
                        ) : (
                            <p className="text-sm text-destructive font-medium">Dados bancários não cadastrados no perfil.</p>
                        )}
                    </div>
                </div>

                {/* Events Read-Only List */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">Eventos Selecionados ({eventsForCalculation.length})</Label>
                        <Badge variant="outline">{financialSummary?.totalBruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} Bruto</Badge>
                    </div>
                    <div className="border rounded-md">
                        <ScrollArea className="h-[200px]">
                            <Table>
                                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                                    <TableRow>
                                        <TableHead className="py-2">Data</TableHead>
                                        <TableHead className="py-2">Evento</TableHead>
                                        <TableHead className="py-2">Local</TableHead>
                                        <TableHead className="py-2">Recebimento</TableHead>
                                        <TableHead className="py-2">Status Cli.</TableHead>
                                        <TableHead className="py-2 text-right">Cachê DJ</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {eventsForCalculation.map(event => {
                                        const djData = allDjs.find(dj => dj.uid === event.dj_id);
                                        const parcelaDj = calculateDjCut(event, djData);
                                        return (
                                            <TableRow key={event.id}>
                                                <TableCell className="py-2 text-xs">{format(event.data_evento, 'dd/MM/yy')}</TableCell>
                                                <TableCell className="py-2 font-medium text-xs truncate max-w-[150px]">{event.nome_evento}</TableCell>
                                                <TableCell className="py-2 text-xs truncate max-w-[120px]">{event.local}</TableCell>
                                                <TableCell className="py-2 text-[10px] capitalize">{event.conta_que_recebeu === 'agencia' ? 'Agência' : 'DJ'}</TableCell>
                                                <TableCell className="py-2">
                                                    <Badge variant={getStatusVariant(event.status_pagamento)} className="text-[10px] px-1.5 h-5">
                                                        {getStatusText(event.status_pagamento)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-2 text-right font-medium text-xs">
                                                    {parcelaDj.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>
                </div>

                {/* Adjustments and Notes */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4 md:col-span-1">
                        <div className="space-y-2">
                            <Label htmlFor="calc-val">Valor Calculado pelo Sistema</Label>
                            <div className="relative">
                                <Calculator className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input id="calc-val" disabled value={financialSummary?.saldoFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} className="pl-9 bg-muted/50 font-bold" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="final-val" className={isAdjusted ? "text-primary font-bold" : ""}>Valor Final a Pagar / Receber</Label>
                            <Input 
                                id="final-val" 
                                type="number" 
                                step="0.01" 
                                value={finalPaidValue} 
                                onChange={(e) => setFinalPaidValue(Number(e.target.value))}
                                className={cn("text-lg font-bold h-12", isAdjusted && "border-primary ring-1 ring-primary")}
                            />
                            <p className="text-[10px] text-muted-foreground leading-tight">
                                <strong>Positivo (+):</strong> Agência paga ao DJ. <br/>
                                <strong>Negativo (-):</strong> DJ paga à agência.
                            </p>
                        </div>
                        {isAdjusted && (
                            <div className={cn("p-2 rounded-md text-center", delta > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800")}>
                                <p className="text-xs font-semibold">Diferença (Delta)</p>
                                <p className="text-lg font-bold">{delta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4 md:col-span-2">
                        <div className="space-y-2">
                            <Label htmlFor="settlement-notes" className={isAdjusted ? "after:content-['*'] after:ml-0.5 after:text-destructive" : ""}>
                                Observações do Fechamento
                            </Label>
                            <Textarea 
                                id="settlement-notes" 
                                placeholder={isAdjusted ? "Explique o motivo do ajuste manual (ex: taxa extra, desconto combinado...)" : "Notas opcionais sobre este fechamento..."}
                                className="min-h-[120px]"
                                value={settlementNotes}
                                onChange={(e) => setSettlementNotes(e.target.value)}
                            />
                        </div>
                        {isAdjusted && (
                            <div className="flex items-center space-x-2 pt-2 bg-primary/5 p-3 rounded-md border border-primary/20">
                                <Checkbox id="confirm-ajust" checked={confirmedManualAjust} onCheckedChange={(checked) => setConfirmedManualAjust(checked as boolean)} />
                                <Label htmlFor="confirm-ajust" className="text-xs leading-none cursor-pointer">
                                    Confirmo que revisei os eventos e o ajuste manual de <span className="font-bold">{Math.abs(delta).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>.
                                </Label>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <DialogFooter className="p-6 bg-muted/10 border-t gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)} disabled={isSubmitting}>Cancelar</Button>
                <Button 
                    onClick={handleGenerateSettlement} 
                    disabled={isSubmitting || (isAdjusted && (!settlementNotes.trim() || !confirmedManualAjust))}
                    className="bg-primary hover:bg-primary/90 min-w-[180px]"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processando...
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Confirmar Fechamento
                        </>
                    )}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}