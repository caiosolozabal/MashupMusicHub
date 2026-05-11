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
  Target,
  Wallet,
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
  onSnapshot
} from 'firebase/firestore';
import type { Event, Task, UserDetails } from '@/lib/types';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
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
import { queryMyOpenTasks } from '@/lib/tasks';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import EventView from '@/components/events/EventView';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

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
  const [allDjs, setAllDjs] = useState<UserDetails[]>([]);
  
  const [weeklyEvents, setWeeklyEvents] = useState<Event[]>([]);
  const [isLoadingWeekly, setIsLoadingWeekly] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const [ownerTasks, setOwnerTasks] = useState<Task[]>([]);

  const isStaff = userDetails?.role === 'admin' || userDetails?.role === 'partner';

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  useEffect(() => {
    const now = new Date();
    setSelectedMonth(getMonth(now));
    setSelectedYear(getYear(now));
    setIsMounted(true);
  }, []);

  const VALID_YEARS = useMemo(() => {
    const current = isMounted ? selectedYear : new Date().getFullYear();
    if (!current) return [new Date().getFullYear()];
    return Array.from({ length: 5 }, (_, i) => current - 2 + i);
  }, [isMounted, selectedYear]);

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

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !userDetails || !isMounted) return;
      setIsLoading(true);

      try {
        const currentStart = startOfMonth(new Date(selectedYear, selectedMonth));
        const currentEnd = endOfMonth(new Date(selectedYear, selectedMonth));

        const eventsRef = collection(db, 'events');
        
        let qCurrent = query(
          eventsRef,
          where('data_evento', '>=', Timestamp.fromDate(currentStart)),
          where('data_evento', '<=', Timestamp.fromDate(currentEnd))
        );

        if (userDetails.role === 'dj') {
          qCurrent = query(qCurrent, where('dj_id', '==', user.uid));
        }

        const currSnap = await getDocs(qCurrent);

        const mapDocToEvent = (docSnap: any) => {
          const data = docSnap.data();
          if (!data.data_evento) return null;
          return {
            id: docSnap.id,
            ...data,
            data_evento: data.data_evento.toDate()
          } as Event;
        };

        setMonthEvents(currSnap.docs.map(mapDocToEvent).filter(Boolean) as Event[]);

      } catch (error: any) {
        console.error("Dashboard finance error:", error);
        toast({ variant: 'destructive', title: 'Erro ao carregar dados financeiros' });
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading && user && isMounted) fetchData();
  }, [selectedMonth, selectedYear, user, userDetails, authLoading, toast, isMounted]);

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
        .map(docSnapshot => {
          const data = docSnapshot.data();
          if (!data.data_evento) return null;
          return {
            id: docSnapshot.id,
            ...data,
            data_evento: data.data_evento.toDate()
          } as Event;
        })
        .filter(Boolean)
        .filter(e => e!.status_pagamento !== 'cancelado') as Event[];
      
      setWeeklyEvents(list);
      setIsLoadingWeekly(false);
    });

    return () => unsubscribe();
  }, [user, userDetails, isMounted]);

  useEffect(() => {
    if (!authLoading && user && isMounted) {
      getDocs(queryMyOpenTasks(user.uid)).then(snap => {
        setOwnerTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
      });
    }
  }, [user, authLoading, isMounted]);

  const currentMetrics = useMemo(() => {
    if (!isMounted) return null;
    let metrics = { grossRevenue: 0, netRevenue: 0, received: 0, pending: 0, eventCount: 0, avgTicket: 0 };
    
    monthEvents.forEach(event => {
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
  }, [monthEvents, allDjs, isStaff, isMounted]);

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

    return Object.values(aggregation).sort((a, b) => b.total - a.total);
  }, [monthEvents, allDjs, isStaff, isMounted]);

  const weekDays = useMemo(() => {
    if (!isMounted) return [];
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [isMounted]);

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

  if (authLoading || !isMounted) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  const chartHeight = Math.max(160, performanceData.length * 36 + 40);

  return (
    <div className="flex flex-col space-y-8 pb-12">
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
            </CardContent>
          </Card>

          {isStaff && (
            <Card className="bg-green-500/[0.03] border-green-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Target className="h-24 w-24" /></div>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-medium">Faturamento Líquido</CardTitle>
                </div>
                <CardDescription>Margem após repasses e custos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-green-600">{currentMetrics ? formatCurrency(currentMetrics.netRevenue) : '...'}</div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className={`space-y-4 transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
          <Wallet className="h-4 w-4" /> Fluxo de Caixa
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
      </div>

      {isStaff && performanceData.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <Target className="h-4 w-4" /> Performance dos DJs
          </h2>
          <Card className="border-primary/10 shadow-sm max-w-4xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold">Ranking de Faturamento Bruto</CardTitle>
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
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 11, fontWeight: '800' }} />
                  <ReTooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }} />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={24} className="cursor-pointer" onClick={(data) => router.push(`/schedule?djId=${data.djId}`)}>
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

                    return (
                      <div key={day.toISOString()} className={cn("snap-start flex flex-col min-h-[140px] p-2 space-y-2", isDayToday ? "bg-primary/[0.03] border-t-2 border-t-primary" : "bg-card", dayEvents.length === 0 && !isDayToday && "opacity-40")}>
                        <div className="flex flex-col items-center justify-center py-1 border-b border-muted/30">
                          <span className={cn("text-[9px] font-black uppercase tracking-widest", isDayToday ? "text-primary" : "text-muted-foreground")}>{format(day, 'eee', { locale: ptBR })}</span>
                          <span className={cn("text-sm font-black", isDayToday && "text-primary")}>{format(day, 'dd')}</span>
                        </div>
                        <div className="flex-1 space-y-1.5 overflow-hidden">
                          {displayedEvents.map(event => (
                            <div key={event.id} onClick={() => { setSelectedEvent(event); setIsViewOpen(true); }} className="group p-1.5 rounded bg-background border border-border/50 hover:border-primary/50 transition-all cursor-pointer shadow-sm">
                              <p className="text-[10px] font-bold line-clamp-1 group-hover:text-primary transition-colors">{event.nome_evento}</p>
                            </div>
                          ))}
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

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Detalhes do Evento</DialogTitle></DialogHeader>
          <EventView event={selectedEvent} />
          <DialogFooter><Button variant="outline" onClick={() => setIsViewOpen(false)}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}