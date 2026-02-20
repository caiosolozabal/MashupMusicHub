
'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { BarChart, CalendarClock, ListChecks, Users, Loader2, AlertCircle, ClipboardList, CheckCircle2, ArrowRight } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp, onSnapshot } from 'firebase/firestore';
import type { Event, Task } from '@/lib/types';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths, addMonths, isSameDay, isBefore, startOfDay } from 'date-fns';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { getEventOperationalState } from '@/lib/utils';
import { queryMyOpenTasks, queryMyAssignedOpenTasks } from '@/lib/tasks';
import { Badge } from '@/components/ui/badge';


interface StatCardData {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  description?: string;
}

export default function DashboardPage() {
  const { user, userDetails, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<StatCardData[]>([]);
  const [recentActivities, setRecentActivities] = useState<Event[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  
  const [ownerTasks, setOwnerTasks] = useState<Task[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      if (!db || !user || !userDetails) {
        setIsLoading(false);
        return;
      }

      try {
        const eventsCollectionRef = collection(db, 'events');
        const now = new Date();
        
        const windowStart = startOfMonth(subMonths(now, 6));
        const windowEnd = endOfMonth(addMonths(now, 3));

        let eventsQuery;
        const activeStatuses = ['pago', 'parcial', 'pendente', 'vencido'];

        if (userDetails.role === 'admin' || userDetails.role === 'partner') {
            eventsQuery = query(
              eventsCollectionRef, 
              where('status_pagamento', 'in', activeStatuses),
              where('data_evento', '>=', Timestamp.fromDate(windowStart)),
              where('data_evento', '<=', Timestamp.fromDate(windowEnd))
            );
        } else if (userDetails.role === 'dj') {
            eventsQuery = query(
              eventsCollectionRef, 
              where('dj_id', '==', user.uid), 
              where('status_pagamento', 'in', activeStatuses),
              where('data_evento', '>=', Timestamp.fromDate(windowStart)),
              where('data_evento', '<=', Timestamp.fromDate(windowEnd))
            );
        } else {
            eventsQuery = null;
        }

        let fetchedEvents: Event[] = [];
        if (eventsQuery) {
            const eventsSnapshot = await getDocs(eventsQuery);
            fetchedEvents = eventsSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    data_evento: data.data_evento instanceof Timestamp ? data.data_evento.toDate() : new Date(data.data_evento),
                    created_at: data.created_at instanceof Timestamp ? data.created_at.toDate() : new Date(),
                    updated_at: data.updated_at instanceof Timestamp ? data.updated_at.toDate() : new Date(),
                } as Event;
            });
        }

        const operationalActiveEvents = fetchedEvents.filter(event => {
          const state = getEventOperationalState(event);
          return state === 'active' || state === 'overdue';
        });

        const overdueCount = fetchedEvents.filter(event => {
          return getEventOperationalState(event) === 'overdue';
        }).length;

        const upcomingGigs = fetchedEvents.filter(event => event.data_evento > now);
        
        const currentMonthStart = startOfMonth(now);
        const currentMonthEnd = endOfMonth(now);
        const monthlyRevenue = fetchedEvents
          .filter(event => isWithinInterval(event.data_evento, { start: currentMonthStart, end: currentMonthEnd }))
          .reduce((sum, event) => sum + (event.valor_total || 0), 0);

        let newStats: StatCardData[] = [];
        
        if (userDetails.role === 'dj') {
          newStats = [
            { title: 'Pendências Operacionais', value: operationalActiveEvents.length, icon: CalendarClock, color: 'text-primary' },
            { title: 'Pagamentos em Atraso', value: overdueCount, icon: AlertCircle, color: 'text-destructive' },
            { title: 'Próximos Agendamentos', value: upcomingGigs.length, icon: ListChecks, color: 'text-green-500' },
            { title: `Receita (${format(now, 'MM/yy')})`, value: monthlyRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: BarChart, color: 'text-blue-500' },
          ];
        } else {
          const djsSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'dj')));
          newStats = [
            { title: 'Eventos em Aberto', value: operationalActiveEvents.length, icon: CalendarClock, color: 'text-primary' },
            { title: 'DJs Cadastrados', value: djsSnapshot.size, icon: Users, color: 'text-primary' },
            { title: 'Pendências de Cobrança', value: overdueCount, icon: AlertCircle, color: 'text-destructive' },
            { title: `Faturamento (${format(now, 'MM/yy')})`, value: monthlyRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: BarChart, color: 'text-blue-500' },
          ];
        }
        setStats(newStats);

        setRecentActivities(fetchedEvents.sort((a, b) => b.updated_at!.getTime() - a.updated_at!.getTime()).slice(0, 3));
        setUpcomingEvents(upcomingGigs.sort((a, b) => a.data_evento.getTime() - b.data_evento.getTime()).slice(0, 3));

      } catch (error: any) {
        console.error("Dashboard error:", error);
        toast({ variant: 'destructive', title: 'Erro ao carregar dados', description: error.message });
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading && user && userDetails) {
      fetchData();
      
      // Listeners para Tasks no Dashboard
      const unsubA = onSnapshot(queryMyOpenTasks(user.uid), (snap) => {
        setOwnerTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
      });
      const unsubB = onSnapshot(queryMyAssignedOpenTasks(user.uid), (snap) => {
        setAssignedTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
      });
      return () => { unsubA(); unsubB(); };
    }
  }, [user, userDetails, authLoading, toast]);

  const tasksSummary = useMemo(() => {
    const all = [...ownerTasks, ...assignedTasks];
    const map = new Map<string, Task>();
    all.forEach(t => map.set(t.id, t));
    const merged = Array.from(map.values());
    
    const now = new Date();
    
    return {
      total: merged.length,
      overdue: merged.filter(t => {
        const date = t.dueDate?.toDate?.() || new Date(0);
        return date < now;
      }).length,
      today: merged.filter(t => {
        const date = t.dueDate?.toDate?.() || null;
        return date ? isSameDay(date, now) : false;
      }).length,
      topTasks: merged.sort((a, b) => {
        const aTime = a.dueDate?.toMillis?.() || 0;
        const bTime = b.dueDate?.toMillis?.() || 0;
        return aTime - bTime;
      }).slice(0, 3)
    };
  }, [ownerTasks, assignedTasks]);

  if (isLoading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Carregando painel...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Olá, {userDetails?.displayName || 'Usuário'}!</h1>
        <p className="text-muted-foreground">Foco nas pendências operacionais e próximos agendamentos.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1 border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-headline text-lg">Suas Tarefas</CardTitle>
            <ClipboardList className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="space-y-4">
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
              {tasksSummary.topTasks.map(task => {
                const date = task.dueDate?.toDate?.() || new Date();
                return (
                  <div key={task.id} className="flex items-center gap-2 p-2 bg-background rounded-md border text-xs">
                    <div className={`w-1 h-8 rounded-full ${task.priority === 'high' ? 'bg-destructive' : 'bg-primary'}`} />
                    <div className="flex-1 truncate">
                      <p className="font-bold truncate">{task.title}</p>
                      <p className="text-[10px] text-muted-foreground">{format(date, 'dd/MM HH:mm')}</p>
                    </div>
                    {task.status === 'pending_acceptance' && <Badge className="text-[8px] h-4 px-1">Convite</Badge>}
                  </div>
                );
              })}
              {tasksSummary.total === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhuma tarefa pendente.</p>}
            </div>
            
            <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
              <Link href="/tasks">Ver tudo <ArrowRight className="ml-2 h-3 w-3" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="font-headline">Atividade Recente</CardTitle></CardHeader>
          <CardContent>
            {recentActivities.length > 0 ? (
              <div className="space-y-3">
                {recentActivities.map(activity => (
                  <div key={activity.id} className="flex items-center p-2 bg-secondary/30 rounded-md">
                    <CalendarClock className="h-5 w-5 mr-3 text-primary shrink-0" />
                    <div className="text-sm truncate">
                      <p className="font-semibold truncate">{activity.nome_evento}</p>
                      <p className="text-xs text-muted-foreground">{format(activity.updated_at || new Date(), 'dd/MM/yy HH:mm')}</p>
                    </div>
                    <Button variant="outline" size="sm" asChild className="ml-auto">
                        <Link href={`/schedule?view=${activity.id}`}>Ver</Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : <p className="text-muted-foreground text-sm">Nenhuma atividade recente.</p>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="font-headline">Próximos Eventos</CardTitle></CardHeader>
          <CardContent>
             {upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.map(event => (
                  <div key={event.id} className="flex items-center justify-between p-2 bg-secondary/30 rounded-md">
                    <div className="text-sm truncate">
                      <p className="font-semibold truncate">{event.nome_evento}</p>
                      <p className="text-xs text-muted-foreground">{format(event.data_evento, 'dd/MM/yy')}</p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/schedule?view=${event.id}`}>Ver</Link>
                    </Button>
                  </div>
                ))}
              </div>
             ) : <p className="text-muted-foreground text-sm">Nenhum próximo evento.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
