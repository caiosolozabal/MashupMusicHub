
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { 
  BarChart, 
  Loader2, 
  ClipboardList, 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight,
  Info,
  TrendingUp,
  TrendingDown,
  Target,
  Wallet,
  CalendarDays,
  Eye,
  CheckCircle2,
  MapPin,
  Clock,
  PlusCircle,
  CalendarCheck
} from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  Timestamp, 
  orderBy, 
  limit, 
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import type { Event, Task, UserDetails } from '@/lib/types';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  isSameDay, 
  getYear, 
  getMonth,
  startOfWeek,
  addWeeks,
  isToday,
  isTomorrow
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { calculateDjCut, cn } from '@/lib/utils';
import { queryMyOpenTasks, queryMyAssignedOpenTasks } from '@/lib/tasks';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import EventView from '@/components/events/EventView';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface FinancialMetrics {
  grossRevenue: number;
  netRevenue: number;
  received: number;
  pending: number;
  eventCount: number;
  avgTicket: number;
}

const months = [
  { value: '0', label: 'Janeiro' }, { value: '1', label: 'Fevereiro' }, { value: '2', label: 'Março' },
  { value: '3', label: 'Abril' }, { value: '4', label: 'Maio' }, { value: '5', label: 'Junho' },
  { value: '6', label: 'Julho' }, { value: '7', label: 'Agosto' }, { value: '8', label: 'Setembro' },
  { value: '9', label: 'Outubro' }, { value: '10', label: 'Novembro' }, { value: '11', label: 'Dezembro' }
];

const currentYearValue = new Date().getFullYear();
const VALID_YEARS = Array.from({ length: 5 }, (_, i) => currentYearValue - 2 + i);

export default function DashboardPage() {
  const { user, userDetails, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number>(getMonth(new Date()));
  const [selectedYear, setSelectedYear] = useState<number>(getYear(new Date()));
  
  const [monthEvents, setMonthEvents] = useState<Event[]>([]);
  const [prevMonthEvents, setPrevMonthEvents] = useState<Event[]>([]);
  const [allDjs, setAllDjs] = useState<UserDetails[]>([]);
  
  // Weekly Events State
  const [weeklyEvents, setWeeklyEvents] = useState<Event[]>([]);
  const [isLoadingWeekly, setIsLoadingWeekly] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [ownerTasks, setOwnerTasks] = useState<Task[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);

  const isStaff = userDetails?.role === 'admin' || userDetails?.role === 'partner';

  // Buscar lista de DJs para cálculo do faturamento líquido (apenas staff)
  useEffect(() => {
    if (isStaff && !authLoading) {
      const fetchDjs = async () => {
        const q = query(collection(db, 'users'), where('role', '==', 'dj'));
        const snap = await getDocs(q);
        setAllDjs(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserDetails)));
      };
      fetchDjs();
    }
  }, [isStaff, authLoading]);

  // Carregar dados financeiros (Competência)
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !userDetails) return;
      setIsLoading(true);

      try {
        const currentStart = startOfMonth(new Date(selectedYear, selectedMonth));
        const currentEnd = endOfMonth(new Date(selectedYear, selectedMonth));
        const prevStart = startOfMonth(subMonths(currentStart, 1));
        const prevEnd = endOfMonth(subMonths(currentStart, 1));

        const eventsRef = collection(db, 'events');
        
        let qCurrent = query(
          eventsRef,
          where('data_evento', '>=', Timestamp.fromDate(currentStart)),
          where('data_evento', '<=', Timestamp.fromDate(currentEnd))
        );
        
        let qPrev = query(
          eventsRef,
          where('data_evento', '>=', Timestamp.fromDate(prevStart)),
          where('data_evento', '<=', Timestamp.fromDate(prevEnd))
        );

        if (userDetails.role === 'dj') {
          qCurrent = query(qCurrent, where('dj_id', '==', user.uid));
          qPrev = query(qPrev, where('dj_id', '==', user.uid));
        }

        const [currSnap, prevSnap] = await Promise.all([
          getDocs(qCurrent),
          getDocs(qPrev)
        ]);

        const mapDocToEvent = (doc: any) => ({
          id: doc.id,
          ...doc.data(),
          data_evento: doc.data().data_evento.toDate()
        } as Event);

        setMonthEvents(currSnap.docs.map(mapDocToEvent));
        setPrevMonthEvents(prevSnap.docs.map(mapDocToEvent));

      } catch (error: any) {
        console.error("Dashboard finance error:", error);
        toast({ variant: 'destructive', title: 'Erro ao carregar dados financeiros' });
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading && user) fetchData();
  }, [selectedMonth, selectedYear, user, userDetails, authLoading, toast]);

  // Query Real-time para Eventos da Semana
  useEffect(() => {
    if (!user || !userDetails) return;

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = addWeeks(weekStart, 1);

    setIsLoadingWeekly(true);
    const eventsRef = collection(db, 'events');
    
    let weeklyQ = query(
      eventsRef,
      where('data_evento', '>=', Timestamp.fromDate(weekStart)),
      where('data_evento', '<', Timestamp.fromDate(weekEnd)),
      orderBy('data_evento', 'asc')
    );

    if (userDetails.role === 'dj') {
      weeklyQ = query(weeklyQ, where('dj_id', '==', user.uid));
    }

    const unsubscribe = onSnapshot(weeklyQ, (snapshot) => {
      const list = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          data_evento: doc.data().data_evento.toDate()
        } as Event))
        .filter(e => e.status_pagamento !== 'cancelado');
      
      setWeeklyEvents(list);
      setIsLoadingWeekly(false);
    }, (error) => {
      console.error("Weekly events error:", error);
      setIsLoadingWeekly(false);
    });

    return () => unsubscribe();
  }, [user, userDetails]);

  // Carregar Tarefas
  useEffect(() => {
    if (!authLoading && user) {
      getDocs(queryMyOpenTasks(user.uid)).then(snap => {
        setOwnerTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
      });
      getDocs(queryMyAssignedOpenTasks(user.uid)).then(snap => {
        setAssignedTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
      });
    }
  }, [user, authLoading]);

  const calculateMetrics = (events: Event[]): FinancialMetrics => {
    let metrics = { grossRevenue: 0, netRevenue: 0, received: 0, pending: 0, eventCount: 0, avgTicket: 0 };
    
    events.filter(e => e.status_pagamento !== 'cancelado').forEach(event => {
      metrics.eventCount++;
      metrics.grossRevenue += event.valor_total;
      
      if (isStaff) {
        const dj = allDjs.find(d => d.uid === event.dj_id);
        const djCut = calculateDjCut(event, dj);
        metrics.netRevenue += (event.valor_total - djCut);
      }

      if (event.status_pagamento === 'pago') {
        metrics.received += event.valor_total;
      } else if (event.status_pagamento === 'parcial') {
        metrics.received += (event.valor_sinal || 0);
      }
    });

    metrics.pending = metrics.grossRevenue - metrics.received;
    metrics.avgTicket = metrics.eventCount > 0 ? metrics.grossRevenue / metrics.eventCount : 0;
    
    return metrics;
  };

  const currentMetrics = useMemo(() => {
    if (isStaff && allDjs.length === 0 && monthEvents.length > 0) return null;
    return calculateMetrics(monthEvents);
  }, [monthEvents, allDjs, isStaff]);

  const prevMetrics = useMemo(() => {
    if (isStaff && allDjs.length === 0 && prevMonthEvents.length > 0) return null;
    return calculateMetrics(prevMonthEvents);
  }, [prevMonthEvents, allDjs, isStaff]);

  const tasksSummary = useMemo(() => {
    const all = [...ownerTasks, ...assignedTasks];
    const map = new Map<string, Task>();
    all.forEach(t => map.set(t.id, t));
    const merged = Array.from(map.values());
    const now = new Date();
    return {
      total: merged.length,
      overdue: merged.filter(t => t.dueDate.toDate() < now).length,
      today: merged.filter(t => isSameDay(t.dueDate.toDate(), now)).length,
      topTasks: merged.sort((a, b) => a.dueDate.toMillis() - b.dueDate.toMillis()).slice(0, 3)
    };
  }, [ownerTasks, assignedTasks]);

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      if (selectedYear > VALID_YEARS[0]) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      }
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      if (selectedYear < VALID_YEARS[VALID_YEARS.length - 1]) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      }
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!selectedEvent) return;
    setIsUpdatingStatus(true);
    try {
      const eventRef = doc(db, 'events', selectedEvent.id);
      await updateDoc(eventRef, {
        status_pagamento: 'pago',
        updated_at: serverTimestamp()
      });
      toast({ title: 'Pagamento Confirmado', description: `O evento ${selectedEvent.nome_evento} foi atualizado.` });
      setIsStatusConfirmOpen(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar', description: e.message });
    } finally {
      setIsUpdatingStatus(false);
      setSelectedEvent(null);
    }
  };

  if (authLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const growth = (currentMetrics?.grossRevenue || 0) - (prevMetrics?.grossRevenue || 0);

  return (
    <div className="flex flex-col space-y-8 pb-12">
      {/* Header com Filtros de Mês/Ano */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Olá, {userDetails?.displayName || 'Usuário'}!</h1>
          <p className="text-muted-foreground">Desempenho financeiro e operacional da agência.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-card p-1 rounded-lg border shadow-sm">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevMonth} disabled={isLoading}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="flex items-center gap-2 px-2">
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))} disabled={isLoading}>
              <SelectTrigger className="h-8 border-0 bg-transparent font-bold focus:ring-0 w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))} disabled={isLoading}>
              <SelectTrigger className="h-8 border-0 bg-transparent font-bold focus:ring-0 w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VALID_YEARS.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextMonth} disabled={isLoading}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Camada 1: Competência */}
      <div className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
          <Target className="h-4 w-4" /> Competência do Mês
        </h2>
        <div className={`grid gap-4 md:grid-cols-2 transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
          <Card className="bg-primary/5 border-primary/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><BarChart className="h-24 w-24" /></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Faturamento Bruto</CardTitle>
              <CardDescription>Total contratado para {months[selectedMonth].label}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{currentMetrics ? formatCurrency(currentMetrics.grossRevenue) : '...'}</div>
              <div className="flex items-center gap-2 mt-2">
                {growth >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
                <span className={`text-xs font-bold ${growth >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {formatCurrency(Math.abs(growth))} em relação ao mês anterior
                </span>
              </div>
            </CardContent>
          </Card>

          {isStaff && (
            <Card className="bg-green-500/[0.03] border-green-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Target className="h-24 w-24" /></div>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-medium">Faturamento Líquido</CardTitle>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" /></TooltipTrigger>
                      <TooltipContent><p className="max-w-xs text-xs">Valor que permanece com a agência após repasse aos DJs e custos do evento.</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <CardDescription>Margem após repasses e custos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-green-600">{currentMetrics ? formatCurrency(currentMetrics.netRevenue) : '...'}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Representa <strong>{currentMetrics && currentMetrics.grossRevenue > 0 ? ((currentMetrics.netRevenue / currentMetrics.grossRevenue) * 100).toFixed(1) : 0}%</strong> do bruto.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Camada 2: Caixa e Eficiência */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className={`md:col-span-2 space-y-4 transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <Wallet className="h-4 w-4" /> Fluxo de Caixa e Eficiência
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Já Recebido</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-lg font-bold text-green-600">{currentMetrics ? formatCurrency(currentMetrics.received) : '...'}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Falta Receber</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-lg font-bold text-destructive">{currentMetrics ? formatCurrency(currentMetrics.pending) : '...'}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Qtd Eventos</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-lg font-bold">{currentMetrics ? currentMetrics.eventCount : '...'}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Ticket Médio</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-lg font-bold">{currentMetrics ? formatCurrency(currentMetrics.avgTicket) : '...'}</div>
              </CardContent>
            </Card>
          </div>

          {currentMetrics?.eventCount === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center py-12 bg-muted/20 border-2 border-dashed rounded-2xl">
              <CalendarDays className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground font-medium">Nenhum evento agendado para {months[selectedMonth].label} de {selectedYear}.</p>
            </div>
          )}
        </div>

        {/* Coluna Lateral: Tarefas Rápidas */}
        <div className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <ClipboardList className="h-4 w-4" /> Suas Tarefas
          </h2>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 space-y-4">
              <div className="flex gap-2">
                <div className="flex-1 bg-background p-2 rounded-md border text-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Vencidas</p>
                  <p className="text-xl font-black text-destructive">{tasksSummary.overdue}</p>
                </div>
                <div className="flex-1 bg-background p-2 rounded-md border text-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Hoje</p>
                  <p className="text-xl font-black text-primary">{tasksSummary.today}</p>
                </div>
              </div>
              <div className="space-y-2">
                {tasksSummary.topTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-2 p-2 bg-background rounded-md border text-xs">
                    <div className={`w-1 h-8 rounded-full ${task.priority === 'high' ? 'bg-destructive' : 'bg-primary'}`} />
                    <div className="flex-1 truncate">
                      <p className="font-bold truncate">{task.title}</p>
                      <p className="text-[10px] text-muted-foreground">{format(task.dueDate.toDate(), 'dd/MM HH:mm')}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
                <Link href="/tasks">Ver tudo <ArrowRight className="ml-2 h-3 w-3" /></Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* NOVO: Eventos da Semana (Timeline Operacional) */}
      <div className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
          <CalendarCheck className="h-4 w-4" /> Eventos da Semana
        </h2>
        <Card className="border-primary/10 shadow-md">
          <CardHeader className="pb-3 border-b border-muted/50">
            <div className="flex justify-between items-center">
               <div>
                  <CardTitle className="text-lg font-headline">Timeline Operacional</CardTitle>
                  <CardDescription className="text-xs">Segunda a Domingo (Semana Atual)</CardDescription>
               </div>
               {isStaff && (
                 <Button variant="outline" size="sm" asChild className="h-8 text-xs">
                    <Link href="/schedule"><PlusCircle className="mr-2 h-3 w-3" /> Novo Evento</Link>
                 </Button>
               )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingWeekly ? (
              <div className="flex items-center justify-center py-24 space-y-4 flex-col">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Sincronizando agenda...</p>
              </div>
            ) : weeklyEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <CalendarDays className="h-12 w-12 text-muted-foreground/20 mb-4" />
                <p className="text-muted-foreground font-medium text-sm">
                  {isStaff ? 'Nenhum evento cadastrado para esta semana.' : 'Sua agenda está livre nesta semana.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-muted/50">
                {weeklyEvents.map((event) => {
                  const date = event.data_evento;
                  const isEventToday = isToday(date);
                  const isEventTomorrow = isTomorrow(date);

                  return (
                    <div key={event.id} className={cn(
                      "flex flex-col md:flex-row md:items-center justify-between p-4 hover:bg-muted/20 transition-colors gap-4",
                      isEventToday && "bg-primary/5"
                    )}>
                      <div className="flex items-center gap-4 flex-1">
                        {/* Status Temporal */}
                        <div className="min-w-[85px] flex flex-col items-center justify-center">
                          {isEventToday ? (
                            <span className="text-[10px] font-black uppercase bg-primary text-primary-foreground px-2 py-0.5 rounded animate-pulse">Hoje</span>
                          ) : isEventTomorrow ? (
                            <span className="text-[10px] font-black uppercase bg-orange-500 text-white px-2 py-0.5 rounded">Amanhã</span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">{format(date, 'eee, dd/MM', { locale: ptBR })}</span>
                          )}
                          <span className="text-[10px] font-medium text-muted-foreground mt-0.5">{event.horario_inicio || '--:--'}</span>
                        </div>

                        <div className="h-10 w-0.5 bg-muted rounded-full hidden md:block" />

                        {/* Nome e Info */}
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate">{event.nome_evento}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate max-w-[150px]">{event.local}</span>
                            </div>
                            {isStaff && (
                               <div className="flex items-center gap-1 text-[10px] text-primary/80 font-medium">
                                  <span>• DJ: {event.dj_nome}</span>
                               </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status e Ações */}
                      <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-0 pt-3 md:pt-0">
                        <div className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-black uppercase border",
                          event.status_pagamento === 'pago' ? "bg-green-50 text-green-700 border-green-200" : 
                          event.status_pagamento === 'parcial' ? "bg-blue-50 text-blue-700 border-blue-200" :
                          "bg-yellow-50 text-yellow-700 border-yellow-200"
                        )}>
                          {event.status_pagamento}
                        </div>

                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => { setSelectedEvent(event); setIsViewOpen(true); }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {isStaff && event.status_pagamento !== 'pago' && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-green-600"
                              onClick={() => { setSelectedEvent(event); setIsStatusConfirmOpen(true); }}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Diálogo de Visualização */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Evento</DialogTitle>
          </DialogHeader>
          <EventView event={selectedEvent} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alerta de Confirmação de Pagamento */}
      <AlertDialog open={isStatusConfirmOpen} onOpenChange={setIsStatusConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Recebimento</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja marcar o evento <strong>{selectedEvent?.nome_evento}</strong> como <strong>PAGO</strong>? Esta ação atualizará o faturamento líquido e o caixa da agência.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedEvent(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleMarkAsPaid}
              disabled={isUpdatingStatus}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isUpdatingStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Confirmar Pagamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
