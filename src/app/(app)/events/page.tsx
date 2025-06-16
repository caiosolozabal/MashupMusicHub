
'use client';

import type { NextPage } from 'next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge, badgeVariants } from '@/components/ui/badge';
import type { Event } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { PlusCircle, Eye, Edit, Trash2, Loader2 } from 'lucide-react';
import type { VariantProps } from 'class-variance-authority';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, Timestamp, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import EventForm, { type EventFormValues } from '@/components/events/EventForm';
import EventView from '@/components/events/EventView';
import { useAuth } from '@/hooks/useAuth';


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
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const fetchEvents = async () => {
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
        // Should not happen if roles are properly set, but as a fallback:
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
    } catch (error) {
      console.error("Error fetching events: ", error);
      toast({ variant: 'destructive', title: 'Erro ao buscar eventos', description: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch events only when auth is done and user/userDetails are available
    if (!authLoading && user && userDetails) {
      fetchEvents();
    } else if (!authLoading && !user) {
      // User is not logged in, clear events and stop loading
      setEvents([]);
      setIsLoading(false);
    }
    // Intentionally not including fetchEvents in dependency array to avoid re-fetching on every render of fetchEvents itself.
    // It should re-fetch when user, userDetails, or authLoading changes that affect its conditions.
  }, [user, userDetails, authLoading]);


  const handleOpenCreateForm = () => {
    setSelectedEvent(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (event: Event) => {
    // DJs should only be able to edit their own events
    if (userDetails?.role === 'dj' && event.dj_id !== user?.uid) {
      toast({ variant: 'destructive', title: 'Acesso Negado', description: 'Você só pode editar seus próprios eventos.'});
      return;
    }
    setSelectedEvent(event);
    setIsFormOpen(true);
  };

  const handleOpenView = (event: Event) => {
    // DJs should only be able to view their own events (already enforced by fetch, but good for direct access attempts)
    if (userDetails?.role === 'dj' && event.dj_id !== user?.uid) {
        toast({ variant: 'destructive', title: 'Acesso Negado', description: 'Você só pode visualizar seus próprios eventos.'});
        return;
    }
    setSelectedEvent(event);
    setIsViewOpen(true);
  };
  
  const handleOpenDeleteConfirm = (event: Event) => {
     // Only admin/partner can delete
    if (!(userDetails?.role === 'admin' || userDetails?.role === 'partner')) {
      toast({ variant: 'destructive', title: 'Acesso Negado', description: 'Você não tem permissão para excluir eventos.'});
      return;
    }
    setSelectedEvent(event);
    setIsDeleteConfirmOpen(true);
  };

  const handleFormSubmit = async (values: EventFormValues) => {
    if (!user || !userDetails) {
      toast({ variant: 'destructive', title: 'Erro de autenticação', description: 'Você precisa estar logado.' });
      return;
    }
    if (!db) {
      toast({ variant: 'destructive', title: 'Erro de banco de dados', description: 'Firestore não inicializado.' });
      return;
    }

    // Ensure DJ cannot change dj_id or dj_name if they are editing
    if (userDetails.role === 'dj' && selectedEvent) {
        if (values.dj_id !== user.uid || values.dj_nome !== (userDetails.displayName || user.displayName)){
            toast({ variant: 'destructive', title: 'Operação Inválida', description: 'Você não pode alterar o DJ atribuído.'});
            // Reset to original values if an attempt was made
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
    
    if (eventData.contratante_contato === undefined) delete (eventData as any).contratante_contato;

    try {
      if (selectedEvent) { 
        // DJs should only be able to edit their own events
        if (userDetails?.role === 'dj' && selectedEvent.dj_id !== user?.uid) {
            toast({ variant: 'destructive', title: 'Acesso Negado', description: 'Você só pode atualizar seus próprios eventos.'});
            setIsSubmitting(false);
            return;
        }
        const eventRef = doc(db, 'events', selectedEvent.id);
        await updateDoc(eventRef, {
          ...eventData,
          updated_at: serverTimestamp(),
        });
        toast({ title: 'Evento atualizado!', description: `"${values.nome_evento}" foi atualizado com sucesso.` });
      } else { 
        // Creating new event
        await addDoc(collection(db, 'events'), {
          ...eventData,
          dj_id: userDetails.role === 'dj' ? user.uid : values.dj_id, // Ensure DJ is self if DJ creates
          dj_nome: userDetails.role === 'dj' ? (userDetails.displayName || user.displayName) : values.dj_nome, // Ensure DJ name is self if DJ creates
          created_by: user.uid,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
          payment_proofs: [], 
          files: [], 
        });
        toast({ title: 'Evento criado!', description: `"${values.nome_evento}" foi criado com sucesso.` });
      }
      setIsFormOpen(false);
      fetchEvents(); 
    } catch (error) {
      console.error("Error saving event: ", error);
      toast({ variant: 'destructive', title: 'Erro ao salvar evento', description: (error as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent || !db) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Evento não selecionado ou Firestore não disponível.' });
      return;
    }
     // Only admin/partner can delete
    if (!(userDetails?.role === 'admin' || userDetails?.role === 'partner')) {
      toast({ variant: 'destructive', title: 'Acesso Negado', description: 'Você não tem permissão para excluir eventos.'});
      return;
    }
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, 'events', selectedEvent.id));
      // TODO: Delete associated files from Firebase Storage if needed
      toast({ title: 'Evento excluído!', description: `"${selectedEvent.nome_evento}" foi excluído com sucesso.` });
      fetchEvents(); 
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

  const canCreateEvents = userDetails?.role === 'admin' || userDetails?.role === 'partner' || userDetails?.role === 'dj';
  const canEditSelectedEvent = (event: Event | null) => {
    if (!event) return false;
    if (userDetails?.role === 'admin' || userDetails?.role === 'partner') return true;
    if (userDetails?.role === 'dj' && event.dj_id === user?.uid) return true;
    return false;
  };
  const canDeleteEvents = userDetails?.role === 'admin' || userDetails?.role === 'partner';


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
          {isLoading ? (
             <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Carregando eventos...</p>
             </div>
          ) : events.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum evento encontrado.</p>
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
                  {events.map((event) => (
                    <TableRow key={event.id} onClick={() => handleOpenView(event)} className="cursor-pointer">
                      <TableCell>
                        <div className="font-medium">{format(event.data_evento, 'dd/MM/yyyy')}</div>
                        <div className="text-xs text-muted-foreground">{event.dia_da_semana}</div>
                        <div className="text-xs text-muted-foreground">{event.horario_inicio ? format(parseISO(`2000-01-01T${event.horario_inicio}`), 'HH:mm') : ''}</div>
                      </TableCell>
                      <TableCell className="font-medium">{event.nome_evento}</TableCell>
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
                        <Button variant="outline" size="icon" aria-label="Visualizar Evento" onClick={() => handleOpenView(event)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canEditSelectedEvent(event) && (
                          <Button variant="outline" size="icon" aria-label="Editar Evento" onClick={() => handleOpenEditForm(event)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {canDeleteEvents && (
                          <Button variant="destructive" size="icon" aria-label="Excluir Evento" onClick={() => handleOpenDeleteConfirm(event)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
            <DialogTitle className="font-headline">{selectedEvent ? 'Editar Evento' : 'Criar Novo Evento'}</DialogTitle>
            <DialogDescription>
              {selectedEvent ? 'Atualize os detalhes do evento.' : 'Preencha as informações para criar um novo evento.'}
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
};

export default EventsPage;
    
