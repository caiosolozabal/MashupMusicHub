
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, Timestamp, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
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
import { Loader2, Upload, Image as ImageIcon, Video, X, CheckCircle2, Instagram, Link as LinkIcon, Plus, Trash2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const priceRuleSchema = z.object({
  time: z.string().min(1, 'Hora é obrigatória'),
  label: z.string().min(1, 'Valor é obrigatório'),
});

const guestEventSchema = z.object({
  name: z.string().min(3, 'Nome é obrigatório'),
  slug: z.string().min(3, 'Link do evento é obrigatório').regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífens'),
  date: z.string().min(1, 'Data é obrigatória'),
  location: z.string().min(1, 'Local é obrigatório'),
  instagramHandle: z.string().optional(),
  promoText: z.string().optional(),
  priceRules: z.array(priceRuleSchema).optional(),
  curfewAt: z.string().optional(),
  mediaUrl: z.string().optional().nullable(),
  backgroundUrl: z.string().optional().nullable(),
});

type GuestEventFormValues = z.infer<typeof guestEventSchema>;

interface GuestEventFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event?: any;
}

export default function GuestEventFormDialog({ isOpen, onClose, event }: GuestEventFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch, control } = useForm<GuestEventFormValues>({
    resolver: zodResolver(guestEventSchema),
    defaultValues: {
      name: '',
      slug: '',
      date: '',
      location: '',
      instagramHandle: '',
      promoText: '',
      priceRules: [],
      curfewAt: '',
      mediaUrl: null,
      backgroundUrl: null,
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "priceRules",
  });

  const nameValue = watch('name');
  const mediaUrl = watch('mediaUrl');
  const backgroundUrl = watch('backgroundUrl');

  useEffect(() => {
    if (!event && nameValue) {
      const generatedSlug = nameValue
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setValue('slug', generatedSlug);
    }
  }, [nameValue, event, setValue]);

  useEffect(() => {
    if (event && isOpen) {
      reset({
        name: event.name,
        slug: event.slug || '',
        date: event.date ? format(event.date.toDate(), "yyyy-MM-dd'T'HH:mm") : '',
        location: event.location,
        instagramHandle: event.instagramHandle || '',
        promoText: event.promoText || '',
        priceRules: event.priceRules || [],
        curfewAt: event.curfewAt ? format(event.curfewAt.toDate(), "yyyy-MM-dd'T'HH:mm") : '',
        mediaUrl: event.mediaUrl || null,
        backgroundUrl: event.backgroundUrl || null,
      });
    } else if (isOpen) {
      reset({
        name: '',
        slug: '',
        date: '',
        location: '',
        instagramHandle: '',
        promoText: '',
        priceRules: [],
        curfewAt: '',
        mediaUrl: null,
        backgroundUrl: null,
      });
    }
  }, [event, isOpen, reset]);

  const handleFileUpload = async (file: File, type: 'media' | 'background') => {
    if (!file) return;
    const setter = type === 'media' ? setIsUploadingMedia : setIsUploadingBg;
    const field = type === 'media' ? 'mediaUrl' : 'backgroundUrl';
    
    setter(true);
    const tempId = event?.id || 'temp_' + Math.random().toString(36).substring(7);
    const filePath = `events/${tempId}/assets/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase()}`;
    const fileRef = storageRef(storage, filePath);

    try {
      const uploadTask = uploadBytesResumable(fileRef, file);
      const snapshot = await uploadTask;
      const downloadURL = await getDownloadURL(snapshot.ref);
      setValue(field, downloadURL);
    } catch (e: any) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Erro no upload' });
    } finally {
      setter(false);
    }
  };

  const onSubmit = async (data: GuestEventFormValues) => {
    setIsSubmitting(true);
    try {
      const slugRef = doc(db, 'slugs', data.slug);
      const slugSnap = await getDoc(slugRef);
      
      if (slugSnap.exists() && (!event || event.slug !== data.slug)) {
        toast({ variant: 'destructive', title: 'Slug indisponível', description: 'Este link de evento já está sendo usado.' });
        setIsSubmitting(false);
        return;
      }

      const payload = {
        name: data.name,
        slug: data.slug,
        date: Timestamp.fromDate(new Date(data.date)),
        location: data.location,
        instagramHandle: data.instagramHandle || null,
        promoText: data.promoText || null,
        priceRules: data.priceRules || null,
        curfewAt: data.curfewAt ? Timestamp.fromDate(new Date(data.curfewAt)) : null,
        mediaUrl: data.mediaUrl || null,
        backgroundUrl: data.backgroundUrl || null,
        isActive: true,
        updatedAt: serverTimestamp(),
      };

      if (event) {
        await updateDoc(doc(db, 'guest_events', event.id), payload);
        if (event.slug !== data.slug) {
          await setDoc(slugRef, { type: 'event', eventId: event.id });
        }
        toast({ title: 'Evento atualizado!' });
      } else {
        const newEventRef = await addDoc(collection(db, 'guest_events'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        await setDoc(slugRef, { type: 'event', eventId: newEventRef.id });
        toast({ title: 'Evento criado com sucesso!' });
      }
      onClose();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">{event ? 'Editar Evento' : 'Novo Evento de Captação'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Evento</Label>
                <Input id="name" {...register('name')} placeholder="Ex: Farra 07/03" />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug" className="flex items-center gap-2">
                  <LinkIcon className="h-3.5 w-3.5" /> Link Base do Evento (Slug)
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">/l/</span>
                  <Input id="slug" {...register('slug')} placeholder="link-do-evento" />
                </div>
                {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Data e Hora</Label>
                  <Input id="date" type="datetime-local" {...register('date')} />
                  {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="curfewAt">Curfew (Fim da Lista)</Label>
                  <Input id="curfewAt" type="datetime-local" {...register('curfewAt')} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Local</Label>
                <Input id="location" {...register('location')} placeholder="Ex: Jockey Club" />
                {errors.location && <p className="text-xs text-destructive">{errors.location.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagramHandle" className="flex items-center gap-2">
                  <Instagram className="h-3.5 w-3.5" /> Instagram do Evento (Opcional)
                </Label>
                <Input id="instagramHandle" {...register('instagramHandle')} placeholder="Ex: @nossodomingo" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="promoText">Texto Informativo (Geral)</Label>
                <Textarea id="promoText" {...register('promoText')} placeholder="Informações gerais sobre a festa..." className="min-h-[100px]" />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Valores e Horários
                  </Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => append({ time: '23:00', label: 'VIP' })}
                    className="h-7 text-[10px] font-bold"
                  >
                    <Plus className="h-3 w-3 mr-1" /> ADICIONAR
                  </Button>
                </div>
                
                <div className="space-y-2 bg-muted/20 p-4 rounded-xl border border-dashed">
                  {fields.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground text-center italic">Nenhum valor configurado.</p>
                  ) : (
                    fields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-2">
                        <Input 
                          type="time" 
                          className="w-24 h-8 text-xs" 
                          {...register(`priceRules.${index}.time`)} 
                        />
                        <Input 
                          placeholder="Ex: VIP ou R$ 50" 
                          className="flex-1 h-8 text-xs" 
                          {...register(`priceRules.${index}.label`)} 
                        />
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive" 
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" /> Visual do Evento
                </h3>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Mídia Principal (Video/Imagem)</Label>
                    <div className="aspect-video w-full rounded-lg border-2 border-dashed bg-muted/30 relative overflow-hidden group">
                      {isUploadingMedia ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : mediaUrl ? (
                        <div className="h-full w-full relative">
                          {mediaUrl.includes('mp4') ? (
                            <video src={mediaUrl} className="h-full w-full object-cover" muted />
                          ) : (
                            <img src={mediaUrl} alt="Cover" className="h-full w-full object-cover" />
                          )}
                          <Button 
                            type="button" 
                            variant="destructive" 
                            size="icon" 
                            className="absolute top-2 right-2 h-6 w-6"
                            onClick={() => setValue('mediaUrl', null)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                          <Video className="h-8 w-8 mb-2 opacity-20" />
                          <input 
                            type="file" 
                            className="absolute inset-0 opacity-0 cursor-pointer" 
                            accept="image/*,video/mp4" 
                            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'media')} 
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-6 gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              {event ? 'Salvar Alterações' : 'Criar Evento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
