
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2 } from 'lucide-react';
import type { Task } from '@/lib/types';

const completionSchema = z.object({
  completionStatus: z.enum(['completed', 'not_completed']),
  completionNote: z.string().optional(),
});

type CompletionFormValues = z.infer<typeof completionSchema>;

interface TaskCompletionDialogProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (values: CompletionFormValues) => Promise<void>;
}

export default function TaskCompletionDialog({ task, isOpen, onClose, onConfirm }: TaskCompletionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CompletionFormValues>({
    resolver: zodResolver(completionSchema),
    defaultValues: {
      completionStatus: 'completed',
      completionNote: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        completionStatus: 'completed',
        completionNote: '',
      });
    }
  }, [isOpen, form]);

  const handleSubmit = async (data: CompletionFormValues) => {
    setIsSubmitting(true);
    try {
      await onConfirm(data);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">Concluir Tarefa</DialogTitle>
          <DialogDescription>
            Confirme o desfecho da tarefa: <span className="font-bold text-foreground">{task?.title}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>Você concluiu essa tarefa?</Label>
            <RadioGroup
              defaultValue="completed"
              onValueChange={(v) => form.setValue('completionStatus', v as any)}
              className="flex flex-col space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="completed" id="c1" />
                <Label htmlFor="c1" className="font-normal cursor-pointer">Sim, concluí com sucesso</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="not_completed" id="c2" />
                <Label htmlFor="c2" className="font-normal text-destructive cursor-pointer">Não foi possível concluir</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Descrição / Observação (Opcional)</Label>
            <Textarea
              id="note"
              placeholder="Explique o que foi feito ou o motivo do impedimento..."
              className="min-h-[100px]"
              {...form.register('completionNote')}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar e Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
