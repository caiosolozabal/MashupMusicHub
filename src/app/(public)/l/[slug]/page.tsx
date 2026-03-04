
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
    <div className="relative min-h-screen bg-black text-white flex flex-col items-center overflow-x-hidden">
      {/* Background Camada 1: Imagem com Blur Extremo */}
      <div className="fixed inset-0 z-0">
        <Image src={bgUrl} alt="Background" fill className="object-cover opacity-50 blur-[80px] scale-110" priority unoptimized />
        {/* Camada 2: Gradiente de Escurecimento para Contraste */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black" />
      </div>

      <div className="relative z-10 w-full max-w-4xl px-4 py-8 md:py-16 flex flex-col gap-10 items-center">
        
        {/* Header Section com Efeito Glassmorphism */}
        <div className="text-center space-y-6 w-full max-w-2xl">
          <div className="inline-flex flex-col items-center gap-4">
            <div className="bg-primary text-black px-8 py-3 rounded-full shadow-[0_0_30px_rgba(132,255,30,0.4)] transform hover:scale-105 transition-transform">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] leading-none mb-1 opacity-80">Você está na lista</p>
              <h2 className="text-xl font-black uppercase tracking-tighter leading-none">{list.name}</h2>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md border border-white/20 px-5 py-2 rounded-2xl flex items-center gap-3">
              <Tag className="h-4 w-4 text-primary" />
              <div>
                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest leading-none">Cód. Desconto</p>
                <p className="text-sm font-black uppercase text-primary tracking-[0.2em] leading-none mt-1">{slug}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-black font-headline tracking-tighter leading-[0.85] uppercase italic text-white drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]">
              {event.name}
            </h1>
            
            <div className="flex flex-wrap justify-center gap-3">
              <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-xs font-bold uppercase tracking-widest text-white">
                <Calendar className="h-4 w-4 text-primary" /> 
                {format(event.date.toDate(), "dd 'de' MMMM", { locale: ptBR })}
              </div>
              <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-xs font-bold uppercase tracking-widest text-white">
                <MapPin className="h-4 w-4 text-primary" /> 
                {event.location}
              </div>
            </div>
          </div>
        </div>

        {/* Media Container: Flexível para Vertical ou Horizontal */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          
          {/* Coluna 1: Mídia Principal (Flyer) */}
          <div className="lg:col-span-3 space-y-6">
            {event.mediaUrl ? (
              <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-black/40 shadow-2xl transition-all duration-500 hover:border-primary/30">
                {event.mediaUrl.includes('mp4') ? (
                  <video src={event.mediaUrl} autoPlay loop muted playsInline className="w-full h-auto max-h-[70vh] object-contain" />
                ) : (
                  <div className="relative w-full flex justify-center bg-black/20">
                    <img 
                      src={event.mediaUrl} 
                      alt={event.name} 
                      className="w-full h-auto max-h-[75vh] object-contain"
                    />
                  </div>
                )}
                <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_60px_rgba(0,0,0,0.5)]" />
              </div>
            ) : (
              <div className="aspect-[3/4] w-full rounded-3xl bg-white/5 border border-dashed border-white/10 flex items-center justify-center">
                <Ticket className="h-16 w-16 text-white/10" />
              </div>
            )}

            {event.promoText && (
              <div className="p-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-3 flex items-center gap-2">
                  <Info className="h-4 w-4" /> Sobre o Evento
                </h3>
                <p className="text-sm text-muted-foreground font-medium whitespace-pre-wrap leading-relaxed">
                  {event.promoText}
                </p>
              </div>
            )}
          </div>

          {/* Coluna 2: Formulário e Valores */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden border-t-primary/20 border-t-2">
              <CardContent className="p-6 md:p-8">
                {isClosed ? (
                  <div className="py-12 text-center space-y-6">
                    <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10">
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
                  </div>
                ) : (
                  <>
                    <div className="mb-8 space-y-6">
                      <div className="space-y-4">
                        <h2 className="text-xl font-black font-headline uppercase tracking-tight flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-primary" />
                          Garantir Vaga
                        </h2>
                        
                        {list.customPromoText && (
                          <div className="p-5 bg-primary/10 border border-primary/20 rounded-2xl space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Valores & Horários:</p>
                            <div className="space-y-2">
                              {list.customPromoText.split('\n').map((line, i) => {
                                const parts = line.split(':');
                                return (
                                  <div key={i} className="flex items-center justify-between gap-4 border-b border-white/5 pb-1 last:border-0 last:pb-0">
                                    <p className="text-xs font-bold text-white uppercase tracking-tight">{parts[0]}</p>
                                    <p className="text-sm font-black text-primary">{parts[1] || ''}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
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

            <div className="text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20">
                Powered by Mashup Music Hub
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
