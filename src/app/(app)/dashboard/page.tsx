'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { BarChart, CalendarClock, ListChecks, Users, Loader2, CheckCircle2, DatabaseZap, FileText, Package } from 'lucide-react';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp, doc } from 'firebase/firestore';
import type { Event, RentalQuote } from '@/lib/types';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';


interface StatCardData {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  description?: string;
}

interface DashboardEvent {
  id: string;
  nome_evento: string;
  local: string;
  data_evento: Date;
  horario_inicio?: string | null;
  status_pagamento?: Event['status_pagamento'];
  created_at?: Date;
  updated_at?: Date;
}

export default function DashboardPage() {
  const { user, userDetails, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<StatCardData[]>([]);
  const [recentActivities, setRecentActivities] = useState<DashboardEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<DashboardEvent[]>([]);

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
        const currentMonthStart = startOfMonth(now);
        const currentMonthEnd = endOfMonth(now);
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const lastMonthEnd = endOfMonth(subMonths(now, 1));

        let fetchedEvents: Event[] = [];
        let eventsQuery;
        
        // Usamos 'in' em vez de '!=' para evitar a necessidade de orderBy específico e garantir compatibilidade
        const activeStatuses = ['pago', 'parcial', 'pendente', 'vencido'];

        if (userDetails.role === 'admin' || userDetails.role === 'partner') {
            eventsQuery = query(eventsCollectionRef, where('status_pagamento', 'in', activeStatuses));
        } else if (userDetails.role === 'dj') {
            eventsQuery = query(eventsCollectionRef, where('dj_id', '==', user.uid), where('status_pagamento', 'in', activeStatuses));
        } else {
            eventsQuery = null;
        }

        if (eventsQuery) {
            const eventsSnapshot = await getDocs(eventsQuery);
            if (!eventsSnapshot.empty) {
                fetchedEvents = eventsSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        data_evento: data.data_evento instanceof Timestamp ? data.data_evento.toDate() : new Date(data.data_evento),
                        created_at: data.created_at instanceof Timestamp ? data.created_at.toDate() : (data.created_at ? new Date(data.created_at) : new Date()),
                        updated_at: data.updated_at instanceof Timestamp ? data.updated_at.toDate() : (data.updated_at ? new Date(data.updated_at) : new Date()),
                        dj_costs: data.dj_costs ?? 0,
                    } as Event;
                });
            }
        }
        
        const activeEventsCount = fetchedEvents.length;
        const upcomingGigsCount = fetchedEvents.filter(event => event.data_evento > now).length;
        
        const monthlyRevenue = fetchedEvents
          .filter(event => 
            isWithinInterval(event.data_evento, { start: currentMonthStart, end: currentMonthEnd })
          )
          .reduce((sum, event) => sum + (event.valor_total || 0), 0);
       

        let newStats: StatCardData[] = [];
        
        if (userDetails.role === 'dj') {
          const completedLastMonthCount = fetchedEvents.filter(event => 
            isWithinInterval(event.data_evento, { start: lastMonthStart, end: lastMonthEnd }) && 
            (event.status_pagamento === 'pago' || event.status_pagamento === 'parcial')
          ).length;

          newStats = [
            { title: 'Seus Eventos Ativos', value: activeEventsCount, icon: CalendarClock, color: 'text-primary' },
            { title: 'Concluídos (Mês Anterior)', value: completedLastMonthCount, icon: CheckCircle2, color: 'text-accent' },
            { title: 'Próximos Agendamentos', value: upcomingGigsCount, icon: ListChecks, color: 'text-green-500' },
            { title: `Sua Receita (${format(now, 'MM/yy')})`, value: monthlyRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: BarChart, color: 'text-blue-500' },
          ];
        } else {
          const usersCollectionRef = collection(db, 'users');
          const djsSnapshot = await getDocs(query(usersCollectionRef, where('role', '==', 'dj')));
          
          const eventStats = [
            { title: 'Eventos Ativos', value: activeEventsCount, icon: CalendarClock, color: 'text-primary' },
            { title: 'DJs Cadastrados', value: djsSnapshot.size, icon: Users, color: 'text-accent' },
            { title: 'Agendamentos Futuros', value: upcomingGigsCount, icon: ListChecks, color: 'text-green-500' },
            { title: `Faturamento (${format(now, 'MM/yy')})`, value: monthlyRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: BarChart, color: 'text-blue-500' },
          ];
          
          const quotesSnapshot = await getDocs(collection(db, 'rental_quotes'));
          const itemsSnapshot = await getDocs(collection(db, 'rental_items'));
          
          const quotes = quotesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as RentalQuote));
          const approvedRevenue = quotes
              .filter(q => q.status === 'approved' && isWithinInterval(q.createdAt.toDate(), { start: currentMonthStart, end: currentMonthEnd }))
              .reduce((sum, q) => sum + q.totals.grandTotal, 0);
      
          const rentalStats = [
              { title: 'Orçamentos (Mês)', value: quotes.length, icon: FileText, color: 'text-orange-500' },
              { title: `Receita Locação (${format(now, 'MM/yy')})`, value: approvedRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: DatabaseZap, color: 'text-green-600' },
              { title: 'Itens no Catálogo', value: itemsSnapshot.size, icon: Package, color: 'text-indigo-500' },
          ];

          newStats = [...eventStats, ...rentalStats];
        }
        setStats(newStats);

        const sortedRecent = [...fetchedEvents].sort((a, b) => (b.updated_at?.getTime() || 0) - (a.updated_at?.getTime() || 0));
        setRecentActivities(sortedRecent.slice(0, 3));

        const sortedUpcoming = fetchedEvents
            .filter(event => event.data_evento > now)
            .sort((a, b) => a.data_evento.getTime() - b.data_evento.getTime());
        setUpcomingEvents(sortedUpcoming.slice(0, 3));

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
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Olá, {userDetails?.displayName || 'Usuário'}!
        </h1>
        <p className="text-muted-foreground">Visão geral das suas atividades e da agência.</p>
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
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="font-headline">Atividade Recente</CardTitle>
          </CardHeader>
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
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="font-headline">Próximos Eventos</CardTitle>
          </CardHeader>
          <CardContent>
             {upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.map(event => (
                  <div key={event.id} className="flex items-center justify-between p-2 bg-secondary/30 rounded-md">
                    <div className="text-sm truncate">
                      <p className="font-semibold truncate">{event.nome_evento}</p>
                      <p className="text-xs text-muted-foreground">{format(event.data_evento, 'dd/MM/yy')}{event.horario_inicio ? ` às ${event.horario_inicio}` : ''}</p>
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
