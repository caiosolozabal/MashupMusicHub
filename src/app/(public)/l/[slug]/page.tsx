'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { GuestEvent, GuestList, UrlSlug } from '@/lib/types';
import { Loader2, Calendar, MapPin, Clock, AlertCircle, Ticket, Info, Tag, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import PublicGuestListForm from '@/components/guest-lists/PublicGuestListForm';
import Image from 'next/image';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

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
        const slugSnap = await getDoc(doc(db, 'slugs', slug as string));
        if (!slugSnap.exists()) {
          setError('Este link não existe ou foi removido.');
          setIsLoading(false);
          return;
        }

        const slugData = slugSnap.data() as UrlSlug;
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

        const now = new Date();
        if (eventData.curfewAt && eventData.curfewAt.toDate() < now) {
          setIsClosed(true);
          setCloseReason('curfew');
        } else if (listData.capacity && (listData.submissionCount || 0) >= listData.capacity) {
          setIsClosed(true);
          setCloseReason('capacity');
        } else if (!eventData.isActive) {
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

  const bgUrl = event.backgroundUrl || event.mediaUrl || 'https://picsum.photos/seed/mashup-bg/1920/1080';

  return (
    <div className="relative min-h-screen flex flex-col items-center overflow-x-hidden">
      {/* Background Camada 0: Imagem nítida */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {bgUrl.includes('mp4') ? (
          <video src={bgUrl} autoPlay loop muted playsInline className="h-full w-full object-cover" />
        ) : (
          <Image 
            src={bgUrl} 
            alt="Background" 
            fill 
            className="object-cover" 
            priority 
            unoptimized 
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
      </div>

      {/* Conteúdo Camada 10: Glassmorphism */}
      <div className="relative z-10 w-full max-w-2xl px-4 py-8 md:py-16 flex flex-col items-center min-h-screen">
        <Card className="w-full border-white/[0.08] bg-[#0a0a0a]/65 backdrop-blur-[16px] shadow-2xl rounded-[16px] overflow-hidden">
          <CardContent className="p-6 md:p-10 space-y-8">
            <div className="text-center space-y-4">
              <div className="inline-flex flex-col items-center gap-2">
                <Badge className="bg-primary text-black px-6 py-1.5 rounded-full font-black uppercase tracking-[0.2em] text-[10px] shadow-[0_0_15px_rgba(132,255,30,0.3)]">
                  {list.name}
                </Badge>
                <div className="flex items-center gap-2 text-white">
                  <Tag className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Código: {slug}</span>
                </div>
              </div>

              <h1 className="text-4xl md:text-6xl font-black font-headline tracking-tighter leading-[0.9] uppercase italic text-white drop-shadow-lg">
                {event.name}
              </h1>
              
              <div className="flex flex-wrap justify-center gap-4">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">
                  <Calendar className="h-3.5 w-3.5 text-primary" /> 
                  {format(event.date.toDate(), "dd 'de' MMMM", { locale: ptBR })}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">
                  <MapPin className="h-3.5 w-3.5 text-primary" /> 
                  {event.location}
                </div>
              </div>
            </div>

            {isClosed ? (
              <div className="py-12 text-center space-y-6">
                <Clock className="h-12 w-12 text-white/60 mx-auto" />
                <div className="space-y-2">
                  <h2 className="text-2xl font-black font-headline uppercase tracking-tight text-white">Lista Encerrada</h2>
                  <p className="text-sm text-white/80 font-medium">
                    {closeReason === 'capacity' 
                      ? 'Infelizmente esta lista já atingiu o limite de nomes.' 
                      : 'O horário limite para envio de nomes nesta lista já passou.'}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {list.customPromoText && (
                  <div className="p-6 bg-primary/10 border border-primary/20 rounded-2xl space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                      <Sparkles className="h-3 w-3" /> Valores & Horários:
                    </h3>
                    <div className="text-sm font-bold text-white uppercase tracking-tight whitespace-pre-wrap leading-relaxed">
                      {list.customPromoText}
                    </div>
                  </div>
                )}

                <PublicGuestListForm 
                  event={event} 
                  list={list} 
                  onSuccess={(id) => router.push(`/l/${slug}/success?id=${id}`)} 
                />

                {event.promoText && (
                  <div className="pt-8 border-t border-white/10">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white mb-4 flex items-center gap-2">
                      <Info className="h-4 w-4 text-primary" /> Sobre o Evento
                    </h3>
                    <p className="text-sm text-white/90 font-medium whitespace-pre-wrap leading-relaxed">
                      {event.promoText}
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
