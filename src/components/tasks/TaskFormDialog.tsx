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
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { createTask, defaultDueDateEndOfDay } from '@/lib/tasks';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import type { UserDetails, TaskStatus } from '@/lib/types';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const taskSchema = z.object({
  title: z.string().min(3, 'O título deve ter pelo menos 3 caracteres.'),
  description: z.string().optional(),
  ownerUid: z.string().min(1, 'Selecione o destinatário.'),
  priority: z.enum(['low', 'medium', 'high'] as const),
  category: z.enum(['operational', 'financial', 'meeting', 'equipment', 'other'] as const),
  dueDate: z.date(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface TaskFormDialogProps {
  isOpen: boolean;
  onClose: (created?: boolean) => void;
}

export default function TaskFormDialog({ isOpen, onClose }: TaskFormDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allUsers, setAllUsers] = useState<UserDetails[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      ownerUid: user?.uid || '',
      priority: 'medium',
      category: 'operational',
      dueDate: defaultDueDateEndOfDay(),
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        title: '',
        description: '',
        ownerUid: user?.uid || '',
        priority: 'medium',
        category: 'operational',
        dueDate: defaultDueDateEndOfDay(),
      });
      fetchUsers();
    }
  }, [isOpen, user?.uid, form]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const q = query(collection(db, 'users'), orderBy('displayName'));
      const snap = await getDocs(q);
      setAllUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserDetails)));
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const onSubmit = async (data: TaskFormValues) => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      // Regra de status inicial: se criar para outro, começa como pending_acceptance
      const initialStatus: TaskStatus = (data.ownerUid !== user.uid) ? 'pending_acceptance' : 'pending';

      await createTask({
        ...data,
        createdByUid: user.uid,
        status: initialStatus,
        assignedToUids: [user.uid, data.ownerUid],
      });

      toast({ title: 'Tarefa Criada!', description: 'O aviso foi registrado com sucesso.' });
      onClose(true);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao criar', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl">Novo Aviso / Tarefa</DialogTitle>
          <DialogDescription>
            Crie um lembrete para você ou delegue uma tarefa para outro usuário.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="title">Título da Tarefa</Label>
            <Input id="title" placeholder="Ex: Enviar contrato da Festa X" {...form.register('title')} />
            {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (Opcional)</Label>
            <Textarea id="description" placeholder="Detalhes adicionais..." {...form.register('description')} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Para quem? (Dono do Caderno)</Label>
              <Controller
                control={form.control}
                name="ownerUid"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingUsers ? "Carregando..." : "Selecione o destinatário"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={user?.uid || 'me'}>Para Mim</SelectItem>
                      {allUsers.filter(u => u.uid !== user?.uid).map(u => (
                        <SelectItem key={u.uid} value={u.uid}>{u.displayName || u.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Prazo Final</Label>
              <Controller
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "dd/MM/yy") : "Escolha a data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={(d) => d && field.onChange(d)} initialFocus />
                    </PopoverContent>
                  </Popover>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Controller
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Controller
                control={form.control}
                name="category"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operational">Operacional</SelectItem>
                      <SelectItem value="financial">Financeiro</SelectItem>
                      <SelectItem value="meeting">Reunião</SelectItem>
                      <SelectItem value="equipment">Equipamento</SelectItem>
                      <SelectItem value="other">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onClose()} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Criar Tarefa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
