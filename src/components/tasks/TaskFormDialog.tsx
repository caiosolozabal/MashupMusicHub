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
import { Loader2, Calendar as CalendarIcon, Users, User, CheckCircle2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

const taskSchema = z.object({
  title: z.string().min(3, 'O título deve ter pelo menos 3 caracteres.'),
  description: z.string().optional(),
  assignedToUids: z.array(z.string()).min(1, 'Selecione pelo menos um destinatário.'),
  priority: z.enum(['low', 'medium', 'high'] as const),
  category: z.enum(['announcement', 'operational', 'financial', 'meeting', 'equipment', 'other'] as const),
  dueDate: z.date(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface TaskFormDialogProps {
  isOpen: boolean;
  onClose: (created?: boolean) => void;
}

export default function TaskFormDialog({ isOpen, onClose }: TaskFormDialogProps) {
  const { user, userDetails } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allUsers, setAllUsers] = useState<UserDetails[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const isStaff = userDetails?.role === 'admin' || userDetails?.role === 'partner';

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      assignedToUids: [],
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
        assignedToUids: [user?.uid || ''],
        priority: 'medium',
        category: 'operational',
        dueDate: defaultDueDateEndOfDay(),
      });
      fetchUsers();
    }
  }, [isOpen, user?.uid, form]);

  const fetchUsers = async () => {
    if (!db) return;
    setIsLoadingUsers(true);
    try {
      // Busca todos os usuários sem ordenação inicial para evitar erros de índice se displayName faltar
      const q = query(collection(db, 'users'));
      const snap = await getDocs(q);
      const fetchedUsers = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserDetails));
      
      // Filtragem por permissão:
      // Admins/Partners vêem todos.
      // DJs só vêem Admins e Partners (comunicação vertical).
      let filtered: UserDetails[] = [];
      
      if (isStaff) {
        filtered = fetchedUsers;
      } else {
        filtered = fetchedUsers.filter(u => u.role === 'admin' || u.role === 'partner');
      }

      // Ordenação manual em memória
      filtered.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
      
      setAllUsers(filtered);
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
      // Se houver apenas 1 destinatário e for o próprio usuário, status é pending.
      // Se houver outros, todos começam como pending_acceptance para forçar a visualização.
      const isOnlyMe = data.assignedToUids.length === 1 && data.assignedToUids[0] === user.uid;
      const initialStatus: TaskStatus = isOnlyMe ? 'pending' : 'pending_acceptance';

      await createTask({
        ...data,
        ownerUid: data.assignedToUids[0], 
        createdByUid: user.uid,
        status: initialStatus,
        assignedToUids: data.assignedToUids,
      });

      toast({ title: 'Aviso Criado!', description: 'O comunicado foi enviado aos destinatários.' });
      onClose(true);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao criar', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleUserSelection = (uid: string) => {
    const current = form.getValues('assignedToUids');
    if (current.includes(uid)) {
      form.setValue('assignedToUids', current.filter(id => id !== uid), { shouldValidate: true });
    } else {
      form.setValue('assignedToUids', [...current, uid], { shouldValidate: true });
    }
  };

  const selectAllDjs = () => {
    const djs = allUsers.filter(u => u.role === 'dj').map(u => u.uid);
    if (djs.length === 0) return;
    form.setValue('assignedToUids', Array.from(new Set([...form.getValues('assignedToUids'), ...djs])), { shouldValidate: true });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-hidden flex flex-col p-0 border-none">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="font-headline text-2xl uppercase italic tracking-tighter">Novo Comunicado / Tarefa</DialogTitle>
          <DialogDescription>
            {isStaff ? 'Envie avisos operacionais ou delegue tarefas para o casting.' : 'Envie um comunicado para a coordenação da agência.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 px-6">
            <div className="space-y-6 py-4">
                <div className="space-y-2">
                    <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-widest text-primary">Título da Mensagem</Label>
                    <Input id="title" placeholder="Ex: Solicitação de alteração técnica" {...form.register('title')} className="h-12 text-lg font-bold" />
                    {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-primary">Detalhes Técnicos</Label>
                    <Textarea id="description" placeholder="Instruções completas aqui..." {...form.register('description')} className="min-h-[100px] bg-muted/30" />
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <Users className="h-4 w-4" /> Destinatários
                        </Label>
                        {isStaff && (
                            <Button type="button" variant="ghost" size="sm" onClick={selectAllDjs} className="h-6 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary">
                                Selecionar todos DJs
                            </Button>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-muted/20 rounded-2xl border border-dashed">
                        {isLoadingUsers ? (
                            <div className="col-span-full py-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
                        ) : allUsers.length === 0 ? (
                            <p className="col-span-full text-center py-4 text-xs text-muted-foreground">Nenhum destinatário disponível.</p>
                        ) : (
                            allUsers.map((u) => (
                                <div 
                                    key={u.uid} 
                                    onClick={() => toggleUserSelection(u.uid)}
                                    className={cn(
                                        "flex items-center gap-3 p-2 rounded-xl border cursor-pointer transition-all",
                                        form.watch('assignedToUids').includes(u.uid) 
                                            ? "bg-primary/10 border-primary shadow-sm" 
                                            : "bg-background border-transparent hover:border-muted-foreground/20"
                                    )}
                                >
                                    <div className={cn(
                                        "h-4 w-4 rounded border flex items-center justify-center transition-colors",
                                        form.watch('assignedToUids').includes(u.uid) ? "bg-primary border-primary" : "border-muted-foreground/30"
                                    )}>
                                        {form.watch('assignedToUids').includes(u.uid) && <CheckCircle2 className="h-3 w-3 text-black" />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold truncate leading-none">{u.displayName || u.email}</p>
                                        <p className="text-[9px] text-muted-foreground uppercase font-black">{u.professionalType || u.role}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    {form.formState.errors.assignedToUids && <p className="text-xs text-destructive">{form.formState.errors.assignedToUids.message}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Tipo</Label>
                        <Controller
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="h-10 text-xs font-bold uppercase tracking-widest">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="announcement">AVISO (Informativo)</SelectItem>
                                    <SelectItem value="operational">OPERAÇÃO</SelectItem>
                                    <SelectItem value="financial">FINANCEIRO</SelectItem>
                                    <SelectItem value="equipment">EQUIPAMENTO</SelectItem>
                                    <SelectItem value="other">OUTROS</SelectItem>
                                </SelectContent>
                            </Select>
                            )}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Prioridade</Label>
                        <Controller
                            control={form.control}
                            name="priority"
                            render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="h-10 text-xs font-bold uppercase tracking-widest">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">BAIXA</SelectItem>
                                    <SelectItem value="medium">MÉDIA</SelectItem>
                                    <SelectItem value="high">ALTA (CRÍTICO)</SelectItem>
                                </SelectContent>
                            </Select>
                            )}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Prazo</Label>
                        <Controller
                            control={form.control}
                            name="dueDate"
                            render={({ field }) => (
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full h-10 justify-start text-left font-bold text-xs uppercase tracking-widest", !field.value && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(field.value, "dd/MM/yy") : "DATA LIMITE"}
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
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 bg-muted/10 border-t gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onClose()} disabled={isSubmitting} className="h-12 uppercase text-[10px] font-black tracking-[0.2em]">
                Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="h-12 bg-primary text-black hover:bg-primary/90 uppercase text-[10px] font-black tracking-[0.2em] min-w-[200px]">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Disparar Comunicado
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}