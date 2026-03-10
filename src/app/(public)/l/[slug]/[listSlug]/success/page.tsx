'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import type { GuestEvent, GuestList, GuestSubmission } from '@/lib/types';
import { Loader2, CheckCircle2, Share2, ArrowLeft } from 'lucide-react';
import ConfirmationTicket from '@/components/guest-lists/ConfirmationTicket';
import Link from 'next/link';

function SuccessContent() {
  const { slug, listSlug } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const submissionId = searchParams.get('id');

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<{ event: GuestEvent; list: GuestList; submission: GuestSubmission } | null>(null);

  useEffect(() => {
    if (!slug || !listSlug || !submissionId) {
      router.push(`/l/${slug}/${listSlug}`);
      return;
    }

    const fetchData = async () => {
      try {
        const eventQuery = query(collection(db, 'guest_events'), where('slug', '==', slug), limit(1));
        const eventSnap = await getDocs(eventQuery);
        
        if (eventSnap.empty) return;
        const eventDoc = eventSnap.docs[0];
        const eventData = { id: eventDoc.id, ...eventDoc.data() } as GuestEvent;

        const listQuery = query(collection(db, 'guest_events', eventData.id, 'lists'), where('slug', '==', listSlug), limit(1));
        const listSnap = await getDocs(listQuery);
        
        if (listSnap.empty) return;
        const listDoc = listSnap.docs[0];
        const listData = { id: listDoc.id, ...listDoc.data() } as GuestList;

        const subSnap = await getDoc(doc(db, 'guest_submissions', submissionId));

        if (subSnap.exists()) {
          setData({
            event: eventData,
            list: listData,
            submission: { id: subSnap.id, ...subSnap.data() } as GuestSubmission
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [slug, listSlug, submissionId, router]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-md space-y-8 flex flex-col items-center">
        
        <div className="text-center space-y-3">
          <div className="h-16 w-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
          <h1 className="text-3xl font-black font-headline uppercase tracking-tighter">Confirmado!</h1>
          <p className="text-muted-foreground text-sm font-medium">Seu nome foi registrado com sucesso.</p>
        </div>

        <ConfirmationTicket 
          event={data.event} 
          list={data.list} 
          submission={data.submission} 
        />

        <div className="w-full space-y-4">
          <p className="text-[10px] font-black uppercase text-center tracking-[0.2em] text-white/40">
            Tire um print para apresentar na porta
          </p>
          
          <div className="grid grid-cols-1 gap-3">
            <button 
              onClick={() => {
                const text = `Acabei de entrar na lista para o evento ${data.event.name}! 🚀\n\nGaranta seu lugar aqui: ${window.location.origin}/l/${slug}/${listSlug}`;
                const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
                window.open(url, '_blank');
              }}
              className="w-full flex items-center justify-center gap-2 bg-primary text-black font-black uppercase text-xs tracking-widest py-4 rounded-2xl hover:scale-[1.02] transition-transform"
            >
              <Share2 className="h-4 w-4" /> Compartilhar com Amigos
            </button>
            
            <Link 
              href={`/l/${slug}/${listSlug}`}
              className="w-full flex items-center justify-center gap-2 bg-white/5 text-white font-bold text-xs tracking-widest py-4 rounded-2xl border border-white/10 hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar para a Página
            </Link>
          </div>
        </div>

        <div className="pt-8 opacity-20 hover:opacity-50 transition-opacity">
          <img src="/logo.png" alt="Mashup Music Hub" className="h-6 object-contain grayscale invert" />
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-black">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
