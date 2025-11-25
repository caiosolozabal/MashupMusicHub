
'use client';

import { useState, useEffect } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { UserDetails, UserRole } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { generateRandomPastelColor } from '@/lib/utils';
import { Separator } from '../ui/separator';

const editUserFormSchema = z.object({
  displayName: z.string().min(1, 'Nome é obrigatório.'),
  role: z.enum(['admin', 'partner', 'dj', 'financeiro']), // Adjust as per your roles
  dj_percentual: z.preprocess(
    (val) => (String(val).trim() === '' ? null : parseFloat(String(val))),
    z.number().min(0).max(1).nullable().optional() // Percentage between 0 and 1
  ),
  rental_percentual: z.preprocess(
    (val) => (String(val).trim() === '' ? null : parseFloat(String(val))),
    z.number().min(0).max(1).nullable().optional()
  ),
  dj_color: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  bankAgency: z.string().optional().nullable(),
  bankAccount: z.string().optional().nullable(),
  bankAccountType: z.enum(['corrente', 'poupanca']).optional().nullable(),
  bankDocument: z.string().optional().nullable(),
  pixKey: z.string().optional().nullable(),
});

type EditUserFormValues = z.infer<typeof editUserFormSchema>;

interface EditUserDialogProps {
  user: UserDetails;
  isOpen: boolean;
  onClose: (updated?: boolean) => void;
}

export default function EditUserDialog({ user, isOpen, onClose }: EditUserDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: {
      displayName: user.displayName || '',
      role: user.role || 'dj', // Default to 'dj' if no role
      dj_percentual: user.dj_percentual ?? null,
      rental_percentual: user.rental_percentual ?? null,
      dj_color: user.dj_color || null,
      bankName: user.bankName || '',
      bankAgency: user.bankAgency || '',
      bankAccount: user.bankAccount || '',
      bankAccountType: user.bankAccountType || undefined,
      bankDocument: user.bankDocument || '',
      pixKey: user.pixKey || '',
    },
  });

  useEffect(() => {
    // Reset form when user prop changes (e.g., opening dialog for a different user)
    if (user) {
      reset({
        displayName: user.displayName || '',
        role: user.role || 'dj',
        dj_percentual: user.dj_percentual ?? null,
        rental_percentual: user.rental_percentual ?? null,
        dj_color: user.dj_color || null,
        bankName: user.bankName || '',
        bankAgency: user.bankAgency || '',
        bankAccount: user.bankAccount || '',
        bankAccountType: user.bankAccountType || undefined,
        bankDocument: user.bankDocument || '',
        pixKey: user.pixKey || '',
      });
    }
  }, [user, reset]);

  const selectedRole = watch('role');

  const onSubmit = async (data: EditUserFormValues) => {
    setIsSubmitting(true);
    try {
      if (!db) throw new Error('Firestore not initialized');
      const userRef = doc(db, 'users', user.uid);

      const updateData: Partial<UserDetails> = {
        displayName: data.displayName,
        role: data.role as UserRole, 
        updatedAt: serverTimestamp(),
      };

      if (data.role === 'dj') {
        updateData.dj_percentual = data.dj_percentual;
        updateData.rental_percentual = data.rental_percentual;
        updateData.dj_color = (data.dj_color && data.dj_color.startsWith('hsl')) ? data.dj_color : generateRandomPastelColor();
        updateData.bankName = data.bankName || null;
        updateData.bankAgency = data.bankAgency || null;
        updateData.bankAccount = data.bankAccount || null;
        updateData.bankAccountType = data.bankAccountType || null;
        updateData.bankDocument = data.bankDocument || null;
        updateData.pixKey = data.pixKey || null;
      } else {
        // Clear DJ specific fields if role is not DJ
        updateData.dj_percentual = null;
        updateData.rental_percentual = null;
        updateData.dj_color = null;
        updateData.bankName = null;
        updateData.bankAgency = null;
        updateData.bankAccount = null;
        updateData.bankAccountType = null;
        updateData.bankDocument = null;
        updateData.pixKey = null;
      }

      await updateDoc(userRef, updateData);
      toast({ title: 'Usuário Atualizado!', description: `${data.displayName} foi atualizado com sucesso.` });
      onClose(true); // Pass true to indicate an update occurred
    } catch (error) {
      console.error('Error updating user:', error);
      toast({ variant: 'destructive', title: 'Erro ao atualizar usuário', description: (error as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline">Editar Usuário: {user.displayName || user.email}</DialogTitle>
          <DialogDescription>Modifique os detalhes e permissões do usuário.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div>
            <Label htmlFor="displayName">Nome de Exibição</Label>
            <Input id="displayName" {...register('displayName')} />
            {errors.displayName && <p className="text-sm text-destructive mt-1">{errors.displayName.message}</p>}
          </div>

          <div>
            <Label htmlFor="role">Função (Role)</Label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value as string | undefined}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Selecione a função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="partner">Sócio</SelectItem>
                    <SelectItem value="dj">DJ</SelectItem>
                    {/* <SelectItem value="financeiro">Financeiro</SelectItem> */}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.role && <p className="text-sm text-destructive mt-1">{errors.role.message}</p>}
          </div>

          {selectedRole === 'dj' && (
            <>
              <Separator className="my-4" />
              <div>
                <h3 className="text-md font-semibold mb-2 text-primary">Detalhes Financeiros e de Agenda do DJ</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="dj_percentual">Percentual Serviço DJ (Ex: 0.7)</Label>
                        <Input
                            id="dj_percentual"
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            {...register('dj_percentual')}
                        />
                        {errors.dj_percentual && <p className="text-sm text-destructive mt-1">{errors.dj_percentual.message}</p>}
                    </div>
                     <div>
                        <Label htmlFor="rental_percentual">Percentual Locação (Ex: 0.2)</Label>
                        <Input
                            id="rental_percentual"
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            {...register('rental_percentual')}
                        />
                        {errors.rental_percentual && <p className="text-sm text-destructive mt-1">{errors.rental_percentual.message}</p>}
                    </div>
                </div>
                 <div className="mt-4">
                    <Label>Cor do DJ na Agenda</Label>
                    <div className="flex items-center gap-2 mt-1 p-2 border rounded-md bg-muted/50 h-10">
                        <div className="h-6 w-6 rounded-full border" style={{ backgroundColor: watch('dj_color') || 'transparent' }}></div>
                        <span className="text-sm text-muted-foreground font-mono">{watch('dj_color') || 'Cor será gerada ao salvar'}</span>
                    </div>
                </div>
              </div>

              <Separator className="my-4" />
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-primary">Dados Bancários do DJ</h4>
                <div>
                  <Label htmlFor="bankName">Nome do Banco</Label>
                  <Input id="bankName" {...register('bankName')} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bankAgency">Agência</Label>
                    <Input id="bankAgency" {...register('bankAgency')} />
                  </div>
                  <div>
                    <Label htmlFor="bankAccount">Conta (com dígito)</Label>
                    <Input id="bankAccount" {...register('bankAccount')} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="bankAccountType">Tipo de Conta</Label>
                   <Controller
                    name="bankAccountType"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <SelectTrigger id="bankAccountType">
                            <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="corrente">Corrente</SelectItem>
                            <SelectItem value="poupanca">Poupança</SelectItem>
                        </SelectContent>
                        </Select>
                    )}
                    />
                </div>
                <div>
                  <Label htmlFor="bankDocument">CPF ou CNPJ</Label>
                  <Input id="bankDocument" {...register('bankDocument')} />
                </div>
                <div>
                  <Label htmlFor="pixKey">Chave PIX</Label>
                  <Input id="pixKey" {...register('pixKey')} />
                  {errors.pixKey && <p className="text-sm text-destructive mt-1">{errors.pixKey.message}</p>}
                </div>
              </div>
            </>
          )}

          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => onClose()} disabled={isSubmitting}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
