
'use client';

import { useForm } from 'react-hook-form';
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
import { Loader2, Upload, Image as ImageIcon, Video, X, CheckCircle2, Instagram, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const guestEventSchema = z.object({
  name: z.string().min(3, 'Nome é obrigatório'),
  slug: z.string().min(3, 'Link do evento é obrigatório').regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífens'),
  date: z.string().min(1, 'Data é obrigatória'),
  location: z.string().min(1, 'Local é obrigatório'),
  instagramHandle: z.string().optional(),
  promoText: z.string().optional(),
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

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<GuestEventFormValues>({
    resolver: zodResolver(guestEventSchema),
    defaultValues: {
      name: '',
      slug: '',
      date: '',
      location: '',
      instagramHandle: '',
      promoText: '',
      curfewAt: '',
      mediaUrl: null,
      backgroundUrl: null,
    }
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
      <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">{event ? 'Editar Evento' : 'Novo Evento de Captação'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
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
              
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Data e Hora</Label>
                  <Input id="date" type="datetime-local" {...register('date')} />
                  {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="curfewAt">Encerramento Automático (Curfew)</Label>
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
                <Label htmlFor="promoText">Texto Promocional / Regras</Label>
                <Textarea id="promoText" {...register('promoText')} placeholder="Instruções para o convidado..." className="min-h-[120px]" />
              </div>
            </div>

            <div className="space-y-6 border-l pl-6 hidden md:block">
              <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <ImageIcon className="h-4 w-4" /> Identidade Visual
              </h3>

              <div className="space-y-3">
                <Label className="text-xs font-bold">Mídia Principal (Cover)</Label>
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
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
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

              <div className="space-y-3">
                <Label className="text-xs font-bold">Imagem de Fundo (Background)</Label>
                <div className="h-24 w-full rounded-lg border-2 border-dashed bg-muted/30 relative overflow-hidden group">
                  {isUploadingBg ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                  ) : backgroundUrl ? (
                    <div className="h-full w-full relative">
                      <img src={backgroundUrl} alt="Background" className="h-full w-full object-cover" />
                      <Button 
                        type="button" 
                        variant="destructive" 
                        size="icon" 
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setValue('backgroundUrl', null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-6 w-6 mb-1 opacity-20" />
                      <input 
                        type="file" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        accept="image/*" 
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'background')} 
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-6 gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting || isUploadingMedia || isUploadingBg}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || isUploadingMedia || isUploadingBg} className="min-w-[140px]">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              {event ? 'Salvar Alterações' : 'Criar Evento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
