
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Ticket, Calendar, MapPin, Loader2, ChevronRight, Copy, MoreVertical, Trash2, Edit } from 'lucide-react';
import Link from 'next/link';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { GuestEvent, GuestList } from '@/lib/types';
import GuestEventFormDialog from '@/components/guest-lists/GuestEventFormDialog';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { v4 as uuidv4 } from 'uuid';

export default function GuestListsAdminPage() {
  const { userDetails } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<GuestEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<GuestEvent | null>(null);
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null);

  useEffect(() => {
    if (!userDetails || (userDetails.role !== 'admin' && userDetails.role !== 'partner')) return;

    const q = query(collection(db, 'guest_events'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as GuestEvent));
      setEvents(eventList);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userDetails]);

  const handleDuplicateEvent = async (originalEvent: GuestEvent) => {
    setIsDuplicating(originalEvent.id);
    try {
      // 1. Criar novo Evento (Data + 7 dias por padrão)
      const newEventDate = addDays(originalEvent.date.toDate(), 7);
      const newEventName = `${originalEvent.name} (Cópia)`;
      
      const newEventRef = await addDoc(collection(db, 'guest_events'), {
        ...originalEvent,
        id: undefined, // Deixar o Firestore gerar
        name: newEventName,
        date: newEventDate,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true,
      });

      // 2. Buscar e clonar Listas
      const listsSnap = await getDocs(collection(db, 'guest_events', originalEvent.id, 'lists'));
      
      for (const listDoc of listsSnap.docs) {
        const listData = listDoc.data() as GuestList;
        const newListId = uuidv4();
        const newSlug = `${listData.slug}-${Math.floor(Math.random() * 1000)}`;
        const newStatsToken = uuidv4().substring(0, 8);

        // Salvar Lista
        await setDoc(doc(db, 'guest_events', newEventRef.id, 'lists', newListId), {
          ...listData,
          id: newListId,
          eventId: newEventRef.id,
          slug: newSlug,
          statsToken: newStatsToken,
          submissionCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Registrar Slug
        await setDoc(doc(db, 'slugs', newSlug), {
          type: 'list',
          eventId: newEventRef.id,
          listId: newListId
        });
      }

      toast({ title: 'Evento duplicado!', description: 'Próxima edição criada com sucesso.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao duplicar', description: e.message });
    } finally {
      setIsDuplicating(null);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Tem certeza que deseja excluir este evento? Todas as listas vinculadas deixarão de ser exibidas no Admin. Esta ação não pode ser desfeita.')) return;
    
    try {
      await deleteDoc(doc(db, 'guest_events', eventId));
      toast({ title: 'Evento excluído com sucesso' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: e.message });
    }
  };

  const handleOpenEdit = (event: GuestEvent) => {
    setSelectedEvent(event);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setSelectedEvent(null);
    setIsFormOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Carregando eventos de captação...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Captação de Convidados</h1>
          <p className="text-muted-foreground">Gerencie as listas de nomes para seus eventos.</p>
        </div>
        <Button onClick={() => { setSelectedEvent(null); setIsFormOpen(true); }} className="bg-primary text-primary-foreground">
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Evento
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {events.length === 0 ? (
          <Card className="col-span-full border-dashed bg-muted/30">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Ticket className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Nenhum evento criado</p>
              <p className="text-sm text-muted-foreground max-w-xs mb-6">Crie seu primeiro evento para começar a captar nomes em listas personalizadas.</p>
              <Button onClick={() => setIsFormOpen(true)} variant="outline">Criar meu primeiro evento</Button>
            </CardContent>
          </Card>
        ) : (
          events.map((event) => (
            <div key={event.id} className="relative group">
              <Link href={`/guest-lists/${event.id}`}>
                <Card className="hover:border-primary transition-all cursor-pointer group h-full">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="font-headline text-xl group-hover:text-primary transition-colors">{event.name}</CardTitle>
                      <div className={`h-2 w-2 rounded-full ${event.isActive ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                    </div>
                    <CardDescription className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(event.date.toDate(), "dd 'de' MMMM", { locale: ptBR })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate">{event.location}</span>
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ver Listas</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
              
              <div className="absolute top-4 right-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.preventDefault(); handleOpenEdit(event); }}>
                      <Edit className="h-4 w-4 mr-2" /> Editar Evento
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.preventDefault(); handleDuplicateEvent(event); }}>
                      {isDuplicating === event.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                      Nova Edição (Duplicar)
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={(e) => { e.preventDefault(); handleDeleteEvent(event.id); }}>
                      <Trash2 className="h-4 w-4 mr-2" /> Excluir Evento
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))
        )}
      </div>

      <GuestEventFormDialog 
        isOpen={isFormOpen} 
        onClose={handleCloseForm} 
        event={selectedEvent}
      />
    </div>
  );
}
