
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect } from 'react';
import { Loader2, Sparkles, Plus, Trash2, Clock, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

const priceRuleSchema = z.object({
  time: z.string().min(1, 'Hora é obrigatória'),
  label: z.string().min(1, 'Valor é obrigatório'),
});

const guestListSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  slug: z.string().min(2, 'Slug é obrigatório').regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífens'),
  capacity: z.coerce.number().optional(),
  customPromoText: z.string().optional().nullable(),
  priceRules: z.array(priceRuleSchema).optional(),
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

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch, control } = useForm<GuestListFormValues>({
    resolver: zodResolver(guestListSchema),
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "priceRules",
  });

  useEffect(() => {
    if (list) {
      reset({
        name: list.name,
        slug: list.slug,
        capacity: list.capacity || 0,
        customPromoText: list.customPromoText || null,
        priceRules: list.priceRules || [],
      });
    } else {
      reset({
        name: '',
        slug: '',
        capacity: 0,
        customPromoText: null,
        priceRules: [],
      });
    }
  }, [list, reset, isOpen]);

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
      const listId = list?.id || uuidv4();
      const statsToken = list?.statsToken || uuidv4().substring(0, 8);
      
      const listPayload = {
        name: data.name,
        slug: data.slug,
        capacity: data.capacity || null,
        customPromoText: data.customPromoText || null,
        priceRules: data.priceRules && data.priceRules.length > 0 ? data.priceRules : null,
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl">{list ? 'Configurar Lista' : 'Nova Lista de Nomes'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="list-name">Identificação da Lista</Label>
                <Input id="list-name" {...register('name')} placeholder="Ex: VIP, Promoter Lucas" />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Identificador do Link (Slug)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">/[evento]/</span>
                  <Input id="slug" {...register('slug')} placeholder="link-da-lista" />
                </div>
                {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity">Capacidade Máxima (Opcional)</Label>
                <Input id="capacity" type="number" {...register('capacity')} placeholder="Ex: 150" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Info className="h-3.5 w-3.5 text-primary" /> Texto Informativo da Lista
                </Label>
                <Textarea 
                  {...register('customPromoText')} 
                  placeholder="Se preenchido, este texto SUBSTITUIRÁ o texto do evento nesta lista." 
                  className="min-h-[100px] text-xs"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" /> Valores Específicos
                  </Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => append({ time: '23:30', label: 'R$ 60' })}
                    className="h-6 text-[9px] font-bold px-2"
                  >
                    <Plus className="h-3 w-3 mr-1" /> ADD
                  </Button>
                </div>
                
                <div className="space-y-2 bg-muted/30 p-3 rounded-lg border border-dashed min-h-[100px]">
                  {fields.length === 0 ? (
                    <p className="text-[9px] text-muted-foreground text-center italic mt-8">Usando valores padrão do evento.</p>
                  ) : (
                    fields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-1.5">
                        <Input 
                          type="time" 
                          className="w-20 h-7 text-[10px] px-1" 
                          {...register(`priceRules.${index}.time`)} 
                        />
                        <Input 
                          placeholder="Valor" 
                          className="flex-1 h-7 text-[10px] px-2" 
                          {...register(`priceRules.${index}.label`)} 
                        />
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-destructive" 
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
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
