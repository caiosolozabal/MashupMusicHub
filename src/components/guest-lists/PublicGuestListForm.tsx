
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  updateDoc, 
  increment, 
  doc, 
  getDocs, 
  query, 
  where,
  limit,
  setDoc
} from 'firebase/firestore';
import type { GuestEvent, GuestList } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

const submissionSchema = z.object({
  name: z.string().min(3, 'Nome é obrigatório'),
  whatsapp: z.string().optional(),
  instagram: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
});

type SubmissionFormValues = z.infer<typeof submissionSchema>;

interface PublicGuestListFormProps {
  event: GuestEvent;
  list: GuestList;
  onSuccess: (id: string) => void;
}

export default function PublicGuestListForm({ event, list, onSuccess }: PublicGuestListFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors } } = useForm<SubmissionFormValues>({
    resolver: zodResolver(submissionSchema),
  });

  const updateCRM = async (data: SubmissionFormValues) => {
    try {
      let contactId = null;
      const emailLower = data.email?.toLowerCase();
      const waDigits = data.whatsapp?.replace(/\D/g, '');

      // 1. Tentar encontrar por WhatsApp ou Email para deduplicar
      if (waDigits) {
        const waSnap = await getDocs(query(collection(db, 'contacts'), where('whatsapp', '==', waDigits), limit(1)));
        if (!waSnap.empty) contactId = waSnap.docs[0].id;
      }
      
      if (!contactId && emailLower) {
        const emSnap = await getDocs(query(collection(db, 'contacts'), where('email', '==', emailLower), limit(1)));
        if (!emSnap.empty) contactId = emSnap.docs[0].id;
      }

      // 2. Criar ou Atualizar Contato
      const finalContactId = contactId || uuidv4();
      const contactRef = doc(db, 'contacts', finalContactId);
      
      await setDoc(contactRef, {
        name: data.name,
        whatsapp: waDigits || null,
        instagram: data.instagram || null,
        email: emailLower || null,
        lastActivity: serverTimestamp(),
        attendanceCount: increment(1),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // 3. Registrar RSVP (histórico)
      await addDoc(collection(db, 'contacts', finalContactId, 'rsvp'), {
        eventId: event.id,
        listId: list.id,
        eventName: event.name,
        listName: list.name,
        submittedAt: serverTimestamp(),
      });

      return finalContactId;
    } catch (e) {
      console.warn("CRM Update failed (non-critical):", e);
      return null;
    }
  };

  const onSubmit = async (data: SubmissionFormValues) => {
    setIsSubmitting(true);
    try {
      // 1. Atualizar CRM (em paralelo, sem travar o usuário)
      const contactId = await updateCRM(data);

      // 2. Criar a submissão oficial da lista
      const subRef = await addDoc(collection(db, 'guest_submissions'), {
        name: data.name,
        whatsapp: data.whatsapp || null,
        instagram: data.instagram || null,
        email: data.email?.toLowerCase() || null,
        eventId: event.id,
        listId: list.id,
        contactId: contactId,
        submittedAt: serverTimestamp(),
      });

      // 3. Incrementar contador na lista
      await updateDoc(doc(db, 'guest_events', event.id, 'lists', list.id), {
        submissionCount: increment(1)
      });

      // 4. Sucesso
      onSuccess(subRef.id);
    } catch (e: any) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Erro ao enviar', description: 'Por favor, tente novamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome Completo *</Label>
        <Input 
          id="name" 
          {...register('name')} 
          placeholder="Ex: João da Silva" 
          className="bg-white/5 border-white/10 h-12 rounded-xl focus:ring-primary focus:border-primary placeholder:text-white/20"
        />
        {errors.name && <p className="text-[10px] text-destructive font-bold uppercase">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="whatsapp" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">WhatsApp</Label>
          <Input 
            id="whatsapp" 
            {...register('whatsapp')} 
            placeholder="(21) 99999-9999" 
            className="bg-white/5 border-white/10 h-12 rounded-xl focus:ring-primary focus:border-primary placeholder:text-white/20"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="instagram" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Instagram</Label>
          <Input 
            id="instagram" 
            {...register('instagram')} 
            placeholder="@usuario" 
            className="bg-white/5 border-white/10 h-12 rounded-xl focus:ring-primary focus:border-primary placeholder:text-white/20"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">E-mail (Opcional)</Label>
        <Input 
          id="email" 
          {...register('email')} 
          placeholder="seu@email.com" 
          className="bg-white/5 border-white/10 h-12 rounded-xl focus:ring-primary focus:border-primary placeholder:text-white/20"
        />
        {errors.email && <p className="text-[10px] text-destructive font-bold uppercase">{errors.email.message}</p>}
      </div>

      <Button 
        type="submit" 
        disabled={isSubmitting} 
        className="w-full bg-primary text-black font-black uppercase text-xs tracking-[0.2em] py-7 rounded-2xl shadow-2xl shadow-primary/20 hover:scale-[1.02] transition-transform mt-4"
      >
        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Send className="mr-2 h-4 w-4" /> Enviar para a Lista</>}
      </Button>
    </form>
  );
}
