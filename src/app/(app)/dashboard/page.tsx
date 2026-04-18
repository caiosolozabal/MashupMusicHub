
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { 
  BarChart, 
  CalendarClock, 
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
  CalendarDays
} from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp, orderBy, limit } from 'firebase/firestore';
import type { Event, Task, UserDetails } from '@/lib/types';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  isSameDay, 
  getYear, 
  getMonth,
  startOfDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { calculateDjCut } from '@/lib/utils';
import { queryMyOpenTasks, queryMyAssignedOpenTasks } from '@/lib/tasks';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

export default function DashboardPage() {
  const { user, userDetails, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number>(getMonth(new Date()));
  const [selectedYear, setSelectedYear] = useState<number>(getYear(new Date()));
  
  const [monthEvents, setMonthEvents] = useState<Event[]>([]);
  const [prevMonthEvents, setPrevMonthEvents] = useState<Event[]>([]);
  const [allDjs, setAllDjs] = useState<UserDetails[]>([]);
  const [recentActivities, setRecentActivities] = useState<Event[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [ownerTasks, setOwnerTasks] = useState<Task[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);

  const isStaff = userDetails?.role === 'admin' || userDetails?.role === 'partner';

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
        
        const getBaseQuery = (start: Date, end: Date) => {
          let q = query(
            eventsRef,
            where('data_evento', '>=', Timestamp.fromDate(start)),
            where('data_evento', '<=', Timestamp.fromDate(end))
          );
          if (userDetails.role === 'dj') {
            q = query(q, where('dj_id', '==', user.uid));
          }
          return q;
        };

        const [currSnap, prevSnap] = await Promise.all([
          getDocs(getBaseQuery(currentStart, currentEnd)),
          getDocs(getBaseQuery(prevStart, prevEnd))
        ]);

        const mapDocToEvent = (doc: any) => ({
          id: doc.id,
          ...doc.data(),
          data_evento: doc.data().data_evento.toDate()
        } as Event);

        setMonthEvents(currSnap.docs.map(mapDocToEvent));
        setPrevMonthEvents(prevSnap.docs.map(mapDocToEvent));

        const recentQ = query(eventsRef, orderBy('updated_at', 'desc'), limit(3));
        const upcomingQ = query(eventsRef, where('data_evento', '>=', Timestamp.fromDate(new Date())), orderBy('data_evento', 'asc'), limit(3));
        const [rSnap, uSnap] = await Promise.all([getDocs(recentQ), getDocs(upcomingQ)]);
        setRecentActivities(rSnap.docs.map(mapDocToEvent));
        setUpcomingEvents(uSnap.docs.map(mapDocToEvent));

      } catch (error: any) {
        console.error("Dashboard error:", error);
        toast({ variant: 'destructive', title: 'Erro ao carregar dados financeiros' });
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading && user) fetchData();
  }, [selectedMonth, selectedYear, user, userDetails, authLoading, toast]);

  useEffect(() => {
    if (!authLoading && user) {
      const unsubA = getDocs(queryMyOpenTasks(user.uid)).then(snap => {
        setOwnerTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
      });
      const unsubB = getDocs(queryMyAssignedOpenTasks(user.uid)).then(snap => {
        setAssignedTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
      });
    }
  }, [user, authLoading]);

  const calculateMetrics = (events: Event[]): FinancialMetrics => {
    let metrics = { grossRevenue: 0, netRevenue: 0, received: 0, pending: 0, eventCount: 0, avgTicket: 0 };
    
    events.filter(e => e.status_pagamento !== 'cancelado').forEach(event => {
      metrics.eventCount++;
      metrics.grossRevenue += event.valor_total;
      
      const dj = allDjs.find(d => d.uid === event.dj_id) || (event.dj_id === user?.uid ? userDetails as UserDetails : undefined);
      const djCut = calculateDjCut(event, dj);
      metrics.netRevenue += (event.valor_total - djCut);

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

  const currentMetrics = useMemo(() => calculateMetrics(monthEvents), [monthEvents, allDjs, user, userDetails]);
  const prevMetrics = useMemo(() => calculateMetrics(prevMonthEvents), [prevMonthEvents, allDjs, user, userDetails]);

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
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  if (authLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const growth = currentMetrics.grossRevenue - prevMetrics.grossRevenue;

  return (
    <div className="flex flex-col space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Olá, {userDetails?.displayName || 'Usuário'}!</h1>
          <p className="text-muted-foreground">Desempenho financeiro e operacional da agência.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-card p-1 rounded-lg border shadow-sm">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="flex items-center gap-2 px-2">
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="h-8 border-0 bg-transparent font-bold focus:ring-0 w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="h-8 border-0 bg-transparent font-bold focus:ring-0 w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['2024', '2025', '2026'].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextMonth}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
          <Target className="h-4 w-4" /> Competência do Mês
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-primary/5 border-primary/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><BarChart className="h-24 w-24" /></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Faturamento Bruto</CardTitle>
              <CardDescription>Total contratado para {months[selectedMonth].label}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{formatCurrency(currentMetrics.grossRevenue)}</div>
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
                      <TooltipTrigger><Info className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent><p className="max-w-xs text-xs">Valor que permanece com a agência após repasse aos DJs e custos do evento.</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <CardDescription>Margem operacional pós-repasses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-green-600">{formatCurrency(currentMetrics.netRevenue)}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Representa <strong>{currentMetrics.grossRevenue > 0 ? ((currentMetrics.netRevenue / currentMetrics.grossRevenue) * 100).toFixed(1) : 0}%</strong> do bruto total.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <Wallet className="h-4 w-4" /> Fluxo de Caixa e Eficiência
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Já Recebido</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-lg font-bold text-green-600">{formatCurrency(currentMetrics.received)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Falta Receber</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-lg font-bold text-destructive">{formatCurrency(currentMetrics.pending)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Qtd Eventos</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-lg font-bold">{currentMetrics.eventCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-2"><CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Ticket Médio</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-lg font-bold">{formatCurrency(currentMetrics.avgTicket)}</div>
              </CardContent>
            </Card>
          </div>

          {currentMetrics.eventCount === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center py-12 bg-muted/20 border-2 border-dashed rounded-2xl">
              <CalendarDays className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground font-medium">Nenhum evento agendado para {months[selectedMonth].label} de {selectedYear}.</p>
            </div>
          )}
        </div>

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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base font-headline flex items-center gap-2"><CalendarClock className="h-4 w-4 text-primary" /> Atividade Recente</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {recentActivities.length > 0 ? recentActivities.map(activity => (
              <div key={activity.id} className="flex items-center p-2 bg-secondary/30 rounded-md">
                <div className="text-sm truncate flex-1">
                  <p className="font-semibold truncate">{activity.nome_evento}</p>
                  <p className="text-[10px] text-muted-foreground">Responsável: {activity.dj_nome}</p>
                </div>
                <Button variant="outline" size="sm" asChild className="h-7 text-[10px] ml-2">
                    <Link href={`/schedule`}>Ver</Link>
                </Button>
              </div>
            )) : <p className="text-muted-foreground text-xs italic">Nenhuma atividade recente.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base font-headline flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> Próximos Eventos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
             {upcomingEvents.length > 0 ? upcomingEvents.map(event => (
              <div key={event.id} className="flex items-center justify-between p-2 bg-secondary/30 rounded-md">
                <div className="text-sm truncate">
                  <p className="font-semibold truncate">{event.nome_evento}</p>
                  <p className="text-[10px] text-muted-foreground">{format(event.data_evento, "dd 'de' MMMM", { locale: ptBR })}</p>
                </div>
                <Button variant="outline" size="sm" asChild className="h-7 text-[10px]">
                    <Link href={`/schedule`}>Ver</Link>
                </Button>
              </div>
            )) : <p className="text-muted-foreground text-xs italic">Nenhum próximo evento.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
