
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, Timestamp, doc, updateDoc } from 'firebase/firestore';
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
import { Loader2, Upload, Image as ImageIcon, Video, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import Image from 'next/image';

const guestEventSchema = z.object({
  name: z.string().min(3, 'Nome é obrigatório'),
  date: z.string().min(1, 'Data é obrigatória'),
  location: z.string().min(1, 'Local é obrigatório'),
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
      date: '',
      location: '',
      promoText: '',
      curfewAt: '',
      mediaUrl: null,
      backgroundUrl: null,
    }
  });

  const mediaUrl = watch('mediaUrl');
  const backgroundUrl = watch('backgroundUrl');

  useEffect(() => {
    if (event && isOpen) {
      reset({
        name: event.name,
        date: event.date ? format(event.date.toDate(), "yyyy-MM-dd'T'HH:mm") : '',
        location: event.location,
        promoText: event.promoText || '',
        curfewAt: event.curfewAt ? format(event.curfewAt.toDate(), "yyyy-MM-dd'T'HH:mm") : '',
        mediaUrl: event.mediaUrl || null,
        backgroundUrl: event.backgroundUrl || null,
      });
    } else if (isOpen) {
      reset({
        name: '',
        date: '',
        location: '',
        promoText: '',
        curfewAt: '',
        mediaUrl: null,
        backgroundUrl: null,
      });
    }
  }, [event, isOpen, reset]);

  const handleFileUpload = async (file: File, type: 'media' | 'background') => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'Arquivo muito grande', description: 'O limite é de 10MB.' });
      return;
    }

    const setter = type === 'media' ? setIsUploadingMedia : setIsUploadingBg;
    const field = type === 'media' ? 'mediaUrl' : 'backgroundUrl';
    
    setter(true);
    // Garantir que temos um ID para o caminho do storage, mesmo que o evento seja novo
    const tempId = event?.id || 'temp_' + Math.random().toString(36).substring(7);
    const filePath = `events/${tempId}/assets/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase()}`;
    const fileRef = storageRef(storage, filePath);

    try {
      const uploadTask = uploadBytesResumable(fileRef, file);
      
      return new Promise((resolve, reject) => {
        uploadTask.on('state_changed', 
          null, 
          (error) => {
            console.error("Upload error:", error);
            // Mensagem de erro mais instrutiva para CORS e Regras
            toast({ 
              variant: 'destructive', 
              title: 'Erro no upload', 
              description: 'Verifique se as Regras de Segurança no Console do Firebase permitem o upload ou se o CORS foi configurado.' 
            });
            setter(false);
            reject(error);
          }, 
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            setValue(field, downloadURL);
            setter(false);
            resolve(downloadURL);
          }
        );
      });
    } catch (e: any) {
      console.error(e);
      setter(false);
    }
  };

  const onSubmit = async (data: GuestEventFormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        name: data.name,
        date: Timestamp.fromDate(new Date(data.date)),
        location: data.location,
        promoText: data.promoText || null,
        curfewAt: data.curfewAt ? Timestamp.fromDate(new Date(data.curfewAt)) : null,
        mediaUrl: data.mediaUrl || null,
        backgroundUrl: data.backgroundUrl || null,
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
                      <span className="text-[10px] font-bold mt-2">Enviando...</span>
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
                      <p className="text-[9px] font-bold uppercase tracking-widest">Vídeo MP4 ou Imagem</p>
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
                      <p className="text-[8px] font-bold uppercase tracking-widest">Apenas Imagem</p>
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
