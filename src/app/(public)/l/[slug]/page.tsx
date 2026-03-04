
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, updateDoc, increment, Timestamp } from 'firebase/firestore';
import type { GuestEvent, GuestList, UrlSlug } from '@/lib/types';
import { Loader2, Calendar, MapPin, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import PublicGuestListForm from '@/components/guest-lists/PublicGuestListForm';
import Image from 'next/image';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PublicGuestListPage() {
  const { slug } = useParams();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<GuestEvent | null>(null);
  const [list, setList] = useState<GuestList | null>(null);
  const [isClosed, setIsClosed] = useState(false);
  const [closeReason, setCloseReason] = useState<'curfew' | 'capacity' | null>(null);

  useEffect(() => {
    if (!slug) return;

    const fetchData = async () => {
      try {
        // 1. Buscar o ID do evento/lista via slug
        const slugSnap = await getDoc(doc(db, 'slugs', slug as string));
        if (!slugSnap.exists()) {
          setError('Este link não existe ou foi removido.');
          setIsLoading(false);
          return;
        }

        const slugData = slugSnap.data() as UrlSlug;
        
        // 2. Buscar Evento e Lista em paralelo
        const [eventSnap, listSnap] = await Promise.all([
          getDoc(doc(db, 'guest_events', slugData.eventId)),
          getDoc(doc(db, 'guest_events', slugData.eventId, 'lists', slugData.listId))
        ]);

        if (!eventSnap.exists() || !listSnap.exists()) {
          setError('Evento não disponível no momento.');
          setIsLoading(false);
          return;
        }

        const eventData = { id: eventSnap.id, ...eventSnap.data() } as GuestEvent;
        const listData = { id: listSnap.id, ...listSnap.data() } as GuestList;

        setEvent(eventData);
        setList(listData);

        // 3. Verificar Fechamento
        const now = new Date();
        
        // Curfew (Horário de corte)
        if (eventData.curfewAt && eventData.curfewAt.toDate() < now) {
          setIsClosed(true);
          setCloseReason('curfew');
        }
        
        // Capacidade (Lotação)
        else if (listData.capacity && (listData.submissionCount || 0) >= listData.capacity) {
          setIsClosed(true);
          setCloseReason('capacity');
        }
        
        // Evento inativo
        else if (!eventData.isActive) {
          setIsClosed(true);
          setCloseReason('curfew');
        }

      } catch (e: any) {
        console.error(e);
        setError('Ocorreu um erro ao carregar a lista.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Preparando sua entrada...</p>
      </div>
    );
  }

  if (error || !event || !list) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center space-y-6">
        <AlertCircle className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-black uppercase tracking-tighter font-headline">Ops! Algo deu errado</h1>
        <p className="text-muted-foreground max-w-xs">{error || 'Não conseguimos localizar esta lista.'}</p>
        <button onClick={() => router.push('/')} className="text-primary font-black uppercase text-xs tracking-widest underline">Voltar para Mashup</button>
      </div>
    );
  }

  const bgUrl = event.backgroundUrl || 'https://picsum.photos/seed/mashup-bg/1920/1080';

  return (
    <div className="relative min-h-screen bg-black text-white flex flex-col items-center">
      {/* Background com Overlay */}
      <div className="fixed inset-0 z-0">
        <Image src={bgUrl} alt="Background" fill className="object-cover opacity-40 blur-sm" priority unoptimized />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black" />
      </div>

      {/* Conteúdo Principal */}
      <div className="relative z-10 w-full max-w-lg px-4 py-12 flex flex-col gap-8">
        
        {/* Header do Evento */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-[10px] font-black uppercase tracking-widest">
            {list.name}
          </div>
          <h1 className="text-4xl sm:text-5xl font-black font-headline tracking-tighter leading-tight uppercase italic italic">
            {event.name}
          </h1>
          <div className="flex flex-wrap justify-center gap-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            <div className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {format(event.date.toDate(), "dd/MM", { locale: ptBR })}</div>
            <div className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {event.location}</div>
          </div>
        </div>

        {/* Mídia Principal (Se houver) */}
        {event.mediaUrl && (
          <div className="aspect-video w-full rounded-2xl overflow-hidden border border-white/10 bg-card/50 shadow-2xl">
            {event.mediaUrl.includes('mp4') ? (
              <video src={event.mediaUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
            ) : (
              <Image src={event.mediaUrl} alt={event.name} fill className="object-cover" unoptimized />
            )}
          </div>
        )}

        {/* Card do Formulário ou Aviso de Fechado */}
        <Card className="border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden">
          <CardContent className="p-8">
            {isClosed ? (
              <div className="py-12 text-center space-y-6">
                <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black font-headline uppercase tracking-tight">Lista Encerrada</h2>
                  <p className="text-sm text-muted-foreground font-medium">
                    {closeReason === 'capacity' 
                      ? 'Infelizmente esta lista já atingiu o limite de nomes.' 
                      : 'O horário limite para envio de nomes nesta lista já passou.'}
                  </p>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 border-t border-white/5 pt-6">
                  Nos vemos na pista!
                </p>
              </div>
            ) : (
              <>
                <div className="mb-8 space-y-2">
                  <h2 className="text-xl font-black font-headline uppercase tracking-tight">Garanta seu nome</h2>
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                    {event.promoText || 'Preencha os campos abaixo para confirmar sua presença na lista.'}
                  </p>
                </div>

                <PublicGuestListForm 
                  event={event} 
                  list={list} 
                  onSuccess={(id) => router.push(`/l/${slug}/success?id=${id}`)} 
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center py-8">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">
            Powered by Mashup Music Hub
          </p>
        </div>
      </div>
    </div>
  );
}
