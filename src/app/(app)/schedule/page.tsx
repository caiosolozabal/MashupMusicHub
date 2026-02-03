'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CalendarDays, List, Loader2, PlusCircle, X } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, addDoc, doc, updateDoc, deleteDoc, Timestamp, serverTimestamp, getDoc, documentId } from 'firebase/firestore';
import type { Event, UserDetails, FinancialSettlement } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import ScheduleCalendarView from '@/components/schedule/ScheduleCalendarView';
import ScheduleListView from '@/components/schedule/ScheduleListView';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, getYear, getMonth, startOfMonth, endOfMonth, isEqual } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as FormDialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import EventForm, { type EventFormValues } from '@/components/events/EventForm';
import EventView from '@/components/events/EventView';
import { calculateDjCut, getEventOperationalState } from '@/lib/utils';


type ViewMode = 'month' | 'list';

const getDayOfWeek = (date: Date | undefined): string => {
  if (!date) return '';
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return days[date.getDay()];
};

const months = [
  { value: '0', label: 'Janeiro' }, { value: '1', label: 'Fevereiro' }, { value: '2', label: 'Março' },
  { value: '3', label: 'Abril' }, { value: '4', label: 'Maio' }, { value: '5', label: 'Junho' },
  { value: '6', label: 'Julho' }, { value: '7', label: 'Agosto' }, { value: '8', label: 'Setembro' },
  { value: '9', label: 'Outubro' }, { value: '10', label: 'Novembro' }, { value: '11', label: 'Dezembro' }
];

export default function SchedulePage() {
  const { user, userDetails, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [events, setEvents] = useState<Event[]>([]);
  const [allDjs, setAllDjs] = useState<UserDetails[]>([]);
  const [settlements, setSettlements] = useState<Record<string, FinancialSettlement>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const [selectedDjId, setSelectedDjId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>(getMonth(new Date()).toString());
  const [selectedYear, setSelectedYear] = useState<string | undefined>(getYear(new Date()).toString());

  const fetchAllData = useCallback(async () => {
    if (authLoading || !user || !userDetails) return;
    setIsLoading(true);
    try {
      let eventsQuery;
      if (userDetails.role === 'admin' || userDetails.role === 'partner') {
        eventsQuery = query(collection(db, 'events'), orderBy('data_evento', 'asc'));
      } else {
        eventsQuery = query(collection(db, 'events'), where('dj_id', '==', user.uid), orderBy('data_evento', 'asc'));
      }
      
      const eventsSnapshot = await getDocs(eventsQuery);
      const eventsList = eventsSnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        path: docSnap.ref.path,
        ...docSnap.data(),
        data_evento: docSnap.data().data_evento.toDate(),
        created_at: docSnap.data().created_at.toDate(),
      } as Event));
      setEvents(eventsList);

      // Buscar Settlements para determinar estado operacional
      const settlementIds = Array.from(new Set(eventsList.map(e => e.settlementId).filter(id => !!id))) as string[];
      if (settlementIds.length > 0) {
        const chunks = [];
        for (let i = 0; i < settlementIds.length; i += 30) chunks.push(settlementIds.slice(i, i + 30));
        const settlementSnaps = await Promise.all(chunks.map(chunk => getDocs(query(collection(db, 'settlements'), where(documentId(), 'in', chunk)))));
        const newSettlements: Record<string, FinancialSettlement> = {};
        settlementSnaps.forEach(snap => snap.docs.forEach(d => { newSettlements[d.id] = { id: d.id, ...d.data() } as FinancialSettlement }));
        setSettlements(newSettlements);
      }

      if (userDetails.role === 'admin' || userDetails.role === 'partner') {
        const djsSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'dj'), orderBy('displayName')));
        setAllDjs(djsSnapshot.docs.map(d => ({ ...d.data(), uid: d.id } as UserDetails)));
      }
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erro ao carregar dados' });
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, user, userDetails, toast]);

  useEffect(() => { fetchAllData(); }, [authLoading, user, userDetails, fetchAllData]);

  // Sync dateRange when month/year dropdowns are used
  useEffect(() => {
    if (selectedYear && selectedMonth) {
      const year = parseInt(selectedYear, 10);
      const month = parseInt(selectedMonth, 10);
      const newFrom = startOfMonth(new Date(year, month));
      const newTo = endOfMonth(new Date(year, month));

      if (!dateRange || !isEqual(dateRange.from || 0, newFrom) || !isEqual(dateRange.to || 0, newTo)) {
        setDateRange({ from: newFrom, to: newTo });
      }
    }
  }, [selectedMonth, selectedYear, dateRange]);

  const filteredEvents = useMemo(() => {
    let filtered = events.filter(e => {
      const matchesDj = selectedDjId === 'all' || e.dj_id === selectedDjId;
      const matchesSearch = !searchTerm || e.nome_evento.toLowerCase().includes(searchTerm.toLowerCase()) || e.contratante_nome.toLowerCase().includes(searchTerm.toLowerCase());
      let matchesDate = true;
      if (dateRange?.from) {
        matchesDate = e.data_evento >= startOfDay(dateRange.from) && (!dateRange.to || e.data_evento <= endOfMonth(dateRange.to));
      }
      return matchesDj && matchesSearch && matchesDate;
    });
    return filtered;
  }, [events, selectedDjId, searchTerm, dateRange]);

  const handleFormSubmit = async (values: EventFormValues) => {
    setIsSubmitting(true);
    try {
      const data = { ...values, data_evento: Timestamp.fromDate(values.data_evento), updated_at: serverTimestamp() };
      if (selectedEvent?.id) {
        await updateDoc(doc(db, 'events', selectedEvent.id), data);
      } else {
        await addDoc(collection(db, 'events'), { ...data, dj_id: userDetails?.role === 'dj' ? user!.uid : values.dj_id, created_at: serverTimestamp() });
      }
      setIsFormOpen(false);
      fetchAllData();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro ao salvar' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div><CardTitle>Agenda de Eventos</CardTitle><CardDescription>Gerenciamento operacional mensal.</CardDescription></div>
          <div className="flex gap-2">
            <Button variant={viewMode === 'list' ? 'default' : 'outline'} onClick={() => setViewMode('list')} size="sm"><List className="h-4 w-4 mr-2" />Lista</Button>
            <Button variant={viewMode === 'month' ? 'default' : 'outline'} onClick={() => setViewMode('month')} size="sm"><CalendarDays className="h-4 w-4 mr-2" />Calendário</Button>
            <Button onClick={() => { setSelectedEvent(null); setIsFormOpen(true); }} size="sm" className="bg-primary"><PlusCircle className="h-4 w-4 mr-2" />Novo</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Input placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            <Select value={selectedDjId} onValueChange={setSelectedDjId}>
              <SelectTrigger><SelectValue placeholder="DJ" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos DJs</SelectItem>{allDjs.map(dj => <SelectItem key={dj.uid} value={dj.uid}>{dj.displayName}</SelectItem>)}</SelectContent>
            </Select>
            <div className="col-span-2 flex gap-2">
               <Select value={selectedMonth} onValueChange={setSelectedMonth}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent></Select>
               <Select value={selectedYear} onValueChange={setSelectedYear}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['2025','2026'].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>

          {viewMode === 'list' ? (
            <ScheduleListView 
              events={filteredEvents} 
              allDjs={allDjs} 
              settlements={settlements}
              onView={e => { setSelectedEvent(e); setIsViewOpen(true); }}
              onEdit={e => { setSelectedEvent(e); setIsFormOpen(true); }}
              onDelete={e => { setSelectedEvent(e); setIsDeleteConfirmOpen(true); }}
              isDjView={userDetails?.role === 'dj'}
            />
          ) : (
            <ScheduleCalendarView events={filteredEvents} allDjs={allDjs} />
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selectedEvent ? 'Editar Evento' : 'Novo Evento'}</DialogTitle></DialogHeader>
          {selectedEvent && getEventOperationalState(selectedEvent, settlements[selectedEvent.settlementId || '']) === 'closed' ? (
            <div className="p-4 bg-muted rounded-md text-sm border-l-4 border-primary">
              Este evento está <strong>Encerrado</strong> operacionalmente e financeiramente. Edições estão desabilitadas para preservar o histórico.
            </div>
          ) : (
            <EventForm event={selectedEvent} onSubmit={handleFormSubmit} onCancel={() => setIsFormOpen(false)} isLoading={isSubmitting} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-xl"><EventView event={selectedEvent} /></DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir Evento?</AlertDialogTitle><AlertDialogDescription>Ação irreversível.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive" onClick={async () => { await deleteDoc(doc(db, 'events', selectedEvent!.id)); fetchAllData(); setIsDeleteConfirmOpen(false); }}>Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}