
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import type { GuestEvent, GuestList } from '@/lib/types';
import { Loader2, Calendar, MapPin, Clock, AlertCircle, Ticket, Info, Tag, Instagram, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import PublicGuestListForm from '@/components/guest-lists/PublicGuestListForm';
import Image from 'next/image';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

export default function HierarchicalGuestListPage() {
  const params = useParams();
  const router = useRouter();
  
  // No Next.js, o nome do parâmetro é definido pelo nome da pasta.
  // Padronizamos para 'slug' (evento) e 'listSlug' (lista).
  const eventSlug = params.slug as string;
  const listSlug = params.listSlug as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<GuestEvent | null>(null);
  const [list, setList] = useState<GuestList | null>(null);
  const [isClosed, setIsClosed] = useState(false);
  const [closeReason, setCloseReason] = useState<'curfew' | 'capacity' | null>(null);

  useEffect(() => {
    if (!eventSlug || !listSlug) return;

    const fetchData = async () => {
      try {
        // 1. Buscar o Evento pelo Slug do evento
        const eventQuery = query(collection(db, 'guest_events'), where('slug', '==', eventSlug), limit(1));
        const eventSnap = await getDocs(eventQuery);
        
        if (eventSnap.empty) {
          setError('Evento não encontrado.');
          setIsLoading(false);
          return;
        }

        const eventDoc = eventSnap.docs[0];
        const eventData = { id: eventDoc.id, ...eventDoc.data() } as GuestEvent;
        setEvent(eventData);

        // 2. Buscar a Lista dentro do Evento (sub-coleção) usando listSlug
        const listQuery = query(collection(db, 'guest_events', eventData.id, 'lists'), where('slug', '==', listSlug), limit(1));
        const listSnap = await getDocs(listQuery);

        if (listSnap.empty) {
          setError('Lista não encontrada para este evento.');
          setIsLoading(false);
          return;
        }

        const listDoc = listSnap.docs[0];
        const listData = { id: listDoc.id, ...listDoc.data() } as GuestList;
        setList(listData);

        // 3. Verificação de Encerramento
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
        setError('Erro ao carregar a página.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [eventSlug, listSlug]);

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
      <div className="fixed inset-0 z-0 pointer-events-none">
        {bgUrl.includes('mp4') ? (
          <video src={bgUrl} autoPlay loop muted playsInline className="h-full w-full object-cover" />
        ) : (
          <Image src={bgUrl} alt="Background" fill className="object-cover" priority unoptimized />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
      </div>

      <div className="relative z-10 w-full max-w-2xl px-4 py-8 md:py-16 flex flex-col items-center min-h-screen">
        <Card className="w-full border-white/[0.08] bg-[#0a0a0a]/65 backdrop-blur-[16px] shadow-2xl rounded-[16px] overflow-hidden">
          <CardContent className="p-6 md:p-10 space-y-8">
            <div className="text-center space-y-4">
              <div className="inline-flex flex-col items-center gap-2">
                <Badge className="bg-primary text-black px-6 py-1.5 rounded-full font-black uppercase tracking-[0.2em] text-[10px]">
                  {list.name}
                </Badge>
                <div className="flex items-center gap-2 text-white">
                  <Tag className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest">CÓDIGO: {eventSlug}/{listSlug}</span>
                </div>
              </div>

              <h1 className="text-4xl md:text-6xl font-black font-headline tracking-tighter leading-[0.9] uppercase italic text-white">
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
                {event.instagramHandle && (
                  <a 
                    href={`https://instagram.com/${event.instagramHandle.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white bg-primary/20 px-3 py-1.5 rounded-lg border border-primary/30 hover:bg-primary/30"
                  >
                    <Instagram className="h-3.5 w-3.5 text-primary" /> 
                    Siga: {event.instagramHandle}
                  </a>
                )}
              </div>
            </div>

            {isClosed ? (
              <div className="py-12 text-center space-y-6">
                <Clock className="h-12 w-12 text-white/60 mx-auto" />
                <h2 className="text-2xl font-black font-headline uppercase text-white">Lista Encerrada</h2>
                <p className="text-sm text-white/80">{closeReason === 'capacity' ? 'Limite atingido.' : 'Horário limite encerrado.'}</p>
              </div>
            ) : (
              <>
                {event.promoText && (
                  <div className="pt-2">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white mb-4 flex items-center gap-2">
                      <Info className="h-4 w-4 text-primary" /> Sobre o Evento
                    </h3>
                    <p className="text-sm text-white/90 font-medium whitespace-pre-wrap leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5">
                      {event.promoText}
                    </p>
                  </div>
                )}

                {list.customPromoText && (
                  <div className="p-6 bg-primary/10 border border-primary/20 rounded-2xl">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2 mb-2">
                      <Sparkles className="h-3 w-3" /> Valores & Horários:
                    </h3>
                    <div className="text-sm font-bold text-white uppercase whitespace-pre-wrap">
                      {list.customPromoText}
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white mb-6 flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-primary" /> Coloque seus nomes
                  </h3>
                  <PublicGuestListForm 
                    event={event} 
                    list={list} 
                    onSuccess={(id) => router.push(`/l/${eventSlug}/${listSlug}/success?id=${id}`)} 
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
