
'use client';

import { useEffect, useMemo, useState } from "react";
import { onSnapshot, Timestamp } from "firebase/firestore";
import type { Task } from "@/lib/types";
import { queryMyOpenTasks, queryMyAssignedOpenTasks, setTaskStatus, acceptTask, declineTask } from "@/lib/tasks";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ClipboardList, CheckCircle2, XCircle, AlertCircle, Clock, PlusCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import TaskFormDialog from "@/components/tasks/TaskFormDialog";

function dedupeById(tasks: Task[]) {
  const map = new Map<string, Task>();
  for (const t of tasks) map.set(t.id, t);
  return Array.from(map.values());
}

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-blue-100 text-blue-700 border-blue-200",
};

export default function TasksPage() {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid;

  const [ownerTasks, setOwnerTasks] = useState<Task[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    if (!uid) return;

    setIsLoading(true);
    const unsubA = onSnapshot(queryMyOpenTasks(uid), (snap) => {
      setOwnerTasks(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Task)));
      if (isLoading) setIsLoading(false);
    });

    const unsubB = onSnapshot(queryMyAssignedOpenTasks(uid), (snap) => {
      setAssignedTasks(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Task)));
      if (isLoading) setIsLoading(false);
    });

    return () => {
      unsubA();
      unsubB();
    };
  }, [uid]);

  const merged = useMemo(() => {
    const all = dedupeById([...ownerTasks, ...assignedTasks]);
    return all.sort((a, b) => a.dueDate.toMillis() - b.dueDate.toDate().getTime());
  }, [ownerTasks, assignedTasks]);

  if (authLoading || (isLoading && uid)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Carregando seus avisos...</p>
      </div>
    );
  }

  if (!uid) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Avisos e Tarefas</h1>
          <p className="text-muted-foreground">Gerencie suas pendências e colaborações operacionais.</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="bg-primary text-primary-foreground">
          <PlusCircle className="mr-2 h-4 w-4" />
          Nova Tarefa
        </Button>
      </div>

      <div className="grid gap-4">
        {merged.length === 0 ? (
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardList className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Tudo limpo por aqui!</p>
              <p className="text-sm text-muted-foreground max-w-xs">Você não possui tarefas pendentes ou avisos no momento.</p>
            </CardContent>
          </Card>
        ) : (
          merged.map((t) => {
            const isPendingAcceptance = t.status === "pending_acceptance";
            const isCompleted = t.status === "completed";
            const dueDate = t.dueDate instanceof Timestamp ? t.dueDate.toDate() : new Date(t.dueDate);
            const isOverdue = dueDate < new Date() && !isCompleted;

            return (
              <Card key={t.id} className={`overflow-hidden transition-all ${isPendingAcceptance ? 'border-primary/40 bg-primary/5' : ''}`}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="pt-1">
                      <Checkbox
                        checked={isCompleted}
                        disabled={isPendingAcceptance}
                        onCheckedChange={(checked) => {
                          setTaskStatus(t.id, checked ? "completed" : "pending");
                        }}
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`font-semibold text-lg leading-tight truncate ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                          {t.title}
                        </span>
                        <Badge variant="outline" className={`text-[10px] uppercase font-bold ${priorityColors[t.priority] || ''}`}>
                          {t.priority}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] uppercase font-bold">
                          {t.category}
                        </Badge>
                      </div>

                      {t.description && (
                        <p className={`text-sm text-muted-foreground line-clamp-2 ${isCompleted ? 'line-through opacity-50' : ''}`}>
                          {t.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-muted-foreground font-medium">
                        <div className={`flex items-center gap-1.5 ${isOverdue ? 'text-destructive font-bold' : ''}`}>
                          <Clock className="h-3.5 w-3.5" />
                          <span>Prazo: {format(dueDate, "dd/MM/yy 'às' HH:mm", { locale: ptBR })}</span>
                          {isOverdue && <span className="ml-1 uppercase text-[9px] bg-destructive/10 px-1 rounded">Atrasada</span>}
                        </div>
                        {isPendingAcceptance && (
                           <div className="flex items-center gap-1.5 text-primary">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span>Aguardando Aceitação</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {isPendingAcceptance ? (
                      <div className="flex flex-col sm:flex-row gap-2 self-center">
                        <Button size="sm" onClick={() => acceptTask(t.id)} className="h-8 px-4 font-bold">
                          <CheckCircle2 className="mr-2 h-4 w-4" /> Aceitar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => declineTask(t.id)} className="h-8 px-4 font-bold text-destructive hover:bg-destructive/10">
                          <XCircle className="mr-2 h-4 w-4" /> Recusar
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <TaskFormDialog isOpen={isFormOpen} onClose={(created) => setIsFormOpen(false)} />
    </div>
  );
}
