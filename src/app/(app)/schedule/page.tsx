
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CalendarDays, List, Loader2, PlusCircle, Eye, Edit, Trash2, Copy } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, addDoc, doc, updateDoc, deleteDoc, Timestamp, serverTimestamp, getDoc } from 'firebase/firestore';
import type { Event, UserDetails } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import ScheduleCalendarView from '@/components/schedule/ScheduleCalendarView';
import ScheduleListView from '@/components/schedule/ScheduleListView';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, startOfDay, getYear, getMonth, startOfMonth, endOfMonth } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as FormDialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import EventForm, { type EventFormValues } from '@/components/events/EventForm';
import EventView from '@/components/events/EventView';
import { calculateDjCut } from '@/lib/utils';
import { logFirebaseContext } from '@/lib/firebase/debug';


type ViewMode = 'month' | 'list';

const getDayOfWeek = (date: Date | undefined): string => {
  if (!date) return '';
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return days[date.getDay()];
};


export default function SchedulePage() {
  const { user, userDetails, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  // Page State
  const [events, setEvents] = useState<Event[]>([]);
  const [allDjs, setAllDjs] = useState<UserDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Filters State
  const [selectedDjId, setSelectedDjId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>(getMonth(new Date()).toString());
  const [selectedYear, setSelectedYear] = useState<string>(getYear(new Date()).toString());
  const availableYears = useMemo(() => {
    const currentYear = getYear(new Date());
    const years = [];
    for (let i = currentYear + 1; i >= currentYear - 5; i--) {
        years.push(i.toString());
    }
    return years;
  }, []);

  const fetchAllData = useCallback(async () => {
    if (authLoading || !user || !userDetails) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      if (!db) throw new Error("Firestore not initialized");

      const dataPromises = [];
      let eventsQuery;

      // Define queries based on user role
      if (userDetails.role === 'admin' || userDetails.role === 'partner') {
        eventsQuery = query(collection(db, 'events'), orderBy('data_evento', 'asc'));
        const djsQuery = query(collection(db, 'users'), where('role', '==', 'dj'), orderBy('displayName'));
        dataPromises.push(getDocs(djsQuery));
      } else if (userDetails.role === 'dj') {
        eventsQuery = query(collection(db, 'events'), where('dj_id', '==', user.uid), orderBy('data_evento', 'asc'));
      } else {
        setEvents([]);
        setAllDjs([]);
        setIsLoading(false);
        return;
      }
      
      dataPromises.unshift(getDocs(eventsQuery));
      
      const results = await Promise.all(dataPromises);

      const eventsSnapshot = results[0];
      const eventsList = eventsSnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          path: docSnapshot.ref.path, // ✅ Store the real path
          ...data,
          data_evento: data.data_evento instanceof Timestamp ? data.data_evento.toDate() : new Date(data.data_evento),
          created_at: data.created_at instanceof Timestamp ? data.created_at.toDate() : new Date(data.created_at),
          updated_at: data.updated_at && (data.updated_at instanceof Timestamp ? data.updated_at.toDate() : new Date(data.updated_at)),
          payment_proofs: Array.isArray(data.payment_proofs) ? data.payment_proofs.map(proof => ({
            ...proof,
            uploadedAt: proof.uploadedAt instanceof Timestamp ? proof.uploadedAt.toDate() : new Date(proof.uploadedAt)
          })) : [],
          files: Array.isArray(data.files) ? data.files.map(file => ({
            ...file,
            uploadedAt: file.uploadedAt instanceof Timestamp ? file.uploadedAt.toDate() : new Date(file.uploadedAt)
          })) : [],
          dj_costs: data.dj_costs ?? 0,
        } as Event;
      });
      setEvents(eventsList);

      if (userDetails.role === 'admin' || userDetails.role === 'partner') {
         const djsSnapshot = results[1];
         const djsList = djsSnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserDetails));
         setAllDjs(djsList);
      } else if (userDetails.role === 'dj') {
        setAllDjs([userDetails]); // For a DJ, their own details are the only ones needed
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
      // When dateRange is changed manually, reset month/year selectors
      if (dateRange) {
        const from = dateRange.from;
        if(from) {
          if (!selectedYear || !selectedMonth || getYear(from) !== parseInt(selectedYear, 10) || getMonth(from) !== parseInt(selectedMonth, 10)) {
              setSelectedYear(undefined);
              setSelectedMonth(undefined);
          }
        }
      }
  }, [dateRange, selectedMonth, selectedYear]);


  const filteredAndGroupedEvents = useMemo(() => {
    let filtered = [...events];
    
    // DJ Filter
    if (selectedDjId !== 'all' && (userDetails?.role === 'admin' || userDetails?.role === 'partner')) {
      filtered = filtered.filter(event => event.dj_id === selectedDjId);
    }
    
    // Date Range Filter
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
    
    // Search Term Filter
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(event => 
        event.nome_evento.toLowerCase().includes(lowerSearchTerm) ||
        event.contratante_nome.toLowerCase().includes(lowerSearchTerm) ||
        event.local.toLowerCase().includes(lowerSearchTerm)
      );
    }

    // Grouping Logic for Linked Events
    const processedIds = new Set<string>();
    const grouped: Event[] = [];

    for (const event of filtered) {
        if (processedIds.has(event.id)) {
            continue;
        }

        if (event.linkedEventId) {
            const linkedEvent = filtered.find(e => e.id === event.linkedEventId);
            
            // Found a pair, add them together
            if (linkedEvent && !processedIds.has(linkedEvent.id)) {
                // Determine order for consistent grouping (e.g., by creation date or type)
                if (event.created_at.getTime() < linkedEvent.created_at.getTime()) {
                     grouped.push(event, linkedEvent);
                } else {
                     grouped.push(linkedEvent, event);
                }
                processedIds.add(event.id);
                processedIds.add(linkedEvent.id);
            } else {
                // Linked event not in filtered list, or already processed, add current event alone
                grouped.push(event);
                processedIds.add(event.id);
            }
        } else {
            // Event is not linked, add it alone
            grouped.push(event);
            processedIds.add(event.id);
        }
    }
    
    return grouped;
  }, [events, selectedDjId, dateRange, searchTerm, userDetails?.role]);


  // --- CRUD Handlers ---
  const canCreateEvents = userDetails?.role === 'admin' || userDetails?.role === 'partner' || userDetails?.role === 'dj';
  
  const showServiceTypeColumn = useMemo(() => {
    if (userDetails?.role === 'admin' || userDetails?.role === 'partner') return true;
    if (userDetails?.role === 'dj' && userDetails.pode_locar) return true;
    return false;
  }, [userDetails]);


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

     // If the event is linked, fetch the linked event's name for display
    if (eventToView.linkedEventId && !eventToView.linkedEventName) {
        try {
            const linkedEventRef = doc(db, 'events', eventToView.linkedEventId);
            const linkedEventSnap = await getDoc(linkedEventRef);
            if(linkedEventSnap.exists()) {
                eventToView.linkedEventName = linkedEventSnap.data().nome_evento;
            }
        } catch (e) {
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
        id: '', // Remove ID to indicate it's a new event
        linkedEventId: null, // Don't carry over the link
        linkedEventName: null,
    };
    setSelectedEvent(duplicatedEventData as Event); // Cast because we know what we are doing
    setIsViewOpen(false); // Close the view dialog
    setIsFormOpen(true); // Open the form dialog with duplicated data
  }


  const handleFormSubmit = async (values: EventFormValues) => {
    if (!user || !userDetails) return toast({ variant: 'destructive', title: 'Erro de autenticação' });
    if (!db) return toast({ variant: 'destructive', title: 'Erro de banco de dados' });

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
      if (selectedEvent && selectedEvent.id) { // Editing existing event
        const eventRef = doc(db, 'events', selectedEvent.id);
        await updateDoc(eventRef, { ...eventData, updated_at: serverTimestamp() });
        toast({ title: 'Evento atualizado!', description: `"${values.nome_evento}" foi atualizado.` });
      } else { // Creating a new event (or a duplicated one)
        await addDoc(collection(db, 'events'), {
          ...eventData,
          dj_id: userDetails.role === 'dj' ? user.uid : values.dj_id,
          dj_nome: userDetails.role === 'dj' ? (userDetails.displayName || user.displayName) : values.dj_nome,
          created_by: user.uid,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
          payment_proofs: [], 
          files: [], 
        });
        toast({ title: 'Evento criado!', description: `"${values.nome_evento}" foi criado.` });
      }
      setIsFormOpen(false);
      fetchAllData(); 
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
      logFirebaseContext();
      console.log("[Delete] selectedEvent.id:", selectedEvent.id);
      console.log("[Delete] selectedEvent.path:", selectedEvent.path);
    
      // ✅ Delete using the real document path
      await deleteDoc(doc(db, selectedEvent.path));

      toast({ title: 'Evento excluído!', description: `"${selectedEvent.nome_evento}" foi excluído.` });
      fetchAllData();
      setIsDeleteConfirmOpen(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error("Error deleting event: ", error);
      toast({ variant: 'destructive', title: 'Erro ao excluir evento', description: (error as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessfulProofUpload = (updatedEvent: Event) => {
    setSelectedEvent(updatedEvent);
    setEvents(prevEvents => prevEvents.map(e => e.id === updatedEvent.id ? updatedEvent : e));
  };


  if (authLoading || isLoading) {
    return (
        <div className="flex flex-col justify-center items-center h-64 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Carregando agenda...</p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <CardTitle className="font-headline text-2xl">Agenda de Eventos</CardTitle>
                <CardDescription>Visualize, crie e gerencie todos os eventos.</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="flex-1">
                <Button variant={viewMode === 'list' ? 'default' : 'outline'} onClick={() => setViewMode('list')} size="sm" className="w-full">
                  <List className="mr-2 h-4 w-4" /> Lista
                </Button>
              </div>
              <div className="flex-1">
                <Button variant={viewMode === 'month' ? 'default' : 'outline'} onClick={() => setViewMode('month')} size="sm" className="w-full">
                  <CalendarDays className="mr-2 h-4 w-4" /> Calendário
                </Button>
              </div>
               {canCreateEvents && (
                <div className="flex-1">
                    <Button onClick={handleOpenCreateForm} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" size="sm">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Novo
                    </Button>
                </div>
               )}
            </div>
          </div>
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

          {isLoading && events.length > 0 && (
             <div className="flex justify-center items-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="ml-2 text-sm text-muted-foreground">Atualizando eventos...</p>
             </div>
          )}

          {viewMode === 'month' && <ScheduleCalendarView events={filteredAndGroupedEvents} allDjs={allDjs} />}
          {viewMode === 'list' && (
            <ScheduleListView
              events={filteredAndGroupedEvents}
              allDjs={allDjs}
              onView={(e) => handleOpenView(e.id)}
              onEdit={handleOpenEditForm}
              onDelete={handleOpenDeleteConfirm}
              showServiceTypeColumn={showServiceTypeColumn}
              calculateDjCut={calculateDjCut}
              isDjView={userDetails?.role === 'dj'}
            />
          )}
          
          {filteredAndGroupedEvents.length === 0 && !isLoading && (
             <p className="text-center text-muted-foreground py-8">Nenhum evento encontrado para os filtros selecionados.</p>
          )}
        </CardContent>
      </Card>

      {/* --- Dialogs --- */}
      <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setSelectedEvent(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-headline">{selectedEvent?.id ? 'Editar Evento' : 'Criar Novo Evento'}</DialogTitle>
            <FormDialogDescription>
              {selectedEvent?.id ? 'Atualize os detalhes do evento.' : 'Preencha as informações para criar um novo evento.'}
            </FormDialogDescription>
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
}

    