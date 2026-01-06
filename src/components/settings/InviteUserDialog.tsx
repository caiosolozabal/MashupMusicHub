
'use client';

import { useState } from 'react';
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
import { db, auth } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { UserRole } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { generateRandomPastelColor } from '@/lib/utils';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';


const inviteUserFormSchema = z.object({
  email: z.string().email('Email inválido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
  displayName: z.string().min(1, 'Nome é obrigatório.'),
  role: z.enum(['admin', 'partner', 'dj']),
});

type InviteUserFormValues = z.infer<typeof inviteUserFormSchema>;

interface InviteUserDialogProps {
  isOpen: boolean;
  onClose: (created?: boolean) => void;
}

export default function InviteUserDialog({ isOpen, onClose }: InviteUserDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<InviteUserFormValues>({
    resolver: zodResolver(inviteUserFormSchema),
    defaultValues: {
      email: '',
      password: '',
      displayName: '',
      role: 'dj',
    },
  });

  const onSubmit = async (data: InviteUserFormValues) => {
    setIsSubmitting(true);
    setError(null);
    try {
      if (!auth || !db) throw new Error('Firebase não inicializado.');

      // 1. Criar o usuário no Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const newUser = userCredential.user;

      if (!newUser) {
        throw new Error('Não foi possível criar o usuário na autenticação.');
      }
      
      const { uid } = newUser;

      // 2. Criar o documento de perfil no Firestore
      const userRef = doc(db, 'users', uid);
      const userProfileData = {
        uid: uid,
        email: data.email,
        displayName: data.displayName,
        role: data.role as UserRole,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        dj_color: data.role === 'dj' ? generateRandomPastelColor() : null,
        pode_locar: false,
        dj_percentual: data.role === 'dj' ? 0.7 : null, // Default de 70% para novos DJs
        rental_percentual: data.role === 'dj' ? 0.2 : null, // Default de 20% para locação
      };
      
      await setDoc(userRef, userProfileData);

      toast({ title: 'Usuário Criado!', description: `${data.displayName} foi convidado e criado com sucesso.` });
      reset();
      onClose(true); // Indica que um usuário foi criado

    } catch (err: any) {
      console.error('Error creating user:', err);
      let errorMessage = 'Ocorreu um erro desconhecido.';
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'Este email já está em uso por outra conta.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'A senha fornecida é muito fraca.';
      } else {
        errorMessage = err.message;
      }
      setError(errorMessage);
      toast({ variant: 'destructive', title: 'Erro ao Criar Usuário', description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDialogClose = () => {
    reset(); // Reseta o formulário ao fechar
    setError(null);
    onClose(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDialogClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline">Convidar Novo Usuário</DialogTitle>
          <DialogDescription>
            Crie uma nova conta de usuário no Firebase e um perfil correspondente no Firestore.
          </DialogDescription>
        </DialogHeader>

        {error && (
            <Alert variant="destructive" className="my-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erro na Criação</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div>
            <Label htmlFor="displayName">Nome de Exibição</Label>
            <Input id="displayName" {...register('displayName')} />
            {errors.displayName && <p className="text-sm text-destructive mt-1">{errors.displayName.message}</p>}
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="password">Senha Inicial</Label>
            <Input id="password" type="password" {...register('password')} />
            {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
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
                  </SelectContent>
                </Select>
              )}
            />
            {errors.role && <p className="text-sm text-destructive mt-1">{errors.role.message}</p>}
          </div>
          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={handleDialogClose} disabled={isSubmitting}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar e Convidar Usuário
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
