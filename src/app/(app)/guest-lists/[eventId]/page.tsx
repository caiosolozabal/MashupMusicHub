
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, orderBy, deleteDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Settings, 
  PlusCircle, 
  Copy, 
  ExternalLink, 
  Users, 
  BarChart3, 
  Trash2, 
  Loader2,
  MoreVertical,
  Link as LinkIcon,
  Eye,
  Layers
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { GuestEvent, GuestList } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import GuestListFormDialog from '@/components/guest-lists/GuestListFormDialog';
import SubmissionsDialog from '@/components/guest-lists/SubmissionsDialog';
import BatchListDialog from '@/components/guest-lists/BatchListDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export default function GuestEventDetailPage() {
  const { eventId } = useParams();
  const { userDetails } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [event, setEvent] = useState<GuestEvent | null>(null);
  const [lists, setLists] = useState<GuestList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Dialogs
  const [isListFormOpen, setIsListFormOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isSubmissionsOpen, setIsSubmissionsOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<GuestList | null>(null);

  useEffect(() => {
    if (!eventId || !userDetails) return;

    const unsubEvent = onSnapshot(doc(db, 'guest_events', eventId as string), (snap) => {
      if (snap.exists()) {
        setEvent({ id: snap.id, ...snap.data() } as GuestEvent);
      } else {
        router.push('/guest-lists');
      }
    });

    const q = query(collection(db, 'guest_events', eventId as string, 'lists'), orderBy('name', 'asc'));
    const unsubLists = onSnapshot(q, (snapshot) => {
      setLists(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GuestList)));
      setIsLoading(false);
    });

    return () => {
      unsubEvent();
      unsubLists();
    };
  }, [eventId, userDetails, router]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!', description: `${label} copiado para a área de transferência.` });
  };

  const handleDeleteList = async (listId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta lista? Todos os inscritos permanecerão no banco de dados, mas o link parará de funcionar.')) return;
    try {
      await deleteDoc(doc(db, 'guest_events', eventId as string, 'lists', listId));
      toast({ title: 'Lista excluída' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: e.message });
    }
  };

  if (isLoading || !event) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" asChild className="-ml-3 w-fit">
          <Link href="/guest-lists">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Eventos
          </Link>
        </Button>
        
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">{event.name}</h1>
            <p className="text-muted-foreground">
              {format(event.date.toDate(), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })} • {event.location}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsBatchOpen(true)}>
              <Layers className="mr-2 h-4 w-4" />
              Criar em Lote
            </Button>
            <Button size="sm" onClick={() => { setSelectedList(null); setIsListFormOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Criar Nova Lista
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Listas Ativas
            </CardTitle>
            <CardDescription>Gerencie os segmentos e links de captação deste evento.</CardDescription>
          </CardHeader>
          <CardContent>
            {lists.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/20">
                <p className="text-muted-foreground">Nenhuma lista criada para este evento.</p>
                <div className="mt-4 flex justify-center gap-2">
                  <Button variant="link" onClick={() => setIsListFormOpen(true)} className="text-primary font-bold">Criar lista individual</Button>
                  <Button variant="link" onClick={() => setIsBatchOpen(true)} className="text-primary font-bold">Criar em lote</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {lists.map((list) => {
                  const publicUrl = `${window.location.origin}/l/${list.slug}`;
                  const statsUrl = `${window.location.origin}/stats/${list.slug}?token=${list.statsToken}`;

                  return (
                    <div key={list.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg">{list.name}</h3>
                          <Badge variant="secondary" className="text-[10px] uppercase">{list.submissionCount || 0} nomes</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <LinkIcon className="h-3 w-3" />
                          <span>/{list.slug}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setSelectedList(list); setIsSubmissionsOpen(true); }}>
                          <Eye className="mr-2 h-3.5 w-3.5" />
                          Ver Inscritos
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(publicUrl, 'Link da lista')}>
                          <Copy className="mr-2 h-3.5 w-3.5" />
                          Link
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => { 
                            copyToClipboard(statsUrl, 'Link de estatísticas');
                            window.open(statsUrl, '_blank');
                          }}
                        >
                          <BarChart3 className="mr-2 h-3.5 w-3.5" />
                          Stats
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="mr-2 h-4 w-4" /> Ver Página
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedList(list); setIsListFormOpen(true); }}>
                              <Settings className="mr-2 h-4 w-4" /> Configurar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteList(list.id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir Lista
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <GuestListFormDialog 
        isOpen={isListFormOpen} 
        onClose={() => setIsListFormOpen(false)} 
        eventId={eventId as string}
        list={selectedList}
      />

      <BatchListDialog
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
        eventId={eventId as string}
        eventName={event.name}
      />

      <SubmissionsDialog
        isOpen={isSubmissionsOpen}
        onClose={() => setIsSubmissionsOpen(false)}
        list={selectedList}
      />
    </div>
  );
}
