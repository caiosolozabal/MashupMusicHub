'use client';

import type { NextPage } from 'next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge, badgeVariants } from '@/components/ui/badge';
import type { Event, UserDetails } from '@/lib/types';
import { format, parseISO, startOfDay, getYear, getMonth, startOfMonth, endOfMonth } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { PlusCircle, Eye, Edit, Trash2, Loader2, Link as LinkIcon, Disc, Truck, Copy, Calendar as CalendarIcon, X } from 'lucide-react';
import type { VariantProps } from 'class-variance-authority';
import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, Timestamp, serverTimestamp, query, orderBy, where, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import EventForm, { type EventFormValues } from '@/components/events/EventForm';
import EventView from '@/components/events/EventView';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';


const getDayOfWeek = (date: Date | undefined): string => {
  if (!date) return '';
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return days[date.getDay()];
};

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

const EventsPage: NextPage = () => {
  const { user, userDetails, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [allDjs, setAllDjs] = useState<UserDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Filters State
  const [selectedDjId, setSelectedDjId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>();
  const [selectedYear, setSelectedYear] = useState<string | undefined>();
  const availableYears = useMemo(() => {
    const currentYear = getYear(new Date());
    const years = [];
    for (let i = currentYear + 1; i >= currentYear - 5; i--) {
        years.push(i.toString());
    }
    return years;
  }, []);

  const fetchEventsAndDjs = async () => {
    if (authLoading || !user || !userDetails || !db) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const eventsCollectionRef = collection(db, 'events');
      let eventsQuery;

      if (userDetails.role === 'admin' || userDetails.role === 'partner') {
        eventsQuery = query(eventsCollectionRef, orderBy('data_evento', 'desc'));
      } else if (userDetails.role === 'dj') {
        eventsQuery = query(eventsCollectionRef, where('dj_id', '==', user.uid), orderBy('data_evento', 'desc'));
      } else {
        setEvents([]);
        setIsLoading(false);
        toast({ variant: 'destructive', title: 'Acesso Negado', description: 'Você não tem permissão para ver eventos.' });
        return;
      }
      
      const eventsSnapshot = await getDocs(eventsQuery);
      const eventsList = eventsSnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          path: docSnapshot.ref.path,
          ...data,
          data_evento: data.data_evento instanceof Timestamp ? data.data_evento.toDate() : new Date(data.data_evento),
          created_at: data.created_at instanceof Timestamp ? data.created_at.toDate() : new Date(data.created_at),
          updated_at: data.updated_at && (data.updated_at instanceof Timestamp ? data.updated_at.toDate() : new Date(data.updated_at)),
          payment_proofs: Array.isArray(data.payment_proofs) ? data.payment_proofs.map(proof => ({...proof, uploadedAt: proof.uploadedAt instanceof Timestamp ? proof.uploadedAt.toDate() : new Date(proof.uploadedAt)})) : [],
          files: Array.isArray(data.files) ? data.files.map(file => ({...file, uploadedAt: file.uploadedAt instanceof Timestamp ? file.uploadedAt.toDate() : new Date(file.uploadedAt)})) : [],
          dj_costs: data.dj_costs ?? 0, 
        } as Event;
      });
      setEvents(eventsList);

      if (userDetails.role === 'admin' || userDetails.role === 'partner') {
         const djsQuery = query(collection(db, 'users'), where('role', '==', 'dj'), orderBy('displayName'));
         const djsSnapshot = await getDocs(djsQuery);
         const djsList = djsSnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserDetails));
         setAllDjs(djsList);
      }

    } catch (error) {
      console.error("Error fetching data: ", error);
      toast({ variant: 'destructive', title: 'Erro ao buscar dados', description: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user && userDetails) {
      fetchEventsAndDjs();
    } else if (!authLoading && !user) {
      setEvents([]);
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userDetails, authLoading]);
  
  useEffect(() => {
    if (selectedYear && selectedMonth) {
        const year = parseInt(selectedYear, 10);
        const month = parseInt(selectedMonth, 10);
        const start = startOfMonth(new Date(year, month));
        const end = endOfMonth(new Date(year, month));
        setDateRange({ from: start, to: end });
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
      if (dateRange && dateRange.from) {
        const from = dateRange.from;
        if (!selectedYear || !selectedMonth || getYear(from) !== parseInt(selectedYear, 10) || getMonth(from) !== parseInt(selectedMonth, 10)) {
            setSelectedYear(undefined);
            setSelectedMonth(undefined);
        }
      }
  }, [dateRange, selectedMonth, selectedYear]);


  const filteredEvents = useMemo(() => {
    let filtered = [...events];
    
    if (selectedDjId !== 'all' && (userDetails?.role === 'admin' || userDetails?.role === 'partner')) {
      filtered = filtered.filter(event => event.dj_id === selectedDjId);
    }
    
    if (dateRange?.from) {
      const fromDate = startOfDay(dateRange.from); 
      const toDate = dateRange.to ? new Date(dateRange.to) : new Date(8640000000000000); // Far future
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(event => event.data_evento >= fromDate && event.data_evento <= toDate);
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
  }, [events, selectedDjId, dateRange, searchTerm, userDetails?.role]);


  const handleOpenCreateForm = () => {
    setSelectedEvent(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (event: Event) => {
    setSelectedEvent(event);
    setIsFormOpen(true);
  };

  const handleOpenView = async (eventId: string) => {
    const eventToView = events.find(e => e.id === eventId);
    if (!eventToView) return;

    if (eventToView.linkedEventId && !eventToView.linkedEventName) {
        try {
            const linkedEventRef = doc(db, 'events', eventToView.linkedEventId);
            const linkedEventSnap = await getDoc(linkedEventRef);
            if(linkedEventSnap.exists()) {
                eventToView.linkedEventName = linkedEventSnap.data().nome_evento;
            }
        } catch(e) {
            console.error("Could not fetch linked event name", e);
        }
    }

    setSelectedEvent(eventToView);
    setIsViewOpen(true);
  };
  
  const handleOpenDeleteConfirm = (event: Event) => {
    setSelectedEvent(event);
    setIsDeleteConfirmOpen(true);
  };
  
  const handleDuplicateEvent = (originalEvent: Event) => {
    const duplicatedEventData = {
        ...originalEvent,
        id: '',
        linkedEventId: null,
        linkedEventName: null,
    };
    setSelectedEvent(duplicatedEventData as Event);
    setIsViewOpen(false);
    setIsFormOpen(true);
  }


  const handleFormSubmit = async (values: EventFormValues) => {
    if (!user || !userDetails || !db) {
      toast({ variant: 'destructive', title: 'Erro de autenticação ou banco de dados.' });
      return;
    }

    setIsSubmitting(true);
    const eventData = {
      ...values,
      dia_da_semana: getDayOfWeek(values.data_evento),
      data_evento: Timestamp.fromDate(values.data_evento),
      valor_total: Number(values.valor_total),
      valor_sinal: Number(values.valor_sinal),
      dj_costs: values.dj_costs ? Number(values.dj_costs) : 0,
    };
    
    try {
      if (selectedEvent && selectedEvent.id) {
        const eventRef = doc(db, 'events', selectedEvent.id);
        await updateDoc(eventRef, { ...eventData, updated_at: serverTimestamp() });
        toast({ title: 'Evento atualizado!', description: `"${values.nome_evento}" foi atualizado com sucesso.` });
      } else {
        await addDoc(collection(db, 'events'), {
          ...eventData,
          dj_id: userDetails.role === 'dj' ? user.uid : values.dj_id,
          dj_nome: userDetails.role === 'dj' ? userDetails.displayName : values.dj_nome,
          created_by: user.uid,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
          payment_proofs: [], 
          files: [], 
        });
        toast({ title: 'Evento criado!', description: `"${values.nome_evento}" foi criado com sucesso.` });
      }
      setIsFormOpen(false);
      fetchEventsAndDjs(); 
    } catch (error) {
      console.error("Error saving event: ", error);
      toast({ variant: 'destructive', title: 'Erro ao salvar evento', description: (error as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent || !db) return;
    
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, selectedEvent.path));
      toast({ title: 'Evento excluído!', description: `"${selectedEvent.nome_evento}" foi excluído.` });
      fetchEventsAndDjs(); 
      setIsDeleteConfirmOpen(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error("Error deleting event:", error);
      toast({ variant: 'destructive', title: 'Erro ao excluir evento', description: (error as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessfulProofUpload = (updatedEvent: Event) => {
    setSelectedEvent(updatedEvent);
    setEvents(prevEvents => prevEvents.map(e => e.id === updatedEvent.id ? updatedEvent : e));
  };

  const canCreateEvents = userDetails?.role === 'admin' || userDetails?.role === 'partner' || userDetails?.role === 'dj';
  
  const canEditDeleteEvent = (event: Event) => {
    if (!user || !userDetails) return false;
    if (userDetails.role === 'admin' || userDetails.role === 'partner') return true;
    if (userDetails.role === 'dj' && event.dj_id === user.uid) return true;
    return false;
  };
  
  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="font-headline text-2xl">Gerenciar Eventos</CardTitle>
            <CardDescription>Visualize, crie e edite os eventos.</CardDescription>
          </div>
          {canCreateEvents && (
            <Button onClick={handleOpenCreateForm} className="ml-auto bg-primary hover:bg-primary/90 text-primary-foreground">
              <PlusCircle className="mr-2 h-5 w-5" />
              Novo Evento
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <Input 
              placeholder="Buscar por evento, contratante, local..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="lg:col-span-2"
            />
             <div className="flex items-center gap-1 lg:col-span-1">
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
                        <span>Todo o período</span>
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
                {dateRange && (
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setDateRange(undefined)}>
                        <X className="h-4 w-4" />
                    </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 lg:col-span-1">
                  <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={!selectedYear}>
                      <SelectTrigger><SelectValue placeholder="Mês" /></SelectTrigger>
                      <SelectContent>
                          {[{ value: '0', label: 'Janeiro' }, { value: '1', label: 'Fevereiro' }, { value: '2', label: 'Março' }, { value: '3', label: 'Abril' }, { value: '4', label: 'Maio' }, { value: '5', label: 'Junho' }, { value: '6', label: 'Julho' }, { value: '7', label: 'Agosto' }, { value: '8', label: 'Setembro' }, { value: '9', label: 'Outubro' }, { value: '10', label: 'Novembro' }, { value: '11', label: 'Dezembro' }].map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                      </SelectContent>
                  </Select>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger><SelectValue placeholder="Ano" /></SelectTrigger>
                      <SelectContent>
                          {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                      </SelectContent>
                  </Select>
              </div>
            {(userDetails?.role === 'admin' || userDetails?.role === 'partner') && (
              <Select value={selectedDjId} onValueChange={setSelectedDjId} disabled={isLoading}>
                <SelectTrigger className="lg:col-span-1">
                  <SelectValue placeholder={isLoading ? "Carregando..." : "Filtrar por DJ"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os DJs</SelectItem>
                  {allDjs.map(dj => (
                    <SelectItem key={dj.uid} value={dj.uid}>{dj.displayName || dj.email}</SelectItem>
                  ))}
                   {!isLoading && allDjs.length === 0 && <SelectItem value="no-djs" disabled>Nenhum DJ cadastrado</SelectItem>}
                </SelectContent>
              </Select>
            )}
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
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Conta Recebeu</TableHead>
                    <TableHead>Status Pag.</TableHead>
                    <TableHead>DJ</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => (
                    <TableRow key={event.id} onClick={() => handleOpenView(event.id)} className="cursor-pointer">
                      <TableCell>
                        <div className="font-medium">{format(event.data_evento, 'dd/MM/yyyy')}</div>
                        <div className="text-xs text-muted-foreground">{event.dia_da_semana}</div>
                        <div className="text-xs text-muted-foreground">{event.horario_inicio ? format(parseISO(`2000-01-01T${event.horario_inicio}`), 'HH:mm') : ''}</div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                            {event.tipo_servico === 'locacao_equipamento' ? <Truck className="h-4 w-4 text-muted-foreground" /> : <Disc className="h-4 w-4 text-muted-foreground" />}
                            <span>{event.nome_evento}</span>
                            {event.settlementId && <LinkIcon className="h-4 w-4 text-primary" title={`Este evento pertence a um fechamento`} />}
                        </div>
                      </TableCell>
                      <TableCell>{event.local}</TableCell>
                      <TableCell>{event.contratante_nome}</TableCell>
                      <TableCell>
                        {Number(event.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                       <TableCell className="capitalize">
                        {event.conta_que_recebeu === 'agencia' ? 'Agência' : 'DJ'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(event.status_pagamento)} className="capitalize text-xs">
                          {getStatusText(event.status_pagamento)}
                        </Badge>
                      </TableCell>
                      <TableCell>{event.dj_nome}</TableCell>
                      <TableCell className="text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline" size="icon" aria-label="Visualizar Evento" onClick={() => handleOpenView(event.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canEditDeleteEvent(event) && (
                          <>
                            <Button variant="outline" size="icon" aria-label="Editar Evento" onClick={() => handleOpenEditForm(event)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="destructive" size="icon" aria-label="Excluir Evento" onClick={() => handleOpenDeleteConfirm(event)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setSelectedEvent(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-headline">{selectedEvent?.id ? 'Editar Evento' : 'Criar Novo Evento'}</DialogTitle>
            <DialogDescription>
              {selectedEvent?.id ? 'Atualize os detalhes do evento.' : 'Preencha as informações para criar um novo evento.'}
            </DialogDescription>
          </DialogHeader>
          <EventForm
            event={selectedEvent}
            onSubmit={handleFormSubmit}
            onCancel={() => { setIsFormOpen(false); setSelectedEvent(null); }}
            isLoading={isSubmitting}
            onSuccessfulProofUpload={handleSuccessfulProofUpload}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isViewOpen} onOpenChange={(open) => { setIsViewOpen(open); if (!open) setSelectedEvent(null); }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Evento: {selectedEvent?.nome_evento}</DialogTitle>
          </DialogHeader>
          <EventView event={selectedEvent} onViewEvent={handleOpenView} onDuplicateEvent={handleDuplicateEvent}/>
           <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o evento "{selectedEvent?.nome_evento}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedEvent(null)} disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvent}
              disabled={isSubmitting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default EventsPage;
