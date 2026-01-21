'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { RentalItem } from '@/lib/types';
import { Loader2, UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { storage } from '@/lib/firebase';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { Switch } from '../ui/switch';
import Image from 'next/image';

const rentalItemFormSchema = z.object({
  name: z.string().min(1, 'Nome do item é obrigatório.'),
  category: z.string().min(1, 'Categoria é obrigatória.'),
  description: z.string().optional().nullable(),
  basePrice: z.coerce.number().min(0, 'O preço base não pode ser negativo.'),
  tags: z.string().optional().nullable(),
  soundScore: z.coerce.number().min(0).optional().nullable(),
  recommendedPeople: z.coerce.number().min(0).optional().nullable(),
  isActive: z.boolean().default(true),
  photoUrl: z.string().url().optional().nullable(),
});

export type RentalItemFormValues = z.infer<typeof rentalItemFormSchema>;

interface RentalItemFormDialogProps {
  isOpen: boolean;
  onClose: (refetch?: boolean) => void;
  onSubmit: (values: RentalItemFormValues, newPhotoUrl: string | null) => Promise<void>;
  item?: RentalItem | null;
}

export default function RentalItemFormDialog({
  isOpen,
  onClose,
  onSubmit,
  item,
}: RentalItemFormDialogProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(item?.photoUrl || null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    getValues,
    formState: { errors },
  } = useForm<RentalItemFormValues>({
    resolver: zodResolver(rentalItemFormSchema),
  });

  useEffect(() => {
    if (item) {
      reset({
        name: item.name,
        category: item.category,
        description: item.description,
        basePrice: item.basePrice,
        tags: item.tags?.join(', '),
        soundScore: item.soundScore,
        recommendedPeople: item.recommendedPeople,
        isActive: item.isActive,
        photoUrl: item.photoUrl,
      });
      setPhotoPreview(item.photoUrl || null);
    } else {
      reset({
        name: '',
        category: '',
        description: '',
        basePrice: 0,
        tags: '',
        soundScore: 0,
        recommendedPeople: 0,
        isActive: true,
        photoUrl: null,
      });
      setPhotoPreview(null);
    }
  }, [item, reset, isOpen]);

  useEffect(() => {
    if (photoFile) {
      const objectUrl = URL.createObjectURL(photoFile);
      setPhotoPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [photoFile]);

  const handlePhotoUpload = async (): Promise<string | null> => {
    if (!photoFile) return getValues('photoUrl') || null;

    setIsUploading(true);
    const filePath = `rental_items/${Date.now()}-${photoFile.name}`;
    const fileRef = storageRef(storage, filePath);

    try {
      const snapshot = await uploadBytesResumable(fileRef, photoFile);
      const downloadURL = await getDownloadURL(snapshot.ref);
      toast({ title: 'Foto enviada com sucesso!' });
      return downloadURL;
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast({ variant: 'destructive', title: 'Erro no upload da foto', description: (error as Error).message });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleFormSubmit = async (data: RentalItemFormValues) => {
    setIsSubmitting(true);
    const newPhotoUrl = await handlePhotoUpload();
    await onSubmit(data, newPhotoUrl);
    setIsSubmitting(false);
  };
  
  const isProcessing = isUploading || isSubmitting;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline">{item ? 'Editar Item' : 'Adicionar Novo Item'}</DialogTitle>
          <DialogDescription>{item ? 'Atualize os detalhes do item.' : 'Preencha as informações do novo item de locação.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">

          <div className="space-y-2">
            <Label>Foto do Item</Label>
            {photoPreview && (
              <div className="mt-2 w-48 p-2 border rounded-md">
                <Image src={photoPreview} alt="Preview do Item" width={180} height={180} className="object-contain" />
              </div>
            )}
            <Input
                id="photo-upload"
                type="file"
                accept="image/png, image/jpeg"
                onChange={(e) => setPhotoFile(e.target.files ? e.target.files[0] : null)}
                disabled={isProcessing}
            />
             <p className="text-xs text-muted-foreground">Envie uma nova foto para adicionar ou substituir a atual.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome do Item</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="category">Categoria</Label>
              <Input id="category" {...register('category')} placeholder="Ex: Caixas de Som, Iluminação"/>
              {errors.category && <p className="text-sm text-destructive mt-1">{errors.category.message}</p>}
            </div>
          </div>

          <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" {...register('description')} placeholder="Detalhes técnicos, voltagem, etc."/>
          </div>

          <div>
              <Label htmlFor="basePrice">Preço Base de Locação (R$)</Label>
              <Input id="basePrice" type="number" step="0.01" {...register('basePrice')} />
              {errors.basePrice && <p className="text-sm text-destructive mt-1">{errors.basePrice.message}</p>}
          </div>

          <div>
              <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
              <Input id="tags" {...register('tags')} placeholder="Ex: JBL, Ativa, Bluetooth"/>
               <p className="text-xs text-muted-foreground mt-1">Usadas para busca e sugestões automáticas.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="soundScore">Pontuação de Som (0-10)</Label>
              <Input id="soundScore" type="number" {...register('soundScore')} />
               <p className="text-xs text-muted-foreground mt-1">Define o "peso" do item nas sugestões.</p>
            </div>
            <div>
              <Label htmlFor="recommendedPeople">Pessoas Recomendadas</Label>
              <Input id="recommendedPeople" type="number" {...register('recommendedPeople')} />
              <p className="text-xs text-muted-foreground mt-1">Estimativa de público para o item.</p>
            </div>
          </div>
          
          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
                <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-background">
                <div className="space-y-0.5">
                    <Label htmlFor="is-active-switch" className="text-base">Item Ativo</Label>
                    <DialogDescription>
                    Desative para ocultar o item do catálogo de locação sem excluí-lo.
                    </DialogDescription>
                </div>
                <Switch
                    id="is-active-switch"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isProcessing}
                />
                </div>
            )}
            />

          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => onClose()} disabled={isProcessing}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isProcessing} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {item ? 'Salvar Alterações' : 'Adicionar Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
