'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { 
  BarChart as LucideBarChart, 
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
  CheckCircle2,
  CalendarCheck
} from 'lucide-react';
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  Timestamp, 
  orderBy, 
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
  addDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { calculateDjCut, cn } from '@/lib/utils';
import { queryMyOpenTasks, queryMyAssignedOpenTasks } from '@/lib/tasks';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import EventView from '@/components/events/EventView';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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

export default function DashboardPage() {
  const { user, userDetails, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number>(0);
  const [selectedYear, setSelectedYear] = useState<number>(0);
  
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

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Prevenir Erros de Hidratação: Inicializa datas apenas no cliente
  useEffect(() => {
    const now = new Date();
    setSelectedMonth(getMonth(now));
    setSelectedYear(getYear(now));
    setIsMounted(true);
  }, []);

  // Gerar lista de anos dinâmica (Ano atual - 2 até Ano atual + 2)
  const VALID_YEARS = useMemo(() => {
    const current = isMounted ? selectedYear : new Date().getFullYear();
    if (!current) return [new Date().getFullYear()];
    return Array.from({ length: 5 }, (_, i) => current - 2 + i);
  }, [isMounted, selectedYear]);

  // Buscar lista de DJs para cálculo do faturamento líquido (apenas staff)
  useEffect(() => {
    if (isStaff && !authLoading && isMounted) {
      const fetchDjs = async () => {
        try {
          const q = query(collection(db, 'users'), where('role', '==', 'dj'));
          const snap = await getDocs(q);
          setAllDjs(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserDetails)));
        } catch (e) {
          console.error("Error fetching DJs:", e);
        }
      };
      fetchDjs();
    }
  }, [isStaff, authLoading, isMounted]);

  // Carregar dados financeiros (Competência)
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !userDetails || !isMounted) return;
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

        const mapDocToEvent = (doc: any) => {
          const data = doc.data();
          if (!data.data_evento) return null; // Ignora eventos sem data para evitar quebra
          return {
            id: doc.id,
            ...data,
            data_evento: data.data_evento.toDate()
          } as Event;
        };

        setMonthEvents(currSnap.docs.map(mapDocToEvent).filter(Boolean) as Event[]);
        setPrevMonthEvents(prevSnap.docs.map(mapDocToEvent).filter(Boolean) as Event[]);

      } catch (error: any) {
        console.error("Dashboard finance error:", error);
        toast({ variant: 'destructive', title: 'Erro ao carregar dados financeiros' });
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading && user && isMounted) fetchData();
  }, [selectedMonth, selectedYear, user, userDetails, authLoading, toast, isMounted]);

  // Query Real-time para Eventos da Semana
  useEffect(() => {
    if (!user || !userDetails || !isMounted) return;

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
        .map(doc => {
          const data = doc.data();
          if (!data.data_evento) return null;
          return {
            id: doc.id,
            ...data,
            data_evento: data.data_evento.toDate()
          } as Event;
        })
        .filter(Boolean)
        .filter(e => e!.status_pagamento !== 'cancelado') as Event[];
      
      setWeeklyEvents(list);
      setIsLoadingWeekly(false);
    }, (error) => {
      console.error("Weekly events error:", error);
      setIsLoadingWeekly(false);
    });

    return () => unsubscribe();
  }, [user, userDetails, isMounted]);

  // Carregar Tarefas
  useEffect(() => {
    if (!authLoading && user && isMounted) {
      getDocs(queryMyOpenTasks(user.uid)).then(snap => {
        setOwnerTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
      });
      getDocs(queryMyAssignedOpenTasks(user.uid)).then(snap => {
        setAssignedTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
      });
    }
  }, [user, authLoading, isMounted]);

  const calculateMetrics = (events: Event[]): FinancialMetrics => {
    let metrics = { grossRevenue: 0, netRevenue: 0, received: 0, pending: 0, eventCount: 0, avgTicket: 0 };
    
    events.forEach(event => {
      metrics.eventCount++;
      metrics.grossRevenue += event.valor_total || 0;
      
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
    if (!isMounted) return null;
    if (isStaff && allDjs.length === 0 && monthEvents.length > 0) return null;
    return calculateMetrics(monthEvents);
  }, [monthEvents, allDjs, isStaff, isMounted]);

  const prevMetrics = useMemo(() => {
    if (!isMounted) return null;
    if (isStaff && allDjs.length === 0 && prevMonthEvents.length > 0) return null;
    return calculateMetrics(prevMonthEvents);
  }, [prevMonthEvents, allDjs, isStaff, isMounted]);

  // BI: Performance dos DJs
  const performanceData = useMemo(() => {
    if (!isStaff || allDjs.length === 0 || monthEvents.length === 0 || !isMounted) return [];

    const aggregation: Record<string, { djId: string; name: string; color: string; total: number; count: number }> = {};

    monthEvents.forEach((event) => {
      if (event.status_pagamento === 'cancelado') return;
      
      const djId = event.dj_id;
      if (!djId) return;

      if (!aggregation[djId]) {
        const djInfo = allDjs.find((d) => d.uid === djId);
        aggregation[djId] = {
          djId,
          name: djInfo?.displayName || event.dj_nome || 'N/A',
          color: djInfo?.dj_color || 'hsl(var(--primary))',
          total: 0,
          count: 0,
        };
      }
      aggregation[djId].total += event.valor_total || 0;
      aggregation[djId].count += 1;
    });

    return Object.values(aggregation)
      .sort((a, b) => b.total - a.total);
  }, [monthEvents, allDjs, isStaff, isMounted]);

  const tasksSummary = useMemo(() => {
    if (!isMounted) return { total: 0, overdue: 0, today: 0, topTasks: [] };
    const all = [...ownerTasks, ...assignedTasks];
    const map = new Map<string, Task>();
    all.forEach(t => map.set(t.id, t));
    const merged = Array.from(map.values());
    const now = new Date();
    return {
      total: merged.length,
      overdue: merged.filter(t => t.dueDate?.toDate() < now).length,
      today: merged.filter(t => t.dueDate && isSameDay(t.dueDate.toDate(), now)).length,
      topTasks: merged.sort((a, b) => (a.dueDate?.toMillis() || 0) - (b.dueDate?.toMillis() || 0)).slice(0, 3)
    };
  }, [ownerTasks, assignedTasks, isMounted]);

  // Lógica para gerar os 7 dias da grade
  const weekDays = useMemo(() => {
    if (!isMounted) return [];
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [isMounted]);

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

  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const navUrl = `/schedule?djId=${data.djId}&month=${selectedMonth}&year=${selectedYear}`;
      
      return (
        <div 
          className="bg-card border p-3 rounded-lg shadow-xl text-xs space-y-3 bg-opacity-95 backdrop-blur-sm pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-0.5">
            <p className="font-bold text-sm mb-2">{data.name}</p>
            <p className="text-muted-foreground flex justify-between gap-4 italic">
              Bruto no mês: <span className="font-black text-foreground not-italic">{formatCurrency(data.total)}</span>
            </p>
            <p className="text-muted-foreground flex justify-between gap-4 italic">
              Eventos: <span className="font-bold text-foreground not-italic">{data.count}</span>
            </p>
            <p className="text-muted-foreground flex justify-between gap-4 italic">
              Ticket Médio: <span className="font-bold text-foreground not-italic">{formatCurrency(data.total / data.count)}</span>
            </p>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full h-7 text-[10px] font-black uppercase tracking-wider bg-primary/10 border-primary/20 hover:bg-primary/20"
            onClick={(e) => {
              e.stopPropagation();
              router.push(navUrl);
            }}
          >
            Ver Agenda <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      );
    }
    return null;
  };

  if (authLoading || !isMounted) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  const growth = (currentMetrics?.grossRevenue || 0) - (prevMetrics?.grossRevenue || 0);
  const chartHeight = Math.max(160, performanceData.length * 36 + 40);

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

      <div className="h-px bg-black w-full" />

      {/* Camada 1: Competência */}
      <div className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
          <Target className="h-4 w-4" /> Competência do Mês
        </h2>
        <div className={`grid gap-4 md:grid-cols-2 transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
          <Card className="bg-primary/5 border-primary/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><LucideBarChart className="h-24 w-24" /></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Faturamento Bruto</CardTitle>
              <CardDescription>Total contratado para {months[selectedMonth]?.label}</CardDescription>
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
      <div className={`space-y-4 transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
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
            <p className="text-muted-foreground font-medium">Nenhum evento agendado para {months[selectedMonth]?.label} de {selectedYear}.</p>
          </div>
        )}
      </div>

      {/* Camada 3: Performance dos DJs (Exclusivo Staff) */}
      {isStaff && performanceData.length > 0 && (
        <div className={`space-y-4 transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <Target className="h-4 w-4" /> Performance dos DJs
          </h2>
          <Card className="border-primary/10 shadow-sm max-w-4xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold">Ranking de Faturamento Bruto</CardTitle>
              <CardDescription>Volume consolidado por prestador em {months[selectedMonth]?.label}</CardDescription>
            </CardHeader>
            <CardContent className="pt-2" style={{ height: chartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={performanceData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  barCategoryGap={4}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.05} />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false}
                    width={100}
                    tick={{ fontSize: 11, fontWeight: '800' }}
                  />
                  <ReTooltip 
                    content={<CustomChartTooltip />} 
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }}
                    wrapperStyle={{ pointerEvents: 'auto' }}
                  />
                  <Bar 
                    dataKey="total" 
                    radius={[0, 4, 4, 0]} 
                    barSize={24}
                    className="cursor-pointer"
                    onClick={(data) => {
                      if (window.innerWidth >= 768) {
                        router.push(`/schedule?djId=${data.djId}&month=${selectedMonth}&year=${selectedYear}`);
                      }
                    }}
                  >
                    {performanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Camada 4: Suas Tarefas */}
      <div className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
          <ClipboardList className="h-4 w-4" /> Suas Tarefas
        </h2>
        <Card className="border-primary/20 bg-primary/5 max-w-4xl">
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
                    <p className="text-[10px] text-muted-foreground">{task.dueDate ? format(task.dueDate.toDate(), 'dd/MM HH:mm') : ''}</p>
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

      {/* Camada 5: Eventos da Semana (Weekly Grid) */}
      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <CalendarCheck className="h-4 w-4" /> Eventos da Semana
          </h2>
          <Button variant="link" size="sm" asChild className="text-[10px] uppercase font-black h-auto p-0 text-primary">
            <Link href="/schedule">Ver agenda completa <ChevronRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </div>
        
        <Card className="border-primary/10 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {isLoadingWeekly ? (
              <div className="flex items-center justify-center py-24 bg-muted/5">
                <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
              </div>
            ) : (
              <div className="w-full overflow-x-auto snap-x scrollbar-hide">
                <div className="grid grid-cols-7 min-w-[800px] md:min-w-0 divide-x divide-muted/50 border-b">
                  {weekDays.map((day) => {
                    const isDayToday = isToday(day);
                    const dayEvents = weeklyEvents.filter(e => isSameDay(e.data_evento, day));
                    const displayedEvents = dayEvents.slice(0, 2);
                    const remainingCount = dayEvents.length - displayedEvents.length;

                    return (
                      <div 
                        key={day.toISOString()} 
                        className={cn(
                          "snap-start flex flex-col min-h-[140px] p-2 space-y-2 transition-colors",
                          isDayToday ? "bg-primary/[0.03] border-t-2 border-t-primary" : "bg-card",
                          dayEvents.length === 0 && !isDayToday && "opacity-40"
                        )}
                      >
                        {/* Header do Dia */}
                        <div className="flex flex-col items-center justify-center py-1 border-b border-muted/30">
                          <span className={cn(
                            "text-[9px] font-black uppercase tracking-widest",
                            isDayToday ? "text-primary" : "text-muted-foreground"
                          )}>
                            {format(day, 'eee', { locale: ptBR })}
                          </span>
                          <span className={cn(
                            "text-sm font-black",
                            isDayToday && "text-primary"
                          )}>
                            {format(day, 'dd')}
                          </span>
                          {isDayToday && <div className="h-1 w-1 rounded-full bg-primary animate-pulse mt-0.5" />}
                        </div>

                        {/* Eventos do Dia */}
                        <div className="flex-1 space-y-1.5 overflow-hidden">
                          {displayedEvents.map(event => (
                            <div 
                              key={event.id}
                              onClick={() => { setSelectedEvent(event); setIsViewOpen(true); }}
                              className="group p-1.5 rounded bg-background border border-border/50 hover:border-primary/50 transition-all cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                            >
                              <p className="text-[10px] font-bold line-clamp-1 leading-tight group-hover:text-primary transition-colors">
                                {event.nome_evento}
                              </p>
                              {isStaff && (
                                <p className="text-[8px] text-muted-foreground truncate uppercase font-medium mt-0.5">
                                  {event.dj_nome}
                                </p>
                              )}
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-[8px] font-bold text-muted-foreground/80">{event.horario_inicio || '--:--'}</span>
                                <div className={cn(
                                  "w-1 h-1 rounded-full",
                                  event.status_pagamento === 'pago' ? "bg-green-500" : "bg-yellow-500"
                                )} />
                              </div>
                            </div>
                          ))}

                          {remainingCount > 0 && (
                            <button 
                              onClick={() => { /* Poderia abrir um modal do dia */ }}
                              className="w-full py-1 rounded border border-dashed border-muted-foreground/30 text-[9px] font-bold text-muted-foreground hover:bg-muted/50 transition-colors"
                            >
                              + {remainingCount} eventos
                            </button>
                          )}

                          {dayEvents.length === 0 && (
                            <div className="flex-1 flex items-center justify-center opacity-10">
                              <CalendarCheck className="h-6 w-6" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
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
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            {isStaff && selectedEvent?.status_pagamento !== 'pago' && (
              <Button 
                onClick={() => { setIsViewOpen(false); setIsStatusConfirmOpen(true); }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Marcar como Pago
              </Button>
            )}
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
