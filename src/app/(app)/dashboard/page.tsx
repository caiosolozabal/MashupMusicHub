
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
  Zap
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
  getMonth
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { calculateDjCut, cn } from '@/lib/utils';
import { queryMyOpenTasks, queryMyAssignedOpenTasks } from '@/lib/tasks';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import DjOperationalCard from '@/components/dashboard/DjOperationalCard';
import LoginConciergeDrawer from '@/components/dashboard/LoginConciergeDrawer';

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
  
  const [ownerTasks, setOwnerTasks] = useState<Task[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);

  const isStaff = userDetails?.role === 'admin' || userDetails?.role === 'partner';
  const isDj = userDetails?.role === 'dj';

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

        const mapDocToEvent = (docSnapshot: any) => {
          const data = docSnapshot.data();
          if (!data.data_evento) return null;
          return {
            id: docSnapshot.id,
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

  const growth = useMemo(() => {
    if (!currentMetrics || !prevMetrics) return 0;
    return currentMetrics.grossRevenue - prevMetrics.grossRevenue;
  }, [currentMetrics, prevMetrics]);

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

  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border p-3 rounded-lg shadow-xl text-xs space-y-2">
          <p className="font-bold text-sm">{data.name}</p>
          <p className="text-muted-foreground italic flex justify-between gap-4">
            Bruto: <span className="font-black text-foreground not-italic">{formatCurrency(data.total)}</span>
          </p>
          <p className="text-muted-foreground italic flex justify-between gap-4">
            Eventos: <span className="font-bold text-foreground not-italic">{data.count}</span>
          </p>
        </div>
      );
    }
    return null;
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
          <p className="text-muted-foreground">Bem-vindo ao seu centro operacional Mashup.</p>
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

      {isDj && (
        <>
            <LoginConciergeDrawer events={monthEvents} alerts={[...ownerTasks, ...assignedTasks]} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <DjOperationalCard events={monthEvents} />
                </div>
                <div className="space-y-4">
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Comunicados e Tarefas</h2>
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
                            {tasksSummary.topTasks.length > 0 ? (
                            tasksSummary.topTasks.map(task => (
                                <div key={task.id} className="flex items-center gap-2 p-3 bg-background rounded-xl border text-xs group hover:border-primary/50 transition-colors">
                                <div className={`w-1 h-8 rounded-full shrink-0 ${task.priority === 'high' ? 'bg-destructive' : 'bg-primary'}`} />
                                <div className="flex-1 truncate">
                                    <p className="font-bold truncate group-hover:text-primary transition-colors">{task.title}</p>
                                    <p className="text-[9px] text-muted-foreground uppercase font-bold">{task.category}</p>
                                </div>
                                </div>
                            ))
                            ) : (
                            <p className="text-center py-4 text-xs text-muted-foreground italic">Nenhuma tarefa pendente no momento.</p>
                            )}
                        </div>
                        <Button variant="ghost" size="sm" className="w-full text-[10px] font-black uppercase tracking-widest" asChild>
                            <Link href="/tasks">Ver meu caderno <ArrowRight className="ml-2 h-3 w-3" /></Link>
                        </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
      )}

      <div className="h-px bg-black/10 w-full" />

      <div className="space-y-4">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary fill-primary" /> Métricas do Mês
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

      {!isDj && (
        <>
            <div className={`space-y-4 transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2">
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
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                <div className="space-y-4">
                {isStaff && performanceData.length > 0 && (
                    <>
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2">
                        <Target className="h-4 w-4" /> Performance dos DJs
                    </h2>
                    <Card className="border-primary/10 shadow-sm">
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
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                axisLine={false} 
                                tickLine={false}
                                width={100}
                                tick={{ fontSize: 11, fontWeight: '800' }}
                            />
                            <ReTooltip content={<CustomChartTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }} />
                            <Bar 
                                dataKey="total" 
                                radius={[0, 4, 4, 0]} 
                                barSize={24}
                                className="cursor-pointer"
                                onClick={(data) => router.push(`/schedule?djId=${data.djId}`)}
                            >
                                {performanceData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                        </CardContent>
                    </Card>
                    </>
                )}
                </div>

                <div className="space-y-4">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2">
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
                        {tasksSummary.topTasks.length > 0 ? (
                        tasksSummary.topTasks.map(task => (
                            <div key={task.id} className="flex items-center gap-2 p-2 bg-background rounded-md border text-xs">
                            <div className={`w-1 h-8 rounded-full ${task.priority === 'high' ? 'bg-destructive' : 'bg-primary'}`} />
                            <div className="flex-1 truncate">
                                <p className="font-bold truncate">{task.title}</p>
                                <p className="text-[10px] text-muted-foreground">{task.dueDate ? format(task.dueDate.toDate(), 'dd/MM HH:mm') : ''}</p>
                            </div>
                            </div>
                        ))
                        ) : (
                        <p className="text-center py-4 text-xs text-muted-foreground italic">Nenhuma tarefa pendente no momento.</p>
                        )}
                    </div>
                    <Button variant="ghost" size="sm" className="w-full text-xs font-bold" asChild>
                        <Link href="/tasks">Ver todo o caderno <ArrowRight className="ml-2 h-3 w-3" /></Link>
                    </Button>
                    </CardContent>
                </Card>
                </div>
            </div>
        </>
      )}
    </div>
  );
}
