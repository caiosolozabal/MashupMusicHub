
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
import { collection, getDocs, query } from 'firebase/firestore';
import type { UserDetails, TaskStatus } from '@/lib/types';
import { Loader2, Calendar as CalendarIcon, Users, CheckCircle2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
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
      const q = query(collection(db, 'users'));
      const snap = await getDocs(q);
      const fetchedUsers = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserDetails));
      
      let filtered: UserDetails[] = [];
      
      if (isStaff) {
        // Admins/Partners vêem todos
        filtered = fetchedUsers;
      } else {
        // DJs só vêem Admins e Partners
        filtered = fetchedUsers.filter(u => {
          const r = u.role?.toLowerCase();
          return r === 'admin' || r === 'partner';
        });
      }

      // Ordenação manual por nome
      filtered.sort((a, b) => {
        const nameA = a.displayName || a.email || '';
        const nameB = b.displayName || b.email || '';
        return nameA.localeCompare(nameB);
      });
      
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none bg-background">
        <DialogHeader className="p-6 pb-2 shrink-0">
          <DialogTitle className="font-headline text-2xl uppercase italic tracking-tighter">Novo Comunicado / Tarefa</DialogTitle>
          <DialogDescription className="text-xs">
            {isStaff ? 'Envie avisos operacionais ou delegue tarefas para o casting.' : 'Envie uma solicitação para a agência.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col min-h-0">
          <ScrollArea className="flex-1">
            <div className="px-6 py-2 space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-widest text-primary">Assunto</Label>
                <Input id="title" placeholder="Ex: Alteração de Rider" {...form.register('title')} className="h-10 text-base font-bold" />
                {form.formState.errors.title && <p className="text-[10px] text-destructive font-bold">{form.formState.errors.title.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-primary">Descrição detalhada</Label>
                <Textarea id="description" placeholder="Escreva aqui os detalhes..." {...form.register('description')} className="min-h-[80px] bg-muted/30 text-sm" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Users className="h-4 w-4" /> Selecionar Destinatários
                  </Label>
                  {isStaff && (
                    <Button type="button" variant="ghost" size="sm" onClick={selectAllDjs} className="h-6 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary px-0">
                      Selecionar todos DJs
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 bg-muted/20 rounded-xl border border-dashed max-h-[160px] overflow-y-auto">
                  {isLoadingUsers ? (
                    <div className="col-span-full py-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
                  ) : allUsers.length === 0 ? (
                    <p className="col-span-full text-center py-4 text-[10px] text-muted-foreground uppercase font-bold">Nenhum destinatário encontrado.</p>
                  ) : (
                    allUsers.map((u) => (
                      <div 
                        key={u.uid} 
                        onClick={() => toggleUserSelection(u.uid)}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all",
                          form.watch('assignedToUids').includes(u.uid) 
                            ? "bg-primary/10 border-primary shadow-sm" 
                            : "bg-background border-transparent hover:border-muted-foreground/20"
                        )}
                      >
                        <div className={cn(
                          "h-3.5 w-3.5 rounded border flex items-center justify-center transition-colors shrink-0",
                          form.watch('assignedToUids').includes(u.uid) ? "bg-primary border-primary" : "border-muted-foreground/30"
                        )}>
                          {form.watch('assignedToUids').includes(u.uid) && <CheckCircle2 className="h-2.5 w-2.5 text-black" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate leading-none">{u.displayName || u.email || 'Sem Nome'}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {form.formState.errors.assignedToUids && <p className="text-[10px] text-destructive font-bold">{form.formState.errors.assignedToUids.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Categoria</Label>
                  <Controller
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="h-9 text-[10px] font-bold uppercase tracking-widest">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="announcement">AVISO</SelectItem>
                          <SelectItem value="operational">OPERAÇÃO</SelectItem>
                          <SelectItem value="financial">FINANCEIRO</SelectItem>
                          <SelectItem value="equipment">EQUIPAMENTO</SelectItem>
                          <SelectItem value="other">OUTROS</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Prioridade</Label>
                  <Controller
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="h-9 text-[10px] font-bold uppercase tracking-widest">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">BAIXA</SelectItem>
                          <SelectItem value="medium">MÉDIA</SelectItem>
                          <SelectItem value="high">ALTA</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Prazo</Label>
                  <Controller
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full h-9 justify-start text-left font-bold text-[10px] uppercase tracking-widest", !field.value && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-3 w-3" />
                            {field.value ? format(field.value, "dd/MM/yy") : "LIMITE"}
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

          <DialogFooter className="p-4 sm:p-6 bg-muted/10 border-t shrink-0 flex-row gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onClose()} disabled={isSubmitting} className="flex-1 h-10 uppercase text-[10px] font-black tracking-[0.2em]">
                Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 h-10 bg-primary text-black hover:bg-primary/90 uppercase text-[10px] font-black tracking-[0.2em]">
              {isSubmitting ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
              Disparar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
