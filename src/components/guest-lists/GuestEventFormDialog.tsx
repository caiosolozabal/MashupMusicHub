
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const guestEventSchema = z.object({
  name: z.string().min(3, 'Nome é obrigatório'),
  date: z.string().min(1, 'Data é obrigatória'),
  location: z.string().min(1, 'Local é obrigatório'),
  promoText: z.string().optional(),
  curfewAt: z.string().optional(),
});

type GuestEventFormValues = z.infer<typeof guestEventSchema>;

interface GuestEventFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event?: any;
}

export default function GuestEventFormDialog({ isOpen, onClose, event }: GuestEventFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors }, reset } = useForm<GuestEventFormValues>({
    resolver: zodResolver(guestEventSchema),
    defaultValues: event ? {
      name: event.name,
      date: event.date ? format(event.date.toDate(), "yyyy-MM-dd'T'HH:mm") : '',
      location: event.location,
      promoText: event.promoText || '',
      curfewAt: event.curfewAt ? format(event.curfewAt.toDate(), "yyyy-MM-dd'T'HH:mm") : '',
    } : {
      name: '',
      date: '',
      location: '',
      promoText: '',
      curfewAt: '',
    }
  });

  const onSubmit = async (data: GuestEventFormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        name: data.name,
        date: Timestamp.fromDate(new Date(data.date)),
        location: data.location,
        promoText: data.promoText || null,
        curfewAt: data.curfewAt ? Timestamp.fromDate(new Date(data.curfewAt)) : null,
        isActive: true,
        updatedAt: serverTimestamp(),
      };

      if (event) {
        await updateDoc(doc(db, 'guest_events', event.id), payload);
        toast({ title: 'Evento atualizado!' });
      } else {
        await addDoc(collection(db, 'guest_events'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Evento criado com sucesso!' });
      }
      reset();
      onClose();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">{event ? 'Editar Evento' : 'Novo Evento de Captação'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Evento</Label>
            <Input id="name" {...register('name')} placeholder="Ex: Farra 07/03" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Data e Hora</Label>
              <Input id="date" type="datetime-local" {...register('date')} />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="curfewAt">Fechamento Lista (Opcional)</Label>
              <Input id="curfewAt" type="datetime-local" {...register('curfewAt')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Local</Label>
            <Input id="location" {...register('location')} placeholder="Ex: Jockey Club" />
            {errors.location && <p className="text-xs text-destructive">{errors.location.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="promoText">Texto Promocional (Opcional)</Label>
            <Textarea id="promoText" {...register('promoText')} placeholder="Instruções para o convidado..." className="min-h-[100px]" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {event ? 'Salvar Alterações' : 'Criar Evento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
