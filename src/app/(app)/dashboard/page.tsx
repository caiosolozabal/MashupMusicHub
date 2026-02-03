'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { BarChart, CalendarClock, ListChecks, Users, Loader2, CheckCircle2, DatabaseZap, FileText, Package, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import type { Event } from '@/lib/types';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths, addMonths } from 'date-fns';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { getEventOperationalState } from '@/lib/utils';


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

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      if (!db || !user || !userDetails) {
        if (!authLoading) setIsLoading(false);
        return;
      }

      try {
        const eventsCollectionRef = collection(db, 'events');
        const now = new Date();
        
        // Estratégia de Janela Temporal: Últimos 6 meses até 3 meses no futuro
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

        // Calcular estatísticas baseadas no Estado Operacional Derivado
        // Nota: Não precisamos mais buscar Settlements aqui, pois o estado agora 
        // depende apenas da existência do settlementId no documento do evento.
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
            { title: 'DJs Cadastrados', value: djsSnapshot.size, icon: Users, color: 'text-accent' },
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

    if (!authLoading && user && userDetails) fetchData();
  }, [user, userDetails, authLoading, toast]);

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

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
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
        <Card>
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
