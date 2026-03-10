'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, getDocs, limit } from 'firebase/firestore';
import type { GuestEvent, GuestList, GuestSubmission } from '@/lib/types';
import { Loader2, Users, Search, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function StatsContent() {
  const { slug, listSlug } = useParams();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<GuestEvent | null>(null);
  const [list, setList] = useState<GuestList | null>(null);
  const [submissions, setSubmissions] = useState<GuestSubmission[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!slug || !listSlug || !token) {
      setError('Link inválido ou sem token de acesso.');
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const eventQuery = query(collection(db, 'guest_events'), where('slug', '==', slug), limit(1));
        const eventSnap = await getDocs(eventQuery);
        
        if (eventSnap.empty) {
          setError('Evento não encontrado.');
          setIsLoading(false);
          return;
        }

        const eventDoc = eventSnap.docs[0];
        const eventData = { id: eventDoc.id, ...eventDoc.data() } as GuestEvent;
        setEvent(eventData);

        const listQuery = query(collection(db, 'guest_events', eventData.id, 'lists'), where('slug', '==', listSlug), limit(1));
        const listSnap = await getDocs(listQuery);

        if (listSnap.empty) {
          setError('Lista não encontrada.');
          setIsLoading(false);
          return;
        }

        const listDoc = listSnap.docs[0];
        const listData = { id: listDoc.id, ...listDoc.data() } as GuestList;

        if (listData.statsToken !== token) {
          setError('Token de acesso inválido.');
          setIsLoading(false);
          return;
        }

        setList(listData);

        const q = query(
          collection(db, 'guest_submissions'),
          where('listId', '==', listData.id),
          orderBy('submittedAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          setSubmissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GuestSubmission)));
          setIsLoading(false);
        });

        return () => unsubscribe();

      } catch (e: any) {
        console.error(e);
        setError('Erro ao carregar estatísticas.');
        setIsLoading(false);
      }
    };

    fetchData();
  }, [slug, listSlug, token]);

  const filteredSubmissions = submissions.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground uppercase font-black text-[10px] tracking-widest">Carregando estatísticas...</p>
      </div>
    );
  }

  if (error || !event || !list) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black px-6 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-xl font-black uppercase text-white">Acesso Negado</h1>
        <p className="text-muted-foreground mt-2 max-w-xs">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <Users className="h-5 w-5" />
              <span className="text-xs font-black uppercase tracking-widest">Painel do Promoter</span>
            </div>
            <h1 className="text-4xl font-black font-headline tracking-tighter uppercase italic">{list.name}</h1>
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">
              {event.name} • {format(event.date.toDate(), "dd/MM", { locale: ptBR })}
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center min-w-[160px]">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Total de Nomes</span>
            <span className="text-5xl font-black text-primary leading-none">{submissions.length}</span>
          </div>
        </div>

        <Card className="bg-white/5 border border-white/10 text-white rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-white/10 pb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="font-headline uppercase italic">Lista de Inscritos</CardTitle>
                <CardDescription className="text-muted-foreground">Estes nomes entrarão automaticamente no sistema.</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar nome..." 
                  className="bg-black/40 border-white/10 pl-10 h-10 rounded-xl"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white/[0.02]">
                  <TableRow className="border-white/10">
                    <TableHead className="text-muted-foreground uppercase font-black text-[10px] tracking-widest">Convidado</TableHead>
                    <TableHead className="text-muted-foreground uppercase font-black text-[10px] tracking-widest">Contato</TableHead>
                    <TableHead className="text-muted-foreground uppercase font-black text-[10px] tracking-widest text-right">Inscrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-12 text-muted-foreground font-medium">
                        Nenhum nome encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSubmissions.map((sub) => (
                      <TableRow key={sub.id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                        <TableCell className="py-4">
                          <div className="font-bold">{sub.name}</div>
                          {sub.instagram && <div className="text-[10px] text-primary font-bold">@{sub.instagram.replace('@', '')}</div>}
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="text-xs text-muted-foreground">{sub.whatsapp || '---'}</div>
                          <div className="text-[10px] text-muted-foreground/60">{sub.email}</div>
                        </TableCell>
                        <TableCell className="py-4 text-right font-mono text-[10px] text-muted-foreground">
                          {format(sub.submittedAt.toDate(), "HH:mm")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20">
            Mashup Music Hub • Real-time Stats
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PromoterStatsPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-black"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}>
      <StatsContent />
    </Suspense>
  );
}
