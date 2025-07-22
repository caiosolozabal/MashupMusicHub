
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import type { NextPage } from 'next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { SettlementEvent, UserDetails, Event } from '@/lib/types';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Calendar as CalendarIcon, Loader2, Search } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';

const SettlementsPage: NextPage = () => {
  const { user, userDetails, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [events, setEvents] = useState<Event[]>([]);
  const [allDjs, setAllDjs] = useState<UserDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedDjId, setSelectedDjId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPageData = useCallback(async () => {
    if (authLoading || !user || !userDetails) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    try {
      if (!db) throw new Error("Firestore não inicializado");

      // Fetch DJs
      if (userDetails.role === 'admin' || userDetails.role === 'partner') {
        const djsQuery = query(collection(db, 'users'), where('role', '==', 'dj'), orderBy('displayName'));
        const djsSnapshot = await getDocs(djsQuery);
        const djsList = djsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserDetails));
        setAllDjs(djsList);
      } else if (userDetails.role === 'dj') {
        setAllDjs([userDetails]);
        setSelectedDjId(user.uid);
      }

      // Fetch Events (can be moved to a separate function called when filters change)
      const eventsQuery = query(collection(db, 'events'), orderBy('data_evento', 'desc'));
      const eventsSnapshot = await getDocs(eventsQuery);
      const eventsList = eventsSnapshot.docs.map(docSnapshot => {
          const data = docSnapshot.data();
          return {
              id: docSnapshot.id,
              ...data,
              data_evento: data.data_evento instanceof Timestamp ? data.data_evento.toDate() : new Date(data.data_evento),
          } as Event;
      });
      setEvents(eventsList);

    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({ variant: 'destructive', title: 'Erro ao buscar dados', description: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [user, userDetails, authLoading, toast]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);
  
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
        if (selectedDjId !== 'all' && event.dj_id !== selectedDjId) {
            return false;
        }
        if (dateRange?.from && event.data_evento < dateRange.from) {
            return false;
        }
        if (dateRange?.to && event.data_evento > dateRange.to) {
            return false;
        }
        if (searchTerm && !event.nome_evento.toLowerCase().includes(searchTerm.toLowerCase()) && !event.contratante_nome.toLowerCase().includes(searchTerm.toLowerCase()) && !event.local.toLowerCase().includes(searchTerm.toLowerCase())) {
            return false;
        }
        return true;
    });
  }, [events, selectedDjId, dateRange, searchTerm]);

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Fechamentos Financeiros</CardTitle>
          <CardDescription>Gere e visualize os fechamentos financeiros dos DJs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/30">
            {/* DJ Selector */}
            {(userDetails?.role === 'admin' || userDetails?.role === 'partner') && (
              <div>
                <label htmlFor="dj-filter" className="text-sm font-medium text-foreground">Selecionar DJ</label>
                <Select value={selectedDjId} onValueChange={setSelectedDjId} disabled={isLoading}>
                  <SelectTrigger id="dj-filter">
                    <SelectValue placeholder={isLoading ? "Carregando..." : "Selecione um DJ"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os DJs</SelectItem>
                    {allDjs.map(dj => (
                      <SelectItem key={dj.uid} value={dj.uid}>{dj.displayName || dj.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Date Picker */}
            <div>
              <label htmlFor="date-range" className="text-sm font-medium text-foreground">Período</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button id="date-range" variant={"outline"} className="w-full justify-start text-left font-normal">
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

            {/* Search Input */}
            <div>
              <label htmlFor="search-events" className="text-sm font-medium text-foreground">Buscar</label>
              <Input
                id="search-events"
                placeholder="Evento, contratante, local..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Eventos do Período</CardTitle>
               <CardDescription>
                Eventos encontrados para o DJ e período selecionados.
              </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Evento</TableHead>
                                <TableHead>DJ</TableHead>
                                <TableHead>Valor Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredEvents.map(event => (
                                <TableRow key={event.id}>
                                    <TableCell>{format(event.data_evento, 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>{event.nome_evento}</TableCell>
                                    <TableCell>{event.dj_nome}</TableCell>
                                    <TableCell>{Number(event.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
                 {filteredEvents.length === 0 && !isLoading && (
                    <p className="text-center text-muted-foreground py-8">Nenhum evento encontrado para os filtros selecionados.</p>
                )}
            </CardContent>
          </Card>

        </CardContent>
      </Card>
    </div>
  );
};

export default SettlementsPage;

    