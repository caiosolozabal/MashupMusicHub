
'use client';

import type { NextPage } from 'next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge, badgeVariants } from '@/components/ui/badge';
import type { Event, UserDetails, SettlementEvent } from '@/lib/types';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { CalendarIcon, Search, Loader2 } from 'lucide-react';
import type { VariantProps } from 'class-variance-authority';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';


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


const SettlementsPage: NextPage = () => {
  const { user, userDetails, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [events, setEvents] = useState<SettlementEvent[]>([]);
  const [allDjs, setAllDjs] = useState<UserDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDjId, setSelectedDjId] = useState<string>('all'); 

  const fetchPageData = useCallback(async () => {
    if (authLoading || !user || !userDetails) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);

    try {
        if (!db) throw new Error("Firestore not initialized");
        
        const dataPromises = [];

        // Always fetch djs for admins/partners
        if (userDetails.role === 'admin' || userDetails.role === 'partner') {
            const djsQuery = query(collection(db, 'users'), where('role', '==', 'dj'), orderBy('displayName'));
            dataPromises.push(getDocs(djsQuery));
        }

        // Fetch events only if a DJ is selected
        if (selectedDjId !== 'all') {
            let eventsQuery = query(
                collection(db, 'events'), 
                where('dj_id', '==', selectedDjId)
            );

            if (dateRange?.from) {
                eventsQuery = query(eventsQuery, where('data_evento', '>=', Timestamp.fromDate(dateRange.from)));
            }
            if (dateRange?.to) {
                 eventsQuery = query(eventsQuery, where('data_evento', '<=', Timestamp.fromDate(dateRange.to)));
            }
            
            eventsQuery = query(eventsQuery, orderBy('data_evento', 'desc'));
            dataPromises.push(getDocs(eventsQuery));
        } else {
            setEvents([]);
        }
        
        const results = await Promise.all(dataPromises);
        
        let djPromiseIndex = 0;
        if (userDetails.role === 'admin' || userDetails.role === 'partner') {
            const djsSnapshot = results[djPromiseIndex++];
            const djsList = djsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserDetails));
            setAllDjs(djsList);
        } else if (userDetails.role === 'dj') {
            setAllDjs([userDetails]);
            setSelectedDjId(user.uid);
        }

        if (selectedDjId !== 'all') {
            const eventsSnapshot = results[djPromiseIndex];
            const eventsList = eventsSnapshot.docs.map(docSnapshot => {
                const data = docSnapshot.data();
                return {
                    id: docSnapshot.id,
                    ...data,
                    data_evento: data.data_evento instanceof Timestamp ? data.data_evento.toDate() : new Date(data.data_evento),
                } as SettlementEvent;
            });

             // Client-side search filtering
            if (searchTerm) {
                const lowerSearch = searchTerm.toLowerCase();
                const filtered = eventsList.filter(event =>
                    event.nome_evento.toLowerCase().includes(lowerSearch) ||
                    (event.contratante_nome && event.contratante_nome.toLowerCase().includes(lowerSearch)) ||
                    event.local.toLowerCase().includes(lowerSearch)
                );
                setEvents(filtered);
            } else {
                setEvents(eventsList);
            }
        }


    } catch (error: any) {
        console.error("Error fetching data:", error);
        toast({ variant: 'destructive', title: 'Erro ao buscar dados', description: error.message });
    } finally {
        setIsLoading(false);
    }
  }, [user, userDetails, authLoading, toast, selectedDjId, dateRange, searchTerm]);
  
  // Effect to fetch DJs initially for the dropdown
  useEffect(() => {
    if (!authLoading && user && userDetails) {
        const fetchDjs = async () => {
            if (userDetails.role === 'admin' || userDetails.role === 'partner') {
                 setIsLoading(true);
                 try {
                    const djsQuery = query(collection(db, 'users'), where('role', '==', 'dj'), orderBy('displayName'));
                    const djsSnapshot = await getDocs(djsQuery);
                    const djsList = djsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserDetails));
                    setAllDjs(djsList);
                } catch(e) {
                     toast({ variant: 'destructive', title: 'Erro ao buscar DJs', description: (e as Error).message });
                } finally {
                    setIsLoading(false);
                }
            } else if (userDetails.role === 'dj') {
                 setAllDjs([userDetails]);
                 setSelectedDjId(user.uid);
                 setIsLoading(false);
            }
        };
        fetchDjs();
    }
  }, [authLoading, user, userDetails]);

  // Effect to fetch events when filters change
  useEffect(() => {
    if (!authLoading && user && selectedDjId !== 'all') {
      fetchPageData();
    }
  }, [selectedDjId, dateRange, searchTerm, authLoading, user, fetchPageData]);

  if (authLoading) {
    return (
        <div className="flex flex-col justify-center items-center h-64 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Carregando...</p>
        </div>
    );
  }

  const canSelectDj = userDetails?.role === 'admin' || userDetails?.role === 'partner';

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Fechamentos Financeiros</CardTitle>
          <CardDescription>Selecione um DJ e um período para ver os eventos e gerar o fechamento.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end p-4 border rounded-lg bg-muted/30 shadow-sm">
            
            <div className="flex flex-col gap-1.5">
              <label htmlFor="dj-filter" className="text-sm font-medium text-foreground">1. Selecione o DJ</label>
              <Select value={selectedDjId} onValueChange={setSelectedDjId} disabled={!canSelectDj && userDetails?.role !== 'dj'}>
                <SelectTrigger id="dj-filter" className="bg-background">
                  <SelectValue placeholder={isLoading ? "Carregando DJs..." : "Selecione um DJ"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Selecione um DJ para começar</SelectItem>
                  {allDjs.map(dj => (
                    <SelectItem key={dj.uid} value={dj.uid}>{dj.displayName || dj.email}</SelectItem>
                  ))}
                  {!isLoading && allDjs.length === 0 && <SelectItem value="no-djs" disabled>Nenhum DJ cadastrado</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="date-range" className="text-sm font-medium text-foreground">2. Selecione o Período</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date-range"
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
            
            <div className="flex flex-col gap-1.5">
              <label htmlFor="search-events" className="text-sm font-medium text-foreground">3. Buscar Evento (Opcional)</label>
              <Input
                id="search-events"
                placeholder="Nome, contratante, local..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-background"
                disabled={selectedDjId === 'all'}
              />
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl">Eventos do Período</CardTitle>
               <CardDescription>
                {selectedDjId === 'all' 
                    ? "Selecione um DJ para listar os eventos." 
                    : `Listando eventos para ${allDjs.find(d => d.uid === selectedDjId)?.displayName || 'DJ selecionado'}.`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading && selectedDjId !== 'all' ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2">Carregando eventos...</p>
                </div>
              ) : events.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                    {selectedDjId === 'all' 
                        ? "Nenhum DJ selecionado." 
                        : "Nenhum evento encontrado para os filtros selecionados."
                    }
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Evento</TableHead>
                        <TableHead>Contratante</TableHead>
                        <TableHead className="text-right">Valor Total</TableHead>
                        <TableHead>Recebido Por</TableHead>
                        <TableHead>Status Pag. (Cliente)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.map((event) => (
                          <TableRow key={event.id}>
                            <TableCell>{format(event.data_evento, 'dd/MM/yy')}</TableCell>
                            <TableCell className="font-medium max-w-xs truncate" title={event.nome_evento}>{event.nome_evento}</TableCell>
                            <TableCell>{event.contratante_nome}</TableCell>
                            <TableCell className="text-right">{Number(event.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                            <TableCell className="capitalize">{event.conta_que_recebeu}</TableCell>
                            <TableCell>
                              <Badge variant={getStatusVariant(event.status_pagamento)} className="capitalize text-xs">
                                {getStatusText(event.status_pagamento)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettlementsPage;

    