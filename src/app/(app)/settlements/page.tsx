
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import type { Event, UserDetails } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge, badgeVariants } from '@/components/ui/badge';
import type { VariantProps } from 'class-variance-authority';


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


export default function SettlementsPage() {
  const { user, userDetails, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [events, setEvents] = useState<Event[]>([]);
  const [allDjs, setAllDjs] = useState<UserDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [selectedDjId, setSelectedDjId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAllData = useCallback(async () => {
    if (authLoading || !user || !userDetails) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      if (!db) throw new Error("Firestore not initialized");

      const dataPromises = [];
      const eventsQuery = query(collection(db, 'events'), orderBy('data_evento', 'asc'));
      dataPromises.push(getDocs(eventsQuery));

      if (userDetails.role === 'admin' || userDetails.role === 'partner') {
        const djsQuery = query(collection(db, 'users'), where('role', '==', 'dj'), orderBy('displayName'));
        dataPromises.push(getDocs(djsQuery));
      }
      
      const results = await Promise.all(dataPromises);

      const eventsSnapshot = results[0];
      const eventsList = eventsSnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          ...data,
          data_evento: data.data_evento instanceof Timestamp ? data.data_evento.toDate() : new Date(data.data_evento),
        } as Event;
      });
      setEvents(eventsList);

      if (userDetails.role === 'admin' || userDetails.role === 'partner') {
         const djsSnapshot = results[1];
         const djsList = djsSnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserDetails));
         setAllDjs(djsList);
      }

    } catch (error) {
      console.error("Error fetching data: ", error);
      toast({ variant: 'destructive', title: 'Erro ao carregar dados', description: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, user, userDetails, toast]);


  useEffect(() => {
    if (!authLoading && user && userDetails) {
        fetchAllData();
    } else if (!authLoading && (!user || !userDetails)) {
        setIsLoading(false);
    }
  }, [authLoading, user, userDetails, fetchAllData]);

  const filteredEvents = useMemo(() => {
    let filtered = [...events];
    
    if (selectedDjId !== 'all') {
      filtered = filtered.filter(event => event.dj_id === selectedDjId);
    }
    
    if (dateRange?.from) {
      const fromDate = startOfDay(dateRange.from); 
      if (!dateRange.to) {
         filtered = filtered.filter(event => event.data_evento >= fromDate);
      } 
      else {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        filtered = filtered.filter(event => event.data_evento >= fromDate && event.data_evento <= toDate);
      }
    }
    
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(event => 
        event.nome_evento.toLowerCase().includes(lowerSearchTerm) ||
        event.contratante_nome.toLowerCase().includes(lowerSearchTerm) ||
        event.local.toLowerCase().includes(lowerSearchTerm)
      );
    }
    
    return filtered;
  }, [events, selectedDjId, dateRange, searchTerm]);

  if (authLoading) {
    return (
        <div className="flex flex-col justify-center items-center h-64 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Carregando...</p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <CardTitle className="font-headline text-2xl">Fechamentos</CardTitle>
                <CardDescription>Selecione um DJ e o período para gerar um novo fechamento.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
                <label className="text-sm font-medium">DJ</label>
                <Select value={selectedDjId} onValueChange={setSelectedDjId} disabled={isLoading}>
                    <SelectTrigger>
                    <SelectValue placeholder={isLoading ? "Carregando..." : "Selecione o DJ"} />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="all">Todos os DJs</SelectItem>
                    {allDjs.map(dj => (
                        <SelectItem key={dj.uid} value={dj.uid}>{dj.displayName || dj.email}</SelectItem>
                    ))}
                    {!isLoading && allDjs.length === 0 && <SelectItem value="no-djs" disabled>Nenhum DJ cadastrado</SelectItem>}
                    </SelectContent>
                </Select>
            </div>
             <div className="space-y-2">
                <label className="text-sm font-medium">Período</label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                        id="date"
                        variant={"outline"}
                        className="w-full justify-start text-left font-normal"
                        >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                            dateRange.to ? (
                            <>
                                {format(dateRange.from, "LLL dd, y")} -{" "}
                                {format(dateRange.to, "LLL dd, y")}
                            </>
                            ) : (
                            `A partir de ${format(dateRange.from, "LLL dd, y")}`
                            )
                        ) : (
                            <span>Selecione o período</span>
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar Evento</label>
              <Input 
                placeholder="Buscar por evento, contratante, local..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
             <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Carregando eventos...</p>
             </div>
          ) : filteredEvents.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum evento encontrado para os filtros selecionados.</p>
          ) : (
             <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Contratante</TableHead>
                    <TableHead>Status Pag.</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Custos DJ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div className="font-medium">{format(event.data_evento, 'dd/MM/yyyy')}</div>
                        <div className="text-xs text-muted-foreground">{event.dia_da_semana}</div>
                      </TableCell>
                      <TableCell className="font-medium">{event.nome_evento}</TableCell>
                      <TableCell>{event.local}</TableCell>
                      <TableCell>{event.contratante_nome}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(event.status_pagamento)} className="capitalize text-xs">
                          {getStatusText(event.status_pagamento)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {Number(event.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                      <TableCell>
                        {Number(event.dj_costs || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
