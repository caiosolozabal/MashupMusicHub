'use client';

import { useEffect, useMemo, useState } from "react";
import { onSnapshot, Timestamp } from "firebase/firestore";
import type { Task } from "@/lib/types";
import { queryMyOpenTasks, queryMyAssignedOpenTasks, queryMyClosedTasks, setTaskStatus, acceptTask, declineTask, deleteTask } from "@/lib/tasks";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ClipboardList, CheckCircle2, XCircle, AlertCircle, Clock, PlusCircle, History, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import TaskFormDialog from "@/components/tasks/TaskFormDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

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
  const { user, userDetails, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const uid = user?.uid;

  const [ownerTasks, setOwnerTasks] = useState<Task[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);
  const [closedTasks, setClosedTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // States para Diálogos
  const [taskToComplete, setTaskToConclude] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  useEffect(() => {
    if (!uid) return;

    setIsLoading(true);
    
    const unsubA = onSnapshot(queryMyOpenTasks(uid), (snap) => {
      setOwnerTasks(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Task)));
    });

    const unsubB = onSnapshot(queryMyAssignedOpenTasks(uid), (snap) => {
      setAssignedTasks(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Task)));
    });

    const unsubC = onSnapshot(queryMyClosedTasks(uid), (snap) => {
      setClosedTasks(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Task)));
      setIsLoading(false);
    });

    return () => {
      unsubA();
      unsubB();
      unsubC();
    };
  }, [uid]);

  const openMerged = useMemo(() => {
    const all = dedupeById([...ownerTasks, ...assignedTasks]);
    return all.sort((a, b) => a.dueDate.toMillis() - b.dueDate.toMillis());
  }, [ownerTasks, assignedTasks]);

  const closedSorted = useMemo(() => {
    return closedTasks.sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis());
  }, [closedTasks]);

  const handleCompleteTask = async () => {
    if (!taskToComplete) return;
    try {
      await setTaskStatus(taskToComplete.id, "completed");
      toast({ title: "Tarefa concluída!", description: "Ela foi movida para o histórico." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao concluir", description: error.message });
    } finally {
      setTaskToConclude(null);
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      await deleteTask(taskToDelete.id);
      toast({ title: "Tarefa excluída!", description: "O registro foi removido permanentemente." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao excluir", description: error.message });
    } finally {
      setTaskToDelete(null);
    }
  };

  if (authLoading || (isLoading && uid)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Carregando seus avisos...</p>
      </div>
    );
  }

  if (!uid) return null;

  const isStaff = userDetails?.role === 'admin' || userDetails?.role === 'partner';

  const renderTaskList = (tasks: Task[], emptyMessage: string) => {
    if (tasks.length === 0) {
      return (
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Tudo limpo!</p>
            <p className="text-sm text-muted-foreground max-w-xs">{emptyMessage}</p>
          </CardContent>
        </Card>
      );
    }

    return tasks.map((t) => {
      const isPendingAcceptance = t.status === "pending_acceptance";
      const isCompleted = t.status === "completed";
      const dueDate = t.dueDate instanceof Timestamp ? t.dueDate.toDate() : new Date(t.dueDate);
      const isOverdue = dueDate < new Date() && !isCompleted;
      const canDelete = isStaff || t.createdByUid === uid;

      return (
        <Card key={t.id} className={`overflow-hidden transition-all mb-3 ${isPendingAcceptance ? 'border-primary/40 bg-primary/10 shadow-md scale-[1.01]' : ''}`}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="pt-1">
                <Checkbox
                  checked={isCompleted}
                  disabled={isPendingAcceptance || isCompleted}
                  onCheckedChange={(checked) => {
                    if (checked) setTaskToConclude(t);
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
                     <div className="flex items-center gap-1.5 text-primary font-bold animate-pulse">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>Aguardando sua Aceitação</span>
                    </div>
                  )}
                  {isCompleted && t.completedAt && (
                    <div className="flex items-center gap-1.5 text-green-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Concluída em {format(t.completedAt.toDate(), "dd/MM/yy HH:mm", { locale: ptBR })}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 self-center">
                {isPendingAcceptance ? (
                  <>
                    <Button size="sm" onClick={() => acceptTask(t.id)} className="h-8 px-4 font-bold">
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Aceitar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => declineTask(t.id)} className="h-8 px-4 font-bold text-destructive hover:bg-destructive/10">
                      <XCircle className="mr-2 h-4 w-4" /> Recusar
                    </Button>
                  </>
                ) : null}
                
                {canDelete && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setTaskToDelete(t)} 
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Avisos e tarefas</h1>
          <p className="text-muted-foreground">Gerencie suas pendências e colaborações operacionais.</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="bg-primary text-primary-foreground">
          <PlusCircle className="mr-2 h-4 w-4" />
          Nova Tarefa
        </Button>
      </div>

      <Tabs defaultValue="open" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="open" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Abertas ({openMerged.length})
          </TabsTrigger>
          <TabsTrigger value="closed" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="open" className="mt-6">
          {renderTaskList(openMerged, "Você não possui tarefas pendentes ou avisos no momento.")}
        </TabsContent>
        
        <TabsContent value="closed" className="mt-6">
          {renderTaskList(closedSorted, "Nenhuma tarefa concluída ou arquivada encontrada.")}
        </TabsContent>
      </Tabs>

      <TaskFormDialog isOpen={isFormOpen} onClose={(created) => setIsFormOpen(false)} />

      {/* Alertas de Confirmação */}
      <AlertDialog open={!!taskToComplete} onOpenChange={(o) => !o && setTaskToConclude(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concluir Tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta tarefa será movida para a aba de Histórico. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCompleteTask}>Concluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!taskToDelete} onOpenChange={(o) => !o && setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A tarefa será removida do sistema para todos os envolvidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTask} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}