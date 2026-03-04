
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import type { Contact } from '@/lib/types';
import { 
  ArrowLeft, 
  Loader2, 
  User, 
  Phone, 
  Mail, 
  Instagram, 
  Calendar, 
  Ticket,
  MapPin,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

export default function ContactDetailPage() {
  const { contactId } = useParams();
  const router = useRouter();
  const [contact, setContact] = useState<Contact | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!contactId) return;

    // 1. Carregar Dados do Contato
    const fetchContact = async () => {
      const snap = await getDoc(doc(db, 'contacts', contactId as string));
      if (snap.exists()) {
        setContact({ id: snap.id, ...snap.data() } as Contact);
      } else {
        router.push('/contacts');
      }
    };

    // 2. Listener para Histórico de RSVPs
    const q = query(
      collection(db, 'contacts', contactId as string, 'rsvp'),
      orderBy('submittedAt', 'desc')
    );
    const unsubHistory = onSnapshot(q, (snapshot) => {
      setHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    });

    fetchContact();
    return () => unsubHistory();
  }, [contactId, router]);

  if (isLoading || !contact) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-3">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para CRM
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Perfil do Convidado */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader className="text-center pb-2">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <User className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="font-headline text-2xl truncate">{contact.name}</CardTitle>
              <CardDescription>Convidado Mashup</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium">{contact.whatsapp || 'Não informado'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium truncate">{contact.email || 'Não informado'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Instagram className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium">{contact.instagram ? `@${contact.instagram.replace('@', '')}` : 'Não informado'}</span>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-[10px] font-black uppercase text-muted-foreground">Inscrições</p>
                  <p className="text-2xl font-black text-primary">{contact.attendanceCount || 0}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-[10px] font-black uppercase text-muted-foreground">Score</p>
                  <p className="text-2xl font-black text-green-600">A+</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Histórico de Atividade */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Histórico de Eventos (RSVP)
              </CardTitle>
              <CardDescription>Inscrições em listas captadas pela plataforma.</CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground italic">
                  Nenhum registro de evento encontrado.
                </div>
              ) : (
                <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                  {history.map((rsvp) => (
                    <div key={rsvp.id} className="relative flex items-start gap-6">
                      <div className="absolute left-0 mt-1 h-10 w-10 rounded-full border bg-background flex items-center justify-center z-10">
                        <Ticket className="h-5 w-5 text-primary" />
                      </div>
                      
                      <div className="flex-1 ml-12 bg-muted/30 p-4 rounded-xl border border-border/50 hover:border-primary/30 transition-colors">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                          <h4 className="font-bold text-base">{rsvp.eventName}</h4>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-background px-2 py-1 rounded border">
                            {format(rsvp.submittedAt.toDate(), 'dd MMM yyyy', { locale: ptBR })}
                          </span>
                        </div>
                        
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3" />
                            <span>Segmento: <strong>{rsvp.listName}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            <span>Inscrito às {format(rsvp.submittedAt.toDate(), 'HH:mm')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
