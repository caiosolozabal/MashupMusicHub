
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, updateDoc, increment, doc } from 'firebase/firestore';
import type { GuestEvent, GuestList } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

  const onSubmit = async (data: SubmissionFormValues) => {
    setIsSubmitting(true);
    try {
      // 1. Criar a submissão
      const subRef = await addDoc(collection(db, 'guest_submissions'), {
        name: data.name,
        whatsapp: data.whatsapp || null,
        instagram: data.instagram || null,
        email: data.email || null,
        eventId: event.id,
        listId: list.id,
        submittedAt: serverTimestamp(),
      });

      // 2. Incrementar contador na lista
      await updateDoc(doc(db, 'guest_events', event.id, 'lists', list.id), {
        submissionCount: increment(1)
      });

      // 3. Sucesso
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
        <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">E-mail</Label>
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
