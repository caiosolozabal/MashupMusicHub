
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
import { Loader2, Check } from 'lucide-react';
import { generateRandomPastelColor, pastelColors } from '@/lib/utils';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { cn } from '@/lib/utils';

const editUserFormSchema = z.object({
  displayName: z.string().min(1, 'Nome é obrigatório.'),
  role: z.enum(['admin', 'partner', 'dj', 'financeiro']),
  professionalType: z.string().min(1, 'Função profissional é obrigatória.'),
  pode_locar: z.boolean().default(false),
  dj_percentual: z.preprocess(
    (val) => (String(val).trim() === '' ? null : parseFloat(String(val))),
    z.number().min(0).max(1).nullable().optional()
  ),
  rental_percentual: z.preprocess(
    (val) => (String(val).trim() === '' ? null : parseFloat(String(val))),
    z.number().min(0).max(1).nullable().optional()
  ),
  dj_color: z.string().min(1, 'Cor é obrigatória.'),
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
    setValue,
    formState: { errors },
  } = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: {
      displayName: user.displayName || '',
      role: user.role || 'dj',
      professionalType: user.professionalType || 'DJ',
      pode_locar: user.pode_locar || false,
      dj_percentual: user.dj_percentual ?? null,
      rental_percentual: user.rental_percentual ?? null,
      dj_color: user.dj_color || generateRandomPastelColor(),
      bankName: user.bankName || '',
      bankAgency: user.bankAgency || '',
      bankAccount: user.bankAccount || '',
      bankAccountType: user.bankAccountType || undefined,
      bankDocument: user.bankDocument || '',
      pixKey: user.pixKey || '',
    },
  });

  useEffect(() => {
    if (user && isOpen) {
      reset({
        displayName: user.displayName || '',
        role: user.role || 'dj',
        professionalType: user.professionalType || 'DJ',
        pode_locar: user.pode_locar || false,
        dj_percentual: user.dj_percentual ?? null,
        rental_percentual: user.rental_percentual ?? null,
        dj_color: user.dj_color || generateRandomPastelColor(),
        bankName: user.bankName || '',
        bankAgency: user.bankAgency || '',
        bankAccount: user.bankAccount || '',
        bankAccountType: user.bankAccountType || undefined,
        bankDocument: user.bankDocument || '',
        pixKey: user.pixKey || '',
      });
    }
  }, [user, reset, isOpen]);

  const selectedRole = watch('role');
  const currentColor = watch('dj_color');

  const onSubmit = async (data: EditUserFormValues) => {
    setIsSubmitting(true);
    try {
      if (!db) throw new Error('Firestore not initialized');
      
      // Documento do usuário que está sendo editado
      const userRef = doc(db, 'users', user.uid);

      // Campos base para qualquer usuário
      const updateData: any = {
        displayName: data.displayName,
        role: data.role as UserRole, 
        professionalType: data.professionalType,
        updatedAt: serverTimestamp(),
      };

      // Se for DJ (ou mantendo compatibilidade com campos técnicos)
      if (data.role === 'dj' || user.role === 'dj') {
        updateData.pode_locar = data.pode_locar;
        updateData.dj_percentual = data.dj_percentual;
        updateData.rental_percentual = data.rental_percentual;
        updateData.dj_color = data.dj_color;
        updateData.bankName = data.bankName || null;
        updateData.bankAgency = data.bankAgency || null;
        updateData.bankAccount = data.bankAccount || null;
        updateData.bankAccountType = data.bankAccountType || null;
        updateData.bankDocument = data.bankDocument || null;
        updateData.pixKey = data.pixKey || null;
      }

      await updateDoc(userRef, updateData);
      
      toast({ title: 'Usuário Atualizado!', description: `${data.displayName} foi salvo com sucesso.` });
      onClose(true);
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Erro ao salvar alteração', 
        description: error.message || 'Verifique as permissões de acesso.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl">Editar Usuário: {user.displayName || user.email}</DialogTitle>
          <DialogDescription>Modifique os detalhes e a função deste usuário na plataforma.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div>
            <Label htmlFor="displayName">Nome de Exibição</Label>
            <Input id="displayName" {...register('displayName')} placeholder="Nome completo" />
            {errors.displayName && <p className="text-sm text-destructive mt-1">{errors.displayName.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="role">Nível de Acesso (Role)</Label>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value as string | undefined}>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="partner">Sócio (Partner)</SelectItem>
                      <SelectItem value="dj">Prestador (DJ/Staff)</SelectItem>
                      <SelectItem value="financeiro">Financeiro</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label htmlFor="professionalType">Função Profissional</Label>
              <Controller
                name="professionalType"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DJ">DJ</SelectItem>
                      <SelectItem value="Cantor">Cantor</SelectItem>
                      <SelectItem value="Fotógrafo">Fotógrafo</SelectItem>
                      <SelectItem value="Filmmaker">Filmmaker</SelectItem>
                      <SelectItem value="Técnico de Som">Técnico de Som</SelectItem>
                      <SelectItem value="Técnico de Luz">Técnico de Luz</SelectItem>
                      <SelectItem value="Promoter">Promoter</SelectItem>
                      <SelectItem value="Gestor">Gestor</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {selectedRole === 'dj' && (
            <>
              <Separator className="my-4" />
                <Controller
                  control={control}
                  name="pode_locar"
                  render={({ field }) => (
                     <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-background">
                      <div className="space-y-0.5">
                        <Label htmlFor="pode-locar-switch" className="text-base">Permissão de Locação</Label>
                         <DialogDescription>
                          Habilita criação de orçamentos de equipamentos.
                        </DialogDescription>
                      </div>
                      <Switch
                        id="pode-locar-switch"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </div>
                  )}
                />
              <div className="mt-4 space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-primary">Configuração de Agenda</h3>
                
                <div className="space-y-2">
                  <Label>Cor de Identificação</Label>
                  <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/20">
                    {pastelColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={cn(
                          "h-8 w-8 rounded-full border-2 transition-all flex items-center justify-center",
                          currentColor === color ? "border-primary scale-110 shadow-sm" : "border-transparent hover:scale-105"
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => setValue('dj_color', color)}
                      >
                        {currentColor === color && <Check className="h-4 w-4 text-slate-900" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="dj_percentual">Cachê Prestador (Ex: 0.70)</Label>
                        <Input
                            id="dj_percentual"
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            {...register('dj_percentual')}
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">0.70 representa 70% do valor líquido.</p>
                    </div>
                     <div>
                        <Label htmlFor="rental_percentual">Comissão Locação (Ex: 0.20)</Label>
                        <Input
                            id="rental_percentual"
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            {...register('rental_percentual')}
                        />
                    </div>
                </div>
              </div>

              <Separator className="my-4" />
              <div className="space-y-4">
                <h4 className="text-sm font-black uppercase tracking-widest text-primary">Dados Bancários</h4>
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
                    <Label htmlFor="bankAccount">Conta</Label>
                    <Input id="bankAccount" {...register('bankAccount')} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="pixKey">Chave PIX</Label>
                  <Input id="pixKey" {...register('pixKey')} placeholder="CPF, Email ou Telefone" />
                </div>
              </div>
            </>
          )}

          <DialogFooter className="pt-4 gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => onClose()} disabled={isSubmitting}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[140px]">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
