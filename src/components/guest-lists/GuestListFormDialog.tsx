
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '@/lib/firebase';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
import { useState, useEffect } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

const guestListSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  slug: z.string().min(2, 'Slug é obrigatório').regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífens'),
  capacity: z.coerce.number().optional(),
  customPromoText: z.string().optional(),
});

type GuestListFormValues = z.infer<typeof guestListSchema>;

interface GuestListFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  list?: any;
}

export default function GuestListFormDialog({ isOpen, onClose, eventId, list }: GuestListFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<GuestListFormValues>({
    resolver: zodResolver(guestListSchema),
  });

  useEffect(() => {
    if (list) {
      reset({
        name: list.name,
        slug: list.slug,
        capacity: list.capacity || 0,
        customPromoText: list.customPromoText || '',
      });
    } else {
      reset({
        name: '',
        slug: '',
        capacity: 0,
        customPromoText: '',
      });
    }
  }, [list, reset, isOpen]);

  // Auto-slug generator
  const listName = watch('name');
  useEffect(() => {
    if (!list && listName) {
      const generatedSlug = listName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setValue('slug', generatedSlug);
    }
  }, [listName, list, setValue]);

  const onSubmit = async (data: GuestListFormValues) => {
    setIsSubmitting(true);
    try {
      // No modelo hierárquico, a validação de slug é feita pelo contexto (Evento + Lista)
      // Aqui simplificamos pois o slug da lista só precisa ser único dentro do evento.
      const listId = list?.id || uuidv4();
      const statsToken = list?.statsToken || uuidv4().substring(0, 8);
      
      const listPayload = {
        name: data.name,
        slug: data.slug,
        capacity: data.capacity || null,
        customPromoText: data.customPromoText || null,
        statsToken,
        eventId,
        updatedAt: serverTimestamp(),
      };

      const listDocRef = doc(db, 'guest_events', eventId, 'lists', listId);
      
      if (list) {
        await updateDoc(listDocRef, listPayload);
      } else {
        await setDoc(listDocRef, {
          ...listPayload,
          id: listId,
          submissionCount: 0,
          createdAt: serverTimestamp(),
        });
      }

      toast({ title: list ? 'Lista atualizada!' : 'Lista criada!' });
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
          <DialogTitle className="font-headline">{list ? 'Configurar Lista' : 'Nova Lista de Nomes'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="list-name">Nome da Lista (ex: VIP, Promoter Lucas)</Label>
            <Input id="list-name" {...register('name')} placeholder="Nome para identificação interna" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-text">Valores e Regras (Específico desta lista)</Label>
            <Input id="custom-text" {...register('customPromoText')} placeholder="Ex: H R$ 100 | M R$ 50" />
            <p className="text-[10px] text-muted-foreground">Isso aparecerá em destaque na página pública.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Identificador do Link (Slug)</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">/[evento]/</span>
              <Input id="slug" {...register('slug')} placeholder="link-da-lista" />
            </div>
            {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacity">Capacidade Máxima (Opcional)</Label>
            <Input id="capacity" type="number" {...register('capacity')} placeholder="Ex: 150" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {list ? 'Salvar Configurações' : 'Gerar Lista'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
