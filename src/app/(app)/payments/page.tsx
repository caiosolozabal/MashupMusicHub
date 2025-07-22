
'use client';

import type { NextPage } from 'next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge, badgeVariants } from '@/components/ui/badge';
import type { Event, UserDetails, FinancialSettlement } from '@/lib/types';
import { format, startOfMonth, endOfMonth, subDays, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { CalendarIcon, Search, Loader2, Info, FileText, CheckCircle, AlertCircle, Clock, Trash2 } from 'lucide-react';
import type { VariantProps } from 'class-variance-authority';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, Timestamp, addDoc, serverTimestamp, writeBatch, doc, deleteDoc } from 'firebase/firestore';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import jsPDF from 'jspdf';
import 'jspdf-autotable';


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
  grossRevenueInPeriod: number;
  djNetEntitlementInPeriod: number;
  agencyNetEntitlementInPeriod: number;
  totalReceivedByDjInPeriod: number;
  totalReceivedByAgencyInPeriod: number;
  djFinalBalanceInPeriod: number;
}


const PaymentsPage: NextPage = () => {
  const { user, userDetails, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [events, setEvents] = useState<Event[]>([]);
  const [settlements, setSettlements] = useState<FinancialSettlement[]>([]);
  const [djs, setDjs] = useState<UserDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isViewEventOpen, setIsViewEventOpen] = useState(false);
  const [selectedEventForView, setSelectedEventForView] = useState<Event | null>(null);
  const [isConfirmSettlementOpen, setIsConfirmSettlementOpen] = useState(false);
  const [isConfirmRevertOpen, setIsConfirmRevertOpen] = useState(false);
  const [selectedSettlementForRevert, setSelectedSettlementForRevert] = useState<FinancialSettlement | null>(null);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDjId, setSelectedDjId] = useState<string>('all'); 
  const [activeQuickFilter, setActiveQuickFilter] = useState<string>('month');

  const fetchAllData = useCallback(async () => {
    if (authLoading || !user || !userDetails) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);

    try {
        if (!db) throw new Error("Firestore not initialized");

        const dataPromises = [];

        // Base queries for events and settlements
        const eventsQuery = query(collection(db, 'events'), orderBy('data_evento', 'desc'));
        const settlementsQuery = query(collection(db, 'settlements'), orderBy('generatedAt', 'desc'));
        dataPromises.push(getDocs(eventsQuery), getDocs(settlementsQuery));

        // Add DJ query only if admin/partner
        if (userDetails.role === 'admin' || userDetails.role === 'partner') {
            const djsQuery = query(collection(db, 'users'), where('role', '==', 'dj'), orderBy('displayName'));
            dataPromises.push(getDocs(djsQuery));
        }
        
        const results = await Promise.all(dataPromises);
        
        const eventsSnapshot = results[0];
        let eventsList = eventsSnapshot.docs.map(docSnapshot => {
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

        const settlementsSnapshot = results[1];
        let settlementsList = settlementsSnapshot.docs.map(docSnapshot => {
            const data = docSnapshot.data();
            return {
                id: docSnapshot.id,
                ...data,
                periodStart: (data.periodStart as Timestamp).toDate(),
                periodEnd: (data.periodEnd as Timestamp).toDate(),
                generatedAt: (data.generatedAt as Timestamp).toDate(),
            } as FinancialSettlement;
        });

        if (userDetails.role === 'dj') {
            eventsList = eventsList.filter(e => e.dj_id === user.uid);
            settlementsList = settlementsList.filter(s => s.djId === user.uid);
            setSelectedDjId(user.uid);
        }

        setEvents(eventsList);
        setSettlements(settlementsList);

        if (userDetails.role === 'admin' || userDetails.role === 'partner') {
            const djsSnapshot = results[2];
            const djsList = djsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserDetails));
            setDjs(djsList);
        }

    } catch (error: any) {
        console.error("Error fetching financial data:", error);
        toast({ variant: 'destructive', title: 'Erro ao buscar dados', description: error.message });
    } finally {
        setIsLoading(false);
    }
  }, [user, userDetails, authLoading, toast]);
  

  useEffect(() => {
    if (!authLoading && user && userDetails) {
        fetchAllData();
    } else if (!authLoading && !user) {
        setEvents([]);
        setSettlements([]);
        setDjs([]);
        setIsLoading(false);
    }
  }, [user, userDetails, authLoading, fetchAllData]);

  const filteredEventsForSettlement = useMemo(() => {
    let eventsToFilter = [...events];
    
    // Only unsettled events are available for new settlements
    eventsToFilter = eventsToFilter.filter(event => !event.settlementId && event.status_pagamento !== 'cancelado');
    
    // Filter by DJ if one is selected (for admins)
    if (userDetails?.role !== 'dj' && selectedDjId !== 'all') {
        eventsToFilter = eventsToFilter.filter(event => event.dj_id === selectedDjId);
    }

    // Filter by date range
    if (dateRange?.from && dateRange?.to) {
       eventsToFilter = eventsToFilter.filter(event => isWithinInterval(event.data_evento, { start: dateRange.from!, end: dateRange.to! }));
    }
    
    // Filter by search term
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      eventsToFilter = eventsToFilter.filter(event =>
        event.nome_evento.toLowerCase().includes(lowerSearch) ||
        event.contratante_nome.toLowerCase().includes(lowerSearch) ||
        event.local.toLowerCase().includes(lowerSearch)
      );
    }
    return eventsToFilter;
  }, [events, dateRange, searchTerm, selectedDjId, userDetails]);

  const filteredSettlements = useMemo(() => {
    if (selectedDjId === 'all' && userDetails?.role !== 'dj') {
      return [];
    }
    const djId = userDetails?.role === 'dj' ? userDetails.uid : selectedDjId;
    return settlements.filter(s => s.djId === djId);
  }, [settlements, selectedDjId, userDetails]);


  const calculateFinancialSummary = useMemo((): FinancialSummary | null => {
    let djForSummary: UserDetails | undefined = undefined;

    if (userDetails?.role === 'dj') {
      djForSummary = userDetails;
    } else if ((userDetails?.role === 'admin' || userDetails?.role === 'partner') && selectedDjId !== 'all') {
      djForSummary = djs.find(dj => dj.uid === selectedDjId);
    }

    if (!djForSummary || typeof djForSummary.dj_percentual !== 'number') return null;

    const djBasePercentage = djForSummary.dj_percentual;

    const summary: FinancialSummary = {
      totalEvents: 0,
      grossRevenueInPeriod: 0,
      djNetEntitlementInPeriod: 0,
      agencyNetEntitlementInPeriod: 0,
      totalReceivedByDjInPeriod: 0,
      totalReceivedByAgencyInPeriod: 0,
      djFinalBalanceInPeriod: 0,
    };
    
    // We use filteredEventsForSettlement as it already contains the correct events for the summary
    filteredEventsForSettlement.forEach(event => {
      summary.totalEvents += 1;
      summary.grossRevenueInPeriod += event.valor_total;
      
      const djCosts = event.dj_costs || 0;
      const valueAfterDjCosts = event.valor_total - djCosts;

      const djEntitlementForEvent = (valueAfterDjCosts * djBasePercentage) + djCosts;
      summary.djNetEntitlementInPeriod += djEntitlementForEvent;

      const agencyEntitlementForEvent = valueAfterDjCosts * (1 - djBasePercentage);
      summary.agencyNetEntitlementInPeriod += agencyEntitlementForEvent;
      
      if (event.conta_que_recebeu === 'dj') {
        summary.totalReceivedByDjInPeriod += event.valor_total;
      }
      if (event.conta_que_recebeu === 'agencia') {
        summary.totalReceivedByAgencyInPeriod += event.valor_total;
      }
    });

    summary.djFinalBalanceInPeriod = summary.djNetEntitlementInPeriod - summary.totalReceivedByDjInPeriod;
    
    return summary;
  }, [filteredEventsForSettlement, userDetails, selectedDjId, djs]);


  const handleCreateSettlement = async () => {
    if (!user || !db || selectedDjId === 'all' || !dateRange?.from || !dateRange?.to || !calculateFinancialSummary || filteredEventsForSettlement.length === 0) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Selecione um DJ, um período completo e certifique-se que há eventos a serem fechados.' });
        return;
    }
    setIsSubmitting(true);
    const dj = djs.find(d => d.uid === selectedDjId);
    if (!dj) {
        toast({ variant: 'destructive', title: 'Erro', description: 'DJ selecionado não encontrado.' });
        setIsSubmitting(false);
        return;
    }

    const newSettlement: Omit<FinancialSettlement, 'id' | 'generatedAt'> & { generatedAt: any } = {
        djId: selectedDjId,
        djName: dj.displayName || dj.email || 'N/A',
        djDetails: {
            bankName: dj.bankName || null,
            bankAgency: dj.bankAgency || null,
            bankAccount: dj.bankAccount || null,
            bankAccountType: dj.bankAccountType || null,
            bankDocument: dj.bankDocument || null,
            pixKey: dj.pixKey || null,
        },
        periodStart: Timestamp.fromDate(dateRange.from),
        periodEnd: Timestamp.fromDate(dateRange.to),
        events: filteredEventsForSettlement,
        summary: {
            totalEvents: calculateFinancialSummary.totalEvents,
            grossRevenueInPeriod: calculateFinancialSummary.grossRevenueInPeriod,
            djNetEntitlementInPeriod: calculateFinancialSummary.djNetEntitlementInPeriod,
            totalReceivedByDjInPeriod: calculateFinancialSummary.totalReceivedByDjInPeriod,
            djFinalBalanceInPeriod: calculateFinancialSummary.djFinalBalanceInPeriod,
        },
        status: 'pending',
        generatedBy: user.uid,
        generatedAt: serverTimestamp(),
    };

    try {
        const settlementsCollection = collection(db, 'settlements');
        const settlementRef = await addDoc(settlementsCollection, newSettlement);
        
        const batch = writeBatch(db);
        filteredEventsForSettlement.forEach(event => {
            const eventRef = doc(db, 'events', event.id);
            batch.update(eventRef, { settlementId: settlementRef.id });
        });
        await batch.commit();

        toast({ title: 'Sucesso!', description: `Fechamento para ${dj.displayName} gerado com sucesso.` });
        fetchAllData(); 
    } catch (error) {
        console.error("Error creating settlement: ", error);
        toast({ variant: 'destructive', title: 'Erro ao gerar fechamento', description: (error as Error).message });
    } finally {
        setIsSubmitting(false);
        setIsConfirmSettlementOpen(false);
    }
  };


  const generatePdf = (settlement: FinancialSettlement) => {
    const doc = new jsPDF();
    const djDetails = settlement.djDetails;

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Fechamento Financeiro - Mashup Music', 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${format(settlement.periodStart instanceof Timestamp ? settlement.periodStart.toDate() : settlement.periodStart, 'dd/MM/yyyy')} a ${format(settlement.periodEnd instanceof Timestamp ? settlement.periodEnd.toDate() : settlement.periodEnd, 'dd/MM/yyyy')}`, 105, 30, { align: 'center' });
    doc.text(`Gerado em: ${format(settlement.generatedAt instanceof Timestamp ? settlement.generatedAt.toDate() : settlement.generatedAt, 'dd/MM/yyyy HH:mm')}`, 105, 36, { align: 'center' });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`DJ: ${settlement.djName}`, 14, 50);

    doc.setFontSize(12);
    let y = 60;
    const summary = settlement.summary;
    const addLine = (label: string, value: string) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(value, 90, y);
        y += 7;
    };
    addLine('Total de Eventos no Período:', `${summary.totalEvents}`);
    addLine('Valor Bruto dos Eventos:', `${summary.grossRevenueInPeriod.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
    addLine('Valor Líquido Apurado para o DJ:', `${summary.djNetEntitlementInPeriod.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
    addLine('Total Recebido Diretamente pelo DJ:', `${summary.totalReceivedByDjInPeriod.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
    
    y += 3;
    doc.setLineWidth(0.5);
    doc.line(14, y, 196, y);
    y += 7;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const balanceText = summary.djFinalBalanceInPeriod >= 0 ? 'SALDO A RECEBER PELO DJ:' : 'SALDO A REPASSAR PELO DJ:';
    doc.text(balanceText, 14, y);
    doc.text(`${Math.abs(summary.djFinalBalanceInPeriod).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 196, y, { align: 'right' });
    y += 15;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Eventos Incluídos no Fechamento', 14, y);
    y += 10;
    
    const tableHeaders = [['Data', 'Evento', 'Valor Total', 'Recebido Por']];
    const tableData = settlement.events.map(event => [
        format(event.data_evento instanceof Timestamp ? event.data_evento.toDate() : event.data_evento, 'dd/MM/yy'),
        event.nome_evento,
        Number(event.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        event.conta_que_recebeu === 'agencia' ? 'Agência' : 'DJ'
    ]);

    (doc as any).autoTable({
      startY: y,
      head: tableHeaders,
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [157, 78, 221], textColor: [255,255,255], fontStyle: 'bold' },
      styles: { fontSize: 9 },
    });
    
    y = (doc as any).lastAutoTable.finalY + 20;

    if (djDetails?.bankName) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Dados para Pagamento (DJ):', 14, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.text(`Banco: ${djDetails.bankName || ''}`, 14, y);
        y += 5;
        doc.text(`Agência: ${djDetails.bankAgency || ''} / Conta ${djDetails.bankAccountType || ''}: ${djDetails.bankAccount || ''}`, 14, y);
        y += 5;
        doc.text(`Documento: ${djDetails.bankDocument || ''}`, 14, y);
        y += 5;
        doc.text(`Chave PIX: ${djDetails.pixKey || ''}`, 14, y);
    }
    
    y = doc.internal.pageSize.height - 30;
    doc.line(40, y, 170, y);
    doc.text('Assinatura do Responsável (Agência)', 105, y + 5, { align: 'center'});


    doc.save(`Fechamento_${settlement.djName}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const handleDeleteSettlement = async () => {
        if (!selectedSettlementForRevert || !db) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Nenhum fechamento selecionado.' });
            return;
        }
        setIsSubmitting(true);
        try {
            const batch = writeBatch(db);

            selectedSettlementForRevert.events.forEach(event => {
                const eventRef = doc(db, 'events', event.id);
                batch.update(eventRef, { settlementId: null });
            });

            const settlementRef = doc(db, 'settlements', selectedSettlementForRevert.id);
            batch.delete(settlementRef);

            await batch.commit();

            toast({ title: 'Fechamento Revertido!', description: 'Os eventos foram liberados e o fechamento foi excluído.' });
            fetchAllData(); 
        } catch (error) {
            console.error("Error reverting settlement: ", error);
            toast({ variant: 'destructive', title: 'Erro ao reverter', description: (error as Error).message });
        } finally {
            setIsSubmitting(false);
            setIsConfirmRevertOpen(false);
            setSelectedSettlementForRevert(null);
        }
    };

    const handleOpenRevertDialog = (settlement: FinancialSettlement) => {
        setSelectedSettlementForRevert(settlement);
        setIsConfirmRevertOpen(true);
    };


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


  if (authLoading || isLoading) {
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
    : (djs.find(dj => dj.uid === selectedDjId)?.displayName || djs.find(dj => dj.uid === selectedDjId)?.email);

  const canGenerateSettlement = userDetails?.role === 'admin' || userDetails?.role === 'partner';

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
                <Select value={selectedDjId} onValueChange={setSelectedDjId} disabled={isLoading}>
                  <SelectTrigger id="dj-filter-payments" className="bg-background">
                    <SelectValue placeholder={isLoading ? "Carregando DJs..." : "Selecione um DJ"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Ver todos os eventos (sem resumo)</SelectItem>
                    {djs.map(dj => (
                      <SelectItem key={dj.uid} value={dj.uid}>{dj.displayName || dj.email}</SelectItem>
                    ))}
                    {!isLoading && djs.length === 0 && <SelectItem value="no-djs" disabled>Nenhum DJ cadastrado</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          
          {showDetailedSummary && calculateFinancialSummary && djNameToDisplay && (
            <Card className="bg-primary/5 border-primary/20 shadow-md">
              <CardHeader>
                <CardTitle className="font-headline text-xl text-primary">
                    Resumo Financeiro: {djNameToDisplay} ({calculateFinancialSummary.totalEvents} eventos para fechar)
                </CardTitle>
                <CardDescription>Referente ao período e filtros selecionados. Apenas eventos ainda não inclusos em fechamentos anteriores são considerados.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-background/70 rounded-md shadow-sm">
                  <p className="text-muted-foreground">1. Valor Bruto dos Eventos (Período):</p>
                  <p className="font-semibold text-lg">{calculateFinancialSummary.grossRevenueInPeriod.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div className="p-3 bg-background/70 rounded-md shadow-sm">
                  <p className="text-muted-foreground">2. Valor Líquido DJ (Apurado):</p>
                  <p className="font-semibold text-lg text-green-700">{calculateFinancialSummary.djNetEntitlementInPeriod.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                   <p className="text-xs text-muted-foreground">(Valor Bruto - Custos) * %DJ + Custos</p>
                </div>
                <div className="p-3 bg-background/70 rounded-md shadow-sm">
                  <p className="text-muted-foreground">3. Valor Líquido Agência (Apurado):</p>
                  <p className="font-semibold text-lg text-blue-700">{calculateFinancialSummary.agencyNetEntitlementInPeriod.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                   <p className="text-xs text-muted-foreground">(Valor Bruto - Custos) * %Agência</p>
                </div>
                
                <div className="p-3 bg-background/70 rounded-md shadow-sm">
                  <p className="text-muted-foreground">4. Total Recebido pelo DJ (Registrado):</p>
                  <p className="font-semibold text-lg text-orange-600">
                      {calculateFinancialSummary.totalReceivedByDjInPeriod.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                  <p className="text-xs text-muted-foreground">(Soma dos VTs de eventos pagos ao DJ)</p>
                </div>
                <div className="p-3 bg-background/70 rounded-md shadow-sm">
                  <p className="text-muted-foreground">5. Total Recebido pela Agência (Registrado):</p>
                  <p className="font-semibold text-lg text-purple-600">
                      {calculateFinancialSummary.totalReceivedByAgencyInPeriod.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                  <p className="text-xs text-muted-foreground">(Soma dos VTs de eventos pagos à Agência)</p>
                </div>
                
                <div className={`p-4 rounded-md shadow-md text-center col-span-1 md:col-span-2 lg:col-span-1 flex flex-col justify-center items-center
                                 ${calculateFinancialSummary.djFinalBalanceInPeriod >= 0 ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                    <p className={`font-semibold text-md ${calculateFinancialSummary.djFinalBalanceInPeriod >= 0 ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                        {calculateFinancialSummary.djFinalBalanceInPeriod >= 0 ? '6. SALDO A RECEBER PELO DJ:' : '6. SALDO A REPASSAR PELO DJ:'}
                    </p>
                    <p className={`font-bold text-2xl ${calculateFinancialSummary.djFinalBalanceInPeriod >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                        {Math.abs(calculateFinancialSummary.djFinalBalanceInPeriod).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        (Valor Líquido DJ (2) - Valor Recebido pelo DJ (4))
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
                  Selecione um DJ específico no filtro acima para visualizar o resumo financeiro detalhado e gerar fechamentos.
                </p>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl">Extrato de Eventos para Fechamento</CardTitle>
              <CardDescription>
                {showDetailedSummary && djNameToDisplay
                  ? `Eventos de ${djNameToDisplay} no período que ainda não foram fechados.`
                  : `Selecione um DJ para ver os eventos.`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading && filteredEventsForSettlement.length === 0 ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2">Carregando eventos...</p>
                </div>
              ) : filteredEventsForSettlement.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhum evento pendente de fechamento para os filtros selecionados.</p>
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
                            <TooltipTrigger className="cursor-help border-b border-dashed border-muted-foreground">Parcela DJ (Apurado)</TooltipTrigger>
                            <TooltipContent>
                              <p>(Valor Total - Custos) * %DJ + Custos</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                        <TableHead>Recebido Por</TableHead>
                        <TableHead>Status Pag. (Cliente)</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEventsForSettlement.map((event) => {
                        const djForEvent = djs.find(d => d.uid === event.dj_id) || (userDetails?.uid === event.dj_id ? userDetails : null);
                        const djPercent = djForEvent?.dj_percentual ?? 0; 
                        const djCosts = event.dj_costs || 0;
                        const djEntitlementForEvent = (event.valor_total - djCosts) * djPercent + djCosts;
                        
                        return (
                          <TableRow key={event.id}>
                            <TableCell>{format(event.data_evento, 'dd/MM/yy')}</TableCell>
                            <TableCell className="font-medium max-w-xs truncate" title={event.nome_evento}>{event.nome_evento}</TableCell>
                            <TableCell>{event.dj_nome || 'N/A'}</TableCell>
                            <TableCell className="text-right">{Number(event.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                            <TableCell className="text-right">{Number(djCosts).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                            <TableCell className="text-right font-semibold">{djEntitlementForEvent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
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
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-headline text-xl">Histórico de Fechamentos</CardTitle>
                <CardDescription>
                  {selectedDjId !== 'all' ? `Fechamentos anteriores para ${djNameToDisplay}.` : 'Selecione um DJ para ver o histórico.'}
                </CardDescription>
              </div>
              {canGenerateSettlement && selectedDjId !== 'all' && dateRange?.from && dateRange?.to && filteredEventsForSettlement.length > 0 && (
                 <Button onClick={() => setIsConfirmSettlementOpen(true)} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                    Gerar Fechamento
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {selectedDjId === 'all' && userDetails?.role !== 'dj' ? (
                 <p className="text-muted-foreground text-center py-8">Selecione um DJ para ver o histórico de fechamentos.</p>
              ) : isLoading ? (
                 <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-2">Carregando histórico...</p>
                 </div>
              ) : filteredSettlements.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhum fechamento encontrado para este DJ.</p>
              ) : (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data Geração</TableHead>
                                <TableHead>Período</TableHead>
                                <TableHead className="text-right">Saldo Final</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredSettlements.map((settlement) => (
                                <TableRow key={settlement.id}>
                                    <TableCell>{format(settlement.generatedAt instanceof Timestamp ? settlement.generatedAt.toDate() : settlement.generatedAt, 'dd/MM/yy HH:mm')}</TableCell>
                                    <TableCell>{`${format(settlement.periodStart instanceof Timestamp ? settlement.periodStart.toDate() : settlement.periodStart, 'dd/MM/yy')} - ${format(settlement.periodEnd instanceof Timestamp ? settlement.periodEnd.toDate() : settlement.periodEnd, 'dd/MM/yy')}`}</TableCell>
                                    <TableCell className={`text-right font-semibold ${settlement.summary.djFinalBalanceInPeriod >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {settlement.summary.djFinalBalanceInPeriod.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={settlement.status === 'paid' ? 'default' : 'secondary'}>
                                            {settlement.status === 'pending' && <Clock className="mr-1 h-3 w-3" />}
                                            {settlement.status === 'paid' && <CheckCircle className="mr-1 h-3 w-3" />}
                                            {settlement.status === 'disputed' && <AlertCircle className="mr-1 h-3 w-3" />}
                                            <span className="capitalize">{settlement.status === 'pending' ? 'Pendente' : settlement.status}</span>
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right space-x-1">
                                        <Button variant="outline" size="sm" onClick={() => generatePdf(settlement)}>
                                            <FileText className="mr-2 h-4 w-4" />
                                            PDF
                                        </Button>
                                         {canGenerateSettlement && (
                                            <Button variant="destructive" size="sm" onClick={() => handleOpenRevertDialog(settlement)} disabled={isSubmitting}>
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Reverter
                                            </Button>
                                         )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
              )}
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
      
      <AlertDialog open={isConfirmSettlementOpen} onOpenChange={setIsConfirmSettlementOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Geração de Fechamento</AlertDialogTitle>
                <AlertDialogDescription>
                    Você está prestes a gerar um fechamento para <strong>{djNameToDisplay}</strong> no período de <strong>{dateRange?.from ? format(dateRange.from, 'dd/MM/yy') : ''}</strong> a <strong>{dateRange?.to ? format(dateRange.to, 'dd/MM/yy') : ''}</strong>.
                    <br/><br/>
                    Isso marcará <strong>{filteredEventsForSettlement.length} eventos</strong> como "fechados" e eles não aparecerão em cálculos futuros. Esta ação pode ser revertida.
                    <br/><br/>
                    O saldo final para o DJ é de <strong className={calculateFinancialSummary?.djFinalBalanceInPeriod ?? 0 >= 0 ? 'text-green-600' : 'text-red-600'}>{calculateFinancialSummary?.djFinalBalanceInPeriod.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>.
                    <br/><br/>
                    Deseja continuar?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleCreateSettlement} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Confirmar e Gerar
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       <AlertDialog open={isConfirmRevertOpen} onOpenChange={setIsConfirmRevertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Reversão de Fechamento</AlertDialogTitle>
                <AlertDialogDescription>
                    Tem certeza que deseja reverter este fechamento?
                    <br/><br/>
                    Esta ação irá <strong>excluir o registro do fechamento</strong> e <strong>liberar todos os {selectedSettlementForRevert?.events.length || 0} eventos associados</strong> para que possam ser incluídos em um novo cálculo.
                    <br/><br/>
                    Esta ação não pode ser desfeita.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setSelectedSettlementForRevert(null)} disabled={isSubmitting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                    onClick={handleDeleteSettlement}
                    disabled={isSubmitting}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Sim, Reverter
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default PaymentsPage;

    