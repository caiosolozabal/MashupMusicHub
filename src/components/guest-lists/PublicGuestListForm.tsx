'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '@/lib/firebase';
import { 
  collection, 
  serverTimestamp, 
  increment, 
  doc, 
  getDocs, 
  query, 
  where,
  limit,
  setDoc,
  writeBatch,
  addDoc
} from 'firebase/firestore';
import type { GuestEvent, GuestList } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Send, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

const submissionSchema = z.object({
  names: z.string().min(3, 'Insira pelo menos um nome'),
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

  const updateCRM = async (primaryName: string, data: SubmissionFormValues) => {
    try {
      let contactId = null;
      const emailLower = data.email?.toLowerCase();
      const waDigits = data.whatsapp?.replace(/\D/g, '');

      if (waDigits) {
        const waSnap = await getDocs(query(collection(db, 'contacts'), where('whatsapp', '==', waDigits), limit(1)));
        if (!waSnap.empty) contactId = waSnap.docs[0].id;
      }
      
      if (!contactId && emailLower) {
        const emSnap = await getDocs(query(collection(db, 'contacts'), where('email', '==', emailLower), limit(1)));
        if (!emSnap.empty) contactId = emSnap.docs[0].id;
      }

      const finalContactId = contactId || uuidv4();
      const contactRef = doc(db, 'contacts', finalContactId);
      
      await setDoc(contactRef, {
        name: primaryName,
        whatsapp: waDigits || null,
        instagram: data.instagram || null,
        email: emailLower || null,
        lastActivity: serverTimestamp(),
        attendanceCount: increment(1),
        updatedAt: serverTimestamp(),
      }, { merge: true });

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
    const nameList = data.names
      .split('\n')
      .map(n => n.trim())
      .filter(n => n.length >= 3);

    if (nameList.length === 0) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Por favor, insira nomes válidos (mínimo 3 caracteres).' });
      return;
    }

    setIsSubmitting(true);
    const batch = writeBatch(db);
    let primarySubmissionId = '';

    try {
      const contactId = await updateCRM(nameList[0], data);

      nameList.forEach((name, index) => {
        const subRef = doc(collection(db, 'guest_submissions'));
        if (index === 0) primarySubmissionId = subRef.id;

        const submissionData = {
          name,
          eventId: event.id,
          listId: list.id,
          submittedAt: serverTimestamp(),
          contactId: index === 0 ? contactId : null,
          whatsapp: index === 0 ? (data.whatsapp || null) : null,
          instagram: index === 0 ? (data.instagram || null) : null,
          email: index === 0 ? (data.email?.toLowerCase() || null) : null,
        };

        batch.set(subRef, submissionData);
      });

      batch.update(doc(db, 'guest_events', event.id, 'lists', list.id), {
        submissionCount: increment(nameList.length)
      });

      await batch.commit();
      onSuccess(primarySubmissionId);
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
        <Label htmlFor="names" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
          <Users className="h-3 w-3" /> Nomes Completos *
        </Label>
        <Textarea 
          id="names" 
          {...register('names')} 
          placeholder="João da Silva&#10;Maria Souza&#10;Pedro Oliveira" 
          className="bg-white/5 border-white/10 min-h-[120px] rounded-xl focus:ring-primary focus:border-primary placeholder:text-white/20 text-sm"
        />
        <p className="text-[9px] text-white/40 font-bold uppercase ml-1">Você pode colocar mais de um nome. Coloque um nome por linha.</p>
        {errors.names && <p className="text-[10px] text-destructive font-bold uppercase">{errors.names.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="whatsapp" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Seu WhatsApp</Label>
          <input 
            id="whatsapp" 
            {...register('whatsapp')} 
            placeholder="(21) 99999-9999" 
            className="flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="instagram" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Seu Instagram</Label>
          <input 
            id="instagram" 
            {...register('instagram')} 
            placeholder="@usuario" 
            className="flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Seu E-mail (Opcional)</Label>
        <input 
          id="email" 
          {...register('email')} 
          placeholder="seu@email.com" 
          className="flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
