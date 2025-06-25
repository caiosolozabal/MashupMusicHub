
'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CalendarDays, List, Loader2, PlusCircle, Eye, Edit, Trash2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, addDoc, doc, updateDoc, deleteDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import type { Event, UserDetails } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import ScheduleCalendarView from '@/components/schedule/ScheduleCalendarView';
import ScheduleListView from '@/components/schedule/ScheduleListView';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, startOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as FormDialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import EventForm, { type EventFormValues } from '@/components/events/EventForm';
import EventView from '@/components/events/EventView';


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
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: startOfDay(new Date()), to: undefined });
  const [searchTerm, setSearchTerm] = useState('');

  const fetchEventsAndDjs = async () => {
    if (authLoading || !user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      if (!db) throw new Error("Firestore not initialized");
      const eventsCollection = collection(db, 'events');
      let q;

      if (userDetails?.role === 'admin' || userDetails?.role === 'partner') {
        q = query(eventsCollection, orderBy('data_evento', 'asc'));
      } else if (userDetails?.role === 'dj') {
        q = query(eventsCollection, where('dj_id', '==', user.uid), orderBy('data_evento', 'asc'));
      } else {
        setEvents([]);
        setIsLoading(false);
        return;
      }
      
      const eventsSnapshot = await getDocs(q);
      const eventsList = eventsSnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
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

      if (userDetails?.role === 'admin' || userDetails?.role === 'partner') {
         const usersCollection = collection(db, 'users');
         const djsQuery = query(usersCollection, where('role', '==', 'dj'));
         const djsSnapshot = await getDocs(djsQuery);
         const djsList = djsSnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserDetails));
         setAllDjs(djsList.sort((a,b) => (a.displayName || '').localeCompare(b.displayName || '')));
      }

    } catch (error) {
      console.error("Error fetching events: ", error);
      toast({ variant: 'destructive', title: 'Erro ao carregar agenda', description: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEventsAndDjs();
  }, [user, authLoading, userDetails?.role]);

  const filteredEvents = useMemo(() => {
    let filtered = [...events];
    
    // DJ Filter
    if (selectedDjId !== 'all' && (userDetails?.role === 'admin' || userDetails?.role === 'partner')) {
      filtered = filtered.filter(event => event.dj_id === selectedDjId);
    }
    
    // Date Range Filter
    if (dateRange?.from) {
      const fromDate = startOfDay(dateRange.from); 
      // If 'to' is not provided, it's an open-ended range from 'from' date.
      if (!dateRange.to) {
         filtered = filtered.filter(event => event.data_evento >= fromDate);
      } 
      // If 'to' is provided, it's a closed range.
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
    
    return filtered;
  }, [events, selectedDjId, dateRange, searchTerm, userDetails?.role]);


  // --- CRUD Handlers ---
  const canCreateEvents = userDetails?.role === 'admin' || userDetails?.role === 'partner' || userDetails?.role === 'dj';
  const canEditEvent = (event: Event) => {
    if (!event) return false;
    if (userDetails?.role === 'admin' || userDetails?.role === 'partner') return true;
    if (userDetails?.role === 'dj' && event.dj_id === user?.uid) return true;
    return false;
  };
  const canDeleteEvents = userDetails?.role === 'admin' || userDetails?.role === 'partner';

  const handleOpenCreateForm = () => {
    setSelectedEvent(null);
    setIsFormOpen(true);
  };
  const handleOpenEditForm = (event: Event) => {
    if (!canEditEvent(event)) {
      toast({ variant: 'destructive', title: 'Acesso Negado', description: 'Você não tem permissão para editar este evento.'});
      return;
    }
    setSelectedEvent(event);
    setIsFormOpen(true);
  };
  const handleOpenView = (event: Event) => {
    setSelectedEvent(event);
    setIsViewOpen(true);
  };
  const handleOpenDeleteConfirm = (event: Event) => {
    if (!canDeleteEvents) {
      toast({ variant: 'destructive', title: 'Acesso Negado', description: 'Você não tem permissão para excluir eventos.'});
      return;
    }
    setSelectedEvent(event);
    setIsDeleteConfirmOpen(true);
  };

  const handleFormSubmit = async (values: EventFormValues) => {
    if (!user || !userDetails) return toast({ variant: 'destructive', title: 'Erro de autenticação' });
    if (!db) return toast({ variant: 'destructive', title: 'Erro de banco de dados' });

    if (userDetails.role === 'dj' && selectedEvent) {
        if (values.dj_id !== user.uid || values.dj_nome !== (userDetails.displayName || user.displayName)){
            toast({ variant: 'destructive', title: 'Operação Inválida', description: 'Você não pode alterar o DJ atribuído.'});
            values.dj_id = user.uid;
            values.dj_nome = userDetails.displayName || user.displayName || user.email || '';
        }
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
      if (selectedEvent) {
        if (!canEditEvent(selectedEvent)) throw new Error('Permissão para editar negada.');
        const eventRef = doc(db, 'events', selectedEvent.id);
        await updateDoc(eventRef, { ...eventData, updated_at: serverTimestamp() });
        toast({ title: 'Evento atualizado!', description: `"${values.nome_evento}" foi atualizado.` });
      } else {
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
      fetchEventsAndDjs(); 
    } catch (error) {
      console.error("Error saving event: ", error);
      toast({ variant: 'destructive', title: 'Erro ao salvar evento', description: (error as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent || !db || !canDeleteEvents) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Ação de exclusão não permitida ou evento não selecionado.' });
      return;
    }
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, 'events', selectedEvent.id));
      toast({ title: 'Evento excluído!', description: `"${selectedEvent.nome_evento}" foi excluído.` });
      fetchEventsAndDjs(); 
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


  if (authLoading || (isLoading && events.length === 0)) {
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
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <Input 
              placeholder="Buscar por evento, contratante, local..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="lg:col-span-2"
            />
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
            {(userDetails?.role === 'admin' || userDetails?.role === 'partner') && (
              <Select value={selectedDjId} onValueChange={setSelectedDjId} disabled={allDjs.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por DJ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os DJs</SelectItem>
                  {allDjs.map(dj => (
                    <SelectItem key={dj.uid} value={dj.uid}>{dj.displayName || dj.email}</SelectItem>
                  ))}
                   {allDjs.length === 0 && <SelectItem value="no-djs" disabled>Nenhum DJ cadastrado</SelectItem>}
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

          {viewMode === 'month' && <ScheduleCalendarView events={filteredEvents} allDjs={allDjs} />}
          {viewMode === 'list' && (
            <ScheduleListView
              events={filteredEvents}
              allDjs={allDjs}
              djPercentual={userDetails?.dj_percentual ?? null}
              onView={handleOpenView}
              onEdit={handleOpenEditForm}
              onDelete={handleOpenDeleteConfirm}
              canEdit={canEditEvent}
              canDelete={canDeleteEvents}
            />
          )}
          
          {filteredEvents.length === 0 && !isLoading && (
             <p className="text-center text-muted-foreground py-8">Nenhum evento encontrado para os filtros selecionados.</p>
          )}
        </CardContent>
      </Card>

      {/* --- Dialogs --- */}
      <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setSelectedEvent(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-headline">{selectedEvent ? 'Editar Evento' : 'Criar Novo Evento'}</DialogTitle>
            <FormDialogDescription>
              {selectedEvent ? 'Atualize os detalhes do evento.' : 'Preencha as informações para criar um novo evento.'}
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
          <EventView event={selectedEvent} />
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
